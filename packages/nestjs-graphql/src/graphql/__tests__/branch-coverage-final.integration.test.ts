import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AppLogger } from '@pawells/nestjs-shared/common';
import { GraphQLCacheService } from '../services/cache.service.js';

/**
 * Final targeted tests for branch coverage threshold
 * Focuses on cache.service.ts branch coverage (Lines 35-41)
 * Tests specific conditional branches not covered
 */
describe('Cache Service - Final Branch Coverage', () => {
	let cacheService: GraphQLCacheService;
	let mockCacheManager: any;
	let mockAppLogger: any;

	beforeEach(() => {
		// Mock Cache Manager
		mockCacheManager = {
			set: vi.fn().mockResolvedValue(undefined),
			get: vi.fn().mockResolvedValue(null),
			del: vi.fn().mockResolvedValue(undefined),
			clear: vi.fn().mockResolvedValue(undefined),
		};

		// Mock AppLogger
		mockAppLogger = {
			createContextualLogger: vi.fn().mockReturnValue({
				debug: vi.fn(),
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

	describe('Cache Get - Value Check Branch (Line 35-41)', () => {
		it('should track hit for non-null cached value', async () => {
			const cachedValue = { id: 1, name: 'test' };
			mockCacheManager.get.mockResolvedValue(cachedValue);

			const result = await cacheService.Get('key1');

			expect(result).toBe(cachedValue);
			const stats = cacheService.GetStats();
			expect(stats.hits).toBe(1);
			expect(stats.misses).toBe(0);
		});

		it('should track miss for null cached value', async () => {
			mockCacheManager.get.mockResolvedValue(null);

			const result = await cacheService.Get('key2');

			expect(result).toBeUndefined();
			const stats = cacheService.GetStats();
			expect(stats.hits).toBe(0);
			expect(stats.misses).toBe(1);
		});

		it('should track miss for undefined cached value', async () => {
			mockCacheManager.get.mockResolvedValue(undefined);

			const result = await cacheService.Get('key3');

			expect(result).toBeUndefined();
			const stats = cacheService.GetStats();
			expect(stats.hits).toBe(0);
			expect(stats.misses).toBe(1);
		});

		it('should differentiate between null and undefined in condition', async () => {
			// Test both null and undefined through separate calls
			mockCacheManager.get.mockResolvedValueOnce(null);
			const result1 = await cacheService.Get('nullKey');

			mockCacheManager.get.mockResolvedValueOnce(undefined);
			const result2 = await cacheService.Get('undefinedKey');

			expect(result1).toBeUndefined();
			expect(result2).toBeUndefined();

			const stats = cacheService.GetStats();
			expect(stats.hits).toBe(0);
			expect(stats.misses).toBe(2);
		});

		it('should return empty object as hit', async () => {
			const emptyObject = {};
			mockCacheManager.get.mockResolvedValue(emptyObject);

			const result = await cacheService.Get('emptyKey');

			expect(result).toBe(emptyObject);
			const stats = cacheService.GetStats();
			expect(stats.hits).toBe(1);
		});

		it('should return zero as hit', async () => {
			mockCacheManager.get.mockResolvedValue(0);

			const result = await cacheService.Get('zeroKey');

			expect(result).toBe(0);
			const stats = cacheService.GetStats();
			expect(stats.hits).toBe(1);
		});

		it('should return false as hit', async () => {
			mockCacheManager.get.mockResolvedValue(false);

			const result = await cacheService.Get('falseKey');

			expect(result).toBe(false);
			const stats = cacheService.GetStats();
			expect(stats.hits).toBe(1);
		});

		it('should return empty string as hit', async () => {
			mockCacheManager.get.mockResolvedValue('');

			const result = await cacheService.Get('emptyStringKey');

			expect(result).toBe('');
			const stats = cacheService.GetStats();
			expect(stats.hits).toBe(1);
		});

		it('should return empty array as hit', async () => {
			mockCacheManager.get.mockResolvedValue([]);

			const result = await cacheService.Get('emptyArrayKey');

			expect(result).toEqual([]);
			const stats = cacheService.GetStats();
			expect(stats.hits).toBe(1);
		});
	});

	describe('Cache Condition Branches - Hit Rate Calculation', () => {
		it('should calculate correct hit rate with hits > 0 and misses = 0', async () => {
			mockCacheManager.get.mockResolvedValue({ data: 'value' });

			await cacheService.Get('key1');

			const stats = cacheService.GetStats();
			expect(stats.hitRate).toBe(100);
		});

		it('should calculate correct hit rate with hits = 0 and misses > 0', async () => {
			mockCacheManager.get.mockResolvedValue(null);

			await cacheService.Get('key1');

			const stats = cacheService.GetStats();
			expect(stats.hitRate).toBe(0);
		});

		it('should calculate correct hit rate with both hits and misses', async () => {
			mockCacheManager.get.mockResolvedValueOnce({ data: 'hit1' });
			mockCacheManager.get.mockResolvedValueOnce(null);
			mockCacheManager.get.mockResolvedValueOnce({ data: 'hit2' });

			await cacheService.Get('key1');
			await cacheService.Get('key2');
			await cacheService.Get('key3');

			const stats = cacheService.GetStats();
			// 2 hits, 1 miss = 2/3 = 66.67%
			expect(stats.hitRate).toBeCloseTo(66.67, 1);
		});

		it('should calculate hit rate with many operations', async () => {
			// 7 hits, 3 misses
			for (let i = 0; i < 7; i++) {
				mockCacheManager.get.mockResolvedValueOnce({ data: i });
				await cacheService.Get(`hit${i}`);
			}

			for (let i = 0; i < 3; i++) {
				mockCacheManager.get.mockResolvedValueOnce(null);
				await cacheService.Get(`miss${i}`);
			}

			const stats = cacheService.GetStats();
			// 7 hits, 3 misses = 7/10 = 70%
			expect(stats.hitRate).toBe(70);
		});

		it('should maintain hit rate accuracy after reset', async () => {
			mockCacheManager.get.mockResolvedValueOnce({ data: 'value' });
			mockCacheManager.get.mockResolvedValueOnce(null);

			await cacheService.Get('key1');
			await cacheService.Get('key2');

			let stats = cacheService.GetStats();
			expect(stats.hitRate).toBe(50);

			cacheService.ResetStats();

			stats = cacheService.GetStats();
			expect(stats.hitRate).toBe(0);
		});
	});

	describe('Cache Manager Null/Undefined Checks', () => {
		it('should check Value !== null condition in Get', async () => {
			mockCacheManager.get.mockResolvedValue(null);

			const result = await cacheService.Get('nullTest');

			expect(result).toBeUndefined();
			const stats = cacheService.GetStats();
			expect(stats.misses).toBe(1);
			expect(stats.hits).toBe(0);
		});

		it('should check Value !== undefined condition in Get', async () => {
			mockCacheManager.get.mockResolvedValue(undefined);

			const result = await cacheService.Get('undefinedTest');

			expect(result).toBeUndefined();
			const stats = cacheService.GetStats();
			expect(stats.misses).toBe(1);
			expect(stats.hits).toBe(0);
		});

		it('should handle edge case: boolean true as valid cache value', async () => {
			mockCacheManager.get.mockResolvedValue(true);

			const result = await cacheService.Get('boolTrue');

			expect(result).toBe(true);
			const stats = cacheService.GetStats();
			expect(stats.hits).toBe(1);
		});

		it('should handle edge case: NaN as valid cache value', async () => {
			mockCacheManager.get.mockResolvedValue(NaN);

			const result = await cacheService.Get('nanTest');

			expect(Number.isNaN(result as number)).toBe(true);
			const stats = cacheService.GetStats();
			expect(stats.hits).toBe(1);
		});
	});

	describe('GetOrSet Cache-Aside Pattern Branches', () => {
		it('should not call loader when cache hit', async () => {
			mockCacheManager.get.mockResolvedValue({ cached: 'data' });
			const loader = vi.fn().mockResolvedValue({ fresh: 'data' });

			const result = await cacheService.GetOrSet('hitKey', loader);

			expect(result).toEqual({ cached: 'data' });
			expect(loader).not.toHaveBeenCalled();
		});

		it('should call loader and cache on miss', async () => {
			mockCacheManager.get.mockResolvedValue(null);
			const loader = vi.fn().mockResolvedValue({ fresh: 'data' });

			const result = await cacheService.GetOrSet('missKey', loader, 600000);

			expect(result).toEqual({ fresh: 'data' });
			expect(loader).toHaveBeenCalled();
			expect(mockCacheManager.set).toHaveBeenCalledWith('missKey', { fresh: 'data' }, 600000);
		});

		it('should differentiate between null and undefined cache returns in getOrSet', async () => {
			const loader = vi.fn().mockResolvedValue({ fresh: 'data' });

			// Test with null
			mockCacheManager.get.mockResolvedValueOnce(null);
			const result1 = await cacheService.GetOrSet('key1', loader);
			expect(result1).toEqual({ fresh: 'data' });

			// Test with undefined
			mockCacheManager.get.mockResolvedValueOnce(undefined);
			const result2 = await cacheService.GetOrSet('key2', loader);
			expect(result2).toEqual({ fresh: 'data' });

			// Loader should be called twice (both null and undefined are cache misses)
			expect(loader).toHaveBeenCalledTimes(2);
		});
	});

	describe('Error Path Branches', () => {
		it('should catch and rethrow errors in Get (already handled gracefully)', async () => {
			mockCacheManager.get.mockRejectedValue(new Error('Get failed'));

			const result = await cacheService.Get('errorKey');

			expect(result).toBeUndefined();
		});

		it('should propagate errors in Set', async () => {
			mockCacheManager.set.mockRejectedValue(new Error('Set failed'));

			await expect(cacheService.Set('key', { data: 'test' })).rejects.toThrow('Set failed');
		});

		it('should propagate errors in GetOrSet loader', async () => {
			mockCacheManager.get.mockResolvedValue(null);
			const loader = vi.fn().mockRejectedValue(new Error('Load failed'));

			await expect(cacheService.GetOrSet('key', loader)).rejects.toThrow('Load failed');
		});

		it('should not cache when loader fails in GetOrSet', async () => {
			mockCacheManager.get.mockResolvedValue(null);
			const loader = vi.fn().mockRejectedValue(new Error('Load failed'));

			try {
				await cacheService.GetOrSet('key', loader);
			} catch {
				// Expected
			}

			expect(mockCacheManager.set).not.toHaveBeenCalled();
		});
	});

	describe('Cache Statistics Computation Branches', () => {
		it('should initialize stats with zero values', () => {
			const stats = cacheService.GetStats();

			expect(stats.hits).toBe(0);
			expect(stats.misses).toBe(0);
			expect(stats.hitRate).toBe(0);
		});

		it('should compute hit rate as 0 when total operations = 0', () => {
			const stats = cacheService.GetStats();

			expect(stats.hitRate).toBe(0);
		});

		it('should maintain stats across multiple operations', async () => {
			const operations = [
				{ cached: true },
				{ cached: false },
				{ cached: true },
				{ cached: true },
				{ cached: false },
			];

			for (const op of operations) {
				mockCacheManager.get.mockResolvedValueOnce(op.cached ? { data: 'test' } : null);
				await cacheService.Get('key');
			}

			const stats = cacheService.GetStats();
			expect(stats.hits).toBe(3);
			expect(stats.misses).toBe(2);
			expect(stats.hitRate).toBe(60);
		});
	});

	describe('Cache Key Generation Edge Cases', () => {
		it('should generate consistent keys with same args in different order', () => {
			const args1 = { z: 1, a: 2, m: 3 };
			const args2 = { a: 2, m: 3, z: 1 };

			const key1 = cacheService.GenerateKey('op', args1);
			const key2 = cacheService.GenerateKey('op', args2);

			expect(key1).toBe(key2);
		});

		it('should handle context sorting correctly', () => {
			const args = { id: 1 };
			const context = { z: 'last', a: 'first', m: 'middle' };

			const key = cacheService.GenerateKey('op', args, context);

			// Should have sorted context keys: a, m, z
			expect(key).toContain('a:"first"');
			expect(key.indexOf('a:"first"')).toBeLessThan(key.indexOf('m:"middle"'));
			expect(key.indexOf('m:"middle"')).toBeLessThan(key.indexOf('z:"last"'));
		});

		it('should include both args and context in key', () => {
			const args = { id: 123 };
			const context = { userId: 'user1' };

			const key = cacheService.GenerateKey('query', args, context);

			expect(key).toContain('id:123');
			expect(key).toContain('userId:"user1"');
		});

		it('should handle complex nested structures in args', () => {
			const args = {
				filter: { status: 'active', tags: ['a', 'b', 'c'] },
				pagination: { limit: 10, offset: 20 },
				nested: { deep: { value: 'test' } },
			};

			const key = cacheService.GenerateKey('search', args);

			expect(key).toContain('graphql:search');
			expect(key).toBeDefined();
			expect(key.length).toBeGreaterThan(0);
		});
	});
});
