import { Injectable } from '@nestjs/common';
import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { AppLogger } from '@pawells/nestjs-shared/common';
import { GraphQLErrorCode } from './error-codes.js';
import { ErrorClassifier } from '../errors/error-classifier.js';

/**
 * GraphQL Error Formatter
 *
 * Formats GraphQL errors for consistent client responses.
 * Removes sensitive internal information and provides user-friendly messages.
 *
 * Now an injectable service to avoid static logger instantiation.
 */
@Injectable()
export class GraphQLErrorFormatter {
	private readonly Logger: AppLogger;

	constructor() {
		this.Logger = new AppLogger(undefined, GraphQLErrorFormatter.name);
	}

	/**
	 * Formats a GraphQL error for client response
	 *
	 * @param error - The original GraphQL error
	 * @param context - Optional request context with user and operation information
	 * @returns Formatted error object
	 */
	public FormatError(error: GraphQLError, context?: unknown): GraphQLFormattedError {
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
	private IsApplicationError(error: unknown): error is { code: GraphQLErrorCode; message: string; details?: unknown } {
		return typeof error === 'object' && error !== null && 'code' in error && Object.values(GraphQLErrorCode).includes((error as { code: unknown }).code as GraphQLErrorCode);
	}

	/**
	 * Checks if error is a validation error using ErrorClassifier
	 */
	private IsValidationError(error: unknown): boolean {
		const Classification = ErrorClassifier.Classify(error);
		return Classification.isValidation;
	}

	/**
	 * Checks if error is an authentication error using ErrorClassifier
	 */
	private IsAuthenticationError(error: unknown): boolean {
		const Classification = ErrorClassifier.Classify(error);
		return Classification.isAuthentication;
	}

	/**
	 * Checks if error is an authorization error using ErrorClassifier
	 */
	private IsAuthorizationError(error: unknown): boolean {
		const Classification = ErrorClassifier.Classify(error);
		return Classification.isAuthorization;
	}

	/**
	 * Checks if error is a rate limit error using ErrorClassifier
	 */
	private IsRateLimitError(error: unknown): boolean {
		const Classification = ErrorClassifier.Classify(error);
		return Classification.isRateLimit;
	}

	/**
	 * Formats application-specific errors
	 */
	private FormatApplicationError(_error: GraphQLError, originalError: unknown, context?: unknown): GraphQLFormattedError {
		const ErrorWithCode = originalError as { message?: string; code?: string; stack?: string; details?: unknown };
		this.Logger.warn(`Application error: ${ErrorWithCode.message}`, ErrorWithCode.stack);

		const OpName = this.GetOperationName(context);
		return {
			message: ErrorWithCode.message ?? 'An error occurred',
			extensions: {
				code: ErrorWithCode.code ?? GraphQLErrorCode.INTERNAL_ERROR,
				timestamp: new Date().toISOString(),
				...(ErrorWithCode.details !== undefined && { details: ErrorWithCode.details }),
				...(OpName && { operationName: OpName }),
			},
		};
	}

	/**
	 * Formats validation errors
	 */
	private FormatValidationError(_error: GraphQLError, originalError: unknown, context?: unknown): GraphQLFormattedError {
		const ValidationErrors = this.ExtractValidationErrors(originalError);
		const OpName = this.GetOperationName(context);

		return {
			message: 'Validation failed',
			extensions: {
				code: GraphQLErrorCode.BAD_USER_INPUT,
				timestamp: new Date().toISOString(),
				validationErrors: ValidationErrors,
				...(OpName && { operationName: OpName }),
			},
		};
	}

	/**
	 * Formats authentication errors
	 */
	private FormatAuthenticationError(_error: GraphQLError, context?: unknown): GraphQLFormattedError {
		const OpName = this.GetOperationName(context);
		return {
			message: 'Authentication required',
			extensions: {
				code: GraphQLErrorCode.UNAUTHENTICATED,
				timestamp: new Date().toISOString(),
				...(OpName && { operationName: OpName }),
			},
		};
	}

	/**
	 * Formats authorization errors
	 */
	private FormatAuthorizationError(_error: GraphQLError, context?: unknown): GraphQLFormattedError {
		const OpName = this.GetOperationName(context);
		return {
			message: 'Access denied',
			extensions: {
				code: GraphQLErrorCode.FORBIDDEN,
				timestamp: new Date().toISOString(),
				...(OpName && { operationName: OpName }),
			},
		};
	}

	/**
	 * Formats rate limit errors
	 */
	private FormatRateLimitError(_error: GraphQLError, context?: unknown): GraphQLFormattedError {
		const OpName = this.GetOperationName(context);
		return {
			message: 'Rate limit exceeded',
			extensions: {
				code: GraphQLErrorCode.RATE_LIMIT_EXCEEDED,
				timestamp: new Date().toISOString(),
				...(OpName && { operationName: OpName }),
			},
		};
	}

	/**
	 * Formats generic/unexpected errors
	 */
	private FormatGenericError(error: GraphQLError, context?: unknown): GraphQLFormattedError {
		// Log internal errors for debugging
		this.Logger.error(`GraphQL Error: ${error.message}`, error.stack);

		const OriginalError = error.originalError as { getStatus?: () => number; status?: number; statusCode?: number } | null | undefined;
		const StatusCode = OriginalError?.getStatus?.() ?? OriginalError?.status ?? OriginalError?.statusCode;
		const UserId = this.GetUserId(context);
		const OpName = this.GetOperationName(context);

		// Don't expose internal error details to client
		return {
			message: 'An unexpected error occurred',
			extensions: {
				code: GraphQLErrorCode.INTERNAL_ERROR,
				timestamp: new Date().toISOString(),
				...(StatusCode !== undefined && { statusCode: StatusCode }),
				...(UserId && { userId: UserId }),
				...(OpName && { operationName: OpName }),
			},
		};
	}

	/**
	 * Extracts validation errors from various formats
	 */
	private ExtractValidationErrors(error: unknown): unknown[] {
		const ErrorAny = error as Record<string, unknown>;

		if (Array.isArray(ErrorAny.errors)) {
			// Class-validator errors - errors is an array of ValidationError objects
			return ErrorAny.errors.map((fieldError: { property: string; constraints?: Record<string, string> }) => ({
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
	private GetOperationName(context: unknown): string | undefined {
		if (typeof context === 'object' && context !== null && 'operationName' in context) {
			return (context as { operationName: unknown }).operationName as string | undefined;
		}
		return undefined;
	}

	/**
	 * Safely extracts user ID from context
	 */
	private GetUserId(context: unknown): string | number | undefined {
		if (typeof context === 'object' && context !== null && 'user' in context) {
			const { user } = (context as { user: unknown });
			if (typeof user === 'object' && user !== null && 'id' in user) {
				return (user as { id: string | number }).id;
			}
		}
		return undefined;
	}
}
