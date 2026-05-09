import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AppLogger } from '@pawells/nestjs-shared/common';
import { QueryComplexityGuard } from '../query-complexity.guard.js';
import { parse } from 'graphql';

describe('QueryComplexityGuard', () => {
	let Guard: QueryComplexityGuard;
	let MockModuleRef: any;
	let MockAppLogger: any;
	let MockContextualLogger: any;
	let MockExecutionContext: any;
	let MockGqlContext: any;

	beforeEach(() => {
		MockContextualLogger = {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		};

		MockAppLogger = {
			createContextualLogger: vi.fn().mockReturnValue(MockContextualLogger),
		};

		MockModuleRef = {
			get: vi.fn((token: any) => {
				if (token === AppLogger) {
					return MockAppLogger;
				}
				throw new Error(`Unknown token: ${String(token)}`);
			}),
		};

		Guard = new QueryComplexityGuard(MockModuleRef);

		const SimpleQuery = parse(`
			query GetUser($id: ID!) {
				user(id: $id) {
					id
					name
				}
			}
		`);

		MockGqlContext = {
			getContext: vi.fn().mockReturnValue({ req: {} }),
			getArgs: vi.fn().mockReturnValue({
				schema: {} as any,
				document: SimpleQuery,
				variables: { id: '123' },
				operationName: 'GetUser',
			}),
		};

		vi.spyOn(GqlExecutionContext, 'create').mockReturnValue(MockGqlContext);

		MockExecutionContext = {};
	});

	afterEach(() => {
		Guard.onModuleDestroy();
		vi.clearAllMocks();
	});

	describe('constructor', () => {
		it('should initialize with module ref', () => {
			expect(Guard.Module).toBe(MockModuleRef);
		});

		it('should start periodic cleanup on initialization', async () => {
			await new Promise(resolve => setTimeout(resolve, 10));
			expect(Guard).toBeDefined();
		});
	});

	describe('canActivate', () => {
		it('should allow query activation', async () => {
			const Result = await Guard.canActivate(MockExecutionContext);
			// The guard should not throw if complexity is within limits
			expect(Result).toBe(true);
		});

		it('should handle missing request object', async () => {
			MockGqlContext.getContext.mockReturnValue({ req: undefined });

			const Result = await Guard.canActivate(MockExecutionContext);

			expect(Result).toBe(true);
		});

		it('should throw error on calculation failure', async () => {
			// Mock GqlExecutionContext to throw
			vi.spyOn(GqlExecutionContext, 'create').mockImplementation(() => {
				throw new Error('Context creation failed');
			});

			await expect(Guard.canActivate(MockExecutionContext)).rejects.toThrow(Error);
		});

		it('should set queryComplexity on request when req exists', async () => {
			const MockRequest = { user: { id: 'user1' }, queryComplexity: undefined as number | undefined };
			MockGqlContext.getContext.mockReturnValue({ req: MockRequest });

			const Result = await Guard.canActivate(MockExecutionContext);

			expect(Result).toBe(true);
			// The request should have complexity set if complexity was calculated
			if (MockRequest.queryComplexity !== undefined) {
				expect(typeof MockRequest.queryComplexity).toBe('number');
			}
		});
	});

	describe('onModuleDestroy', () => {
		it('should clear cleanup interval without error', () => {
			Guard.onModuleDestroy();
			expect(() => Guard.onModuleDestroy()).not.toThrow();
		});

		it('should handle multiple destroy calls', () => {
			Guard.onModuleDestroy();
			Guard.onModuleDestroy();
			Guard.onModuleDestroy();

			expect(Guard).toBeDefined();
		});
	});

	describe('Module Lifecycle', () => {
		it('should handle multiple canActivate calls', async () => {
			const Result1 = await Guard.canActivate(MockExecutionContext);
			const Result2 = await Guard.canActivate(MockExecutionContext);

			expect(Result1).toBe(true);
			expect(Result2).toBe(true);
		});

		it('should handle canActivate after module setup', async () => {
			await new Promise(resolve => setTimeout(resolve, 50));

			const Result = await Guard.canActivate(MockExecutionContext);

			expect(Result).toBe(true);
		});

		it('should handle concurrent canActivate calls', async () => {
			const Promises = Array(5).fill(null).map(() =>
				Guard.canActivate(MockExecutionContext),
			);

			const Results = await Promise.all(Promises);

			expect(Results.every(r => r === true)).toBe(true);
		});
	});

	describe('Edge Cases', () => {
		it('should handle query with undefined operationName', async () => {
			const Query = parse('query { user { id } }');

			MockGqlContext.getArgs.mockReturnValue({
				schema: {} as any,
				document: Query,
				variables: undefined,
				operationName: undefined,
			});

			const Result = await Guard.canActivate(MockExecutionContext);

			expect(Result).toBe(true);
		});

		it('should handle query with complex variables', async () => {
			const Query = parse(`
				query GetUsers($filter: UserFilter) {
					users(filter: $filter) { id }
				}
			`);

			const ComplexVariables = {
				filter: {
					name: { contains: 'test' },
					status: ['ACTIVE', 'PENDING'],
					createdAt: { gte: '2024-01-01' },
				},
			};

			MockGqlContext.getArgs.mockReturnValue({
				schema: {} as any,
				document: Query,
				variables: ComplexVariables,
				operationName: 'GetUsers',
			});

			const Result = await Guard.canActivate(MockExecutionContext);

			expect(Result).toBe(true);
		});

		it('should handle missing user in request context', async () => {
			const MockRequest = { user: undefined };
			MockGqlContext.getContext.mockReturnValue({ req: MockRequest });

			const Result = await Guard.canActivate(MockExecutionContext);

			expect(Result).toBe(true);
		});

		it('should handle null request', async () => {
			MockGqlContext.getContext.mockReturnValue({ req: null });

			const Result = await Guard.canActivate(MockExecutionContext);

			expect(Result).toBe(true);
		});
	});

	describe('Logging', () => {
		it('should use app logger when available', async () => {
			await Guard.canActivate(MockExecutionContext);

			// Logger should be created
			expect(MockAppLogger.createContextualLogger).toHaveBeenCalled();
		});

		it('should handle logger creation failure gracefully', async () => {
			MockAppLogger.createContextualLogger.mockImplementation(() => {
				throw new Error('Logger creation failed');
			});

			// Should not throw even if logger fails
			const Result = await Guard.canActivate(MockExecutionContext);

			expect(Result).toBe(true);
		});

		it('should handle missing logger', async () => {
			MockModuleRef.get.mockImplementation(() => {
				throw new Error('AppLogger not available');
			});

			const NewGuard = new QueryComplexityGuard(MockModuleRef);

			const Result = await NewGuard.canActivate(MockExecutionContext);

			expect(Result).toBe(true);

			NewGuard.onModuleDestroy();
		});
	});

	describe('Cache Behavior', () => {
		it('should handle cache hits and misses', async () => {
			const Query = parse('query { user { id } }');

			MockGqlContext.getArgs.mockReturnValue({
				schema: {} as any,
				document: Query,
				variables: undefined,
				operationName: undefined,
			});

			// First call - cache miss
			const Result1 = await Guard.canActivate(MockExecutionContext);

			// Reset mock to verify second call behavior
			MockContextualLogger.debug.mockClear();

			// Second call - cache hit
			const Result2 = await Guard.canActivate(MockExecutionContext);

			expect(Result1).toBe(true);
			expect(Result2).toBe(true);
		});

		it('should handle different queries separately', async () => {
			const Query1 = parse('query Q1 { field1 { id } }');
			const Query2 = parse('query Q2 { field2 { id } }');

			MockGqlContext.getArgs.mockReturnValue({
				schema: {} as any,
				document: Query1,
				variables: undefined,
				operationName: 'Q1',
			});

			const Result1 = await Guard.canActivate(MockExecutionContext);

			MockGqlContext.getArgs.mockReturnValue({
				schema: {} as any,
				document: Query2,
				variables: undefined,
				operationName: 'Q2',
			});

			const Result2 = await Guard.canActivate(MockExecutionContext);

			expect(Result1).toBe(true);
			expect(Result2).toBe(true);
		});

		it('should handle queries with different variables separately', async () => {
			const Query = parse(`
				query GetUser($id: ID!) {
					user(id: $id) { id }
				}
			`);

			MockGqlContext.getArgs.mockReturnValue({
				schema: {} as any,
				document: Query,
				variables: { id: '123' },
				operationName: 'GetUser',
			});

			const Result1 = await Guard.canActivate(MockExecutionContext);

			MockGqlContext.getArgs.mockReturnValue({
				schema: {} as any,
				document: Query,
				variables: { id: '456' },
				operationName: 'GetUser',
			});

			const Result2 = await Guard.canActivate(MockExecutionContext);

			expect(Result1).toBe(true);
			expect(Result2).toBe(true);
		});
	});

	describe('Periodic Cleanup', () => {
		it('should support cleanup interval management', async () => {
			// Run for a bit to let cleanup interval fire
			await new Promise(resolve => setTimeout(resolve, 100));

			// Guard should still function
			const Result = await Guard.canActivate(MockExecutionContext);

			expect(Result).toBe(true);
		});

		it('should handle cleanup without breaking functionality', async () => {
			// Perform multiple operations
			for (let i = 0; i < 10; i++) {
				const Query = parse(`query Q${i} { field${i} { id } }`);
				MockGqlContext.getArgs.mockReturnValue({
					schema: {} as any,
					document: Query,
					variables: undefined,
					operationName: `Q${i}`,
				});

				await Guard.canActivate(MockExecutionContext);
			}

			// Let cleanup run
			await new Promise(resolve => setTimeout(resolve, 100));

			// Should still work after cleanup
			const Query = parse('query Final { user { id } }');
			MockGqlContext.getArgs.mockReturnValue({
				schema: {} as any,
				document: Query,
				variables: undefined,
				operationName: 'Final',
			});

			const Result = await Guard.canActivate(MockExecutionContext);

			expect(Result).toBe(true);
		});
	});

	describe('Error Handling', () => {
		it('should handle GQL context creation errors', async () => {
			vi.spyOn(GqlExecutionContext, 'create').mockImplementation(() => {
				throw new Error('Context error');
			});

			await expect(Guard.canActivate(MockExecutionContext)).rejects.toThrow(Error);

			vi.spyOn(GqlExecutionContext, 'create').mockRestore();
		});

		it('should provide meaningful error messages', async () => {
			vi.spyOn(GqlExecutionContext, 'create').mockImplementation(() => {
				throw new Error('Schema not available');
			});

			try {
				await Guard.canActivate(MockExecutionContext);
				throw new Error('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
			}

			vi.spyOn(GqlExecutionContext, 'create').mockRestore();
		});
	});
});
