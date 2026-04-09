## Repository Overview

This is an NX monorepo of GraphQL utility libraries. All packages live under `packages/` and are authored by `Aaron Wells<69355326+PhillipAWells@users.noreply.github.com>` (pawells).

- **Package manager**: Yarn 4 (corepack)
- **Build tool**: NX 22 with `@nx/vite` and `@nx/eslint` plugins
- **Test framework**: Vitest
- **Node requirement**: >=22.0.0
- **TypeScript**: ES2022 target, strict mode, `bundler` module resolution

## Commands

Run from the workspace root unless noted.

```bash
# Full pipeline (typecheck → lint → test → build)
yarn pipeline

# Individual steps
yarn typecheck
yarn lint
yarn lint:fix
yarn test
yarn build

# Single package (cd into package first)
cd packages/nestjs-graphql
yarn pipeline
yarn test
yarn test:coverage
```

`yarn test:coverage` is available per-package only, not at the workspace root.

NX caches `build`, `test`, `lint`, and `typecheck` targets. Pass `--skip-nx-cache` to bypass caching.

## Packages

| Package | Purpose |
|---|---|
| `nestjs-graphql` | Enterprise GraphQL module with Apollo Server 5.x integration, Redis cache, DataLoaders, subscriptions, guards, interceptors, and query complexity analysis |

## Architecture

### Directory Structure

The package contains two independent, coexisting modules: **CacheModule** and **GraphQLModule**.

```
packages/nestjs-graphql/src/
├── cache/                              # Redis caching module
│   ├── cache.module.ts                 # CacheModule.forRoot() / .forRootAsync() entry point
│   ├── cache.service.ts                # Core cache API (get, set, delete, invalidate)
│   ├── cache.interceptor.ts            # HTTP response cache interceptor
│   ├── cache.interfaces.ts             # ICacheModuleAsyncOptions, ICacheConfig
│   ├── cache.types.ts                  # TCacheKey, TCacheTTL, ICacheStats type aliases
│   ├── redis.config.ts                 # Joi-validated Redis connection config from env vars
│   ├── constants/                      # Default TTLs, key prefixes, Redis protocol defaults
│   ├── decorators/
│   │   ├── cacheable.decorator.ts      # @Cacheable — caches method results
│   │   ├── cache-evict.decorator.ts    # @CacheEvict — removes single cache entry
│   │   ├── cache-invalidate.decorator  # @CacheInvalidate — pattern-based invalidation
│   │   └── cache-metadata.ts           # Shared decorator metadata definitions
│   ├── interceptors/
│   │   └── base-cache.interceptor.ts   # Abstract base for extending cache logic
│   └── services/
│       └── base-cache.service.ts       # Abstract base for domain caching services
│
├── graphql/                            # GraphQL module (Apollo Server integration)
│   ├── graphql/                        # Core Apollo/NestJS GraphQL integration
│   │   ├── graphql.module.ts           # GraphQLModule.forRoot() / .forRootAsync() entry point
│   │   ├── graphql.service.ts          # Schema introspection, health checks, SDL utilities
│   │   ├── graphql-config.interface.ts # IGraphQLConfigOptions, IGraphQLAsyncConfig
│   │   ├── error-formatter.ts          # GraphQLErrorFormatter — formats errors for API responses
│   │   ├── error-codes.ts              # GraphQLErrorCode enum — standardized error codes
│   │   ├── complexity-rules.ts         # Default query complexity rules (Connection=10, Field=1, List=1.5)
│   │   ├── query-complexity.ts         # QueryComplexityCalculator — analyzes query AST cost
│   │   ├── scalars/                    # ObjectIdScalar, DateTimeScalar, JSONScalar
│   │   ├── types/                      # Connection<T>, Edge<T>, PageInfo, CursorUtils, SortDirection
│   │   └── bson/                       # BsonSerializationService, middleware, BsonResponseInterceptor
│   │
│   ├── guards/
│   │   ├── graphql-auth.guard.ts       # JwtAuthGuard — requires valid JWT from @pawells/nestjs-auth
│   │   ├── graphql-public.guard.ts     # PublicGuard — marks resolver as public (skips auth)
│   │   ├── graphql-roles.guard.ts      # RoleGuard — requires user to have specified roles
│   │   ├── query-complexity.guard.ts   # QueryComplexityGuard — rejects queries exceeding limit
│   │   └── rate-limit.guard.ts         # RateLimitGuard — per-user rate limiting via Redis
│   │
│   ├── interceptors/
│   │   ├── graphql-logging.interceptor.ts          # Logs all operations with timing
│   │   ├── graphql-error.interceptor.ts            # Catches errors, applies GraphQLErrorFormatter
│   │   ├── graphql-performance.interceptor.ts      # Tracks slow queries, alerts on threshold
│   │   ├── performance-monitoring.interceptor.ts   # Exports Prometheus metrics
│   │   └── cache.interceptor.ts                    # Response-level caching for resolvers
│   │
│   ├── pipes/
│   │   ├── graphql-validation.pipe.ts        # class-validator integration for DTOs
│   │   └── graphql-input-validation.pipe.ts  # Input validation with XSS detection
│   │
│   ├── services/
│   │   ├── rate-limit.service.ts       # Redis-backed token bucket rate limiting
│   │   ├── cache.service.ts            # GraphQL resolver response caching
│   │   └── performance.service.ts      # Performance tracking and slow query logging
│   │
│   ├── decorators/
│   │   ├── graphql-auth-decorators.ts  # @Public, @Roles, @CurrentUser (re-exports from @pawells/nestjs-auth)
│   │   ├── subscription.decorator.ts   # @SubscriptionConfig — metadata for subscription resolvers
│   │   └── cacheable.decorator.ts      # @Cacheable, @CacheInvalidate for GraphQL fields
│   │
│   ├── subscriptions/
│   │   ├── subscription.service.ts             # Subscription management, event filtering, routing
│   │   ├── websocket.server.ts                 # WebSocket server setup (ws library)
│   │   ├── websocket-auth.service.ts           # JWT verification for WebSocket connections
│   │   ├── connection-manager.service.ts       # Tracks active WS connections
│   │   ├── resilience.service.ts               # Reconnection logic, circuit breaker
│   │   └── redis-pubsub.factory.ts             # Creates Redis PubSub instance
│   │
│   ├── loaders/
│   │   ├── dataloader.factory.ts       # Generic DataLoader factory with batching and caching
│   │   ├── dataloader-registry.ts      # Request-scoped loader registry
│   │   └── [entity].loader.ts          # Pre-built loaders: User, Product, Order, Comment, Tag, etc.
│   │
│   ├── context/
│   │   ├── context-factory.ts          # Creates request context for HTTP and WebSocket connections
│   │   └── graphql-context.interface.ts # IGraphQLContext, IWebSocketContext
│   │
│   └── errors/
│       ├── graphql-error-factory.ts    # Factory for standardized GraphQL errors
│       └── [domain].error.ts           # UnauthorizedError, ForbiddenError, NotFoundError, etc.
│
└── index.ts                            # Main package entry point
```

