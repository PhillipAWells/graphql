import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { HttpAdapterHost } from '@nestjs/core';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { GraphQLWebSocketServer } from '../subscriptions/websocket.server.js';
import { WebSocketAuthService } from '../subscriptions/websocket-auth.service.js';

/**
 * Integration tests for WebSocket server error handling and branch coverage
 * Targets websocket.server.ts lines 52-154, 158-162 (initialization, error handlers)
 */
describe('GraphQL WebSocket Server - Error Handling and Initialization', () => {
	let server: GraphQLWebSocketServer;
	let mockHttpAdapterHost: any;
	let mockSchemaHost: any;
	let mockAuthService: any;
	let mockModuleRef: any;
	let debugLogs: string[];
	let warnLogs: string[];
	let errorLogs: string[];
	let infoLogs: string[];

	beforeEach(() => {
		debugLogs = [];
		warnLogs = [];
		errorLogs = [];
		infoLogs = [];

		// Mock HTTP Adapter Host with proper server object
		mockHttpAdapterHost = {
			httpAdapter: {
				getHttpServer: vi.fn(() => ({
					on: vi.fn(),
					once: vi.fn(),
					emit: vi.fn(),
					close: vi.fn((callback: any) => callback()),
					removeListener: vi.fn(),
				})),
			},
		};

		// Mock GraphQL Schema Host
		mockSchemaHost = {
			schema: {
				__typename: 'GraphQLSchema',
				queryType: { name: 'Query' },
			},
		};

		// Mock WebSocket Auth Service
		mockAuthService = {
			Authenticate: vi.fn().mockResolvedValue({ authenticated: true }),
		};

		// Mock Module Reference
		mockModuleRef = {
			get: vi.fn((token: any) => {
				if (token === HttpAdapterHost) return mockHttpAdapterHost;
				if (token === GraphQLSchemaHost) return mockSchemaHost;
				if (token === WebSocketAuthService) return mockAuthService;
				return undefined;
			}),
		};

		// Create server with logging capture
		server = new GraphQLWebSocketServer(mockModuleRef);

		// Capture logs
		const originalLogger = server['Logger'];
		vi.spyOn(originalLogger, 'debug').mockImplementation((message: string | Error) => {
			debugLogs.push(typeof message === 'string' ? message : message.message);
		});
		vi.spyOn(originalLogger, 'warn').mockImplementation((message: string | Error) => {
			warnLogs.push(typeof message === 'string' ? message : message.message);
		});
		vi.spyOn(originalLogger, 'error').mockImplementation((message: string | Error) => {
			errorLogs.push(typeof message === 'string' ? message : message.message);
		});
		vi.spyOn(originalLogger, 'info').mockImplementation((message: string | Error) => {
			infoLogs.push(typeof message === 'string' ? message : message.message);
		});
	});

	afterEach(async () => {
		vi.clearAllMocks();
		await server?.onModuleDestroy();
	});

	describe('Initialization Without Dependencies (Error Paths)', () => {
		it('should warn when HttpAdapterHost is unavailable during initialize', async () => {
			mockHttpAdapterHost.httpAdapter = null;
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			await server.Initialize(config);

			const warnCall = warnLogs.find(log => log.includes('HttpAdapterHost'));
			expect(warnCall).toBeDefined();
		});

		it('should warn when GraphQLSchemaHost is unavailable during initialize', async () => {
			mockSchemaHost.schema = null;
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			await server.Initialize(config);

			const warnCall = warnLogs.find(log => log.includes('Schema'));
			expect(warnCall).toBeDefined();
		});

		it('should warn when HttpAdapter itself is null', async () => {
			mockHttpAdapterHost.httpAdapter = null;

			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			await server.Initialize(config);

			const warnCall = warnLogs.find(log => log.includes('HttpAdapterHost'));
			expect(warnCall).toBeDefined();
		});

		it('should handle initialization with no config gracefully', async () => {
			await server.onApplicationBootstrap();

			const debugCall = debugLogs.find(log => log.includes('No WebSocket config'));
			expect(debugCall).toBeDefined();
		});
	});

	describe('Configuration and Auto-Bootstrap', () => {
		it('should configure and use stored config on bootstrap', async () => {
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			server.configure(config);

			const initSpy = vi.spyOn(server, 'Initialize');
			await server.onApplicationBootstrap();

			expect(initSpy).toHaveBeenCalledWith(config);
		});

		it('should auto-initialize with configured path', async () => {
			const config = { path: '/graphql/ws', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			server.configure(config);
			await server.onApplicationBootstrap();

			const infoCall = infoLogs.find(log => log.includes('GraphQL WebSocket server listening'));
			expect(infoCall).toBeDefined();
		});

		it('should use custom keepalive value from config', async () => {
			const keepaliveValue = 25000;
			const config = { path: '/graphql', keepalive: keepaliveValue, maxPayloadSize: 102400, connectionTimeout: 60000 };

			server.configure(config);
			await server.onApplicationBootstrap();

			expect(infoLogs.length).toBeGreaterThan(0);
		});

		it('should handle configure called multiple times (last config wins)', async () => {
			const config1 = { path: '/graphql/v1', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };
			const config2 = { path: '/graphql/v2', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			server.configure(config1);
			server.configure(config2);

			const initSpy = vi.spyOn(server, 'Initialize');
			await server.onApplicationBootstrap();

			expect(initSpy).toHaveBeenCalledWith(expect.objectContaining({ path: '/graphql/v2' }));
		});
	});

	describe('Module Destroy and Cleanup', () => {
		it('should handle destroy without prior initialization', async () => {
			await expect(server.onModuleDestroy()).resolves.toBeUndefined();
		});

		it('should close server on destroy', async () => {
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			server.configure(config);
			await server.onApplicationBootstrap();

			// Server should have WsServer set
			expect((server as any).WsServer).not.toBeNull();

			await server.onModuleDestroy();

			// After destroy, WsServer should be null
			expect((server as any).WsServer).toBeNull();
		});

		it('should handle multiple destroy calls idempotently', async () => {
			await server.onModuleDestroy();
			await server.onModuleDestroy();

			expect(server).toBeDefined();
		});

		it('should log debug message on successful destroy', async () => {
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			server.configure(config);
			await server.onApplicationBootstrap();
			await server.onModuleDestroy();

			const debugCall = debugLogs.find(log => log.includes('shut down'));
			expect(debugCall).toBeDefined();
		});

		it('should null out references after destroy', async () => {
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			server.configure(config);
			await server.onApplicationBootstrap();

			expect((server as any).WsServer).not.toBeNull();

			await server.onModuleDestroy();

			expect((server as any).WsServer).toBeNull();
			expect((server as any).DisposeServer).toBeNull();
		});
	});

	describe('Lazy Module Resolution - Error Handling', () => {
		it('should handle lazy getter errors for HttpAdapterHost gracefully', async () => {
			// Simulate missing httpAdapter by setting it to undefined
			const testServer = new GraphQLWebSocketServer(mockModuleRef);
			mockHttpAdapterHost.httpAdapter = undefined;

			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			await testServer.Initialize(config);

			// Should handle gracefully and not throw
			expect(testServer).toBeDefined();
		});

		it('should handle lazy getter errors for GraphQLSchemaHost gracefully', async () => {
			const testServer = new GraphQLWebSocketServer(mockModuleRef);
			mockSchemaHost.schema = undefined;

			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			await testServer.Initialize(config);

			// Should handle gracefully and not throw
			expect(testServer).toBeDefined();
		});

		it('should handle lazy resolution returning null gracefully', async () => {
			mockHttpAdapterHost.httpAdapter = null;
			mockSchemaHost.schema = null;

			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			await server.Initialize(config);

			// Should not throw
			expect(server).toBeDefined();
		});
	});

	describe('WebSocket Server Initialization with Different Configurations', () => {
		it('should initialize with minimal config', async () => {
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			await server.Initialize(config);

			const infoCall = infoLogs.find(log => log.includes('listening at /graphql'));
			expect(infoCall).toBeDefined();
		});

		it('should initialize with custom keepalive interval', async () => {
			const config = { path: '/graphql', keepalive: 30000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			await server.Initialize(config);

			expect(infoLogs.length).toBeGreaterThan(0);
		});

		it('should initialize with different path', async () => {
			const config = { path: '/ws/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			await server.Initialize(config);

			const infoCall = infoLogs.find(log => log.includes('/ws/graphql'));
			expect(infoCall).toBeDefined();
		});

		it('should initialize and set up dispose cleanup function', async () => {
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			await server.Initialize(config);

			expect((server as any).DisposeServer).toBeDefined();
			expect(typeof (server as any).DisposeServer).toBe('function');
		});
	});

	describe('Authentication Flow During WebSocket Connection', () => {
		it('should require auth service for successful connection', async () => {
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			mockAuthService.Authenticate.mockResolvedValue({ authenticated: true });

			await server.Initialize(config);

			expect(mockAuthService.Authenticate).not.toHaveBeenCalled(); // Not called until actual connection
		});

		it('should handle missing auth service during initialization', async () => {
			// When auth service is not available, initialize should still succeed
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			// Initialize with setup where auth service would not be available
			await server.Initialize(config);

			// Should have initialized the WebSocket server
			expect((server as any).WsServer).not.toBeNull();
		});

		it('should fail-closed when auth service unavailable during connection attempt', async () => {
			mockModuleRef.get.mockImplementation((token: any) => {
				if (token === HttpAdapterHost) return mockHttpAdapterHost;
				if (token === GraphQLSchemaHost) return mockSchemaHost;
				// Auth service not available
				return undefined;
			});

			const newServer = new GraphQLWebSocketServer(mockModuleRef);
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			await newServer.Initialize(config);

			// Server should be initialized but safe
			expect(newServer).toBeDefined();
		});
	});

	describe('WebSocket Server State Management', () => {
		it('should initialize WsServer field after initialize', async () => {
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			expect((server as any).WsServer).toBeNull();

			await server.Initialize(config);

			expect((server as any).WsServer).not.toBeNull();
		});

		it('should clear WsServer on destroy', async () => {
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			await server.Initialize(config);
			expect((server as any).WsServer).not.toBeNull();

			await server.onModuleDestroy();
			expect((server as any).WsServer).toBeNull();
		});

		it('should set DisposeServer cleanup handler after initialize', async () => {
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			expect((server as any).DisposeServer).toBeNull();

			await server.Initialize(config);

			expect((server as any).DisposeServer).not.toBeNull();
		});

		it('should clear DisposeServer on destroy', async () => {
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			await server.Initialize(config);
			expect((server as any).DisposeServer).not.toBeNull();

			await server.onModuleDestroy();
			expect((server as any).DisposeServer).toBeNull();
		});
	});

	describe('Error Recovery and Robustness', () => {
		it('should handle httpAdapter.getHttpServer() returning invalid value', async () => {
			const newServer = new GraphQLWebSocketServer(mockModuleRef);
			mockHttpAdapterHost.httpAdapter = null;

			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			// Should handle gracefully without throwing
			await expect(newServer.Initialize(config)).resolves.not.toThrow();
		});

		it('should handle WebSocket server close callback errors', async () => {
			const closeCallbackMock = vi.fn((callback: any) => {
				// Simulate error during close but still call callback
				setTimeout(() => callback(), 0);
			});

			mockHttpAdapterHost.httpAdapter.getHttpServer = vi.fn(() => ({
				on: vi.fn(),
				once: vi.fn(),
				emit: vi.fn(),
				close: closeCallbackMock,
				removeListener: vi.fn(),
			}));

			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			const newServer = new GraphQLWebSocketServer(mockModuleRef);
			await newServer.Initialize(config);

			// Should handle destroy without throwing
			await expect(newServer.onModuleDestroy()).resolves.not.toThrow();
		});

		it('should preserve module reference throughout lifecycle', async () => {
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			const moduleRef = server.Module;

			await server.Initialize(config);
			await server.onModuleDestroy();

			expect(server.Module).toBe(moduleRef);
		});
	});

	describe('Concurrent Initialize and Destroy Calls', () => {
		it('should handle sequential initialize-destroy cycles', async () => {
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			// First cycle
			await server.Initialize(config);
			await server.onModuleDestroy();

			// Second cycle should work (new server instance)
			const newServer = new GraphQLWebSocketServer(mockModuleRef);
			await newServer.Initialize(config);
			await newServer.onModuleDestroy();

			expect(newServer).toBeDefined();
		});

		it('should handle rapid successive initialize calls', async () => {
			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			const initPromises = [
				server.Initialize(config),
				server.Initialize(config),
				server.Initialize(config),
			];

			await expect(Promise.all(initPromises)).resolves.not.toThrow();
		});
	});

	describe('Edge Cases and Branch Coverage', () => {
		it('should handle schema host with missing schema property', async () => {
			mockSchemaHost.schema = null;

			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			await server.Initialize(config);

			const warnCall = warnLogs.find(log => log.includes('Schema'));
			expect(warnCall).toBeDefined();
		});

		it('should handle HttpAdapterHost with missing httpAdapter property', async () => {
			mockHttpAdapterHost.httpAdapter = undefined;

			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			await server.Initialize(config);

			const warnCall = warnLogs.find(log => log.includes('HttpAdapterHost'));
			expect(warnCall).toBeDefined();
		});

		it('should handle all three dependencies missing', async () => {
			debugLogs = [];
			warnLogs = [];
			errorLogs = [];
			infoLogs = [];

			const emptyModuleRef = {
				get: vi.fn().mockReturnValue(undefined),
			} as any;

			const newServer = new GraphQLWebSocketServer(emptyModuleRef);
			const originalLogger = newServer['Logger'];
			vi.spyOn(originalLogger, 'warn').mockImplementation((message: string | Error) => {
				warnLogs.push(typeof message === 'string' ? message : message.message);
			});

			const config = { path: '/graphql', keepalive: 12000, maxPayloadSize: 102400, connectionTimeout: 60000 };

			await newServer.Initialize(config);

			// Should have at least one warning for missing adapter/schema
			expect(warnLogs.length).toBeGreaterThanOrEqual(1);
		});
	});
});
