declare global {
	namespace NodeJS {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		interface Timeout {}
	}
}

import { createHash } from 'node:crypto';
import {
	Injectable,
	CanActivate,
	ExecutionContext,
	BadRequestException,
	InternalServerErrorException,
	OnModuleDestroy,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { ILazyModuleRefService, IContextualLogger } from '@pawells/nestjs-shared/common';
import { AppLogger } from '@pawells/nestjs-shared/common';
import type {
	IComplexityConfig,
} from '../graphql/query-complexity.js';
import {
	CalculateQueryComplexity,
	ExceedsComplexityLimit,
	DEFAULT_COMPLEXITY_CONFIG,
} from '../graphql/query-complexity.js';
import {
	QUERY_COMPLEXITY_CACHE_MAX_SIZE,
	QUERY_COMPLEXITY_CACHE_CLEANUP_INTERVAL_MS,
	QUERY_COMPLEXITY_THRESHOLD,
	QUERY_COMPLEXITY_CACHE_TTL_MS,
	QUERY_COMPLEXITY_CACHE_IDLE_THRESHOLD_MS,
} from '../constants/complexity.constants.js';

/**
 * Guard that enforces query complexity limits
 * Prevents complex queries that could impact performance
 *
 * Implements query complexity caching to avoid recalculating
 * complexity for identical queries
 */
@Injectable()
export class QueryComplexityGuard implements CanActivate, OnModuleDestroy, ILazyModuleRefService {
	public readonly Module: ModuleRef;

	private get AppLogger(): AppLogger | undefined {
		try {
			return this.Module.get(AppLogger, { strict: false });
		} catch {
			return undefined;
		}
	}

	private get Logger(): IContextualLogger | undefined {
		try {
			return this.AppLogger?.createContextualLogger(QueryComplexityGuard.name);
		} catch {
			return undefined;
		}
	}

	// Cache entry with metadata for LRU and TTL eviction
	private readonly ComplexityCache = new Map<
		string,
		{
			readonly Complexity: number;
			CreatedAt: number;
			LastAccessedAt: number;
		}
	>();

	private readonly CacheMetrics = {
		Hits: 0,
		Misses: 0,
		Evictions: 0,
	};

	// eslint-disable-next-line no-undef
	private CleanupIntervalRef: NodeJS.Timeout | null = null;

	private get Config(): IComplexityConfig {
		try {
			return this.Module.get<IComplexityConfig>('COMPLEXITY_CONFIG', { strict: false });
		} catch {
			return DEFAULT_COMPLEXITY_CONFIG;
		}
	}

	constructor(moduleRef: ModuleRef) {
		this.Module = moduleRef;
		this.StartPeriodicCleanup();
	}

	/**
	 * Hashes a query for cache key generation using SHA-256
	 * Collision-safe hash for reliable cache lookups
	 * @param query GraphQL query document
	 * @param variables Query variables used in the query
	 * @returns SHA-256 hex string
	 */
	private HashQuery(query: any, variables?: Record<string, unknown>): string {
		return createHash('sha256')
			.update(JSON.stringify({ query, variables }))
			.digest('hex');
	}

	/**
	 * Gets cached complexity for a query
	 * Updates last access time for LRU tracking and TTL calculation
	 * @param query GraphQL query document
	 * @param variables Query variables used in the query
	 * @returns Cached complexity or undefined
	 */
	private GetComplexityFromCache(query: any, variables?: Record<string, unknown>): number | undefined {
		const Key = this.HashQuery(query, variables);
		const Entry = this.ComplexityCache.get(Key);

		if (Entry !== undefined) {
			// Update last access time for LRU tracking
			Entry.LastAccessedAt = Date.now();
			this.CacheMetrics.Hits++;
			return Entry.Complexity;
		}

		this.CacheMetrics.Misses++;
		return undefined;
	}

	/**
	 * Sets cached complexity for a query
	 * Implements LRU eviction when cache exceeds max size
	 * Evicts the least recently used key (oldest last access)
	 * @param query GraphQL query document
	 * @param complexity Calculated complexity
	 * @param variables Query variables used in the query
	 */
	private SetComplexityCache(query: any, complexity: number, variables?: Record<string, unknown>): void {
		const Key = this.HashQuery(query, variables);
		const Now = Date.now();

		// Clean up cache if it exceeds max size (LRU eviction)
		if (this.ComplexityCache.size >= QUERY_COMPLEXITY_CACHE_MAX_SIZE) {
			let LruKey: string | undefined;
			let LruTime = Date.now();

			// Find the least recently used entry
			for (const [CacheKey, Entry] of this.ComplexityCache.entries()) {
				if (Entry.LastAccessedAt < LruTime) {
					LruKey = CacheKey;
					LruTime = Entry.LastAccessedAt;
				}
			}

			if (LruKey) {
				this.ComplexityCache.delete(LruKey);
				this.CacheMetrics.Evictions++;
			}
		}

		this.ComplexityCache.set(Key, {
			Complexity: complexity,
			CreatedAt: Now,
			LastAccessedAt: Now,
		});
	}

	/**
	 * Performs smart cache cleanup using age-based and TTL eviction
	 * Only evicts entries older than the cleanup interval or with expired TTL
	 * Prevents cold-start storms by retaining recently accessed entries
	 */
	private PerformSmartCleanup(): void {
		const Now = Date.now();
		const CleanupThreshold = QUERY_COMPLEXITY_CACHE_CLEANUP_INTERVAL_MS;
		const TtlMs = QUERY_COMPLEXITY_CACHE_TTL_MS;
		const IdleThreshold = QUERY_COMPLEXITY_CACHE_IDLE_THRESHOLD_MS;
		let EvictionCount = 0;

		for (const [Key, Entry] of this.ComplexityCache.entries()) {
			const Age = Now - Entry.CreatedAt;
			const TimeSinceAccess = Now - Entry.LastAccessedAt;
			const IsExpiredTtl = Age > TtlMs;
			const IsOlderThanCleanupInterval = Age > CleanupThreshold;
			const IsIdle = TimeSinceAccess > IdleThreshold;

			// Evict if:
			// 1. TTL expired (>30 minutes old, regardless of access)
			// 2. OR older than cleanup interval AND idle (not accessed in >5 minutes)
			if (IsExpiredTtl || (IsOlderThanCleanupInterval && IsIdle)) {
				this.ComplexityCache.delete(Key);
				EvictionCount++;
				this.CacheMetrics.Evictions++;
			}
		}

		if (EvictionCount > 0) {
			this.Logger?.debug(
				`Smart cache cleanup: evicted ${EvictionCount} stale entries, ` +
				`cache size: ${this.ComplexityCache.size}, ` +
				`hits: ${this.CacheMetrics.Hits}, ` +
				`misses: ${this.CacheMetrics.Misses}`,
			);
		}
	}

	/**
	 * Starts periodic cleanup of the complexity cache
	 * Uses smart age-based eviction instead of full clear
	 * Prevents cold-start storms by keeping recently accessed entries
	 */
	private StartPeriodicCleanup(): void {
		if (this.CleanupIntervalRef) {
			return;
		}

		this.CleanupIntervalRef = setInterval(() => {
			this.PerformSmartCleanup();
		}, QUERY_COMPLEXITY_CACHE_CLEANUP_INTERVAL_MS);
	}

	/**
	 * Cleanup on module destruction
	 * Clears interval and memory structures
	 */
	public onModuleDestroy(): void {
		if (this.CleanupIntervalRef) {
			clearInterval(this.CleanupIntervalRef);
			this.CleanupIntervalRef = null;
			this.ComplexityCache.clear();
		}
	}

	/**
	 * Checks if the query complexity is within acceptable limits
	 * Uses caching to avoid recalculating complexity for identical queries
	 * @param context Execution context
	 * @returns True if query is allowed
	 */
	// eslint-disable-next-line require-await
	public async canActivate(context: ExecutionContext): Promise<boolean> {
		const GqlContext = GqlExecutionContext.create(context);
		const { req } = GqlContext.getContext();
		const { schema, document, variables, operationName } = GqlContext.getArgs();

		try {
			// Check cache first
			const CachedComplexity = this.GetComplexityFromCache(document, variables);
			let Complexity: number;

			if (CachedComplexity !== undefined) {
				Complexity = CachedComplexity;
				this.Logger?.debug(`Query complexity from cache: ${Complexity}`);
			} else {
				// Calculate query complexity
				Complexity = CalculateQueryComplexity(
					schema,
					document,
					variables,
					operationName,
					this.Config,
				);

				// Store in cache
				this.SetComplexityCache(document, Complexity, variables);
				this.Logger?.debug(`Query complexity calculated: ${Complexity}`);
			}

			// Check if complexity exceeds limits
			if (ExceedsComplexityLimit(Complexity, this.Config)) {
				const MaxComplexity = this.Config.limits?.maxComplexity ?? QUERY_COMPLEXITY_THRESHOLD;
				const Message = `Query complexity ${Complexity} exceeds maximum allowed complexity of ${MaxComplexity}`;

				this.Logger?.warn(Message, {
					complexity: Complexity,
					maxComplexity: MaxComplexity,
					operationName,
					userId: req?.user?.id,
				});

				throw new BadRequestException(Message);
			}

			// Add complexity to request for monitoring
			if (req) {
				req.queryComplexity = Complexity;
			}

			return true;
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}

			this.Logger?.error(`Query complexity calculation failed: ${(error as Error).message}`, (error as Error).stack);
			throw new InternalServerErrorException('Unable to validate query complexity');
		}
	}
}
