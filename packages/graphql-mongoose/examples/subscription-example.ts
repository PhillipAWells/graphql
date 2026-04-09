/**
 * Example: Using BuildMongooseSubscriptionFilter in a NestJS GraphQL Subscription Resolver
 *
 * This example demonstrates how to use BuildMongooseSubscriptionFilter to filter
 * GraphQL subscriptions based on payload data, allowing subscribers to only receive
 * updates matching their filter criteria.
 */

import { BuildMongooseSubscriptionFilter, TFilterSchema } from '@pawells/graphql-mongoose';

/**
 * Example Order document type.
 * This would typically be imported from your Mongoose schema definition.
 */
interface Order {
	_id: string;
	status: string;
	customerId: string;
	totalAmount: number;
	createdAt: Date;
}

/**
 * Subscription payload type - wraps the data emitted by subscriptions.
 */
interface OrderUpdatePayload {
	order: Order;
}

/**
 * Example GraphQL filter input type for orders.
 */
interface IOrderFilterInput {
	Status?: Record<string, string>;
	CustomerId?: Record<string, string>;
	TotalAmount?: Record<string, number>;
}

/**
 * Define the filter schema for orders.
 * Maps GraphQL filter fields to MongoDB document fields.
 */
const OrderFilterSchema: TFilterSchema<IOrderFilterInput> = {
	Status: { MongoField: 'status', Type: 'string' },
	CustomerId: { MongoField: 'customerId', Type: 'string' },
	TotalAmount: { MongoField: 'totalAmount', Type: 'number' },
};

/**
 * Example subscription filter function using BuildMongooseSubscriptionFilter.
 *
 * In a real NestJS resolver, this logic would be in a @Subscription() decorator's filter option.
 * This example shows how to use the subscription filter builder to create server-side
 * filtering for subscription payloads.
 *
 * @param payload - The subscription payload containing the order document
 * @param filter - Optional GraphQL filter input to apply to the subscription
 * @returns Boolean indicating whether the payload should be emitted to the subscriber.
 *          Returns true if the order matches all filter criteria or no filter is specified.
 *          Returns false if the order does not match the filter criteria.
 *
 * @example
 * ```typescript
 * // Usage in a subscription resolver:
 * @Subscription(() => Order, {
 *   name: 'OrderUpdated',
 *   description: 'Subscribe to order updates with optional filtering',
 *   filter: (payload: OrderUpdatePayload, args: any): boolean => {
 *     return exampleOrderSubscriptionFilter(payload, args.filter);
 *   },
 *   resolve: (payload: OrderUpdatePayload): Order => payload.order,
 * })
 * async orderUpdated(
 *   @Args('filter', { nullable: true }) filter?: IOrderFilterInput,
 * ): Promise<AsyncIterator<OrderUpdatePayload>> {
 *   return this.orderService.subscribeToUpdates();
 * }
 *
 * // GraphQL subscription - Filter by specific status:
 * // subscription {
 * //   orderUpdated(filter: { Status: { Eq: "pending" } }) {
 * //     id
 * //     status
 * //     totalAmount
 * //   }
 * // }
 * // Result: Only updates for orders with status "pending" are emitted
 *
 * // GraphQL subscription - Filter by customer:
 * // subscription {
 * //   orderUpdated(filter: { CustomerId: { Eq: "customer-123" } }) {
 * //     id
 * //     status
 * //     customerId
 * //   }
 * // }
 * // Result: Only updates for orders from customer-123 are emitted
 *
 * // GraphQL subscription - Filter by amount range:
 * // subscription {
 * //   orderUpdated(filter: { TotalAmount: { Gte: 100, Lte: 1000 } }) {
 * //     id
 * //     status
 * //     totalAmount
 * //   }
 * // }
 * // Result: Only updates for orders with amounts between $100 and $1000 are emitted
 *
 * // GraphQL subscription - Multiple filters (implicitly AND'd):
 * // subscription {
 * //   orderUpdated(filter: {
 * //     Status: { Eq: "pending" }
 * //     CustomerId: { Eq: "customer-123" }
 * //   }) {
 * //     id
 * //     status
 * //     customerId
 * //   }
 * // }
 * // Result: Only pending orders from customer-123 are emitted
 * ```
 */
