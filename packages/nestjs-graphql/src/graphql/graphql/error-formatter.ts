import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { AppLogger } from '@pawells/nestjs-shared/common';
import { GraphQLErrorCode } from './error-codes.js';
import { ErrorClassifier } from '../errors/error-classifier.js';

/**
 * GraphQL Error Formatter
 *
 * Formats GraphQL errors for consistent client responses.
 * Removes sensitive internal information and provides user-friendly messages.
 */
export class GraphQLErrorFormatter {
	private static readonly Logger: AppLogger = new AppLogger(undefined, GraphQLErrorFormatter.name);

	/**
	 * Formats a GraphQL error for client response
	 *
	 * @param error - The original GraphQL error
	 * @param context - Optional request context with user and operation information
	 * @returns Formatted error object
	 */
	public static FormatError(error: GraphQLError, context?: unknown): GraphQLFormattedError {
		const { originalError } = error;

		// Handle custom application errors
		if (originalError && this.IsApplicationError(originalError)) {
			return this.FormatApplicationError(error, originalError, context);
		}

		// Handle validation errors
		if (originalError && this.IsValidationError(originalError)) {
			return this.FormatValidationError(error, originalError, context);
		}

		// Handle authentication errors
		if (originalError && this.IsAuthenticationError(originalError)) {
			return this.FormatAuthenticationError(error, context);
		}

		// Handle authorization errors
		if (originalError && this.IsAuthorizationError(originalError)) {
			return this.FormatAuthorizationError(error, context);
		}

		// Handle rate limiting errors
		if (originalError && this.IsRateLimitError(originalError)) {
			return this.FormatRateLimitError(error, context);
		}

		// Default error formatting
		return this.FormatGenericError(error, context);
	}

	/**
	 * Checks if error is an application-specific error
	 */
	private static IsApplicationError(error: unknown): error is { code: GraphQLErrorCode; message: string; details?: unknown } {
		return typeof error === 'object' && error !== null && 'code' in error && Object.values(GraphQLErrorCode).includes((error as any).code);
	}

	/**
	 * Checks if error is a validation error using ErrorClassifier
	 */
	private static IsValidationError(error: unknown): boolean {
		const Classification = ErrorClassifier.Classify(error);
		return Classification.isValidation;
	}

	/**
	 * Checks if error is an authentication error using ErrorClassifier
	 */
	private static IsAuthenticationError(error: unknown): boolean {
		const Classification = ErrorClassifier.Classify(error);
		return Classification.isAuthentication;
	}

	/**
	 * Checks if error is an authorization error using ErrorClassifier
	 */
	private static IsAuthorizationError(error: unknown): boolean {
		const Classification = ErrorClassifier.Classify(error);
		return Classification.isAuthorization;
	}

	/**
	 * Checks if error is a rate limit error using ErrorClassifier
	 */
	private static IsRateLimitError(error: unknown): boolean {
		const Classification = ErrorClassifier.Classify(error);
		return Classification.isRateLimit;
	}

	/**
	 * Formats application-specific errors
	 */
	private static FormatApplicationError(_error: GraphQLError, originalError: unknown, context?: unknown): GraphQLFormattedError {
		const ErrorWithCode = originalError as any;
		this.Logger.warn(`Application error: ${ErrorWithCode.message}`, ErrorWithCode.stack);

		return {
			message: ErrorWithCode.message ?? 'An error occurred',
			extensions: {
				code: ErrorWithCode.code ?? GraphQLErrorCode.INTERNAL_ERROR,
				timestamp: new Date().toISOString(),
				...(ErrorWithCode.details && { details: ErrorWithCode.details }),
				...(this.GetOperationName(context) && { operationName: this.GetOperationName(context) }),
			},
		};
	}

	/**
	 * Formats validation errors
	 */
	private static FormatValidationError(_error: GraphQLError, originalError: unknown, context?: unknown): GraphQLFormattedError {
		const ValidationErrors = this.ExtractValidationErrors(originalError);

		return {
			message: 'Validation failed',
			extensions: {
				code: GraphQLErrorCode.BAD_USER_INPUT,
				timestamp: new Date().toISOString(),
				validationErrors: ValidationErrors,
				...(this.GetOperationName(context) && { operationName: this.GetOperationName(context) }),
			},
		};
	}

	/**
	 * Formats authentication errors
	 */
	private static FormatAuthenticationError(_error: GraphQLError, context?: unknown): GraphQLFormattedError {
		return {
			message: 'Authentication required',
			extensions: {
				code: GraphQLErrorCode.UNAUTHENTICATED,
				timestamp: new Date().toISOString(),
				...(this.GetOperationName(context) && { operationName: this.GetOperationName(context) }),
			},
		};
	}

	/**
	 * Formats authorization errors
	 */
	private static FormatAuthorizationError(_error: GraphQLError, context?: unknown): GraphQLFormattedError {
		return {
			message: 'Access denied',
			extensions: {
				code: GraphQLErrorCode.FORBIDDEN,
				timestamp: new Date().toISOString(),
				...(this.GetOperationName(context) && { operationName: this.GetOperationName(context) }),
			},
		};
	}

	/**
	 * Formats rate limit errors
	 */
	private static FormatRateLimitError(_error: GraphQLError, context?: unknown): GraphQLFormattedError {
		return {
			message: 'Rate limit exceeded',
			extensions: {
				code: GraphQLErrorCode.RATE_LIMIT_EXCEEDED,
				timestamp: new Date().toISOString(),
				...(this.GetOperationName(context) && { operationName: this.GetOperationName(context) }),
			},
		};
	}

	/**
	 * Formats generic/unexpected errors
	 */
	private static FormatGenericError(error: GraphQLError, context?: unknown): GraphQLFormattedError {
		// Log internal errors for debugging
		this.Logger.error(`GraphQL Error: ${error.message}`, error.stack);

		const OriginalError = error.originalError as any;
		const StatusCode = OriginalError?.getStatus?.() ?? OriginalError?.status ?? OriginalError?.statusCode;

		// Don't expose internal error details to client
		return {
			message: 'An unexpected error occurred',
			extensions: {
				code: GraphQLErrorCode.INTERNAL_ERROR,
				timestamp: new Date().toISOString(),
				...(StatusCode !== undefined && { statusCode: StatusCode }),
				...(this.GetUserId(context) && { userId: this.GetUserId(context) }),
				...(this.GetOperationName(context) && { operationName: this.GetOperationName(context) }),
			},
		};
	}

	/**
	 * Extracts validation errors from various formats
	 */
	private static ExtractValidationErrors(error: unknown): unknown[] {
		const ErrorAny = error as any;
		
		if (Array.isArray(ErrorAny.errors)) {
			// Class-validator errors - errors is an array of ValidationError objects
			return ErrorAny.errors.map((fieldError: any) => ({
				field: fieldError.property,
				constraints: fieldError.constraints,
			}));
		}

		if (Array.isArray(ErrorAny)) {
			return ErrorAny;
		}

		return [{
			message: ErrorAny.message ?? 'Validation failed',
		}];
	}

	/**
	 * Safely extracts operation name from context
	 */
	private static GetOperationName(context: unknown): string | undefined {
		if (typeof context === 'object' && context !== null && 'operationName' in context) {
			return (context as any).operationName;
		}
		return undefined;
	}

	/**
	 * Safely extracts user ID from context
	 */
	private static GetUserId(context: unknown): string | number | undefined {
		if (typeof context === 'object' && context !== null && 'user' in context) {
			const user = (context as any).user;
			if (typeof user === 'object' && user !== null && 'id' in user) {
				return user.id;
			}
		}
		return undefined;
	}
}
