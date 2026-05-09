import { Mutex } from 'async-mutex';
import type { ICachedRequest } from './page-info';

const _Cache = new Map<string, ICachedRequest<unknown>>();
const _Mutex = new Mutex();

// Maximum number of cached requests before eviction
const MAX_CACHE_SIZE = 1000;

/**
 * Evict oldest entry (FIFO) to make room for new entries
 */
function evictOldestEntry(): void {
	// Map iteration order is insertion order, so the first entry is the oldest
	const FirstKey = _Cache.keys().next().value;
	if (FirstKey) {
		_Cache.delete(FirstKey);
	}
}

/**
 * Retrieve a cached page request by ID.
 * Uses process-local in-memory cache protected by async-mutex.
 * No TTL enforcement at cache layer; caller must check ICachedRequest.Expiration.
 * @param id - Request ID to look up.
 * @returns Cached request or undefined if not found.
 */
export async function cacheGet<T>(id: string): Promise<ICachedRequest<T> | undefined> {
	const Result = await _Mutex.runExclusive(() => _Cache.get(id) as ICachedRequest<T> | undefined);
	return Result;
}

/**
 * Store a cached page request.
 * Thread-safe write to process-local in-memory cache.
 * Enforces MAX_CACHE_SIZE by evicting oldest entry (FIFO) when limit is exceeded.
 * @param entry - Request entry to cache.
 */
export async function cacheSet<T>(entry: ICachedRequest<T>): Promise<void> {
	await _Mutex.runExclusive(() => {
		// Add the new entry
		_Cache.set(entry.Id, entry as ICachedRequest<unknown>);

		// Evict oldest entry if cache exceeds maximum size
		if (_Cache.size > MAX_CACHE_SIZE) {
			evictOldestEntry();
		}
	});
}

/**
 * Delete a cached page request by ID.
 * Thread-safe delete from process-local in-memory cache.
 * @param id - Request ID to delete.
 */
export async function cacheDelete(id: string): Promise<void> {
	await _Mutex.runExclusive(() => {
		_Cache.delete(id);
	});
}
