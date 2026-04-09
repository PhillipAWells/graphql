import Joi from 'joi';
import { Module, DynamicModule, Global, MiddlewareConsumer, NestModule, OnModuleInit, Optional, Provider, Type } from '@nestjs/common';
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
// Note: AuthModule NOT imported here to avoid circular dependency
// AuthModule depends on CacheModule from this package
// Applications should import both modules at root level
import { GraphQLService } from './graphql.service.js';
import { IGraphQLConfigOptions, IGraphQLAsyncConfig } from './graphql-config.interface.js';
import { GraphQLCacheService } from '../services/cache.service.js';
import { GraphQLPublicGuard } from '../guards/graphql-public.guard.js';
import { GraphQLAuthGuard } from '../guards/graphql-auth.guard.js';
import { QueryComplexityGuard } from '../guards/query-complexity.guard.js';
import { GraphQLRateLimitGuard } from '../guards/rate-limit.guard.js';
import { GraphQLRolesGuard } from '../guards/graphql-roles.guard.js';
import { GraphQLLoggingInterceptor } from '../interceptors/graphql-logging.interceptor.js';
import { GraphQLErrorInterceptor } from '../interceptors/graphql-error.interceptor.js';
import { GraphQLPerformanceInterceptor } from '../interceptors/graphql-performance.interceptor.js';
import { GraphQLPerformanceMonitoringInterceptor } from '../interceptors/performance-monitoring.interceptor.js';
import { GraphQLPerformanceService } from '../services/performance.service.js';
import { RateLimitService } from '../services/rate-limit.service.js';
import { BsonSerializationService, BsonSerializationMiddleware, BsonResponseInterceptor } from './bson/index.js';
import { ObjectIdScalar } from './scalars/object-id.scalar.js';
import { DateTimeScalar } from './scalars/date-time.scalar.js';
import { JSONScalar } from './scalars/json.scalar.js';

/**
 * GraphQL module with Apollo Server 5.x integration
 * Provides comprehensive GraphQL functionality with custom scalars, types, and utilities
 */
@Global()
@Module({})
export class GraphQLModule implements NestModule, OnModuleInit {
	/**
	 * CRITICAL: Static field storing BSON configuration for middleware access
	 *
	 * RATIONALE: Global configuration must be accessible to middleware via static
	 * methods, since NestJS middleware factory pattern does not support DI injection.
	 * This field is written during forRoot() / forRootAsync() and read during
	 * configure() / onModuleInit().
	 *
	 * CONCURRENCY LIMITATION: This static field is mutated by forRoot() / forRootAsync().
	 * In parallel test execution, concurrent calls to forRoot() will cause race conditions
	 * and unexpected behavior. Last call to forRoot() wins.
	 *
	 * WORKAROUND FOR TESTS:
	 * - Call forRoot() once at the suite level, not per-test
	 * - Use describe.sequential() in vitest to serialize GraphQLModule initialization
	 * - Consider per-test setup if forRoot() with different configs is required
	 *
	 * FUTURE: A cleaner solution would thread the config through DI providers,
	 * but that would require major refactoring of NestJS middleware registration.
	 */
	private static BsonConfig: IGraphQLConfigOptions['bson'] = undefined;

	private readonly BsonService: BsonSerializationService | undefined;
	private readonly BsonMiddleware: BsonSerializationMiddleware | undefined;

	constructor(
		@Optional() bsonService?: BsonSerializationService,
		@Optional() bsonMiddleware?: BsonSerializationMiddleware,
	) {
		this.BsonService = bsonService;
		this.BsonMiddleware = bsonMiddleware;
	}
	/**
	 * Validate GraphQL configuration options
	 * @param options Configuration options
	 * @throws Error if validation fails
	 */
	private static ValidateGraphQLConfig(options: IGraphQLConfigOptions): void {
		const Schema = Joi.object({
			autoSchemaFile: Joi.alternatives().try(Joi.string(), Joi.boolean()).optional().description('Path to auto-generated schema file or boolean'),
			sortSchema: Joi.boolean().strict().optional().description('Whether to sort schema'),
			playground: Joi.boolean().strict().optional().description('Enable GraphQL playground'),
			introspection: Joi.boolean().strict().optional().description('Enable schema introspection'),
			debug: Joi.boolean().optional().description('Enable debug mode'),
			tracing: Joi.boolean().optional().description('Enable tracing'),
			cache: Joi.boolean().optional().description('Enable caching'),
		}).options({ allowUnknown: true });

		const { error } = Schema.validate(options);
		if (error) {
			throw new Error(`GraphQL configuration validation failed: ${error.details.map(d => d.message).join(', ')}`);
		}
	}