export function exampleOrderSubscriptionFilter(
	payload: OrderUpdatePayload,
	filter?: IOrderFilterInput,
): boolean {
	// Create a filter predicate function from the GraphQL filter input
	// The predicate function tests documents in-memory using MongoDB query semantics
	const filterFn = BuildMongooseSubscriptionFilter<Order>(
		filter as Record<string, unknown> | undefined,
		OrderFilterSchema,
	);

	// Apply the filter predicate to the payload's order document
	// Returns true if the order matches all filter criteria (or no filter is specified)
	// Returns false if the order does not match
	return filterFn(payload.order);
}

/**
 * Usage scenarios for BuildMongooseSubscriptionFilter:
 *
 * 1. No filter (accepts all updates):
 *    Filter: undefined or null
 *    All order updates are emitted to the subscriber
 *
 * 2. Filter by specific status:
 *    Filter: { Status: { Eq: 'pending' } }
 *    Only emits orders with status "pending"
 *
 * 3. Filter by customer:
 *    Filter: { CustomerId: { Eq: 'customer-123' } }
 *    Only emits orders for a specific customer
 *
 * 4. Filter by amount range:
 *    Filter: { TotalAmount: { Gte: 100, Lte: 1000 } }
 *    Only emits orders with amounts between $100 and $1000
 *
 * 5. Multiple conditions (implicitly AND'd):
 *    Filter: { Status: { Eq: 'pending' }, CustomerId: { Eq: 'customer-123' } }
 *    Emits only pending orders from the specific customer
 *
 * How it works:
 * - BuildMongooseSubscriptionFilter translates the GraphQL filter input into a
 *   MongoDB query using BuildMongooseFilter internally
 * - It returns a predicate function that tests documents in-memory
 * - The predicate is called for each payload before emission
 * - If true, the payload is emitted to the subscriber
 * - If false, the payload is filtered out (not emitted)
 * - This server-side filtering reduces data transfer and client-side processing
 *
 * Supported operators:
 * - Scalar: $eq, $ne, $in, $nin, $gte, $lte, $gt, $lt, $exists, $regex
 * - Array: $all, $size, $elemMatch
 * - Logical: $and, $or
 */

/**
 * Example filter usage scenarios for subscriptions:
 *
 * 1. Filter by specific status:
 *    Filter: { Status: { Eq: 'pending' } }
 *    Only emits orders with status "pending"
 *
 * 2. Filter by customer:
 *    Filter: { CustomerId: { Eq: 'customer-123' } }
 *    Only emits orders for a specific customer
 *
 * 3. Filter by amount range:
 *    Filter: { TotalAmount: { Gte: 100, Lte: 1000 } }
 *    Only emits orders with amounts between $100 and $1000
 *
 * 4. Multiple conditions (implicitly AND'd):
 *    Filter: { Status: { Eq: 'pending' }, CustomerId: { Eq: 'customer-123' } }
 *    Emits only pending orders for the specific customer
 *
 * 5. No filter (accepts all updates):
 *    Filter: undefined or null
 *    All order updates are emitted to the subscriber
 *
 * How it works:
 * - BuildMongooseSubscriptionFilter translates the GraphQL filter input into a
 *   MongoDB query using BuildMongooseFilter
 * - The resulting filter function is called for each payload before emission
 * - If the filter function returns true, the payload is emitted to the subscriber
 * - If the filter function returns false, the payload is filtered out
 * - This server-side filtering reduces data transfer and client-side processing
 */

/**
 * Advanced example: Using complex filters with logical operators
 *
 * For subscriptions that need more complex filtering logic, you can use
 * logical operators (And, Or) in the filter:
 *
 * ```typescript
 * // Subscription call with complex filter
 * subscription {
 *   orderUpdated(filter: {
 *     Or: [
 *       { Status: { Eq: "pending" } }
 *       { Status: { Eq: "processing" } }
 *     ]
 *     TotalAmount: { Gte: 100 }
 *   }) {
 *     id
 *     status
 *     totalAmount
 *   }
 * }
 * ```
 *
 * This filter emits orders that are either "pending" OR "processing"
 * AND have a total amount >= 100.
 */
