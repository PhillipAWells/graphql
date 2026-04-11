/**
 * Describes a single field in a GraphQL filter input type.
 * Maps a GraphQL input field to its Mongoose collection field and type.
 *
 * @example
 * ```typescript
 * const userFieldDescriptor: IFieldDescriptor = {
 *   MongoField: 'email',
 *   Type: 'string',
 * };
 * ```
 */
export interface IFieldDescriptor {
	/**
	 * The name of the field in the MongoDB collection.
	 * May differ from the GraphQL input field name (e.g., 'email' in MongoDB vs 'userEmail' in GraphQL).
	 */
	MongoField: string;

	/**
	 * The scalar type of the field.
	 * Used to determine coercion rules (e.g., ObjectId string → Types.ObjectId).
	 */
	Type: 'string' | 'number' | 'boolean' | 'date' | 'objectId' | 'array';
}

/**
 * Schema mapping GraphQL filter input fields to their Mongoose field descriptors.
 * Acts as an allowlist and type registry for filter translation.
 *
 * @template TInput - The GraphQL filter input type (for type safety).
 *
 * @example
 * ```typescript
 * interface IUserFilterInput {
 *   Age: IScalarFieldFilter;
 *   Email: IScalarFieldFilter;
 * }
 *
 * const userFilterSchema: TFilterSchema<IUserFilterInput> = {
 *   Age: { MongoField: 'age', Type: 'number' },
 *   Email: { MongoField: 'email', Type: 'string' },
 * };
 * ```
 */
export type TFilterSchema<TInput> = {
	[K in keyof TInput]: IFieldDescriptor;
};
