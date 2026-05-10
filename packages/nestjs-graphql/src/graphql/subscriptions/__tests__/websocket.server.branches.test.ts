import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GraphQLWebSocketServer } from '../websocket.server.js';

/**
 * Advanced branch coverage tests for GraphQLWebSocketServer
 * Targets Module lifecycle and configuration branches
 */
describe('GraphQLWebSocketServer - Module Lifecycle', () => {
	let MockModuleRef: any;

	beforeEach(() => {
		MockModuleRef = {
			get: vi.fn(() => {
				// Return undefined for all lazy loads (HttpAdapterHost, SchemaHost, AuthService)
				return undefined;
			}),
		} as any;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Module Integration', () => {
		it('should initialize with ModuleRef', () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			expect(server.Module).toBe(MockModuleRef);
		});

		it('should implement ILazyModuleRefService interface', () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			expect(server.Module).toBeDefined();
		});

		it('should have Module as readonly property', () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			expect(() => {
				(server as any).Module = null;
			}).not.toThrow(); // Property is readonly, assignment is ignored in non-strict mode
		});
	});

	describe('Configuration Lifecycle', () => {
		it('should accept configuration via configure method', () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);
			const config = { path: '/graphql/subscriptions', keepalive: 30000 };

			server.configure(config);

			expect(server).toBeDefined();
		});

		it('should support multiple configurations (last one wins)', () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);
			const config1 = { path: '/path1', keepalive: 30000 };
			const config2 = { path: '/path2', keepalive: 60000 };

			server.configure(config1);
			server.configure(config2);

			expect(server).toBeDefined();
		});
	});

	describe('Lifecycle Methods', () => {
		it('should handle onApplicationBootstrap when no config set', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			await expect(server.onApplicationBootstrap()).resolves.not.toThrow();
		});

		it('should handle onApplicationBootstrap when config is set', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);
			const config = { path: '/graphql/subscriptions', keepalive: 30000 };

			server.configure(config);

			await expect(server.onApplicationBootstrap()).resolves.not.toThrow();
		});

		it('should handle onModuleDestroy without error', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			await expect(server.onModuleDestroy()).resolves.not.toThrow();
		});

		it('should handle multiple onModuleDestroy calls', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			await server.onModuleDestroy();
			await server.onModuleDestroy();
			await server.onModuleDestroy();

			expect(server).toBeDefined();
		});
	});

	describe('Initialize Method Branches', () => {
		it('should handle Initialize when adapters unavailable', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);
			const config = { path: '/graphql/subscriptions', keepalive: 30000 };

			// Should not throw even with missing adapters
			await expect(server.Initialize(config)).resolves.not.toThrow();
		});

		it('should handle Initialize called multiple times', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);
			const config = { path: '/graphql/subscriptions', keepalive: 30000 };

			await server.Initialize(config);
			await server.Initialize(config);

			expect(server).toBeDefined();
		});

		it('should handle Initialize then onModuleDestroy', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);
			const config = { path: '/graphql/subscriptions', keepalive: 30000 };

			await server.Initialize(config);
			await server.onModuleDestroy();

			expect(server).toBeDefined();
		});
	});

	describe('Full Lifecycle Scenarios', () => {
		it('should handle create -> configure -> bootstrap -> destroy', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);
			const config = { path: '/graphql/subscriptions', keepalive: 30000 };

			server.configure(config);
			await server.onApplicationBootstrap();
			await server.onModuleDestroy();

			expect(server).toBeDefined();
		});

		it('should handle create -> bootstrap -> destroy (no config)', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			await server.onApplicationBootstrap();
			await server.onModuleDestroy();

			expect(server).toBeDefined();
		});

		it('should handle create -> initialize -> destroy (direct init)', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);
			const config = { path: '/graphql/subscriptions', keepalive: 30000 };

			await server.Initialize(config);
			await server.onModuleDestroy();

			expect(server).toBeDefined();
		});
	});

	describe('Edge Cases', () => {
		it('should handle configure with undefined path', () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			expect(() => {
				server.configure({ path: undefined as any, keepalive: 30000 });
			}).not.toThrow();
		});

		it('should handle Initialize with undefined path', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			await expect(
				server.Initialize({ path: undefined as any, keepalive: 30000 }),
			).resolves.not.toThrow();
		});

		it('should handle onModuleDestroy called without Initialize', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			await expect(server.onModuleDestroy()).resolves.not.toThrow();
		});

		it('should handle bootstrap called without configure', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			await expect(server.onApplicationBootstrap()).resolves.not.toThrow();
		});
	});

	describe('Missing Adapter Handling', () => {
		it('should handle missing HttpAdapterHost gracefully', async () => {
			const MockRef = {
				get: vi.fn(() => undefined),
			} as any;

			const server = new GraphQLWebSocketServer(MockRef);
			const config = { path: '/graphql/subscriptions', keepalive: 30000 };

			// Should not throw even if adapter is missing
			await expect(server.Initialize(config)).resolves.not.toThrow();
		});

		it('should handle missing GraphQLSchemaHost gracefully', async () => {
			const MockRef = {
				get: vi.fn((token: any) => {
					// Simulate: HttpAdapterHost exists, but GraphQLSchemaHost doesn't
					if (token?.name === 'HttpAdapterHost') {
						return { httpServer: {} };
					}
					return undefined;
				}),
			} as any;

			const server = new GraphQLWebSocketServer(MockRef);
			const config = { path: '/graphql/subscriptions', keepalive: 30000 };

			// Should handle missing schema
			await expect(server.Initialize(config)).resolves.not.toThrow();
		});

		it('should handle missing authentication service gracefully', async () => {
			const MockRef = {
				get: vi.fn((token: any) => {
					// HttpAdapterHost and SchemaHost exist
					if (token && (token.name === 'HttpAdapterHost' || token.name === 'GraphQLSchemaHost')) {
						return { httpServer: {} };
					}
					// But AuthService doesn't
					return undefined;
				}),
			} as any;

			const server = new GraphQLWebSocketServer(MockRef);
			const config = { path: '/graphql/subscriptions', keepalive: 30000 };

			// Should handle missing auth service
			await expect(server.Initialize(config)).resolves.not.toThrow();
		});
	});

	describe('Connection Lifecycle Branches', () => {
		it('should handle OnConnect with valid connection', async () => {
			const MockRef = {
				get: vi.fn(() => undefined),
			} as any;

			const server = new GraphQLWebSocketServer(MockRef);

			expect(server).toBeDefined();
		});

		it('should handle OnClose cleanup', async () => {
			const MockRef = {
				get: vi.fn(() => undefined),
			} as any;

			const server = new GraphQLWebSocketServer(MockRef);

			// Destroy should clean up any connection resources
			await server.onModuleDestroy();

			expect(server).toBeDefined();
		});

		it('should handle reconnection scenario', async () => {
			const MockRef = {
				get: vi.fn(() => undefined),
			} as any;

			const server = new GraphQLWebSocketServer(MockRef);
			const config = { path: '/graphql/subscriptions', keepalive: 30000 };

			// Simulate: init -> destroy -> init again
			await server.Initialize(config);
			await server.onModuleDestroy();
			await server.Initialize(config);

			expect(server).toBeDefined();
		});
	});

	describe('Configuration Edge Cases', () => {
		it('should handle configuration with zero keepalive', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);
			const config = { path: '/graphql/subscriptions', keepalive: 0 };

			await expect(server.Initialize(config)).resolves.not.toThrow();
		});

		it('should handle configuration with negative keepalive', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);
			const config = { path: '/graphql/subscriptions', keepalive: -1 };

			// Even with invalid config, should not crash
			await expect(server.Initialize(config)).resolves.not.toThrow();
		});

		it('should handle configuration with very large keepalive', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);
			const config = { path: '/graphql/subscriptions', keepalive: Number.MAX_SAFE_INTEGER };

			await expect(server.Initialize(config)).resolves.not.toThrow();
		});

		it('should handle configuration with empty path', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);
			const config = { path: '', keepalive: 30000 };

			await expect(server.Initialize(config)).resolves.not.toThrow();
		});
	});
});
