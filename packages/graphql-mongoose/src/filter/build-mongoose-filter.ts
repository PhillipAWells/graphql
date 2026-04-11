import { TFilterSchema, IFieldDescriptor } from './filter-schema.interface';
import { BuildScalarFieldFilter } from './build-scalar-filter';

/**
 * Builds a MongoDB FilterQuery from a GraphQL filter input.
 *
 * Translates GraphQL filter inputs (with nested scalar operators and logical operators)
 * into a Mongoose FilterQuery by:
 * 1. Allowlisting fields against the provided schema
 * 2. Delegating scalar field translation to `BuildScalarFieldFilter`
 * 3. Recursively processing logical operators (`And`, `Or`)
 * 4. Accumulating all results into a single MongoDB query object
 *
 * Unknown fields are silently dropped (not included in the output).
 * Logical operators are processed after scalar fields, allowing them to be combined
 * in the same output filter object (e.g., both field conditions and `$and`/`$or`).
 *
 * Supports arbitrary nesting depth for logical operators (e.g., `Or: [{ And: [...] }, ...]`).
 *
 * @template TDoc - The MongoDB document type for type safety.
 *
 * @param input - The GraphQL filter input object (e.g., `{ Age: { Eq: 30 }, Or: [...] }`).
 *                If undefined or null, returns an empty FilterQuery.
 * @param schema - The filter schema defining allowed fields and their Mongoose mappings.
 *                 Acts as an allowlist and type registry. Logical operators are not validated
 *                 against the schema (they are special reserved keys).
 *
 * @returns A Mongoose FilterQuery ready for use with MongoDB operations.
 *          Returns an empty FilterQuery `{}` if input is null/undefined or contains no valid fields.
 *
 * @example
 * ```typescript
 * interface IUserFilterInput {
 *   Age: { Eq?: number; Gte?: number };
 *   Email: { Eq?: string };
 *   Status?: { Eq?: string };
 * }
 *
 * const schema: TFilterSchema<IUserFilterInput> = {
 *   Age: { MongoField: 'age', Type: 'number' },
 *   Email: { MongoField: 'email', Type: 'string' },
 *   Status: { MongoField: 'status', Type: 'string' },
 * };
 *
 * // Simple equality
 * BuildMongooseFilter({ Age: { Eq: 30 } }, schema)
 * // → { age: { $eq: 30 } }
 *
 * // Multiple operators on same field
 * BuildMongooseFilter({ Age: { Gte: 20, Lte: 30 } }, schema)
 * // → { age: { $gte: 20, $lte: 30 } }
 *
 * // Multiple fields
 * BuildMongooseFilter(
 *   { Age: { Eq: 30 }, Email: { Eq: 'user@example.com' } },
 *   schema
 * )
 * // → { age: { $eq: 30 }, email: { $eq: 'user@example.com' } }
 *
 * // With Or logical operator
 * BuildMongooseFilter(
 *   {
 *     Name: { Eq: 'test' },
 *     Or: [
 *       { Status: { Eq: 'active' } },
 *       { Status: { Eq: 'pending' } },
 *     ],
 *   },
 *   schema
 * )
 * // → { name: { $eq: 'test' }, $or: [{ status: { $eq: 'active' } }, { status: { $eq: 'pending' } }] }
 *
 * // With And logical operator
 * BuildMongooseFilter(
 *   {
 *     And: [
 *       { Age: { Gte: 18 } },
 *       { Age: { Lte: 65 } },
 *     ],
 *   },
 *   schema
 * )
 * // → { $and: [{ age: { $gte: 18 } }, { age: { $lte: 65 } }] }
 *
 * // Nested logical operators
 * BuildMongooseFilter(
 *   {
 *     Or: [
 *       {
 *         And: [
 *           { Age: { Gte: 18 } },
 *           { Status: { Eq: 'active' } },
 *         ],
 *       },
 *       { Status: { Eq: 'pending' } },
 *     ],
 *   },
 *   schema
 * )
 * // → { $or: [{ $and: [{ age: { $gte: 18 } }, { status: { $eq: 'active' } }] }, { status: { $eq: 'pending' } }] }
 *
 * // Null input
 * BuildMongooseFilter(null, schema)
 * // → {}
 *
 * // Unknown fields are dropped
 * BuildMongooseFilter({ Age: { Eq: 30 }, UnknownField: { Eq: 'value' } }, schema)
 * // → { age: { $eq: 30 } }
 * ```
 */
export function BuildMongooseFilter<TDoc>(
	input: Record<string, unknown> | undefined | null,
	schema: TFilterSchema<unknown>,
): Record<string, unknown> {
	if (input === undefined || input === null) {
		return {};
	}

	const mongoFilter: Record<string, unknown> = {};

	for (const [inputKey, inputValue] of Object.entries(input)) {
		// Handle logical operators separately
		if (inputKey === 'And') {
			if (Array.isArray(inputValue)) {
				const andFilters = inputValue
					.map((item) => BuildMongooseFilter<TDoc>(item as Record<string, unknown>, schema))
					.filter((filter) => Object.keys(filter).length > 0);

				if (andFilters.length > 0) {
					mongoFilter.$and = andFilters;
				}
			}
			continue;
		}

		if (inputKey === 'Or') {
			if (Array.isArray(inputValue)) {
				const orFilters = inputValue
					.map((item) => BuildMongooseFilter<TDoc>(item as Record<string, unknown>, schema))
					.filter((filter) => Object.keys(filter).length > 0);

				if (orFilters.length > 0) {
					mongoFilter.$or = orFilters;
				}
			}
			continue;
		}

		// Allowlist enforcement: check if this field is in the schema
		// Use hasOwnProperty to prevent prototype pollution read vector
		const fieldDescriptor = Object.prototype.hasOwnProperty.call(schema, inputKey)
			? (schema as Record<string, unknown>)[inputKey]
			: undefined;
		if (fieldDescriptor === undefined) {
			// Field not in schema, skip it silently
			continue;
		}

		// Build the scalar field filter for this field
		const descriptor = fieldDescriptor as IFieldDescriptor;
		const scalarFieldFilter = BuildScalarFieldFilter(
			inputValue as Record<string, unknown> | undefined,
			descriptor.MongoField,
			descriptor.Type,
		);

		// Accumulate results (merge into mongoFilter)
		Object.assign(mongoFilter, scalarFieldFilter);
	}

	return mongoFilter;
}
