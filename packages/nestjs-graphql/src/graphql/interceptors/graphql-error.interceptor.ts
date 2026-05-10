import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable, catchError, throwError } from 'rxjs';
import { GraphQLError } from 'graphql';
import type { ILazyModuleRefService, IContextualLogger } from '@pawells/nestjs-shared/common';
import { AppLogger, getErrorMessage, getErrorStack } from '@pawells/nestjs-shared/common';
import { ErrorClassifier } from '../errors/error-classifier.js';

/**
 * GraphQL Error Interceptor
 *
 * Catches and formats errors from GraphQL operations.
 * Adds error codes, context information, and proper error logging.
 *
 * @example
 * ```typescript
 * @UseInterceptors(GraphQLErrorInterceptor)
 * @Query(() => User, { name: 'GetUser' })
 * async getUser(): Promise<User> {
 *   // Errors from this resolver will be properly formatted
 * }
 * ```
 */
@Injectable()
export class GraphQLErrorInterceptor implements NestInterceptor, ILazyModuleRefService {
	public readonly Module: ModuleRef;

	public get AppLogger(): AppLogger {
		return this.Module.get(AppLogger, { strict: false });
	}

	private get Logger(): IContextualLogger {
		return this.AppLogger.createContextualLogger(GraphQLErrorInterceptor.name);
	}

	constructor(moduleRef: ModuleRef) {
		this.Module = moduleRef;
	}

	/**
	 * Intercepts GraphQL operations for error handling
	 *
	 * @param context - The execution context
	 * @param next - The call handler
	 * @returns Observable - The intercepted operation
	 */
	public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		// Extract GraphQL context
		const GqlContext = GqlExecutionContext.create(context);
		const Info = GqlContext.getInfo();

		// Extract operation details for error context
		const OperationName = Info?.operation?.name?.value ?? 'Anonymous';
		const OperationType = Info?.operation?.operation ?? 'unknown';
		const FieldName = Info?.fieldName ?? 'unknown';

		return next.handle().pipe(
			catchError((error) => {
				// Log the error with context
				this.Logger?.error(
					`GraphQL ${OperationType} error in ${OperationName}.${FieldName}: ${getErrorMessage(error)}`,
				);

				// Format the error for GraphQL response
				const FormattedError = this.FormatError(error, OperationType, OperationName, FieldName);

				// Re-throw as GraphQLError
				return throwError(() => FormattedError);
			}),
		);
	}

	/**
	 * Formats errors for GraphQL responses
	 *
	 * @param error - The original error
	 * @param operationType - The GraphQL operation type
	 * @param operationName - The operation name
	 * @param fieldName - The field name
	 * @returns GraphQLError - The formatted GraphQL error
	 */
	private FormatError(
		error: unknown,
		operationType: string,
		operationName: string,
		fieldName: string,
	): GraphQLError {
		// If it's already a GraphQLError, return it
		if (error instanceof GraphQLError) {
			return error;
		}

		// Determine error code and message
		const { code, message, statusCode } = this.CategorizeError(error);

		// Create extensions with additional context
		const Extensions = {
			code,
			statusCode,
			operation: {
				type: operationType,
				name: operationName,
				field: fieldName,
			},
			timestamp: new Date().toISOString(),
			// Include stack trace in development
			...(process.env['NODE_ENV'] !== 'production'
				? { stacktrace: getErrorStack(error) }
				: {}),
		};

		// Create new GraphQLError with formatted message
		return new GraphQLError(message, {
			extensions: Extensions,
			originalError: error instanceof Error ? error : undefined,
		});
	}

	/**
	 * Categorizes errors and determines appropriate codes and messages
	 * Uses ErrorClassifier for consistent classification across the application
	 *
	 * @param error - The original error
	 * @returns object - Error categorization result
	 */
	private CategorizeError(error: unknown): { code: string; message: string; statusCode: number } {
		const Classification = ErrorClassifier.Classify(error);

		// In production, use generic message for internal errors; in development, expose actual error
		const Message = Classification.code === 'INTERNAL_ERROR' && process.env['NODE_ENV'] === 'production'
			? Classification.message
			: Classification.code === 'INTERNAL_ERROR'
				? getErrorMessage(error)
				: Classification.message;

		return {
			code: Classification.code,
			message: Message,
			statusCode: Classification.statusCode,
		};
	}
}
