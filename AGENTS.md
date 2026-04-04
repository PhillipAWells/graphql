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

### Directory Structure and Responsibility Map

The `@pawells/nestjs-graphql` package is structured as two independent but coexisting modules: **CacheModule** and **GraphQLModule**. Both follow the dynamic module pattern and can be imported separately or together.

```
packages/nestjs-graphql/src/
├── cache/                              # Redis caching module
│   ├── cache.module.ts                 # CacheModule.forRoot() / .forRootAsync() entry point
│   ├── cache.service.ts                # Core cache API (get, set, delete, invalidate)
│   ├── cache.interceptor.ts            # HTTP response cache interceptor
│   ├── cache.interfaces.ts             # ICacheModuleAsyncOptions, ICacheConfig
│   ├── cache.types.ts                  # TCacheKey, TCacheTTL, ICacheStats type aliases
│   ├── redis.config.ts                 # Joi-validated Redis connection config from env vars
│   ├── constants/
│   │   ├── cache-config.constants.ts   # Default TTLs, cache key prefixes
│   │   └── redis.constants.ts          # Redis protocol defaults
│   ├── decorators/                     # Cache decoration meta-programming
│   │   ├── cacheable.decorator.ts      # @Cacheable — caches method results
│   │   ├── cache-evict.decorator.ts    # @CacheEvict — removes single cache entry
│   │   ├── cache-invalidate.decorator  # @CacheInvalidate — pattern-based invalidation
│   │   └── cache-metadata.ts           # Shared decorator metadata definitions
│   ├── interceptors/
│   │   ├── base-cache.interceptor.ts   # Abstract base for extending cache logic
│   │   └── [concrete implementations]  # Domain-specific cache interceptors
│   ├── services/
│   │   ├── base-cache.service.ts       # Abstract base for domain caching services
│   │   └── [concrete implementations]  # Domain-specific cache services
│   ├── __tests__/                      # Integration and unit tests for cache module
│   └── index.ts                        # Cache module public API barrel
│
├── graphql/                            # GraphQL module (Apollo Server integration)
│   ├── graphql/                        # Core Apollo/NestJS GraphQL integration
│   │   ├── graphql.module.ts           # GraphQLModule.forRoot() / .forRootAsync() entry point
│   │   ├── graphql.service.ts          # Utilities: schema introspection, health checks, SDL
│   │   ├── graphql-config.interface.ts # IGraphQLConfigOptions, IGraphQLAsyncConfig
│   │   ├── error-formatter.ts          # GraphQLErrorFormatter — formats errors for API responses
│   │   ├── error-codes.ts              # GraphQLErrorCode enum — standardized error codes
│   │   ├── complexity-rules.ts         # Default query complexity rules for built-in types
│   │   ├── query-complexity.ts         # QueryComplexityCalculator — analyzes query cost
│   │   ├── constants.ts                # GraphQL-wide constants
│   │   ├── scalars/                    # Custom GraphQL scalar types
│   │   │   ├── object-id.scalar.ts     # ObjectId scalar for MongoDB IDs
│   │   │   ├── date-time.scalar.ts     # DateTime scalar for ISO 8601 dates
│   │   │   ├── json.scalar.ts          # JSON scalar for arbitrary JSON values
│   │   │   └── index.ts                # Scalars barrel
│   │   ├── types/                      # GraphQL type definitions and utilities
│   │   │   ├── connection.type.ts      # Relay-style cursor pagination connection type
│   │   │   ├── edge.type.ts            # Edge type (wrapper for paginated items)
│   │   │   ├── page-info.type.ts       # Pagination metadata (hasNextPage, cursor)
│   │   │   ├── cursor-utils.ts         # Base64 cursor encoding/decoding utilities
│   │   │   ├── sort-direction.enum.ts  # SortDirection enum (ASC/DESC)
│   │   │   ├── graphql-safety.types.ts # Type-safe GraphQL utilities
│   │   │   ├── [domain types]          # User, Post, Comment, etc. type stubs
│   │   │   ├── type-registry.ts        # Type registration and validation
│   │   │   └── index.ts                # Types barrel
│   │   ├── enums/                      # GraphQL enums
│   │   │   ├── sort-direction.enum.ts  # SortDirection (ASC/DESC)
│   │   │   └── index.ts                # Enums barrel
│   │   ├── bson/                       # BSON serialization for MongoDB objects
│   │   │   ├── bson-serialization.service.ts       # BSON ↔ JSON conversion service
│   │   │   ├── bson-serialization.middleware.ts    # Express/NestJS middleware for transparent BSON conversion
│   │   │   ├── bson-response.interceptor.ts        # GraphQL response interceptor for BSON conversion
│   │   │   ├── __tests__/              # BSON feature tests
│   │   │   └── index.ts                # BSON barrel
│   │   └── index.ts                    # GraphQL submodule barrel
│   │
│   ├── guards/                         # GraphQL execution guards (request filtering)
│   │   ├── graphql-auth.guard.ts       # JwtAuthGuard — requires valid JWT from @pawells/nestjs-auth
│   │   ├── graphql-public.guard.ts     # PublicGuard — marks resolver as public (skips auth)
│   │   ├── graphql-roles.guard.ts      # RoleGuard — requires user to have specified roles
│   │   ├── query-complexity.guard.ts   # QueryComplexityGuard — rejects queries exceeding complexity limit
│   │   ├── rate-limit.guard.ts         # RateLimitGuard — per-user rate limiting via Redis
│   │   ├── index.ts                    # Guards barrel
│   │   └── __tests__/                  # Guard unit and integration tests
│   │
│   ├── interceptors/                   # GraphQL execution interceptors (cross-cutting concerns)
│   │   ├── graphql-logging.interceptor.ts             # Logs all operations with timing
│   │   ├── graphql-error.interceptor.ts               # Catches errors, applies GraphQLErrorFormatter
│   │   ├── graphql-performance.interceptor.ts         # Tracks slow queries, alerts on threshold
│   │   ├── performance-monitoring.interceptor.ts      # Exports Prometheus metrics
│   │   ├── cache.interceptor.ts                       # Response-level caching for resolvers
│   │   ├── index.ts                    # Interceptors barrel
│   │   └── __tests__/                  # Interceptor tests
│   │
│   ├── pipes/                          # GraphQL validation pipes
│   │   ├── graphql-validation.pipe.ts        # class-validator integration for DTOs
│   │   ├── graphql-input-validation.pipe.ts  # Input validation with XSS detection
│   │   ├── index.ts                    # Pipes barrel
│   │   └── __tests__/                  # Pipe tests
│   │
│   ├── services/                       # GraphQL business logic services
│   │   ├── rate-limit.service.ts       # Redis-backed rate limiting with token bucket algorithm
│   │   ├── cache.service.ts            # GraphQL resolver response caching (resolver-level)
│   │   ├── performance.service.ts      # Performance tracking, slow query detection and logging
│   │   ├── index.ts                    # Services barrel
│   │   └── __tests__/                  # Service unit and integration tests
│   │
│   ├── decorators/                     # Method and class decorators for resolvers
│   │   ├── graphql-auth-decorators.ts  # @Public, @Roles, @CurrentUser (re-exports from @pawells/nestjs-auth)
│   │   ├── subscription.decorator.ts   # @SubscriptionConfig — metadata for subscription resolvers
│   │   ├── cacheable.decorator.ts      # @Cacheable, @CacheInvalidate for GraphQL fields
│   │   ├── index.ts                    # Decorators barrel
│   │   └── __tests__/                  # Decorator tests
│   │
│   ├── subscriptions/                  # WebSocket subscription infrastructure
│   │   ├── subscription.service.ts             # Manages subscriptions, event filtering, routing
│   │   ├── websocket.server.ts                 # WebSocket server setup (ws library, connection upgrades)
│   │   ├── websocket-auth.service.ts           # JWT verification for WebSocket connections
│   │   ├── connection-manager.service.ts       # Tracks active WS connections, user association
│   │   ├── resilience.service.ts               # Reconnection logic, circuit breaker for resilience
│   │   ├── redis-pubsub.factory.ts             # Creates Redis PubSub instance for pub/sub messaging
│   │   ├── websocket-config.interface.ts       # IWebSocketConfig — WebSocket configuration
│   │   ├── subscription-config.interface.ts    # ISubscriptionConfig — subscription metadata
│   │   ├── index.ts                    # Subscriptions barrel
│   │   └── __tests__/                  # Subscription tests
│   │
│   ├── loaders/                        # DataLoader batch loading for N+1 prevention
│   │   ├── dataloader.factory.ts       # Generic DataLoader factory with batching and caching
│   │   ├── dataloader-registry.ts      # Request-scoped loader registry (prevents cross-request sharing)
│   │   ├── user.loader.ts              # Pre-built User batch loader
│   │   ├── product.loader.ts           # Pre-built Product batch loader
│   │   ├── order.loader.ts             # Pre-built Order batch loader
│   │   ├── comment.loader.ts           # Pre-built Comment batch loader
│   │   ├── comments-by-post.loader.ts  # Pre-built Comments-by-Post batch loader
│   │   ├── comments-by-user.loader.ts  # Pre-built Comments-by-User batch loader
│   │   ├── orders-by-user.loader.ts    # Pre-built Orders-by-User batch loader
│   │   ├── tag.loader.ts               # Pre-built Tag batch loader
│   │   ├── index.ts                    # Loaders barrel
│   │   └── __tests__/                  # Loader tests
│   │
│   ├── context/                        # GraphQL execution context
│   │   ├── context-factory.ts          # Creates request context for HTTP and WebSocket connections
│   │   ├── graphql-context.interface.ts # IGraphQLContext, IWebSocketContext interfaces
│   │   ├── index.ts                    # Context barrel
│   │   └── __tests__/                  # Context tests
│   │
│   ├── errors/                         # GraphQL-specific error classes
│   │   ├── graphql-error.ts            # Base GraphQL error class
│   │   ├── error-factory.ts            # Factory for creating domain-specific GraphQL errors
│   │   ├── graphql-error-factory.ts    # Factory for creating standardized GraphQL errors
│   │   ├── unauthorized.error.ts       # 401 Unauthorized error
│   │   ├── forbidden.error.ts          # 403 Forbidden error
│   │   ├── not-found.error.ts          # 404 Not Found error
│   │   ├── conflict.error.ts           # 409 Conflict error
│   │   ├── validation.error.ts         # 400 Validation error
│   │   ├── rate-limit.error.ts         # 429 Too Many Requests error
│   │   ├── index.ts                    # Errors barrel
│   │   └── __tests__/                  # Error tests
│   │
│   ├── constants/                      # GraphQL-wide constants
│   │   ├── complexity.constants.ts     # Query complexity thresholds
│   │   ├── performance.constants.ts    # Performance monitoring thresholds
│   │   ├── subscriptions.constants.ts  # WebSocket configuration defaults
│   │   └── index.ts                    # Constants barrel
│   │
│   ├── __tests__/                      # Root-level GraphQL module tests
│   └── index.ts                        # GraphQL module public API barrel
│
├── index.ts                            # Main package entry point (barrel for all exports)
└── __tests__/                          # Package-level integration tests
```

