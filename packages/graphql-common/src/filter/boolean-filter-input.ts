/**
 * Filter input for boolean fields. Supports equality and existence checks.
 *
 * Use this filter input to build boolean field conditions for MongoDB queries.
 * Properties include:
 * - Eq: equality (true/false)
 * - Ne: inequality (opposite boolean value)
 * - Exists: field existence check
 *
 * @example
 * // Boolean equality filter
 * const filter: IFilterCondition<BooleanFilterInput> = {
 *   Eq: true,
 * };
 *
 * // Boolean inequality filter
 * const filter: IFilterCondition<BooleanFilterInput> = {
 *   Ne: false,
 * };
 */
export class BooleanFilterInput {
	public readonly Eq?: boolean;
	public readonly Ne?: boolean;
	public readonly Exists?: boolean;
}
