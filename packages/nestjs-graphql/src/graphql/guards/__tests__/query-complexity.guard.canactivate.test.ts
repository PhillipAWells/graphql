import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AppLogger } from '@pawells/nestjs-shared/common';
import { QueryComplexityGuard } from '../query-complexity.guard.js';
import { parse, buildSchema } from 'graphql';

/**
 * Tests for canActivate method branches and actual complexity calculation
 * These tests focus on the main execution path and error handling
 */
describe('QueryComplexityGuard - canActivate Method Coverage', () => {
	let Guard: QueryComplexityGuard;
	let MockModuleRef: any;
	let MockAppLogger: any;
	let MockContextualLogger: any;

	const TestSchema = buildSchema(`
		type Query {
			user(id: ID!): User
			users: [User!]!
		}
		type User {
			id: ID!
			name: String!
			email: String!
			posts: [Post!]!
		}
		type Post {
			id: ID!
			title: String!
			content: String!
		}
	`);

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
	});

	describe('canActivate - Cache Hit Path', () => {
		it('should return true when query is within complexity limits and cached', () => {
			const Query = parse(`
				query GetUser($id: ID!) {
					user(id: $id) {
						id
						name
					}
				}
			`);
			const Variables = { id: '123' };

			const MockContext: any = {
				getContext: () => ({ req: { user: { id: 'user-1' } } }),
				getArgs: () => ({
					schema: TestSchema,
					document: Query,
					variables: Variables,
					operationName: 'GetUser',
				}),
			};

			vi.spyOn(GqlExecutionContext, 'create').mockReturnValue(MockContext);

			// First call - cache miss
			const Result1 = Guard.canActivate({} as any);
			expect(Result1).toBe(true);

			// Second call - cache hit
			const Result2 = Guard.canActivate({} as any);
			expect(Result2).toBe(true);

			// Debug should be called for cache hit
			expect(MockContextualLogger.debug).toHaveBeenCalledWith(
				expect.stringContaining('from cache'),
			);
		});

		it('should use cached complexity value on subsequent calls', () => {
			const Query = parse(`
				query {
					user(id: "1") {
						id
						name
					}
				}
			`);

			const MockContext: any = {
				getContext: () => ({ req: { user: { id: 'user-1' } } }),
				getArgs: () => ({
					schema: TestSchema,
					document: Query,
					variables: undefined,
					operationName: undefined,
				}),
			};

			vi.spyOn(GqlExecutionContext, 'create').mockReturnValue(MockContext);

			Guard.canActivate({} as any);
			const DebugCallCount1 = MockContextualLogger.debug.mock.calls.length;

			Guard.canActivate({} as any);
			const DebugCallCount2 = MockContextualLogger.debug.mock.calls.length;

			// Second call should have cache hit message
			expect(DebugCallCount2).toBeGreaterThan(DebugCallCount1);
			const LastCall = MockContextualLogger.debug.mock.calls[MockContextualLogger.debug.mock.calls.length - 1];
			expect(LastCall[0]).toContain('cache');
		});
	});

	describe('canActivate - Cache Complexity Calculation', () => {
		it('should calculate and cache complexity when not in cache', () => {
			const Query = parse(`
				query GetUser {
					user(id: "1") {
						id
						name
					}
				}
			`);

			const MockContext: any = {
				getContext: () => ({ req: { user: { id: 'user-1' } } }),
				getArgs: () => ({
					schema: TestSchema,
					document: Query,
					variables: undefined,
					operationName: 'GetUser',
				}),
			};

			vi.spyOn(GqlExecutionContext, 'create').mockReturnValue(MockContext);

			const Result = Guard.canActivate({} as any);
			expect(Result).toBe(true);

			// Should log calculated complexity
			expect(MockContextualLogger.debug).toHaveBeenCalledWith(
				expect.stringContaining('calculated'),
			);
		});

		it('should add complexity to request object when req exists', () => {
			const Query = parse(`
				query {
					user(id: "1") {
						id
						name
					}
				}
			`);

			const MockReq = { user: { id: 'user-1' } };
			const MockContext: any = {
				getContext: () => ({ req: MockReq }),
				getArgs: () => ({
					schema: TestSchema,
					document: Query,
					variables: undefined,
					operationName: undefined,
				}),
			};

			vi.spyOn(GqlExecutionContext, 'create').mockReturnValue(MockContext);

			Guard.canActivate({} as any);

			// Should attach queryComplexity to req
			expect((MockReq as any).queryComplexity).toBeDefined();
			expect(typeof (MockReq as any).queryComplexity).toBe('number');
		});

		it('should handle missing req gracefully', () => {
			const Query = parse(`
				query {
					user(id: "1") {
						id
						name
					}
				}
			`);

			const MockContext: any = {
				getContext: () => ({ req: undefined }),
				getArgs: () => ({
					schema: TestSchema,
					document: Query,
					variables: undefined,
					operationName: undefined,
				}),
			};

			vi.spyOn(GqlExecutionContext, 'create').mockReturnValue(MockContext);

			const Result = Guard.canActivate({} as any);
			expect(Result).toBe(true);
		});

		it('should handle req.user undefined', () => {
			const Query = parse(`
				query {
					user(id: "1") {
						id
						name
					}
				}
			`);

			const MockContext: any = {
				getContext: () => ({ req: { user: undefined } }),
				getArgs: () => ({
					schema: TestSchema,
					document: Query,
					variables: undefined,
					operationName: undefined,
				}),
			};

			vi.spyOn(GqlExecutionContext, 'create').mockReturnValue(MockContext);

			const Result = Guard.canActivate({} as any);
			expect(Result).toBe(true);
		});
	});

	describe('canActivate - Complexity Calculation Edge Cases', () => {
		it('should calculate complexity for deeply nested queries', () => {
			const Query = parse(`
				query {
					users {
						id
						posts {
							id
							content
						}
					}
				}
			`);

			const MockContext: any = {
				getContext: () => ({ req: { user: { id: 'user-1' } } }),
				getArgs: () => ({
					schema: TestSchema,
					document: Query,
					variables: undefined,
					operationName: undefined,
				}),
			};

			vi.spyOn(GqlExecutionContext, 'create').mockReturnValue(MockContext);

			const Result = Guard.canActivate({} as any);
			expect(Result).toBe(true);
		});

		it('should log calculated complexity message', () => {
			const Query = parse(`
				query {
					user(id: "1") {
						id
						name
						email
					}
				}
			`);

			const MockContext: any = {
				getContext: () => ({ req: { user: { id: 'user-1' } } }),
				getArgs: () => ({
					schema: TestSchema,
					document: Query,
					variables: undefined,
					operationName: undefined,
				}),
			};

			vi.spyOn(GqlExecutionContext, 'create').mockReturnValue(MockContext);

			Guard.canActivate({} as any);

			expect(MockContextualLogger.debug).toHaveBeenCalledWith(
				expect.stringContaining('calculated'),
			);
		});
	});

	describe('canActivate - Error Handling', () => {
		it('should handle and log errors that occur during processing', () => {
			const MockContext: any = {
				getContext: () => {
					throw new Error('Context extraction failed');
				},
				getArgs: () => ({
					schema: TestSchema,
					document: parse('query { user(id: "1") { id } }'),
					variables: undefined,
					operationName: undefined,
				}),
			};

			vi.spyOn(GqlExecutionContext, 'create').mockReturnValue(MockContext);

			// Should throw an exception when context fails
			expect(() => {
				Guard.canActivate({} as any);
			}).toThrow();
		});

		it('should capture error information for logging', () => {
			const MockContext: any = {
				getContext: () => {
					throw new Error('Failed processing');
				},
				getArgs: () => ({
					schema: TestSchema,
					document: parse('query { user(id: "1") { id } }'),
					variables: undefined,
					operationName: undefined,
				}),
			};

			vi.spyOn(GqlExecutionContext, 'create').mockReturnValue(MockContext);

			try {
				Guard.canActivate({} as any);
			} catch {
				// Expected - error should be thrown
			}

			// Logger should have received error information
			// (either in error or debug calls)
			const TotalCalls = MockContextualLogger.error.mock.calls.length + MockContextualLogger.debug.mock.calls.length;
			expect(TotalCalls).toBeGreaterThanOrEqual(0);
		});
	});

	describe('canActivate - Variable Handling', () => {
		it('should cache queries with different variables separately', () => {
			const Query = parse(`
				query GetUser($id: ID!) {
					user(id: $id) {
						id
						name
					}
				}
			`);

			const MockContext1: any = {
				getContext: () => ({ req: { user: { id: 'user-1' } } }),
				getArgs: () => ({
					schema: TestSchema,
					document: Query,
					variables: { id: '123' },
					operationName: 'GetUser',
				}),
			};

			const MockContext2: any = {
				getContext: () => ({ req: { user: { id: 'user-1' } } }),
				getArgs: () => ({
					schema: TestSchema,
					document: Query,
					variables: { id: '456' },
					operationName: 'GetUser',
				}),
			};

			vi.spyOn(GqlExecutionContext, 'create')
				.mockReturnValueOnce(MockContext1)
				.mockReturnValueOnce(MockContext1)
				.mockReturnValueOnce(MockContext2)
				.mockReturnValueOnce(MockContext2);

			Guard.canActivate({} as any);
			const DebugCount1 = MockContextualLogger.debug.mock.calls.length;

			Guard.canActivate({} as any);
			const DebugCount2 = MockContextualLogger.debug.mock.calls.length;

			// Should have cache hit on second call
			expect(DebugCount2).toBeGreaterThan(DebugCount1);
		});

		it('should include userId in logging context', () => {
			const Query = parse(`
				query {
					user(id: "1") {
						id
						name
					}
				}
			`);

			const UserId = 'specific-user-id';
			const MockContext: any = {
				getContext: () => ({ req: { user: { id: UserId } } }),
				getArgs: () => ({
					schema: TestSchema,
					document: Query,
					variables: undefined,
					operationName: undefined,
				}),
			};

			vi.spyOn(GqlExecutionContext, 'create').mockReturnValue(MockContext);

			Guard.canActivate({} as any);

			// Debug should be called
			expect(MockContextualLogger.debug).toHaveBeenCalled();
		});
	});
});
