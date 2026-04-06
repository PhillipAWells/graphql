import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { GraphQLLoggingInterceptor } from '../graphql-logging.interceptor.js';

describe('GraphQLLoggingInterceptor', () => {
	let interceptor: GraphQLLoggingInterceptor;
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

		interceptor = new GraphQLLoggingInterceptor(mockModuleRef);

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
		it('should allow request to pass through', async () => {
			const result = { data: 'test' };
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'GetUser' }, operation: 'query' }, fieldName: 'user' },
				{ user: { id: 'user-1' } },
				{ id: '123' },
			);

			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'GetUser' }, operation: 'query' }, fieldName: 'user' },
				{ user: { id: 'user-1' } },
				{ id: '123' },
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

		it('should log operation start', async () => {
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'GetUser' }, operation: 'query' }, fieldName: 'user' },
				{ user: { id: 'user-1' } },
				{ id: '123' },
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ data: 'test' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						expect(contextualLogger.info).toHaveBeenCalled();
						const { calls } = (contextualLogger.info as any).mock;
						expect(calls.some((call: any) => call[0]?.includes('started'))).toBe(true);
						resolve();
					},
				});
			});
		});
	});

	describe('logging functionality', () => {
		it('should log operation completion with duration', async () => {
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
						expect(contextualLogger.info).toHaveBeenCalled();
						const { calls } = (contextualLogger.info as any).mock;
						expect(calls.some((call: any) => call[0]?.includes('completed'))).toBe(true);
						expect(calls.some((call: any) => call[0]?.includes('ms'))).toBe(true);
						resolve();
					},
				});
			});
		});

		it('should log with user ID from context', async () => {
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'GetProfile' }, operation: 'query' }, fieldName: 'profile' },
				{ user: { id: 'specific-user-123' } },
				{},
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ profile: 'data' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						expect(contextualLogger.info).toHaveBeenCalled();
						const { calls } = (contextualLogger.info as any).mock;
						expect(calls.some((call: any) => call[0]?.includes('specific-user-123'))).toBe(true);
						resolve();
					},
				});
			});
		});

		it('should use anonymous user when user not in context', async () => {
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
						expect(contextualLogger.info).toHaveBeenCalled();
						const { calls } = (contextualLogger.info as any).mock;
						expect(calls.some((call: any) => call[0]?.includes('anonymous'))).toBe(true);
						resolve();
					},
				});
			});
		});
	});

	describe('error handling', () => {
		it('should log operation errors', async () => {
			const testError = new Error('Test error occurred');
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'FailingQuery' }, operation: 'query' }, fieldName: 'failingField' },
				{ user: { id: 'user-1' } },
				{},
			);

			(mockCallHandler.handle as any).mockReturnValue(throwError(() => testError));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					error: () => {
						expect(contextualLogger.error).toHaveBeenCalled();
						const { calls } = (contextualLogger.error as any).mock;
						expect(calls.some((call: any) => call[0]?.includes('failed'))).toBe(true);
						resolve();
					},
				});
			});
		});
	});

	describe('operation types', () => {
		it('should handle query operations', async () => {
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'MyQuery' }, operation: 'query' }, fieldName: 'queryField' },
				{ user: { id: 'user-1' } },
				{},
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ result: 'query' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						expect(contextualLogger.info).toHaveBeenCalled();
						const { calls } = (contextualLogger.info as any).mock;
						expect(calls.some((call: any) => call[0]?.includes('query'))).toBe(true);
						resolve();
					},
				});
			});
		});

		it('should handle mutation operations', async () => {
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'MyMutation' }, operation: 'mutation' }, fieldName: 'mutationField' },
				{ user: { id: 'user-1' } },
				{},
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ result: 'mutation' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						expect(contextualLogger.info).toHaveBeenCalled();
						const { calls } = (contextualLogger.info as any).mock;
						expect(calls.some((call: any) => call[0]?.includes('mutation'))).toBe(true);
						resolve();
					},
				});
			});
		});
	});
});
