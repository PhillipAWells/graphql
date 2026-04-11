/**
 * GraphQL Decorators
 *
 * Decorators for GraphQL resolvers:
 * - Authentication and authorization (@Auth, @Public, @Roles)
 * - IUser context extraction (@CurrentUser, @AuthToken, @GraphQLContextParam)
 * - Subscription management (@Subscription)
 * - Caching decorators (@Cacheable, @CacheInvalidate)
 *
 * @packageDocumentation
 */

export { Subscription, SubscriptionFilter, SubscriptionAuth, SUBSCRIPTION_METADATA } from './subscription.decorator.js';
export type { ISubscriptionOptions } from './subscription.decorator.js';

export {
	Auth,
	Public,
	Roles,
	CurrentUser,
	AuthToken,
	GraphQLContextParam,
	GraphQLUser,
	GraphQLAuth,
	GraphQLPublic,
	GraphQLRoles,
	GraphQLCurrentUser,
	GraphQLAuthToken,
	IS_PUBLIC_KEY,
	ROLES_KEY,
} from './graphql-auth-decorators.js';

/**
 * GraphQL-specific Cacheable decorator for resolver-level caching.
 *
 * **NOTE: For method-level caching on services, use the Cacheable decorator
 * from the cache module instead. Two different Cacheable decorators exist:
 *
 * 1. {@link Cacheable} (this module) - GraphQL resolver caching (metadata-only)
 * 2. Cacheable (cache module) - Method-level caching with actual cache integration
 *
 * @example GraphQL resolver caching (this module):
 * ```typescript
 * import { Cacheable } from '@pawells/nestjs-graphql';
 * @Cacheable({ ttl: 300000 })
 * @Query(() => User)
 * async getUser(@Args('id') id: string) { ... }
 * ```
 *
 * @example Method-level caching (cache module):
 * ```typescript
 * import { Cacheable } from '@pawells/nestjs-graphql/cache';
 * @Cacheable({ ttl: 300000 })
 * async getUserData(id: string) { ... }
 * ```
 */
export { Cacheable, CACHEABLE_METADATA, CACHE_METADATA_KEYS } from './cacheable.decorator.js';
export type { ICacheableOptions } from './cacheable.decorator.js';
export { CacheInvalidate, CACHE_INVALIDATE_METADATA } from './cache-invalidate.decorator.js';
export type { ICacheInvalidateOptions } from './cache-invalidate.decorator.js';