### Module Hierarchy Diagram

```
@pawells/nestjs-graphql
├── CacheModule
│   ├── Imports: @nestjs/cache-manager, Keyv, @keyv/redis
│   ├── Exports: CacheService, Decorators (@Cacheable, @CacheEvict, @CacheInvalidate)
│   └── Used by: GraphQLModule (optional), Application modules
│
└── GraphQLModule
    ├── Imports: @nestjs/graphql, @nestjs/apollo, @pawells/nestjs-auth (optional)
    ├── Exports: All guards, interceptors, pipes, services, loaders, types
    ├── Dependencies:
    │   ├── RateLimitService (requires Redis)
    │   ├── GraphQLService (utilities)
    │   ├── DataLoaderRegistry (request-scoped)
    │   ├── WebSocketServer (optional, for subscriptions)
    │   └── BsonSerializationService (optional, for MongoDB)
    └── Consumer pattern: Import in root AppModule
```

## Key Concepts

### 1. Dynamic Module Pattern (`forRoot` / `forRootAsync`)

All modules in this package follow NestJS's dynamic module pattern for configuration:

- **`Module.forRoot(options)`** — Synchronous configuration, validated with Joi. Used when config is known at compile time or passed directly.
- **`Module.forRootAsync(options)`** — Asynchronous configuration via factory functions. Used when config must be resolved from services, environment, or external sources.

