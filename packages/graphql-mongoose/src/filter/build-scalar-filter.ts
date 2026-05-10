import { Types } from 'mongoose';
import { SCALAR_OPERATOR_MAP } from './operator-map.constant';

// Constants for error messages and validation
const MAX_REGEX_PATTERN_LENGTH = 1000;
const ERROR_MESSAGE_PREVIEW_LENGTH = 50;

/**
 * Builds a MongoDB field filter object for a single scalar or array field.
 *
 * Translates GraphQL scalar filter operators (e.g., `{ Eq: 30, Gte: 20 }`) into
 * MongoDB operators (e.g., `{ $eq: 30, $gte: 20 }`).
 *
 * Handles type coercion for ObjectId fields by converting string values to
 * `Types.ObjectId` instances.
 *
 * Supports regex pattern matching via `Regex` and `RegexOptions` operators.
 * If both `Regex` and `RegexOptions` are present, they are compiled into a
 * single `RegExp` object. If only `Regex` is present, it is used as a string.
 * If `RegexOptions` is present without `Regex`, both are ignored.
 *
 * For array fields, supports the following array-specific operators:
 * - `All`: Matches documents where the array field contains all specified elements.
 *   Example: `{ Tags: { All: ['a', 'b'] } }` → `{ tags: { $all: ['a', 'b'] } }`
 * - `Size`: Matches documents where the array field has exactly the specified length.
 *   Example: `{ Tags: { Size: 3 } }` → `{ tags: { $size: 3 } }`
 * - `ElemMatch`: Matches documents where at least one element in the array matches
 *   the specified filter. The operand is passed through as-is without transformation,
 *   and should be a valid MongoDB filter object (either GraphQL-style operators or
 *   pre-transformed MongoDB operators).
 *   Example: `{ Tags: { ElemMatch: { Eq: 'a' } } }` → `{ tags: { $elemMatch: { Eq: 'a' } } }`
 *
 * Array operators are only valid for fields with Type: 'array'.
 *
 * @param fieldInput - The GraphQL filter input for this field (e.g., `{ Eq: 30 }`).
 *                     If undefined or null, returns an empty object.
 * @param mongoField - The MongoDB field name (e.g., `'userId'`).
 * @param fieldType - The scalar type of the field (e.g., `'objectId'`, `'string'`, `'array'`).
 *                    Used to determine coercion rules and which operators are valid.
 *
 * @returns A MongoDB field filter object (e.g., `{ mongoField: { $eq: 30 } }`),
 *          or an empty object if no operators matched.
 *
 * @example
 * ```typescript
 * // Simple number field with multiple operators
 * BuildScalarFieldFilter({ Eq: 30, Gte: 20 }, 'age', 'number')
 * // → { age: { $eq: 30, $gte: 20 } }
 *
 * // ObjectId field with automatic string → ObjectId coercion
 * BuildScalarFieldFilter(
 *   { Eq: '507f1f77bcf86cd799439011' },
 *   'userId',
 *   'objectId'
 * )
 * // → { userId: { $eq: ObjectId('507f1f77bcf86cd799439011') } }
 *
 * // Regex with options
 * BuildScalarFieldFilter(
 *   { Regex: '^foo', RegexOptions: 'i' },
 *   'name',
 *   'string'
 * )
 * // → { name: { $regex: /^foo/i } }
 *
 * // Regex without options
 * BuildScalarFieldFilter(
 *   { Regex: '^foo' },
 *   'name',
 *   'string'
 * )
 * // → { name: { $regex: '^foo' } }
 *
 * // Undefined input
 * BuildScalarFieldFilter(undefined, 'email', 'string')
 * // → {}
 * ```
 */
export function BuildScalarFieldFilter(
	fieldInput: Record<string, unknown> | undefined,
	mongoField: string,
	fieldType: string,
): Record<string, unknown> {
	if (fieldInput === undefined || fieldInput === null) {
		return {};
	}

	const mongoFieldFilter: Record<string, unknown> = {};
	let regexPattern: string | undefined;
	let regexOptions: string | undefined;

	for (const [operatorKey, operatorValue] of Object.entries(fieldInput)) {
		// Handle regex operator separately to allow combining with options
		if (operatorKey === 'Regex') {
			if (typeof operatorValue === 'string') {
				regexPattern = operatorValue;
			}
			continue;
		}

		// Capture regex options (will be combined with pattern if pattern exists)
		if (operatorKey === 'RegexOptions') {
			if (typeof operatorValue === 'string') {
				regexOptions = operatorValue;
			}
			continue;
		}

		// Handle array-specific operators (only valid for array fields)
		if (fieldType === 'array') {
			if (operatorKey === 'All') {
				mongoFieldFilter.$all = operatorValue;
				continue;
			}

			if (operatorKey === 'Size') {
				mongoFieldFilter.$size = operatorValue;
				continue;
			}

			if (operatorKey === 'ElemMatch') {
				// For ElemMatch, the value is passed through as-is.
				// The operand should be a properly formed filter object (either GraphQL-style operators
				// or already transformed MongoDB operators) that will be applied by MongoDB or the
				// subscription filter evaluator. Schema validation is the application's responsibility
				// at the GraphQL layer to ensure ElemMatch inputs are well-typed.
				mongoFieldFilter.$elemMatch = operatorValue;
				continue;
			}
		}

		const mongoOperator = SCALAR_OPERATOR_MAP[operatorKey as keyof typeof SCALAR_OPERATOR_MAP];

		if (mongoOperator === undefined) {
			// Unknown operator, skip it
			continue;
		}

		// Coerce value based on field type
		let coercedValue: unknown = operatorValue;
		if (fieldType === 'objectId' && typeof operatorValue === 'string') {
			try {
				coercedValue = new Types.ObjectId(operatorValue);
			} catch (error) {
				// Invalid ObjectId format — throw descriptive error
				throw new Error(
					`Invalid ObjectId format for field "${mongoField}": "${operatorValue}". Expected a valid 24-character hex string.`,
					{ cause: error },
				);
			}
		}

		// Coerce array values for $in/$nin operators
		if (fieldType === 'objectId' && Array.isArray(operatorValue)) {
			try {
				coercedValue = operatorValue.map(v => (typeof v === 'string' ? new Types.ObjectId(v) : v));
			} catch (error) {
				// Invalid ObjectId format in array — throw descriptive error
				throw new Error(
					`Invalid ObjectId format in array for field "${mongoField}". Expected valid 24-character hex strings.`,
					{ cause: error },
				);
			}
		}

		mongoFieldFilter[mongoOperator] = coercedValue;
	}

	// Handle regex: if pattern is present, compile it with options if available
	if (regexPattern !== undefined) {
		// Security: validate pattern length to prevent ReDoS attacks
		if (regexPattern.length > MAX_REGEX_PATTERN_LENGTH) {
			throw new Error(
				`Regex pattern exceeds maximum length (${MAX_REGEX_PATTERN_LENGTH} characters): "${regexPattern.substring(0, ERROR_MESSAGE_PREVIEW_LENGTH)}..."`,
			);
		}

		try {
			const regexValue = regexOptions !== undefined
				? new RegExp(regexPattern, regexOptions)
				: regexPattern;
			mongoFieldFilter.$regex = regexValue;
		} catch (error) {
			// Invalid regex pattern (including catastrophic backtracking patterns)
			throw new Error(
				`Invalid regex pattern: ${(error as Error).message}`,
				{ cause: error },
			);
		}
	}

	// Return the field object with all operators accumulated
	if (Object.keys(mongoFieldFilter).length === 0) {
		return {};
	}

	return {
		[mongoField]: mongoFieldFilter,
	};
}
