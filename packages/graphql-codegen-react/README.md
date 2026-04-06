# @pawells/graphql-codegen-react

graphql-codegen plugin generating typed Apollo Client 4 hooks for React applications.

## Installation

```bash
yarn add -D @pawells/graphql-codegen-react
```

```bash
npm install --save-dev @pawells/graphql-codegen-react
```

## Requirements

Peer dependencies that must be present in your project:

- `@apollo/client >=4.0.0`
- `@graphql-codegen/typed-document-node >=5.0.0`
- `@graphql-codegen/typescript >=4.0.0`
- `@graphql-codegen/typescript-operations >=4.0.0`
- `graphql >=16.0.0`
- `react >=18.0.0`

This plugin requires three co-plugins to be configured in your `codegen.ts`: `typescript`, `typescript-operations`, and `typed-document-node`. If any are missing, codegen will throw an error listing all required plugins.

This plugin targets Apollo Client **4.x** and is not compatible with Apollo Client 3.x.

## Quick Start

Install the required co-plugins alongside this one:

```bash
yarn add -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typed-document-node
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
        '@pawells/graphql-codegen-react',
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

### Generated Query Hooks

For each `query` operation, the plugin generates a `useXxxQuery(variables?, options?)` hook.

```typescript
export function useGetUsersQuery(
  variables?: GetUsersQueryVariables,
  options?: QueryHookOptions<GetUsersQuery, GetUsersQueryVariables>,
): QueryResult<GetUsersQuery, GetUsersQueryVariables>
```

The `variables` parameter is **optional** when all variables in the operation are nullable or the operation defines no variables at all. When any variable is non-null, `variables` becomes required.

### Generated Mutation Hooks

For each `mutation` operation, the plugin generates a `useXxxMutation(options?)` hook.

```typescript
export function useCreateUserMutation(
  options?: MutationHookOptions<CreateUserMutation, CreateUserMutationVariables>,
): MutationTuple<CreateUserMutation, CreateUserMutationVariables>
```

Variables are passed inside `options` (via `options.variables`), not as a separate parameter. The hook returns a mutation tuple in the same shape as Apollo Client 4's `useMutation`.

### Generated Subscription Hooks

For each `subscription` operation, the plugin generates a `useXxxSubscription(variables?, options?)` hook with the same variables optionality rule as query hooks.

```typescript
export function useOnMessageAddedSubscription(
  variables?: OnMessageAddedSubscriptionVariables,
  options?: SubscriptionHookOptions<OnMessageAddedSubscription, OnMessageAddedSubscriptionVariables>,
): SubscriptionResult<OnMessageAddedSubscription>
```

### Generated useGraphQLClient Hook

The plugin always emits a `useGraphQLClient()` hook regardless of whether any operations are present. It returns the underlying `ApolloClient<NormalizedCacheObject>` via Apollo's `useApolloClient()` and is useful when you need direct client access.

```typescript
export function useGraphQLClient(): ApolloClient<NormalizedCacheObject>
```

## Variables Optionality Rule

A `variables` parameter on a generated hook is required only when at least one variable in the operation has a `NonNullType` definition (i.e., it is written without a `?` or a wrapping `null` union in the schema). If all variables are nullable or the operation defines no variables, the parameter becomes optional.

This means:

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
import { useGetUsersQuery, useCreateUserMutation } from './generated/graphql';

export function UserList() {
  const { data, loading, error } = useGetUsersQuery();
  const [createUser] = useCreateUserMutation();

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      {data?.users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

## Related Packages

- **[@pawells/graphql-codegen-ts](../graphql-codegen-ts)** — The Node.js/server-side equivalent of this plugin. Generates typed Apollo Client classes for use in TypeScript services rather than React hooks.
- **[@pawells/react-graphql](../react-graphql)** — React runtime companion providing Apollo Client setup, connection state management, and `GraphQLProvider`. Used alongside the hooks this plugin generates.
- **[@pawells/graphql-common](../graphql-common)** — Shared GraphQL primitive types and utilities consumed by the generated output.
- **[@pawells/nx-graphql](../nx-graphql)** — NX executors and builders for running GraphQL codegen as part of an NX pipeline.
- **[@pawells/nestjs-graphql](../nestjs-graphql)** — Server-side NestJS module providing Apollo Server integration, guards, interceptors, and DataLoaders.

## License

MIT