Both return a `DynamicModule` with providers, imports, and exports. The pattern allows:
- Type-safe options (interfaces like `IGraphQLConfigOptions`)
- Config validation on module load
- Lazy provider instantiation
- Dependency injection in async factories

**Example:**
```typescript
// Synchronous
GraphQLModule.forRoot({ autoSchemaFile: 'schema.gql', playground: false })

// Asynchronous with factory injection
CacheModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    host: configService.get('REDIS_HOST'),
    port: configService.get('REDIS_PORT'),
  }),
  inject: [ConfigService],
})
```

### 2. Lazy Loading via `ILazyModuleRefService`

The `ILazyModuleRefService` interface defers dependency resolution to runtime, avoiding circular dependency issues. It uses the NestJS `ModuleRef` to resolve services lazily when needed, not during module initialization.

Classes that need this pattern implement the interface and receive `ModuleRef`:

```typescript
export interface ILazyModuleRefService {
  readonly ModuleRef: ModuleRef;
  get<T>(token: InjectionToken<T>): T;
}
```

**Use case in this package:**
- Guards (`GraphQLAuthGuard`, `GraphQLRolesGuard`) use standard constructor injection
- Advanced services that depend on auth or cache defer resolution via `ModuleRef`

**Example:**
```typescript
constructor(private readonly ModuleRef: ModuleRef) {}

private async getAuthService(): Promise<AuthService> {
  return this.ModuleRef.get(AuthService, { strict: false });
}
```

### 3. DataLoader Pattern and Request-Scoped Registry

DataLoaders batch database queries to prevent N+1 problems. The `DataLoaderRegistry` ensures loaders are request-scoped (created per request, shared within the request, never shared across requests).

- **`DataLoaderFactory`** — Generic factory for creating typed DataLoaders
- **`DataLoaderRegistry`** — Request context holder for DataLoaders
- **Pre-built loaders** — `UserLoader`, `ProductLoader`, `CommentLoader`, etc.

**Critical invariant:** Each request gets its own registry instance. Violating this causes stale data bugs.

**Usage pattern:**
```typescript
@Resolver(Post)
export class PostResolver {
  constructor(private readonly loaderRegistry: DataLoaderRegistry) {}

  @ResolveField(() => [Comment])
  async comments(@Parent() post: Post): Promise<Comment[]> {
    const loader = this.loaderRegistry.get(CommentsByPostLoader);
    return loader.load(post.id);
  }
}
```

The context factory automatically creates a fresh registry for each request (HTTP or WebSocket).

