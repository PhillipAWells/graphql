import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ModuleRef } from '@nestjs/core';
import { AppLogger } from '@pawells/nestjs-shared/common';
import { DataLoaderFactory } from '../dataloader.factory.js';

describe('DataLoaderFactory', () => {
	let factory: DataLoaderFactory;
	let mockModuleRef: any;
	let mockLogger: any;
	let mockContextualLogger: any;

	beforeEach(() => {
		mockContextualLogger = {
			debug: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		};

		mockLogger = {
			createContextualLogger: vi.fn(() => mockContextualLogger),
		};

		mockModuleRef = {
			get: vi.fn((token: any) => {
				if (token === AppLogger) {
					return mockLogger;
				}
				throw new Error(`Unknown token: ${String(token)}`);
			}),
		} as any;

		factory = new DataLoaderFactory(mockModuleRef as ModuleRef);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Create', () => {
		it('should create a DataLoader instance', () => {
			const batchLoadFn = vi.fn(async (keys: readonly string[]) => {
				return keys.map((key) => `value-${key}`);
			});

			const loader = factory.Create({
				batchLoadFn,
			});

			expect(loader).toBeDefined();
			expect(loader.load).toBeDefined();
		});

		it('should handle batch loading with correct result count', async () => {
			const batchLoadFn = vi.fn(async (keys: readonly string[]) => {
				return keys.map((key) => `value-${key}`);
			});

			const loader = factory.Create({ batchLoadFn });

			const results = await Promise.all([
				loader.load('key1'),
				loader.load('key2'),
				loader.load('key3'),
			]);

			expect(results).toEqual(['value-key1', 'value-key2', 'value-key3']);
			expect(batchLoadFn).toHaveBeenCalledWith(expect.arrayContaining(['key1', 'key2', 'key3']));
		});

		describe('Error handling - too few results', () => {
			it('should pad with error objects when batch function returns fewer results', async () => {
				const batchLoadFn = vi.fn(async (_keys: readonly string[]) => {
					// Intentionally return fewer results than keys
					return ['value-key1'];
				});

				const loader = factory.Create({ batchLoadFn });

				const result1Promise = loader.load('key1');
				const result2Promise = loader.load('key2');
				const result3Promise = loader.load('key3');

				const result1 = await result1Promise;
				expect(result1).toBe('value-key1');

				// key2 and key3 should get padding errors
				await expect(result2Promise).rejects.toThrow('Batch load function returned insufficient results');
				await expect(result3Promise).rejects.toThrow('Batch load function returned insufficient results');
			});

			it('should log warning when batch function returns too few results', async () => {
				const batchLoadFn = vi.fn(async (_keys: readonly string[]) => {
					return ['value-key1']; // Only 1 result for 3 keys
				});

				const loader = factory.Create({ batchLoadFn });

				// Load all keys at once to trigger single batch call
				const promises = [
					loader.load('key1'),
					loader.load('key2'),
					loader.load('key3'),
				];

				const result1 = await promises[0];
				expect(result1).toBe('value-key1');

				// Wait for other promises to complete (they should error)
				await Promise.all(promises).catch(() => {
					// Expected that some fail
				});

				expect(mockContextualLogger.warn).toHaveBeenCalledWith(
					expect.stringContaining('returned 1 results for 3 keys'),
				);
			});
		});

		describe('Error handling - too many results', () => {
			it('should handle extra results properly by truncating to exact key count', async () => {
				const batchLoadFn = vi.fn(async (_keys: readonly string[]) => {
					// Return more results than keys - 5 for 3
					return [
						'value-key1',
						'value-key2',
						'value-key3',
						'extra-value-1',
						'extra-value-2',
					];
				});

				const loader = factory.Create({ batchLoadFn });

				const results = await Promise.all([
					loader.load('key1'),
					loader.load('key2'),
					loader.load('key3'),
				]);

				expect(results).toHaveLength(3);
				expect(results[0]).toBe('value-key1');
				expect(results[1]).toBe('value-key2');
				expect(results[2]).toBe('value-key3');
				// Only 3 results should be returned, extras should be discarded
			});

			it('should log warning when batch function returns too many results', async () => {
				const batchLoadFn = vi.fn(async (_keys: readonly string[]) => {
					// Return 5 results for 3 keys
					return [
						'value-key1',
						'value-key2',
						'value-key3',
						'extra-value-1',
						'extra-value-2',
					];
				});

				const loader = factory.Create({ batchLoadFn });

				await Promise.all([
					loader.load('key1'),
					loader.load('key2'),
					loader.load('key3'),
				]);

				expect(mockContextualLogger.warn).toHaveBeenCalledWith(
					expect.stringContaining('returned 5 results for 3 keys'),
				);
			});

			it('should replace excess results with error objects internally', async () => {
				const batchLoadFn = vi.fn(async (_keys: readonly string[]) => {
					// Return 5 results for 3 keys
					return [
						'value1',
						'value2',
						'value3',
						'value4',
						'value5',
					];
				});

				const loader = factory.Create({ batchLoadFn });

				const [result1, result2, result3] = await Promise.all([
					loader.load('key1'),
					loader.load('key2'),
					loader.load('key3'),
				]);

				// Should get exactly 3 results
				expect(result1).toBe('value1');
				expect(result2).toBe('value2');
				expect(result3).toBe('value3');
				// Extra values are replaced with errors internally and truncated
			});
		});

		describe('Error handling - batch function throws', () => {
			it('should return errors for all keys when batch function throws', async () => {
				const testError = new Error('Batch function failed');
				const batchLoadFn = vi.fn(async () => {
					throw testError;
				});

				const loader = factory.Create({ batchLoadFn });

				const promise1 = loader.load('key1');
				const promise2 = loader.load('key2');
				const promise3 = loader.load('key3');

				await expect(promise1).rejects.toThrow('Batch function failed');
				await expect(promise2).rejects.toThrow('Batch function failed');
				await expect(promise3).rejects.toThrow('Batch function failed');
			});

			it('should log error when batch function throws', async () => {
				const testError = new Error('Batch function failed');
				const batchLoadFn = vi.fn(async () => {
					throw testError;
				});

				const loader = factory.Create({ batchLoadFn });

				await expect(loader.load('key1')).rejects.toThrow();
				await expect(loader.load('key2')).rejects.toThrow();

				expect(mockContextualLogger.error).toHaveBeenCalledWith(
					expect.stringContaining('Batch loading failed'),
				);
			});
		});

		describe('DataLoader options', () => {
			it('should pass cache option to DataLoader', () => {
				const batchLoadFn = vi.fn(async (keys: readonly string[]) => {
					return keys.map((key) => `value-${key}`);
				});

				const loader = factory.Create({
					batchLoadFn,
					cache: false,
				});

				expect(loader).toBeDefined();
			});

			it('should pass cacheKeyFn option to DataLoader', () => {
				const batchLoadFn = vi.fn(async (keys: readonly string[]) => {
					return keys.map((key) => `value-${key}`);
				});

				const cacheKeyFn = (key: string) => key.toLowerCase();

				const loader = factory.Create({
					batchLoadFn,
					cacheKeyFn,
				});

				expect(loader).toBeDefined();
			});

			it('should pass maxBatchSize option to DataLoader', () => {
				const batchLoadFn = vi.fn(async (keys: readonly string[]) => {
					return keys.map((key) => `value-${key}`);
				});

				const loader = factory.Create({
					batchLoadFn,
					maxBatchSize: 10,
				});

				expect(loader).toBeDefined();
			});

			it('should pass batchScheduleFn option to DataLoader', () => {
				const batchLoadFn = vi.fn(async (keys: readonly string[]) => {
					return keys.map((key) => `value-${key}`);
				});

				const batchScheduleFn = (callback: () => void) => {
					setTimeout(callback, 10);
				};

				const loader = factory.Create({
					batchLoadFn,
					batchScheduleFn,
				});

				expect(loader).toBeDefined();
			});
		});

		describe('CreateWithCache', () => {
			it('should create DataLoader with cache enabled', () => {
				const batchLoadFn = vi.fn(async (keys: readonly string[]) => {
					return keys.map((key) => `value-${key}`);
				});

				const loader = factory.CreateWithCache(batchLoadFn);

				expect(loader).toBeDefined();
			});

			it('should accept additional options', () => {
				const batchLoadFn = vi.fn(async (keys: readonly string[]) => {
					return keys.map((key) => `value-${key}`);
				});

				const loader = factory.CreateWithCache(batchLoadFn, {
					maxBatchSize: 5,
				});

				expect(loader).toBeDefined();
			});
		});

		describe('CreateWithoutCache', () => {
			it('should create DataLoader with cache disabled', () => {
				const batchLoadFn = vi.fn(async (keys: readonly string[]) => {
					return keys.map((key) => `value-${key}`);
				});

				const loader = factory.CreateWithoutCache(batchLoadFn);

				expect(loader).toBeDefined();
			});

			it('should accept additional options', () => {
				const batchLoadFn = vi.fn(async (keys: readonly string[]) => {
					return keys.map((key) => `value-${key}`);
				});

				const loader = factory.CreateWithoutCache(batchLoadFn, {
					maxBatchSize: 5,
				});

				expect(loader).toBeDefined();
			});
		});
	});
});
