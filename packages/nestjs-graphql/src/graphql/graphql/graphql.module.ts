import Joi from 'joi';
import { Module, DynamicModule, Global, MiddlewareConsumer, NestModule, Optional, Provider, Type } from '@nestjs/common';
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
export class GraphQLModule implements NestModule {
	/**
	 * CRITICAL: Static field storing BSON configuration for middleware access
	 *
	 * RATIONALE: Global configuration must be accessible to middleware via static
	 * methods, since NestJS middleware factory pattern does not support DI injection.
	 * This field is written during forRoot() / forRootAsync() and read during
	 * configure() / onModuleInit().
	 *
	 * CONCURRENCY PROTECTION: A startup guard prevents multiple calls to forRoot()
	 * or forRootAsync(). The first call initializes BsonConfig and sets a flag.
	 * Subsequent calls throw an error immediately. This prevents race conditions
	 * in parallel test execution and ensures predictable module initialization.
	 *
	 * WORKAROUND FOR TESTS (DEPRECATED):
	 * - Old: Call forRoot() once at the suite level, not per-test
	 * - Old: Use describe.sequential() in vitest to serialize GraphQLModule initialization
	 * - NEW: Tests must not call forRoot/forRootAsync multiple times per process
	 *
	 * ARCHITECTURAL NOTE:
	 * A cleaner solution would thread the config through DI providers,
	 * but that would require major refactoring of NestJS middleware registration.
	 * The startup guard is a pragmatic middle ground.
	 */
	private static BsonConfig: IGraphQLConfigOptions['bson'] = undefined;
	private static InitializationGuard: boolean = false;

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
	 * Throw if GraphQLModule has already been initialized.
	 * This guard prevents race conditions from concurrent forRoot/forRootAsync calls.
	 * @throws Error if initialization has already occurred
	 */
	private static EnforceInitializationOnce(): void {
		if (this.InitializationGuard) {
			throw new Error(
				'GraphQLModule has already been initialized. forRoot() and forRootAsync() can only be called once per application. ' +
				'If you need to call forRoot/forRootAsync multiple times in tests, use describe.sequential() in vitest to prevent concurrent initialization.',
			);
		}
		this.InitializationGuard = true;
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
	 * @throws Error if forRoot or forRootAsync has already been called
	 */
	public static forRoot(options: IGraphQLConfigOptions = {}): DynamicModule {
		// Enforce single initialization
		this.EnforceInitializationOnce();

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
	 * @throws Error if forRoot or forRootAsync has already been called
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
	 * IMPORTANT LIMITATION:
	 * BsonSerializationMiddleware will NOT be registered when using forRootAsync.
	 * Only BsonSerializationService and BsonResponseInterceptor are registered.
	 * If you require the middleware (e.g., for pre-processing request bodies before parsing),
	 * use forRoot() instead of forRootAsync().
	 *
	 * If conditional provider registration for async config becomes important, consider:
	 * 1. Wrapping BSON providers with a no-op mode (check config at call time)
	 * 2. Using a multi() provider pattern with a factory that checks config
	 * 3. Refactoring to thread config through DI instead of static fields
	 */
	public static forRootAsync(options: IGraphQLAsyncConfig): DynamicModule {
		// Enforce single initialization
		this.EnforceInitializationOnce();

		// Symbol for the resolved config provider
		const GraphQLAsyncConfigToken = Symbol('GraphQLAsyncConfig');

		// Create a single wrapper function that resolves config once and stores BSON config
		const resolveAndStoreConfig = async (...args: any[]): Promise<IGraphQLConfigOptions> => {
			const config = await options.useFactory(...args);
			// Store BSON config for middleware registration in configure()
			GraphQLModule.BsonConfig = config.bson;
			return config;
		};

		// Single config provider - resolved once and injected into all consumers
		const asyncConfigProvider: Provider = {
			provide: GraphQLAsyncConfigToken,
			useFactory: resolveAndStoreConfig,
			// Cast inject to any[] because NestJS Provider.inject accepts unknown[] but we need to match it at runtime
			...(options.inject ? { inject: options.inject as any[] } : {}),
		};

		const Providers: Provider[] = [
			// First provider: resolve and store the async config (once)
			asyncConfigProvider,
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
			// BSON providers: Always registered in async mode, but BsonSerializationService
			// uses a no-op pattern when disabled (returns undefined via useFactory).
			// Note: This is a type-safe wrapper that allows graceful degradation.
			{
				provide: BsonSerializationService,
				useFactory: (config: IGraphQLConfigOptions) => {
					// When BSON is disabled, the useFactory pattern returns undefined,
					// but the service token is not registered in the DI container.
					// The constructor's @Optional() decorator ensures this is safe.
					if (config?.bson?.enabled) {
						return new BsonSerializationService();
					}
					return undefined;
				},
				inject: [GraphQLAsyncConfigToken],
			},
			{
				provide: BsonResponseInterceptor,
				useClass: BsonResponseInterceptor,
			},
			{
				provide: BsonSerializationMiddleware,
				useClass: BsonSerializationMiddleware,
			},
		];

		return {
			module: GraphQLModule,
			imports: [
				// Use a factory that injects the already-resolved config token
				// instead of re-executing the factory
				NestGraphQLModule.forRootAsync({
					driver: ApolloDriver,
					useFactory: (config: IGraphQLConfigOptions) => config,
					inject: [GraphQLAsyncConfigToken],
				}),
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
				BsonSerializationService,
				BsonResponseInterceptor,
				BsonSerializationMiddleware,
				ObjectIdScalar,
				DateTimeScalar,
				JSONScalar,
			],
		};
	}

	/**
	 * Configure middleware for the module
	 * 
	 * ARCHITECTURAL NOTE: Middleware registration happens in configure(), which is called
	 * BEFORE async providers are resolved. This means:
	 * 
	 * - In forRoot() path: BsonConfig is set before configure() runs, so middleware is registered
	 * - In forRootAsync() path: BsonConfig is set after configure() runs, so middleware is NOT registered
	 * 
	 * This is a known limitation of NestJS middleware factory pattern. If you need middleware
	 * in async configuration, use forRoot() instead.
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
}
