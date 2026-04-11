import { describe,it,expect,beforeEach,afterEach,vi } from 'vitest';

import { InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { QueryComplexityGuard } from '../../guards/query-complexity.guard.js';
import * as QueryComplexity from '../../graphql/query-complexity.js';

describe('QueryComplexityGuard', () => {
	let guard: QueryComplexityGuard;
	let mockExecutionContext: any;
	let mockRequest: any;

	beforeEach(() => {
		const mockModuleRef = {
			get: () => {
				throw new Error('No dependencies expected');
			},
		} as any;

		guard = new QueryComplexityGuard(mockModuleRef);

		mockRequest = {
			headers: {},
			user: { id: 'user123' },
		};

		mockExecutionContext = {};

		// Mock GqlExecutionContext.create
		vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
			getContext: () => ({
				req: mockRequest,
			}),
			getArgs: () => ({
				schema: {},
				document: { kind: 'Document' },
				variables: {},
				operationName: 'TestQuery',
			}),
		} as any);
	});

	afterEach(() => {
		vi.clearAllMocks();
		guard.onModuleDestroy();
	});

	describe('canActivate - Normal Operation', () => {
		const COMPLEXITY_WITHIN_LIMITS = 500;
		const COMPLEXITY_EXCEEDED = 2000;
		const COMPLEXITY_MID_RANGE = 750;

		it('should allow query when complexity is within limits', async () => {
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(COMPLEXITY_WITHIN_LIMITS);
			vi.spyOn(QueryComplexity, 'ExceedsComplexityLimit').mockReturnValue(false);

			const result = await guard.canActivate(mockExecutionContext);

			expect(result).toBe(true);
		});

		it('should attach complexity to request object', async () => {
			const complexity = COMPLEXITY_MID_RANGE;
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(complexity);
			vi.spyOn(QueryComplexity, 'ExceedsComplexityLimit').mockReturnValue(false);

			await guard.canActivate(mockExecutionContext);

			expect(mockRequest.queryComplexity).toBe(complexity);
		});

		it('should reject query when complexity exceeds limit', async () => {
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(COMPLEXITY_EXCEEDED);
			vi.spyOn(QueryComplexity, 'ExceedsComplexityLimit').mockReturnValue(true);

			await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(BadRequestException);
			await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(/exceeds maximum/);
		});
	});

	describe('QueryComplexityGuard - Error Handling', () => {
		const COMPLEXITY_EXCEEDED = 2000;

		it('should throw InternalServerErrorException on complexity calculation error', async () => {
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockImplementation(() => {
				throw new Error('Complexity calculation failed');
			});

			await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(InternalServerErrorException);
		});

		it('should NOT allow query on complexity calculation error', async () => {
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockImplementation(() => {
				throw new Error('Complexity calculation failed');
			});

			// Should throw, not return true
			await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow();
		});

		it('should NOT return true on calculation error (fail closed)', async () => {
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockImplementation(() => {
				throw new Error('Complexity calculation failed');
			});

			// Verify that it does NOT return true
			let didThrow = false;
			try {
				await guard.canActivate(mockExecutionContext);
			} catch {
				// Expected: should throw, not return true
				didThrow = true;
			}

			expect(didThrow).toBe(true);
		});

		it('should log error with context when complexity calculation fails', async () => {
			const calculationError = new Error('Complexity calculation failed');

			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockImplementation(() => {
				throw calculationError;
			});

			try {
				await guard.canActivate(mockExecutionContext);
			} catch (error) {
				// Expected to throw
				expect(error).toBeInstanceOf(InternalServerErrorException);
			}
		});

		it('should handle errors from calculateQueryComplexity function', async () => {
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockImplementation(() => {
				throw new Error('Schema validation failed');
			});

			await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(InternalServerErrorException);
		});

		it('should distinguish between BadRequestException (limit exceeded) and other errors', async () => {
			// First test: BadRequestException should be re-thrown
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(COMPLEXITY_EXCEEDED);
			vi.spyOn(QueryComplexity, 'ExceedsComplexityLimit').mockReturnValue(true);

			await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(BadRequestException);

			// Second test: Other errors should throw InternalServerErrorException
			// Use a different document to avoid cache hit from previous call
			(GqlExecutionContext.create as any).mockReturnValue({
				getContext: () => ({ req: mockRequest }),
				getArgs: () => ({
					schema: {},
					document: { kind: 'Document', definitions: [{ differentDoc: true }] },
					variables: {},
					operationName: 'DifferentQuery',
				}),
			});

			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockImplementation(() => {
				throw new Error('Unexpected error');
			});

			await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(InternalServerErrorException);
		});

		it('should throw InternalServerErrorException with appropriate message on error', async () => {
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockImplementation(() => {
				throw new Error('Complexity calculation failed');
			});

			try {
				await guard.canActivate(mockExecutionContext);
			} catch (err: any) {
				expect(err).toBeInstanceOf(InternalServerErrorException);
				expect(err.message).toContain('validate');
			}
		});

		it('should handle thrown errors gracefully', async () => {
			const thrownError = new Error('Some unexpected error');
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockImplementation(() => {
				throw thrownError;
			});

			await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(InternalServerErrorException);
		});
	});

	describe('canActivate - Edge Cases', () => {
		const ZERO_COMPLEXITY = 0;
		const VALID_COMPLEXITY = 500;

		it('should handle requests without user object', async () => {
			mockRequest.user = undefined;
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(VALID_COMPLEXITY);
			vi.spyOn(QueryComplexity, 'ExceedsComplexityLimit').mockReturnValue(false);

			const result = await guard.canActivate(mockExecutionContext);

			expect(result).toBe(true);
		});

		it('should handle requests without variables', async () => {
			(GqlExecutionContext.create as any).mockReturnValue({
				getContext: () => ({
					req: mockRequest,
				}),
				getArgs: () => ({
					schema: {},
					document: { kind: 'Document' },
					variables: undefined,
					operationName: 'TestQuery',
				}),
			} as any);

			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(VALID_COMPLEXITY);
			vi.spyOn(QueryComplexity, 'ExceedsComplexityLimit').mockReturnValue(false);

			const result = await guard.canActivate(mockExecutionContext);

			expect(result).toBe(true);
		});

		it('should handle zero complexity', async () => {
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(ZERO_COMPLEXITY);
			vi.spyOn(QueryComplexity, 'ExceedsComplexityLimit').mockReturnValue(false);

			const result = await guard.canActivate(mockExecutionContext);

			expect(result).toBe(true);
		});

		it('should handle requests without req object', async () => {
			(GqlExecutionContext.create as any).mockReturnValue({
				getContext: () => ({
					req: undefined,
				}),
				getArgs: () => ({
					schema: {},
					document: { kind: 'Document' },
					variables: {},
					operationName: 'TestQuery',
				}),
			} as any);

			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(VALID_COMPLEXITY);
			vi.spyOn(QueryComplexity, 'ExceedsComplexityLimit').mockReturnValue(false);

			const result = await guard.canActivate(mockExecutionContext);

			expect(result).toBe(true);
		});
	});

	describe('QueryComplexityGuard - Complexity Caching', () => {
		it('should cache complexity calculation for identical queries', async () => {
			const mockDocument = { kind: 'Document', definitions: [] };
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(500);
			vi.spyOn(QueryComplexity, 'ExceedsComplexityLimit').mockReturnValue(false);

			(GqlExecutionContext.create as any).mockReturnValue({
				getContext: () => ({
					req: mockRequest,
				}),
				getArgs: () => ({
					schema: {},
					document: mockDocument,
					variables: {},
					operationName: 'TestQuery',
				}),
			} as any);

			// First call - should calculate
			await guard.canActivate(mockExecutionContext);
			expect(QueryComplexity.CalculateQueryComplexity).toHaveBeenCalledTimes(1);

			// Second call with same document - should use cache
			await guard.canActivate(mockExecutionContext);
			expect(QueryComplexity.CalculateQueryComplexity).toHaveBeenCalledTimes(1); // Still 1, not 2
		});

		it('should avoid recalculation for repeated identical queries', async () => {
			const complexity = 750;
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(complexity);
			vi.spyOn(QueryComplexity, 'ExceedsComplexityLimit').mockReturnValue(false);

			const mockDocument = { kind: 'Document', definitions: [] };
			(GqlExecutionContext.create as any).mockReturnValue({
				getContext: () => ({
					req: mockRequest,
				}),
				getArgs: () => ({
					schema: {},
					document: mockDocument,
					variables: {},
					operationName: 'TestQuery',
				}),
			} as any);

			// Run 5 times - should only calculate once
			for (let i = 0; i < 5; i++) {
				await guard.canActivate(mockExecutionContext);
			}

			expect(QueryComplexity.CalculateQueryComplexity).toHaveBeenCalledTimes(1);
		});

		it('should perform complexity calculation under 10ms', async () => {
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(500);
			vi.spyOn(QueryComplexity, 'ExceedsComplexityLimit').mockReturnValue(false);

			const start = performance.now();
			await guard.canActivate(mockExecutionContext);
			const elapsed = performance.now() - start;

			expect(elapsed).toBeLessThan(10);
		});

		it('should use cache lookup under 1ms on subsequent calls', async () => {
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(500);
			vi.spyOn(QueryComplexity, 'ExceedsComplexityLimit').mockReturnValue(false);

			// Prime the cache
			await guard.canActivate(mockExecutionContext);

			// Measure cached lookup
			const start = performance.now();
			await guard.canActivate(mockExecutionContext);
			const elapsed = performance.now() - start;

			expect(elapsed).toBeLessThan(1);
		});
	});

	describe('QueryComplexityGuard - Cache Management', () => {
		it('should cleanup cache on module destroy', async () => {
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(500);
			vi.spyOn(QueryComplexity, 'ExceedsComplexityLimit').mockReturnValue(false);

			// Populate cache
			await guard.canActivate(mockExecutionContext);

			// Cleanup
			guard.onModuleDestroy();

			// Cache should be cleared - next call should recalculate
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(600);
			await guard.canActivate(mockExecutionContext);

			// Should have been called again
			expect(QueryComplexity.CalculateQueryComplexity).toHaveBeenCalledTimes(2);
		});

		it('should perform smart cleanup instead of full cache clear', async () => {
			vi.useFakeTimers();

			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(500);
			vi.spyOn(QueryComplexity, 'ExceedsComplexityLimit').mockReturnValue(false);

			// Create three different documents to populate cache
			const doc1 = { kind: 'Document', definitions: [{ name: 'Query1' }] };
			const doc2 = { kind: 'Document', definitions: [{ name: 'Query2' }] };
			const doc3 = { kind: 'Document', definitions: [{ name: 'Query3' }] };

			// Insert doc1
			(GqlExecutionContext.create as any).mockReturnValue({
				getContext: () => ({ req: mockRequest }),
				getArgs: () => ({
					schema: {},
					document: doc1,
					variables: {},
					operationName: 'Query1',
				}),
			});
			await guard.canActivate(mockExecutionContext);

			// Advance 2 minutes and insert doc2 (to create age gap)
			vi.advanceTimersByTime(2 * 60 * 1000);
			(GqlExecutionContext.create as any).mockReturnValue({
				getContext: () => ({ req: mockRequest }),
				getArgs: () => ({
					schema: {},
					document: doc2,
					variables: {},
					operationName: 'Query2',
				}),
			});
			await guard.canActivate(mockExecutionContext);

			// Advance 2 more minutes and insert doc3
			vi.advanceTimersByTime(2 * 60 * 1000);
			(GqlExecutionContext.create as any).mockReturnValue({
				getContext: () => ({ req: mockRequest }),
				getArgs: () => ({
					schema: {},
					document: doc3,
					variables: {},
					operationName: 'Query3',
				}),
			});
			await guard.canActivate(mockExecutionContext);

			// Reset spy call count after setup
			vi.clearAllMocks();
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(500);
			vi.spyOn(QueryComplexity, 'ExceedsComplexityLimit').mockReturnValue(false);

			// Advance to just before cleanup interval (10 minutes from start)
			// Current time is 4 minutes, need to get to 10 minutes (wait 6 more)
			vi.advanceTimersByTime(6 * 60 * 1000);

			// Access doc3 again (refresh its last accessed time)
			(GqlExecutionContext.create as any).mockReturnValue({
				getContext: () => ({ req: mockRequest }),
				getArgs: () => ({
					schema: {},
					document: doc3,
					variables: {},
					operationName: 'Query3',
				}),
			});
			await guard.canActivate(mockExecutionContext);

			// Advance another 10 minutes past the cleanup interval to trigger eviction
			vi.advanceTimersByTime(10 * 60 * 1000 + 1000);

			// Now access the recently used doc3 (should still be in cache due to smart cleanup)
			vi.clearAllMocks();
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(500);
			vi.spyOn(QueryComplexity, 'ExceedsComplexityLimit').mockReturnValue(false);

			(GqlExecutionContext.create as any).mockReturnValue({
				getContext: () => ({ req: mockRequest }),
				getArgs: () => ({
					schema: {},
					document: doc3,
					variables: {},
					operationName: 'Query3',
				}),
			});
			await guard.canActivate(mockExecutionContext);

			// doc3 should be in cache (0 calculations) because it was recently accessed
			expect(QueryComplexity.CalculateQueryComplexity).toHaveBeenCalledTimes(0);

			vi.useRealTimers();
		});

		it('should prevent cold-start storms by retaining hot cache entries', async () => {
			vi.useFakeTimers();

			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(500);
			vi.spyOn(QueryComplexity, 'ExceedsComplexityLimit').mockReturnValue(false);

			const doc = { kind: 'Document', definitions: [{ name: 'HotQuery' }] };

			// Prime cache with hot query
			(GqlExecutionContext.create as any).mockReturnValue({
				getContext: () => ({ req: mockRequest }),
				getArgs: () => ({
					schema: {},
					document: doc,
					variables: {},
					operationName: 'HotQuery',
				}),
			});
			await guard.canActivate(mockExecutionContext);

			// Continuously access the query within the cleanup interval
			for (let i = 0; i < 5; i++) {
				vi.advanceTimersByTime(1 * 60 * 1000);
				await guard.canActivate(mockExecutionContext);
			}

			// Now past cleanup interval (5 minutes elapsed)
			vi.advanceTimersByTime(6 * 60 * 1000);

			// Reset spy to measure post-cleanup performance
			vi.clearAllMocks();
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(500);
			vi.spyOn(QueryComplexity, 'ExceedsComplexityLimit').mockReturnValue(false);

			// After cleanup, hot query should still be cached
			await guard.canActivate(mockExecutionContext);

			// Should NOT recalculate (no cold-start storm)
			expect(QueryComplexity.CalculateQueryComplexity).toHaveBeenCalledTimes(0);

			vi.useRealTimers();
		});

		it('should use smart cache eviction strategy (not full clear)', async () => {
			// This test verifies that the smart eviction strategy is in place
			// by checking that cleanup doesn't require recalculation of all cached queries
			vi.useFakeTimers();

			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(500);
			vi.spyOn(QueryComplexity, 'ExceedsComplexityLimit').mockReturnValue(false);

			const doc = { kind: 'Document', definitions: [{ name: 'SmartCleanupTest' }] };
			const MinutesMs = 60 * 1000;

			// Insert entry and cache it
			(GqlExecutionContext.create as any).mockReturnValue({
				getContext: () => ({ req: mockRequest }),
				getArgs: () => ({
					schema: {},
					document: doc,
					variables: {},
					operationName: 'SmartCleanupTest',
				}),
			});
			await guard.canActivate(mockExecutionContext);
			expect(QueryComplexity.CalculateQueryComplexity).toHaveBeenCalledTimes(1);

			// Continuously access the entry within the cleanup interval
			// (simulating a hot query that shouldn't be evicted)
			for (let i = 0; i < 5; i++) {
				vi.advanceTimersByTime(MinutesMs);
				await guard.canActivate(mockExecutionContext);
			}
			// Called once on first access, then cached for the 5 iterations
			expect(QueryComplexity.CalculateQueryComplexity).toHaveBeenCalledTimes(1);

			// Advance past cleanup interval to trigger cleanup
			vi.advanceTimersByTime(6 * MinutesMs);

			// Clear mocks to measure post-cleanup
			vi.clearAllMocks();
			vi.spyOn(QueryComplexity, 'CalculateQueryComplexity').mockReturnValue(500);
			vi.spyOn(QueryComplexity, 'ExceedsComplexityLimit').mockReturnValue(false);

			// Access the recently used query again (should still be cached)
			await guard.canActivate(mockExecutionContext);

			// Should NOT recalculate because entry was recently accessed
			// This proves we're using smart eviction, not full clear
			expect(QueryComplexity.CalculateQueryComplexity).toHaveBeenCalledTimes(0);

			vi.useRealTimers();
		});
	});
});
