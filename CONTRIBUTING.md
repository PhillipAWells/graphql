# Contributing to `graphql`

Welcome, and thank you for your interest in contributing. This guide covers everything you need to get the workspace running, make changes, and open a pull request. For org-wide conventions that apply across all @pawells repositories, see the [@pawells standards documentation](https://github.com/PhillipAWells/Personal-Projects/tree/main/docs).

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Getting started](#2-getting-started)
3. [Repository structure](#3-repository-structure)
4. [Development workflow](#4-development-workflow)
5. [Adding a new package](#5-adding-a-new-package)
6. [Commit message format](#6-commit-message-format)
7. [Pull request process](#7-pull-request-process)
8. [Release process](#8-release-process)

---

## 1. Prerequisites

Install the following tools before running any setup commands.

- **Node.js 22 or later** — [nodejs.org](https://nodejs.org/)
- **Corepack** — ships with Node.js 22; activate it once per machine:
  ```bash
  corepack enable
  ```
- **Git**

> Yarn is managed automatically by Corepack. Do not install it separately.

---

## 2. Getting started

1. Fork the repository on GitHub, then clone your fork:
   ```bash
   git clone https://github.com/<your-username>/graphql.git
   cd graphql
   ```

2. Enable Corepack if you have not already:
   ```bash
   corepack enable
   ```

3. Install dependencies (Corepack picks up the correct Yarn version from `package.json`):
   ```bash
   yarn install
   ```

4. Verify the workspace builds:
   ```bash
   yarn build
   ```

5. Verify all tests pass:
   ```bash
   yarn test
   ```

If both commands exit cleanly, the workspace is ready for development.

---

## 3. Repository structure

```
graphql/
├── packages/                  # Sub-packages — one directory per publishable package
│   └── nestjs-graphql/        # NestJS GraphQL module with Redis cache, DataLoaders, subscriptions
│       ├── src/               # TypeScript source; src/index.ts is the public API barrel
│       ├── build/             # Compiled output (gitignored; do not commit)
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.build.json
│       ├── tsconfig.eslint.json
│       └── vitest.config.ts
├── .github/                   # GitHub Actions workflows and Dependabot config
├── .husky/                    # Pre-commit hooks
├── nx.json                    # NX workspace configuration
├── tsconfig.base.json         # Shared TypeScript base configuration
├── eslint.config.mjs          # Shared ESLint flat config
└── package.json               # Workspace root
```

This monorepo contains the following packages:

| Package | Description |
|---|---|
| `@pawells/nestjs-graphql` | NestJS GraphQL module with Apollo Server 5.x, Redis caching, DataLoaders, WebSocket subscriptions, and security primitives |

---

## 4. Development workflow

### Running commands

Most commands are available both at the workspace root (runs across all packages) and per-package via NX.

| Task | Workspace-wide | Single package |
|---|---|---|
| Full pipeline | `yarn pipeline` | `cd packages/nestjs-graphql && yarn pipeline` |
| Build | `yarn build` | `yarn nx run nestjs-graphql:build` |
| Test | `yarn test` | `yarn nx run nestjs-graphql:test` |
| Test with coverage | — | `cd packages/nestjs-graphql && yarn test:coverage` |
| Type-check | `yarn typecheck` | `yarn nx run nestjs-graphql:typecheck` |
| Lint | `yarn lint` | `yarn nx run nestjs-graphql:lint` |
| Lint and fix | `yarn lint:fix` | — |

`yarn test:coverage` is available per-package only; it is not available at the workspace root.

### Watching for changes

Run Vitest in watch mode while developing the package:

```bash
yarn nx run nestjs-graphql:test --watch
```

### Visualizing the dependency graph

NX can generate an interactive graph of the packages and their dependencies:

```bash
yarn nx graph
```

### NX cache

NX caches the `build`, `test`, `lint`, and `typecheck` targets. Bypass the cache for a clean run:

```bash
yarn pipeline --skip-nx-cache
yarn test --skip-nx-cache
```

---

## 5. Adding a new package

Follow these steps to scaffold a new sub-package.

### Step 1 — Create the package directory

```bash
mkdir -p packages/<new-package-name>/src
```

### Step 2 — Create `package.json`

```json
{
  "name": "@pawells/<new-package-name>",
  "version": "0.1.0",
  "license": "MIT",
  "type": "module",
  "engines": {
    "node": ">=22.0.0"
  },
  "files": [
    "build",
    "README.md",
    "LICENSE"
  ],
  "exports": {
    ".": {
      "types": "./build/index.d.ts",
      "import": "./build/index.js"
    }
  },
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src",
    "lint:fix": "eslint src --fix",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "pipeline": "yarn typecheck && yarn lint && yarn test && yarn build"
  }
}
```

### Step 3 — Create `src/index.ts`

This file is the sole public API barrel. Export only what consumers should use.

```typescript
// packages/<new-package-name>/src/index.ts
export { } // replace with your public exports
```

### Step 4 — Create `tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "build",
    "rootDir": "src",
    "noEmit": true
  },
  "include": ["src/**/*"]
}
```

### Step 5 — Create `tsconfig.build.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts", "src/**/__tests__/**"]
}
```

### Step 6 — Create `tsconfig.eslint.json`

```json
{
  "extends": "./tsconfig.json",
  "include": ["src/**/*.ts", "*.config.ts"]
}
```

### Step 7 — Create `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: false,
		environment: 'node',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 80,
				statements: 80,
			},
		},
	},
});
```

### Step 8 — Link the package in the workspace

```bash
yarn install
```

Yarn will pick up the new package and link it in the workspace. Verify it appears in the project graph:

```bash
yarn nx graph
```

---

## 6. Commit message format

All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <description>
```

