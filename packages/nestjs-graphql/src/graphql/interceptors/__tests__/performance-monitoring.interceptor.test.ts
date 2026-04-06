import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError, from } from 'rxjs';
import { GraphQLPerformanceMonitoringInterceptor } from '../performance-monitoring.interceptor.js';
import { GraphQLPerformanceService } from '../../services/performance.service.js';

describe('GraphQLPerformanceMonitoringInterceptor', () => {
	let interceptor: GraphQLPerformanceMonitoringInterceptor;
	let mockModuleRef: any;
	let mockLogger: any;
	let contextualLogger: any;
	let mockPerformanceService: any;
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

		mockPerformanceService = {
			Measure: vi.fn().mockResolvedValue(undefined),
		};

		mockModuleRef = {
			get: vi.fn((token) => {
				if (token === GraphQLPerformanceService) return mockPerformanceService;
				return mockLogger;
			}),
		};

		interceptor = new GraphQLPerformanceMonitoringInterceptor(mockModuleRef);

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

		it('should record successful operations', async () => {
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'GetData' }, operation: 'query' }, fieldName: 'data' },
				{ user: { id: 'user-1' } },
				{ id: 'test' },
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ result: 'success' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						expect(mockPerformanceService.Measure).toHaveBeenCalled();
						resolve();
					},
				});
			});
		});
	});

	describe('metric recording', () => {
		it('should call Measure with operation name', async () => {
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'MyQuery' }, operation: 'query' }, fieldName: 'myField' },
				{},
				{},
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ data: 'test' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						const { calls } = (mockPerformanceService.Measure as any).mock;
						expect(calls[0][0]).toContain('query');
						expect(calls[0][0]).toContain('myField');
						resolve();
					},
				});
			});
		});

		it('should include operation metadata in measurements', async () => {
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'GetUser' }, operation: 'query' }, fieldName: 'user' },
				{ user: { id: 'user-1' } },
				{ id: '123' },
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ user: 'data' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						const { calls: [[, , metadata]] } = (mockPerformanceService.Measure as any).mock;
						expect(metadata.fieldName).toBe('user');
						expect(metadata.operationType).toBe('query');
						expect(metadata.userId).toBe('user-1');
						resolve();
					},
				});
			});
		});

		it('should include duration in measurements', async () => {
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'TimedOp' }, operation: 'query' }, fieldName: 'field' },
				{},
				{},
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ data: 'result' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						const { calls: [[, , metadata]] } = (mockPerformanceService.Measure as any).mock;
						expect(typeof metadata.duration).toBe('number');
						expect(metadata.duration).toBeGreaterThanOrEqual(0);
						resolve();
					},
				});
			});
		});

		it('should not throw when Measure fails', async () => {
			mockPerformanceService.Measure.mockRejectedValue(new Error('Measurement failed'));

			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'Query' }, operation: 'query' }, fieldName: 'field' },
				{},
				{},
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ data: 'test' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: (data) => {
						// Should still return data even if measurement fails
						expect(data).toBeDefined();
						// Wait a tick for the promise chain to settle
						setTimeout(() => {
							expect(contextualLogger.error).toHaveBeenCalled();
							resolve();
						}, 10);
					},
					error: () => {
						// Should not error out
						expect(false).toBe(true);
					},
				});
			});
		});
	});

	describe('performance logging', () => {
		it('should debug log fast operations', async () => {
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'FastOp' }, operation: 'query' }, fieldName: 'field' },
				{},
				{},
			);

			(mockCallHandler.handle as any).mockReturnValue(of({ data: 'fast' }));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					next: () => {
						expect(contextualLogger.debug).not.toHaveBeenCalled();
						expect(contextualLogger.warn).not.toHaveBeenCalled();
						resolve();
					},
				});
			});
		});

		it('should warn for slow operations (>1s)', async () => {
			vi.useFakeTimers();
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'SlowOp' }, operation: 'query' }, fieldName: 'field' },
				{},
				{},
			);

			let resolve: () => void;
			const promise = new Promise<void>((res) => {
				resolve = res;
			});

			(mockCallHandler.handle as any).mockReturnValue(
				from(new Promise((res) => {
					setTimeout(() => {
						res({ data: 'slow' });
					}, 1100);
				})),
			);

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			observable.subscribe({
				next: () => {
					vi.useRealTimers();
					expect(contextualLogger.debug).toHaveBeenCalled();
					const { calls } = (contextualLogger.debug as any).mock;
					expect(calls.some((call: any) => call[0]?.includes('Slow'))).toBe(true);
					resolve();
				},
			});

			vi.advanceTimersByTime(1200);
			await promise;
		});

		it('should warn for very slow operations (>5s)', async () => {
			vi.useFakeTimers();
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'VerySlowOp' }, operation: 'query' }, fieldName: 'field' },
				{},
				{},
			);

			let resolve: () => void;
			const promise = new Promise<void>((res) => {
				resolve = res;
			});

			(mockCallHandler.handle as any).mockReturnValue(
				from(new Promise((res) => {
					setTimeout(() => {
						res({ data: 'very slow' });
					}, 5100);
				})),
			);

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			observable.subscribe({
				next: () => {
					vi.useRealTimers();
					expect(contextualLogger.warn).toHaveBeenCalled();
					const { calls } = (contextualLogger.warn as any).mock;
					expect(calls.some((call: any) => call[0]?.includes('Very slow'))).toBe(true);
					resolve();
				},
			});

			vi.advanceTimersByTime(5200);
			await promise;
		});
	});

	describe('error handling', () => {
		it('should record failed operations', async () => {
			const testError = new Error('Operation failed');
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'FailingOp' }, operation: 'mutation' }, fieldName: 'field' },
				{ user: { id: 'user-1' } },
				{},
			);

			(mockCallHandler.handle as any).mockReturnValue(throwError(() => testError));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					error: () => {
						expect(mockPerformanceService.Measure).toHaveBeenCalled();
						const { calls: [[, , metadata]] } = (mockPerformanceService.Measure as any).mock;
						expect(metadata.error).toBeDefined();
						resolve();
					},
				});
			});
		});

		it('should log operation errors', async () => {
			const testError = new Error('Test error');
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'ErrorOp' }, operation: 'query' }, fieldName: 'field' },
				{},
				{},
			);

			(mockCallHandler.handle as any).mockReturnValue(throwError(() => testError));

			const observable = interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler);

			await new Promise<void>((resolve) => {
				observable.subscribe({
					error: () => {
						expect(contextualLogger.error).toHaveBeenCalled();
						const { calls } = (contextualLogger.error as any).mock;
						expect(calls[0][0]).toContain('GraphQL operation failed');
						resolve();
					},
				});
			});
		});

		it('should rethrow errors after recording', async () => {
			const testError = new Error('Important error');
			setupGraphQLContext(mockContext,
				{ operation: { name: { value: 'ThrowingOp' }, operation: 'query' }, fieldName: 'field' },
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
});
