# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed
- `@pawells/ngx-graphql` — Angular reactive Apollo + graphql-ws client package removed
- `@pawells/graphql-codegen-ngx` — Angular graphql-codegen plugin package removed
- `nx-graphql`: removed `@pawells/graphql-codegen-ngx` optional peer dependency and `target: "angular"` codegen executor option

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

[Unreleased]: https://github.com/PhillipAWells/graphql/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/PhillipAWells/graphql/releases/tag/v2.0.0
