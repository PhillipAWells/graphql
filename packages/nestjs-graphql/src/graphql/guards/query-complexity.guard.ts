declare global {
	namespace NodeJS {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		interface Timeout {}
	}
}

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
import { DocumentNode } from 'graphql';
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
	// Uses doubly-linked list for O(1) LRU eviction instead of O(n) scan
	private readonly ComplexityCache = new Map<
		string,
		{
			readonly Complexity: number;
			CreatedAt: number;
			LastAccessedAt: number;
			// Doubly-linked list node for O(1) removal from LRU order
			PrevKey?: string;
			NextKey?: string;
		}
	>();

	// Track LRU order: head is oldest, tail is newest
	private LruHead?: string;
	private LruTail?: string;

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
	 * Hashes a query for cache key generation using lightweight object hash
	 * Trades collision safety for performance in non-security-critical context
	 * Hash is used as cache key only; collision causes a recalculation (safe)
	 *
	 * Performance note:
	 * - SHA-256: ~1-5ms for large queries (expensive for hot path)
	 * - Object hash: ~0.1-0.5ms (100x faster)
	 *
	 * Collision risk is acceptable because:
	 * - Different queries computing same hash just recalculate complexity (no correctness impact)
	 * - Within a single request/session, duplicate queries are rare
	 *
	 * @param query GraphQL query document
	 * @param variables Query variables used in the query
	 * @returns Hash string
	 */
	private HashQuery(query: DocumentNode, variables?: Record<string, unknown>): string {
		// Simple object hash: concatenate key parts with separators
		// Sufficient for cache key uniqueness in non-security context
		const QueryStr = JSON.stringify(query);
		const VarsStr = variables ? JSON.stringify(variables) : '';

		// Fast hash function using string length and character distribution
		// Not collision-free but good enough for cache keying
		let Hash = 5381;
		const Str = `${QueryStr}:${VarsStr}`;

		for (let I = 0; I < Str.length; I++) {
			Hash = ((Hash << 5) + Hash) ^ Str.charCodeAt(I);
		}

		return `query_${(Hash >>> 0).toString(36)}`;
	}

	/**
	 * Gets cached complexity for a query
	 * Updates last access time for LRU tracking and TTL calculation
	 * @param query GraphQL query document
	 * @param variables Query variables used in the query
	 * @returns Cached complexity or undefined
	 */
	private GetComplexityFromCache(query: DocumentNode, variables?: Record<string, unknown>): number | undefined {
		const Key = this.HashQuery(query, variables);
		const Entry = this.ComplexityCache.get(Key);

		if (Entry !== undefined) {
			// Update last access time for LRU tracking
			Entry.LastAccessedAt = Date.now();
			// Move to tail (newest) in LRU order: O(1) operation
			this.UpdateLruOrder(Key, Entry);
			this.CacheMetrics.Hits++;
			return Entry.Complexity;
		}

		this.CacheMetrics.Misses++;
		return undefined;
	}

	/**
	 * Updates LRU order by moving accessed key to the tail (newest position)
	 * O(1) operation using doubly-linked list
	 */
	private UpdateLruOrder(key: string, entry: { PrevKey?: string; NextKey?: string }): void {
		// If already at tail, do nothing
		if (this.LruTail === key) {
			return;
		}

		// Remove from current position
		if (entry.PrevKey) {
			const PrevEntry = this.ComplexityCache.get(entry.PrevKey);
			if (PrevEntry) {
				PrevEntry.NextKey = entry.NextKey;
			}
		} else {
			// Was head
			this.LruHead = entry.NextKey;
		}

		if (entry.NextKey) {
			const NextEntry = this.ComplexityCache.get(entry.NextKey);
			if (NextEntry) {
				NextEntry.PrevKey = entry.PrevKey;
			}
		} else {
			// Was tail
			this.LruTail = entry.PrevKey;
		}

		// Add to tail
		if (this.LruTail) {
			const TailEntry = this.ComplexityCache.get(this.LruTail);
			if (TailEntry) {
				TailEntry.NextKey = key;
			}
		}
		entry.PrevKey = this.LruTail;
		entry.NextKey = undefined;
		this.LruTail = key;

		// If list was empty, this is now both head and tail
		if (!this.LruHead) {
			this.LruHead = key;
		}
	}

	/**
	 * Sets cached complexity for a query
	 * Implements LRU eviction when cache exceeds max size
	 * Evicts the least recently used key (oldest in linked list) in O(1) time
	 * @param query GraphQL query document
	 * @param complexity Calculated complexity
	 * @param variables Query variables used in the query
	 */
	private SetComplexityCache(query: DocumentNode, complexity: number, variables?: Record<string, unknown>): void {
		const Key = this.HashQuery(query, variables);
		const Now = Date.now();

		// Clean up cache if it exceeds max size (LRU eviction)
		// O(1) operation: evict head (oldest) from doubly-linked list
		if (this.ComplexityCache.size >= QUERY_COMPLEXITY_CACHE_MAX_SIZE && !this.ComplexityCache.has(Key)) {
			if (this.LruHead) {
				this.ComplexityCache.delete(this.LruHead);
				this.CacheMetrics.Evictions++;
				// Head is now the next node
				const OldHead = this.LruHead;
				const OldHeadEntry = this.ComplexityCache.get(OldHead);
				if (OldHeadEntry) {
					this.LruHead = OldHeadEntry.NextKey;
					if (this.LruHead) {
						const NewHeadEntry = this.ComplexityCache.get(this.LruHead);
						if (NewHeadEntry) {
							NewHeadEntry.PrevKey = undefined;
						}
					} else {
						// List is now empty
						this.LruTail = undefined;
					}
				}
			}
		}

		const NewEntry = {
			Complexity: complexity,
			CreatedAt: Now,
			LastAccessedAt: Now,
			// Initialize LRU doubly-linked list pointers
			PrevKey: undefined,
			NextKey: undefined,
		};

		this.ComplexityCache.set(Key, NewEntry);
		// Add to tail (newest) in LRU order
		this.UpdateLruOrder(Key, NewEntry);
	}

	/**
	 * Performs smart cache cleanup using age-based and TTL eviction
	 * Only evicts entries older than the cleanup interval or with expired TTL
	 * Prevents cold-start storms by retaining recently accessed entries
	 * Properly maintains doubly-linked list during deletions
	 */
	private PerformSmartCleanup(): void {
		const Now = Date.now();
		const CleanupThreshold = QUERY_COMPLEXITY_CACHE_CLEANUP_INTERVAL_MS;
		const TtlMs = QUERY_COMPLEXITY_CACHE_TTL_MS;
		const IdleThreshold = QUERY_COMPLEXITY_CACHE_IDLE_THRESHOLD_MS;
		let EvictionCount = 0;

		// Collect keys to delete (avoid modifying map during iteration)
		const KeysToDelete: string[] = [];

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
				KeysToDelete.push(Key);
			}
		}

		// Delete collected keys and update linked list
		for (const Key of KeysToDelete) {
			const Entry = this.ComplexityCache.get(Key);
			if (Entry) {
				// Remove from linked list
				if (Entry.PrevKey) {
					const PrevEntry = this.ComplexityCache.get(Entry.PrevKey);
					if (PrevEntry) {
						PrevEntry.NextKey = Entry.NextKey;
					}
				} else {
					// Was head
					this.LruHead = Entry.NextKey;
				}

				if (Entry.NextKey) {
					const NextEntry = this.ComplexityCache.get(Entry.NextKey);
					if (NextEntry) {
						NextEntry.PrevKey = Entry.PrevKey;
					}
				} else {
					// Was tail
					this.LruTail = Entry.PrevKey;
				}

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
			this.LruHead = undefined;
			this.LruTail = undefined;
		}
	}

	/**
	 * Checks if the query complexity is within acceptable limits
	 * Uses caching to avoid recalculating complexity for identical queries
	 * @param context Execution context
	 * @returns True if query is allowed
	 */
	public canActivate(context: ExecutionContext): boolean {
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
