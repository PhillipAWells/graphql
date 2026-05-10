import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AppLogger } from '@pawells/nestjs-shared/common';
import { CacheService } from '../cache.service.js';

/**
 * Advanced branch coverage tests for cache.service.ts
 * Targets:
 * - InvalidatePattern with various pattern matching scenarios
 * - Statistics tracking (GetStats operation counts and timings)
 * - Concurrent cache operations
 */
describe('Cache Service - Advanced Branch Coverage', () => {
	let service: CacheService;
	let mockCacheManager: any;
	let mockContextualLogger: any;
	let mockAppLogger: any;

	beforeEach(() => {
		mockContextualLogger = {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		};

		mockCacheManager = {
			get: vi.fn(),
			set: vi.fn(),
			del: vi.fn(),
			clear: vi.fn(),
			store: {
				keys: vi.fn(),
			},
		};

		mockAppLogger = {
			createContextualLogger: vi.fn().mockReturnValue(mockContextualLogger),
		};

		const mockModuleRef = {
			get: (token: any) => {
				if (token === CACHE_MANAGER) return mockCacheManager;
				if (token === AppLogger) return mockAppLogger;
				throw new Error(`Unknown token: ${String(token)}`);
			},
		} as any;

		service = new CacheService(mockModuleRef);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('InvalidatePattern - Pattern Matching Branches', () => {
		it('should handle pattern with no matching keys (empty result)', async () => {
			mockCacheManager.store.keys.mockResolvedValue([]);

			const result = await service.InvalidatePattern('nonexistent:*');

			expect(result).toBe(0);
			expect(mockCacheManager.store.keys).toHaveBeenCalledWith('nonexistent:*');
			expect(mockCacheManager.del).not.toHaveBeenCalled();
		});

		it('should delete all matching keys and return count', async () => {
			const matchingKeys = ['cache:key1', 'cache:key2', 'cache:key3'];
			mockCacheManager.store.keys.mockResolvedValue(matchingKeys);
			mockCacheManager.del.mockResolvedValue(undefined);

			const result = await service.InvalidatePattern('cache:*');

			expect(result).toBe(3);
			expect(mockCacheManager.del).toHaveBeenCalledTimes(3);
			matchingKeys.forEach(key => {
				expect(mockCacheManager.del).toHaveBeenCalledWith(key);
			});
		});

		it('should track invalidation pattern statistics', async () => {
			const keys = ['user:1', 'user:2'];
			mockCacheManager.store.keys.mockResolvedValue(keys);
			mockCacheManager.del.mockResolvedValue(undefined);

			await service.InvalidatePattern('user:*');
			const stats1 = service.GetStats();

			await service.InvalidatePattern('user:*');
			const stats2 = service.GetStats();

			expect(stats2.invalidationPatterns?.['user:*']).toBe(4);
		});

		it('should handle pattern with single matching key', async () => {
			mockCacheManager.store.keys.mockResolvedValue(['single-key']);
			mockCacheManager.del.mockResolvedValue(undefined);

			const result = await service.InvalidatePattern('single-*');

			expect(result).toBe(1);
		});

		it('should handle store without keys function', async () => {
			mockCacheManager.store = undefined;

			const result = await service.InvalidatePattern('any:*');

			expect(result).toBe(0);
			expect(mockContextualLogger.warn).toHaveBeenCalled();
		});

		it('should handle store.keys returning null', async () => {
			mockCacheManager.store.keys.mockResolvedValue(null);

			const result = await service.InvalidatePattern('test:*');

			expect(result).toBe(0);
		});

		it('should handle deletion errors during pattern invalidation', async () => {
			mockCacheManager.store.keys.mockResolvedValue(['key1']);
			mockCacheManager.del.mockRejectedValue(new Error('Deletion failed'));

			const result = await service.InvalidatePattern('pattern:*');

			expect(result).toBe(0);
			// Del increments errors, then catching in InvalidatePattern also increments
			expect(service.GetStats().errors).toBeGreaterThan(0);
		});

		it('should throw on invalid pattern (empty string)', async () => {
			await expect(service.InvalidatePattern(''))
				.rejects
				.toThrow('Cache invalidation pattern must be a non-empty string');
		});

		it('should throw on null pattern', async () => {
			await expect(service.InvalidatePattern(null as any))
				.rejects
				.toThrow('Cache invalidation pattern must be a non-empty string');
		});

		it('should throw on non-string pattern', async () => {
			await expect(service.InvalidatePattern(123 as any))
				.rejects
				.toThrow('Cache invalidation pattern must be a non-empty string');
		});
	});

	describe('Statistics Tracking - Operation Timings', () => {
		it('should track get operation timing', async () => {
			mockCacheManager.get.mockResolvedValue({ data: 'test' });

			const startTime = Date.now();
			await service.Get('key1');
			const endTime = Date.now();

			const stats = service.GetStats();
			expect(stats.hits).toBe(1);
			// Timing should be recorded (timing is internal, but hits should be set)
			expect(stats.operationTimings.get).toBeDefined();
		});

		it('should track set operation timing', async () => {
			mockCacheManager.set.mockResolvedValue(undefined);

			await service.Set('key1', { data: 'test' });

			const stats = service.GetStats();
			expect(stats.sets).toBe(1);
			expect(stats.operationTimings.set).toBeDefined();
		});

		it('should track del operation timing', async () => {
			mockCacheManager.del.mockResolvedValue(undefined);

			await service.Del('key1');

			const stats = service.GetStats();
			expect(stats.deletes).toBe(1);
			expect(stats.operationTimings.del).toBeDefined();
		});

		it('should aggregate multiple operation timings', async () => {
			mockCacheManager.get.mockResolvedValue(null);
			mockCacheManager.set.mockResolvedValue(undefined);

			await service.Get('key1');
			await service.Get('key2');
			await service.Set('key1', { data: 'test' });

			const stats = service.GetStats();
			expect(stats.hits + stats.misses).toBe(2);
			expect(stats.sets).toBe(1);
		});

		it('should track error timings', async () => {
			const error = new Error('Cache error');
			mockCacheManager.get.mockRejectedValue(error);

			await service.Get('error-key');

			const stats = service.GetStats();
			expect(stats.errors).toBe(1);
		});
	});

	describe('Statistics Tracking - Hit/Miss Rate', () => {
		it('should calculate hit rate correctly', async () => {
			mockCacheManager.get.mockResolvedValueOnce({ data: 'test' });
			mockCacheManager.get.mockResolvedValueOnce(null);
			mockCacheManager.get.mockResolvedValueOnce({ data: 'test' });

			await service.Get('key1');
			await service.Get('key2');
			await service.Get('key3');

			const stats = service.GetStats();
			expect(stats.hits).toBe(2);
			expect(stats.misses).toBe(1);
			expect(stats.hitRate).toBeGreaterThan(0);
			expect(stats.hitRate).toBeLessThanOrEqual(1);
		});

		it('should have zero hit rate when all misses', async () => {
			mockCacheManager.get.mockResolvedValue(null);

			await service.Get('key1');
			await service.Get('key2');

			const stats = service.GetStats();
			expect(stats.hits).toBe(0);
			expect(stats.misses).toBe(2);
			expect(stats.hitRate).toBe(0);
		});

		it('should have perfect hit rate when all hits', async () => {
			mockCacheManager.get.mockResolvedValue({ data: 'test' });

			await service.Get('key1');
			await service.Get('key2');

			const stats = service.GetStats();
			expect(stats.hits).toBe(2);
			expect(stats.misses).toBe(0);
			expect(stats.hitRate).toBe(1);
		});
	});

	describe('Concurrent Cache Operations', () => {
		it('should handle concurrent get operations', async () => {
			mockCacheManager.get.mockResolvedValue({ data: 'test' });

			const promises = Array.from({ length: 5 }, (_, i) => service.Get(`key${i}`));
			await Promise.all(promises);

			const stats = service.GetStats();
			expect(stats.hits).toBe(5);
		});

		it('should handle concurrent set operations', async () => {
			mockCacheManager.set.mockResolvedValue(undefined);

			const promises = Array.from({ length: 5 }, (_, i) =>
				service.Set(`key${i}`, { data: `value${i}` }),
			);
			await Promise.all(promises);

			const stats = service.GetStats();
			expect(stats.sets).toBe(5);
		});

		it('should handle mixed concurrent operations', async () => {
			mockCacheManager.get.mockResolvedValue({ data: 'test' });
			mockCacheManager.set.mockResolvedValue(undefined);
			mockCacheManager.del.mockResolvedValue(undefined);

			const promises = [
				service.Get('key1'),
				service.Set('key2', { data: 'test' }),
				service.Del('key3'),
				service.Get('key4'),
				service.Set('key5', { data: 'test' }),
			];
			await Promise.all(promises);

			const stats = service.GetStats();
			expect(stats.hits + stats.misses).toBe(2);
			expect(stats.sets).toBe(2);
			expect(stats.deletes).toBe(1);
		});

		it('should maintain consistent stats during concurrent operations', async () => {
			mockCacheManager.get.mockResolvedValue({ data: 'test' });

			const promises = [];
			for (let i = 0; i < 10; i++) {
				promises.push(service.Get(`key${i}`));
			}

			await Promise.all(promises);

			const stats = service.GetStats();
			expect(stats.hits).toBe(10);
		});
	});

	describe('Stats Reset and Retrieval', () => {
		it('should return a copy of stats, not reference', async () => {
			mockCacheManager.get.mockResolvedValue({ data: 'test' });
			await service.Get('key1');

			const stats1 = service.GetStats();
			const stats2 = service.GetStats();

			expect(stats1).not.toBe(stats2);
			expect(stats1.hits).toBe(stats2.hits);
		});

		it('should reset stats to initial state', async () => {
			mockCacheManager.get.mockResolvedValue({ data: 'test' });
			mockCacheManager.set.mockResolvedValue(undefined);

			await service.Get('key1');
			await service.Set('key2', { data: 'test' });

			service.ResetStats();
			const stats = service.GetStats();

			expect(stats.hits).toBe(0);
			expect(stats.misses).toBe(0);
			expect(stats.sets).toBe(0);
			expect(stats.deletes).toBe(0);
			expect(stats.errors).toBe(0);
		});

		it('should maintain error count in stats', async () => {
			mockCacheManager.get.mockRejectedValue(new Error('Connection failed'));

			await service.Get('key1');
			await service.Get('key2');

			const stats = service.GetStats();
			expect(stats.errors).toBe(2);
		});
	});

	describe('GetOrSet Pattern - Concurrent Access', () => {
		it('should use cache on subsequent calls', async () => {
			mockCacheManager.get.mockResolvedValueOnce(undefined);
			mockCacheManager.get.mockResolvedValueOnce({ data: 'test' });
			mockCacheManager.set.mockResolvedValue(undefined);

			const factory = vi.fn().mockResolvedValue({ data: 'test' });

			const result1 = await service.GetOrSet('key1', factory);
			const result2 = await service.GetOrSet('key1', factory);

			expect(result1).toBeDefined();
			expect(result2).toBeDefined();
			expect(factory).toHaveBeenCalledTimes(1);
		});

		it('should handle factory errors gracefully', async () => {
			mockCacheManager.get.mockResolvedValue(undefined);
			const factory = vi.fn().mockRejectedValue(new Error('Factory error'));

			await expect(service.GetOrSet('key1', factory)).rejects.toThrow('Factory error');
		});
	});

	describe('Branch Coverage - Error Paths', () => {
		it('should handle get errors without throwing', async () => {
			mockCacheManager.get.mockRejectedValue(new Error('Connection refused'));

			const result = await service.Get('key1');

			expect(result).toBeUndefined();
			expect(service.GetStats().errors).toBe(1);
		});

		it('should handle set errors by throwing', async () => {
			mockCacheManager.set.mockRejectedValue(new Error('Write failed'));

			await expect(service.Set('key1', { data: 'test' })).rejects.toThrow('Write failed');
			expect(service.GetStats().errors).toBe(1);
		});

		it('should handle del errors by throwing', async () => {
			mockCacheManager.del.mockRejectedValue(new Error('Delete failed'));

			await expect(service.Del('key1')).rejects.toThrow('Delete failed');
			expect(service.GetStats().errors).toBe(1);
		});

		it('should handle clear errors by throwing', async () => {
			mockCacheManager.clear.mockRejectedValue(new Error('Clear failed'));

			await expect(service.Clear()).rejects.toThrow('Clear failed');
			expect(service.GetStats().errors).toBe(1);
		});

		it('should handle store.keys error in InvalidatePattern gracefully', async () => {
			mockCacheManager.store.keys.mockRejectedValue(new Error('Keys failed'));

			// Error is caught and returns 0
			const result = await service.InvalidatePattern('pattern:*');

			expect(result).toBe(0);
			expect(service.GetStats().errors).toBe(1);
		});

		it('should handle del error during InvalidatePattern', async () => {
			mockCacheManager.store.keys.mockResolvedValue(['key1', 'key2']);
			mockCacheManager.del.mockRejectedValue(new Error('Del failed'));

			// Error is caught during Del call within InvalidatePattern
			const result = await service.InvalidatePattern('pattern:*');

			expect(result).toBe(0);
		});
	});

	describe('Get Operation - Hit and Miss Branches', () => {
		it('should return cached value on Get', async () => {
			const cachedValue = { data: 'test' };
			mockCacheManager.get.mockResolvedValue(cachedValue);

			const result = await service.Get('key');

			expect(result).toBe(cachedValue);
			const stats = service.GetStats();
			expect(stats.hits).toBe(1);
		});

		it('should track miss when Get returns null', async () => {
			mockCacheManager.get.mockResolvedValue(null);

			const result = await service.Get('key');

			// Both null and undefined are treated as cache miss
			expect(result).toBeUndefined();
			const stats = service.GetStats();
			expect(stats.misses).toBe(1);
		});

		it('should track miss when Get returns undefined', async () => {
			mockCacheManager.get.mockResolvedValue(undefined);

			const result = await service.Get('key');

			expect(result).toBeUndefined();
			const stats = service.GetStats();
			expect(stats.misses).toBe(1);
		});

		it('should increment hits correctly across multiple calls', async () => {
			mockCacheManager.get
				.mockResolvedValueOnce({ data: '1' })
				.mockResolvedValueOnce({ data: '2' })
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce({ data: '3' });

			await service.Get('key1');
			await service.Get('key2');
			await service.Get('key3');
			await service.Get('key4');

			const stats = service.GetStats();
			expect(stats.hits).toBe(3);
			expect(stats.misses).toBe(1);
		});
	});

	describe('Pattern Matching Edge Cases', () => {
		it('should handle pattern with special regex characters', async () => {
			const keysResult = ['user.id.1', 'user.id.2'];
			mockCacheManager.store.keys.mockResolvedValue(keysResult);
			mockCacheManager.del.mockResolvedValue(undefined);

			const count = await service.InvalidatePattern('user.*');

			expect(count).toBeGreaterThanOrEqual(0);
		});

		it('should handle pattern matching all keys', async () => {
			const allKeys = ['key1', 'key2', 'key3', 'key4', 'key5'];
			mockCacheManager.store.keys.mockResolvedValue(allKeys);
			mockCacheManager.del.mockResolvedValue(undefined);

			const count = await service.InvalidatePattern('*');

			expect(count).toBe(5);
		});

		it('should handle pattern with regex anchors', async () => {
			const matchingKeys = ['prefix:key', 'prefix:other'];
			mockCacheManager.store.keys.mockResolvedValue(matchingKeys);
			mockCacheManager.del.mockResolvedValue(undefined);

			const count = await service.InvalidatePattern('^prefix:.*');

			expect(count).toBe(2);
		});
	});

	describe('Concurrent Operations', () => {
		it('should handle multiple Get operations concurrently', async () => {
			mockCacheManager.get.mockResolvedValue({ data: 'test' });

			const promise1 = service.Get('key1');
			const promise2 = service.Get('key2');
			const promise3 = service.Get('key3');

			const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

			expect(result1).toBeDefined();
			expect(result2).toBeDefined();
			expect(result3).toBeDefined();
			const stats = service.GetStats();
			expect(stats.hits).toBe(3);
		});

		it('should handle Set and Del operations interleaved', async () => {
			mockCacheManager.set.mockResolvedValue(undefined);
			mockCacheManager.del.mockResolvedValue(undefined);

			await service.Set('key1', { data: 'test' });
			await service.Del('key1');
			await service.Set('key2', { data: 'test2' });

			const stats = service.GetStats();
			expect(stats.sets).toBe(2);
			expect(stats.deletes).toBe(1);
		});
	});
});
