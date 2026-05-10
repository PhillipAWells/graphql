import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AppLogger } from '@pawells/nestjs-shared/common';
import { GraphQLCacheService } from '../services/cache.service.js';
import { CACHE_METADATA_KEYS, Cacheable, CacheInvalidate } from '../decorators/index.js';

/**
 * Integration tests for cache service and decorators
 * Targets branch coverage in cache.service.ts and decorator metadata application
 */
describe('Cache Service and Decorators - Integration Tests', () => {
	let cacheService: GraphQLCacheService;
	let mockCacheManager: any;
	let mockAppLogger: any;
	let cacheHits: any[];
	let cacheMisses: any[];

	beforeEach(() => {
		cacheHits = [];
		cacheMisses = [];

		// Mock Cache Manager
		mockCacheManager = {
			set: vi.fn().mockResolvedValue(undefined),
			get: vi.fn().mockResolvedValue(null),
			del: vi.fn().mockResolvedValue(undefined),
			clear: vi.fn().mockResolvedValue(undefined),
		};

		// Mock AppLogger with tracking
		mockAppLogger = {
			createContextualLogger: vi.fn().mockReturnValue({
				debug: vi.fn((msg: string) => {
					if (msg.includes('Cache hit')) cacheHits.push(msg);
					if (msg.includes('Cache miss')) cacheMisses.push(msg);
				}),
				info: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
			}),
		};

		// Mock ModuleRef
		const mockModuleRef = {
			get: (token: any) => {
				if (token === CACHE_MANAGER) return mockCacheManager;
				if (token === AppLogger) return mockAppLogger;
				throw new Error(`Unknown token: ${String(token)}`);
			},
		} as any;

		cacheService = new GraphQLCacheService(mockModuleRef);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Cache Hit vs Cache Miss Paths', () => {
		it('should handle cache hit and track statistics correctly', async () => {
			const key = 'graphql:user|id:123';
			const cachedValue = { id: '123', name: 'John Doe', email: 'john@example.com' };

			mockCacheManager.get.mockResolvedValue(cachedValue);

			const result = await cacheService.Get(key);

			expect(result).toBe(cachedValue);
			expect(cacheHits.length).toBe(1);
			expect(cacheMisses.length).toBe(0);

			const stats = cacheService.GetStats();
			expect(stats.hits).toBe(1);
			expect(stats.misses).toBe(0);
			expect(stats.hitRate).toBe(100);
		});

		it('should handle cache miss and track statistics correctly', async () => {
			const key = 'graphql:user|id:456';

			mockCacheManager.get.mockResolvedValue(null);

			const result = await cacheService.Get(key);

			expect(result).toBeUndefined();
			expect(cacheMisses.length).toBe(1);
			expect(cacheHits.length).toBe(0);

			const stats = cacheService.GetStats();
			expect(stats.hits).toBe(0);
			expect(stats.misses).toBe(1);
			expect(stats.hitRate).toBe(0);
		});

		it('should calculate hit rate correctly with mixed hit/miss scenario', async () => {
			const key1 = 'graphql:user|id:1';
			const key2 = 'graphql:user|id:2';
			const key3 = 'graphql:user|id:3';

			// Hit, miss, hit, miss, hit pattern
			mockCacheManager.get
				.mockResolvedValueOnce({ id: '1' }) // hit
				.mockResolvedValueOnce(null) // miss
				.mockResolvedValueOnce({ id: '3' }) // hit
				.mockResolvedValueOnce(null) // miss
				.mockResolvedValueOnce({ id: '3' }); // hit

			await cacheService.Get(key1); // hit
			await cacheService.Get(key2); // miss
			await cacheService.Get(key3); // hit
			await cacheService.Get(key1); // miss
			await cacheService.Get(key2); // hit

			const stats = cacheService.GetStats();
			expect(stats.hits).toBe(3);
			expect(stats.misses).toBe(2);
			expect(stats.hitRate).toBe(60); // 3 / 5 * 100
		});

		it('should return undefined when cache manager returns undefined', async () => {
			mockCacheManager.get.mockResolvedValue(undefined);

			const result = await cacheService.Get('graphql:test');

			expect(result).toBeUndefined();
			expect(cacheMisses.length).toBe(1);
		});

		it('should handle cache error gracefully during get', async () => {
			mockCacheManager.get.mockRejectedValue(new Error('Redis connection lost'));

			const result = await cacheService.Get('graphql:test');

			expect(result).toBeUndefined();
			// Error is swallowed, miss is not tracked
		});
	});

	describe('Cache TTL and Expiration Scenarios', () => {
		it('should use default TTL when not specified', async () => {
			const key = 'test-key';
			const value = { data: 'test' };

			await cacheService.Set(key, value);

			expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, 300000);
		});

		it('should use custom TTL when specified', async () => {
			const key = 'test-key';
			const value = { data: 'test' };
			const customTtl = 600000;

			await cacheService.Set(key, value, customTtl);

			expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, customTtl);
		});

		it('should apply TTL correctly in getOrSet with cache miss', async () => {
			const key = 'graphql:user|id:789';
			const freshData = { id: '789', name: 'Jane Doe' };
			const customTtl = 1800000; // 30 minutes

			mockCacheManager.get.mockResolvedValue(null);

			const loader = vi.fn().mockResolvedValue(freshData);

			const result = await cacheService.GetOrSet(key, loader, customTtl);

			expect(result).toBe(freshData);
			expect(mockCacheManager.set).toHaveBeenCalledWith(key, freshData, customTtl);
		});

		it('should not set cache if loader throws', async () => {
			const key = 'graphql:error-test';

			mockCacheManager.get.mockResolvedValue(null);

			const loader = vi.fn().mockRejectedValue(new Error('Loader error'));

			await expect(cacheService.GetOrSet(key, loader, 300000)).rejects.toThrow('Loader error');

			expect(mockCacheManager.set).not.toHaveBeenCalled();
		});

		it('should handle TTL 0 (no expiration) correctly', async () => {
			const key = 'persistent-key';
			const value = { persistent: true };

			await cacheService.Set(key, value, 0);

			expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, 0);
		});
	});

	describe('Cache Invalidation Patterns', () => {
		it('should invalidate pattern with Redis SCAN when store available', async () => {
			const pattern = 'graphql:user|id:*';
			const mockClient = {
				scan: vi.fn()
					.mockResolvedValueOnce(['1', ['key1', 'key2']]) // First scan: cursor 1, 2 keys
					.mockResolvedValueOnce(['0', ['key3']]), // Second scan: cursor 0, 1 key
				del: vi.fn().mockResolvedValue(undefined),
			};

			mockCacheManager.store = {
				getClient: () => mockClient,
			};

			await cacheService.InvalidatePattern(pattern);

			expect(mockClient.scan).toHaveBeenCalledTimes(2);
			expect(mockClient.del).toHaveBeenCalledWith('key1', 'key2');
			expect(mockClient.del).toHaveBeenCalledWith('key3');
		});

		it('should handle empty keys during pattern invalidation', async () => {
			const pattern = 'graphql:nonexistent:*';
			const mockClient = {
				scan: vi.fn().mockResolvedValueOnce(['0', []]),
				del: vi.fn().mockResolvedValue(undefined),
			};

			mockCacheManager.store = {
				getClient: () => mockClient,
			};

			await cacheService.InvalidatePattern(pattern);

			expect(mockClient.del).not.toHaveBeenCalled();
		});

		it('should warn when store lacks Redis scan capability', async () => {
			const pattern = 'graphql:user:*';
			const warnSpy = vi.spyOn(cacheService['Logger'], 'warn');

			mockCacheManager.store = { /* no getClient */ };

			await cacheService.InvalidatePattern(pattern);

			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Pattern-based cache invalidation not supported'));
		});

		it('should handle scan errors during pattern invalidation', async () => {
			const pattern = 'graphql:user:*';
			const mockClient = {
				scan: vi.fn().mockRejectedValue(new Error('Redis error')),
			};

			mockCacheManager.store = {
				getClient: () => mockClient,
			};

			await expect(cacheService.InvalidatePattern(pattern)).resolves.not.toThrow();
		});
	});

	describe('Clear Cache Operations', () => {
		it('should call clear when store supports it', async () => {
			await cacheService.Clear();

			expect(mockCacheManager.clear).toHaveBeenCalled();
		});

		it('should call reset as fallback when clear not available', async () => {
			mockCacheManager.clear = undefined;
			mockCacheManager.reset = vi.fn().mockResolvedValue(undefined);

			await cacheService.Clear();

			expect(mockCacheManager.reset).toHaveBeenCalled();
		});

		it('should warn when neither clear nor reset available', async () => {
			mockCacheManager.clear = undefined;
			mockCacheManager.reset = undefined;

			const warnSpy = vi.spyOn(cacheService['Logger'], 'warn');

			await cacheService.Clear();

			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Cache clear not supported'));
		});

		it('should handle clear errors', async () => {
			mockCacheManager.clear.mockRejectedValue(new Error('Clear failed'));

			await expect(cacheService.Clear()).rejects.toThrow('Clear failed');
		});
	});

	describe('Concurrent Cache Operations', () => {
		it('should handle concurrent reads correctly', async () => {
			const key = 'graphql:shared|data:test';
			const value = { shared: 'resource' };

			mockCacheManager.get.mockResolvedValue(value);

			const results = await Promise.all([
				cacheService.Get(key),
				cacheService.Get(key),
				cacheService.Get(key),
			]);

			expect(results).toEqual([value, value, value]);

			const stats = cacheService.GetStats();
			expect(stats.hits).toBe(3);
		});

		it('should handle concurrent writes', async () => {
			const values = [
				{ key: 'key1', value: { id: 1 } },
				{ key: 'key2', value: { id: 2 } },
				{ key: 'key3', value: { id: 3 } },
			];

			await Promise.all(
				values.map(({ key, value }) => cacheService.Set(key, value)),
			);

			expect(mockCacheManager.set).toHaveBeenCalledTimes(3);
		});

		it('should handle concurrent read/write operations', async () => {
			mockCacheManager.get.mockResolvedValue(null);

			const loader = vi.fn().mockResolvedValue({ id: 1 });

			const [result1, result2, result3] = await Promise.all([
				cacheService.GetOrSet('key1', loader),
				cacheService.GetOrSet('key2', loader),
				cacheService.GetOrSet('key3', loader),
			]);

			expect(result1).toEqual({ id: 1 });
			expect(result2).toEqual({ id: 1 });
			expect(result3).toEqual({ id: 1 });

			// All three calls should invoke the loader (no cache sharing)
			expect(loader).toHaveBeenCalledTimes(3);
		});
	});

	describe('Cache Key Generation with Arguments and Context', () => {
		it('should generate consistent keys with same arguments', () => {
			const args = { id: 123, name: 'test', active: true };

			const key1 = cacheService.GenerateKey('user', args);
			const key2 = cacheService.GenerateKey('user', args);

			expect(key1).toBe(key2);
		});

		it('should generate different keys for different argument order', () => {
			const args1 = { a: 1, b: 2 };
			const args2 = { b: 2, a: 1 };

			const key1 = cacheService.GenerateKey('op', args1);
			const key2 = cacheService.GenerateKey('op', args2);

			// Should be same due to sorting
			expect(key1).toBe(key2);
		});

		it('should include context data in key generation', () => {
			const args = { id: 123 };
			const context = { userId: 'user456', role: 'admin' };

			const key = cacheService.GenerateKey('user', args, context);

			expect(key).toContain('userId:"user456"');
			expect(key).toContain('role:"admin"');
			expect(key).toContain('id:123');
		});

		it('should handle complex nested arguments', () => {
			const args = {
				filter: { status: 'active', tags: ['a', 'b'] },
				pagination: { limit: 10, offset: 0 },
			};

			const key = cacheService.GenerateKey('search', args);

			expect(key).toContain('graphql:search');
			expect(key).toContain('filter:');
			expect(key).toContain('pagination:');
		});

		it('should handle null and undefined in arguments', () => {
			const args = { id: 123, optional: null, undefined };

			const key = cacheService.GenerateKey('query', args);

			expect(key).toContain('graphql:query');
		});
	});

	describe('Cache Decorator Metadata', () => {
		it('should apply Cacheable decorator with default options', () => {
			const decorator = Cacheable();

			expect(decorator).toBeDefined();
		});

		it('should apply Cacheable decorator with custom TTL', () => {
			const ttl = 600000;
			const decorator = Cacheable({ ttl });

			expect(decorator).toBeDefined();
		});

		it('should apply Cacheable decorator with condition function', () => {
			const condition = (result: any) => result !== null;
			const decorator = Cacheable({ condition });

			expect(decorator).toBeDefined();
		});

		it('should apply Cacheable decorator with custom key generator', () => {
			const keyGenerator = (args: any[], _context: any) => `custom:${args[0]}`;
			const decorator = Cacheable({ keyGenerator });

			expect(decorator).toBeDefined();
		});

		it('should apply Cacheable decorator with cacheNulls option', () => {
			const decorator = Cacheable({ cacheNulls: true });

			expect(decorator).toBeDefined();
		});

		it('should apply CacheInvalidate decorator with patterns', () => {
			const patterns = ['graphql:user|id:*', 'graphql:users'];
			const decorator = CacheInvalidate({ patterns });

			expect(decorator).toBeDefined();
		});

		it('should apply CacheInvalidate decorator with when option', () => {
			const decorator = CacheInvalidate({ patterns: ['graphql:user:*'], when: 'before' });

			expect(decorator).toBeDefined();
		});

		it('should apply CacheInvalidate decorator with condition', () => {
			const condition = (result: any) => result !== null;
			const decorator = CacheInvalidate({ patterns: ['graphql:user:*'], condition });

			expect(decorator).toBeDefined();
		});

		it('should apply CacheInvalidate decorator with key generator', () => {
			const keyGenerator = (args: any[], context: any, result: any) => [`graphql:user|id:${result?.id}`];
			const decorator = CacheInvalidate({ keyGenerator });

			expect(decorator).toBeDefined();
		});

		it('should maintain CACHE_METADATA_KEYS constants', () => {
			expect(CACHE_METADATA_KEYS.CACHEABLE).toBe('cacheable');
			expect(CACHE_METADATA_KEYS.CACHE_INVALIDATE).toBe('cache-invalidate');
			expect(CACHE_METADATA_KEYS.CACHE_EVICT).toBe('cache-evict');
		});
	});

	describe('Error Handling in Cache Operations', () => {
		it('should handle set errors and rethrow', async () => {
			mockCacheManager.set.mockRejectedValue(new Error('Set failed'));

			await expect(cacheService.Set('key', { data: 'test' })).rejects.toThrow('Set failed');
		});

		it('should handle delete errors and rethrow', async () => {
			mockCacheManager.del.mockRejectedValue(new Error('Delete failed'));

			await expect(cacheService.Delete('key')).rejects.toThrow('Delete failed');
		});

		it('should handle getOrSet loader errors', async () => {
			mockCacheManager.get.mockResolvedValue(null);

			const loader = vi.fn().mockRejectedValue(new Error('Load failed'));

			await expect(cacheService.GetOrSet('key', loader)).rejects.toThrow('Load failed');
		});

		it('should track error in get gracefully', async () => {
			mockCacheManager.get.mockRejectedValue(new Error('Get error'));

			const result = await cacheService.Get('key');

			expect(result).toBeUndefined();
		});
	});

	describe('Cache Statistics Reset', () => {
		it('should reset hit and miss counters', async () => {
			// Generate some activity
			mockCacheManager.get.mockResolvedValue({ data: 'test' });
			await cacheService.Get('key1');
			mockCacheManager.get.mockResolvedValue(null);
			await cacheService.Get('key2');

			let stats = cacheService.GetStats();
			expect(stats.hits).toBe(1);
			expect(stats.misses).toBe(1);

			// Reset
			cacheService.ResetStats();

			stats = cacheService.GetStats();
			expect(stats.hits).toBe(0);
			expect(stats.misses).toBe(0);
			expect(stats.hitRate).toBe(0);
		});

		it('should return correct zero stats after reset', () => {
			cacheService.ResetStats();

			const stats = cacheService.GetStats();

			expect(stats.hits).toBe(0);
			expect(stats.misses).toBe(0);
			expect(stats.hitRate).toBe(0);
			expect(stats.evictions).toBe(0);
			expect(stats.operationTimings).toEqual({
				get: [],
				set: [],
				del: [],
			});
		});
	});

	describe('Cache Performance - Branch Coverage', () => {
		it('should track performance metrics during high-load scenario', async () => {
			const iterations = 100;
			mockCacheManager.get
				.mockResolvedValue({ data: 'test' }) // Will return cached value
				.mockResolvedValueOnce(null); // First call is a miss

			// First call - miss
			mockCacheManager.get.mockResolvedValueOnce(null);
			await cacheService.Get('key');

			// Subsequent calls - hits
			mockCacheManager.get.mockResolvedValue({ data: 'test' });
			for (let i = 0; i < iterations - 1; i++) {
				await cacheService.Get('key');
			}

			const stats = cacheService.GetStats();
			expect(stats.misses).toBeGreaterThan(0);
			expect(stats.hits).toBeGreaterThan(0);
		});

		it('should handle rapid consecutive cache operations', async () => {
			const operations = Array.from({ length: 10 }, (_, i) => ({
				key: `key${i}`,
				value: { id: i },
			}));

			mockCacheManager.set.mockResolvedValue(undefined);

			for (const op of operations) {
				await cacheService.Set(op.key, op.value);
			}

			expect(mockCacheManager.set).toHaveBeenCalledTimes(10);
		});

		it('should maintain accurate statistics with mixed operations', async () => {
			mockCacheManager.get.mockResolvedValueOnce({ data: 'test1' }); // hit
			mockCacheManager.get.mockResolvedValueOnce(null); // miss
			mockCacheManager.get.mockResolvedValueOnce({ data: 'test3' }); // hit

			await cacheService.Get('key1');
			await cacheService.Get('key2');
			await cacheService.Get('key3');

			const stats = cacheService.GetStats();
			expect(stats.hits).toBe(2);
			expect(stats.misses).toBe(1);
			expect(stats.hitRate).toBeCloseTo(66.67, 1);
		});
	});
});
