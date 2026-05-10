import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { GraphQLSchema } from 'graphql';
import type { IGraphQLConfigOptions } from './graphql-config.interface.js';
import { Traced } from '@pawells/nestjs-open-telemetry';
import { AppLogger } from '@pawells/nestjs-shared/common';
import type { IContextualLogger } from '@pawells/nestjs-shared/common';
import { GraphQLErrorCode } from './error-codes.js';
import { ErrorClassifier } from '../errors/error-classifier.js';
import { CursorUtils } from './types/connection.type.js';

/**
 * Service for GraphQL module management and utilities
 * Provides helper methods for schema validation, error handling, and resolver development
 */
@Injectable()
export class GraphQLService {
	// eslint-disable-next-line @typescript-eslint/prefer-readonly
	private ModuleRef?: ModuleRef;

	private get AppLogger(): AppLogger | undefined {
		try {
			return this.ModuleRef?.get(AppLogger, { strict: false });
		} catch {
			return undefined;
		}
	}

	private get Logger(): IContextualLogger | undefined {
		return this.AppLogger?.createContextualLogger(GraphQLService.name);
	}

	constructor(moduleRef?: ModuleRef) {
		this.ModuleRef = moduleRef;
	}

	private Schema: GraphQLSchema | null = null;

	/**
    * Validate GraphQL schema
    * @param schema The GraphQL schema to validate
    * @throws Error if schema is invalid
    */
	@Traced({ name: 'graphql.validateSchema' })
	public ValidateSchema(schema: GraphQLSchema): void {
		// Validate schema is provided
		if (!schema) {
			throw new Error('GraphQL schema is required');
		}

		// Basic validation - check if schema has query type
		if (!schema.getQueryType()) {
			throw new Error('GraphQL schema must have a query type');
		}

		this.Schema = schema;
		this.Logger?.info('GraphQL schema validated successfully');
	}

	/**
   * Get the current GraphQL schema
   * @returns The GraphQL schema or null if not set
   */
	public GetSchema(): GraphQLSchema | null {
		return this.Schema;
	}

	/**
    * Format GraphQL errors with custom error codes
    * @param error The original error
    * @param config Configuration options
    * @returns Formatted error
    */
	@Traced({ name: 'graphql.formatError' })
	public FormatError(error: Error | Record<string, unknown>, config?: IGraphQLConfigOptions): Record<string, unknown> {
		const ErrorRecord = error as Record<string, unknown>;
		let ErrorMessage: string;
		if (error instanceof Error) {
			ErrorMessage = error.message;
		} else {
			ErrorMessage = (ErrorRecord['message'] as string | undefined) ?? 'Unknown error';
		}
		const Extensions = error instanceof Error ? {} : (ErrorRecord['extensions'] as Record<string, unknown> ?? {});

		const FormattedError: Record<string, unknown> = {
			message: ErrorMessage,
			extensions: {
				code: this.MapErrorToCode(error),
				...Extensions,
			},
		};

		// Include stack trace in development mode or if explicitly configured
		const IsDevelopment = process.env['NODE_ENV'] === 'development';
		if ((IsDevelopment || config?.errorHandling?.includeStackTrace) && (error instanceof Error) && error.stack) {
			const Ext = FormattedError['extensions'] as Record<string, unknown>;
			Ext['stack'] = error.stack;
		}

		return FormattedError;
	}

	/**
	 * Map error to custom error code using ErrorClassifier
	 * @param error The error to map
	 * @returns Error code string
	 */
	private MapErrorToCode(error: Error | Record<string, unknown>): GraphQLErrorCode {
		const Classification = ErrorClassifier.Classify(error);

		// Map error classification to GraphQL error code
		if (Classification.isAuthentication) {
			return GraphQLErrorCode.UNAUTHENTICATED;
		}
		if (Classification.isAuthorization) {
			return GraphQLErrorCode.FORBIDDEN;
		}
		if (Classification.isValidation) {
			return GraphQLErrorCode.VALIDATION_ERROR;
		}
		if (Classification.isRateLimit) {
			return GraphQLErrorCode.RATE_LIMIT_EXCEEDED;
		}

		// Handle additional error codes from the classification code
		switch (Classification.code) {
			case 'NOT_FOUND':
				return GraphQLErrorCode.NOT_FOUND;
			case 'CONFLICT':
				return GraphQLErrorCode.CONFLICT;
			default:
				return GraphQLErrorCode.INTERNAL_ERROR;
		}
	}

	/**
	 * Helper method for pagination logic
	 * @param items Array of items to paginate
	 * @param first Number of items to take from start
	 * @param after Cursor to start after
	 * @returns Paginated result with edges and page info
	 */
	public PaginateItems<T extends { id: string; createdAt?: Date }>(
		items: T[],
		first?: number,
		after?: string,
	): {
		edges: Array<{ cursor: string; node: T }>;
		pageInfo: {
			hasNextPage: boolean;
			hasPreviousPage: boolean;
			startCursor?: string;
			endCursor?: string;
		};
	} {
		let StartIndex = 0;

		if (after) {
			const AfterData = CursorUtils.DecodeCursor(after);
			const AfterIndex = items.findIndex(item => item.id === AfterData.id);
			if (AfterIndex !== -1) {
				StartIndex = AfterIndex + 1;
			}
		}

		const EndIndex = first ? StartIndex + first : items.length;
		const PaginatedItems = items.slice(StartIndex, EndIndex);

		const Edges = PaginatedItems.map(item => ({
			cursor: CursorUtils.CreateCursor(item as { id: string; createdAt?: Date }),
			node: item,
		}));

		return {
			edges: Edges,
			pageInfo: {
				hasNextPage: EndIndex < items.length,
				hasPreviousPage: StartIndex > 0,
				startCursor: Edges.length > 0 ? Edges[0]?.cursor : undefined,
				endCursor: Edges.length > 0 ? Edges[Edges.length - 1]?.cursor : undefined,
			},
		};
	}
}
