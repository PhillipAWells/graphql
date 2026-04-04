# @pawells/nestjs-graphql

[![CI](https://github.com/PhillipAWells/graphql/actions/workflows/ci.yml/badge.svg)](https://github.com/PhillipAWells/graphql/actions/workflows/ci.yml) [![npm version](https://img.shields.io/npm/v/@pawells/nestjs-graphql.svg)](https://www.npmjs.com/package/@pawells/nestjs-graphql) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## Description

`@pawells/nestjs-graphql` is a production-ready NestJS module that integrates Apollo Server 5.x into the NestJS dependency-injection framework with Redis-backed caching, WebSocket subscriptions, DataLoaders, query complexity analysis, and a security-first guard stack. It is designed for teams building GraphQL APIs on NestJS who need a comprehensive, opinionated set of utilities out of the box.

---

## Requirements

- **Node.js**: `>=22.0.0`
- **TypeScript**: `>=5.0.0` (ES2022 target, strict mode)

### Key Peer Dependencies

- `@nestjs/apollo` >= 13.0.0
- `@nestjs/graphql` >= 13.0.0
- `@nestjs/common` >= 10.0.0
- `@nestjs/core` >= 10.0.0
- `graphql` >= 16.0.0
- `dataloader` >= 2.0.0
- `graphql-redis-subscriptions` >= 2.0.0
- `ioredis` >= 5.0.0

---

## Installation

### npm

```bash
npm install @pawells/nestjs-graphql
```

### Yarn

```bash
yarn add @pawells/nestjs-graphql
```

---

## Quick Start

```typescript
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@pawells/nestjs-graphql';

@Module({
  imports: [
    GraphQLModule.forRoot({
      autoSchemaFile: true,
      subscriptions: { redis: 'redis://localhost:6379' },
    }),
  ],
})
export class AppModule {}
```

---

## API Reference

### Core Exports

- **`GraphQLModule`** — Main NestJS dynamic module. Supports `forRoot(options)` and `forRootAsync(options)` for static and deferred configuration.
- **`GraphQLService`** — Central service providing access to Apollo Server, caching, and subscriptions management.
- **`IGraphQLConfigOptions`** — Configuration interface for `forRoot()`.
- **`IGraphQLAsyncConfig`** — Async configuration interface for `forRootAsync()`.

### Scalars

- **`ObjectIdScalar`** — MongoDB ObjectId scalar for GraphQL.
- **`DateTimeScalar`** — ISO 8601 DateTime scalar.
- **`JSONScalar`** — Generic JSON scalar for arbitrary JSON objects and arrays.

### Pagination & Cursor Types

- **`PageInfo`** — Standard GraphQL pagination metadata (hasNextPage, hasPreviousPage, startCursor, endCursor).
- **`Connection<T>`** — Relay-style connection wrapper for paginated results.
- **`Edge<T>`** — Relay-style edge type containing a node and cursor.
- **`CursorUtils`** — Utility functions for encoding/decoding Relay-style cursors.
- **`SortDirection`** — Enum for sort ordering (ASC, DESC).

### Error Handling

- **`GraphQLErrorFormatter`** — Function to format and serialize GraphQL errors with extensions.
- **`GraphQLErrorCode`** — Enum of standard GraphQL error codes.
- **`IGraphQLErrorExtensions`** — Interface for error extension metadata.
- **`IValidationError`** — Interface for validation error details.

### Guards

- **`GraphQLAuthGuard`** — Protects resolvers requiring authentication (JWT-based).
- **`GraphQLRolesGuard`** — RBAC guard requiring one or more roles.
- **`GraphQLPublicGuard`** — Marks resolvers as publicly accessible (skips auth).
- **`QueryComplexityGuard`** — Prevents expensive queries using complexity analysis.
- **`RateLimitGuard`** — Rate-limiting guard using configurable strategies.

### Interceptors

- **`GraphQLLoggingInterceptor`** — Logs GraphQL operation metadata and timing.
- **`GraphQLErrorInterceptor`** — Intercepts and normalizes GraphQL errors.
- **`GraphQLPerformanceInterceptor`** — Monitors resolver execution time.
- **`PerformanceMonitoringInterceptor`** — Collects performance metrics for OpenTelemetry.
- **`GraphQLCacheInterceptor`** — Caches resolver results via Redis.

### Pipes

- **`GraphQLValidationPipe`** — Validates root-level query/mutation arguments using class-validator.
- **`GraphQLInputValidationPipe`** — Validates nested input types and object arguments.

### Services

- **`GraphQLCacheService`** — Redis-backed caching with TTL support and cache invalidation.
- **`RateLimitService`** — Rate limiting with configurable buckets and strategies.
- **`PerformanceService`** — Performance tracking and metrics collection.

### Decorators

- **`@Cacheable(options)`** — Decorator for resolver field caching with TTL and key generation.
- **`@CacheInvalidate(...keys)`** — Decorator to invalidate cache entries on mutation or event.
- **Auth decorators** — `@Auth()`, `@Roles()`, `@Permissions()` — used with guards for access control.

### Context & Subscriptions

- **Context factory and types** — Utilities for creating and typing GraphQL context with user, request, and subscription data.
- **Subscription services and types** — Full export from subscription module for WebSocket connection management.

### DataLoaders

- **`DataLoaderFactory`** — Factory for creating DataLoader instances with caching and batching.
- **`DataLoaderRegistry`** — Registry for managing multiple DataLoader instances per request.
- **Pre-built loaders**: `User`, `Product`, `Order`, `Comment`, `Tag`, `Category`, `Review`, `Media`, `Notification` — common domain-specific loaders.

### Cache Module

- **`CacheModule`** — Provides Redis-backed caching via `forRoot(options)` and `forRootAsync(options)`.

---

## Features

- **Apollo Server Integration** — Seamless integration with NestJS via `@nestjs/apollo`.
- **DataLoaders** — Built-in batch loading to prevent N+1 queries.
- **Redis-backed Subscriptions** — Real-time GraphQL subscriptions via `graphql-redis-subscriptions`.
- **WebSocket Authentication** — JWT-based auth for WebSocket connections (fails closed without `JwtService`).
- **Query Complexity Analysis** — Prevents expensive queries via `graphql-query-complexity`.
- **Caching** — Redis-backed response caching with invalidation support.
- **Rate Limiting** — Query and resolver-level rate limiting.
- **Performance Monitoring** — Built-in metrics for OpenTelemetry integration.
- **Security Defaults** — Guards and decorators for RBAC and permission-based access control.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on contributing to this project, including the release workflow, branching strategy, and commit conventions.

---

## Development

### Workspace Commands

Run from the workspace root:

```bash
# Full pipeline (typecheck → lint → test → build)
yarn pipeline

# Individual steps
yarn typecheck
yarn lint
yarn lint:fix
yarn test
yarn build
```

### Package Commands

To work on the package directly:

```bash
cd packages/nestjs-graphql
yarn pipeline
yarn test
yarn test:coverage
```

`yarn test:coverage` is available per-package only, not at the workspace root.

### NX Caching

NX automatically caches `build`, `test`, `lint`, and `typecheck` targets. To bypass the cache:

```bash
yarn test --skip-nx-cache
```

---

## Peer Dependencies

The following packages must be installed by the consumer. All are required unless marked optional.

| Package | Version | Notes |
|---|---|---|
| `@nestjs/apollo` | `>=13.0.0` | |
| `@nestjs/cache-manager` | `>=3.0.0` | |
| `@nestjs/common` | `>=10.0.0` | |
| `@nestjs/config` | `>=3.0.0` | |
| `@nestjs/core` | `>=10.0.0` | |
| `@nestjs/graphql` | `>=13.0.0` | |
| `@nestjs/terminus` | `>=10.0.0` | |
| `@nestjs/throttler` | `>=5.0.0` | |
| `@opentelemetry/api` | `>=1.0.0` | |
| `@pawells/nestjs-auth` | `1.1.2` | Optional |
| `cache-manager` | `>=7.0.0` | |
| `class-transformer` | `>=0.5.0` | |
| `class-validator` | `>=0.14.0` | |
| `compression` | `>=1.0.0` | |
| `csrf-csrf` | `>=4.0.0` | |
| `dataloader` | `>=2.0.0` | |
| `express` | `>=5.0.0` | |
| `graphql` | `>=16.0.0` | |
| `graphql-query-complexity` | `>=0.12.0` | |
| `graphql-redis-subscriptions` | `>=2.0.0` | |
| `helmet` | `>=7.0.0` | |
| `ioredis` | `>=5.0.0` | |
| `joi` | `>=18.0.0` | |
| `keyv` | `>=5` | |
| `prom-client` | `>=15.0.0` | |
| `rxjs` | `>=7.0.0` | |
| `uuid` | `>=9.0.0` | |
| `ws` | `>=8.0.0` | Optional |
| `xss` | `>=1.0.0` | |

This package also depends on the following packages published to npm:

- `@pawells/nestjs-shared`
- `@pawells/nestjs-open-telemetry`
- `@pawells/nestjs-pyroscope`

These are installed automatically as direct dependencies.

---

## Versioning & Publishing

This package shares a single version with the workspace, managed by NX release (`projectsRelationship: "fixed"`). There are three publishing channels:

- **Production (`latest`)** — push a `v*` tag to GitHub after merging to `main`. Publishes the package and creates a GitHub Release.
- **Dev snapshot (`@dev`)** — triggered automatically on every push to a `development/X.Y` branch. Version format: `{base}-dev.{sha}` (e.g., `1.1.2-dev.abc1234`). Install with `yarn add @pawells/nestjs-graphql@dev`.
- **Pre-release (`@alpha`, `@beta`, `@rc`)** — triggered manually via GitHub Actions → Publish workflow → Run workflow. Choose a preid (`alpha`, `beta`, or `rc`) when prompted.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full release workflow, including the exact commands to bump and tag a production release.

---

## License

MIT
