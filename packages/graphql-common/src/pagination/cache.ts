import { Mutex } from 'async-mutex';
import type { ICachedRequest } from './page-info';

const _Cache = new Map<string, ICachedRequest<unknown>>();
const _Mutex = new Mutex();

/**
 * Retrieve a cached page request by ID.
 * Uses process-local in-memory cache protected by async-mutex.
 * No TTL enforcement at cache layer; caller must check ICachedRequest.Expiration.
 * @param id - Request ID to look up.
 * @returns Cached request or undefined if not found.
 */
export async function CacheGet<T>(id: string): Promise<ICachedRequest<T> | undefined> {
	const Result = await _Mutex.runExclusive(() => _Cache.get(id) as ICachedRequest<T> | undefined);
	return Result;
}

/**
 * Store a cached page request.
 * Thread-safe write to process-local in-memory cache.
 * @param entry - Request entry to cache.
 */
export async function CacheSet<T>(entry: ICachedRequest<T>): Promise<void> {
	await _Mutex.runExclusive(() => {
		_Cache.set(entry.Id, entry as ICachedRequest<unknown>);
	});
}

/**
 * Delete a cached page request by ID.
 * Thread-safe delete from process-local in-memory cache.
 * @param id - Request ID to delete.
 */
export async function CacheDelete(id: string): Promise<void> {
	await _Mutex.runExclusive(() => {
		_Cache.delete(id);
	});
}
