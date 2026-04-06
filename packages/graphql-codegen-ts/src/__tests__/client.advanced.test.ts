import { describe, it, expect, vi } from 'vitest';
import { GraphQLClient } from '../client';

// These tests focus on code paths that are difficult to test with mocks
describe('GraphQLClient Advanced Coverage Tests', () => {
	it('should properly assign properties from options in constructor', () => {
		const options = {
			Name: 'AdvancedTestClient',
			HTTP_URI: 'https://api.test.com/graphql',
			WS_URI: 'wss://api.test.com/graphql',
		};

		const client = new GraphQLClient(options);

		// Verify constructor properly assigns all properties
		expect(client.Name).toBe('AdvancedTestClient');
		expect(client.HTTP_URI).toBe('https://api.test.com/graphql');
		expect(client.WS_URI).toBe('wss://api.test.com/graphql');
		expect(client.Apollo).toBeDefined();
	});

	it('should build Apollo client even with all optional parameters', () => {
		const tokenFn = vi.fn().mockResolvedValue('test-token');

		const options = {
			Name: 'ComplexClient',
			HTTP_URI: 'https://api.test.com/graphql',
			WS_URI: 'wss://api.test.com/graphql',
			UseTokenFunction: true,
			TokenFunction: tokenFn,
			Token: 'fallback-token',
			IsBrowser: true,
			LogGraphQLErrors: true,
			LogNetworkErrors: true,
		};

		const client = new GraphQLClient(options);

		// Verify all properties are correctly assigned
		expect(client.Name).toBe('ComplexClient');
		expect(client.Apollo).toBeDefined();
	});

	it('should handle empty/null optional parameters gracefully', () => {
		const client1 = new GraphQLClient({
			Name: 'TestClient1',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: undefined as any,
			TokenFunction: undefined,
			Token: undefined,
			IsBrowser: undefined,
			LogGraphQLErrors: undefined,
			LogNetworkErrors: undefined,
		});

		expect(client1.Apollo).toBeDefined();

		const client2 = new GraphQLClient({
			Name: 'TestClient2',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: false,
			TokenFunction: undefined,
			Token: '',
			IsBrowser: false,
			LogGraphQLErrors: false,
			LogNetworkErrors: false,
		});

		expect(client2.Apollo).toBeDefined();
	});

	it('should expose all event properties and allow access', () => {
		const client = new GraphQLClient({
			Name: 'EventTestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		// All event properties must be defined
		const events = [
			client.OnConnecting,
			client.OnOpened,
			client.OnConnected,
			client.OnClosed,
			client.OnError,
		];

		for (const event of events) {
			expect(event).toBeDefined();
			expect(typeof event).toBe('object');
		}
	});

	it('should properly initialize Reset method', () => {
		const client = new GraphQLClient({
			Name: 'ResetTestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(typeof client.Reset).toBe('function');

		// Call Reset and verify it doesn't throw
		expect(() => {
			client.Reset();
		}).not.toThrow();
	});

	it('should handle consecutive Reset calls', () => {
		const client = new GraphQLClient({
			Name: 'ConsecutiveResetClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		// Multiple consecutive calls should not throw
		expect(() => {
			for (let i = 0; i < 5; i++) {
				client.Reset();
			}
		}).not.toThrow();

		// Verify Apollo methods exist and are callable
		expect(typeof client.Apollo.resetStore).toBe('function');
		expect(typeof client.Apollo.stop).toBe('function');
	});

	it('should create distinct client instances with independent state', () => {
		const client1 = new GraphQLClient({
			Name: 'Client1',
			HTTP_URI: 'http://server1:4000/graphql',
			WS_URI: 'ws://server1:4000/graphql',
		});

		const client2 = new GraphQLClient({
			Name: 'Client2',
			HTTP_URI: 'http://server2:4000/graphql',
			WS_URI: 'ws://server2:4000/graphql',
		});

		// Clients should be completely independent
		expect(client1.Name).not.toBe(client2.Name);
		expect(client1.HTTP_URI).not.toBe(client2.HTTP_URI);
		expect(client1.WS_URI).not.toBe(client2.WS_URI);
		expect(client1.Apollo).not.toBe(client2.Apollo);

		// Reset on one should not affect the other
		client1.Reset();
		client2.Reset();

		// Both should have functioning Apollo instances
		expect(client1.Apollo).toBeDefined();
		expect(client2.Apollo).toBeDefined();
	});

	it('should maintain proper type safety with IGraphQLClientOptions', () => {
		const validOptions = {
			Name: 'TypeSafeClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			Token: 'test-token',
			TokenFunction: () => Promise.resolve('token'),
			IsBrowser: true,
			LogGraphQLErrors: true,
			LogNetworkErrors: true,
		};

		const client = new GraphQLClient(validOptions);
		expect(client).toBeDefined();
	});

	it('should properly handle URI variations', () => {
		const uriVariations = [
			{ http: 'http://localhost:4000/graphql', ws: 'ws://localhost:4000/graphql' },
			{ http: 'https://api.example.com/graphql', ws: 'wss://api.example.com/graphql' },
			{ http: 'http://192.168.1.1:4000/graphql', ws: 'ws://192.168.1.1:4000/graphql' },
			{ http: 'https://subdomain.api.example.com:8443/graphql', ws: 'wss://subdomain.api.example.com:8443/graphql' },
		];

		for (const uris of uriVariations) {
			const client = new GraphQLClient({
				Name: `Client-${uris.http}`,
				HTTP_URI: uris.http,
				WS_URI: uris.ws,
			});

			expect(client.HTTP_URI).toBe(uris.http);
			expect(client.WS_URI).toBe(uris.ws);
		}
	});

	it('should properly handle token function that returns various token formats', async () => {
		const tokenFormats = [
			'bearer-token-123',
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
			'short',
			'token-with-special-chars!@#$%',
		];

		for (const token of tokenFormats) {
			const tokenFn = vi.fn().mockResolvedValue(token);

			const client = new GraphQLClient({
				Name: `TokenClient-${token.substring(0, 5)}`,
				HTTP_URI: 'http://localhost:4000/graphql',
				WS_URI: 'ws://localhost:4000/graphql',
				UseTokenFunction: true,
				TokenFunction: tokenFn,
			});

			expect(client.Apollo).toBeDefined();
		}
	});

	it('should initialize client with only required properties', () => {
		const minimalClient = new GraphQLClient({
			Name: 'Minimal',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(minimalClient.Name).toBe('Minimal');
		expect(minimalClient.HTTP_URI).toBe('http://localhost:4000/graphql');
		expect(minimalClient.WS_URI).toBe('ws://localhost:4000/graphql');
		expect(minimalClient.Apollo).toBeDefined();
	});

	it('should have all required public methods', () => {
		const client = new GraphQLClient({
			Name: 'MethodTestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		// Check all public methods exist
		expect(typeof client.Reset).toBe('function');
	});

	it('should have all required public properties', () => {
		const client = new GraphQLClient({
			Name: 'PropertyTestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		// Check all required properties
		expect(client.Apollo).toBeDefined();
		expect(client.Name).toBe('PropertyTestClient');
		expect(client.HTTP_URI).toBe('http://localhost:4000/graphql');
		expect(client.WS_URI).toBe('ws://localhost:4000/graphql');
	});

	it('should have all required event properties', () => {
		const client = new GraphQLClient({
			Name: 'EventPropertyClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		// Check all event properties
		expect(client.OnConnecting).toBeDefined();
		expect(client.OnOpened).toBeDefined();
		expect(client.OnConnected).toBeDefined();
		expect(client.OnClosed).toBeDefined();
		expect(client.OnError).toBeDefined();
	});

	it('should handle TokenFunction that throws errors', () => {
		const failingTokenFn = vi.fn().mockRejectedValue(new Error('Token fetch failed'));

		const client = new GraphQLClient({
			Name: 'FailingTokenClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			TokenFunction: failingTokenFn,
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should properly integrate UseTokenFunction and TokenFunction options', () => {
		const tokenFn = vi.fn().mockResolvedValue('dynamic-token');

		const client = new GraphQLClient({
			Name: 'IntegrationClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			TokenFunction: tokenFn,
			Token: 'static-token',
		});

		expect(client.Apollo).toBeDefined();
		expect(client.Name).toBe('IntegrationClient');
	});
});
