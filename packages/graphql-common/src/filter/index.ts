/**
 * Filter input class for string fields. Supports equality, regex patterns, set membership, existence checks, and lexicographic range comparisons.
 * Used with IFilterCondition<StringFilterInput> to build type-safe string filter conditions.
 */
export { StringFilterInput } from './string-filter-input';

/**
 * Filter input class for numeric fields. Supports equality, inequality, set membership, existence checks, and numeric range comparisons.
 * Used with IFilterCondition<NumberFilterInput> to build type-safe numeric filter conditions.
 */
export { NumberFilterInput } from './number-filter-input';

/**
 * Filter input class for boolean fields. Supports equality, inequality, and existence checks.
 * Used with IFilterCondition<BooleanFilterInput> to build type-safe boolean filter conditions.
 */
export { BooleanFilterInput } from './boolean-filter-input';

/**
 * Filter input class for date/datetime fields. Supports equality, inequality, existence checks, and temporal range comparisons.
 * Used with IFilterCondition<DateFilterInput> to build type-safe date filter conditions.
 */
export { DateFilterInput } from './date-filter-input';

/**
 * Filter input class for ObjectId fields (MongoDB identifiers). Values are hex strings that ORM adapters coerce to native ObjectId types.
 * Supports equality, inequality, set membership, and existence checks.
 * Used with IFilterCondition<ObjectIdFilterInput> to build type-safe ObjectId filter conditions.
 */
export { ObjectIdFilterInput } from './object-id-filter-input';

/**
 * Base marker interface for all filter input types. Enables type-safe composition with logical operators.
 * All filter input classes implicitly satisfy this interface.
 */
export { IFilterInputBase } from './filter-input-base.interface';

/**
 * Type representing a complete filter condition combining field-level filters with logical operators (And/Or).
 * IFilterCondition<T> = T & ILogicalFilter<T>, allowing both field filters and logical composition.
 * Enables arbitrarily complex nested filter structures for building expressive query conditions.
 *
 * ILogicalFilter<T> provides And/Or operators that accept arrays of nested IFilterCondition<T> values.
 */
export { IFilterCondition, ILogicalFilter } from './filter-condition.type';

/**
 * Generic filter input class for array fields. T is the element filter type (e.g., StringFilterInput for string arrays).
 * Supports all-element matching, element matching (ElemMatch), array length (Size), and existence checks.
 * Used with IFilterCondition<ArrayFilterInput<T>> to build type-safe array filter conditions with generic type safety.
 */
export { ArrayFilterInput } from './array-filter-input';
