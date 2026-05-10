import { SetMetadata } from '@nestjs/common';

/**
 * Shared cache metadata keys
 * @internal
 */
export const CACHE_METADATA_KEYS = {
	CACHEABLE: 'cacheable',
	CACHE_INVALIDATE: 'cache-invalidate',
	CACHE_EVICT: 'cache-evict',
} as const;

/**
 * Base cacheable options interface
 * @internal
 */
interface IBaseCacheableOptions {
	/**
	 * Cache TTL in milliseconds
	 * @default 300000 (5 minutes)
	 */
	ttl?: number;

	/**
	 * Custom cache key generator function
	 */
	keyGenerator?: (...args: any[]) => string;

	/**
	 * Cache condition function - return false to skip caching
	 */
	condition?: (...args: any[]) => boolean;
}

/**
 * GraphQL-specific cacheable decorator options
 *
 * Extends base cacheable options with GraphQL-specific features
 */
export interface ICacheableOptions extends IBaseCacheableOptions {
	/**
	 * Custom cache key generator function with GraphQL context
	 */
	keyGenerator?: (args: any[], context: any) => string;

	/**
	 * Cache condition function with GraphQL context
	 */
	condition?: (result: any, args: any[], context: any) => boolean;

	/**
	 * Whether to cache null/undefined results
	 * @default false
	 */
	cacheNulls?: boolean;
}

/**
 * Cacheable decorator for GraphQL resolvers
 *
 * **NOTE: This is a metadata-only decorator for GraphQL resolvers. For non-GraphQL method caching,
 * use the {@link Cacheable} decorator from the cache module instead.**
 *
 * This decorator marks a GraphQL resolver as cacheable. The actual caching is handled by the
 * GraphQL response interceptor, which reads this metadata and applies caching logic based on
 * the resolver's arguments and context.
 *
 * Use this decorator on individual GraphQL field resolvers to enable per-resolver caching.
 *
 * @param options - Caching options for GraphQL resolvers
 *
 * @example
 * ```typescript
 * @Cacheable({ ttl: 300000 }) // 5 minutes
 * @Query(() => User, { name: 'GetUser' })
 * async getUser(@Args('id') id: string): Promise<User> {
 *   return this.userService.findById(id);
 * }
 *
 * @Cacheable({
 *   ttl: 60000, // 1 minute
 *   condition: (result) => result !== null // Don't cache null results
 * })
 * @Query(() => [Post], { name: 'GetPosts' })
 * async getPosts(@Args('userId') userId: string): Promise<Post[]> {
 *   return this.postService.findByUser(userId);
 * }
 * ```
 *
 * @see {@link https://www.npmjs.com/package/@pawells/nestjs-graphql#cache-decorators} for method-level caching
 */
export const Cacheable = (options: ICacheableOptions = {}): ReturnType<typeof SetMetadata> => SetMetadata(CACHE_METADATA_KEYS.CACHEABLE, options);

/**
 * Metadata key for cacheable configuration
 * @deprecated Use CACHE_METADATA_KEYS.CACHEABLE from @pawells/nestjs-cache instead
 */
export const CACHEABLE_METADATA = CACHE_METADATA_KEYS.CACHEABLE;
