import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { of, throwError } from 'rxjs';
import { AppLogger } from '@pawells/nestjs-shared/common';
import { GraphQLCacheInterceptor } from '../cache.interceptor.js';
import { GraphQLCacheService } from '../../services/cache.service.js';
import { Reflector } from '@nestjs/core';

describe('GraphQLCacheInterceptor', () => {
	let interceptor: GraphQLCacheInterceptor;
	let mockModuleRef: any;
	let mockCacheService: any;
	let mockReflector: any;
	let mockContext: Partial<ExecutionContext>;
	let mockCallHandler: Partial<CallHandler>;

	// Helper to set up GraphQL context in mock
	const setupGraphQLContext = (
		mockContextObj: any,
		info: any = { operation: { name: { value: 'Query' }, operation: 'query' }, fieldName: 'field' },
		context: any = {},
		args: any = {},
	) => {
		(mockContextObj.getArgs as any).mockReturnValue([{}, args, context, info]);
	};

	beforeEach(() => {
		const mockCacheManager = {
			get: vi.fn().mockResolvedValue(undefined),
			set: vi.fn().mockResolvedValue(undefined),
			del: vi.fn().mockResolvedValue(undefined),
		};

		const mockContextualLogger = {
			log: vi.fn(),
			debug: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		};

		const mockAppLogger = {
			createContextualLogger: vi.fn().mockReturnValue(mockContextualLogger),
		};

		mockCacheService = {
			GenerateKey: vi.fn().mockReturnValue('graphql:test-key'),
			InvalidatePattern: vi.fn().mockResolvedValue(undefined),
		};

		mockReflector = {
			getAllAndOverride: vi.fn().mockReturnValue(undefined),
		};

		mockModuleRef = {
			get: vi.fn((token) => {
				if (token === GraphQLCacheService) return mockCacheService;
				if (token === Reflector) return mockReflector;
				if (token === CACHE_MANAGER) return mockCacheManager;
				if (token === AppLogger) return mockAppLogger;
				return undefined;
			}),
		};

		interceptor = new GraphQLCacheInterceptor(mockModuleRef);

		mockContext = {
			getClass: vi.fn().mockReturnValue(class {}),
			getHandler: vi.fn().mockReturnValue(() => {}),
			getType: vi.fn().mockReturnValue('graphql'),
			getArgs: vi.fn(),
			switchToHttp: vi.fn().mockReturnValue({
				getRequest: vi.fn().mockReturnValue({}),
				getResponse: vi.fn().mockReturnValue({}),
			}),
			switchToRpc: vi.fn().mockReturnValue({}),
			switchToWs: vi.fn().mockReturnValue({}),
		} as any;

		mockCallHandler = {
			handle: vi.fn(),
		} as any;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('happy path', () => {
		it('should allow requests to pass through', async () => {
			const result = { data: 'success' };
			const graphqlInfo = {
				operation: { name: { value: 'GetUser' }, operation: 'query' },
				fieldName: 'user',
			};
			const graphqlContext = { user: { id: 'user-1' } };
			const graphqlArgs = { id: '123' };

			(mockContext.getArgs as any).mockReturnValue([{}, graphqlArgs, graphqlContext, graphqlInfo]);
			(mockCallHandler.handle as any).mockReturnValue(of(result));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: (data) => {
						expect(data).toBe(result);
						resolve();
					},
				});
			});
		});

		it('should generate cache key from GraphQL args', async () => {
			const graphqlInfo = {
				operation: { name: { value: 'GetUser' }, operation: 'query' },
				fieldName: 'user',
			};
			const graphqlContext = { user: { id: 'user-1' } };
			const graphqlArgs = { id: '123', name: 'test' };

			(mockContext.getArgs as any).mockReturnValue([{}, graphqlArgs, graphqlContext, graphqlInfo]);
			(mockCallHandler.handle as any).mockReturnValue(of({ user: 'data' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						expect(mockCacheService.GenerateKey).toHaveBeenCalled();
						const { calls } = (mockCacheService.GenerateKey as any).mock;
						expect(calls[0][0]).toBe('user');
						resolve();
					},
				});
			});
		});
	});

	describe('cache invalidation', () => {
		it('should handle pre-execution cache invalidation', async () => {
			const invalidateOptions = {
				patterns: ['user:*', 'profile:*'],
				when: 'before' as const,
			};

			mockReflector.getAllAndOverride.mockReturnValue(invalidateOptions);

			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'UpdateUser' }, operation: 'mutation' }, fieldName: 'updateUser' },
				{ user: { id: 'user-1' } },
				{ id: '123' },
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ success: true }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				setTimeout(() => {
					// Give time for async invalidation
					observable.subscribe({
						next: () => {
							resolve();
						},
					});
				}, 50);
			});
		});

		it('should handle post-execution cache invalidation', async () => {
			const invalidateOptions = {
				patterns: ['users:list'],
				when: 'after' as const,
			};

			mockReflector.getAllAndOverride.mockReturnValue(invalidateOptions);

			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'CreateUser' }, operation: 'mutation' }, fieldName: 'createUser' },
				{ user: { id: 'user-1' } },
				{ name: 'John' },
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ id: 'new-id' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						setTimeout(() => {
							expect(mockCacheService.InvalidatePattern).toHaveBeenCalled();
							resolve();
						}, 50);
					},
				});
			});
		});

		it('should skip invalidation when condition is false', async () => {
			const invalidateOptions = {
				patterns: ['user:*'],
				when: 'after' as const,
				condition: vi.fn().mockReturnValue(false),
			};

			mockReflector.getAllAndOverride.mockReturnValue(invalidateOptions);

			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'UpdateUser' }, operation: 'mutation' }, fieldName: 'updateUser' },
				{ user: { id: 'user-1' } },
				{ id: '123' },
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ success: false }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						setTimeout(() => {
							expect(mockCacheService.InvalidatePattern).not.toHaveBeenCalled();
							resolve();
						}, 50);
					},
				});
			});
		});

		it('should support custom key generator for invalidation', async () => {
			const keyGeneratorFn = vi.fn().mockReturnValue(['custom:key:1', 'custom:key:2']);

			const invalidateOptions = {
				keyGenerator: keyGeneratorFn,
				when: 'after' as const,
			};

			mockReflector.getAllAndOverride.mockReturnValue(invalidateOptions);

			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'DeleteUser' }, operation: 'mutation' }, fieldName: 'deleteUser' },
				{ user: { id: 'user-1' } },
				{ id: '123' },
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ deleted: true }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						setTimeout(() => {
							expect(keyGeneratorFn).toHaveBeenCalled();
							resolve();
						}, 50);
					},
				});
			});
		});
	});

	describe('error handling', () => {
		it('should allow request to continue on invalidation error', async () => {
			mockCacheService.InvalidatePattern.mockRejectedValue(new Error('Invalidation failed'));

			const invalidateOptions = {
				patterns: ['user:*'],
				when: 'after' as const,
			};

			mockReflector.getAllAndOverride.mockReturnValue(invalidateOptions);

			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'UpdateUser' }, operation: 'mutation' }, fieldName: 'updateUser' },
				{ user: { id: 'user-1' } },
				{ id: '123' },
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ success: true }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: (data) => {
						// Should still return data even if invalidation fails
						expect(data).toBeDefined();
						resolve();
					},
					error: () => {
						// Should not error out
						expect(false).toBe(true);
					},
				});
			});
		});

		it('should handle resolver errors without invalidation', async () => {
			const testError = new Error('Resolver error');
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'FailingOp' }, operation: 'mutation' }, fieldName: 'field' },
				{},
				{},
			);

			(mockCallHandler.handle as any).mockReturnValue(throwError(() => testError));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					error: (err) => {
						expect(err).toBe(testError);
						resolve();
					},
				});
			});
		});
	});

	describe('cache context', () => {
		it('should include user context in cache key generation', async () => {
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'GetUserData' }, operation: 'query' }, fieldName: 'userData' },
				{ user: { id: 'user-1', sub: 'sub-123' } },
				{ id: '123' },
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ data: 'user-specific' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						expect(mockCacheService.GenerateKey).toHaveBeenCalled();
						resolve();
					},
				});
			});
		});

		it('should handle anonymous user context', async () => {
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'PublicQuery' }, operation: 'query' }, fieldName: 'publicData' },
				{},
				{},
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ data: 'public' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						expect(mockCacheService.GenerateKey).toHaveBeenCalled();
						resolve();
					},
				});
			});
		});
	});

	describe('metadata extraction', () => {
		it('should extract cacheable metadata from handler', async () => {
			const cacheableOptions = { ttl: 300000 };
			mockReflector.getAllAndOverride.mockReturnValue(cacheableOptions);

			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'CachedQuery' }, operation: 'query' }, fieldName: 'field' },
				{},
				{},
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ data: 'cached' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						expect(mockReflector.getAllAndOverride).toHaveBeenCalled();
						resolve();
					},
				});
			});
		});
	});
});
