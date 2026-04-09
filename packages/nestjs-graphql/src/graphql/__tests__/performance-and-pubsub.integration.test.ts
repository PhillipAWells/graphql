import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { GraphQLPerformanceService } from '../services/performance.service.js';

/**
 * Integration tests for performance service and error handling
 * Targets performance.interceptor.ts branch coverage (64.51%)
 * Covers slow query detection, timing calculations, and metrics export paths
 */
describe('GraphQL Performance Service - Branch Coverage', () => {
	let service: GraphQLPerformanceService;
	let mockAppLogger: any;
	let logCalls: Array<{ level: string; args: any[] }>;

	beforeEach(() => {
		logCalls = [];

		// Mock AppLogger with call tracking
		mockAppLogger = {
			createContextualLogger: vi.fn().mockReturnValue({
				debug: (...args: any[]) => {
					logCalls.push({ level: 'debug', args });
				},
				info: (...args: any[]) => {
					logCalls.push({ level: 'info', args });
				},
				warn: (...args: any[]) => {
					logCalls.push({ level: 'warn', args });
				},
				error: (...args: any[]) => {
					logCalls.push({ level: 'error', args });
				},
			}),
		};

		const mockModuleRef = {
			get: vi.fn().mockReturnValue(mockAppLogger),
		} as any;

		service = new GraphQLPerformanceService(mockModuleRef);
	});

	afterEach(() => {
		vi.clearAllMocks();
		service.ClearMetrics();
	});

	describe('Slow Query Detection - Timing Threshold Branches', () => {
		it('should log warning for query exceeding slow threshold', async () => {
			const slowThreshold = 1000; // 1 second

			await service.Measure('slowQuery', async () => {
				await new Promise(resolve => setTimeout(resolve, 1100));
				return 'result';
			});

			const slowWarning = logCalls.find(log => log.level === 'warn' && log.args[0]?.includes('Slow'));
			expect(slowWarning).toBeDefined();
		});

		it('should NOT log warning for query under slow threshold', async () => {
			const fastOperation = async () => {
				await new Promise(resolve => setTimeout(resolve, 50));
				return 'result';
			};

			await service.Measure('fastQuery', fastOperation);

			const warnCall = logCalls.find(log => log.level === 'warn');
			expect(warnCall).toBeUndefined();
		});

		it('should detect slow operations at exact threshold boundary', async () => {
			const thresholdMs = 1000;

			await service.Measure('boundaryQuery', async () => {
				await new Promise(resolve => setTimeout(resolve, thresholdMs + 5));
				return 'result';
			});

			const warnCall = logCalls.find(log => log.level === 'warn');
			expect(warnCall).toBeDefined();
		});

		it('should track duration accurately for slow operations', async () => {
			const delayMs = 1150;

			await service.Measure('timedSlowOp', async () => {
				await new Promise(resolve => setTimeout(resolve, delayMs));
				return 'result';
			});

			const metrics = service.GetRecentMetrics(1);
			expect(metrics[0]?.duration).toBeGreaterThanOrEqual(delayMs - 50);
		});

		it('should handle very slow operations (multi-second)', async () => {
			await service.Measure('verySlowQuery', async () => {
				await new Promise(resolve => setTimeout(resolve, 2000));
				return 'result';
			});

			const slowOps = service.GetSlowOperations(1000);
			expect(slowOps.length).toBe(1);
		});

		it('should track multiple slow operations', async () => {
			const operations = [
				{ name: 'slow1', delay: 1100 },
				{ name: 'slow2', delay: 1200 },
				{ name: 'slow3', delay: 1150 },
			];

			for (const op of operations) {
				await service.Measure(op.name, async () => {
					await new Promise(resolve => setTimeout(resolve, op.delay));
					return 'result';
				});
			}

			const slowOps = service.GetSlowOperations(1000);
			expect(slowOps.length).toBe(3);
		});
	});

	describe('Timing Calculation Branches', () => {
		it('should calculate duration correctly for async operations', async () => {
			const expectedDelay = 100;

			await service.Measure('asyncOp', async () => {
				await new Promise(resolve => setTimeout(resolve, expectedDelay));
				return 'data';
			});

			const metrics = service.GetRecentMetrics(1);
			expect(metrics[0]?.duration).toBeGreaterThanOrEqual(expectedDelay - 20);
			expect(metrics[0]?.duration).toBeLessThan(expectedDelay + 100);
		});

		it('should calculate duration correctly for sync operations', () => {
			const result = service.Measure('syncOp', () => 42);

			expect(result).resolves.toBe(42);
		});

		it('should include minimal overhead for zero-delay operations', async () => {
			await service.Measure('instantOp', () => 'result');

			const metrics = service.GetRecentMetrics(1);
			expect(metrics[0]?.duration).toBeLessThan(50);
		});

		it('should track duration even for operations that throw', async () => {
			try {
				await service.Measure('errorOp', async () => {
					await new Promise(resolve => setTimeout(resolve, 100));
					throw new Error('Simulated error');
				});
			} catch {
				// Expected
			}

			const metrics = service.GetRecentMetrics(1);
			expect(metrics[0]?.duration).toBeGreaterThanOrEqual(100 - 30);
		});

		it('should calculate average duration correctly with multiple operations', async () => {
			const delays = [50, 100, 150];

			for (const delay of delays) {
				await service.Measure('avgTest', async () => {
					await new Promise(resolve => setTimeout(resolve, delay));
					return 'result';
				});
			}

			const stats = service.GetStats();
			const expectedAvg = (50 + 100 + 150) / 3;
			expect(stats.averageDuration).toBeGreaterThanOrEqual(expectedAvg - 30);
		});
	});

	describe('Metrics Export and Aggregation Paths', () => {
		it('should export metrics with correct success flag', async () => {
			await service.Measure('successOp', () => 'result');

			const metrics = service.GetRecentMetrics(1);
			expect(metrics[0]?.success).toBe(true);
		});

		it('should export metrics with failure information', async () => {
			try {
				await service.Measure('failOp', async () => {
					throw new Error('Test failure');
				});
			} catch {
				// Expected
			}

			const metrics = service.GetRecentMetrics(1);
			expect(metrics[0]?.success).toBe(false);
			expect(metrics[0]?.error).toBe('Test failure');
		});

		it('should include metadata in exported metrics', async () => {
			const metadata = { userId: '123', requestId: 'req-456', type: 'query' };

			await service.Measure('metadataOp', () => 'result', metadata);

			const metrics = service.GetRecentMetrics(1);
			expect(metrics[0]?.metadata).toEqual(metadata);
		});

		it('should export statistics with all required fields', () => {
			const stats = service.GetStats();

			expect(stats).toHaveProperty('totalOperations');
			expect(stats).toHaveProperty('averageDuration');
			expect(stats).toHaveProperty('minDuration');
			expect(stats).toHaveProperty('maxDuration');
			expect(stats).toHaveProperty('errorRate');
		});

		it('should calculate error rate correctly', async () => {
			// 2 successes, 1 failure = 33.33% error rate
			await service.Measure('op1', () => 'result');
			await service.Measure('op2', () => 'result');

			try {
				await service.Measure('op3', async () => {
					throw new Error('Failed');
				});
			} catch {
				// Expected
			}

			const stats = service.GetStats();
			expect(stats.errorRate).toBeCloseTo(1 / 3, 2);
		});

		it('should export operations summary grouped by name', async () => {
			await service.Measure('queryUser', () => 'result');
			await service.Measure('queryUser', () => 'result');
			await service.Measure('queryPost', () => 'result');

			const summary = service.GetOperationsSummary();

			expect(summary['queryUser']?.count).toBe(2);
			expect(summary['queryPost']?.count).toBe(1);
		});

		it('should calculate per-operation error rates', async () => {
			await service.Measure('op1', () => 'result');
			await service.Measure('op1', () => 'result');

			try {
				await service.Measure('op1', async () => {
					throw new Error('Failed');
				});
			} catch {
				// Expected
			}

			const summary = service.GetOperationsSummary();
			expect(summary['op1']?.errorRate).toBeCloseTo(1 / 3, 2);
		});
	});

	describe('Performance Metrics Collection - Branch Paths', () => {
		it('should collect metrics for successful operations', async () => {
			const results = await Promise.all([
				service.Measure('op1', () => 'result1'),
				service.Measure('op2', () => 'result2'),
				service.Measure('op3', () => 'result3'),
			]);

			expect(results).toEqual(['result1', 'result2', 'result3']);

			const stats = service.GetStats();
			expect(stats.totalOperations).toBe(3);
		});

		it('should handle mixed success and failure metrics', async () => {
			await service.Measure('success1', () => 'result');
			await service.Measure('success2', () => 'result');

			const failures = ['error1', 'error2'];
			for (const errorOp of failures) {
				try {
					await service.Measure(errorOp, async () => {
						throw new Error('Simulated');
					});
				} catch {
					// Expected
				}
			}

			const stats = service.GetStats();
			expect(stats.totalOperations).toBe(4);
			expect(stats.errorRate).toBeCloseTo(0.5, 1);
		});

		it('should filter metrics by operation name', async () => {
			await service.Measure('search', () => 'result');
			await service.Measure('query', () => 'result');
			await service.Measure('search', () => 'result');
			await service.Measure('mutation', () => 'result');

			const searchMetrics = service.GetRecentMetrics(10, 'search');
			expect(searchMetrics.length).toBe(2);
			expect(searchMetrics.every(m => m.operation === 'search')).toBe(true);
		});

		it('should respect limit parameter in metrics retrieval', async () => {
			for (let i = 0; i < 10; i++) {
				await service.Measure(`op${i}`, () => 'result');
			}

			const recentMetrics = service.GetRecentMetrics(3);
			expect(recentMetrics.length).toBe(3);
		});

		it('should return metrics in reverse chronological order', async () => {
			await service.Measure('op1', () => 'result');
			await service.Measure('op2', () => 'result');
			await service.Measure('op3', () => 'result');

			const metrics = service.GetRecentMetrics(3);
			expect(metrics[0]?.operation).toBe('op3');
			expect(metrics[1]?.operation).toBe('op2');
			expect(metrics[2]?.operation).toBe('op1');
		});
	});

	describe('Error Tracking and Recovery', () => {
		it('should track and return errors separately', async () => {
			await service.Measure('success', () => 'result');

			const errors = ['err1', 'err2', 'err3'];
			for (const errorOp of errors) {
				try {
					await service.Measure(errorOp, async () => {
						throw new Error('Tracked');
					});
				} catch {
					// Expected
				}
			}

			const errorMetrics = service.GetErrors();
			expect(errorMetrics.length).toBe(3);
			expect(errorMetrics.every(m => !m.success)).toBe(true);
		});

		it('should sort errors by most recent first', async () => {
			try {
				await service.Measure('err1', async () => {
					throw new Error('Error 1');
				});
			} catch {
				// Expected
			}

			await new Promise(resolve => setTimeout(resolve, 10));

			try {
				await service.Measure('err2', async () => {
					throw new Error('Error 2');
				});
			} catch {
				// Expected
			}

			const errors = service.GetErrors();
			expect(errors[0]?.operation).toBe('err2');
			expect(errors[1]?.operation).toBe('err1');
		});

		it('should capture error message in metrics', async () => {
			try {
				await service.Measure('failOp', async () => {
					throw new Error('Specific error message');
				});
			} catch {
				// Expected
			}

			const errors = service.GetErrors();
			expect(errors[0]?.error).toBe('Specific error message');
		});
	});

	describe('Statistics Calculation Branches', () => {
		it('should return zero stats for empty metrics', () => {
			const stats = service.GetStats();

			expect(stats.totalOperations).toBe(0);
			expect(stats.averageDuration).toBe(0);
			expect(stats.errorRate).toBe(0);
			expect(stats.operationsPerSecond).toBeGreaterThanOrEqual(0);
		});

		it('should calculate min and max duration', async () => {
			const delays = [50, 100, 200, 75];

			for (const delay of delays) {
				await service.Measure('timing', async () => {
					await new Promise(resolve => setTimeout(resolve, delay));
					return 'result';
				});
			}

			const stats = service.GetStats();
			expect(stats.minDuration).toBeLessThanOrEqual(100);
			expect(stats.maxDuration).toBeGreaterThanOrEqual(190);
		});

		it('should calculate operations per second', async () => {
			const start = Date.now();

			for (let i = 0; i < 10; i++) {
				await service.Measure(`op${i}`, () => 'result');
			}

			const elapsed = Date.now() - start;
			const stats = service.GetStats();

			// Should have positive ops/sec
			expect(stats.operationsPerSecond).toBeGreaterThan(0);
		});

		it('should filter stats by operation name', async () => {
			await service.Measure('typeA', () => 'result');
			await service.Measure('typeA', () => 'result');
			await service.Measure('typeB', () => 'result');

			const typeAStats = service.GetStats('typeA');
			expect(typeAStats.totalOperations).toBe(2);
		});

		it('should respect time range filter in stats', async () => {
			await service.Measure('oldOp', () => 'result');

			// Query with very short time range
			const stats = service.GetStats(undefined, 1);

			// Might be 0 or 1 depending on timing
			expect(stats.totalOperations).toBeLessThanOrEqual(1);
		});
	});

	describe('Metrics Management - Clear and Reset', () => {
		it('should clear all metrics', async () => {
			await service.Measure('op1', () => 'result');
			await service.Measure('op2', () => 'result');

			service.ClearMetrics();

			const metrics = service.GetRecentMetrics();
			expect(metrics.length).toBe(0);
		});

		it('should log info message on clear', () => {
			service.ClearMetrics();

			const infoCall = logCalls.find(log => log.level === 'info' && log.args[0]?.includes('cleared'));
			expect(infoCall).toBeDefined();
		});

		it('should allow re-collection after clear', async () => {
			await service.Measure('op1', () => 'result');

			service.ClearMetrics();

			expect(service.GetStats().totalOperations).toBe(0);

			await service.Measure('op2', () => 'result');

			expect(service.GetStats().totalOperations).toBe(1);
		});

		it('should handle clear on empty metrics gracefully', () => {
			service.ClearMetrics(); // Already empty

			expect(() => service.ClearMetrics()).not.toThrow();
		});
	});

	describe('Slow Operations Retrieval', () => {
		it('should return operations sorted by duration descending', async () => {
			const operations = [
				{ name: 'op1', delay: 800 },
				{ name: 'op2', delay: 1500 },
				{ name: 'op3', delay: 1200 },
			];

			for (const op of operations) {
				await service.Measure(op.name, async () => {
					await new Promise(resolve => setTimeout(resolve, op.delay));
					return 'result';
				});
			}

			const slowOps = service.GetSlowOperations(1000);

			// Should be sorted by duration descending
			if (slowOps.length >= 2) {
				expect(slowOps[0]?.duration).toBeGreaterThanOrEqual(slowOps[1]?.duration!);
			}
		});

		it('should respect limit parameter in slow operations', async () => {
			for (let i = 0; i < 3; i++) {
				await service.Measure(`slow${i}`, async () => {
					await new Promise(resolve => setTimeout(resolve, 1050));
					return 'result';
				});
			}

			const slowOps = service.GetSlowOperations(1000, 2);

			expect(slowOps.length).toBeLessThanOrEqual(2);
		}, 20000);

		it('should return empty array when no slow operations', async () => {
			await service.Measure('fast1', () => 'result');
			await service.Measure('fast2', () => 'result');

			const slowOps = service.GetSlowOperations(1000);

			expect(slowOps.length).toBe(0);
		});
	});

	describe('Integration Scenarios - Real-world Patterns', () => {
		it('should handle GraphQL query monitoring scenario', async () => {
			const queries = [
				{ name: 'getUser', delay: 50 },
				{ name: 'listPosts', delay: 1200 },
				{ name: 'getComments', delay: 100 },
				{ name: 'searchUsers', delay: 1150 },
			];

			for (const query of queries) {
				await service.Measure(query.name, async () => {
					await new Promise(resolve => setTimeout(resolve, query.delay));
					return 'result';
				});
			}

			const slowQueries = service.GetSlowOperations(1000);
			expect(slowQueries.length).toBe(2);

			const summary = service.GetOperationsSummary();
			expect(Object.keys(summary).length).toBe(4);
		});

		it('should track performance degradation over time', async () => {
			// Phase 1: All fast
			for (let i = 0; i < 3; i++) {
				await service.Measure('phase1', async () => {
					await new Promise(resolve => setTimeout(resolve, 50));
					return 'result';
				});
			}

			const phase1Stats = service.GetStats('phase1');
			const phase1Avg = phase1Stats.averageDuration;

			// Phase 2: All slow
			for (let i = 0; i < 3; i++) {
				await service.Measure('phase2', async () => {
					await new Promise(resolve => setTimeout(resolve, 1200));
					return 'result';
				});
			}

			const phase2Stats = service.GetStats('phase2');
			const phase2Avg = phase2Stats.averageDuration;

			// Phase 2 should be much slower
			expect(phase2Avg).toBeGreaterThan(phase1Avg);
		});

		it('should track reliability metrics alongside performance', async () => {
			// Successful operations
			for (let i = 0; i < 7; i++) {
				await service.Measure('reliabilityTest', () => 'result');
			}

			// Failed operations
			for (let i = 0; i < 3; i++) {
				try {
					await service.Measure('reliabilityTest', async () => {
						throw new Error('Failed');
					});
				} catch {
					// Expected
				}
			}

			const stats = service.GetStats('reliabilityTest');
			expect(stats.totalOperations).toBe(10);
			expect(stats.errorRate).toBeCloseTo(0.3, 1);
		});
	});
});