### Module Hierarchy

```
@pawells/nestjs-graphql
├── CacheModule
│   ├── Imports: @nestjs/cache-manager, Keyv, @keyv/redis
│   ├── Exports: CacheService, @Cacheable, @CacheEvict, @CacheInvalidate
│   └── Used by: GraphQLModule (optional), Application modules
│
└── GraphQLModule
    ├── Imports: @nestjs/graphql, @nestjs/apollo, @pawells/nestjs-auth (optional)
    ├── Exports: All guards, interceptors, pipes, services, loaders, types
    ├── Dependencies:
    │   ├── RateLimitService (requires Redis)
    │   ├── DataLoaderRegistry (request-scoped)
    │   ├── WebSocketServer (optional, for subscriptions)
    │   └── BsonSerializationService (optional, for MongoDB)
    └── Consumer pattern: Import in root AppModule
```

**Security defaults:** Playground and introspection are disabled by default. WebSocket auth is fail-closed. Query complexity limits are enforced. Rate limiting uses a token-bucket algorithm per user.

**Configuration:** `CacheModule` reads `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`, `REDIS_PASSWORD`, `REDIS_KEY_PREFIX`, `REDIS_TTL` (validated via Joi; defaults: localhost:6379, TTL 1 hour). `GraphQLModule` is configured via `IGraphQLConfigOptions` (Apollo Server options, context factory, CORS, error formatter, optional BSON config).

**Naming conventions:** Classes/interfaces/types/enums use PascalCase. Interfaces are I-prefixed (`ICacheConfig`). Type aliases are T-prefixed (`TCacheKey`). Class properties and enum members must be PascalCase or UPPER_CASE (camelCase is not allowed on class members). Exception: `forRoot()` and `forRootAsync()` use camelCase to follow NestJS dynamic module conventions.

## Key Concepts

