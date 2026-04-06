import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { GraphQLErrorInterceptor } from '../graphql-error.interceptor.js';

describe('GraphQLErrorInterceptor', () => {
	let interceptor: GraphQLErrorInterceptor;
	let mockModuleRef: any;
	let mockLogger: any;
	let contextualLogger: any;
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
		contextualLogger = {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		};

		mockLogger = {
			createContextualLogger: vi.fn().mockReturnValue(contextualLogger),
		};

		mockModuleRef = {
			get: vi.fn().mockReturnValue(mockLogger),
		};

		interceptor = new GraphQLErrorInterceptor(mockModuleRef);

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
		it('should allow successful requests to pass through', async () => {
			const result = { data: 'success' };
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'GetUser' }, operation: 'query' }, fieldName: 'user' },
			);

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
	});

	describe('error handling and formatting', () => {
		it('should catch and format validation errors', async () => {
			const validationError = new Error('Validation failed');
			(validationError as any).name = 'ValidationError';
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'CreateUser' }, operation: 'mutation' }, fieldName: 'createUser' },
			);

			(mockCallHandler.handle as any).mockReturnValue(throwError(() => validationError));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					error: (err) => {
						expect(err).toBeDefined();
						expect(err.extensions?.code).toContain('VALIDATION');
						resolve();
					},
				});
			});
		});

		it('should log errors with context', async () => {
			const testError = new Error('Operation failed');
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'FailingQuery' }, operation: 'query' }, fieldName: 'failingField' },
			);

			(mockCallHandler.handle as any).mockReturnValue(throwError(() => testError));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					error: () => {
						expect(contextualLogger.error).toHaveBeenCalled();
						const { calls } = (contextualLogger.error as any).mock;
						expect(calls[0][0]).toContain('GraphQL');
						expect(calls[0][0]).toContain('error');
						resolve();
					},
				});
			});
		});

		it('should categorize unauthorized errors', async () => {
			const unauthorizedError = new Error('Unauthorized access');
			(unauthorizedError as any).name = 'UnauthorizedError';
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'SecureQuery' }, operation: 'query' }, fieldName: 'secureField' },
			);

			(mockCallHandler.handle as any).mockReturnValue(throwError(() => unauthorizedError));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					error: (err) => {
						expect(err.extensions?.code).toBe('UNAUTHENTICATED');
						expect(err.extensions?.statusCode).toBe(401);
						resolve();
					},
				});
			});
		});

		it('should categorize forbidden errors', async () => {
			const forbiddenError = new Error('Forbidden access');
			(forbiddenError as any).name = 'ForbiddenError';
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'RestrictedQuery' }, operation: 'query' }, fieldName: 'restrictedField' },
			);

			(mockCallHandler.handle as any).mockReturnValue(throwError(() => forbiddenError));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					error: (err) => {
						expect(err.extensions?.code).toBe('FORBIDDEN');
						expect(err.extensions?.statusCode).toBe(403);
						resolve();
					},
				});
			});
		});

		it('should categorize not found errors', async () => {
			const notFoundError = new Error('Resource not found');
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'GetUser' }, operation: 'query' }, fieldName: 'user' },
			);

			(mockCallHandler.handle as any).mockReturnValue(throwError(() => notFoundError));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					error: (err) => {
						expect(err.extensions?.code).toBe('NOT_FOUND');
						expect(err.extensions?.statusCode).toBe(404);
						resolve();
					},
				});
			});
		});

		it('should categorize conflict errors (duplicate key)', async () => {
			const duplicateError = new Error('Duplicate key found');
			(duplicateError as any).code = 11000;
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'CreateUser' }, operation: 'mutation' }, fieldName: 'createUser' },
			);

			(mockCallHandler.handle as any).mockReturnValue(throwError(() => duplicateError));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					error: (err) => {
						expect(err.extensions?.code).toBe('CONFLICT');
						expect(err.extensions?.statusCode).toBe(409);
						resolve();
					},
				});
			});
		});

		it('should add operation context to errors', async () => {
			const testError = new Error('Test error');
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'MyOperation' }, operation: 'mutation' }, fieldName: 'myField' },
			);

			(mockCallHandler.handle as any).mockReturnValue(throwError(() => testError));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					error: (err) => {
						expect(err.extensions?.operation?.type).toBe('mutation');
						expect(err.extensions?.operation?.name).toBe('MyOperation');
						expect(err.extensions?.operation?.field).toBe('myField');
						resolve();
					},
				});
			});
		});

		it('should include timestamp in error response', async () => {
			const testError = new Error('Test error');
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'Query' }, operation: 'query' }, fieldName: 'field' },
			);

			(mockCallHandler.handle as any).mockReturnValue(throwError(() => testError));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					error: (err) => {
						expect(err.extensions?.timestamp).toBeDefined();
						expect(typeof err.extensions?.timestamp).toBe('string');
						resolve();
					},
				});
			});
		});
	});

	describe('error message handling', () => {
		it('should use custom message in non-production', async () => {
			const originalEnv = process.env['NODE_ENV'];
			process.env['NODE_ENV'] = 'development';

			const testError = new Error('Detailed error message');
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'Query' }, operation: 'query' }, fieldName: 'field' },
			);

			(mockCallHandler.handle as any).mockReturnValue(throwError(() => testError));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					error: (err) => {
						expect(err.message).toContain('Detailed error message');
						process.env['NODE_ENV'] = originalEnv;
						resolve();
					},
				});
			});
		});

		it('should use generic message in production', async () => {
			const originalEnv = process.env['NODE_ENV'];
			process.env['NODE_ENV'] = 'production';

			const testError = new Error('Sensitive error details');
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'Query' }, operation: 'query' }, fieldName: 'field' },
			);

			(mockCallHandler.handle as any).mockReturnValue(throwError(() => testError));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					error: (err) => {
						expect(err.message).toBe('An unexpected error occurred');
						process.env['NODE_ENV'] = originalEnv;
						resolve();
					},
				});
			});
		});
	});
});
