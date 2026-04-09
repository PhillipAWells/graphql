## 2.0.1 (2026-04-06)

### 🩹 Fixes

- add rxjs peer/dev dependency to resolve transitive peer warnings ([dedf835](https://github.com/PhillipAWells/graphql/commit/dedf835))

### ❤️ Thank You

- Aaron Wells @PhillipAWells
- Claude Sonnet 4.6

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed
- `@pawells/ngx-graphql` — Angular reactive Apollo + graphql-ws client package removed
- `@pawells/graphql-codegen-ngx` — Angular graphql-codegen plugin package removed
- `nx-graphql`: removed `@pawells/graphql-codegen-ngx` optional peer dependency and `target: "angular"` codegen executor option

### Fixed
- `@pawells/graphql-codegen-ts`: Apollo Client v4 compatibility — removed `<NormalizedCacheObject>` type parameter from `ApolloClient` (no longer generic in v4) and updated `onError` link callback from the v3 `{ graphQLErrors, networkError }` destructuring pattern to the v4 `{ error }` pattern using `CombinedGraphQLErrors.is(error)` ([474e396](https://github.com/PhillipAWells/graphql/commit/474e396))

## [2.1.0] - 2026-04-09

### Added

- **graphql-mongoose** — New package providing GraphQL-to-Mongoose filter builder — translates GraphQL filter inputs to strongly typed Mongoose `FilterQuery` objects with support for scalar, array, and logical operators
- **graphql-mongoose** — `BuildMongooseFilter<TDoc>()` function for resolver-level filter translation, with field name remapping (e.g. `id` → `_id`), ObjectId string coercion, and allowlist-based security (unknown fields silently dropped)
- **graphql-mongoose** — `BuildMongooseSubscriptionFilter<TDoc>()` helper for constructing Mongoose-compatible filter predicates in GraphQL subscription handlers
- **graphql-mongoose** — Scalar operator support: `$eq`, `$ne`, `$in`, `$nin`, `$lt`, `$lte`, `$gt`, `$gte`, `$exists`, `$regex`
- **graphql-mongoose** — Array operator support: `$all`, `$size`, `$elemMatch`
- **graphql-mongoose** — Logical operator support: `$and`, `$or` (fully recursive)
- **graphql-mongoose** — Comprehensive test suite (99 tests: 59 unit + 18 integration + 21 regression) with >80% coverage on all metrics
- **graphql-mongoose** — Complete JSDoc and usage examples for resolver and subscription patterns
- **graphql-common** — Scalar filter input types: `StringFilterInput`, `NumberFilterInput`, `BooleanFilterInput`, `DateFilterInput`, `ObjectIdFilterInput`
- **graphql-common** — Structural filter types: `ArrayFilterInput<T>`, `IFilterCondition<T>` (recursive logical filter), `IFilterInputBase` (marker interface)

### Changed

- All packages upgraded to version 2.1.0 with fixed release versioning (NX `projectsRelationship: "fixed"`)

### Fixed

- Guard registration order documentation clarity in AGENTS.md (critical for security)
- Test coverage gaps in graphql-mongoose subscription filter
- Missing JSDoc and documentation for new filter module APIs
- BSON configuration asymmetry documentation in `GraphQLModule.forRootAsync()` (clarified provider registration behavior)
- Deprecated `IsBrowser` option in `@pawells/graphql-codegen-ts` marked with JSDoc deprecation notice
- Internal API documentation for `IContextPrevious` in `@pawells/react-graphql` marked as `@internal`

## [2.0.0] - 2026-04-04

### Added

- `GraphQLModule` with Apollo Server 5.x integration using `forRoot` and `forRootAsync` dynamic module patterns
- `CacheModule` with Redis-backed caching and `@Cacheable`, `@CacheEvict`, `@CacheInvalidate` decorator support
- Custom GraphQL scalars: `ObjectIdScalar` (MongoDB ObjectId), `DateTimeScalar` (ISO 8601), `JSONScalar` (arbitrary JSON)
- Query complexity analysis via `graphql-query-complexity` to prevent DoS attacks
- WebSocket subscriptions with JWT authentication — fails closed without `JwtService`
- Redis PubSub integration via `graphql-redis-subscriptions`
- DataLoader factory and registry for N+1 query prevention; nine pre-built loaders (User, Product, Order, Comment, Tag, Category, Review, Media, Notification)
- Guards: `GraphQLAuthGuard`, `GraphQLRolesGuard`, `GraphQLPublicGuard`, `QueryComplexityGuard`, `RateLimitGuard`
- Interceptors: `GraphQLLoggingInterceptor`, `GraphQLErrorInterceptor`, `GraphQLPerformanceInterceptor`, `PerformanceMonitoringInterceptor`, `GraphQLCacheInterceptor`
- Pipes: `GraphQLValidationPipe`, `GraphQLInputValidationPipe` (with XSS detection)
- Services: `GraphQLCacheService`, `RateLimitService`, `PerformanceService`
- Cursor-based pagination types: `Connection`, `PageInfo`, `Edge`, `CursorUtils`, `SortDirection`
- Standardized error handling: `GraphQLErrorFormatter`, `GraphQLErrorCode`
- BSON serialization support: `BsonSerializationService`, `BsonSerializationMiddleware`, `BsonResponseInterceptor`
- WebSocket connection management: `WebSocketServer`, `WebSocketAuthService`, `ConnectionManagerService`, `ResilienceService`
- Auth decorator re-exports from `@pawells/nestjs-auth`

[Unreleased]: https://github.com/pawells/graphql/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/pawells/graphql/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/pawells/graphql/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/PhillipAWells/graphql/releases/tag/v2.0.0
