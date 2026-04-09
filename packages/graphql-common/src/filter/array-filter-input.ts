import type { IFilterCondition } from './filter-condition.type';

/**
 * Filter input for array fields. T is the element filter type (e.g., StringFilterInput for string arrays). Supports set operations, element matching, and length filtering.
 *
 * Use this generic filter input to build array field conditions for MongoDB queries.
 * The type parameter T determines what filters are available on array elements.
 * Properties include:
 * - All: all array elements must match the filter (MongoDB $all operator)
 * - ElemMatch: at least one element must match the filter
 * - Size: array must have exactly this many elements
 * - Exists: field existence check
 *
 * @template T The element filter type (e.g., StringFilterInput for string arrays, NumberFilterInput for number arrays)
 *
 * @example
 * // Array element matching (string array)
 * const filter: IFilterCondition<ArrayFilterInput<StringFilterInput>> = {
 *   ElemMatch: {
 *     Eq: 'expectedTag',
 *   },
 * };
 *
 * // Array length filter
 * const filter: IFilterCondition<ArrayFilterInput<StringFilterInput>> = {
 *   Size: 3,
 * };
 */
export class ArrayFilterInput<T> {
	public readonly All?: T[];

	public readonly ElemMatch?: IFilterCondition<T>;

	public readonly Size?: number;

	public readonly Exists?: boolean;
}
