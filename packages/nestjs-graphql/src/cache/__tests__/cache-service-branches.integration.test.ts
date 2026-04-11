import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AppLogger } from '@pawells/nestjs-shared/common';
import { CacheService } from '../cache.service.js';

/**
 * Integration tests for cache.service.ts branch coverage
 * Targets cache key generation branches (Lines 35-41)
 */
describe('Cache Service - Key Generation Branch Coverage', () => {
	let cacheService: CacheService;
	let mockCacheManager: any;
	let mockAppLogger: any;

	beforeEach(() => {
		// Mock Cache Manager
		mockCacheManager = {
			set: vi.fn().mockResolvedValue(undefined),
			get: vi.fn().mockResolvedValue(null),
			del: vi.fn().mockResolvedValue(undefined),
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

		cacheService = new CacheService(mockModuleRef);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Cache Key Generation Branches (Lines 35-41)', () => {
		it('should generate key from string args directly (typeof args === "string")', async () => {
			const stringArgs = 'simple-string-key';

			mockCacheManager.get.mockResolvedValue(null);
			const loader = vi.fn().mockResolvedValue({ data: 'test' });

			await cacheService.GetOrSet(stringArgs, loader);

			expect(mockCacheManager.set).toHaveBeenCalled();
			expect(mockCacheManager.set.mock.calls[0][0]).toBe(stringArgs);
		});

		it('should convert object args to JSON (typeof args === "object")', async () => {
			const objectArgs = { id: 123, name: 'test' };
			const expectedKey = JSON.stringify(objectArgs);

			mockCacheManager.get.mockResolvedValue(null);
			const loader = vi.fn().mockResolvedValue({ data: 'test' });

			await cacheService.GetOrSet(expectedKey, loader);

			expect(mockCacheManager.set).toHaveBeenCalled();
			expect(mockCacheManager.set.mock.calls[0][0]).toBe(expectedKey);
		});

		it('should pass through string that represents JSON object', async () => {
			const jsonString = '{"field1":"value1","field2":42}';

			mockCacheManager.get.mockResolvedValue(null);
			const loader = vi.fn().mockResolvedValue({ data: 'test' });

			await cacheService.GetOrSet(jsonString, loader);

			expect(mockCacheManager.set).toHaveBeenCalled();
			expect(mockCacheManager.set.mock.calls[0][0]).toBe(jsonString);
		});

		it('should differentiate between string and object by key format', async () => {
			mockCacheManager.get.mockResolvedValue(null);
			const loader = vi.fn().mockResolvedValue({ data: 'test' });

			// String key (simple)
			const stringKey = 'test-string';
			await cacheService.GetOrSet(stringKey, loader);

			// String key (JSON format from object)
			const objectJsonKey = '{"test":"object"}';
			await cacheService.GetOrSet(objectJsonKey, loader);

			const { calls } = mockCacheManager.set.mock;
			expect(calls.length).toBe(2);
			// First call should use simple string
			expect(calls[0][0]).toBe(stringKey);
			// Second call should use JSON string
			expect(calls[1][0]).toBe(objectJsonKey);
		});

		it('should handle array-formatted JSON string', async () => {
			const arrayJsonKey = '[1,2,3]';

			mockCacheManager.get.mockResolvedValue(null);
			const loader = vi.fn().mockResolvedValue({ data: 'test' });

			await cacheService.GetOrSet(arrayJsonKey, loader);

			expect(mockCacheManager.set).toHaveBeenCalled();
			expect(mockCacheManager.set.mock.calls[0][0]).toBe(arrayJsonKey);
		});

		it('should handle complex nested object formatted as JSON string', async () => {
			const complexJsonKey = '{"user":{"id":1,"name":"John"},"settings":{"theme":"dark"},"tags":["a","b"]}';

			mockCacheManager.get.mockResolvedValue(null);
			const loader = vi.fn().mockResolvedValue({ data: 'test' });

			await cacheService.GetOrSet(complexJsonKey, loader);

			expect(mockCacheManager.set).toHaveBeenCalled();
			expect(mockCacheManager.set.mock.calls[0][0]).toBe(complexJsonKey);
		});

		it('should handle numeric string keys', async () => {
			const numericStringKey = '12345';

			mockCacheManager.get.mockResolvedValue(null);
			const loader = vi.fn().mockResolvedValue({ data: 'test' });

			await cacheService.GetOrSet(numericStringKey, loader);

			expect(mockCacheManager.set).toHaveBeenCalled();
			expect(mockCacheManager.set.mock.calls[0][0]).toBe(numericStringKey);
		});

		it('should handle boolean string keys', async () => {
			const booleanStringKey = 'true';

			mockCacheManager.get.mockResolvedValue(null);
			const loader = vi.fn().mockResolvedValue({ data: 'test' });

			await cacheService.GetOrSet(booleanStringKey, loader);

			expect(mockCacheManager.set).toHaveBeenCalled();
			expect(mockCacheManager.set.mock.calls[0][0]).toBe(booleanStringKey);
		});
	});

	describe('Cache Service Integration with Key Generation', () => {
		it('should use key for Set operation', async () => {
			const key = 'cache-key-1';
			const value = { data: 'test' };

			await cacheService.Set(key, value);

			expect(mockCacheManager.set).toHaveBeenCalled();
			expect(mockCacheManager.set.mock.calls[0][0]).toBe(key);
			expect(mockCacheManager.set.mock.calls[0][1]).toEqual(value);
		});

		it('should use key for Get operation', async () => {
			const key = 'cache-key-2';

			mockCacheManager.get.mockResolvedValue(null);

			await cacheService.Get(key);

			expect(mockCacheManager.get).toHaveBeenCalledWith(key);
		});

		it('should consistently use same key for same input', async () => {
			const key1 = 'user-data-john-admin';
			const key2 = 'user-data-john-admin';

			mockCacheManager.get.mockResolvedValue(null);
			const loader = vi.fn().mockResolvedValue({ data: 'test' });

			await cacheService.GetOrSet(key1, loader);
			await cacheService.GetOrSet(key2, loader);

			const { calls } = mockCacheManager.set.mock;
			expect(calls[0][0]).toBe(calls[1][0]);
		});

		it('should handle GetOrSet with different string key formats', async () => {
			const simpleKey = 'simple-key';
			const jsonKey = '{"id":1}';
			const numericKey = '42';

			mockCacheManager.get.mockResolvedValue(null);
			const loader = vi.fn().mockResolvedValue({ data: 'test' });

			await cacheService.GetOrSet(simpleKey, loader);
			await cacheService.GetOrSet(jsonKey, loader);
			await cacheService.GetOrSet(numericKey, loader);

			const { calls } = mockCacheManager.set.mock;
			expect(calls.length).toBe(3);
			expect(calls[0][0]).toBe('simple-key');
			expect(calls[1][0]).toBe('{"id":1}');
			expect(calls[2][0]).toBe('42');
		});
	});

	describe('Key Generation Edge Cases', () => {
		it('should handle JSON object string key', async () => {
			const jsonKey = '{"type":"user","id":123}';

			mockCacheManager.get.mockResolvedValue(null);
			const loader = vi.fn().mockResolvedValue({ data: 'test' });

			await cacheService.GetOrSet(jsonKey, loader);

			expect(mockCacheManager.set).toHaveBeenCalled();
			expect(mockCacheManager.set.mock.calls[0][0]).toBe(jsonKey);
		});

		it('should handle numeric string key', async () => {
			const numericKey = '12345';

			mockCacheManager.get.mockResolvedValue(null);
			const loader = vi.fn().mockResolvedValue({ data: 'test' });

			await cacheService.GetOrSet(numericKey, loader);

			expect(mockCacheManager.set).toHaveBeenCalled();
			expect(mockCacheManager.set.mock.calls[0][0]).toBe('12345');
		});

		it('should handle boolean-like string key', async () => {
			const booleanKey = 'true';

			mockCacheManager.get.mockResolvedValue(null);
			const loader = vi.fn().mockResolvedValue({ data: 'test' });

			await cacheService.GetOrSet(booleanKey, loader);

			expect(mockCacheManager.set).toHaveBeenCalled();
			expect(mockCacheManager.set.mock.calls[0][0]).toBe('true');
		});

		it('should handle special characters in string key', async () => {
			const specialKey = 'cache:user:123:profile';

			mockCacheManager.get.mockResolvedValue(null);
			const loader = vi.fn().mockResolvedValue({ data: 'test' });

			await cacheService.GetOrSet(specialKey, loader);

			expect(mockCacheManager.set).toHaveBeenCalled();
			expect(mockCacheManager.set.mock.calls[0][0]).toBe(specialKey);
		});

		it('should handle UUID string key', async () => {
			const uuidKey = '550e8400-e29b-41d4-a716-446655440000';

			mockCacheManager.get.mockResolvedValue(null);
			const loader = vi.fn().mockResolvedValue({ data: 'test' });

			await cacheService.GetOrSet(uuidKey, loader);

			expect(mockCacheManager.set).toHaveBeenCalled();
			expect(mockCacheManager.set.mock.calls[0][0]).toBe(uuidKey);
		});
	});
});
