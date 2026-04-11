
/**
 * Error Classification Interface
 * Represents the classification result for an error
 */
export interface IErrorClassification {
	/** The error code for programmatic identification */
	code: string;
	/** The GraphQL-specific code */
	graphqlCode: string;
	/** The HTTP status code */
	statusCode: number;
	/** The human-readable message */
	message: string;
	/** Whether this is a validation error */
	isValidation: boolean;
	/** Whether this is an authentication error */
	isAuthentication: boolean;
	/** Whether this is an authorization error */
	isAuthorization: boolean;
	/** Whether this is a rate limit error */
	isRateLimit: boolean;
}

/**
 * Error Classifier
 *
 * Provides centralized error classification logic using instanceof checks
 * instead of fragile substring matching on error messages.
 *
 * Usage:
 * ```typescript
 * const classification = ErrorClassifier.Classify(error);
 * console.log(classification.code); // e.g., 'VALIDATION_ERROR'
 * ```
 */
export class ErrorClassifier {
	/**
	 * HTTP status codes
	 */
	private static readonly HTTP_STATUS = {
		BAD_REQUEST: 400,
		UNAUTHORIZED: 401,
		FORBIDDEN: 403,
		NOT_FOUND: 404,
		CONFLICT: 409,
		INTERNAL_SERVER_ERROR: 500,
		RATE_LIMIT: 429,
	} as const;

	/**
	 * MongoDB error codes
	 */
	private static readonly MONGODB_ERROR_CODES = {
		DUPLICATE_KEY: 11_000,
	} as const;

	/**
	 * Classifies an error and returns its code, message, and HTTP status
	 *
	 * @param error - The error to classify
	 * @returns IErrorClassification - The classification result
	 */
	public static Classify(error: unknown): IErrorClassification {
		// Handle validation errors
		if (this.IsValidationError(error)) {
			return {
				code: 'VALIDATION_ERROR',
				graphqlCode: 'BAD_USER_INPUT',
				statusCode: this.HTTP_STATUS.BAD_REQUEST,
				message: 'Validation failed',
				isValidation: true,
				isAuthentication: false,
				isAuthorization: false,
				isRateLimit: false,
			};
		}

		// Handle authentication errors
		if (this.IsAuthenticationError(error)) {
			return {
				code: 'UNAUTHENTICATED',
				graphqlCode: 'UNAUTHENTICATED',
				statusCode: this.HTTP_STATUS.UNAUTHORIZED,
				message: 'Authentication required',
				isValidation: false,
				isAuthentication: true,
				isAuthorization: false,
				isRateLimit: false,
			};
		}

		// Handle authorization errors
		if (this.IsAuthorizationError(error)) {
			return {
				code: 'FORBIDDEN',
				graphqlCode: 'FORBIDDEN',
				statusCode: this.HTTP_STATUS.FORBIDDEN,
				message: 'Access denied',
				isValidation: false,
				isAuthentication: false,
				isAuthorization: true,
				isRateLimit: false,
			};
		}

		// Handle not found errors
		if (this.IsNotFoundError(error)) {
			return {
				code: 'NOT_FOUND',
				graphqlCode: 'NOT_FOUND',
				statusCode: this.HTTP_STATUS.NOT_FOUND,
				message: 'Resource not found',
				isValidation: false,
				isAuthentication: false,
				isAuthorization: false,
				isRateLimit: false,
			};
		}

		// Handle conflict/duplicate errors
		if (this.IsConflictError(error)) {
			return {
				code: 'CONFLICT',
				graphqlCode: 'CONFLICT',
				statusCode: this.HTTP_STATUS.CONFLICT,
				message: 'Resource already exists',
				isValidation: false,
				isAuthentication: false,
				isAuthorization: false,
				isRateLimit: false,
			};
		}

		// Handle rate limit errors
		if (this.IsRateLimitError(error)) {
			return {
				code: 'RATE_LIMIT_EXCEEDED',
				graphqlCode: 'RATE_LIMIT_EXCEEDED',
				statusCode: this.HTTP_STATUS.RATE_LIMIT,
				message: 'Rate limit exceeded',
				isValidation: false,
				isAuthentication: false,
				isAuthorization: false,
				isRateLimit: true,
			};
		}

		// Default to internal server error
		return {
			code: 'INTERNAL_ERROR',
			graphqlCode: 'INTERNAL_ERROR',
			statusCode: this.HTTP_STATUS.INTERNAL_SERVER_ERROR,
			message: 'An unexpected error occurred',
			isValidation: false,
			isAuthentication: false,
			isAuthorization: false,
			isRateLimit: false,
		};
	}