The scope is the affected package name without the `@pawells/` prefix (for example, `nestjs-graphql`). Omit the scope only for changes that are not specific to any single package.

### Type reference

| Type | When to use |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `docs` | Documentation changes only |
| `chore` | Maintenance tasks, dependency updates, project config |
| `build` | Changes to the build system or output |
| `ci` | Changes to CI configuration or workflows |
| `perf` | Performance improvements |

### Breaking changes

Append a `!` after the type/scope and include a `BREAKING CHANGE:` footer:

```
feat(nestjs-graphql)!: remove deprecated WebSocket auth fallback

BREAKING CHANGE: The insecure WebSocket authentication fallback has been removed.
All WebSocket connections now require JwtService. Without it, all connections fail closed.
```

### Pre-commit enforcement

The pre-commit hook runs two checks before every commit:

1. **Dependency version guard** — rejects commits that introduce non-semver dependency versions (`file:`, `workspace:`, `git+`, etc.).
2. **Typecheck and lint** — runs `yarn typecheck && yarn lint` across the workspace.

Fix any reported issues and try again. Do not bypass the hooks.

---

## 7. Pull request process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make your changes. Commit using the [Conventional Commits format](#6-commit-message-format).

3. Open a pull request. **The PR title must itself be a valid Conventional Commits message** — for example:
   ```
   feat(nestjs-graphql): add structured metadata support
   ```
   The PR title becomes the squash commit message on `main`. It will appear in the changelog and release notes.

4. Ensure all CI checks pass (typecheck, lint, test, build).

5. Request a review from a maintainer. Address any review comments before re-requesting.

6. A maintainer will squash-merge the PR when it is approved and CI is green.

> Direct commits to `main` are not permitted. All changes must go through a pull request.

---

## 8. Release process

Releases are managed by maintainers. Contributors do not need to create releases or version bumps.

All packages share a single version managed by NX release (`projectsRelationship: "fixed"` in `nx.json`). There are three publishing channels:

- **Production (`latest`)** — push a `v*` tag to GitHub after merging to `main`.
- **Dev snapshot (`@dev`)** — triggered automatically on every push to a `development/X.Y` branch.
- **Pre-release (`@alpha`, `@beta`, `@rc`)** — triggered manually via GitHub Actions → Publish workflow.

For the full release workflow including exact commands, see the `CONTRIBUTING.md` steps:

```bash
# On your development branch — bump the version
nx release version patch   # or minor / major

# Open a PR and merge to main.

# On main after the merge — create and push the tag
git tag v$(node -p "require('./packages/nestjs-graphql/package.json').version")
git push --tags
```

For org-wide versioning standards, see [04-ci-cd-and-publishing.md](https://github.com/PhillipAWells/Personal-Projects/blob/main/docs/04-ci-cd-and-publishing.md).
