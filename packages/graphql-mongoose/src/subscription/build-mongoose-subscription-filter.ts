import { TFilterSchema } from '../filter/filter-schema.interface';
import { BuildMongooseFilter } from '../filter/build-mongoose-filter';

/**
 * Creates an in-memory filter function from a Mongoose filter query.
 *
 * Translates a GraphQL filter input into a predicate function that can be applied
 * to documents in-memory. Useful for subscription filtering or client-side filtering
 * of streamed data.
 *
 * Supports all MongoDB query operators that can be evaluated in-memory:
 * - Scalar operators: `$eq`, `$ne`, `$in`, `$nin`, `$gte`, `$lte`, `$gt`, `$lt`, `$exists`
 * - Array operators: `$all`, `$size`, `$elemMatch`
 * - Logical operators: `$and`, `$or`
 * - Regex operators: `$regex`
 *
 * @template TDoc - The document type being filtered.
 *
 * @param filter - The GraphQL filter input object (e.g., `{ Name: { Eq: 'test' } }`).
 *                 If undefined or null, returns a function that accepts all documents.
 * @param schema - The filter schema defining allowed fields and their Mongoose mappings.
 *
 * @returns A predicate function that accepts a document and returns `true` if it matches
 *          the filter, `false` otherwise. Always returns a function, even for null/undefined filters.
 *
 * @example
 * ```typescript
 * interface IUserFilterInput {
 *   Name: { Eq?: string };
 *   Age: { Gte?: number; Lte?: number };
 * }
 *
 * const schema: TFilterSchema<IUserFilterInput> = {
 *   Name: { MongoField: 'name', Type: 'string' },
 *   Age: { MongoField: 'age', Type: 'number' },
 * };
 *
 * // Accepts all documents
 * const passAll = BuildMongooseSubscriptionFilter(undefined, schema);
 * passAll({ name: 'Alice', age: 30 }); // → true
 *
 * // Filters by name
 * const filterByName = BuildMongooseSubscriptionFilter(
 *   { Name: { Eq: 'Alice' } },
 *   schema
 * );
 * filterByName({ name: 'Alice', age: 30 }); // → true
 * filterByName({ name: 'Bob', age: 25 }); // → false
 *
 * // Filters by age range
 * const filterByAge = BuildMongooseSubscriptionFilter(
 *   { Age: { Gte: 20, Lte: 40 } },
 *   schema
 * );
 * filterByAge({ name: 'Alice', age: 30 }); // → true
 * filterByAge({ name: 'Bob', age: 50 }); // → false
 * ```
 */
export function BuildMongooseSubscriptionFilter<TDoc>(
	filter: Record<string, unknown> | undefined | null,
	schema: TFilterSchema<unknown>,
): (doc: TDoc) => boolean {
	// If no filter provided, accept all documents
	if (filter === undefined || filter === null) {
		return (): boolean => true;
	}

	// Build the MongoDB filter query
	const mongoQuery = BuildMongooseFilter(filter, schema);

	// Return a predicate function that tests documents against the query
	return (doc: TDoc): boolean => {
		return applyMongoFilter(doc, mongoQuery);
	};
}

/**
 * Applies a MongoDB filter query to a document in-memory.
 * Supports scalar, array, and logical operators.
 *
 * @param doc - The document to test.
 * @param query - The MongoDB query object (e.g., `{ name: { $eq: 'test' } }`).
 * @returns `true` if the document matches the query, `false` otherwise.
 */
function applyMongoFilter(doc: unknown, query: Record<string, unknown>): boolean {
	if (typeof doc !== 'object' || doc === null) {
		return false;
	}

	const docRecord = doc as Record<string, unknown>;

	for (const [key, value] of Object.entries(query)) {
		if (key === '$and') {
			// All conditions must match
			const conditions = Array.isArray(value) ? value : [value];
			if (!conditions.every((cond) => applyMongoFilter(doc, cond as Record<string, unknown>))) {
				return false;
			}
		} else if (key === '$or') {
			// At least one condition must match
			const conditions = Array.isArray(value) ? value : [value];
			if (!conditions.some((cond) => applyMongoFilter(doc, cond as Record<string, unknown>))) {
				return false;
			}
		} else {
			// Scalar field filter
			const fieldValue = docRecord[key];
			if (!applyFieldFilter(fieldValue, value)) {
				return false;
			}
		}
	}

	return true;
}

