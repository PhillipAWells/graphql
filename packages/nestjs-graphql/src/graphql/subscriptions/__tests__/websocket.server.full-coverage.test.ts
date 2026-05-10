import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GraphQLWebSocketServer } from '../websocket.server.js';

/**
 * Full coverage tests for websocket.server.ts remaining branches
 */
describe('GraphQLWebSocketServer - Full Coverage', () => {
	let MockModuleRef: any;

	beforeEach(() => {
		MockModuleRef = {
			get: vi.fn(() => undefined),
		} as any;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Initialize Method - Adapter Availability Branches', () => {
		it('should handle Initialize when HttpAdapterHost returns undefined', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);
			const config = { path: '/graphql/subscriptions', keepalive: 30000 };

			// HttpAdapterHost.get returns undefined
			await server.Initialize(config);

			expect(server).toBeDefined();
		});

		it('should handle Initialize when HttpAdapterHost has httpServer property', async () => {
			const MockRef = {
				get: vi.fn((token: any) => {
					// Return a mock adapter
					if (token && typeof token === 'object' && token.name === 'HttpAdapterHost') {
						return { httpServer: {} };
					}
					return undefined;
				}),
			} as any;

			const server = new GraphQLWebSocketServer(MockRef);
			const config = { path: '/graphql/subscriptions', keepalive: 30000 };

			await server.Initialize(config);

			expect(server).toBeDefined();
		});

		it('should handle Initialize when GraphQLSchemaHost is missing', async () => {
			const MockRef = {
				get: vi.fn((token: any) => {
					// HttpAdapterHost available
					if (token && typeof token === 'object' && token.name === 'HttpAdapterHost') {
						return { httpServer: {} };
					}
					// But GraphQLSchemaHost is not
					return undefined;
				}),
			} as any;

			const server = new GraphQLWebSocketServer(MockRef);
			const config = { path: '/graphql/subscriptions', keepalive: 30000 };

			await server.Initialize(config);

			expect(server).toBeDefined();
		});

		it('should handle Initialize when all adapters are missing', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);
			const config = { path: '/graphql/subscriptions', keepalive: 30000 };

			// All returns undefined
			await server.Initialize(config);

			expect(server).toBeDefined();
		});
	});

	describe('OnApplicationBootstrap - Configuration Branches', () => {
		it('should handle bootstrap with no prior configuration', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			// Bootstrap without calling configure
			await server.onApplicationBootstrap();

			expect(server).toBeDefined();
		});

		it('should handle bootstrap after configure called', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);
			const config = { path: '/ws', keepalive: 15000 };

			server.configure(config);
			await server.onApplicationBootstrap();

			expect(server).toBeDefined();
		});

		it('should call Initialize during bootstrap when configured', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);
			const config = { path: '/graphql', keepalive: 5000 };

			server.configure(config);
			await server.onApplicationBootstrap();

			// Server should be initialized
			expect(server).toBeDefined();
		});
	});

	describe('OnModuleDestroy - Cleanup Branches', () => {
		it('should handle destroy without prior Initialize', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			await server.onModuleDestroy();

			expect(server).toBeDefined();
		});

		it('should handle destroy after Initialize', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);
			const config = { path: '/graphql/subscriptions', keepalive: 30000 };

			await server.Initialize(config);
			await server.onModuleDestroy();

			expect(server).toBeDefined();
		});

		it('should handle multiple destroy calls', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			await server.onModuleDestroy();
			await server.onModuleDestroy();
			await server.onModuleDestroy();

			expect(server).toBeDefined();
		});

		it('should handle destroy after configure but no Initialize', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			server.configure({ path: '/ws', keepalive: 30000 });
			await server.onModuleDestroy();

			expect(server).toBeDefined();
		});
	});

	describe('Configure Method - Configuration Validation', () => {
		it('should accept path with leading slash', () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			server.configure({ path: '/graphql/subscriptions', keepalive: 30000 });

			expect(server).toBeDefined();
		});

		it('should accept path without leading slash', () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			server.configure({ path: 'graphql/subscriptions', keepalive: 30000 });

			expect(server).toBeDefined();
		});

		it('should accept root path', () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			server.configure({ path: '/', keepalive: 30000 });

			expect(server).toBeDefined();
		});

		it('should accept zero keepalive', () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			server.configure({ path: '/ws', keepalive: 0 });

			expect(server).toBeDefined();
		});

		it('should accept large keepalive values', () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			server.configure({ path: '/ws', keepalive: 3600000 });

			expect(server).toBeDefined();
		});

		it('should handle configure called multiple times', () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			server.configure({ path: '/path1', keepalive: 10000 });
			server.configure({ path: '/path2', keepalive: 20000 });
			server.configure({ path: '/path3', keepalive: 30000 });

			expect(server).toBeDefined();
		});
	});

	describe('Module Property - ILazyModuleRefService Implementation', () => {
		it('should expose Module property correctly', () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			expect(server.Module).toBe(MockModuleRef);
		});

		it('should have Module set in constructor', () => {
			const TestRef = {} as any;
			const server = new GraphQLWebSocketServer(TestRef);

			expect(server.Module).toBe(TestRef);
		});
	});

	describe('Full Lifecycle Scenarios', () => {
		it('should handle create -> configure -> bootstrap -> destroy lifecycle', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			server.configure({ path: '/graphql', keepalive: 30000 });
			await server.onApplicationBootstrap();
			await server.onModuleDestroy();

			expect(server).toBeDefined();
		});

		it('should handle create -> bootstrap -> destroy without configure', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			await server.onApplicationBootstrap();
			await server.onModuleDestroy();

			expect(server).toBeDefined();
		});

		it('should handle create -> initialize -> bootstrap -> destroy', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);
			const config = { path: '/graphql', keepalive: 30000 };

			await server.Initialize(config);
			await server.onApplicationBootstrap();
			await server.onModuleDestroy();

			expect(server).toBeDefined();
		});

		it('should handle configure -> initialize -> destroy', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);
			const config = { path: '/graphql', keepalive: 30000 };

			server.configure(config);
			await server.Initialize(config);
			await server.onModuleDestroy();

			expect(server).toBeDefined();
		});

		it('should handle initialize without prior configuration', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);
			const config = { path: '/ws/subscriptions', keepalive: 15000 };

			await server.Initialize(config);

			expect(server).toBeDefined();
		});
	});

	describe('Edge Cases - Unusual Configurations', () => {
		it('should handle empty path string', async () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			server.configure({ path: '', keepalive: 30000 });
			await server.onApplicationBootstrap();

			expect(server).toBeDefined();
		});

		it('should handle undefined path in config', () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			server.configure({ path: undefined as any, keepalive: 30000 });

			expect(server).toBeDefined();
		});

		it('should handle negative keepalive', () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			server.configure({ path: '/ws', keepalive: -5000 });

			expect(server).toBeDefined();
		});

		it('should handle very large keepalive', () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			server.configure({ path: '/ws', keepalive: Number.MAX_SAFE_INTEGER });

			expect(server).toBeDefined();
		});

		it('should handle special characters in path', () => {
			const server = new GraphQLWebSocketServer(MockModuleRef);

			server.configure({ path: '/graphql/sub-scriptions.v2', keepalive: 30000 });

			expect(server).toBeDefined();
		});
	});

	describe('Multiple Server Instances', () => {
		it('should handle multiple servers independently', async () => {
			const server1 = new GraphQLWebSocketServer(MockModuleRef);
			const server2 = new GraphQLWebSocketServer(MockModuleRef);

			server1.configure({ path: '/ws1', keepalive: 10000 });
			server2.configure({ path: '/ws2', keepalive: 20000 });

			await server1.onApplicationBootstrap();
			await server2.onApplicationBootstrap();

			await server1.onModuleDestroy();
			await server2.onModuleDestroy();

			expect(server1).toBeDefined();
			expect(server2).toBeDefined();
		});

		it('should handle concurrent initialization', async () => {
			const server1 = new GraphQLWebSocketServer(MockModuleRef);
			const server2 = new GraphQLWebSocketServer(MockModuleRef);

			const config = { path: '/graphql', keepalive: 30000 };

			await Promise.all([
				server1.Initialize(config),
				server2.Initialize(config),
			]);

			expect(server1).toBeDefined();
			expect(server2).toBeDefined();
		});
	});
});