- **Dynamic module pattern** — All modules expose `forRoot(options)` for synchronous config and `forRootAsync(options)` for factory-based async config. Both return a `DynamicModule`. All modules are `@Global()`.
- **Cache decorators** — `@Cacheable`, `@CacheEvict`, and `@CacheInvalidate` are stackable, support sync/async methods, and work on any injectable. All require `CacheModule.forRoot()` to be imported or they silently no-op.
- **Guard Registration Order (SECURITY-CRITICAL)** — Guards execute in registration order: `QueryComplexityGuard` → `GraphQLAuthGuard` → `GraphQLRateLimitGuard`. This order is mandatory for security and performance: (1) QueryComplexityGuard first (static AST analysis, cheapest), (2) GraphQLAuthGuard next (JWT verification before authorization), (3) GraphQLRateLimitGuard last (per-user limits after auth). Violating this order (e.g., `@UseGuards(RateLimitGuard, AuthGuard, ComplexityGuard)`) can bypass authentication or authorization checks.
- **Error pipeline** — Resolvers throw typed error classes (e.g., `NotFoundError`, `ForbiddenError`) or use `GraphQLErrorFactory`. `GraphQLErrorInterceptor` catches them; `GraphQLErrorFormatter` normalises them into `{ message, extensions: { code, statusCode, timestamp } }`.
- **Lazy loading via `ILazyModuleRefService`** — Services that would create circular dependencies at init time defer resolution using `ModuleRef.get(Token, { strict: false })`.
- **WebSocket auth is fail-closed** — `WebSocketAuthService` requires `JwtService` from `@pawells/nestjs-auth`. Without it, all WebSocket connections are rejected. To use public subscriptions, explicitly configure a public auth strategy in `WebSocketAuthService`.
- **DataLoader registry is strictly request-scoped** — `GraphQLContextFactory` creates a fresh `DataLoaderRegistry` per request. Never store a registry reference outside the request context; doing so causes cross-request data leakage.

```typescript
// WRONG — stale data from previous request
constructor(private readonly registry: DataLoaderRegistry) {
  this.registry = registry; // registry instance is tied to the request that created it
}

// RIGHT — always read from the per-request context
async getUser(@Args('id') id: string, @Context() ctx: IGraphQLContext) {
  return ctx.loaderRegistry.get(UserLoader).load(id);
}
```

## Testing Notes

- Tests are colocated in `__tests__/` subdirectories next to source files.
- File suffixes: `*.test.ts` (unit), `*.advanced.test.ts` (integration/edge cases), `*.type-safety.test.ts` (TypeScript compilation checks).
- Coverage threshold: 80% lines, functions, branches, and statements. CI will fail below this threshold.
- Mock Redis using `createMock<Redis>()` from `@golevelup/ts-jest`; inject the mock directly into the service under test.
- Mock `DataLoaderRegistry` and `DataLoader` instances using `createMock<T>()`; assert on `.load()` call arguments to verify correct key batching.

## Code Style

Enforced via ESLint v9 flat config (`eslint.config.mjs`):
- **Indentation**: Tabs
- **Quotes**: Single
- **Semicolons**: Required
- **Trailing commas**: Always (multiline)
- **Access modifiers**: Required on all class members except constructors
- **Return types**: Explicit on all functions (warn level)
- **Naming**: PascalCase for classes/interfaces/types/enums; camelCase for variables/functions; UPPER_CASE allowed for constants. Class properties and enum members must be PascalCase or UPPER_CASE (camelCase is not allowed).

Test files have relaxed rules (no type annotations required, naming conventions disabled).

## Common Gotchas

### 1. WebSocket Auth Fails Closed Without JwtService

If `AuthModule` (which provides `JwtService`) is not imported alongside `GraphQLModule`, all WebSocket connections are rejected with auth errors — there is no fallback. **Fix:** import `AuthModule.forRoot(...)` in the same module as `GraphQLModule.forRoot({ subscriptions: { ... } })`.

### 2. DataLoader Registry Must Not Be Cached Across Requests

`DataLoaderRegistry` is created per-request by `GraphQLContextFactory`. Storing a reference to it in a service field causes subsequent requests to read stale batched data from a prior request. **Fix:** always access the registry via `ctx.loaderRegistry` inside the resolver method, never outside it.

### 3. @Cacheable Silently No-Ops Without CacheModule

If `CacheModule.forRoot()` is not imported, cache decorators do nothing and methods execute on every call with no warning. **Fix:** ensure `CacheModule.forRoot()` is imported before `GraphQLModule.forRoot()` in your root module.

### 4. Guard Registration Order Matters (SECURITY-CRITICAL)

Guards execute in the order they are registered. **MANDATORY order:** `QueryComplexityGuard` → `GraphQLAuthGuard` → `GraphQLRateLimitGuard`. (1) QueryComplexityGuard first (static AST analysis, cheap), (2) GraphQLAuthGuard next (JWT verification, guards authentication), (3) GraphQLRateLimitGuard last (per-user rate limiting). Incorrect order can bypass authentication entirely. **Fix:** Always use `@UseGuards(QueryComplexityGuard, GraphQLAuthGuard, GraphQLRateLimitGuard)` in this exact order. Never reorder these guards.

### 5. BSON Serialization Is Opt-In

Without `GraphQLModule.forRoot({ bson: { enabled: true } })`, MongoDB ObjectIds are serialised as `{ oid: "..." }` objects, breaking GraphQL scalar resolution. **Fix:** set `bson.enabled: true` when using MongoDB.

### 6. Redis Is Required at Module Init Time

`CacheModule` and rate limiting validate and connect to Redis during module initialisation. A missing or unreachable Redis instance causes a hard failure at startup. **Fix:** set `REDIS_HOST`, `REDIS_PORT`, and optionally `REDIS_PASSWORD` and `REDIS_KEY_PREFIX` before starting the application.
