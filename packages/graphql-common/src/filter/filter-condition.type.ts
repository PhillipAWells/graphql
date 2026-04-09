/**
 * Logical operators for combining multiple filter conditions.
 */
export interface ILogicalFilter<T> {
	And?: IFilterCondition<T>[];
	Or?: IFilterCondition<T>[];
}

/**
 * A complete filter condition combining field-level filters (T) with logical operators (And/Or). Enables recursive composition for complex query structures.
 *
 * The intersection of T and ILogicalFilter<T> allows a single condition to contain both field filters
 * (from T, e.g., StringFilterInput) and logical operators (And/Or) that accept nested IFilterCondition<T> arrays.
 * This design enables arbitrarily complex nested filter compositions.
 *
 * @template T The field filter type (e.g., StringFilterInput, NumberFilterInput, or a union of multiple filter types)
 *
 * @example
 * // Simple field filter
 * const filter: IFilterCondition<StringFilterInput> = {
 *   Eq: 'value',
 * };
 *
 * // Logical composition (AND two conditions)
 * const filter: IFilterCondition<StringFilterInput> = {
 *   And: [
 *     { Eq: 'value1' },
 *     { Ne: 'value2' },
 *   ],
 * };
 *
 * // Logical composition with nested conditions (OR two AND groups)
 * const filter: IFilterCondition<StringFilterInput> = {
 *   Or: [
 *     { And: [{ Eq: 'a' }, { Ne: 'b' }] },
 *     { Regex: '^prefix' },
 *   ],
 * };
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export type IFilterCondition<T> = T & ILogicalFilter<T>;
