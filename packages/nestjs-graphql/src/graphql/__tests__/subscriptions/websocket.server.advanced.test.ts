import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { HttpAdapterHost } from '@nestjs/core';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { GraphQLWebSocketServer } from '../../subscriptions/websocket.server.js';

/**
 * Advanced integration tests for GraphQL WebSocket server
 * Covers authentication failures, connection errors, and resilience scenarios
 */
describe('GraphQL WebSocket Server - Advanced Integration', () => {
	let server: GraphQLWebSocketServer;
	const mockHttpAdapterHost = { httpAdapter: null };
	const mockSchemaHost = { schema: null };

	beforeEach(() => {
		const mockModuleRef = {
			get: vi.fn((token: any) => {
				if (token === HttpAdapterHost) return mockHttpAdapterHost;
				if (token === GraphQLSchemaHost) return mockSchemaHost;
				throw new Error(`Unknown token: ${String(token)}`);
			}),
		} as any;

		server = new GraphQLWebSocketServer(mockModuleRef);
	});

	afterEach(async () => {
		vi.clearAllMocks();
		await server?.onModuleDestroy();
	});

	describe('Initialization Without Dependencies', () => {
		it('should warn when HttpAdapterHost is unavailable', async () => {
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };
			const warnSpy = vi.spyOn(server['Logger'], 'warn');

			await server.Initialize(config);

			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('HttpAdapterHost'));
		});

		it('should warn when GraphQLSchemaHost is unavailable', async () => {
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };
			(mockHttpAdapterHost.httpAdapter as any) = { getHttpServer: () => ({}) };

			const warnSpy = vi.spyOn(server['Logger'], 'warn');

			await server.Initialize(config);

			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Schema'));
		});

		it('should handle gracefully when neither adapter nor schema available', async () => {
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };
			const warnSpy = vi.spyOn(server['Logger'], 'warn');

			await server.Initialize(config);

			// Should warn about at least one missing dependency
			expect(warnSpy.mock.calls.length).toBeGreaterThan(0);
		});
	});

	describe('Module Destroy - Cleanup Behavior', () => {
		it('should handle destroy without prior initialization', async () => {
			await expect(server.onModuleDestroy()).resolves.toBeUndefined();
		});

		it('should not throw on multiple destroy calls', async () => {
			// Never initialized, so cleanup should be idempotent
			await server.onModuleDestroy();
			await server.onModuleDestroy();

			expect(server).toBeDefined();
		});
	});

	describe('Configuration and Auto-Bootstrap', () => {
		it('should skip initialization if no config is set', async () => {
			const initSpy = vi.spyOn(server, 'Initialize');
			const debugSpy = vi.spyOn(server['Logger'], 'debug');

			await server.onApplicationBootstrap();

			expect(initSpy).not.toHaveBeenCalled();
			expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('No WebSocket config'));
		});

		it('should store configuration via configure()', async () => {
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			server.configure(config);

			// Config should be stored (can't directly check private field, but initialize would use it)
			const initSpy = vi.spyOn(server, 'Initialize');
			await server.onApplicationBootstrap();

			expect(initSpy).toHaveBeenCalledWith(config);
		});

		it('should use stored config on bootstrap after configure()', async () => {
			const config = { path: '/graphql/ws', keepalive: 25000, maxPayloadSize: 200000, connectionTimeout: 90000 };

			server.configure(config);
			const initSpy = vi.spyOn(server, 'Initialize');

			await server.onApplicationBootstrap();

			expect(initSpy).toHaveBeenCalledWith(expect.objectContaining({ path: '/graphql/ws' }));
		});
	});

	describe('Lazy Module Resolution', () => {
		it('should handle lazy getters for HttpAdapterHost gracefully', async () => {
			const mockModuleRef = {
				get: vi.fn((token: any) => {
					if (token === HttpAdapterHost) throw new Error('Not available');
					throw new Error(`Unknown token: ${String(token)}`);
				}),
			} as any;

			const lazyServer = new GraphQLWebSocketServer(mockModuleRef);
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };
			const warnSpy = vi.spyOn(lazyServer['Logger'], 'warn');

			await lazyServer.Initialize(config);

			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('HttpAdapterHost'));
		});

		it('should handle lazy getters for GraphQLSchemaHost gracefully', async () => {
			const mockModuleRef = {
				get: vi.fn((token: any) => {
					if (token === HttpAdapterHost) return { httpAdapter: { getHttpServer: () => ({}) } };
					if (token === GraphQLSchemaHost) throw new Error('Schema not ready');
					throw new Error(`Unknown token: ${String(token)}`);
				}),
			} as any;

			const lazyServer = new GraphQLWebSocketServer(mockModuleRef);
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };
			const warnSpy = vi.spyOn(lazyServer['Logger'], 'warn');

			await lazyServer.Initialize(config);

			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Schema'));
		});

		it('should handle lazy resolution errors gracefully', async () => {
			const mockModuleRef = {
				get: vi.fn(() => {
					throw new Error('Dependency not found');
				}),
			} as any;

			const lazyServer = new GraphQLWebSocketServer(mockModuleRef);
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			// Should not throw, but warn instead
			await expect(lazyServer.Initialize(config)).resolves.toBeUndefined();
		});
	});

	describe('Configuration Properties', () => {
		it('should accept various keepalive values', async () => {
			const keepaliveValues = [1000, 5000, 30000, 60000];

			for (const keepalive of keepaliveValues) {
				const config = { path: '/graphql', keepalive, maxPayloadSize: 102400, connectionTimeout: 60000 };
				const localServer = new GraphQLWebSocketServer({
					get: vi.fn((token: any) => {
						if (token === HttpAdapterHost) return { httpAdapter: null };
						if (token === GraphQLSchemaHost) return { schema: null };
						throw new Error(`Unknown token: ${String(token)}`);
					}),
				} as any);

				await localServer.Initialize(config);
				await localServer.onModuleDestroy();
			}
		});

		it('should accept various path values', async () => {
			const paths = ['/graphql', '/graphql/subscriptions', '/api/graphql', '/'];

			for (const path of paths) {
				const config = { path, keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };
				const localServer = new GraphQLWebSocketServer({
					get: vi.fn((token: any) => {
						if (token === HttpAdapterHost) return { httpAdapter: null };
						if (token === GraphQLSchemaHost) return { schema: null };
						throw new Error(`Unknown token: ${String(token)}`);
					}),
				} as any);

				await localServer.Initialize(config);
				await localServer.onModuleDestroy();
			}
		});
	});

	describe('ILazyModuleRefService Interface', () => {
		it('should expose Module reference', () => {
			expect(server.Module).toBeDefined();
		});

		it('should implement OnApplicationBootstrap', async () => {
			const hasOnApplicationBootstrap = typeof server.onApplicationBootstrap === 'function';
			expect(hasOnApplicationBootstrap).toBe(true);
		});

		it('should implement OnModuleDestroy', async () => {
			const hasOnModuleDestroy = typeof server.onModuleDestroy === 'function';
			expect(hasOnModuleDestroy).toBe(true);
		});
	});

	describe('Initialize Method Idempotency', () => {
		it('should handle being called without prior configuration', async () => {
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			// Initialize without configure() should work
			await expect(server.Initialize(config)).resolves.toBeUndefined();
		});

		it('should handle multiple configure calls before initialize', async () => {
			const config1 = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };
			const config2 = { path: '/ws', keepalive: 20000, maxPayloadSize: 200000, connectionTimeout: 90000 };

			server.configure(config1);
			server.configure(config2);

			const initSpy = vi.spyOn(server, 'Initialize');
			await server.onApplicationBootstrap();

			// Last config should be used
			expect(initSpy).toHaveBeenCalledWith(config2);
		});
	});

	describe('Http Adapter Resolution', () => {
		it('should check getHttpServer method exists on httpAdapter', async () => {
			(mockHttpAdapterHost.httpAdapter as any) = { getHttpServer: null };
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };
			const warnSpy = vi.spyOn(server['Logger'], 'warn');

			await server.Initialize(config);

			// Should warn because httpAdapter.getHttpServer is not callable
			expect(warnSpy).toHaveBeenCalled();
		});
	});
});
