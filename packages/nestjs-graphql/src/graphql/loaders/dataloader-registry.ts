import DataLoader from 'dataloader';
import { Injectable, Scope, OnModuleDestroy } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { ILazyModuleRefService, IContextualLogger } from '@pawells/nestjs-shared/common';
import { AppLogger } from '@pawells/nestjs-shared/common';
import { DataLoaderFactory, IBatchLoadFn, IDataLoaderOptions } from './dataloader.factory.js';

/**
 * Registry for managing DataLoader instances per request context
 * Ensures DataLoaders are created once per request and properly cleaned up
 *
 * The OnModuleDestroy hook is used to ensure Cleanup() is called at the end of
 * each request. For request-scoped injectables (Scope.REQUEST), the framework
 * triggers OnModuleDestroy (repurposed as "on request end") when the request
 * context is destroyed.
 */
@Injectable({ scope: Scope.REQUEST })
export class DataLoaderRegistry implements ILazyModuleRefService, OnModuleDestroy {
	public readonly Module: ModuleRef;

	public get AppLogger(): AppLogger {
		return this.Module.get(AppLogger, { strict: false });
	}

	private get Logger(): IContextualLogger {
		return this.AppLogger.createContextualLogger(DataLoaderRegistry.name);
	}

	private readonly Loaders = new Map<string, DataLoader<any, any>>();

	/**
	 * Tracks which loaders were actually used in this request
	 * Allows O(k) cleanup instead of O(n) where k = used loaders, n = total loaders
	 */
	private readonly UsedLoaders = new Set<string>();

	public get DataLoaderFactory(): DataLoaderFactory {
		return this.Module.get(DataLoaderFactory, { strict: false });
	}

	constructor(moduleRef: ModuleRef) {
		this.Module = moduleRef;
	}

	/**
   * Gets or creates a DataLoader for the given key
   * Tracks access to enable O(k) cleanup instead of O(n)
   * @param key Unique identifier for the DataLoader
   * @param options DataLoader configuration options
   * @returns DataLoader instance
   */
	public GetOrCreate<K, V>(
		key: string,
		options: IDataLoaderOptions<K, V>,
	): DataLoader<K, V> {
		// Track that this loader was used in this request
		this.UsedLoaders.add(key);

		if (this.Loaders.has(key)) {
			this.Logger.debug(`Reusing existing DataLoader for key: ${key}`);
			return this.Loaders.get(key) as DataLoader<K, V>;
		}

		this.Logger.debug(`Creating new DataLoader for key: ${key}`);
		const Loader = this.DataLoaderFactory.Create(options);
		this.Loaders.set(key, Loader);

		return Loader;
	}

	/**
   * Creates a DataLoader with caching enabled
   * @param key Unique identifier for the DataLoader
   * @param batchLoadFn Batch loading function
   * @param options Additional options
   * @returns DataLoader instance
   */
	public CreateWithCache<K, V>(
		key: string,
		batchLoadFn: IBatchLoadFn<K, V>,
		options: Omit<IDataLoaderOptions<K, V>, 'batchLoadFn' | 'cache'> = {},
	): DataLoader<K, V> {
		return this.GetOrCreate(key, {
			batchLoadFn,
			cache: true,
			...options,
		});
	}

	/**
   * Creates a DataLoader without caching
   * @param key Unique identifier for the DataLoader
   * @param batchLoadFn Batch loading function
   * @param options Additional options
   * @returns DataLoader instance
   */
	public CreateWithoutCache<K, V>(
		key: string,
		batchLoadFn: IBatchLoadFn<K, V>,
		options: Omit<IDataLoaderOptions<K, V>, 'batchLoadFn' | 'cache'> = {},
	): DataLoader<K, V> {
		return this.GetOrCreate(key, {
			batchLoadFn,
			cache: false,
			...options,
		});
	}

	/**
   * Clears the cache for a specific DataLoader
   * @param key DataLoader key
   */
	public ClearCache(key: string): void {
		const Loader = this.Loaders.get(key);
		if (Loader) {
			Loader.clearAll();
			this.Logger.debug(`Cleared cache for DataLoader: ${key}`);
		}
	}

	/**
   * Clears all DataLoader caches
   * O(k) where k = used loaders instead of O(n) where n = all loaders
   * Only clears loaders that were actually accessed in this request
   */
	public ClearAllCaches(): void {
		// Only iterate over loaders that were actually used (O(k) instead of O(n))
		for (const Key of this.UsedLoaders) {
			const Loader = this.Loaders.get(Key);
			if (Loader) {
				Loader.clearAll();
				this.Logger.debug(`Cleared cache for DataLoader: ${Key}`);
			}
		}
	}

	/**
   * Gets the number of registered DataLoaders
   * @returns Number of DataLoaders
   */
	public GetLoaderCount(): number {
		return this.Loaders.size;
	}

	/**
   * Gets all registered DataLoader keys
   * @returns Array of keys
   */
	public GetLoaderKeys(): string[] {
		return Array.from(this.Loaders.keys());
	}

	/**
   * Removes a DataLoader from the registry
   * @param key DataLoader key to remove
   */
	public RemoveLoader(key: string): void {
		if (this.Loaders.has(key)) {
			this.Loaders.delete(key);
			this.Logger.debug(`Removed DataLoader: ${key}`);
		}
	}

	/**
   * Cleans up all DataLoaders (called at end of request)
   */
	public Cleanup(): void {
		this.ClearAllCaches();
		this.Loaders.clear();
		this.UsedLoaders.clear();
		this.Logger.debug('DataLoader registry cleaned up');
	}

	/**
   * Lifecycle hook: automatically called at the end of the request context
   * for request-scoped injectables. Ensures all DataLoaders are cleaned up
   * and no stale data persists to the next request.
   */
	public onModuleDestroy(): void {
		this.Cleanup();
	}
}
