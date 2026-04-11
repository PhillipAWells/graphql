import { GraphqlError } from './graphql-error.js';

/**
 * Rate Limit Error
 *
 * Represents a 429 Too Many Requests error in GraphQL operations.
 * Used when rate limiting is exceeded.
 *
 * @example
 * ```typescript
 * throw new RateLimitError('Rate limit exceeded', { retryAfter: 60 });
 * ```
 */
export class RateLimitError extends GraphqlError {
	/**
	 * Creates a new Rate Limit error
	 *
	 * @param message - The error message
	 * @param context - Additional context information
	 */
	constructor(message = 'Rate limit exceeded', context?: Record<string, unknown>) {
		const Options: { code: string; statusCode: number; context: Record<string, unknown> | undefined } = {
			code: 'RATE_LIMIT_EXCEEDED',
			statusCode: 429,
			context: context ?? undefined,
		};
		super(message, Options);
	}
}