/**
 * Applies a field-level filter to a document field value.
 * Supports scalar operators, array operators, and logical operators.
 *
 * IMPORTANT LIMITATION - ObjectId Comparison Reliability:
 * In-memory ObjectId comparison using === may not work correctly when ObjectIds are
 * instantiated separately. MongoDB ObjectIds with the same bytes will not be equal
 * when compared with === because each instance is a distinct object. This function
 * uses === for ObjectId comparison, which means subscription filters on ObjectId fields
 * may not match events correctly if the ObjectIds are reconstructed in memory.
 *
 * For reliable ObjectId filtering on subscriptions, use BuildMongooseFilter() against
 * the MongoDB database directly, or serialize/deserialize ObjectIds consistently.
 *
 * @param fieldValue - The value of the document field.
 * @param filterSpec - The filter specification (e.g., `{ $eq: 'test' }` or `{ $gte: 20, $lte: 40 }`).
 * @returns `true` if the field value matches the filter, `false` otherwise.
 */
function applyFieldFilter(fieldValue: unknown, filterSpec: unknown): boolean {
	if (typeof filterSpec !== 'object' || filterSpec === null) {
		return false;
	}

	const spec = filterSpec as Record<string, unknown>;

	for (const [operator, operand] of Object.entries(spec)) {
		switch (operator) {
			case '$eq':
				if (fieldValue !== operand) {
					return false;
				}
				break;

			case '$ne':
				if (fieldValue === operand) {
					return false;
				}
				break;

			case '$in':
				if (!Array.isArray(operand) || !operand.includes(fieldValue)) {
					return false;
				}
				break;

			case '$nin':
				if (!Array.isArray(operand) || operand.includes(fieldValue)) {
					return false;
				}
				break;

			case '$gt':
				if (typeof fieldValue !== 'number' || typeof operand !== 'number' || !(fieldValue > operand)) {
					return false;
				}
				break;

			case '$gte':
				if (typeof fieldValue !== 'number' || typeof operand !== 'number' || !(fieldValue >= operand)) {
					return false;
				}
				break;

			case '$lt':
				if (typeof fieldValue !== 'number' || typeof operand !== 'number' || !(fieldValue < operand)) {
					return false;
				}
				break;

			case '$lte':
				if (typeof fieldValue !== 'number' || typeof operand !== 'number' || !(fieldValue <= operand)) {
					return false;
				}
				break;

			case '$exists':
				if (typeof operand !== 'boolean') {
					return false;
				}
				if (operand && fieldValue === undefined) {
					return false;
				}
				if (!operand && fieldValue !== undefined) {
					return false;
				}
				break;

			case '$regex':
				if (typeof fieldValue !== 'string') {
					return false;
				}
				if (operand instanceof RegExp) {
					if (!operand.test(fieldValue)) {
						return false;
					}
				} else if (typeof operand === 'string') {
					if (!new RegExp(operand).test(fieldValue)) {
						return false;
					}
				} else {
					return false;
				}
				break;

			case '$all':
				if (!Array.isArray(fieldValue) || !Array.isArray(operand)) {
					return false;
				}
				if (!operand.every((item) => fieldValue.includes(item))) {
					return false;
				}
				break;

			case '$size':
				if (!Array.isArray(fieldValue) || typeof operand !== 'number') {
					return false;
				}
				if (fieldValue.length !== operand) {
					return false;
				}
				break;

			case '$elemMatch':
				if (!Array.isArray(fieldValue)) {
					return false;
				}
				if (typeof operand !== 'object' || operand === null) {
					return false;
				}
				// At least one element must match the filter spec
				if (!fieldValue.some((elem) => applyMongoFilter(elem, operand as Record<string, unknown>))) {
					return false;
				}
				break;

			default:
				// Unknown operator, skip it
				break;
		}
	}

	return true;
}
