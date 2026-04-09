# @pawells/graphql-mongoose

[![GitHub Release](https://img.shields.io/github/v/release/PhillipAWells/graphql)](https://github.com/PhillipAWells/graphql/releases)
[![CI](https://github.com/PhillipAWells/graphql/actions/workflows/ci.yml/badge.svg)](https://github.com/PhillipAWells/graphql/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@pawells/graphql-mongoose.svg?style=flat)](https://www.npmjs.com/package/@pawells/graphql-mongoose)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/PhillipAWells/graphql/blob/main/LICENSE)

GraphQL-to-Mongoose filter builder — translates GraphQL filter inputs to strongly typed Mongoose `FilterQuery` objects. Accepts structured input from any GraphQL client and produces a ready-to-use MongoDB query with field remapping, type coercion, and allowlist enforcement built in.

## Installation

```bash
npm install @pawells/graphql-mongoose mongoose @pawells/graphql-common
```

```bash
yarn add @pawells/graphql-mongoose mongoose @pawells/graphql-common
```

**Peer dependencies** that must be present in your project:

- `mongoose >=8.0.0`
- `graphql >=16.0.0`
- `@pawells/graphql-common >=2.0.0`

## Quick Start

```typescript
import { BuildMongooseFilter, TFilterSchema } from '@pawells/graphql-mongoose';
import { FilterQuery } from 'mongoose';

interface IUser {
	_id: string;
	name: string;
	age: number;
}

interface IUserFilterInput {
	Name?: { Eq?: string };
	Age?: { Gte?: number; Lte?: number };
}

const userFilterSchema: TFilterSchema<IUserFilterInput> = {
	Name: { MongoField: 'name', Type: 'string' },
	Age: { MongoField: 'age', Type: 'number' },
};

const mongoFilter: FilterQuery<IUser> = BuildMongooseFilter<IUser>(
	{ Name: { Eq: 'Alice' }, Age: { Gte: 18 } },
	userFilterSchema,
);
// → { name: { $eq: 'Alice' }, age: { $gte: 18 } }

const users = await UserModel.find(mongoFilter);
```

## API Reference

### `BuildMongooseFilter<TDoc>(filter, schema): FilterQuery<TDoc>`

Translates a GraphQL filter input object into a Mongoose `FilterQuery`. Returns `{}` when `filter` is `null` or `undefined`.

- `filter` — The GraphQL filter input object, or `null`/`undefined`.
- `schema` — A `TFilterSchema` that declares which fields are allowed and how they map to MongoDB.
- Returns a `FilterQuery<TDoc>` ready to pass to `.find()`, `.findOne()`, or `.countDocuments()`.

Unknown fields in `filter` that are absent from `schema` are silently dropped. Logical operators (`And`, `Or`) are reserved keys and are not validated against the schema.

### `BuildMongooseSubscriptionFilter<TDoc>(filter, schema): (doc: TDoc) => boolean`

Creates an in-memory predicate function from a GraphQL filter input. Used for server-side subscription filtering so subscribers only receive payloads that match their criteria. Returns a function that always accepts all documents when `filter` is `null` or `undefined`.

- `filter` — The GraphQL filter input object, or `null`/`undefined`.
- `schema` — A `TFilterSchema` defining field mappings and types.
- Returns `(doc: TDoc) => boolean`.

Supports all scalar, array, and logical operators in-memory. See [Supported Operators](#supported-operators) for the full list.

> **Note on ObjectId equality in subscriptions:** `BuildMongooseSubscriptionFilter` coerces ObjectId strings to `Types.ObjectId` instances, but JavaScript's `===` comparison cannot match two separate `ObjectId` instances by value. In-memory ObjectId equality checks in subscription filters are therefore unreliable. For ObjectId filtering, prefer using `BuildMongooseFilter` against MongoDB directly.

### `TFilterSchema<TInput>`

A mapped type that declares the allowlist for filter translation. Each key must match a field in `TInput` and map to an `IFieldDescriptor`.

```typescript
type TFilterSchema<TInput> = {
	[K in keyof TInput]: IFieldDescriptor;
};
```

### `IFieldDescriptor`

Describes a single field in the filter schema.

```typescript
interface IFieldDescriptor {
	MongoField: string; // The MongoDB document field name
	Type: 'string' | 'number' | 'boolean' | 'date' | 'objectId' | 'array';
}
```

## Resolver Pattern

The following example shows a complete NestJS resolver. The filter input type is a plain TypeScript interface here; see [TypeScript Integration](#typescript-integration) for how to wire this into NestJS `@InputType()` classes.

```typescript
import { Resolver, Query, Args } from '@nestjs/graphql';
import { BuildMongooseFilter, TFilterSchema } from '@pawells/graphql-mongoose';
import { FilterQuery } from 'mongoose';

// Your Mongoose document type
interface IUser {
	_id: string;
	name: string;
	email: string;
	age: number;
}

// GraphQL filter input shape (matches your @InputType class fields)
interface IUserFilterInput {
	Name?: { Eq?: string; Regex?: string; RegexOptions?: string };
	Email?: { Eq?: string };
	Age?: { Gte?: number; Lte?: number };
}

// Schema: maps GraphQL field names → MongoDB field names + types
const UserFilterSchema: TFilterSchema<IUserFilterInput> = {
	Name: { MongoField: 'name', Type: 'string' },
	Email: { MongoField: 'email', Type: 'string' },
	Age: { MongoField: 'age', Type: 'number' },
};

@Resolver()
export class UserResolver {
	constructor(private readonly userService: UserService) {}

	@Query(() => [User])
	async users(
		@Args('filter', { nullable: true }) filter?: IUserFilterInput,
	): Promise<IUser[]> {
		const mongoFilter: FilterQuery<IUser> = BuildMongooseFilter<IUser>(
			filter as Record<string, unknown> | undefined,
			UserFilterSchema,
		);
		return this.userService.find(mongoFilter);
	}
}
```

NestJS `@InputType()` classes must be created in your application and use `@pawells/graphql-common` scalar filter types as their field types. See [TypeScript Integration](#typescript-integration) and `packages/graphql-common/src/filter/FILTER_DESIGN.md` for the recommended pattern.

## Subscription Pattern

`BuildMongooseSubscriptionFilter` returns a predicate function for use in the `filter` option of NestJS `@Subscription()`.

```typescript
import { Resolver, Subscription, Args } from '@nestjs/graphql';
import { BuildMongooseSubscriptionFilter, TFilterSchema } from '@pawells/graphql-mongoose';

interface IOrder {
	_id: string;
	status: string;
	customerId: string;
	totalAmount: number;
}

interface IOrderFilterInput {
	Status?: { Eq?: string };
	CustomerId?: { Eq?: string };
	TotalAmount?: { Gte?: number; Lte?: number };
}

interface IOrderUpdatePayload {
	orderUpdated: IOrder;
}

const OrderFilterSchema: TFilterSchema<IOrderFilterInput> = {
	Status: { MongoField: 'status', Type: 'string' },
	CustomerId: { MongoField: 'customerId', Type: 'string' },
	TotalAmount: { MongoField: 'totalAmount', Type: 'number' },
};

@Resolver()
export class OrderResolver {
	@Subscription(() => Order, {
		filter: (
			payload: IOrderUpdatePayload,
			args: { filter?: IOrderFilterInput },
		): boolean => {
			const predicate = BuildMongooseSubscriptionFilter<IOrder>(
				args.filter as Record<string, unknown> | undefined,
				OrderFilterSchema,
			);
			return predicate(payload.orderUpdated);
		},
		resolve: (payload: IOrderUpdatePayload): IOrder => payload.orderUpdated,
	})
	orderUpdated(
		@Args('filter', { nullable: true }) _filter?: IOrderFilterInput,
	): AsyncIterator<IOrderUpdatePayload> {
		return this.orderService.subscribeToUpdates();
	}
}
```

The predicate runs entirely in memory on the server for each event before the payload is sent to the subscriber. Subscriptions without a `filter` argument receive all events.

## Field Mapping

The `MongoField` property in each `IFieldDescriptor` maps the GraphQL input field name to the actual MongoDB document field name. This decouples your GraphQL schema from your database schema.

**Common use case — remapping `id` to `_id`:**

```typescript
interface IUserFilterInput {
	Id?: { Eq?: string };
}

const schema: TFilterSchema<IUserFilterInput> = {
	Id: { MongoField: '_id', Type: 'objectId' },
};

BuildMongooseFilter({ Id: { Eq: '507f1f77bcf86cd799439011' } }, schema);
// → { _id: { $eq: ObjectId('507f1f77bcf86cd799439011') } }
```

When `Type` is `'objectId'`, string values are automatically coerced to `Types.ObjectId` instances before the query is built. This coercion applies to all scalar operators (`Eq`, `Ne`, `In`, `Nin`).

## Supported Operators

### Scalar Operators

| GraphQL Operator | MongoDB Operator | Applies to |
|---|---|---|
| `Eq` | `$eq` | All scalar types |
| `Ne` | `$ne` | All scalar types |
| `In` | `$in` | All scalar types |
| `Nin` | `$nin` | All scalar types |
| `Lt` | `$lt` | `number`, `date`, `string` |
| `Lte` | `$lte` | `number`, `date`, `string` |
| `Gt` | `$gt` | `number`, `date`, `string` |
| `Gte` | `$gte` | `number`, `date`, `string` |
| `Exists` | `$exists` | All types |
| `Regex` | `$regex` | `string` |
| `RegexOptions` | (combined with `Regex`) | `string` |

When both `Regex` and `RegexOptions` are present, they are compiled into a single `RegExp` instance (e.g., `{ Regex: '^foo', RegexOptions: 'i' }` → `$regex: /^foo/i`). If only `Regex` is provided, the string pattern is used as-is.

### Array Operators

These operators are only valid for fields declared with `Type: 'array'`.

| GraphQL Operator | MongoDB Operator | Description |
|---|---|---|
| `All` | `$all` | Array contains all specified elements |
| `Size` | `$size` | Array length equals the specified value |
| `ElemMatch` | `$elemMatch` | At least one array element matches the sub-filter |

### Logical Operators

Logical operators are supported at the top level of the filter input and can be nested to arbitrary depth.

| GraphQL Operator | MongoDB Operator | Description |
|---|---|---|
| `And` | `$and` | All conditions in the array must match |
| `Or` | `$or` | At least one condition in the array must match |

```typescript
// Nested logical operators
BuildMongooseFilter(
	{
		Or: [
			{ And: [{ Age: { Gte: 18 } }, { Age: { Lte: 65 } }] },
			{ Status: { Eq: 'exempt' } },
		],
	},
	schema,
);
// → { $or: [{ $and: [{ age: { $gte: 18 } }, { age: { $lte: 65 } }] }, { status: { $eq: 'exempt' } }] }
```

## Null Handling

Fields set to `undefined` in the input are skipped entirely and produce no output. An explicit `null` value on an operator, however, is passed through to MongoDB and will match documents where that field is `null`.

```typescript
// Skipped — no Name field in the input
BuildMongooseFilter({ Age: { Eq: 30 } }, schema);
// → { age: { $eq: 30 } }

// Explicit null — matches documents where name is null
BuildMongooseFilter({ Name: { Eq: null } } as any, schema);
// → { name: { $eq: null } }
```

If `filter` itself is `null` or `undefined`, an empty `FilterQuery` (`{}`) is returned, which matches all documents.

## Security: Allowlist Enforcement

`TFilterSchema` is the sole allowlist for filter translation. Only fields declared in the schema appear in the output. Any field present in the input but absent from the schema is silently dropped, with no error and no partial output for that field.

```typescript
const schema: TFilterSchema<IUserFilterInput> = {
	Name: { MongoField: 'name', Type: 'string' },
	Age: { MongoField: 'age', Type: 'number' },
};

// Attempt to filter on an undeclared field
BuildMongooseFilter(
	{ Age: { Eq: 30 }, __proto__: { Eq: 'attack' }, AdminFlag: { Eq: true } },
	schema,
);
// → { age: { $eq: 30 } }
// AdminFlag and __proto__ are not in the schema and are dropped.
```

This means you control the exact set of filterable fields by what you declare in the schema. Callers cannot enumerate undeclared fields or bypass the schema by sending arbitrary keys.

## Testing

The package ships with 99 tests across three suites:

- **Unit tests** — full operator coverage for `BuildMongooseFilter` and `BuildMongooseSubscriptionFilter`
- **Integration tests** — run against MongoDB Memory Server to verify query correctness with real Mongoose models
- **Regression tests** — targeted cases for edge conditions (empty logical arrays, unknown fields, deeply nested operators)

```bash
cd packages/graphql-mongoose
yarn test
yarn test:coverage
```

Coverage threshold: 80% lines, functions, branches, and statements.

## TypeScript Integration

Both `BuildMongooseFilter` and `BuildMongooseSubscriptionFilter` are generic over `TDoc`, the Mongoose document type. Passing `TDoc` provides compile-time checking that the returned `FilterQuery<TDoc>` is compatible with your model:

```typescript
interface IUser {
	_id: string;
	name: string;
	age: number;
}

// FilterQuery<IUser> — TypeScript enforces field names in downstream usage
const filter = BuildMongooseFilter<IUser>(input, schema);
await UserModel.find(filter); // compatible
```

For NestJS resolvers, the `@InputType()` wrapper class must be declared in your application. The filter input types from `@pawells/graphql-common` (`StringFilterInput`, `NumberFilterInput`, etc.) are plain TypeScript classes without NestJS decorators. Wrap them in application-level `@InputType()` classes, or see `packages/graphql-common/src/filter/FILTER_DESIGN.md` for the recommended composition pattern.

## License

MIT — [Aaron Wells](https://github.com/PhillipAWells)
