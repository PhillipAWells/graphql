# GraphQL Common Primitives

[![GitHub Release](https://img.shields.io/github/v/release/PhillipAWells/graphql)](https://github.com/PhillipAWells/graphql/releases)
[![CI](https://github.com/PhillipAWells/graphql/actions/workflows/ci.yml/badge.svg)](https://github.com/PhillipAWells/graphql/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@pawells/graphql-common.svg?style=flat)](https://www.npmjs.com/package/@pawells/graphql-common)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/PhillipAWells/graphql/blob/main/LICENSE)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/PhillipAWells?style=social)](https://github.com/sponsors/PhillipAWells)

## Installation

```bash
yarn add @pawells/graphql-common
```

```bash
npm install @pawells/graphql-common
```

## Requirements

Peer dependencies that must be present in your project:

- `@apollo/client >=3.0.0`
- `graphql >=16.0.0`

Runtime dependencies bundled with this package: `async-mutex`, `graphql-subscriptions`, `graphql-type-json`.

## Quick Start

```ts
import { Connection, Edge, CursorUtils } from '@pawells/graphql-common';

function buildConnection<T extends { id: string }>(nodes: T[]): Connection<T> {
  const edges: Edge<T>[] = nodes.map((node) => ({
    node,
    cursor: CursorUtils.createCursor(node),
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
  };
}
```

## API

### Pagination

Object types for representing paged results and cached page state.

| Export | Description |
|---|---|
| `IPageInfo` | Interface: `Page`, `Length`, `Total` |
| `ICachedPageInfo` | Interface: extends `IPageInfo` with `MaxPage` |
| `ICachedRequest<T>` | Interface: a cached request keyed by `Id` with associated `Data: T` |
| `PageInfo` | GraphQL object type implementing `IPageInfo` |
| `CachedPageInfo` | GraphQL object type implementing `ICachedPageInfo` |
| `PageInput` | GraphQL input type for page/length arguments |
| `CachedPageInput` | GraphQL input type with optional cache `Id` |

**`GetPageEntries<T>(entries, page, length)`** — Slices an array to the requested page. Pages are 1-based. Returns an empty array when the page is out of bounds.

```ts
import { GetPageEntries } from '@pawells/graphql-common';

const page = GetPageEntries(allItems, 2, 10); // items 11–20
```

**`CacheGet<T>(id)`**, **`CacheSet<T>(entry)`**, **`CacheDelete(id)`** — Async functions that operate on a process-local in-memory cache protected by a mutex. There is no TTL enforcement at the cache layer; callers are responsible for expiry logic.

```ts
import { CacheGet, CacheSet, CacheDelete } from '@pawells/graphql-common';

await CacheSet({ Id: 'users:1', Data: user });
const cached = await CacheGet<User>('users:1');
await CacheDelete('users:1');
```

### Relay

Types and utilities for Relay-style cursor pagination.

| Export | Description |
|---|---|
| `RelayPageInfo` | `hasNextPage`, `hasPreviousPage`, `startCursor`, `endCursor` |
| `Edge<T>` | `node: T` and `cursor: string` |
| `Connection<T>` | `edges: Edge<T>[]` and `pageInfo: RelayPageInfo` |
| `CursorUtils` | Static helper class for cursor encoding and decoding |

**`CursorUtils` methods:**

- `encodeCursor(id, timestamp?)` — Encodes an id (and optional timestamp) to a base64 JSON string.
- `decodeCursor(cursor)` — Decodes a cursor string; throws on malformed input.
- `createCursor(node)` — Convenience wrapper that calls `encodeCursor` with `node.id`.

```ts
import { CursorUtils } from '@pawells/graphql-common';

const cursor = CursorUtils.encodeCursor('abc123');
const { id } = CursorUtils.decodeCursor(cursor);
```

### Sorting

| Export | Description |
|---|---|
| `SortDirection` | Enum: `Ascending`, `Descending` |
| `Sort<T>` | Recursive type mapping every property of `T` to `SortDirection` or a nested `Sort` |
| `SortProperty<T>` | Internal helper type used by `Sort<T>` |

```ts
import { Sort, SortDirection } from '@pawells/graphql-common';

const sort: Sort<User> = {
  name: SortDirection.Ascending,
  createdAt: SortDirection.Descending,
};
```

### Filters

Filter input types for building type-safe, composable query conditions. All filter inputs support logical operators (And/Or) for complex filter composition. Framework-agnostic design: ORM adapters (e.g., `@pawells/graphql-mongoose`) implement translation to native database queries.

**Filter Input Classes**

| Export | Operators | Description |
|---|---|---|
| `StringFilterInput` | Eq, Ne, In, Nin, Regex, RegexOptions, Exists, Lt, Lte, Gt, Gte | Filter string fields with equality, regex patterns, set membership, and lexicographic range comparisons |
| `NumberFilterInput` | Eq, Ne, In, Nin, Exists, Lt, Lte, Gt, Gte | Filter numeric fields with equality, set membership, and range comparisons |
| `BooleanFilterInput` | Eq, Ne, Exists | Filter boolean fields with equality and existence checks |
| `DateFilterInput` | Eq, Ne, Exists, Lt, Lte, Gt, Gte | Filter date/datetime fields with equality and temporal range comparisons |
| `ObjectIdFilterInput` | Eq, Ne, In, Nin, Exists | Filter MongoDB ObjectId fields (values are hex strings, coerced by ORM adapters) |
| `ArrayFilterInput<T>` | All, ElemMatch, Size, Exists | Filter array fields with element matching, length, and existence checks (generic type T determines element filter type) |

**Logical Operators**

All filter inputs support logical composition via `IFilterCondition<T>`:

| Operator | Type | Description |
|---|---|---|
| `And` | `IFilterCondition<T>[]` | All conditions must match |
| `Or` | `IFilterCondition<T>[]` | At least one condition must match |

**Type Composition**

- `IFilterCondition<T>` — Combines field-level filters (T) with logical operators (And/Or). Enables recursive composition for arbitrarily complex nested filter structures.
- `ILogicalFilter<T>` — Defines And/Or operators that accept arrays of nested `IFilterCondition<T>` values.
- `IFilterInputBase` — Marker interface satisfied by all filter input types, enabling type-safe generic composition.

**Implementation Notes**

Filter input types are plain TypeScript interfaces/DTOs without `@InputType()` decorators. They are framework-agnostic and intended for use with ORM adapters (such as `@pawells/graphql-mongoose`) that translate these filters to native database queries. These types are **not** automatically registered as GraphQL input types; framework integration handles GraphQL schema registration.

**Example: Complex Filter Composition**

```ts
import {
  StringFilterInput,
  NumberFilterInput,
  ArrayFilterInput,
  IFilterCondition,
} from '@pawells/graphql-common';

// Simple equality filter
const simpleFilter: IFilterCondition<StringFilterInput> = {
  Eq: 'John',
};

// Logical AND composition
const andFilter: IFilterCondition<StringFilterInput> = {
  And: [
    { Eq: 'John' },
    { Ne: 'Jane' },
  ],
};

// Logical OR composition
const orFilter: IFilterCondition<NumberFilterInput> = {
  Or: [
    { Gte: 18 },
    { Lte: 13 },
  ],
};

// Nested composition (complex query)
interface UserFilters {
  name: IFilterCondition<StringFilterInput>;
  age: IFilterCondition<NumberFilterInput>;
  tags: IFilterCondition<ArrayFilterInput<StringFilterInput>>;
}

const complexFilter: UserFilters = {
  name: {
    And: [
      { Regex: '^J' },
      { Ne: 'John' },
    ],
  },
  age: {
    And: [
      { Gte: 18 },
      { Lte: 65 },
    ],
  },
  tags: {
    Or: [
      { ElemMatch: { Eq: 'admin' } },
      { ElemMatch: { Eq: 'moderator' } },
    ],
  },
};
```

### Events

**`GraphQLEventHandler<TObject, TEvent>`** — A PubSub-backed event emitter designed for GraphQL subscriptions.

Constructor: `new GraphQLEventHandler(name: string, pubSub?: PubSubEngine)`

If `pubSub` is omitted, an internal `PubSub` instance from `graphql-subscriptions` is used.

| Method | Description |
|---|---|
| `GetAsyncIterator()` | Returns an async iterator for use in a subscription resolver |
| `Trigger(data)` | Publishes an event with the given data |
| `Subscribe(handler)` | Registers a callback; returns a subscription id |
| `Unsubscribe(id)` | Removes the callback registered under `id` |

```ts
import { GraphQLEventHandler } from '@pawells/graphql-common';

interface MessageEvent {
  text: string;
}

const messageHandler = new GraphQLEventHandler<Message, MessageEvent>('MESSAGE_CREATED');

// In a subscription resolver:
const subscription = {
  messageCreated: {
    subscribe: () => messageHandler.GetAsyncIterator(),
  },
};

// To publish from a mutation resolver:
await messageHandler.Trigger({ text: 'Hello' });
```

### Key-Value

| Export | Description |
|---|---|
| `KeyValuePair` | GraphQL object type with `Key: string` and `Value: unknown` |
| `KeyValuePairInput` | GraphQL input type with `Key: string` and `Value: unknown` |

```ts
import { KeyValuePair } from '@pawells/graphql-common';

const pair: KeyValuePair = { Key: 'theme', Value: 'dark' };
```

### Type Macros

Aliases over `ApolloQueryResult` and `FetchResult` that provide consistent naming in generated client code. Import these types to annotate query, mutation, and subscription return values without depending on Apollo internals directly.

| Export | Wraps |
|---|---|
| `QueryResult<T>` | `ApolloQueryResult<T>` |
| `QueryResultPromise<T>` | `Promise<ApolloQueryResult<T>>` |
| `QueryNullableResult<T>` | `ApolloQueryResult<T \| null>` |
| `QueryNullableResultPromise<T>` | `Promise<ApolloQueryResult<T \| null>>` |
| `MutationResult<T>` | `FetchResult<T>` |
| `MutationResultPromise<T>` | `Promise<FetchResult<T>>` |
| `MutationNullableResult<T>` | `FetchResult<T \| null>` |
| `MutationNullableResultPromise<T>` | `Promise<FetchResult<T \| null>>` |
| `SubscriptionResult<T>` | `FetchResult<T>` |
| `SubscriptionHandler<T>` | `(data: T) => void` |

```ts
import { QueryResultPromise, MutationResultPromise } from '@pawells/graphql-common';

async function fetchUser(id: string): QueryResultPromise<User> { ... }
async function updateUser(input: UpdateUserInput): MutationResultPromise<User> { ... }
```

## Related Packages

- **[@pawells/react-graphql](https://www.npmjs.com/package/@pawells/react-graphql)** — React runtime companion; Apollo Client setup, connection state, and `GraphQLProvider`. Consumes the types exported from this package.
- **[@pawells/graphql-codegen-ts](https://www.npmjs.com/package/@pawells/graphql-codegen-ts)** — TypeScript code generator that emits typed operations using the type macros from this package.
- **[@pawells/graphql-codegen-react](https://www.npmjs.com/package/@pawells/graphql-codegen-react)** — React hooks code generator; generated hooks use the type macros and relay types from this package.
- **[@pawells/nx-graphql](https://www.npmjs.com/package/@pawells/nx-graphql)** — NX executors and builders for GraphQL codegen pipelines.
- **[@pawells/nestjs-graphql](https://www.npmjs.com/package/@pawells/nestjs-graphql)** — Server-side NestJS module providing Apollo Server integration, guards, interceptors, and DataLoaders.

## License

MIT