### 4. WebSocket Authentication Security Model (Fail-Closed)

WebSocket subscriptions require explicit JWT authentication via `WebSocketAuthService`. The security model is **fail-closed**: if `JwtService` is not configured, all WebSocket authentications fail.

- **`WebSocketAuthService`** — Verifies JWT tokens on WebSocket upgrade
- **`JwtService`** — Required from `@pawells/nestjs-auth` for cryptographic verification
- **Fail-closed behavior** — Without JwtService, auth always fails; no fallback to public mode

**Why fail-closed?** Subscriptions are bidirectional and persistent. A misconfiguration that allows unauthenticated subscriptions could leak data. By failing closed, operators are forced to explicitly configure authentication.

**Configuration:**
```typescript
@Module({
  imports: [
    CacheModule.forRoot(),
    GraphQLModule.forRoot({
      subscriptions: {
        // Requires AuthModule with JwtService to be imported at root
        // If not present, all WebSocket authentications will fail
      },
    }),
    AuthModule, // Must be imported for subscriptions to work
  ],
})
export class AppModule {}
```

### 5. Cache Decorator Stack (`@Cacheable`, `@CacheEvict`, `@CacheInvalidate`)

Three decorators provide declarative caching at the method level:

| Decorator | Purpose | Example |
|-----------|---------|---------|
| `@Cacheable(options)` | Cache method result; return cached value on subsequent calls | `@Cacheable({ key: 'user:{id}', ttl: 3600 })` |
| `@CacheEvict(options)` | Remove a single cache entry after method execution | `@CacheEvict({ key: 'users:all' })` |
| `@CacheInvalidate(options)` | Remove all cache entries matching a pattern | `@CacheInvalidate({ pattern: 'user:*' })` |

All three:
- Can be stacked on a single method
- Support both sync and async methods
- Require `CacheModule.forRoot()` to be imported
- Work on any injectable class method (services, resolvers, etc.)

**Example usage in a GraphQL resolver:**
```typescript
@Query(() => [User])
@Cacheable({ key: 'users:all', ttl: 3600 })
async getAllUsers(): Promise<User[]> {
  return this.userService.findAll();
}

@Mutation(() => User)
@CacheInvalidate({ pattern: 'user:*' })
async createUser(@Args('input') input: CreateUserInput): Promise<User> {
  return this.userService.create(input);
}
```

### 6. Query Complexity Analysis

The `QueryComplexityGuard` prevents DoS attacks by calculating the "complexity" of incoming GraphQL queries. Queries exceeding a configured threshold are rejected.

- **`QueryComplexityCalculator`** — Analyzes query AST, computes cost
- **`ComplexityRules`** — Default cost rules for built-in types (e.g., Connection = 10, Field = 1)
- **`QueryComplexityGuard`** — Guard that enforces limits

**How it works:**
1. Parser converts GraphQL query string to AST
2. Calculator walks AST, applies complexity rules to each field
3. Total complexity is summed (nested fields multiply costs)
4. If total > configured limit, query is rejected with HTTP 400

**Example rules:**
```typescript
const ComplexityRules = {
  Connection: 10,      // Pagination types cost more
  Field: 1,            // Simple fields cost 1
  List: 1.5,           // Lists cost 1.5x
};
```

**Guard registration:**
```typescript
// In AppModule or in @UseGuards on specific resolvers
@UseGuards(QueryComplexityGuard, GraphQLAuthGuard)
async query(@Args() args: any) {}
```

**Order matters:** Complexity guard should run before auth guard (cheap failures first).

## Public API

### Primary Entry Points (What Most Consumers Import)

These are the core exports that 90% of applications need:

1. **`CacheModule`** — Module import for Redis caching
2. **`GraphQLModule`** — Module import for GraphQL integration
3. **`@Cacheable`, `@CacheEvict`, `@CacheInvalidate`** — Decorators for caching
4. **`@Public`, `@Roles`, `@CurrentUser`** — Auth decorators (re-exported from @pawells/nestjs-auth)
5. **`GraphQLErrorFormatter`** — Error formatting utility
6. **`DataLoaderRegistry`** — Request-scoped loader registry for N+1 prevention

**Example minimal app:**
```typescript
import { GraphQLModule, CacheModule } from '@pawells/nestjs-graphql';

@Module({
  imports: [
    CacheModule.forRoot(),
    GraphQLModule.forRoot({ autoSchemaFile: 'schema.gql' }),
  ],
})
export class AppModule {}
```

### Secondary Exports (Advanced Features and Customization)

These are for advanced use cases, framework integration, or custom implementation:

**Guards:**
- `GraphQLAuthGuard` — Requires valid JWT
- `GraphQLRolesGuard` — Role-based access control
- `GraphQLPublicGuard` — Marks resolver as public
- `QueryComplexityGuard` — Query complexity limiting
- `GraphQLRateLimitGuard` — Per-user rate limiting

**Interceptors:**
- `GraphQLLoggingInterceptor` — Operation logging
- `GraphQLErrorInterceptor` — Error formatting and handling
- `GraphQLPerformanceInterceptor` — Slow query detection
- `GraphQLPerformanceMonitoringInterceptor` — Prometheus metrics
- `GraphQLCacheInterceptor` — Resolver response caching
- `BsonResponseInterceptor` — BSON serialization

