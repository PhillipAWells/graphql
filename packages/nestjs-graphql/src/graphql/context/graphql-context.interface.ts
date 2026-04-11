import { Request, Response } from 'express';
import type { IGraphQLUser } from '../graphql/types/graphql-safety.types.js';

/**
 * GraphQL Context Interface
 *
 * Defines the structure of the GraphQL execution context.
 * Contains request/response objects, user information, and
 * other contextual data available to resolvers.
 */
export interface IGraphQLContext {
	/**
	 * HTTP request object
	 */
	req: Request;

	/**
	 * HTTP response object
	 */
	res: Response;

	/**
	 * Authenticated user information
	 * Type-safe user interfaces should be defined in application code.
	 * For type-safe access, use IGraphQLContextExtended from graphql-safety.types.ts
	 */
	user?: IGraphQLUser;

	/**
	 * Request ID for tracing
	 */
	requestId: string;

	/**
	 * Request start time
	 */
	startTime: Date;

	/**
	 * Custom context data
	 */
	[key: string]: unknown;
}

/**
 * WebSocket Context Interface
 *
 * Extended context for WebSocket connections (subscriptions)
 */
export interface IWebSocketContext extends IGraphQLContext {
	/**
	 * WebSocket connection information
	 */
	connection: {
		/**
		 * Connection ID
		 */
		id: string;

		/**
		 * Connection establishment time
		 */
		connectedAt: Date;

		/**
		 * Connection parameters
		 */
		params?: Record<string, unknown>;
	};

	/**
	 * Subscription-specific data
	 */
	subscription?: {
		/**
		 * Subscription ID
		 */
		id: string;

		/**
		 * Subscription operation name
		 */
		operationName?: string;

		/**
		 * Subscription variables
		 */
		variables?: Record<string, unknown>;
	};
}

/**
 * Context Factory Options
 */
export interface IContextFactoryOptions {
	/**
	 * Whether to include request tracing
	 * @default true
	 */
	enableTracing?: boolean;

	/**
	 * Custom context enhancers
	 */
	contextEnhancers?: Array<(context: IGraphQLContext) => Promise<void> | void>;

	/**
	 * Request ID generator function
	 */
	requestIdGenerator?: () => string;
}
