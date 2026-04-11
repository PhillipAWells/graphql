/**
 * Filter input for numeric fields. Supports equality, range, and set membership filtering.
 *
 * Use this filter input to build numeric field conditions for MongoDB queries.
 * Properties include:
 * - Eq, Ne: equality and inequality
 * - In, Nin: set membership
 * - Lt, Lte, Gt, Gte: numeric range comparisons
 * - Exists: field existence check
 *
 * @example
 * // Numeric equality filter
 * const filter: IFilterCondition<NumberFilterInput> = {
 *   Eq: 42,
 * };
 *
 * // Numeric range filter (values between 10 and 100)
 * const filter: IFilterCondition<NumberFilterInput> = {
 *   Gte: 10,
 *   Lte: 100,
 * };
 */
export class NumberFilterInput {
	public readonly Eq?: number;
	public readonly Ne?: number;
	public readonly In?: number[];
	public readonly Nin?: number[];
	public readonly Lt?: number;
	public readonly Lte?: number;
	public readonly Gt?: number;
	public readonly Gte?: number;
	public readonly Exists?: boolean;
}