**Pipes:**
- `GraphQLValidationPipe` — class-validator integration
- `GraphQLInputValidationPipe` — Input validation + XSS detection

**Services:**
- `RateLimitService` — Redis-backed token bucket rate limiting
- `GraphQLPerformanceService` — Performance tracking
- `GraphQLCacheService` — Resolver-level caching
- `SubscriptionService` — Subscription management
- `WebSocketAuthService` — WebSocket JWT verification
- `BsonSerializationService` — BSON ↔ JSON conversion

**Types and Utilities:**
- `Connection<T>`, `Edge<T>`, `PageInfo` — Relay-style pagination types
- `SortDirection` enum — ASC/DESC sorting
- `CursorUtils` — Base64 cursor encoding/decoding
- `ObjectIdScalar`, `DateTimeScalar`, `JSONScalar` — Custom GraphQL scalars
- `DataLoaderFactory`, `DataLoaderRegistry` — Batch loading utilities

**Loaders:**
- `UserLoader`, `ProductLoader`, `OrderLoader`, `CommentLoader`, `TagLoader` — Pre-built batch loaders

### What's Exported but Generally Not Imported

These are implementation details used internally or are base classes for extension:

- `BaseCacheInterceptor` — Extend this to add custom cache logic
- `BaseCacheService` — Extend this to add domain-specific caching
- `ComplexityRules` — Configuration for query complexity costs
- `IGraphQLErrorExtensions` — Type for error extensions
- Error classes (`UnauthorizedError`, `ForbiddenError`, `NotFoundError`, etc.) — Thrown by guards/services, rarely imported directly

## Architecture Patterns

### Module Design

All configurable modules follow the **dynamic module pattern**:

1. **Static factory methods** (`forRoot`, `forRootAsync`) define configuration
2. **Joi validation** (when applicable) ensures config correctness at module load time
3. **Providers** are registered based on config options
4. **Global scope** (`@Global()` decorator) makes modules available application-wide without re-importing

**CacheModule example:**
```typescript
@Global()
@Module({})
export class CacheModule {
  public static ForRoot(): DynamicModule { /* ... */ }
  public static ForRootAsync(options: ICacheModuleAsyncOptions): DynamicModule { /* ... */ }
}
```

### Exports and Barrel Files

Each module exposes a **barrel file** (`index.ts`) that aggregates exports:

- **Cache module** (`src/cache/index.ts`) — Exports CacheService, decorators, interfaces
- **GraphQL submodules** — Each subdirectory (guards/, services/, etc.) has its own barrel
- **Package barrel** (`src/index.ts`) — Top-level barrel re-exports from all submodules

This allows clean imports:
```typescript
// Good: specific import
import { CacheService } from '@pawells/nestjs-graphql/cache';

// Also good: from package barrel (re-exported)
import { CacheService } from '@pawells/nestjs-graphql';
```

### Lazy Loading in Advanced Cases

While most services use standard NestJS constructor injection, some internal services defer resolution:

```typescript
export class AdvancedService implements ILazyModuleRefService {
  readonly ModuleRef: ModuleRef;

  constructor(moduleRef: ModuleRef) {
    this.ModuleRef = moduleRef;
  }

  async getAuthService(): Promise<AuthService> {
    return this.ModuleRef.get(AuthService, { strict: false });
  }
}
```

This avoids circular dependencies at module initialization time.

### Configuration

**CacheModule configuration:**
- Environment variables: `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`, `REDIS_PASSWORD`, `REDIS_KEY_PREFIX`, `REDIS_TTL`
- Validation: Joi schema (see `redis.config.ts`)
- Defaults: Host = localhost, Port = 6379, TTL = 1 hour

**GraphQLModule configuration:**
- Via `IGraphQLConfigOptions` interface
- Supports Apollo Server options (autoSchemaFile, playground, introspection, debug, tracing)
- Optional: context factory, CORS, error formatter, BSON config

### Security Defaults

1. **Playground disabled by default** — Set `playground: true` to enable GraphQL Playground (dev only)
2. **Introspection disabled by default** — Set `introspection: true` to expose schema queries
3. **WebSocket auth is fail-closed** — Requires JwtService; misconfiguration results in all subscriptions failing
4. **Query complexity limits enforced** — Prevents runaway queries from exhausting server resources
5. **Rate limiting per user** — Token bucket algorithm prevents abuse

## Coding Patterns

### Error Handling Strategy

Errors in GraphQL contexts are handled by the **error formatter** pipeline:

1. **GraphQL execution** — Apollo Server catches GraphQL errors (type errors, resolver exceptions)
2. **`GraphQLErrorInterceptor`** — Catches errors thrown by resolvers
3. **`GraphQLErrorFormatter`** — Formats errors for API response (adds codes, extensions, sanitizes messages)