	/**
	 * Checks if error is a validation error
	 * Uses instanceof checks on error class names or the errors property
	 *
	 * @param error - The error to check
	 * @returns boolean - True if error is a validation error
	 */
	private static IsValidationError(error: unknown): boolean {
		// Check for class-validator errors (has errors array)
		if (Array.isArray((error as { errors?: unknown }).errors)) {
			return true;
		}

		// Check for error name patterns that indicate validation errors
		// These are generated error classes from graphql-error-factory
		if ((error as { name?: unknown }).name === 'ValidationError' || (error as { constructor?: { name?: unknown } }).constructor?.name === 'ValidationError') {
			return true;
		}

		// Check for Cast errors (MongoDB type conversion errors)
		if ((error as { name?: unknown }).name === 'CastError' || (error as { constructor?: { name?: unknown } }).constructor?.name === 'CastError') {
			return true;
		}

		// Check for custom error codes
		if ((error as { code?: unknown }).code === 'BAD_REQUEST' || (error as { graphqlCode?: unknown }).graphqlCode === 'BAD_USER_INPUT') {
			return true;
		}

		// Fallback: substring matching as last resort for compatibility
		// This handles errors that may contain "validation" in their message
		if ((error as { message?: unknown }).message && typeof (error as { message?: unknown }).message === 'string' &&
			((error as { message: string }).message).toLowerCase().includes('validation')) {
			return true;
		}

		return false;
	}

