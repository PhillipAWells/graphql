import { describe, it, expect, vi, afterEach } from 'vitest';
import { GraphQLClient } from '../client';

// Selective mocking to allow branch execution
vi.mock('@apollo/client/core', () => {
	class MockLink {
		concat = vi.fn((nextLink: unknown) => nextLink);
	}

	class MockApolloClient {
		public resetStore = vi.fn().mockResolvedValue(undefined);
		public stop = vi.fn();
		public link = new MockLink();
	}

	class MockInMemoryCache {
		public constructor() {}
	}

	return {
		ApolloClient: MockApolloClient,
		InMemoryCache: MockInMemoryCache,
		split: (_test: unknown, _ifTrue: unknown, _ifFalse: unknown) => new MockLink(),
		CombinedGraphQLErrors: {
			is: vi.fn((error: unknown) => error instanceof Error && (error as any).extensions?.type === 'graphql'),
		},
	};
});

vi.mock('@apollo/client/link/error', () => {
	class _MockLink {
		public concat = vi.fn((nextLink: unknown) => nextLink);
	}
	return {
		onError: vi.fn(() => new _MockLink()),
	};
});

vi.mock('@apollo/client/link/retry', () => {
	class MockRetryLink {
		public concat = vi.fn((nextLink: unknown) => nextLink);
	}
	return {
		RetryLink: MockRetryLink,
	};
});

vi.mock('@apollo/client/link/context', () => {
	class _MockLink {
		public concat = vi.fn((nextLink: unknown) => nextLink);
	}
	return {
		setContext: vi.fn(() => new _MockLink()),
	};
});

vi.mock('@apollo/client/link/http', () => {
	class MockHttpLink {
		public constructor(_options?: unknown) {}
	}
	return {
		HttpLink: MockHttpLink,
	};
});

vi.mock('@apollo/client/link/subscriptions', () => {
	class MockGraphQLWsLink {
		public constructor(_client: unknown) {}
	}
	return {
		GraphQLWsLink: MockGraphQLWsLink,
	};
});

vi.mock('@apollo/client/utilities', () => ({
	getMainDefinition: vi.fn((_query) => ({
		kind: 'OperationDefinition',
		operation: 'query',
	})),
}));

vi.mock('graphql-ws', () => ({
	createClient: vi.fn(() => ({
		dispose: vi.fn(),
	})),
}));

// NOT mocking strongly-typed-events - let it execute for real
// This allows the event dispatcher branches to actually execute

describe('GraphQLClient - Coverage Focus (Unmocked Events)', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	// Test all constructor branches with real event dispatchers
	it('should create client with all options for maximum branch coverage', () => {
		const tokenFn = vi.fn().mockResolvedValue('test-token');
		
		const client = new GraphQLClient({
			Name: 'FullFeaturedClient',
			HTTP_URI: 'https://api.example.com/graphql',
			WS_URI: 'wss://api.example.com/graphql',
			UseTokenFunction: true,
			TokenFunction: tokenFn,
			LogGraphQLErrors: true,
			LogNetworkErrors: true,
			IsBrowser: true,
		});

		expect(client).toBeDefined();
		expect(client.Name).toBe('FullFeaturedClient');
		expect(client.HTTP_URI).toBe('https://api.example.com/graphql');
		expect(client.WS_URI).toBe('wss://api.example.com/graphql');
		expect(client.Apollo).toBeDefined();
		expect(client.OnConnecting).toBeDefined();
		expect(client.OnOpened).toBeDefined();
		expect(client.OnConnected).toBeDefined();
		expect(client.OnClosed).toBeDefined();
		expect(client.OnError).toBeDefined();
	});

	it('should handle LogGraphQLErrors true', () => {
		const client = new GraphQLClient({
			Name: 'GraphQLLoggingClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			LogGraphQLErrors: true,
		});
		expect(client.Apollo).toBeDefined();
	});

	it('should handle LogGraphQLErrors false', () => {
		const client = new GraphQLClient({
			Name: 'NoGraphQLLoggingClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			LogGraphQLErrors: false,
		});
		expect(client.Apollo).toBeDefined();
	});

	it('should handle LogNetworkErrors true', () => {
		const client = new GraphQLClient({
			Name: 'NetworkLoggingClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			LogNetworkErrors: true,
		});
		expect(client.Apollo).toBeDefined();
	});

	it('should handle LogNetworkErrors false', () => {
		const client = new GraphQLClient({
			Name: 'NoNetworkLoggingClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			LogNetworkErrors: false,
		});
		expect(client.Apollo).toBeDefined();
	});

	it('should handle UseTokenFunction=true AND TokenFunction defined', () => {
		const tokenFn = vi.fn().mockResolvedValue('token');
		const client = new GraphQLClient({
			Name: 'TokenFunctionClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			TokenFunction: tokenFn,
		});
		expect(client.Apollo).toBeDefined();
	});

	it('should handle UseTokenFunction=true BUT TokenFunction undefined', () => {
		const client = new GraphQLClient({
			Name: 'MissingFunctionClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			TokenFunction: undefined,
			Token: 'fallback',
		});
		expect(client.Apollo).toBeDefined();
	});

	it('should handle UseTokenFunction=false (ignores TokenFunction)', () => {
		const tokenFn = vi.fn();
		const client = new GraphQLClient({
			Name: 'IgnoreFunctionClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: false,
			TokenFunction: tokenFn,
			Token: 'static-token',
		});
		expect(client.Apollo).toBeDefined();
		expect(tokenFn).not.toHaveBeenCalled();
	});

	it('should handle Token provided', () => {
		const client = new GraphQLClient({
			Name: 'TokenClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			Token: 'my-token',
		});
		expect(client.Apollo).toBeDefined();
	});

	it('should handle no Token provided', () => {
		const client = new GraphQLClient({
			Name: 'NoTokenClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});
		expect(client.Apollo).toBeDefined();
	});

	it('should call Reset without errors', () => {
		const client = new GraphQLClient({
			Name: 'ResetClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(() => client.Reset()).not.toThrow();
		expect(client.Apollo.resetStore).toHaveBeenCalled();
		expect(client.Apollo.stop).toHaveBeenCalled();
	});

	it('should create multiple clients with different configs', () => {
		const client1 = new GraphQLClient({
			Name: 'Client1',
			HTTP_URI: 'http://server1:4000/graphql',
			WS_URI: 'ws://server1:4000/graphql',
		});

		const client2 = new GraphQLClient({
			Name: 'Client2',
			HTTP_URI: 'http://server2:4000/graphql',
			WS_URI: 'ws://server2:4000/graphql',
			Token: 'token2',
		});

		expect(client1.Name).toBe('Client1');
		expect(client2.Name).toBe('Client2');
		expect(client1.HTTP_URI).not.toBe(client2.HTTP_URI);
	});

	it('should handle undefined token function gracefully', () => {
		const client = new GraphQLClient({
			Name: 'UndefinedFnClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			TokenFunction: undefined,
		});
		expect(client.Apollo).toBeDefined();
	});

	it('should handle undefined token gracefully', () => {
		const client = new GraphQLClient({
			Name: 'UndefinedTokenClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			Token: undefined,
		});
		expect(client.Apollo).toBeDefined();
	});
});