**Pattern for throwing errors:**
```typescript
// Use GraphQLErrorFactory for standardized errors
import { GraphQLErrorFactory } from '@pawells/nestjs-graphql';

@Query(() => User)
async getUser(@Args('id') id: string): Promise<User> {
  const user = await this.userService.findById(id);
  if (!user) {
    throw GraphQLErrorFactory.notFound(`User ${id} not found`);
  }
  return user;
}

// For custom logic errors, extend GraphqlError or use error classes
import { UnauthorizedError, ForbiddenError } from '@pawells/nestjs-graphql';

@Query(() => SecretData)
async getSecret(@Context() ctx: IGraphQLContext): Promise<SecretData> {
  if (!ctx.user) {
    throw new UnauthorizedError('Authentication required');
  }
  if (!ctx.user.roles.includes('admin')) {
    throw new ForbiddenError('Admin role required');
  }
  return this.secretService.getSecret();
}
```

**Error response format:**
```json
{
  "errors": [
    {
      "message": "User 123 not found",
      "extensions": {
        "code": "NOT_FOUND",
        "statusCode": 404,
        "timestamp": "2024-01-15T10:30:00Z"
      }
    }
  ]
}
```

### Type Organization

Types are organized by concern:

1. **GraphQL Types** (`graphql/types/*.ts`) — Domain types (User, Post, Comment) decorated with `@ObjectType`, `@Field`, etc.
2. **Scalars** (`graphql/scalars/*.ts`) — Custom scalar types (ObjectId, DateTime, JSON)
3. **Type Registry** (`graphql/types/type-registry.ts`) — Centralizes type registration for complexity analysis
4. **Interfaces** (`*.interface.ts`) — Configuration interfaces, service contracts
5. **Type Aliases** (`*.types.ts`) — TypeScript type unions, utility types

**Naming conventions:**
- Domain types: `User`, `Post`, `Comment` (PascalCase)
- Interfaces: `IUserService`, `ICacheOptions` (I-prefix)
- Type aliases: `TErrorType`, `TCacheKey` (T-prefix)
- Enums: `SortDirection`, `GraphQLErrorCode` (PascalCase)

### NestJS Conventions Specific to This Package

1. **Decorators** — All resolvers use NestJS decorators (`@Resolver`, `@Query`, `@Mutation`, `@Subscription`, `@Field`, `@ResolveField`)
2. **Guards** — Register via `@UseGuards(Guard1, Guard2)` or module-level registration
3. **Interceptors** — Register via `@UseInterceptors(Int1, Int2)` or `APP_INTERCEPTOR` provider token
4. **Pipes** — Validate inputs via `@Args` with `validate: true` option or `@UseFilters`
5. **Dependency injection** — Constructor injection for public services, lazy resolution via ModuleRef for circular dependencies
6. **Context** — Inject via `@Context() ctx: IGraphQLContext` or `GraphQLContextParam()` decorator

**Example resolver with all patterns:**
```typescript
@Resolver(() => User)
@UseGuards(GraphQLAuthGuard, QueryComplexityGuard)
export class UserResolver {
  constructor(
    private readonly userService: UserService,
    private readonly loaderRegistry: DataLoaderRegistry,
    private readonly cacheService: GraphQLCacheService,
  ) {}

  @Query(() => User)
  @Cacheable({ key: 'user:{id}', ttl: 3600 })
  async getUser(
    @Args('id', ParseIdPipe) id: string,
    @Context() ctx: IGraphQLContext,
  ): Promise<User> {
    return this.userService.findById(id);
  }

  @ResolveField(() => [Post])
  async posts(@Parent() user: User): Promise<Post[]> {
    const loader = this.loaderRegistry.get(PostsByUserLoader);
    return loader.load(user.id);
  }

  @Mutation(() => User)
  @CacheInvalidate({ pattern: 'user:*' })
  async updateUser(
    @Args('input') input: UpdateUserInput,
    @Context() ctx: IGraphQLContext,
  ): Promise<User> {
    if (ctx.user.id !== input.id && !ctx.user.roles.includes('admin')) {
      throw new ForbiddenError('Can only update your own profile');
    }
    return this.userService.update(input.id, input);
  }
}
```

## Common Gotchas

### 1. WebSocket Authentication Fails Closed Without JwtService

**Gotcha:** If `AuthModule` is not imported or `JwtService` is not configured, **all WebSocket connections will be rejected** with authentication errors. There is no fallback to public/unauthenticated mode.

**Why:** Subscriptions are persistent, bidirectional connections. Allowing unauthenticated subscriptions due to misconfiguration could leak sensitive data. Failing closed forces explicit operator attention.

**Fix:**
```typescript
@Module({
  imports: [
    // Must import AuthModule before or alongside GraphQLModule if using subscriptions
    AuthModule.forRoot({ /* JwtService config */ }),
    CacheModule.forRoot(),
    GraphQLModule.forRoot({
      subscriptions: { /* ... */ },
    }),
  ],
})
export class AppModule {}
```

If you genuinely want public subscriptions, explicitly configure a public auth strategy in `WebSocketAuthService`.

### 2. DataLoader Registry is Request-Scoped (Never Share Across Requests)

