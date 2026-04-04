import { describe, it, expect, afterEach } from 'vitest';
import { CacheGet, CacheSet, CacheDelete } from '../cache';
import type { ICachedRequest } from '../page-info';

describe('Cache', () => {
	afterEach(async () => {
		// Clean up cache after each test
		const testId = 'test-id-1';
		await CacheDelete(testId);
	});

	it('should return undefined for missing cache key', async () => {
		const result = await CacheGet('nonexistent-key');
		expect(result).toBeUndefined();
	});

	it('should set and get cache entry', async () => {
		const entry: ICachedRequest<string> = {
			ID: 'test-id-1',
			Entries: ['a', 'b', 'c'],
			Expiration: new Date(),
		};

		await CacheSet(entry);
		const result = await CacheGet<string>('test-id-1');

		expect(result).toBeDefined();
		expect(result?.ID).toBe('test-id-1');
		expect(result?.Entries).toEqual(['a', 'b', 'c']);
	});

	it('should delete cache entry', async () => {
		const entry: ICachedRequest<number> = {
			ID: 'test-id-2',
			Entries: [1, 2, 3],
			Expiration: new Date(),
		};

		await CacheSet(entry);
		let result = await CacheGet<number>('test-id-2');
		expect(result).toBeDefined();

		await CacheDelete('test-id-2');
		result = await CacheGet<number>('test-id-2');
		expect(result).toBeUndefined();
	});

	it('should handle complex object types in entries', async () => {
		interface User { id: number; name: string }
		const entry: ICachedRequest<User> = {
			ID: 'test-id-3',
			Entries: [
				{ id: 1, name: 'Alice' },
				{ id: 2, name: 'Bob' },
			],
			Expiration: new Date('2025-12-31'),
		};

		await CacheSet(entry);
		const result = await CacheGet<User>('test-id-3');

		expect(result).toBeDefined();
		expect(result?.Entries).toHaveLength(2);
		expect(result?.Entries[0]).toEqual({ id: 1, name: 'Alice' });
		expect(result?.Expiration.toISOString()).toContain('2025-12-31');
	});

	it('should overwrite existing cache entry', async () => {
		const entry1: ICachedRequest<string> = {
			ID: 'test-id-4',
			Entries: ['old'],
			Expiration: new Date(),
		};

		await CacheSet(entry1);
		let result = await CacheGet<string>('test-id-4');
		expect(result?.Entries).toEqual(['old']);

		const entry2: ICachedRequest<string> = {
			ID: 'test-id-4',
			Entries: ['new'],
			Expiration: new Date(),
		};

		await CacheSet(entry2);
		result = await CacheGet<string>('test-id-4');
		expect(result?.Entries).toEqual(['new']);
	});

	it('should handle empty entries array', async () => {
		const entry: ICachedRequest<string> = {
			ID: 'test-id-5',
			Entries: [],
			Expiration: new Date(),
		};

		await CacheSet(entry);
		const result = await CacheGet<string>('test-id-5');

		expect(result).toBeDefined();
		expect(result?.Entries).toEqual([]);
	});
});
