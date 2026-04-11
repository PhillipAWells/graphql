/**
 * Filter input for string fields. Supports equality, regex patterns, and range comparisons.
 *
 * Use this filter input to build string field conditions for MongoDB queries.
 * Properties include:
 * - Eq, Ne: equality and inequality
 * - In, Nin: set membership
 * - Regex, RegexOptions: regex pattern matching with optional flags
 * - Exists: field existence check
 * - Lt, Lte, Gt, Gte: lexicographic string comparisons
 *
 * @example
 * // String equality filter
 * const filter: IFilterCondition<StringFilterInput> = {
 *   Eq: 'expectedName',
 * };
 *
 * // Regex pattern with case-insensitive flag
 * const filter: IFilterCondition<StringFilterInput> = {
 *   Regex: '^prefix',
 *   RegexOptions: 'i',
 * };
 */
export class StringFilterInput {
	public readonly Eq?: string;
	public readonly Ne?: string;
	public readonly In?: string[];
	public readonly Nin?: string[];
	public readonly Regex?: string;
	public readonly RegexOptions?: string;
	public readonly Exists?: boolean;
	public readonly Lt?: string;
	public readonly Lte?: string;
	public readonly Gt?: string;
	public readonly Gte?: string;
}
