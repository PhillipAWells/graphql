import Joi from 'joi';
import { Module, DynamicModule, Global, MiddlewareConsumer, NestModule, Optional, Provider, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule } from '@nestjs/config';
// Note: AuthModule NOT imported here to avoid circular dependency
// AuthModule depends on CacheModule from this package
// Applications should import both modules at root level
import { GraphQLService } from './graphql.service.js';
import { GraphQLErrorFormatter } from './error-formatter.js';
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

/**
 * Injection token for BSON configuration (DI-managed provider)
 * Allows BsonConfig to be injected into services instead of accessed via static fields
 */
export const BSON_CONFIG_TOKEN = 'BSON_CONFIG';

@Global()
@Module({})
export class GraphQLModule implements NestModule {
	/**
	 * CRITICAL: BsonConfig moved to DI providers for test isolation
	 *
	 * RATIONALE: Static state breaks test isolation. BsonConfig is now registered
	 * as a DI provider (BSON_CONFIG_TOKEN) that can be injected into services.
	 * NestJS testing utilities automatically isolate DI containers per test suite.
	 *
	 * BSON MIDDLEWARE REGISTRATION:
	 * BsonSerializationMiddleware uses lazy resolution (ModuleRef.get) to access
	 * BSON_CONFIG_TOKEN at request time, avoiding hard initialization-time dependency.
	 *
	 * INITIALIZATION GUARD:
	 * InitializationGuard check is now ALWAYS enforced (removed NODE_ENV condition).
	 * This prevents module registration race conditions in all environments.
	 * Tests must use NestJS testing utilities (Test.createTestingModule) which
	 * automatically isolate module state per test suite.
	 */

	private readonly BsonService: BsonSerializationService | undefined;
	private readonly BsonMiddleware: BsonSerializationMiddleware | undefined;
	private readonly ModuleRef: ModuleRef;

	constructor(
		moduleRef: ModuleRef,
		@Optional() bsonService?: BsonSerializationService,
		@Optional() bsonMiddleware?: BsonSerializationMiddleware,
	) {
		this.ModuleRef = moduleRef;
		this.BsonService = bsonService;
		this.BsonMiddleware = bsonMiddleware;
	}

	/**
	 * Throw if GraphQLModule has already been initialized.
	 * This guard prevents race conditions from concurrent forRoot/forRootAsync calls.
	 * Tests must use NestJS testing utilities (Test.createTestingModule) which
	 * automatically isolate module state per test suite.
	 * @throws Error if initialization has already occurred
	 */
	private static InitializationGuard: boolean = false;

	private static EnforceInitializationOnce(): void {
		if (this.InitializationGuard) {
			throw new Error(
				'GraphQLModule has already been initialized. forRoot() and forRootAsync() can only be called once per application instance. ' +
				'In tests, use NestJS Test.createTestingModule() which provides automatic test isolation.',
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

		// Extract security-critical and custom options separately
		// Note: bson is registered as BSON_CONFIG_TOKEN provider, errorHandling is unused
		const { bson: _bson, errorHandling: _errorHandling, playground: userPlayground, introspection: userIntrospection, ...apolloOptions } = options;

		const DefaultOptions: ApolloDriverConfig = {
			driver: ApolloDriver,
			autoSchemaFile: apolloOptions.autoSchemaFile ?? './schema.gql',
			sortSchema: apolloOptions.sortSchema ?? true,
			...(apolloOptions.context !== undefined ? { context: apolloOptions.context } : {}),
			...(apolloOptions.cors !== undefined ? { cors: apolloOptions.cors } : {}),
			...(apolloOptions.formatError !== undefined ? { formatError: apolloOptions.formatError } : {}),
			// Spread all other Apollo options first
			...apolloOptions,
			// SECURITY: Override playground and introspection with explicit defaults
			// These are set last to ensure they cannot be overridden by options spread
			playground: userPlayground ?? false,
			introspection: userIntrospection ?? false,
		};

		const Providers: Provider[] = [
			// Register BSON config as a DI provider (replaces static field)
			{
				provide: BSON_CONFIG_TOKEN,
				useValue: options.bson,
			},
			GraphQLService,
			GraphQLErrorFormatter,
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
				ConfigModule,
				NestGraphQLModule.forRoot(DefaultOptions),
			],
			providers: Providers,
			exports: [
				BSON_CONFIG_TOKEN,
				GraphQLService,
				GraphQLErrorFormatter,
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

		// Single config provider - resolved once and injected into all consumers
		const asyncConfigProvider: Provider = {
			provide: GraphQLAsyncConfigToken,
			useFactory: options.useFactory,
			// Cast inject to any[] because NestJS Provider.inject accepts unknown[] but we need to match it at runtime
			...(options.inject ? { inject: options.inject as any[] } : {}),
		};

		const Providers: Provider[] = [
			// First provider: resolve the async config (once)
			asyncConfigProvider,
			// Register BSON config as a DI provider derived from the async config
			{
				provide: BSON_CONFIG_TOKEN,
				useFactory: (config: IGraphQLConfigOptions) => config.bson,
				inject: [GraphQLAsyncConfigToken],
			},
			GraphQLService,
			GraphQLErrorFormatter,
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
				// NOTE: BsonSerializationMiddleware is registered here for consistency with forRoot(),
				// but it will NOT be applied by configure() when using forRootAsync() because
				// middleware registration happens at module init time before async config resolves.
				// This provider is exported for potential future use but is currently unused in async mode.
				// See limitation documented in forRootAsync() JSDoc.
				provide: BsonSerializationMiddleware,
				useClass: BsonSerializationMiddleware,
			},
		];

		return {
			module: GraphQLModule,
			imports: [
				ConfigModule,
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
				BSON_CONFIG_TOKEN,
				GraphQLService,
				GraphQLErrorFormatter,
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
	 * Uses lazy resolution (ModuleRef.get) to fetch BSON_CONFIG_TOKEN at configuration time.
	 * This allows BsonConfig to be provided via DI in both forRoot and forRootAsync paths.
	 *
	 * In forRootAsync, the config is available by the time configure() runs because
	 * NestJS resolves module providers before calling configure().
	 */
	public configure(consumer: MiddlewareConsumer): void {
		try {
			// Lazily resolve BSON config from DI
			const BsonConfig = this.ModuleRef.get<IGraphQLConfigOptions['bson']>(BSON_CONFIG_TOKEN, { strict: false });

			// Only configure if BSON is enabled
			if (BsonConfig?.enabled && this.BsonMiddleware) {
				// apply() accepts Type<NestMiddleware> or functional middleware;
				// passing the injected instance requires a cast.
				consumer
					.apply(this.BsonMiddleware as unknown as Type<BsonSerializationMiddleware>)
					.forRoutes('graphql');
			}
		} catch {
			// Silently ignore if BSON_CONFIG_TOKEN is not registered (not an error)
		}
	}
}