	/**
    * Configure the GraphQL module synchronously
    * @param options Configuration options for Apollo Server
    * @returns Dynamic module configuration
    */
	public static forRoot(options: IGraphQLConfigOptions = {}): DynamicModule {
		// Validate configuration
		this.ValidateGraphQLConfig(options);

		// Store bson config for middleware registration
		this.BsonConfig = options.bson;

		const DefaultOptions: ApolloDriverConfig = {
			driver: ApolloDriver,
			autoSchemaFile: options.autoSchemaFile ?? './schema.gql',
			sortSchema: options.sortSchema ?? true,
			playground: options.playground ?? false,
			introspection: options.introspection ?? false,
			...(options.context !== undefined ? { context: options.context } : {}),
			...(options.cors !== undefined ? { cors: options.cors } : {}),
			...(options.formatError !== undefined ? { formatError: options.formatError } : {}),
			...options,
		};

		const Providers: Provider[] = [
			GraphQLService,
			RateLimitService,
			GraphQLCacheService,
			GraphQLPublicGuard,
			GraphQLAuthGuard,
			QueryComplexityGuard,
			GraphQLRateLimitGuard,
			GraphQLRolesGuard,
			GraphQLLoggingInterceptor,
			GraphQLErrorInterceptor,
			GraphQLPerformanceInterceptor,
			GraphQLPerformanceMonitoringInterceptor,
			GraphQLPerformanceService,
			ObjectIdScalar,
			DateTimeScalar,
			JSONScalar,
		];

		// Add BSON service if enabled
		if (options.bson?.enabled) {
			Providers.push(BsonSerializationService);
			Providers.push(BsonResponseInterceptor);
		}

		return {
			module: GraphQLModule,
			imports: [
				NestGraphQLModule.forRoot(DefaultOptions),
			],
			providers: Providers,
			exports: [
				GraphQLService,
				RateLimitService,
				NestGraphQLModule,
				GraphQLCacheService,
				GraphQLPublicGuard,
				GraphQLAuthGuard,
				QueryComplexityGuard,
				GraphQLRateLimitGuard,
				GraphQLRolesGuard,
				GraphQLLoggingInterceptor,
				GraphQLErrorInterceptor,
				GraphQLPerformanceInterceptor,
				GraphQLPerformanceMonitoringInterceptor,
				GraphQLPerformanceService,
				ObjectIdScalar,
				DateTimeScalar,
				JSONScalar,
				...(options.bson?.enabled ? [BsonSerializationService, BsonResponseInterceptor] : []),
			],
		};
	}

	/**
   * Configure the GraphQL module asynchronously
   * @param options Asynchronous configuration options
   * @returns Dynamic module configuration
   *
   * BSON Configuration Asymmetry:
   * Unlike forRoot(), this async method always registers BSON providers and interceptors,
   * even though BsonSerializationConfig is only known after the async config factory resolves.
   *
   * This is intentional and safe because:
   * 1. BsonResponseInterceptor checks the Accept header at request time
   * 2. Without the Accept: application/bson header, BSON serialization is bypassed
   * 3. Lazy registration in async mode would prevent post-module BSON configuration
   *
   * If BSON is not needed, simply don't set the bson.enabled config option or don't
   * send Accept: application/bson from clients. The providers will be present but inactive.
   *
   * To minimize memory waste:
   * - BsonSerializationService is lightweight and safe to instantiate even when unused
   * - BsonResponseInterceptor is registered but will be a no-op if the service is not used
   * - The middleware (BsonSerializationMiddleware) is still only registered conditionally
   *   in configure() based on the static BsonConfig field
   *
   * If conditional provider registration for async config becomes important, consider:
   * 1. Wrapping BSON providers with a no-op mode (check config at call time)
   * 2. Using a multi() provider pattern with a factory that checks config
   * 3. Refactoring to thread config through DI instead of static fields
   */
	public static forRootAsync(options: IGraphQLAsyncConfig): DynamicModule {
		const Providers: Provider[] = [
			GraphQLService,
			RateLimitService,
			GraphQLCacheService,
			GraphQLPublicGuard,
			GraphQLAuthGuard,
			QueryComplexityGuard,
			GraphQLRateLimitGuard,
			GraphQLRolesGuard,
			GraphQLLoggingInterceptor,
			GraphQLErrorInterceptor,
			GraphQLPerformanceInterceptor,
			GraphQLPerformanceMonitoringInterceptor,
			GraphQLPerformanceService,
			// Always include BSON service in async mode for flexibility
			BsonSerializationService,
			ObjectIdScalar,
			DateTimeScalar,
			JSONScalar,
		];

		return {
			module: GraphQLModule,
			imports: [
				NestGraphQLModule.forRootAsync({
					driver: ApolloDriver,
					useFactory: options.useFactory,
					...(options.inject ? { inject: options.inject } : {}),
				}),
			],
			providers: [...Providers, BsonResponseInterceptor],
			exports: [
				GraphQLService,
				RateLimitService,
				NestGraphQLModule,
				GraphQLCacheService,
				GraphQLPublicGuard,
				GraphQLAuthGuard,
				QueryComplexityGuard,
				GraphQLRateLimitGuard,
				GraphQLRolesGuard,
				GraphQLLoggingInterceptor,
				GraphQLErrorInterceptor,
				GraphQLPerformanceInterceptor,
				GraphQLPerformanceMonitoringInterceptor,
				GraphQLPerformanceService,
				BsonSerializationService,
				BsonResponseInterceptor,
				ObjectIdScalar,
				DateTimeScalar,
				JSONScalar,
			],
		};
	}

	/**
	 * Configure middleware for the module
	 */
	public configure(consumer: MiddlewareConsumer): void {
		// Only configure if BSON is enabled
		if (GraphQLModule.BsonConfig?.enabled && this.BsonMiddleware) {
			// apply() accepts Type<NestMiddleware> or functional middleware;
			// passing the injected instance requires a cast.
			consumer
				.apply(this.BsonMiddleware as unknown as Type<BsonSerializationMiddleware>)
				.forRoutes('graphql');
		}
	}

	/**
	 * Lifecycle hook called after module initialization
	 */
	public onModuleInit(): void {
		// BSON service is optional and only initialized if enabled
		// Middleware is already registered in configure method
	}
}
