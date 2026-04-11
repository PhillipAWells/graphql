/**
 * Filter input for date/datetime fields. Supports equality, range, and temporal comparisons.
 *
 * Use this filter input to build date field conditions for MongoDB queries.
 * Properties include:
 * - Eq, Ne: equality and inequality
 * - Lt, Lte, Gt, Gte: temporal range comparisons (before, after)
 * - Exists: field existence check
 *
 * @example
 * // Date equality filter
 * const filter: IFilterCondition<DateFilterInput> = {
 *   Eq: new Date('2026-04-09'),
 * };
 *
 * // Date range filter (dates between start and end)
 * const filter: IFilterCondition<DateFilterInput> = {
 *   Gte: new Date('2026-01-01'),
 *   Lte: new Date('2026-12-31'),
 * };
 */
export class DateFilterInput {
	public readonly Eq?: Date;
	public readonly Ne?: Date;
	public readonly Lt?: Date;
	public readonly Lte?: Date;
	public readonly Gt?: Date;
	public readonly Gte?: Date;
	public readonly Exists?: boolean;
}
