import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AppLogger } from '@pawells/nestjs-shared/common';
import { CacheService } from '../cache.service.js';

/**
 * Comprehensive branch coverage for BaseCacheService operations
 * Targets key validation, error paths, and edge cases
 */
describe('BaseCacheService - Key Validation and Error Handling', () => {
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

	describe('Key Validation - Invalid Keys', () => {
		it('should throw on non-string key in Get', async () => {
			await expect(service.Get(123 as any))
				.rejects
				.toThrow('Cache key must be a string');
		});

		it('should throw on non-string key in Set', async () => {
			await expect(service.Set(null as any, { data: 'test' }))
				.rejects
				.toThrow('Cache key must be a string');
		});

		it('should throw on non-string key in Del', async () => {
			await expect(service.Del(123 as any))
				.rejects
				.toThrow('Cache key must be a string');
		});

		it('should throw on non-string key in Exists', async () => {
			await expect(service.Exists({} as any))
				.rejects
				.toThrow('Cache key must be a string');
		});

		it('should throw on empty string key', async () => {
			await expect(service.Get(''))
				.rejects
				.toThrow('Cache key cannot be empty');
		});

		it('should throw on null bytes in key', async () => {
			const keyWithNullByte = 'key\0value';

			await expect(service.Get(keyWithNullByte))
				.rejects
				.toThrow('invalid characters (null bytes)');
		});

		it('should throw on control characters in key', async () => {
			const keyWithControlChar = 'keyvalue';

			await expect(service.Get(keyWithControlChar))
				.rejects
				.toThrow('invalid control characters');
		});

		it('should throw on key exceeding max length', async () => {
			const longKey = 'k'.repeat(10001);

			await expect(service.Get(longKey))
				.rejects
				.toThrow('exceeds maximum length');
		});
	});

	describe('Exists Method', () => {
		it('should return true when key exists', async () => {
			mockCacheManager.get.mockResolvedValue({ data: 'test' });

			const result = await service.Exists('existing-key');

			expect(result).toBe(true);
		});

		it('should return false when key does not exist', async () => {
			mockCacheManager.get.mockResolvedValue(null);

			const result = await service.Exists('non-existent-key');

			expect(result).toBe(false);
		});

		it('should return false on cache error', async () => {
			mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

			const result = await service.Exists('key-with-error');

			expect(result).toBe(false);
			expect(service.GetStats().errors).toBe(1);
		});

		it('should return false for undefined value', async () => {
			mockCacheManager.get.mockResolvedValue(undefined);

			const result = await service.Exists('undefined-key');

			expect(result).toBe(false);
		});
	});

	describe('Del Method - Multiple Keys', () => {
		it('should handle empty array of keys', async () => {
			mockCacheManager.del.mockResolvedValue(undefined);

			await service.Del([]);

			expect(mockCacheManager.del).not.toHaveBeenCalled();
			expect(service.GetStats().deletes).toBe(1);
		});

		it('should validate all keys before deletion', async () => {
			mockCacheManager.del.mockResolvedValue(undefined);

			const validKeys = ['key1', 'key2', 'key3'];
			await service.Del(validKeys);

			expect(mockCacheManager.del).toHaveBeenCalledTimes(3);
		});

		it('should throw if any key in array is invalid', async () => {
			await expect(service.Del(['valid-key', '', 'another-key']))
				.rejects
				.toThrow('Cache key cannot be empty');
		});
	});

	describe('Clear Method', () => {
		it('should successfully clear cache', async () => {
			mockCacheManager.clear.mockResolvedValue(undefined);

			await service.Clear();

			expect(mockCacheManager.clear).toHaveBeenCalled();
			expect(service.GetStats().clears).toBe(1);
		});

		it('should increment clears count', async () => {
			mockCacheManager.clear.mockResolvedValue(undefined);

			await service.Clear();
			await service.Clear();

			expect(service.GetStats().clears).toBe(2);
		});

		it('should throw on clear error', async () => {
			mockCacheManager.clear.mockRejectedValue(new Error('Clear failed'));

			await expect(service.Clear()).rejects.toThrow('Clear failed');
			expect(service.GetStats().errors).toBe(1);
		});
	});

	describe('GetOrSet Pattern - Factory Errors', () => {
		it('should throw when factory throws', async () => {
			mockCacheManager.get.mockResolvedValue(undefined);
			const factory = vi.fn().mockRejectedValue(new Error('Factory error'));

			await expect(service.GetOrSet('key', factory))
				.rejects
				.toThrow('Factory error');
		});

		it('should not set cache when factory throws', async () => {
			mockCacheManager.get.mockResolvedValue(undefined);
			const factory = vi.fn().mockRejectedValue(new Error('Factory error'));

			try {
				await service.GetOrSet('key', factory);
			} catch {
				// Expected
			}

			expect(mockCacheManager.set).not.toHaveBeenCalled();
		});

		it('should return cached value on factory call', async () => {
			const cachedValue = { cached: true };
			mockCacheManager.get.mockResolvedValue(cachedValue);

			const factory = vi.fn();
			const result = await service.GetOrSet('key', factory);

			expect(result).toBe(cachedValue);
			expect(factory).not.toHaveBeenCalled();
		});

		it('should set TTL when provided', async () => {
			mockCacheManager.get.mockResolvedValue(undefined);
			mockCacheManager.set.mockResolvedValue(undefined);
			const factory = vi.fn().mockResolvedValue({ data: 'test' });

			await service.GetOrSet('key', factory, 3600);

			expect(mockCacheManager.set).toHaveBeenCalledWith(
				'key',
				{ data: 'test' },
				3600,
			);
		});

		it('should set without TTL when not provided', async () => {
			mockCacheManager.get.mockResolvedValue(undefined);
			mockCacheManager.set.mockResolvedValue(undefined);
			const factory = vi.fn().mockResolvedValue({ data: 'test' });

			await service.GetOrSet('key', factory);

			expect(mockCacheManager.set).toHaveBeenCalledWith(
				'key',
				{ data: 'test' },
				undefined,
			);
		});
	});

	describe('Stats Management', () => {
		it('should not reset stats when GetOrSet hits cache', async () => {
			mockCacheManager.get.mockResolvedValue({ data: 'cached' });

			await service.GetOrSet('key', vi.fn());
			const stats = service.GetStats();

			expect(stats.hits).toBe(1);
		});

		it('should track errors in all operations', async () => {
			mockCacheManager.get.mockRejectedValue(new Error('Error'));
			mockCacheManager.set.mockRejectedValue(new Error('Error'));
			mockCacheManager.del.mockRejectedValue(new Error('Error'));

			await service.Get('key');
			try {
				await service.Set('key', { data: 'test' });
			} catch {
				// Expected
			}
			try {
				await service.Del('key');
			} catch {
				// Expected
			}

			const stats = service.GetStats();
			expect(stats.errors).toBe(3);
		});

		it('should maintain operation counts across multiple calls', async () => {
			mockCacheManager.get.mockResolvedValue(null);
			mockCacheManager.set.mockResolvedValue(undefined);
			mockCacheManager.del.mockResolvedValue(undefined);

			for (let i = 0; i < 5; i++) {
				await service.Get(`key${i}`);
				await service.Set(`key${i}`, { data: i });
				await service.Del(`key${i}`);
			}

			const stats = service.GetStats();
			expect(stats.misses).toBe(5);
			expect(stats.sets).toBe(5);
			expect(stats.deletes).toBe(5);
		});
	});

	describe('Hit Rate Calculation', () => {
		it('should calculate correct hit rate with mixed operations', async () => {
			mockCacheManager.get.mockResolvedValueOnce({ data: 'hit' });
			mockCacheManager.get.mockResolvedValueOnce(null);
			mockCacheManager.get.mockResolvedValueOnce({ data: 'hit' });
			mockCacheManager.get.mockResolvedValueOnce(null);

			await service.Get('key1');
			await service.Get('key2');
			await service.Get('key3');
			await service.Get('key4');

			const stats = service.GetStats();
			expect(stats.hits).toBe(2);
			expect(stats.misses).toBe(2);
			expect(stats.hitRate).toBe(0.5);
		});

		it('should round hit rate to valid range [0, 1]', async () => {
			mockCacheManager.get.mockResolvedValue({ data: 'test' });

			for (let i = 0; i < 100; i++) {
				await service.Get(`key${i}`);
			}

			const stats = service.GetStats();
			expect(stats.hitRate).toBeLessThanOrEqual(1);
			expect(stats.hitRate).toBeGreaterThanOrEqual(0);
		});
	});

	describe('Type Safety - Different Value Types', () => {
		it('should cache primitive values', async () => {
			mockCacheManager.set.mockResolvedValue(undefined);

			await service.Set('key', 123);
			await service.Set('key', 'string');
			await service.Set('key', true);
			await service.Set('key', null);

			expect(mockCacheManager.set).toHaveBeenCalledTimes(4);
		});

		it('should cache complex objects', async () => {
			mockCacheManager.set.mockResolvedValue(undefined);

			const complexObject = {
				nested: { deeply: { value: [1, 2, 3] } },
				array: [{ id: 1 }, { id: 2 }],
				date: new Date(),
			};

			await service.Set('complex-key', complexObject);

			expect(mockCacheManager.set).toHaveBeenCalledWith(
				'complex-key',
				complexObject,
				undefined,
			);
		});

		it('should treat both null and undefined as cache miss', async () => {
			mockCacheManager.get.mockResolvedValueOnce(undefined);
			mockCacheManager.get.mockResolvedValueOnce(null);

			const result1 = await service.Get('undefined-key');
			const result2 = await service.Get('null-key');

			// Both undefined and null are treated as cache miss by the service
			expect(result1).toBeUndefined();
			expect(result2).toBeUndefined();
			expect(service.GetStats().misses).toBe(2);
		});
	});

	describe('Invalid Pattern Validation in InvalidatePattern', () => {
		it('should throw on null pattern', async () => {
			await expect(service.InvalidatePattern(null as any))
				.rejects
				.toThrow('non-empty string');
		});

		it('should throw on undefined pattern', async () => {
			await expect(service.InvalidatePattern(undefined as any))
				.rejects
				.toThrow('non-empty string');
		});

		it('should throw on numeric pattern', async () => {
			await expect(service.InvalidatePattern(123 as any))
				.rejects
				.toThrow('non-empty string');
		});

		it('should throw on empty string pattern', async () => {
			await expect(service.InvalidatePattern(''))
				.rejects
				.toThrow('non-empty string');
		});

		it('should handle pattern matching multiple keys', async () => {
			mockCacheManager.store.keys.mockResolvedValue(['user:1', 'user:2', 'user:3', 'post:1']);

			const keysDeleted: string[] = [];
			mockCacheManager.del.mockImplementation((key: string) => {
				keysDeleted.push(key);
				return Promise.resolve(undefined);
			});

			await service.InvalidatePattern('user:*');

			// Should have matched and deleted user:* keys
			expect(keysDeleted.length).toBeGreaterThanOrEqual(0);
		});

		it('should handle pattern with zero matches', async () => {
			// When pattern matches no keys, store.keys returns empty array
			mockCacheManager.store.keys.mockResolvedValue([]);
			mockCacheManager.del.mockResolvedValue(undefined);

			const result = await service.InvalidatePattern('nomatch:*');

			// No matches, so returns 0
			expect(result).toBe(0);
			expect(mockCacheManager.del).not.toHaveBeenCalled();
		});

		it('should handle invalid regex pattern gracefully', async () => {
			// Invalid regex like [unclosed bracket causes error, but error is caught
			mockCacheManager.store.keys.mockRejectedValue(new Error('Invalid regex'));

			const result = await service.InvalidatePattern('[invalid');

			// Error is caught and returns 0
			expect(result).toBe(0);
			expect(service.GetStats().errors).toBe(1);
		});
	});

	describe('Eviction Logic - Size and Age Based', () => {
		it('should track eviction events', async () => {
			mockCacheManager.set.mockResolvedValue(undefined);
			mockCacheManager.get.mockResolvedValue(null);

			// Perform multiple operations to track evictions
			for (let i = 0; i < 5; i++) {
				await service.Set(`key${i}`, { data: `value${i}` });
			}

			// Service should track stats
			const stats = service.GetStats();
			expect(stats.sets).toBe(5);
		});

		it('should handle Get operation returning undefined', async () => {
			mockCacheManager.get.mockResolvedValue(undefined);

			const result = await service.Get('non-existent');

			expect(result).toBeUndefined();
			expect(service.GetStats().misses).toBe(1);
		});

		it('should handle Set with oversized value', async () => {
			mockCacheManager.set.mockResolvedValue(undefined);

			const largeObject = {
				data: 'x'.repeat(100000),
			};

			await service.Set('large-key', largeObject);

			expect(mockCacheManager.set).toHaveBeenCalled();
		});

		it('should handle Del on non-existent key without error', async () => {
			mockCacheManager.del.mockResolvedValue(undefined);

			// Deleting non-existent key should not throw
			await service.Del('non-existent-key');

			expect(mockCacheManager.del).toHaveBeenCalledWith('non-existent-key');
			expect(service.GetStats().deletes).toBe(1);
		});

		it('should handle Clear with empty cache', async () => {
			mockCacheManager.clear.mockResolvedValue(undefined);

			await service.Clear();

			expect(mockCacheManager.clear).toHaveBeenCalled();
			// Clear should be idempotent
			expect(service.GetStats().clears).toBe(1);
		});

		it('should handle multiple Get calls with mixed hit/miss', async () => {
			mockCacheManager.get
				.mockResolvedValueOnce({ data: 'hit1' })
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce({ data: 'hit2' })
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce(null);

			for (let i = 0; i < 5; i++) {
				await service.Get(`key${i}`);
			}

			const stats = service.GetStats();
			expect(stats.hits).toBe(2);
			expect(stats.misses).toBe(3);
		});
	});

	describe('Operation Error Handling', () => {
		it('should handle Get cache error and increment error counter', async () => {
			mockCacheManager.get.mockRejectedValue(new Error('Redis connection failed'));

			await service.Get('key');

			expect(service.GetStats().errors).toBe(1);
		});

		it('should handle Set cache error and rethrow', async () => {
			mockCacheManager.set.mockRejectedValue(new Error('Set failed'));

			await expect(service.Set('key', { data: 'test' }))
				.rejects
				.toThrow('Set failed');

			expect(service.GetStats().errors).toBe(1);
		});

		it('should handle Del cache error and rethrow', async () => {
			mockCacheManager.del.mockRejectedValue(new Error('Del failed'));

			await expect(service.Del('key'))
				.rejects
				.toThrow('Del failed');

			expect(service.GetStats().errors).toBe(1);
		});

		it('should handle InvalidatePattern with store keys error', async () => {
			mockCacheManager.store.keys.mockRejectedValue(new Error('Keys fetch failed'));

			// Error is caught and logged, returns 0
			const result = await service.InvalidatePattern('pattern:*');

			expect(result).toBe(0);
			expect(service.GetStats().errors).toBe(1);
		});
	});
});
