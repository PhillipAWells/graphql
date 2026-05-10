import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable, tap } from 'rxjs';
import type { ILazyModuleRefService, IContextualLogger } from '@pawells/nestjs-shared/common';
import { AppLogger, getErrorMessage } from '@pawells/nestjs-shared/common';

const RESULT_SUMMARY_MAX_KEYS = 3;

/**
 * GraphQL Logging Interceptor
 *
 * Logs GraphQL operations including queries, mutations, and subscriptions.
 * Captures operation details, execution time, and user information.
 *
 * @example
 * ```typescript
 * @UseInterceptors(GraphQLLoggingInterceptor)
 * @Query(() => User, { name: 'GetUser' })
 * async getUser(): Promise<User> {
 *   // This operation will be logged
 * }
 * ```
 */
@Injectable()
export class GraphQLLoggingInterceptor implements NestInterceptor, ILazyModuleRefService {
	public readonly Module: ModuleRef;

	public get AppLogger(): AppLogger {
		return this.Module.get(AppLogger, { strict: false });
	}

	private get Logger(): IContextualLogger {
		return this.AppLogger.createContextualLogger(GraphQLLoggingInterceptor.name);
	}

	constructor(moduleRef: ModuleRef) {
		this.Module = moduleRef;
	}

	/**
	 * Intercepts GraphQL operations for logging
	 *
	 * @param context - The execution context
	 * @param next - The call handler
	 * @returns Observable - The intercepted operation
	 */
	public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const StartTime = Date.now();

		// Extract GraphQL context
		const GqlContext = GqlExecutionContext.create(context);
		const Info = GqlContext.getInfo();
		const Args = GqlContext.getArgs();

		// Extract operation details
		const OperationName = Info?.operation?.name?.value ?? 'Anonymous';
		const OperationType = Info?.operation?.operation ?? 'unknown';
		const FieldName = Info?.fieldName ?? 'unknown';

		// Extract user information
		const { user } = GqlContext.getContext();
		const UserId = user?.id ?? user?.sub ?? 'anonymous';

		// Log operation start
		this.Logger?.info(
			`GraphQL ${OperationType} started: ${OperationName}.${FieldName} by user ${UserId}`,
		);

		// Log variables in debug mode (avoid logging sensitive data in production)
		if (process.env['NODE_ENV'] !== 'production' && Args) {
			const SafeArgs = this.SanitizeArgs(Args);
			this.Logger?.debug(`Operation variables: ${JSON.stringify(SafeArgs)}`);
		}

		return next.handle().pipe(
			tap({
				next: (result) => {
					const Duration = Date.now() - StartTime;
					this.Logger?.info(
						`GraphQL ${OperationType} completed: ${OperationName}.${FieldName} in ${Duration}ms`,
					);

					// Log result summary in debug mode
					if (process.env['NODE_ENV'] !== 'production') {
						const ResultSummary = this.SummarizeResult(result);
						this.Logger?.debug(`Operation result: ${ResultSummary}`);
					}
				},
				error: (error) => {
					const Duration = Date.now() - StartTime;
					this.Logger?.error(
						`GraphQL ${OperationType} failed: ${OperationName}.${FieldName} after ${Duration}ms - ${getErrorMessage(error)}`,
					);
				},
			}),
		);
	}

	/**
	 * Sanitizes operation arguments to avoid logging sensitive data
	 *
	 * SECURITY: Recursively sanitizes nested objects to prevent PII leakage from
	 * nested input structures. Limits recursion depth to prevent performance impact
	 * on deeply nested objects.
	 *
	 * @param args - The operation arguments
	 * @returns unknown - Sanitized arguments
	 */
	private SanitizeArgs(args: unknown, depth = 0, maxDepth = 5): unknown {
		// Prevent stack overflow on circular or deeply nested structures
		if (depth > maxDepth || !args || typeof args !== 'object') {
			return args;
		}

		// Handle arrays
		if (Array.isArray(args)) {
			return args.map(item => this.SanitizeArgs(item, depth + 1, maxDepth));
		}

		// Handle objects
		const Sanitized = { ...(args as Record<string, unknown>) };

		// SECURITY: Redact top-level sensitive fields (case-insensitive pattern matching)
		const SensitivePatterns = ['password', 'token', 'secret', 'key', 'authorization', 'apikey', 'accesstoken', 'bearertoken'];
		for (const Field in Sanitized) {
			if (Object.prototype.hasOwnProperty.call(Sanitized, Field)) {
				const LowerField = Field.toLowerCase();
				if (SensitivePatterns.includes(LowerField)) {
					Sanitized[Field] = '[REDACTED]';
				} else if (typeof Sanitized[Field] === 'object' && Sanitized[Field] !== null) {
					// SECURITY: Recursively sanitize nested objects
					Sanitized[Field] = this.SanitizeArgs(Sanitized[Field], depth + 1, maxDepth);
				}
			}
		}

		return Sanitized;
	}

	/**
	 * Creates a summary of the operation result for logging
	 *
	 * @param result - The operation result
	 * @returns string - Result summary
	 */
	private SummarizeResult(result: unknown): string {
		if (!result) {
			return 'null';
		}

		if (Array.isArray(result)) {
			return `Array(${result.length})`;
		}

		if (typeof result === 'object') {
			const Keys = Object.keys(result as Record<string, unknown>);
			return `Object{${Keys.slice(0, RESULT_SUMMARY_MAX_KEYS).join(', ')}${Keys.length > RESULT_SUMMARY_MAX_KEYS ? '...' : ''}}`;
		}

		return String(result);
	}
}
