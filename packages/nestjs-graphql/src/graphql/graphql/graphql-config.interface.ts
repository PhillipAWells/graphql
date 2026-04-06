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
   * Enable GraphQL Playground for development
   * @default true
   */
	playground?: boolean;

	/**
   * Enable GraphQL introspection
   * @default true
   */
	introspection?: boolean;

	/**
   * Custom context function or object
   * TODO: Type as (req: Request, res: Response) => Promise<IGraphQLContext> | IGraphQLContext
   * once context interface is stabilized
   */
	context?: any;

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
	useFactory: (...args: any[]) => Promise<IGraphQLConfigOptions> | IGraphQLConfigOptions;

	/**
   * Dependencies to inject into the factory function
   */
	inject?: unknown[];
}
