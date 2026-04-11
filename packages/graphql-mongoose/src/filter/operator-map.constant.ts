/**
 * Maps GraphQL scalar filter operators to MongoDB query operators.
 *
 * Each GraphQL operator (e.g., `Eq`, `Ne`) is translated to its MongoDB equivalent
 * (e.g., `$eq`, `$ne`) for use in MongoDB query objects.
 *
 * @example
 * ```typescript
 * SCALAR_OPERATOR_MAP.Eq // '$eq'
 * SCALAR_OPERATOR_MAP.Gte // '$gte'
 * ```
 */
export const SCALAR_OPERATOR_MAP = {
	Eq: '$eq',
	Ne: '$ne',
	In: '$in',
	Nin: '$nin',
	Lt: '$lt',
	Lte: '$lte',
	Gt: '$gt',
	Gte: '$gte',
	Exists: '$exists',
} as const;
