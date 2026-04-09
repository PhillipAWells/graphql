/**
 * Filter input for ObjectId fields. Values are provided as strings; the ORM adapter handles coercion to native ObjectId types.
 *
 * Use this filter input to build ObjectId field conditions for MongoDB queries.
 * ObjectIds are represented as hex strings in GraphQL but coerced to native BSON ObjectId objects by @pawells/graphql-mongoose.
 * Properties include:
 * - Eq, Ne: equality and inequality
 * - In, Nin: set membership
 * - Exists: field existence check
 *
 * @example
 * // ObjectId equality filter
 * const filter: IFilterCondition<ObjectIdFilterInput> = {
 *   Eq: '60d5ec49c1234567890abcde',
 * };
 *
 * // ObjectId set membership filter
 * const filter: IFilterCondition<ObjectIdFilterInput> = {
 *   In: ['60d5ec49c1234567890abcde', '60d5ec49c1234567890abcdf'],
 * };
 */
export class ObjectIdFilterInput {
	public readonly Eq?: string;
	public readonly Ne?: string;
	public readonly In?: string[];
	public readonly Nin?: string[];
	public readonly Exists?: boolean;
}
