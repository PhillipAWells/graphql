import { ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLFormattedError } from 'graphql';

/**
 * CORS configuration options
 */
export interface ICorsOptions {
	/**
	 * Configures the Access-Control-Allow-Origin CORS header
	 */
	origin?: boolean | string | string[] | RegExp | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void);

	/**
	 * Configures the Access-Control-Allow-Credentials CORS header
	 */
	credentials?: boolean;

	/**
	 * Additional CORS options
	 */
	[key: string]: unknown;
}

/**
 * Configuration options for the GraphQL module
 *
 * **Security Defaults & Option Merging:**
 * The module sets secure defaults (playground: false, introspection: false) for production.
 * These defaults are intentionally mergeable - you can explicitly re-enable these features
 * by passing `playground: true` or `introspection: true` in options. This is a documented
 * escape hatch for development/staging environments.
 *
 * @example
 * ```typescript
 * // Production (secure defaults)
 * GraphQLModule.forRoot({
 *   autoSchemaFile: true,
 * });
 * // Result: playground=false, introspection=false
 *
 * // Development (explicitly enable unsafe features)
 * GraphQLModule.forRoot({
 *   autoSchemaFile: true,
 *   playground: true,   // Explicitly re-enable
 *   introspection: true, // Explicitly re-enable
 * });
 * ```
 */
export interface IGraphQLConfigOptions extends Omit<ApolloDriverConfig, 'driver'> {
	/**
   * Path to auto-generated schema file or false to disable
   * @default './schema.gql'
   */
	autoSchemaFile?: string | boolean;

	/**
   * Whether to sort the schema lexicographically
   * @default true
   */
	sortSchema?: boolean;

	/**
   * Enable GraphQL Playground for development.
   *
   * **Security:** Defaults to false (disabled) for production safety.
   * Explicitly set to true to enable in development/staging environments.
   *
   * @default false
   */
	playground?: boolean;

	/**
   * Enable GraphQL introspection.
   *
   * **Security:** Defaults to false (disabled) for production safety.
   * Explicitly set to true to enable schema introspection in development/staging.
   *
   * @default false
   */
	introspection?: boolean;

	/**
	   * Custom context function or object.
	   * Accepts either a context object or a factory function that returns context data.
	   * Consumers should type-cast or provide their own IGraphQLContext interface to this field when initializing GraphQLModule for type safety.
	   */
	context?: Record<string, unknown> | ((req: unknown, res: unknown) => Promise<Record<string, unknown>> | Record<string, unknown>);

	/**
   * CORS configuration
   */
	cors?: boolean | ICorsOptions;

	/**
   * Custom error formatting function
   */
	formatError?: (formattedError: GraphQLFormattedError, error: unknown) => GraphQLFormattedError;

	/**
   * Custom error handling options
   */
	errorHandling?: {
		/**
     * Include stack traces in error responses (development only)
     * @default false
     */
		includeStackTrace?: boolean;

		/**
     * Custom error codes mapping
     */
		errorCodes?: Record<string, string>;
	};

	/**
   * BSON serialization configuration
   */
	bson?: {
		/**
     * Enable BSON serialization support
     * @default false
     */
		enabled?: boolean;

		/**
     * Maximum payload size in bytes
     * @default 10485760 (10MB)
     */
		maxPayloadSize?: number;
	};
}

/**
 * Asynchronous configuration options for the GraphQL module
 */
export interface IGraphQLAsyncConfig {
	/**
   * Factory function that returns configuration options
   */
	useFactory: (...args: unknown[]) => Promise<IGraphQLConfigOptions> | IGraphQLConfigOptions;

	/**
   * Dependencies to inject into the factory function
   */
	inject?: unknown[];
}
