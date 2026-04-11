import { GraphqlError } from './graphql-error.js';

/**
 * Conflict Error
 *
 * Represents a 409 Conflict error in GraphQL operations.
 * Used when an operation conflicts with the current state.
 *
 * @example
 * ```typescript
 * throw new ConflictError('IUser already exists');
 * ```
 */
export class ConflictError extends GraphqlError {
	constructor(message = 'Resource conflict', context?: Record<string, unknown>) {
		const Options: { code: string; statusCode: number; context: Record<string, unknown> | undefined } = {
			code: 'CONFLICT',
			statusCode: 409,
			context: context ?? undefined,
		};
		super(message, Options);
	}
}
