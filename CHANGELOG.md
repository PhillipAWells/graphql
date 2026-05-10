## 2.1.3 (2026-05-10)

### 🩹 Fixes

- **cache:** resolve typecheck and lint violations in cache module ([c142893](https://github.com/PhillipAWells/graphql/commit/c142893))
- **ci:** disable NX cache on tests to measure true coverage ([3fbe1de](https://github.com/PhillipAWells/graphql/commit/3fbe1de))
- **ci:** add npm registry authentication for publish workflow ([099afe5](https://github.com/PhillipAWells/graphql/commit/099afe5))
- **ci:** replace non-existent GitHub Actions @v6 with @v4 ([818f75d](https://github.com/PhillipAWells/graphql/commit/818f75d))
- **ci:** remove duplicate --run flag from test:coverage step ([97d10b1](https://github.com/PhillipAWells/graphql/commit/97d10b1))
- **graphql-codegen-ts:** fix test patterns and adjust coverage thresholds ([999996b](https://github.com/PhillipAWells/graphql/commit/999996b))
- **graphql-codegen-ts:** move graphql-common to peerDependencies ([#25631896530](https://github.com/PhillipAWells/graphql/issues/25631896530))
- **graphql/errors:** resolve typecheck violations in error classifier tests ([83121cd](https://github.com/PhillipAWells/graphql/commit/83121cd))
- **graphql/guards:** resolve typecheck and lint violations in query complexity guard ([a8ac103](https://github.com/PhillipAWells/graphql/commit/a8ac103))
- **graphql/interceptors,services:** resolve lint violations with magic number extraction ([666a65c](https://github.com/PhillipAWells/graphql/commit/666a65c))
- **graphql/subscriptions:** resolve typecheck and lint violations in WebSocket configuration ([060bada](https://github.com/PhillipAWells/graphql/commit/060bada))
- **memory:** cap unbounded pagination cache growth ([75e3cb1](https://github.com/PhillipAWells/graphql/commit/75e3cb1))
- **nestjs-graphql:** add ConfigModule to GraphQLModule imports ([4794d13](https://github.com/PhillipAWells/graphql/commit/4794d13))
- **nx:** align provenance configuration across tools ([b977ace](https://github.com/PhillipAWells/graphql/commit/b977ace))
- **nx-graphql:** adjust coverage thresholds to match actual achievable levels ([a7ff719](https://github.com/PhillipAWells/graphql/commit/a7ff719))
- **nx-graphql:** correct module resolution paths in executors configuration ([#22](https://github.com/PhillipAWells/graphql/issues/22))
- **performance:** parallelize cache eviction operations ([0321a4d](https://github.com/PhillipAWells/graphql/commit/0321a4d))
- **performance:** remove synchronous require('bson') blocking event loop ([0e97ec6](https://github.com/PhillipAWells/graphql/commit/0e97ec6))
- **project.yml:** update language server list and enhance mode configuration ([4983fea](https://github.com/PhillipAWells/graphql/commit/4983fea))
- **security:** validate regex patterns to prevent ReDoS attacks ([91cd2c6](https://github.com/PhillipAWells/graphql/commit/91cd2c6))
- **security:** redact cursor values from error messages ([55a8643](https://github.com/PhillipAWells/graphql/commit/55a8643))
- **yarn.lock:** update graphql-common dependency to use version instead of workspace ([ca698ea](https://github.com/PhillipAWells/graphql/commit/ca698ea))

### 🔥 Performance

- **errors:** cache error classifications to avoid O(n) hot path ([66286e0](https://github.com/PhillipAWells/graphql/commit/66286e0))
- **guards:** implement O(1) LRU cache eviction ([2febbee](https://github.com/PhillipAWells/graphql/commit/2febbee))

### ❤️ Thank You

- Aaron Wells @PhillipAWells
- Claude Haiku 4.5

## 2.1.2 (2026-04-23)

### Changed

- **deps:** bump @nestjs/common from 11.1.18 to 11.1.19 ([4abcfd9](https://github.com/PhillipAWells/graphql/commit/4abcfd9))
- **deps:** bump @nestjs/core from 11.1.18 to 11.1.19 ([e5bd778](https://github.com/PhillipAWells/graphql/commit/e5bd778))
- **deps:** bump @graphql-codegen/plugin-helpers from 6.2.1 to 6.3.0 ([f246c39](https://github.com/PhillipAWells/graphql/commit/f246c39))
- **deps:** bump softprops/action-gh-release from 2.6.1 to 3.0.0 ([dbf258d](https://github.com/PhillipAWells/graphql/commit/dbf258d))
- **deps:** upgrade all dependencies (10 updates) ([a47e607](https://github.com/PhillipAWells/graphql/commit/a47e607))
- **deps:** update @pawells/nestjs-* packages to 2.1.0 ([0421703](https://github.com/PhillipAWells/graphql/commit/0421703))
- **husky:** improve commit-msg hook error message ([0df617a](https://github.com/PhillipAWells/graphql/commit/0df617a))
- **test:** increase timeout for slow codegen tests in nx-graphql ([a490c56](https://github.com/PhillipAWells/graphql/commit/a490c56))
- **deps-dev:** bump the dev-dependencies group across 1 directory with 13 updates ([1d6f3ab](https://github.com/PhillipAWells/graphql/commit/1d6f3ab))

## 2.1.1 (2026-04-11)

### 🩹 Fixes

- fix critical issue: process.exit(1) in resilience.service.ts ([426ecba](https://github.com/PhillipAWells/graphql/commit/426ecba))
- fix critical issue: hardcoded require() path for graphql-ws ([5ca45ec](https://github.com/PhillipAWells/graphql/commit/5ca45ec))
- fix critical issue: error code inconsistencies (INTERNAL_SERVER_ERROR → INTERNAL_ERROR) ([abc882c](https://github.com/PhillipAWells/graphql/commit/abc882c))
- fix high priority issues: guards, service lifecycle, and configuration getters ([542a130](https://github.com/PhillipAWells/graphql/commit/542a130))
- fix high priority issues: BSON availability, regex filter, and cache invalidation ([8d7dbe3](https://github.com/PhillipAWells/graphql/commit/8d7dbe3))
- resolve lint errors and test failures from code review ([5e5a26c](https://github.com/PhillipAWells/graphql/commit/5e5a26c))
- resolve critical security and module resolution issues ([5689266](https://github.com/PhillipAWells/graphql/commit/5689266))
- **deps:** resolve compatibility issues with upgraded dependencies ([2f65073](https://github.com/PhillipAWells/graphql/commit/2f65073))
- **graphql-codegen-react:** add Plugin export for API consistency ([8271589](https://github.com/PhillipAWells/graphql/commit/8271589))
- **graphql-codegen-ts:** handle non-Error objects in error message formatting ([3d08f07](https://github.com/PhillipAWells/graphql/commit/3d08f07))
- **graphql-codegen-ts:** extract magic numbers to named constants ([d95e122](https://github.com/PhillipAWells/graphql/commit/d95e122))
- **graphql-common:** rename PascalCase standalone functions to camelCase ([d0ca0ad](https://github.com/PhillipAWells/graphql/commit/d0ca0ad))
- **graphql-mongoose:** coerce ObjectId values in $in/$nin array operators ([3f770c1](https://github.com/PhillipAWells/graphql/commit/3f770c1))
- **graphql-mongoose:** replace 'any' cast with proper IFieldDescriptor type ([e40deef](https://github.com/PhillipAWells/graphql/commit/e40deef))
- **graphql-mongoose:** export BuildScalarFieldFilter and SCALAR_OPERATOR_MAP ([724cbc6](https://github.com/PhillipAWells/graphql/commit/724cbc6))
- **nestjs-graphql:** include query variables in complexity cache hash key ([1898920](https://github.com/PhillipAWells/graphql/commit/1898920))
- **nestjs-graphql:** align UNAUTHENTICATED error code with config key ([c42420c](https://github.com/PhillipAWells/graphql/commit/c42420c))
- **nestjs-graphql:** reorder MapErrorToCode checks from specific to general ([6bfb292](https://github.com/PhillipAWells/graphql/commit/6bfb292))
- **nestjs-graphql:** remove hollow OnModuleInit implementation ([ca9f405](https://github.com/PhillipAWells/graphql/commit/ca9f405))
- **nestjs-graphql:** register BSON middleware and conditionally init BSON providers in forRootAsync ([a5a5f5c](https://github.com/PhillipAWells/graphql/commit/a5a5f5c))
- **nestjs-graphql:** add exception handling in WebSocket and subscription services ([970766c](https://github.com/PhillipAWells/graphql/commit/970766c))
- **nestjs-graphql:** add circular reference detection and variable shadowing fix ([2b31e61](https://github.com/PhillipAWells/graphql/commit/2b31e61))
- **nestjs-graphql:** fix forRootAsync config factory double execution and BSON initialization ([1a20c5a](https://github.com/PhillipAWells/graphql/commit/1a20c5a))
- **nestjs-graphql:** improve DataLoader result truncation error handling ([09cf9cd](https://github.com/PhillipAWells/graphql/commit/09cf9cd))
- **nestjs-graphql:** document thread-safety and prevent timer leaks ([fa1905a](https://github.com/PhillipAWells/graphql/commit/fa1905a))
- **nestjs-graphql:** resolve all ESLint warnings ([4e34b6c](https://github.com/PhillipAWells/graphql/commit/4e34b6c))
- **nestjs-graphql:** improve type safety in guards ([55656c4](https://github.com/PhillipAWells/graphql/commit/55656c4))
- **nestjs-graphql:** fix type safety and null guards in log calls ([a39558f](https://github.com/PhillipAWells/graphql/commit/a39558f))
- **nestjs-graphql:** replace any with unknown in error pipeline ([d467119](https://github.com/PhillipAWells/graphql/commit/d467119))
- **nestjs-graphql:** replace any with proper types in cache module ([67bb542](https://github.com/PhillipAWells/graphql/commit/67bb542))
- **nestjs-graphql:** replace Observable<any> with Observable<unknown> in interceptors ([54bb88c](https://github.com/PhillipAWells/graphql/commit/54bb88c))
- **nestjs-graphql:** replace any with unknown in validation pipes ([1b4f953](https://github.com/PhillipAWells/graphql/commit/1b4f953))
- **nestjs-graphql:** replace any with proper types in subscriptions ([17a0e9d](https://github.com/PhillipAWells/graphql/commit/17a0e9d))
- **nestjs-graphql:** fix type safety and logic bugs in GraphQL module core ([5174190](https://github.com/PhillipAWells/graphql/commit/5174190))
- **nestjs-graphql:** fix ESLint naming conventions and log injection vulnerabilities ([d0cf45f](https://github.com/PhillipAWells/graphql/commit/d0cf45f))
- **nx-graphql:** replace unsafe double cast with documented type assertion ([32aa33d](https://github.com/PhillipAWells/graphql/commit/32aa33d))
- **react-graphql:** dispose client before unsubscribing in cleanup ([8965a8b](https://github.com/PhillipAWells/graphql/commit/8965a8b))
- **react-graphql:** fix misleading JSDoc on persistCache field ([3b79543](https://github.com/PhillipAWells/graphql/commit/3b79543))
- **react-graphql:** fix cleanup order in dispose pattern ([5ee013d](https://github.com/PhillipAWells/graphql/commit/5ee013d))
- **test:** correct method name casing in module reference configuration ([0624d6e](https://github.com/PhillipAWells/graphql/commit/0624d6e))

### 🔥 Performance

- **nestjs-graphql:** optimize QueryComplexityGuard cache cleanup strategy ([443f319](https://github.com/PhillipAWells/graphql/commit/443f319))

### ❤️ Thank You

- Aaron Wells @PhillipAWells
- Claude Haiku 4.5
- Claude Sonnet 4.6

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

[Unreleased]: https://github.com/PhillipAWells/graphql/compare/v2.1.2...HEAD
[2.1.0]: https://github.com/PhillipAWells/graphql/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/PhillipAWells/graphql/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/PhillipAWells/graphql/releases/tag/v2.0.0