**Gotcha:** The `DataLoaderRegistry` is created fresh for each HTTP request or WebSocket connection. If you cache a registry instance or pass it between requests, subsequent requests will see stale data from the previous request's batch.

**Why:** DataLoaders batch queries within a request's execution scope. Reusing a registry across requests breaks this invariant.

**Anti-pattern:**
```typescript
// WRONG: Caching registry across requests
private cachedRegistry: DataLoaderRegistry;

constructor(registry: DataLoaderRegistry) {
  this.cachedRegistry = registry; // DON'T DO THIS
}

async loadUser(id: string) {
  const loader = this.cachedRegistry.get(UserLoader); // Stale data from previous request!
  return loader.load(id);
}
```

**Correct pattern:**
```typescript
// RIGHT: Always get fresh registry from context
@Query(() => User)
async getUser(
  @Args('id') id: string,
  @Context() ctx: IGraphQLContext, // Context is fresh per-request
): Promise<User> {
  const loader = ctx.loaderRegistry.get(UserLoader);
  return loader.load(id);
}
```

The context factory (`GraphQLContextFactory`) automatically creates a fresh registry for each request. Use `ctx.loaderRegistry`, never cache the registry instance itself.

### 3. @Cacheable Decorator Requires CacheModule to Be Imported

**Gotcha:** If you decorate a method with `@Cacheable` but forget to import `CacheModule.forRoot()`, the decorator is silently ignored. Methods will always execute (no caching), with no error.

**Why:** Decorators are just metadata. They don't cause errors if their handler isn't registered; they simply do nothing.

**Anti-pattern:**
```typescript
@Module({
  // Forgot to import CacheModule!
  imports: [GraphQLModule.forRoot()],
})
export class AppModule {}

@Injectable()
export class UserService {
  @Cacheable({ key: 'user:{id}', ttl: 3600 })
  async findById(id: string): Promise<User> {
    // This executes every time, no caching!
    return this.db.findUser(id);
  }
}
```

**Fix:**
```typescript
@Module({
  imports: [
    CacheModule.forRoot(), // Import this first!
    GraphQLModule.forRoot(),
  ],
})
export class AppModule {}
```

To verify caching is working, check logs or add a console.log inside the method. If it's not called on the second request for the same key, caching is working.

### 4. Query Complexity Guard Must Run Before Auth Guard

**Gotcha:** If you register `QueryComplexityGuard` after `GraphQLAuthGuard`, expensive queries from unauthenticated users will be rejected for auth reasons, not complexity. The guard order controls execution order.

**Why:** Guards execute in registration order. Cheap auth checks should fail first (quick rejection), expensive complexity analysis should run only after auth passes.

**Anti-pattern:**
```typescript
// WRONG: Auth runs first, slow queries pass auth check, then fail complexity
@UseGuards(GraphQLAuthGuard, QueryComplexityGuard)
@Query(() => [User])
async getAllUsers() { }
```

**Correct pattern:**
```typescript
// RIGHT: Complexity is cheap (it's static analysis), so run it first
@UseGuards(QueryComplexityGuard, GraphQLAuthGuard)
@Query(() => [User])
async getAllUsers() { }
```

Or register globally in the correct order:
```typescript
// In main.ts or app.module.ts
app.useGlobalGuards(
  QueryComplexityGuard,    // Run first (cheap)
  GraphQLAuthGuard,        // Run second (moderate cost)
  GraphQLRateLimitGuard,   // Run third (requires Redis lookup)
);
```

### 5. BSON Serialization Requires Explicit Import

**Gotcha:** The BSON serialization middleware and interceptor are included in the package but are opt-in. If you have MongoDB ObjectIds in your resolvers and don't configure BSON serialization, they will be serialized as `{ oid: "..." }` instead of strings, breaking GraphQL field matching.

**Why:** BSON serialization is domain-specific (only needed for MongoDB). It's not configured by default to avoid overhead for non-MongoDB applications.

**Fix:**
```typescript
// In graphql.module.ts config
GraphQLModule.forRoot({
  bson: {
    enabled: true,
  },
})

// Ensure BsonSerializationService is provided
// It's registered automatically when bson config is present
```

### 6. Environment Variable Configuration is Mandatory for Redis

**Gotcha:** `CacheModule` and rate limiting require a running Redis instance. If Redis is not available (wrong host, wrong port, down, etc.), the application will fail at module init time with a cryptic error.

**Why:** Module initialization fails fast instead of deferring to first use. This ensures configuration errors are caught early.

**Fix:**
```bash
# Set Redis connection env vars before starting app
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_DB=0
export REDIS_PASSWORD=your_password  # if auth required
export REDIS_KEY_PREFIX=myapp:       # optional, for key namespacing

# Then start app
npm start
```

If Redis is not available and you want to develop without it, use an in-memory cache for development:
```typescript
// In dev environment only
if (process.env.NODE_ENV === 'development' && !process.env.REDIS_HOST) {
  // Use memory cache instead of Redis (dev-only!)
  // But note: CacheModule will fail, so you'll need to mock it
}
```

## Testing Notes

