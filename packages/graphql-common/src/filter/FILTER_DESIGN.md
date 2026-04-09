# FilterInput Architecture

## Design Rationale

The filter input types (`StringFilterInput`, `NumberFilterInput`, `BooleanFilterInput`, `DateFilterInput`, `ObjectIdFilterInput`, `ArrayFilterInput`) are GraphQL protocol contracts — they define the shape of filter arguments that clients send over the wire. They carry no ORM-specific logic and make no assumptions about how filters will be evaluated.

Keeping these types in `@pawells/graphql-common` allows any tool in the ecosystem to share a single authoritative definition. A code generator, a client-side query builder, and a server-side ORM translator all describe the same filter vocabulary. When a new operator is added to `StringFilterInput`, every consumer gets it automatically without coordination across packages.

Each ORM gets its own builder package that imports these shared types and translates them to the query format its ORM understands. The translation is the only layer that varies by ORM; the protocol contract remains stable.

## For NestJS Consumers

`@pawells/graphql-common` exports plain TypeScript classes. The classes have no NestJS decorators (`@InputType`, `@Field`, etc.) because `graphql-common` does not depend on `@nestjs/graphql`. This keeps the package usable by non-NestJS consumers and avoids pulling in the entire NestJS GraphQL stack as a dependency.

NestJS resolvers require `@InputType()` decorated classes for schema generation. The recommended approach is to create thin wrapper classes in your application that re-declare the fields with the appropriate NestJS decorators:

```typescript
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class StringFilterInput {
	@Field(() => String, { nullable: true })
	public Eq?: string;

	@Field(() => String, { nullable: true })
	public Ne?: string;

	@Field(() => [String], { nullable: true })
	public In?: string[];

	@Field(() => [String], { nullable: true })
	public Nin?: string[];

	@Field(() => String, { nullable: true })
	public Regex?: string;

	@Field(() => String, { nullable: true })
	public RegexOptions?: string;

	@Field(() => Boolean, { nullable: true })
	public Exists?: boolean;

	@Field(() => String, { nullable: true })
	public Lt?: string;

	@Field(() => String, { nullable: true })
	public Lte?: string;

	@Field(() => String, { nullable: true })
	public Gt?: string;

	@Field(() => String, { nullable: true })
	public Gte?: string;
}
```

If you prefer composition over re-declaration, create a wrapper `@InputType()` class with a single field of the common type and use it as the argument type in your resolver. Either approach works; the key constraint is that only NestJS-decorated classes appear in your resolver argument lists.

Once your application-level `@InputType()` classes are in place, pass their instances directly to `BuildMongooseFilter` or `BuildMongooseSubscriptionFilter` from `@pawells/graphql-mongoose`. The builder functions accept `Record<string, unknown>` and operate on the runtime shape of the object, so no additional adapter is needed:

```typescript
import { BuildMongooseFilter, TFilterSchema } from '@pawells/graphql-mongoose';

const mongoFilter = BuildMongooseFilter<IUser>(
	filter as Record<string, unknown> | undefined,
	UserFilterSchema,
);
```

## The Three-Package Pattern

The library is split into three independently consumable layers:

| Package | Role |
|---|---|
| `@pawells/graphql-common` | Protocol contracts — `FilterInput` types, pagination types, relay types, sorting types, and other shared primitives |
| `@pawells/graphql-<orm>` | ORM translators — accepts `graphql-common` filter inputs, returns ORM-native query objects |
| `@pawells/nestjs-graphql` | NestJS runtime infrastructure — guards, interceptors, DataLoaders, WebSocket auth, and Apollo Server integration |

Each layer can be consumed independently. A project that uses a different NestJS HTTP framework can still use `graphql-common` types. A project with a custom GraphQL runtime can still use `graphql-mongoose` to translate filter inputs. The layers compose but do not force a monolithic dependency.

Applications built on NestJS and MongoDB will typically import all three. Projects with different ORMs import `graphql-common` and their ORM-specific builder, but never need to touch `nestjs-graphql` for filter translation.

## Future ORMs

Future packages — such as `@pawells/graphql-prisma` or `@pawells/graphql-typeorm` — will follow the same pattern: accept `graphql-common` filter input types as input and return their ORM's native query type as output. The `TFilterSchema` pattern (a developer-declared allowlist mapping GraphQL fields to database fields) is intentionally ORM-agnostic and will carry forward unchanged.

This means application code that constructs filter input objects or defines filter schemas is portable across ORM packages. Only the import path and the return type of the builder function change when switching or adding an ORM adapter.
