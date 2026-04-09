# GraphQL Codegen — TypeScript

[![GitHub Release](https://img.shields.io/github/v/release/PhillipAWells/graphql)](https://github.com/PhillipAWells/graphql/releases)
[![CI](https://github.com/PhillipAWells/graphql/actions/workflows/ci.yml/badge.svg)](https://github.com/PhillipAWells/graphql/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@pawells/graphql-codegen-ts.svg?style=flat)](https://www.npmjs.com/package/@pawells/graphql-codegen-ts)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/PhillipAWells/graphql/blob/main/LICENSE)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/PhillipAWells?style=social)](https://github.com/sponsors/PhillipAWells)

## Installation

```bash
yarn add -D @pawells/graphql-codegen-ts
```

```bash
npm install --save-dev @pawells/graphql-codegen-ts
```

## Requirements

Peer dependencies that must be present in your project:

- `@apollo/client >=3.0.0`
- `@graphql-codegen/typed-document-node >=5.0.0`
- `@graphql-codegen/typescript >=4.0.0`
- `@graphql-codegen/typescript-apollo-client-helpers >=3.0.0`
- `@graphql-codegen/typescript-operations >=4.0.0`
- `graphql >=16.0.0`

This plugin requires **four co-plugins** to be configured in your `codegen.ts`: `typescript`, `typescript-operations`, `typed-document-node`, and `typescript-apollo-client-helpers`. If any are missing, codegen will throw an error listing all required plugins.

This plugin targets Apollo Client **4.x**.

## Quick Start

Install the required co-plugins alongside this one:

```bash
yarn add -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typed-document-node @graphql-codegen/typescript-apollo-client-helpers
```

Then create a `codegen.ts` at the root of your project:

```typescript
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'schema.graphql',
  documents: 'src/**/*.graphql',
  generates: {
    'src/generated/graphql.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typed-document-node',
        'typescript-apollo-client-helpers',
        '@pawells/graphql-codegen-ts',
      ],
    },
  },
};

export default config;
```

Run codegen to generate the output file:

```bash
yarn graphql-codegen
```

## Configuration

`IRawPluginConfig` is currently an empty interface — the plugin has no configuration options at this time but is designed for extensibility in future releases.

## API

### GraphQLClient Class

A pre-configured Apollo Client wrapper used in the generated output. It can also be instantiated directly when you need full control over the connection.

```typescript
new GraphQLClient(options: IGraphQLClientOptions)
```

**`IGraphQLClientOptions` fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `Name` | `string` | yes | Client label for identification |
| `HTTP_URI` | `string` | yes | HTTP endpoint URI |
| `WS_URI` | `string` | yes | WebSocket endpoint URI |
| `Token` | `string` | no | Static bearer token; use when the token is fixed for the lifetime of the client |
| `TokenFunction` | `() => Promise<string>` | no | Async function returning a bearer token; use when the token changes per request |
| `UseTokenFunction` | `boolean` | no | When `true`, calls `TokenFunction()` for each request instead of using `Token` |
| `LogGraphQLErrors` | `boolean` | no | Logs GraphQL errors to `console.error` |
| `LogNetworkErrors` | `boolean` | no | Logs network errors to `console.error` |

**Public members:**

- `Apollo: ApolloClient<NormalizedCacheObject>` — the underlying Apollo Client instance
- `Name: string`, `HTTP_URI: string`, `WS_URI: string` — the values supplied in the constructor options
- `Reset(): void` — calls `apollo.resetStore()` then `apollo.stop()`; errors are silently ignored
- `OnConnecting`, `OnOpened`, `OnConnected`, `OnClosed`, `OnError` — event accessors returning typed event objects from `strongly-typed-events`

**Connection behavior:**

- HTTP and WebSocket operations are split via an Apollo split link
- Auth link injects the bearer token from `Token` or `TokenFunction()` on every request
- Automatic retries on network errors: up to 10 attempts, initial delay 1 s, max 10 s, with jitter; GraphQL errors are not retried
- WebSocket includes a ping/pong heartbeat; the connection is closed with code 4408 if no pong is received within 5 seconds
- All operations default to `fetchPolicy: 'no-cache'`

### Generated Classes

The plugin generates four classes in the output file.

**`ApolloQueries`** — one async method per `query` operation:

```typescript
public async GetUsers(variables?: GetUsersQueryVariables): Promise<ApolloQueryResult<GetUsersQuery>>
```

Throws if `result.errors` is present on the response.

**`ApolloMutations`** — one async method per `mutation` operation:

```typescript
public async CreateUser(variables: CreateUserMutationVariables): Promise<FetchResult<CreateUserMutation>>
```

Throws on errors.

**`ApolloSubscriptions`** — one async method per `subscription` operation:

```typescript
public async OnUserCreated(
  variables?: OnUserCreatedSubscriptionVariables,
  handler: OnUserCreatedEventHandler,
): Promise<ZenObservable.Subscription>
```

**`ApolloWrapper`** — the main entry point that composes the three classes above:

```typescript
export class ApolloWrapper {
  Handle: GraphQLClient;
  Queries: ApolloQueries;
  Mutations: ApolloMutations;
  Subscriptions: ApolloSubscriptions;
  get Apollo(): ApolloClient<NormalizedCacheObject>;
  constructor(options: GraphQLClientOptions)
}
```

### Variables Optionality Rule

A `variables` parameter on a generated method is required only when at least one variable in the operation has a `NonNullType` definition (written as `$id: ID!` in the schema). If all variables are nullable or the operation defines no variables, the parameter is optional.

```graphql
# variables is required — $id is non-null
query GetUser($id: ID!) { ... }

# variables is optional — $filter is nullable
query ListUsers($filter: UserFilter) { ... }

# variables is omitted entirely — no variables defined
query GetCurrentUser { ... }
```

## Usage Example

```typescript
import { ApolloWrapper } from './generated/graphql';

async function main() {
  const client = new ApolloWrapper({
    Name: 'api-client',
    HTTP_URI: 'https://api.example.com/graphql',
    WS_URI: 'wss://api.example.com/graphql',
    Token: process.env.API_TOKEN,
    LogGraphQLErrors: true,
  });

  // Execute a query
  const users = await client.Queries.GetUsers();
  console.log(users.data);

  // Execute a mutation
  const result = await client.Mutations.CreateUser({ name: 'Alice' });

  // Subscribe to events
  const subscription = await client.Subscriptions.OnUserCreated(
    {},
    (result) => {
      console.log('New user:', result.data);
    },
  );

  // Cleanup
  client.Handle.Reset();
}

main().catch(console.error);
```

## Known Limitations

### IsBrowser Option

The `IsBrowser` option in `IGraphQLClientOptions` is accepted for forward compatibility but is currently unused. It was intended for runtime environment detection to conditionally enable browser-specific features (such as automatic cookie handling or localStorage integration).

```typescript
new GraphQLClient({
  Name: 'my-client',
  HTTP_URI: 'http://localhost:4000/graphql',
  WS_URI: 'ws://localhost:4000/graphql',
  IsBrowser: true, // Currently ignored, but accepted
});
```

**Status:** Reserved for future use. This option will be implemented in a future release to enable environment-specific behavior. For now, it has no effect and can be safely omitted.

## Related Packages

- **[@pawells/graphql-codegen-react](https://www.npmjs.com/package/@pawells/graphql-codegen-react)** — The React equivalent of this plugin. Generates typed Apollo Client hooks for React applications instead of class wrappers.
- **[@pawells/react-graphql](https://www.npmjs.com/package/@pawells/react-graphql)** — React runtime companion providing Apollo Client setup, connection state management, and `GraphQLProvider`.
- **[@pawells/graphql-common](https://www.npmjs.com/package/@pawells/graphql-common)** — Shared GraphQL primitive types and utilities consumed by the generated output.
- **[@pawells/nx-graphql](https://www.npmjs.com/package/@pawells/nx-graphql)** — NX executors and builders for running GraphQL codegen as part of an NX pipeline.
- **[@pawells/nestjs-graphql](https://www.npmjs.com/package/@pawells/nestjs-graphql)** — Server-side NestJS module providing Apollo Server integration, guards, interceptors, and DataLoaders.

## License

MIT