### Test Organization

Tests are colocated in `__tests__/` subdirectories throughout the source tree:

```
src/
├── cache/
│   ├── cache.module.ts
│   ├── cache.service.ts
│   └── __tests__/
│       ├── cache.module.spec.ts
│       ├── cache.service.spec.ts
│       ├── cache.interceptor.spec.ts
│       └── redis.mock.ts  # Mocked Redis client for tests
│
├── graphql/
│   ├── graphql/
│   │   ├── graphql.module.ts
│   │   ├── __tests__/
│   │   │   ├── graphql.module.spec.ts
│   │   │   ├── error-formatter.spec.ts
│   │   │   └── [feature].spec.ts
│   │   └── bson/
│   │       ├── __tests__/
│   │       │   ├── bson-serialization.service.spec.ts
│   │       │   └── bson-response.interceptor.spec.ts
│   │
│   ├── guards/
│   │   └── __tests__/
│   │       ├── graphql-auth.guard.spec.ts
│   │       ├── graphql-roles.guard.advanced.spec.ts
│   │       └── query-complexity.guard.spec.ts
│   │
│   └── services/
│       └── __tests__/
│           ├── cache.service.spec.ts
│           ├── rate-limit.service.spec.ts
│           └── performance.service.advanced.spec.ts
```

### Test Naming Conventions

- **`*.spec.ts`** — Unit tests for a single module/service
- **`*.advanced.spec.ts`** — Integration or edge-case tests requiring multiple dependencies
- **`*.type-safety.spec.ts`** — Tests that verify TypeScript type safety (compilation checks)

### Running Tests

```bash
# From workspace root: run all tests
yarn test

# Single package tests with coverage
cd packages/nestjs-graphql
yarn test:coverage

# Watch mode (from workspace root)
yarn test --watch

# Specific test file
yarn test cache.service.spec.ts

# Skip NX cache
yarn test --skip-nx-cache
```

### Coverage Requirements

- **Threshold:** 80% for lines, functions, branches, and statements
- **Required for CI:** Coverage must meet threshold to pass CI pipeline
- **Local development:** Run `yarn test:coverage` to see coverage report

**Example coverage report output:**
```
File                    Statements Branches Functions Lines
cache.service.ts        85%        82%      88%        86%
graphql.module.ts       92%        89%      95%        93%
All files               84%        81%      86%        85%
```

If coverage is below 80%, tests must be added or code refactored.

### Testing Patterns

**1. Mocking Redis**
```typescript
import { createMock } from '@golevelup/ts-jest';

describe('CacheService', () => {
  let service: CacheService;
  let redisClient: DeepMocked<Redis>;

  beforeEach(() => {
    redisClient = createMock<Redis>();
    service = new CacheService(redisClient);
  });

  it('should get cached value', async () => {
    redisClient.get.mockResolvedValue('cached_value');
    const result = await service.get('key');
    expect(result).toBe('cached_value');
  });
});
```

**2. Testing Guards**
```typescript
describe('GraphQLAuthGuard', () => {
  let guard: GraphQLAuthGuard;
  let authService: AuthService;

  beforeEach(() => {
    const mockAuthService = createMock<AuthService>();
    guard = new GraphQLAuthGuard(mockAuthService);
  });

  it('should allow requests with valid JWT', () => {
    const context = { user: { id: 'user123' } };
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject requests without JWT', () => {
    const context = { user: null };
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedError);
  });
});
```

**3. Testing Resolvers with DataLoaders**
```typescript
describe('UserResolver', () => {
  let resolver: UserResolver;
  let loaderRegistry: DataLoaderRegistry;

  beforeEach(() => {
    loaderRegistry = createMock<DataLoaderRegistry>();
    resolver = new UserResolver(loaderRegistry);
  });

  it('should load user comments via DataLoader', async () => {
    const mockLoader = createMock<DataLoader<string, Comment[]>>();
    mockLoader.load.mockResolvedValue([{ id: '1', text: 'comment' }]);
    loaderRegistry.get.mockReturnValue(mockLoader);

    const comments = await resolver.comments({ id: 'user123' });
    expect(comments).toHaveLength(1);
    expect(mockLoader.load).toHaveBeenCalledWith('user123');
  });
});
```

**4. Testing Error Formatting**
```typescript
describe('GraphQLErrorFormatter', () => {
  it('should format NotFoundError with correct code', () => {
    const error = new NotFoundError('User not found');
    const formatted = GraphQLErrorFormatter.format(error);

    expect(formatted.extensions.code).toBe('NOT_FOUND');
    expect(formatted.extensions.statusCode).toBe(404);
    expect(formatted.message).toBe('User not found');
  });
});
```

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

## Versioning & Publishing

The package version is defined in `packages/nestjs-graphql/package.json`. Publishing is triggered by a `v*` tag push and handled by `.github/workflows/publish.yml`.

## Build Output

Each package compiles with `tsc --project tsconfig.build.json` (excludes test files) into a `build/` directory containing `.js`, `.d.ts`, and `.map` files. Test coverage threshold is 80% for lines, functions, branches, and statements.
