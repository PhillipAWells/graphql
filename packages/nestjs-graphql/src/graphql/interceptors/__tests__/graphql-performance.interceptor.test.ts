import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError, from } from 'rxjs';
import { GraphQLPerformanceInterceptor } from '../graphql-performance.interceptor.js';

describe('GraphQLPerformanceInterceptor', () => {
	let interceptor: GraphQLPerformanceInterceptor;
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

		interceptor = new GraphQLPerformanceInterceptor(mockModuleRef);

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

		it('should log successful operations', async () => {
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'FastQuery' }, operation: 'query' }, fieldName: 'fastField' },
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ data: 'fast' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						expect(contextualLogger.debug).toHaveBeenCalled();
						const { calls } = (contextualLogger.debug as any).mock;
						expect(calls.some((call: any) => call[0]?.includes('performance'))).toBe(true);
						resolve();
					},
				});
			});
		});
	});

	describe('performance timing', () => {
		it('should record operation duration', async () => {
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'TimedQuery' }, operation: 'query' }, fieldName: 'timedField' },
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ data: 'result' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						expect(contextualLogger.debug).toHaveBeenCalled();
						const { calls } = (contextualLogger.debug as any).mock;
						const perfCall = calls.find((call: any) => call[0]?.includes('ms'));
						expect(perfCall).toBeDefined();
						resolve();
					},
				});
			});
		});

		it('should not warn for operations under slow threshold', async () => {
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'FastOp' }, operation: 'query' }, fieldName: 'field' },
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ data: 'fast' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						// Should log debug but not warn for fast operations
						expect(contextualLogger.warn).not.toHaveBeenCalled();
						expect(contextualLogger.error).not.toHaveBeenCalled();
						resolve();
					},
				});
			});
		});
	});

	describe('slow operation detection', () => {
		it('should warn for slow operations (>1s)', async () => {
			vi.useFakeTimers();
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'SlowQuery' }, operation: 'query' }, fieldName: 'slowField' },
			);

			let resolve: () => void;
			const promise = new Promise<void>((res) => {
				resolve = res;
			});

			(mockCallHandler.handle as any).mockReturnValue(
				from(new Promise((res) => {
					// Simulate 1.5 second delay
					setTimeout(() => {
						res({ data: 'slow' });
					}, 1500);
				})),
			);

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			observable.subscribe({
				next: () => {
					vi.useRealTimers();
					expect(contextualLogger.warn).toHaveBeenCalled();
					const { calls } = (contextualLogger.warn as any).mock;
					expect(calls.some((call: any) => call[0]?.includes('Slow'))).toBe(true);
					resolve();
				},
			});

			vi.advanceTimersByTime(2000);
			await promise;
		});

		it('should error log for very slow operations (>5s)', async () => {
			vi.useFakeTimers();
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'VerySlowQuery' }, operation: 'query' }, fieldName: 'verySlowField' },
			);

			let resolve: () => void;
			const promise = new Promise<void>((res) => {
				resolve = res;
			});

			(mockCallHandler.handle as any).mockReturnValue(
				from(new Promise((res) => {
					// Simulate 5.5 second delay
					setTimeout(() => {
						res({ data: 'very slow' });
					}, 5500);
				})),
			);

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			observable.subscribe({
				next: () => {
					vi.useRealTimers();
					expect(contextualLogger.error).toHaveBeenCalled();
					const { calls } = (contextualLogger.error as any).mock;
					expect(calls.some((call: any) => call[0]?.includes('VERY SLOW'))).toBe(true);
					resolve();
				},
			});

			vi.advanceTimersByTime(6000);
			await promise;
		});
	});

	describe('error handling', () => {
		it('should log operation failures', async () => {
			const testError = new Error('Operation failed');
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'FailingQuery' }, operation: 'query' }, fieldName: 'failingField' },
			);

			(mockCallHandler.handle as any).mockReturnValue(throwError(() => testError));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					error: () => {
						expect(contextualLogger.warn).toHaveBeenCalled();
						const { calls } = (contextualLogger.warn as any).mock;
						expect(calls.some((call: any) => call[0]?.includes('failed'))).toBe(true);
						resolve();
					},
				});
			});
		});

		it('should include duration in error logs', async () => {
			const testError = new Error('Failed operation');
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'ErrorOp' }, operation: 'mutation' }, fieldName: 'errorField' },
			);

			(mockCallHandler.handle as any).mockReturnValue(throwError(() => testError));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					error: () => {
						expect(contextualLogger.warn).toHaveBeenCalled();
						const { calls } = (contextualLogger.warn as any).mock;
						expect(calls.some((call: any) => call[0]?.includes('ms'))).toBe(true);
						resolve();
					},
				});
			});
		});
	});

	describe('operation details logging', () => {
		it('should include operation name in logs', async () => {
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'GetUserData' }, operation: 'query' }, fieldName: 'userData' },
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ user: 'data' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						expect(contextualLogger.debug).toHaveBeenCalled();
						const { calls } = (contextualLogger.debug as any).mock;
						expect(calls.some((call: any) => call[0]?.includes('GetUserData'))).toBe(true);
						resolve();
					},
				});
			});
		});

		it('should include field name in logs', async () => {
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'Query' }, operation: 'query' }, fieldName: 'specificField' },
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ data: 'value' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						expect(contextualLogger.debug).toHaveBeenCalled();
						const { calls } = (contextualLogger.debug as any).mock;
						expect(calls.some((call: any) => call[0]?.includes('specificField'))).toBe(true);
						resolve();
					},
				});
			});
		});

		it('should include operation type in logs', async () => {
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'CreateRecord' }, operation: 'mutation' }, fieldName: 'create' },
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ id: 'new-id' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						expect(contextualLogger.debug).toHaveBeenCalled();
						const { calls } = (contextualLogger.debug as any).mock;
						expect(calls.some((call: any) => call[0]?.includes('mutation'))).toBe(true);
						resolve();
					},
				});
			});
		});
	});
});
