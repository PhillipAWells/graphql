/**
 * Example: Using BuildMongooseFilter in a NestJS GraphQL Resolver
 *
 * This example demonstrates how to use BuildMongooseFilter to translate
 * GraphQL filter inputs into MongoDB queries within a NestJS resolver.
 */

import { BuildMongooseFilter, TFilterSchema } from '@pawells/graphql-mongoose';

/**
 * Example User document type (from your MongoDB schema).
 * This would typically be imported from your Mongoose schema definition.
 */
interface User {
	_id: string;
	name: string;
	email: string;
	age: number;
	isActive: boolean;
}

/**
 * Example GraphQL filter input type.
 * This would be defined as a GraphQL input type in your schema.
 */
interface IUserFilterInput {
	Name?: Record<string, string>;
	Email?: Record<string, string>;
	Age?: Record<string, number>;
	IsActive?: Record<string, boolean>;
}

/**
 * Define the filter schema that maps GraphQL filter fields to MongoDB fields.
 * This acts as an allowlist and defines the type coercion for each field.
 */
const UserFilterSchema: TFilterSchema<IUserFilterInput> = {
	Name: { MongoField: 'name', Type: 'string' },
	Email: { MongoField: 'email', Type: 'string' },
	Age: { MongoField: 'age', Type: 'number' },
	IsActive: { MongoField: 'isActive', Type: 'boolean' },
};

/**
 * Example function demonstrating BuildMongooseFilter in a query resolver.
 *
 * In a real NestJS resolver, this logic would be in a @Query() method.
 * This example shows how to use the filter builder.
 *
 * @param filter - Optional GraphQL filter input to apply to the query
 * @returns Function that accepts a service and returns filtered users
 *
 * @example
 * ```typescript
 * // Usage in a resolver method:
 * @Query(() => [User], { description: 'Fetch users with optional filtering' })
 * async users(
 *   @Args('filter', { nullable: true }) filter?: IUserFilterInput,
 * ): Promise<User[]> {
 *   const mongoFilter = BuildMongooseFilter<User>(filter, UserFilterSchema);
 *   return this.userService.find(mongoFilter);
 * }
 *
 * // GraphQL query - Simple equality:
 * // query {
 * //   users(filter: { Name: { Eq: "Alice" } }) {
 * //     id
 * //     name
 * //     email
 * //   }
 * // }
 * // Translates to: { name: { $eq: "Alice" } }
 *
 * // GraphQL query - Range filter on number:
 * // query {
 * //   users(filter: { Age: { Gte: 18, Lte: 65 } }) {
 * //     id
 * //     name
 * //     age
 * //   }
 * // }
 * // Translates to: { age: { $gte: 18, $lte: 65 } }
 *
 * // GraphQL query - Multiple field filters (implicitly AND'd):
 * // query {
 * //   users(filter: {
 * //     Age: { Gte: 18, Lte: 65 }
 * //     IsActive: { Eq: true }
 * //   }) {
 * //     id
 * //     name
 * //     age
 * //     isActive
 * //   }
 * // }
 * // Translates to: { age: { $gte: 18, $lte: 65 }, isActive: { $eq: true } }
 * ```
 */
export function exampleUserQueryResolver(filter?: IUserFilterInput): (service: any) => Promise<User[]> {
	return async (service: any): Promise<User[]> => {
		// Translate GraphQL filter input to MongoDB FilterQuery using the schema
		const mongoFilter = BuildMongooseFilter<User>(filter as Record<string, unknown> | undefined, UserFilterSchema);

		// Use the MongoDB filter with your service
		// The service's find() method will execute the MongoDB query
		return service.find(mongoFilter);
	};
}

/**
 * Usage examples for BuildMongooseFilter:
 *
 * 1. Simple equality filter:
 *    Input: { Name: { Eq: 'Alice' } }
 *    MongoDB: { name: { $eq: 'Alice' } }
 *
 * 2. Range filter on number:
 *    Input: { Age: { Gte: 18, Lte: 65 } }
 *    MongoDB: { age: { $gte: 18, $lte: 65 } }
 *
 * 3. Multiple field filters:
 *    Input: { Age: { Eq: 30 }, IsActive: { Eq: true } }
 *    MongoDB: { age: { $eq: 30 }, isActive: { $eq: true } }
 *
 * 4. No filter (returns all documents):
 *    Input: undefined or null
 *    MongoDB: {}
 *
 * 5. Unknown fields are silently ignored:
 *    Input: { Age: { Eq: 30 }, UnknownField: { Eq: 'value' } }
 *    MongoDB: { age: { $eq: 30 } }
 *
 * The filter schema acts as an allowlist - only fields defined in the schema
 * are used. This provides security and type safety.
 */

/**
 * Example usage scenarios:
 *
 * 1. Simple equality filter:
 *    Input: { Name: { Eq: 'Alice' } }
 *    Output: { name: { $eq: 'Alice' } }
 *
 * 2. Range filter on number:
 *    Input: { Age: { Gte: 18, Lte: 65 } }
 *    Output: { age: { $gte: 18, $lte: 65 } }
 *
 * 3. Multiple field filters:
 *    Input: { Age: { Eq: 30 }, IsActive: { Eq: true } }
 *    Output: { age: { $eq: 30 }, isActive: { $eq: true } }
 *
 * 4. No filter (returns all documents):
 *    Input: undefined or null
 *    Output: {}
 *
 * 5. Unknown fields are silently ignored:
 *    Input: { Age: { Eq: 30 }, UnknownField: { Eq: 'value' } }
 *    Output: { age: { $eq: 30 } }
 */