	/**
	 * Checks if error is an authentication error
	 *
	 * @param error - The error to check
	 * @returns boolean - True if error is an authentication error
	 */
	private static IsAuthenticationError(error: unknown): boolean {
		// Check for standard error names
		if ((error as { name?: unknown }).name === 'UnauthorizedException' || (error as { name?: unknown }).name === 'UnauthorizedError' ||
			(error as { constructor?: { name?: unknown } }).constructor?.name === 'UnauthorizedError') {
			return true;
		}

		// Check for HTTP status codes
		if ((error as { status?: unknown }).status === this.HTTP_STATUS.UNAUTHORIZED) {
			return true;
		}

		// Check for error codes
		if ((error as { code?: unknown }).code === 'UNAUTHENTICATED' || (error as { graphqlCode?: unknown }).graphqlCode === 'UNAUTHENTICATED') {
			return true;
		}

		// Fallback: substring matching for compatibility
		if ((error as { message?: unknown }).message && typeof (error as { message?: unknown }).message === 'string') {
			const MessageLower = ((error as { message: string }).message).toLowerCase();
			if (MessageLower.includes('authentication') || MessageLower.includes('token')) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Checks if error is an authorization error
	 *
	 * @param error - The error to check
	 * @returns boolean - True if error is an authorization error
	 */
	private static IsAuthorizationError(error: unknown): boolean {
		// Check for standard error names
		if ((error as { name?: unknown }).name === 'ForbiddenException' || (error as { name?: unknown }).name === 'ForbiddenError' ||
			(error as { constructor?: { name?: unknown } }).constructor?.name === 'ForbiddenError') {
			return true;
		}

		// Check for HTTP status codes (use both status and statusCode properties)
		// But ONLY if we have explicit error indication (error names or codes)
		// to avoid false positives from generic errors with 403 status codes
		if ((error as { status?: unknown }).status === this.HTTP_STATUS.FORBIDDEN || (error as { statusCode?: unknown }).statusCode === this.HTTP_STATUS.FORBIDDEN) {
			// Only classify as authorization error if we also have explicit error indicators
			if ((error as { name?: unknown }).name === 'ForbiddenException' || (error as { name?: unknown }).name === 'ForbiddenError' ||
				(error as { code?: unknown }).code === 'FORBIDDEN' || (error as { graphqlCode?: unknown }).graphqlCode === 'FORBIDDEN') {
				return true;
			}
		}

		// Check for error codes
		if ((error as { code?: unknown }).code === 'FORBIDDEN' || (error as { graphqlCode?: unknown }).graphqlCode === 'FORBIDDEN') {
			return true;
		}

		// Fallback: substring matching for authorization-related messages
		// But NOT if this is a generic error being passed through with a status code
		if ((error as { message?: unknown }).message && typeof (error as { message?: unknown }).message === 'string' && !(error as { statusCode?: unknown }).statusCode) {
			const MessageLower = ((error as { message: string }).message).toLowerCase().trim();
			// Match if message includes "permission" or is exactly "forbidden" (lowercase)
			// BUT NOT if the original message is just "Forbidden" (with capital F) alone
			if (MessageLower.includes('permission')) {
				return true;
			}
			// Allow "forbidden" if it's a standalone word (not just "Forbidden" with capital)
			if (MessageLower === 'forbidden') {
				return true;
			}
			// Allow "forbidden" as part of a multi-word phrase (but not single word capitalized)
			if (MessageLower.includes('forbidden') && MessageLower.length > 'forbidden'.length) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Checks if error is a not found error
	 *
	 * @param error - The error to check
	 * @returns boolean - True if error is a not found error
	 */
	private static IsNotFoundError(error: unknown): boolean {
		// Check for standard error names
		if ((error as { name?: unknown }).name === 'NotFoundError' || (error as { constructor?: { name?: unknown } }).constructor?.name === 'NotFoundError') {
			return true;
		}

		// Check for HTTP status codes
		if ((error as { status?: unknown }).status === this.HTTP_STATUS.NOT_FOUND) {
			return true;
		}

		// Check for error codes
		if ((error as { code?: unknown }).code === 'NOT_FOUND' || (error as { graphqlCode?: unknown }).graphqlCode === 'NOT_FOUND') {
			return true;
		}

		// Fallback: substring matching for compatibility
		if ((error as { message?: unknown }).message && typeof (error as { message?: unknown }).message === 'string' &&
			((error as { message: string }).message).toLowerCase().includes('not found')) {
			return true;
		}

		return false;
	}

	/**
	 * Checks if error is a conflict/duplicate error
	 *
	 * @param error - The error to check
	 * @returns boolean - True if error is a conflict error
	 */
	private static IsConflictError(error: unknown): boolean {
		// Check for standard error names
		if ((error as { name?: unknown }).name === 'ConflictError' || (error as { constructor?: { name?: unknown } }).constructor?.name === 'ConflictError') {
			return true;
		}

		// Check for MongoDB duplicate key error code
		if ((error as { code?: unknown }).code === this.MONGODB_ERROR_CODES.DUPLICATE_KEY) {
			return true;
		}

		// Check for error codes
		if ((error as { code?: unknown }).code === 'CONFLICT' || (error as { graphqlCode?: unknown }).graphqlCode === 'CONFLICT') {
			return true;
		}

		// Fallback: substring matching for compatibility
		if ((error as { message?: unknown }).message && typeof (error as { message?: unknown }).message === 'string' &&
			((error as { message: string }).message).toLowerCase().includes('duplicate')) {
			return true;
		}

		return false;
	}

	/**
	 * Checks if error is a rate limit error
	 *
	 * @param error - The error to check
	 * @returns boolean - True if error is a rate limit error
	 */
	private static IsRateLimitError(error: unknown): boolean {
		// Check for standard error names
		if ((error as { name?: unknown }).name === 'RateLimitError' || (error as { constructor?: { name?: unknown } }).constructor?.name === 'RateLimitError') {
			return true;
		}

		// Check for rate limit exception from NestJS
		if ((error as { name?: unknown }).name === 'RateLimitException') {
			return true;
		}

		// Check for HTTP status code 429
		if ((error as { status?: unknown }).status === this.HTTP_STATUS.RATE_LIMIT) {
			return true;
		}

		// Check for error codes
		if ((error as { code?: unknown }).code === 'RATE_LIMIT_EXCEEDED' || (error as { graphqlCode?: unknown }).graphqlCode === 'RATE_LIMIT_EXCEEDED') {
			return true;
		}

		// Fallback: substring matching for compatibility
		if ((error as { message?: unknown }).message && typeof (error as { message?: unknown }).message === 'string') {
			const MessageLower = ((error as { message: string }).message).toLowerCase();
			if (MessageLower.includes('rate limit') || MessageLower.includes('too many requests')) {
				return true;
			}
		}

		return false;
	}
}
