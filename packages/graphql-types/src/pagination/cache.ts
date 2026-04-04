import { Mutex } from 'async-mutex';
import type { ICachedRequest } from './page-info';

const _cache = new Map<string, ICachedRequest<unknown>>();
const _mutex = new Mutex();

export async function CacheGet<T>(id: string): Promise<ICachedRequest<T> | undefined> {
	return _mutex.runExclusive(() => _cache.get(id) as ICachedRequest<T> | undefined);
}

export async function CacheSet<T>(entry: ICachedRequest<T>): Promise<void> {
	return _mutex.runExclusive(() => {
		_cache.set(entry.ID, entry as ICachedRequest<unknown>);
	});
}

export async function CacheDelete(id: string): Promise<void> {
	return _mutex.runExclusive(() => {
		_cache.delete(id);
	});
}
