import { Mutex } from 'async-mutex';
import type { ICachedRequest } from './page-info';

const _Cache = new Map<string, ICachedRequest<unknown>>();
const _Mutex = new Mutex();

export async function CacheGet<T>(id: string): Promise<ICachedRequest<T> | undefined> {
	const Result = await _Mutex.runExclusive(() => _Cache.get(id) as ICachedRequest<T> | undefined);
	return Result;
}

export async function CacheSet<T>(entry: ICachedRequest<T>): Promise<void> {
	await _Mutex.runExclusive(() => {
		_Cache.set(entry.Id, entry as ICachedRequest<unknown>);
	});
}

export async function CacheDelete(id: string): Promise<void> {
	await _Mutex.runExclusive(() => {
		_Cache.delete(id);
	});
}
