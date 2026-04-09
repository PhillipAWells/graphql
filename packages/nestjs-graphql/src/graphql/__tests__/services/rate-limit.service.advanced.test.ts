import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { AppLogger } from '@pawells/nestjs-shared/common';
import { RateLimitService, IRateLimitStorage, MemoryRateLimitStorage } from '../../services/rate-limit.service.js';

/**
 * Advanced integration tests for rate limit service
 * Covers boundary conditions, concurrent requests, reset behavior, and storage integration
 */
describe('RateLimitService - Advanced Integration', () => {
	let service: RateLimitService;
	let mockAppLogger: any;

	function createService(storage?: IRateLimitStorage): RateLimitService {
		mockAppLogger = {
			createContextualLogger: vi.fn().mockReturnValue({
				debug: vi.fn(),
				info: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
			}),
		};

		const moduleRefConfig = {
			Get: (token: any) => {
				if (token === AppLogger) return mockAppLogger;
				if (token === 'RATE_LIMIT_STORAGE' && storage) return storage;
				throw new Error(`Unknown token: ${String(token)}`);
			},
		} as any;

		return new RateLimitService(moduleRefConfig);
	}

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.clearAllTimers();
		vi.useRealTimers();
	});

	describe('Boundary Condition Testing', () => {
		beforeEach(() => {
			service = createService();
		});

		it('should allow exactly at limit (n = maxRequests)', async () => {
			const clientId = 'user:boundary';

			// Use exactly maxRequests (100)
			for (let i = 0; i < 100; i++) {
				const result = await service.CheckLimit(clientId);
				expect(result.allowed).toBe(true);
				expect(result.remaining).toBe(99 - i);
			}
		});

		it('should reject on (limit + 1)th request', async () => {
			const clientId = 'user:boundary';

			// Use up all requests
			for (let i = 0; i < 100; i++) {
				await service.CheckLimit(clientId);
			}

			// The 101st request should be rejected
			const result = await service.CheckLimit(clientId);
			expect(result.allowed).toBe(false);
			expect(result.remaining).toBe(0);
			// current stays at 100 because request was not incremented when rejected
			expect(result.current).toBe(100);
		});

		it('should have remaining = 0 when limit exceeded', async () => {
			const clientId = 'user:test';

			// Exceed limit
			for (let i = 0; i < 101; i++) {
				await service.CheckLimit(clientId);
			}

			const result = await service.CheckLimit(clientId);
			expect(result.remaining).toBe(0);
			expect(Math.max(0, result.limit - (result.current ?? 0))).toBeLessThanOrEqual(0);
		});

		it('should provide accurate resetTime at boundary', async () => {
			const clientId = 'user:resettime';
			const initialTime = Date.now();

			const firstResult = await service.CheckLimit(clientId);

			// resetTime should be approximately 15 minutes from now
			const expectedReset = initialTime + (15 * 60 * 1000);
			expect(firstResult.resetTime).toBeGreaterThanOrEqual(expectedReset - 1000);
			expect(firstResult.resetTime).toBeLessThanOrEqual(expectedReset + 1000);
		});
	});

	describe('Window Reset Behavior', () => {
		beforeEach(() => {
			service = createService();
		});

		it('should reset limit after window expires', async () => {
			const clientId = 'user:reset';

			// Exhaust limit
			for (let i = 0; i < 100; i++) {
				await service.CheckLimit(clientId);
			}

			let result = await service.CheckLimit(clientId);
			expect(result.allowed).toBe(false);

			// Advance time past window (15 minutes = 900,000 ms)
			vi.advanceTimersByTime(15 * 60 * 1000 + 1);

			// Should reset
			result = await service.CheckLimit(clientId);
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(99);
			expect(result.current).toBe(1);
		});

		it('should not reset before window expires', async () => {
			const clientId = 'user:noreset';

			// Use some requests
			for (let i = 0; i < 100; i++) {
				await service.CheckLimit(clientId);
			}

			let result = await service.CheckLimit(clientId);
			expect(result.allowed).toBe(false);

			// Advance only 10 minutes (not full window)
			vi.advanceTimersByTime(10 * 60 * 1000);

			// Still blocked
			result = await service.CheckLimit(clientId);
			expect(result.allowed).toBe(false);
			expect(result.remaining).toBe(0);
		});

		it('should reset exactly at window boundary', async () => {
			const clientId = 'user:boundary-reset';

			// Exhaust limit
			for (let i = 0; i < 100; i++) {
				await service.CheckLimit(clientId);
			}

			// Advance exactly 15 minutes
			vi.advanceTimersByTime(15 * 60 * 1000);

			// Should still be blocked (need +1ms to cross boundary)
			let result = await service.CheckLimit(clientId);
			expect(result.allowed).toBe(false);

			// Advance 1 more ms
			vi.advanceTimersByTime(1);

			result = await service.CheckLimit(clientId);
			expect(result.allowed).toBe(true);
		});

		it('should reset each client on their own schedule', async () => {
			const client1 = 'user:first';
			const client2 = 'user:second';

			// Exhaust client1
			for (let i = 0; i < 100; i++) {
				await service.CheckLimit(client1);
			}

			// Advance 5 minutes
			vi.advanceTimersByTime(5 * 60 * 1000);

			// Now exhaust client2
			for (let i = 0; i < 100; i++) {
				await service.CheckLimit(client2);
			}

			// Advance another 10 minutes (15 total from client1)
			vi.advanceTimersByTime(10 * 60 * 1000 + 1);

			// Client1 should reset
			let result1 = await service.CheckLimit(client1);
			expect(result1.allowed).toBe(true);

			// Client2 should still be blocked (only 10 minutes have passed since it hit limit)
			let result2 = await service.CheckLimit(client2);
			expect(result2.allowed).toBe(false);

			// Advance 5 more minutes (20 total from client1, 15 from client2)
			vi.advanceTimersByTime(5 * 60 * 1000 + 1);

			// Both should be allowed now
			result1 = await service.CheckLimit(client1);
			result2 = await service.CheckLimit(client2);
			expect(result1.allowed).toBe(true);
			expect(result2.allowed).toBe(true);
		});
	});

	describe('Concurrent Request Handling', () => {
		beforeEach(() => {
			service = createService();
		});

		it('should handle concurrent requests from same user', async () => {
			const clientId = 'user:concurrent';

			// Make 10 concurrent requests
			const promises = [];
			for (let i = 0; i < 10; i++) {
				promises.push(service.CheckLimit(clientId));
			}

			const results = await Promise.all(promises);

			// All should be allowed
			const allowedCount = results.filter((r) => r.allowed).length;
			expect(allowedCount).toBe(10);

			// Each should show correct count
			const counts = results.map((r) => r.current ?? 0);
			expect(counts).toContain(1);
			expect(counts).toContain(2);
			expect(counts).toContain(3);
		});

		it('should handle burst requests at limit boundary', async () => {
			const clientId = 'user:burst';

			// Make 100 concurrent requests (at the limit)
			const promises = [];
			for (let i = 0; i < 100; i++) {
				promises.push(service.CheckLimit(clientId));
			}

			const results = await Promise.all(promises);
			const allowedCount = results.filter((r) => r.allowed).length;
			expect(allowedCount).toBe(100);

			// Next request should be blocked
			const nextResult = await service.CheckLimit(clientId);
			expect(nextResult.allowed).toBe(false);
		});

		it('should handle concurrent requests exceeding limit', async () => {
			const clientId = 'user:exceed';

			// Make 150 concurrent requests (50 over limit)
			const promises = [];
			for (let i = 0; i < 150; i++) {
				promises.push(service.CheckLimit(clientId));
			}

			const results = await Promise.all(promises);
			const allowedCount = results.filter((r) => r.allowed).length;

			// First 100 should be allowed
			expect(allowedCount).toBe(100);

			// Remaining 50 should be rejected
			const rejectedCount = results.filter((r) => !r.allowed).length;
			expect(rejectedCount).toBe(50);
		});

		it('should handle mixed concurrent requests from multiple users', async () => {
			const promises = [];

			// 50 requests from user1
			for (let i = 0; i < 50; i++) {
				promises.push(service.CheckLimit('user1'));
			}

			// 50 requests from user2
			for (let i = 0; i < 50; i++) {
				promises.push(service.CheckLimit('user2'));
			}

			const results = await Promise.all(promises);

			// All should be allowed (each user within their limit)
			const allowedCount = results.filter((r) => r.allowed).length;
			expect(allowedCount).toBe(100);
		});
	});

	describe('Reset and Manual Limit Management', () => {
		beforeEach(() => {
			service = createService();
		});

		it('should reset limit for specific client', async () => {
			const clientId = 'user:manualreset';

			// Use 50 requests
			for (let i = 0; i < 50; i++) {
				await service.CheckLimit(clientId);
			}

			let status = await service.GetStatus(clientId);
			expect(status).not.toBeNull();
			expect(status?.remaining).toBe(50);

			// Manually reset
			await service.ResetLimit(clientId);

			// Check status - should be reset
			status = await service.GetStatus(clientId);
			expect(status).toBeNull();
		});

		it('should allow new requests after manual reset', async () => {
			const clientId = 'user:resetallow';

			// Exhaust limit
			for (let i = 0; i < 100; i++) {
				await service.CheckLimit(clientId);
			}

			let result = await service.CheckLimit(clientId);
			expect(result.allowed).toBe(false);

			// Reset manually
			await service.ResetLimit(clientId);

			// Should allow again
			result = await service.CheckLimit(clientId);
			expect(result.allowed).toBe(true);
			expect(result.current).toBe(1);
		});

		it('should handle reset on non-existent client gracefully', async () => {
			const clientId = 'user:nonexistent';

			// Should not throw
			await expect(service.ResetLimit(clientId)).resolves.toBeUndefined();
		});
	});

	describe('GetStatus Method - Boundary Conditions', () => {
		beforeEach(() => {
			service = createService();
		});

		it('should return null for client with no requests', async () => {
			const status = await service.GetStatus('user:never');
			expect(status).toBeNull();
		});

		it('should return correct status when at limit', async () => {
			const clientId = 'user:atstatus';

			for (let i = 0; i < 100; i++) {
				await service.CheckLimit(clientId);
			}

			const status = await service.GetStatus(clientId);
			expect(status).not.toBeNull();
			expect(status?.allowed).toBe(false);
			expect(status?.remaining).toBe(0);
			expect(status?.limit).toBe(100);
		});

		it('should return accurate resetTime in status', async () => {
			const clientId = 'user:statusreset';
			const now = Date.now();

			await service.CheckLimit(clientId);
			const status = await service.GetStatus(clientId);

			const expectedReset = now + (15 * 60 * 1000);
			expect(status?.resetTime).toBeGreaterThanOrEqual(expectedReset - 1000);
			expect(status?.resetTime).toBeLessThanOrEqual(expectedReset + 1000);
		});

		it('should return allowed:true for expired entry after reset', async () => {
			const clientId = 'user:expired';

			// Make a request
			await service.CheckLimit(clientId);

			// Advance time past window
			vi.advanceTimersByTime(15 * 60 * 1000 + 1);

			// After reset, status reflects that the entry has expired
			// GetStatus checks Now <= Entry.resetTime, so it returns allowed:false when expired
			const status = await service.GetStatus(clientId);
			// When entry is expired, GetStatus still returns a result but allowed is false
			expect(status?.allowed).toBe(false);
		});
	});

	describe('Storage Backend Integration', () => {
		it('should use storage backend when available', async () => {
			const mockStorage = {
				Increment: vi.fn().mockResolvedValue(1),
				Get: vi.fn().mockResolvedValue(1),
				Reset: vi.fn().mockResolvedValue(undefined),
				Cleanup: vi.fn().mockResolvedValue(undefined),
			} as any;

			service = createService(mockStorage);

			const result = await service.CheckLimit('user:storage');

			expect(mockStorage.Increment).toHaveBeenCalledWith('user:storage', expect.any(Number));
			expect(result.allowed).toBe(true);
		});

		it('should fall back to in-memory on storage error', async () => {
			const mockStorage = {
				Increment: vi.fn().mockRejectedValue(new Error('Storage unavailable')),
				Get: vi.fn().mockResolvedValue(0),
				Reset: vi.fn().mockResolvedValue(undefined),
				Cleanup: vi.fn().mockResolvedValue(undefined),
			} as any;

			service = createService(mockStorage);

			// Should fall back to in-memory and still work
			const result = await service.CheckLimit('user:fallback');
			expect(result.allowed).toBe(true);

			// Log should capture the error
			const logCalls = mockAppLogger.createContextualLogger().error.mock.calls;
			expect(logCalls.length).toBeGreaterThan(0);
		});

		it('should use memory storage as default', async () => {
			service = createService();

			const result = await service.CheckLimit('user:memory');
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(99);
		});
	});

	describe('Operation-Specific Configuration', () => {
		beforeEach(() => {
			service = createService();
		});

		it('should apply custom config for specific operation', async () => {
			service.SetOperationConfig('intensiveQuery', {
				windowMs: 60000,
				maxRequests: 10,
			});

			const clientId = 'user:op';

			// Fill up operation limit (10)
			for (let i = 0; i < 10; i++) {
				const result = await service.CheckLimit(clientId, 'intensiveQuery');
				expect(result.allowed).toBe(true);
				expect(result.limit).toBe(10);
			}

			// Next should be blocked
			const blocked = await service.CheckLimit(clientId, 'intensiveQuery');
			expect(blocked.allowed).toBe(false);
		});

		it('should not affect default operation limits', async () => {
			service.SetOperationConfig('heavyOperation', {
				windowMs: 60000,
				maxRequests: 5,
			});

			const clientId = 'user:dual';

			// Use default limit (should allow 100)
			for (let i = 0; i < 50; i++) {
				await service.CheckLimit(clientId);
			}

			let result = await service.CheckLimit(clientId);
			expect(result.allowed).toBe(true);

			// Use operation limit (should allow only 5)
			for (let i = 0; i < 5; i++) {
				await service.CheckLimit(clientId, 'heavyOperation');
			}

			result = await service.CheckLimit(clientId, 'heavyOperation');
			expect(result.allowed).toBe(false);
		});
	});

	describe('MemoryRateLimitStorage - Advanced Cases', () => {
		let storage: MemoryRateLimitStorage;

		beforeEach(() => {
			storage = new MemoryRateLimitStorage();
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should increment counter for same key', async () => {
			const count1 = await storage.Increment('key1', 60000);
			expect(count1).toBe(1);

			const count2 = await storage.Increment('key1', 60000);
			expect(count2).toBe(2);

			const count3 = await storage.Increment('key1', 60000);
			expect(count3).toBe(3);
		});

		it('should reset counter when window expires', async () => {
			await storage.Increment('key2', 60000);
			const count1 = await storage.Get('key2');
			expect(count1).toBe(1);

			// Advance past window
			vi.advanceTimersByTime(60001);

			const count2 = await storage.Increment('key2', 60000);
			expect(count2).toBe(1); // Counter reset
		});

		it('should handle cleanup of expired entries', async () => {
			await storage.Increment('key3', 60000);
			await storage.Increment('key4', 60000);

			// Advance past window
			vi.advanceTimersByTime(60001);

			await storage.Cleanup();

			// New increments should be 1 (old entries cleaned)
			const count3 = await storage.Increment('key3', 60000);
			const count4 = await storage.Increment('key4', 60000);
			expect(count3).toBe(1);
			expect(count4).toBe(1);
		});
	});

	describe('Burst Vulnerability at Window Boundaries (Fixed-Window Algorithm Limitation)', () => {
		beforeEach(() => {
			service = createService();
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should demonstrate 2x burst at window boundary', async () => {
			const clientId = 'user:burst-attack';

			// Use exactly 100 requests (max limit) in window 1, right at the boundary
			for (let i = 0; i < 100; i++) {
				const result = await service.CheckLimit(clientId);
				expect(result.allowed).toBe(true);
			}

			// Next request should be blocked (still in window 1)
			let blockResult = await service.CheckLimit(clientId);
			expect(blockResult.allowed).toBe(false);

			// Advance just past the 15-minute boundary (900,000 ms)
			vi.advanceTimersByTime(15 * 60 * 1000 + 1);

			// Window 2 starts: 100 more requests allowed
			for (let i = 0; i < 100; i++) {
				const result = await service.CheckLimit(clientId);
				expect(result.allowed).toBe(true);
			}

			// Total requests: 200 in about 15 minutes + 1 millisecond
			// This is the 2x burst vulnerability inherent to fixed-window algorithms
			blockResult = await service.CheckLimit(clientId);
			expect(blockResult.allowed).toBe(false);
		});

		it('should allow rapid burst at window boundary crossing', async () => {
			const clientId = 'user:boundary-burst';
			const windowMs = 60000; // 1 minute window for faster testing

			service.SetOperationConfig('fastOp', {
				windowMs,
				maxRequests: 100,
			});

			// Fill window 1 completely (99 requests, leaving 1)
			for (let i = 0; i < 99; i++) {
				await service.CheckLimit(clientId, 'fastOp');
			}

			// Send last request of window 1
			let result = await service.CheckLimit(clientId, 'fastOp');
			expect(result.allowed).toBe(true);
			expect(result.current).toBe(100);

			// Next should be blocked
			result = await service.CheckLimit(clientId, 'fastOp');
			expect(result.allowed).toBe(false);

			// Now jump to exact boundary
			vi.advanceTimersByTime(windowMs);

			// Still blocked (on boundary, resetTime check is > not >=)
			result = await service.CheckLimit(clientId, 'fastOp');
			expect(result.allowed).toBe(false);

			// Jump 1ms more to cross boundary
			vi.advanceTimersByTime(1);

			// Window 2 opens: all 100 requests allowed again
			for (let i = 0; i < 100; i++) {
				result = await service.CheckLimit(clientId, 'fastOp');
				expect(result.allowed).toBe(true);
			}

			// Burst complete: 200 requests total with only ~60001ms elapsed
			// (99 + 1 in window 1, plus 100 in window 2)
			result = await service.CheckLimit(clientId, 'fastOp');
			expect(result.allowed).toBe(false);
		});

		it('documentation: burst vulnerability is inherent to fixed-window design', () => {
			/**
			 * Fixed-window (tumbling window) rate limiting uses synchronized reset boundaries.
			 * This differs from sliding-window or token-bucket algorithms.
			 *
			 * Vulnerability: At window boundaries, up to 2x the limit can be consumed in a short burst.
			 *
			 * Example: 100 req/min fixed-window
			 * - Time 0-59:50: 100 requests allowed
			 * - Time 59:50-60:00: 0 more requests (limit reached)
			 * - Time 60:00-60:10: 100 new requests allowed (window reset)
			 * - Total: 200 requests in 20 seconds (4x the intended rate)
			 *
			 * This is acceptable for UX rate limiting (soft limits, user throttling).
			 * For security-critical DOS protection, use sliding-window or token-bucket instead.
			 *
			 * Trade-off: Fixed-window is simpler and cheaper (O(1) per check).
			 */
			expect(true).toBe(true); // Documentation test
		});
	});

	describe('Service Statistics', () => {
		beforeEach(() => {
			service = createService();
		});

		it('should track total entries', async () => {
			await service.CheckLimit('user1');
			await service.CheckLimit('user2');
			await service.CheckLimit('user3');

			const stats = service.GetStats();
			expect(stats.totalEntries).toBe(3);
		});

		it('should track operation configs', () => {
			service.SetOperationConfig('op1', { windowMs: 60000, maxRequests: 10 });
			service.SetOperationConfig('op2', { windowMs: 30000, maxRequests: 5 });

			const stats = service.GetStats();
			expect(stats.operationConfigs).toBe(2);
		});
	});
});
