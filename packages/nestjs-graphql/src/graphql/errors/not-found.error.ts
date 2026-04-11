import { GraphqlError } from './graphql-error.js';

/**
 * Not Found Error
 *
 * Represents a 404 Not Found error in GraphQL operations.
 * Used when a requested resource cannot be found.
 *
 * @example
 * ```typescript
 * throw new NotFoundError('IUser not found', { userId: '123' });
 * ```
 */
export class NotFoundError extends GraphqlError {
	/**
	 * Creates a new Not Found error
	 *
	 * @param message - The error message
	 * @param context - Additional context information
	 */
	constructor(message = 'Resource not found', context?: Record<string, unknown>) {
		const Options: { code: string; statusCode: number; context: Record<string, unknown> | undefined } = {
			code: 'NOT_FOUND',
			statusCode: 404,
			context: context ?? undefined,
		};
		super(message, Options);
	}
}
