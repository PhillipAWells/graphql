# NX GraphQL Plugin

[![GitHub Release](https://img.shields.io/github/v/release/PhillipAWells/graphql)](https://github.com/PhillipAWells/graphql/releases)
[![CI](https://github.com/PhillipAWells/graphql/actions/workflows/ci.yml/badge.svg)](https://github.com/PhillipAWells/graphql/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@pawells/nx-graphql.svg?style=flat)](https://www.npmjs.com/package/@pawells/nx-graphql)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/PhillipAWells/graphql/blob/main/LICENSE)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/PhillipAWells?style=social)](https://github.com/sponsors/PhillipAWells)

## Installation

```bash
yarn add -D @pawells/nx-graphql
```

```bash
npm install --save-dev @pawells/nx-graphql
```

## Requirements

Peer dependencies that must be present in your project:

- `@nx/devkit >=21.0.0`
- `@nestjs/graphql >=12.0.0`
- `@graphql-codegen/cli >=5.0.0`

The `@pawells/graphql-codegen-ts` package is an optional peer dependency. It is only required when using the `codegen` executor with the default `typescript` target and its default plugin list. If you supply a custom `plugins` array that does not include `@pawells/graphql-codegen-ts`, this dependency is not needed.

## Executors

The plugin registers two NX executors. Both are configured as targets in `project.json`.

### `build-schema`

Builds a `.graphql` SDL schema file from NestJS resolver classes.

**Usage in `project.json`:**

```json
{
  "targets": {
    "build-schema": {
      "executor": "@pawells/nx-graphql:build-schema",
      "options": {
        "schemaFile": "schema.graphql",
        "resolversModule": "src/resolvers"
      }
    }
  }
}
```

**Options (`IBuildSchemaExecutorSchema`):**

| Option | Type | Required | Description |
|---|---|---|---|
| `schemaFile` | `string` | yes | Output path for the `.graphql` schema file, relative to the workspace root |
| `resolversModule` | `string` | yes | Path to the module that exports the `GraphQLSchema` array of resolver classes |
| `project` | `string` | no | NX project name; defaults to the current project |

**Resolver module convention:**

The module at `resolversModule` must export a named export called exactly `GraphQLSchema` (case-sensitive) containing an array of NestJS resolver classes:

```typescript
// src/resolvers.ts
import { UserResolver } from './user.resolver';
import { PostResolver } from './post.resolver';

export const GraphQLSchema = [UserResolver, PostResolver];
```

The executor performs the following steps:

1. Resolves the module path and validates it exists (checks both `.ts` and `.js` extensions).
2. Dynamically imports the module.
3. Reads the `GraphQLSchema` named export and verifies it is an array.
4. Uses NestJS's `GraphQLSchemaBuilderModule` and `GraphQLSchemaFactory` to build the schema from the resolver classes.
5. Serialises the schema to SDL using `graphql`'s `printSchema()`.
6. Writes the output to `schemaFile`, creating any intermediate directories as needed.

The executor returns `{ success: boolean }` and returns `false` on any error rather than throwing.

**Run the executor:**

```bash
nx run my-api:build-schema
# or
yarn nx build-schema --project=my-api
```

### `codegen`

Runs graphql-codegen with a preset plugin stack. The default preset targets Node.js/TypeScript and includes `@pawells/graphql-codegen-ts`.

**Usage in `project.json`:**

```json
{
  "targets": {
    "codegen": {
      "executor": "@pawells/nx-graphql:codegen",
      "options": {
        "schemaFile": "schema.graphql",
        "documentsGlob": "src/**/*.graphql",
        "outputFile": "src/generated/graphql.ts",
        "target": "typescript"
      }
    }
  }
}
```

**Options (`ICodegenExecutorSchema`):**

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `schemaFile` | `string` | yes | — | Input `.graphql` schema file path |
| `documentsGlob` | `string` | yes | — | Glob pattern for `.graphql` operation files (e.g. `src/**/*.graphql`) |
| `outputFile` | `string` | yes | — | Output `.ts` file path |
| `target` | `'typescript'` | no | `'typescript'` | Target platform; currently only `typescript` is supported |
| `plugins` | `string[]` | no | (see below) | Override the default plugin list |
| `config` | `Record<string, unknown>` | no | (see below) | Merged into the default codegen config |
| `watch` | `boolean` | no | `false` | Run in watch mode for development |

**Default plugin list** (for `target: 'typescript'`):

1. `typescript`
2. `typescript-operations`
3. `typed-document-node`
4. `typescript-apollo-client-helpers`
5. `@pawells/graphql-codegen-ts`

**Default config:**

```json
{
  "namingConvention": "keep",
  "immutableTypes": false
}
```

The executor performs the following steps:

1. Merges the default plugins and config with any supplied overrides.
2. Prepends an `add` plugin that inserts `/* eslint-disable */` at the top of the output file.
3. Builds a graphql-codegen config object and calls `@graphql-codegen/cli`'s `generate()` function.
4. In watch mode, keeps the process running and regenerates output when source files change.

The executor returns `{ success: boolean }` and returns `false` on any error rather than throwing.

**Run the executor:**

```bash
nx run my-api:codegen
# or watch mode for development
nx run my-api:codegen --watch
```

**Override the plugin list:**

Pass a custom `plugins` array to replace the default stack entirely. For example, to use the React hooks plugin instead of the Node.js class plugin:

```json
{
  "targets": {
    "codegen": {
      "executor": "@pawells/nx-graphql:codegen",
      "options": {
        "schemaFile": "schema.graphql",
        "documentsGlob": "src/**/*.graphql",
        "outputFile": "src/generated/graphql.ts",
        "plugins": [
          "typescript",
          "typescript-operations",
          "typed-document-node",
          "@pawells/graphql-codegen-react"
        ]
      }
    }
  }
}
```

## Workflow Example

A typical project lays out its files as follows:

```
my-api/
├── project.json
├── src/
│   ├── resolvers.ts          # export const GraphQLSchema = [...]
│   ├── schema.graphql        # generated by build-schema
│   ├── operations/
│   │   ├── get-user.graphql
│   │   └── create-user.graphql
│   └── generated/
│       └── graphql.ts        # generated by codegen
```

**Typical workflow:**

```bash
# 1. Build the SDL schema from NestJS resolvers
nx run my-api:build-schema

# 2. Generate typed client code from GraphQL operations
nx run my-api:codegen

# 3. Watch mode for active development
nx run my-api:codegen --watch
```

The two targets can also be chained in `project.json` using NX's `dependsOn` field so that `codegen` always runs after `build-schema`:

```json
{
  "targets": {
    "build-schema": {
      "executor": "@pawells/nx-graphql:build-schema",
      "options": {
        "schemaFile": "schema.graphql",
        "resolversModule": "src/resolvers"
      }
    },
    "codegen": {
      "executor": "@pawells/nx-graphql:codegen",
      "dependsOn": ["build-schema"],
      "options": {
        "schemaFile": "schema.graphql",
        "documentsGlob": "src/operations/**/*.graphql",
        "outputFile": "src/generated/graphql.ts"
      }
    }
  }
}
```

With this configuration, running `nx run my-api:codegen` automatically builds the schema first.

## Related Packages

- **[@pawells/nestjs-graphql](https://www.npmjs.com/package/@pawells/nestjs-graphql)** — Server-side NestJS module providing Apollo Server integration, guards, interceptors, and DataLoaders. The resolver classes consumed by `build-schema` typically live in a project that depends on this package.
- **[@pawells/graphql-codegen-ts](https://www.npmjs.com/package/@pawells/graphql-codegen-ts)** — The default codegen plugin for the `typescript` target. Generates typed Apollo Client classes (`ApolloQueries`, `ApolloMutations`, `ApolloSubscriptions`, and `ApolloWrapper`) for Node.js/TypeScript applications.
- **[@pawells/graphql-codegen-react](https://www.npmjs.com/package/@pawells/graphql-codegen-react)** — Alternative codegen plugin for React applications. Use this in the `plugins` override when targeting a React front end.
- **[@pawells/react-graphql](https://www.npmjs.com/package/@pawells/react-graphql)** — React runtime companion providing Apollo Client setup, connection state management, and `GraphQLProvider`. Consumed by the output generated with `@pawells/graphql-codegen-react`.
- **[@pawells/graphql-common](https://www.npmjs.com/package/@pawells/graphql-common)** — Shared GraphQL primitive types and utilities consumed by the generated output.

## License

MIT
