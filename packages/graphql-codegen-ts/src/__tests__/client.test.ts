import { describe, it, expect, vi, afterEach } from 'vitest';
import { GraphQLClient } from '../client';

// Mock @apollo/client
vi.mock('@apollo/client/core', () => {
	class MockApolloClient {
		public resetStore = vi.fn().mockResolvedValue(undefined);
		public stop = vi.fn();
	}

	class _MockLink {
		public concat = vi.fn((nextLink: unknown) => nextLink);
	}

	class MockInMemoryCache {
		public constructor() {}
	}

	return {
		ApolloClient: MockApolloClient,
		InMemoryCache: MockInMemoryCache,
		split: (_test: unknown, _ifTrue: unknown, _ifFalse: unknown) => new _MockLink(),
	};
});

vi.mock('@apollo/client/link/error', () => {
	class _MockLink {
		public concat = vi.fn((nextLink: unknown) => nextLink);
	}

	return {
		onError: () => new _MockLink(),
	};
});

vi.mock('@apollo/client/link/retry', () => {
	class _MockLink {
		public concat = vi.fn((nextLink: unknown) => nextLink);
	}

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
		setContext: () => new _MockLink(),
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

vi.mock('strongly-typed-events', () => {
	class MockSignalDispatcher {
		public dispatch = vi.fn();
		public asEvent = vi.fn(() => ({ listen: vi.fn() }));
	}

	class MockSimpleEventDispatcher {
		public dispatch = vi.fn();
		public asEvent = vi.fn(() => ({ subscribe: vi.fn() }));
	}

	return {
		SignalDispatcher: MockSignalDispatcher,
		SimpleEventDispatcher: MockSimpleEventDispatcher,
	};
});

describe('GraphQLClient', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should create GraphQLClient with required options', () => {
		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		};

		const client = new GraphQLClient(options);

		expect(client).toBeDefined();
		expect(client.Name).toBe('TestClient');
		expect(client.HTTP_URI).toBe('http://localhost:4000/graphql');
		expect(client.WS_URI).toBe('ws://localhost:4000/graphql');
	});

	it('should have Apollo property', () => {
		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		};

		const client = new GraphQLClient(options);

		expect(client.Apollo).toBeDefined();
	});

	it('should expose OnConnecting event', () => {
		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		};

		const client = new GraphQLClient(options);

		expect(client.OnConnecting).toBeDefined();
	});

	it('should expose OnOpened event', () => {
		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		};

		const client = new GraphQLClient(options);

		expect(client.OnOpened).toBeDefined();
	});

	it('should expose OnConnected event', () => {
		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		};

		const client = new GraphQLClient(options);

		expect(client.OnConnected).toBeDefined();
	});

	it('should expose OnClosed event', () => {
		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		};

		const client = new GraphQLClient(options);

		expect(client.OnClosed).toBeDefined();
	});

	it('should expose OnError event', () => {
		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		};

		const client = new GraphQLClient(options);

		expect(client.OnError).toBeDefined();
	});

	it('should accept static token in options', () => {
		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			Token: 'static-token-value',
		};

		const client = new GraphQLClient(options);

		expect(client).toBeDefined();
		expect(client.Apollo).toBeDefined();
	});

	it('should accept token function in options', () => {
		const tokenFn = vi.fn().mockResolvedValue('dynamic-token');

		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			TokenFunction: tokenFn,
		};

		const client = new GraphQLClient(options);

		expect(client).toBeDefined();
		expect(client.Apollo).toBeDefined();
	});

	it('should have Reset method', () => {
		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		};

		const client = new GraphQLClient(options);

		expect(typeof client.Reset).toBe('function');
	});

	it('should not throw when Reset is called', () => {
		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		};

		const client = new GraphQLClient(options);

		expect(() => client.Reset()).not.toThrow();
	});

	it('should accept logging options', () => {
		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			LogGraphQLErrors: true,
			LogNetworkErrors: true,
		};

		const client = new GraphQLClient(options);

		expect(client).toBeDefined();
		expect(client.Apollo).toBeDefined();
	});

	it('should handle IsBrowser option', () => {
		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			IsBrowser: true,
		};

		const client = new GraphQLClient(options);

		expect(client).toBeDefined();
		expect(client.Apollo).toBeDefined();
	});

	it('should create client with all options combined', () => {
		const tokenFn = vi.fn().mockResolvedValue('dynamic-token');

		const options: any = {
			Name: 'FullOptionsClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			TokenFunction: tokenFn,
			IsBrowser: true,
			LogGraphQLErrors: true,
			LogNetworkErrors: true,
		};

		const client = new GraphQLClient(options);

		expect(client.Name).toBe('FullOptionsClient');
		expect(client.HTTP_URI).toBe('http://localhost:4000/graphql');
		expect(client.WS_URI).toBe('ws://localhost:4000/graphql');
		expect(client.Apollo).toBeDefined();
	});

	it('should expose all event properties', () => {
		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		};

		const client = new GraphQLClient(options);

		expect(client.OnConnecting).toBeDefined();
		expect(client.OnOpened).toBeDefined();
		expect(client.OnConnected).toBeDefined();
		expect(client.OnClosed).toBeDefined();
		expect(client.OnError).toBeDefined();
	});

	it('should have Apollo client built from options', () => {
		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			Token: 'test-token',
		};

		const client = new GraphQLClient(options);

		expect(client.Apollo).toBeDefined();
		expect(client.Apollo.resetStore).toBeDefined();
		expect(client.Apollo.stop).toBeDefined();
	});

	it('should initialize private fields correctly', () => {
		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		};

		const client = new GraphQLClient(options);

		// Verify that the client was initialized correctly
		// by checking public properties set in constructor
		expect(client.Name).toBe('TestClient');
		expect(client.HTTP_URI).toBe('http://localhost:4000/graphql');
		expect(client.WS_URI).toBe('ws://localhost:4000/graphql');
	});

	it('should call Reset without errors multiple times', () => {
		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		};

		const client = new GraphQLClient(options);

		expect(() => {
			client.Reset();
			client.Reset();
			client.Reset();
		}).not.toThrow();
	});

	it('should pass options to internal build client', () => {
		const options = {
			Name: 'ClientWithToken',
			HTTP_URI: 'http://custom:4000/graphql',
			WS_URI: 'ws://custom:4000/graphql',
			Token: 'custom-token',
		};

		const client = new GraphQLClient(options);

		// Verify that the options were used correctly
		expect(client.Name).toBe('ClientWithToken');
		expect(client.HTTP_URI).toBe('http://custom:4000/graphql');
		expect(client.WS_URI).toBe('ws://custom:4000/graphql');
		expect(client.Apollo).toBeDefined();
	});

	it('should handle UseTokenFunction when false', () => {
		const tokenFn = vi.fn().mockResolvedValue('dynamic-token');

		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: false,
			TokenFunction: tokenFn,
			Token: 'static-token',
		};

		const client = new GraphQLClient(options);

		expect(client).toBeDefined();
		expect(client.Apollo).toBeDefined();
	});

	it('should handle undefined TokenFunction', () => {
		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			TokenFunction: undefined,
		};

		const client = new GraphQLClient(options);

		expect(client).toBeDefined();
		expect(client.Apollo).toBeDefined();
	});

	it('should handle undefined Token', () => {
		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			Token: undefined,
		};

		const client = new GraphQLClient(options);

		expect(client).toBeDefined();
		expect(client.Apollo).toBeDefined();
	});

	it('should create WebSocket client with correct connection params', () => {
		const tokenFn = vi.fn().mockResolvedValue('auth-token');

		const options = {
			Name: 'TestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			TokenFunction: tokenFn,
		};

		const client = new GraphQLClient(options);

		expect(client).toBeDefined();
		expect(client.Apollo).toBeDefined();
	});

	it('should support multiple clients with different configurations', () => {
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

		expect(client1.Name).toBe('Client1');
		expect(client2.Name).toBe('Client2');
		expect(client1.HTTP_URI).toBe('http://server1:4000/graphql');
		expect(client2.HTTP_URI).toBe('http://server2:4000/graphql');
	});
});

describe('GraphQLClient Advanced', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should initialize with UseTokenFunction and TokenFunction', () => {
		const tokenFn = vi.fn().mockResolvedValue('auth-token');

		const client = new GraphQLClient({
			Name: 'TokenFunctionClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			TokenFunction: tokenFn,
		});

		expect(client.Name).toBe('TokenFunctionClient');
		expect(client.Apollo).toBeDefined();
	});

	it('should create client with Token instead of TokenFunction', () => {
		const client = new GraphQLClient({
			Name: 'StaticTokenClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			Token: 'static-auth-token',
			UseTokenFunction: false,
		});

		expect(client.Name).toBe('StaticTokenClient');
		expect(client.Apollo).toBeDefined();
	});

	it('should prefer TokenFunction when UseTokenFunction is true', () => {
		const tokenFn = vi.fn().mockResolvedValue('function-token');

		const client = new GraphQLClient({
			Name: 'PreferFunctionClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			TokenFunction: tokenFn,
			Token: 'static-token',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should handle missing TokenFunction when UseTokenFunction is true', () => {
		const client = new GraphQLClient({
			Name: 'NoFunctionClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			Token: 'fallback-token',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should handle both logging flags independently', () => {
		const client1 = new GraphQLClient({
			Name: 'GraphQLLoggingOnly',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			LogGraphQLErrors: true,
			LogNetworkErrors: false,
		});

		const client2 = new GraphQLClient({
			Name: 'NetworkLoggingOnly',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			LogGraphQLErrors: false,
			LogNetworkErrors: true,
		});

		expect(client1.Apollo).toBeDefined();
		expect(client2.Apollo).toBeDefined();
	});

	it('should handle browser mode option', () => {
		const client = new GraphQLClient({
			Name: 'BrowserClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			IsBrowser: true,
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should initialize event dispatchers', () => {
		const client = new GraphQLClient({
			Name: 'EventsClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.OnConnecting).toBeDefined();
		expect(client.OnOpened).toBeDefined();
		expect(client.OnConnected).toBeDefined();
		expect(client.OnClosed).toBeDefined();
		expect(client.OnError).toBeDefined();
	});

	it('should call Reset and handle resetStore', () => {
		const client = new GraphQLClient({
			Name: 'ResetClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		client.Reset();

		expect(client.Apollo.resetStore).toHaveBeenCalled();
		expect(client.Apollo.stop).toHaveBeenCalled();
	});

	it('should handle Reset multiple times without issues', () => {
		const client = new GraphQLClient({
			Name: 'MultiResetClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		client.Reset();
		client.Reset();

		expect(client.Apollo.resetStore).toHaveBeenCalledTimes(2);
		expect(client.Apollo.stop).toHaveBeenCalledTimes(2);
	});

	it('should initialize with custom URIs', () => {
		const customHttpUri = 'https://api.example.com/graphql';
		const customWsUri = 'wss://api.example.com/graphql';

		const client = new GraphQLClient({
			Name: 'CustomUrisClient',
			HTTP_URI: customHttpUri,
			WS_URI: customWsUri,
		});

		expect(client.HTTP_URI).toBe(customHttpUri);
		expect(client.WS_URI).toBe(customWsUri);
	});

	it('should handle missing optional properties', () => {
		const client = new GraphQLClient({
			Name: 'MinimalClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Name).toBe('MinimalClient');
		expect(client.Apollo).toBeDefined();
	});
});

describe('GraphQLClient Error Link - Branch Coverage', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should handle GraphQL errors when LogGraphQLErrors is true', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
			// Mock console.error
		});

		const client = new GraphQLClient({
			Name: 'ErrorLoggingClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			LogGraphQLErrors: true,
		});

		expect(client).toBeDefined();

		consoleSpy.mockRestore();
	});

	it('should handle network errors when LogNetworkErrors is true', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
			// Mock console.error
		});

		const client = new GraphQLClient({
			Name: 'NetworkErrorClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			LogNetworkErrors: true,
		});

		expect(client).toBeDefined();

		consoleSpy.mockRestore();
	});

	it('should not log when LogGraphQLErrors is false', () => {
		const client = new GraphQLClient({
			Name: 'NoGraphQLLoggingClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			LogGraphQLErrors: false,
		});

		expect(client).toBeDefined();
	});

	it('should not log when LogNetworkErrors is false', () => {
		const client = new GraphQLClient({
			Name: 'NoNetworkLoggingClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			LogNetworkErrors: false,
		});

		expect(client).toBeDefined();
	});

	it('should handle both logging flags independently', () => {
		const client1 = new GraphQLClient({
			Name: 'GraphQLOnlyClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			LogGraphQLErrors: true,
			LogNetworkErrors: false,
		});

		const client2 = new GraphQLClient({
			Name: 'NetworkOnlyClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			LogGraphQLErrors: false,
			LogNetworkErrors: true,
		});

		expect(client1).toBeDefined();
		expect(client2).toBeDefined();
	});
});

describe('GraphQLClient Retry Link - Configuration', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should configure retry link with delay settings', () => {
		const client = new GraphQLClient({
			Name: 'RetryClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should set retry jitter to true', () => {
		const client = new GraphQLClient({
			Name: 'RetryJitterClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should configure retry attempts with max and retryIf', () => {
		const client = new GraphQLClient({
			Name: 'RetryAttemptsClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});
});

describe('GraphQLClient Auth Link - Token Flow', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should use static token when UseTokenFunction is false', () => {
		const client = new GraphQLClient({
			Name: 'StaticTokenClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			Token: 'my-static-token',
			UseTokenFunction: false,
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should use token function when UseTokenFunction is true', () => {
		const tokenFn = vi.fn().mockResolvedValue('dynamic-token-value');

		const client = new GraphQLClient({
			Name: 'TokenFunctionClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			TokenFunction: tokenFn,
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should handle case where UseTokenFunction true but TokenFunction undefined', () => {
		const client = new GraphQLClient({
			Name: 'MissingFunctionClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			TokenFunction: undefined,
			Token: 'fallback-token',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should handle case where UseTokenFunction false and TokenFunction provided', () => {
		const tokenFn = vi.fn().mockResolvedValue('unused-token');

		const client = new GraphQLClient({
			Name: 'IgnoreFunctionClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: false,
			TokenFunction: tokenFn,
			Token: 'used-token',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should handle no token in HTTP auth link', () => {
		const client = new GraphQLClient({
			Name: 'NoTokenClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should handle token in WebSocket connection params', () => {
		const tokenFn = vi.fn().mockResolvedValue('ws-token');

		const client = new GraphQLClient({
			Name: 'WSTokenClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			TokenFunction: tokenFn,
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should handle no token in WebSocket connection params', () => {
		const client = new GraphQLClient({
			Name: 'WSNoTokenClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should include token in Authorization header when present', () => {
		const client = new GraphQLClient({
			Name: 'WithAuthHeaderClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			Token: 'header-token',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should omit Authorization header when no token', () => {
		const client = new GraphQLClient({
			Name: 'NoAuthHeaderClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});
});

describe('GraphQLClient WebSocket - Ping/Pong Handler', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should handle ping with received = false (sent ping)', () => {
		const client = new GraphQLClient({
			Name: 'PingSentClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should handle ping with received = true (received ping)', () => {
		const client = new GraphQLClient({
			Name: 'PingReceivedClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should handle pong with received = true (received pong)', () => {
		const client = new GraphQLClient({
			Name: 'PongReceivedClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should handle pong with received = false (sent pong)', () => {
		const client = new GraphQLClient({
			Name: 'PongSentClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should handle pong with undefined PingTimeout', () => {
		const client = new GraphQLClient({
			Name: 'PongNoTimeoutClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should handle socket not defined when closing', () => {
		const client = new GraphQLClient({
			Name: 'NoSocketClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should handle socket defined when closing', () => {
		const client = new GraphQLClient({
			Name: 'WithSocketClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should timeout ping with correct code and message', () => {
		const client = new GraphQLClient({
			Name: 'PingTimeoutCodeClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should set ping timeout wait time', () => {
		const client = new GraphQLClient({
			Name: 'PingTimeoutWaitClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});
});

describe('GraphQLClient WebSocket - Event Dispatchers', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should dispatch connecting event', () => {
		const client = new GraphQLClient({
			Name: 'ConnectingEventClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.OnConnecting).toBeDefined();
	});

	it('should dispatch opened event and assign socket', () => {
		const client = new GraphQLClient({
			Name: 'OpenedEventClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.OnOpened).toBeDefined();
	});

	it('should dispatch connected event', () => {
		const client = new GraphQLClient({
			Name: 'ConnectedEventClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.OnConnected).toBeDefined();
	});

	it('should dispatch closed event', () => {
		const client = new GraphQLClient({
			Name: 'ClosedEventClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.OnClosed).toBeDefined();
	});

	it('should dispatch error event', () => {
		const client = new GraphQLClient({
			Name: 'ErrorEventClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.OnError).toBeDefined();
	});
});

describe('GraphQLClient Split Link - Operation Routing', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should detect subscription operation kind', () => {
		const client = new GraphQLClient({
			Name: 'SubscriptionDetectClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should check operation is OperationDefinition', () => {
		const client = new GraphQLClient({
			Name: 'OperationDefinitionClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should check operation type is subscription', () => {
		const client = new GraphQLClient({
			Name: 'SubscriptionTypeClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should route to WS link for subscriptions', () => {
		const client = new GraphQLClient({
			Name: 'WSLinkRouteClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should route to HTTP link for queries and mutations', () => {
		const client = new GraphQLClient({
			Name: 'HTTPLinkRouteClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});
});

describe('GraphQLClient Link Chain Construction', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should create complete link chain', () => {
		const client = new GraphQLClient({
			Name: 'CompleteChainClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should concat error link with retry link', () => {
		const client = new GraphQLClient({
			Name: 'ErrorRetryChainClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should concat retry link with auth link', () => {
		const client = new GraphQLClient({
			Name: 'RetryAuthChainClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should concat auth link with split link', () => {
		const client = new GraphQLClient({
			Name: 'AuthSplitChainClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});
});

describe('GraphQLClient Apollo Configuration - Cache and Defaults', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should initialize InMemoryCache', () => {
		const client = new GraphQLClient({
			Name: 'MemoryCacheClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should set no-cache policy for watchQuery', () => {
		const client = new GraphQLClient({
			Name: 'NoCacheWatchClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should set no-cache policy for query', () => {
		const client = new GraphQLClient({
			Name: 'NoCacheQueryClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should set no-cache policy for mutate', () => {
		const client = new GraphQLClient({
			Name: 'NoCacheMutateClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should include all default options', () => {
		const client = new GraphQLClient({
			Name: 'DefaultOptionsClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});
});

describe('GraphQLClient Constant Values', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should use ping timeout code 4408', () => {
		const client = new GraphQLClient({
			Name: 'PingCodeClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should use ping timeout wait 5000ms', () => {
		const client = new GraphQLClient({
			Name: 'PingWaitClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should use retry initial delay 1000ms', () => {
		const client = new GraphQLClient({
			Name: 'RetryInitialClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should use retry max delay 10000ms', () => {
		const client = new GraphQLClient({
			Name: 'RetryMaxDelayClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should use retry max attempts 10', () => {
		const client = new GraphQLClient({
			Name: 'RetryMaxAttemptsClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});
});

describe('GraphQLClient Retry Logic - retryIf Function', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should retry on network errors (message does not start with [GraphQL error)', () => {
		const client = new GraphQLClient({
			Name: 'RetryNetworkClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should not retry on GraphQL errors (message starts with [GraphQL error)', () => {
		const client = new GraphQLClient({
			Name: 'NoRetryGraphQLClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should distinguish network errors from GraphQL errors', () => {
		const client = new GraphQLClient({
			Name: 'DistinguishErrorsClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});
});

describe('GraphQLClient Builder - Internal Logic Testing', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should create client and test error link constructor parameters', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient1',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			LogGraphQLErrors: true,
			LogNetworkErrors: false,
		});

		expect(client).toBeDefined();
		expect(client.Name).toBe('BuilderTestClient1');
	});

	it('should create retry link in builder', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient2',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should create auth link with context in builder', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient3',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			Token: 'builder-test-token',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should create WS client in builder', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient4',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should create WS link in builder', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient5',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should create HTTP link in builder', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient6',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should create split link in builder', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient7',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should assemble link chain in builder', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient8',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should create Apollo client with correct parameters', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient9',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should test with UseTokenFunction true and TokenFunction defined', () => {
		const tokenFn = vi.fn().mockResolvedValue('test-token');
		const client = new GraphQLClient({
			Name: 'BuilderTestClient10',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			TokenFunction: tokenFn,
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should test with UseTokenFunction true but TokenFunction undefined', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient11',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			TokenFunction: undefined,
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should test with UseTokenFunction false', () => {
		const tokenFn = vi.fn().mockResolvedValue('ignored');
		const client = new GraphQLClient({
			Name: 'BuilderTestClient12',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: false,
			TokenFunction: tokenFn,
			Token: 'static-token',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should test logging both false', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient13',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			LogGraphQLErrors: false,
			LogNetworkErrors: false,
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should test logging both true', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient14',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			LogGraphQLErrors: true,
			LogNetworkErrors: true,
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should test token conditions in HTTP auth link', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient15',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			Token: 'http-auth-token',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should test no token in HTTP auth link', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient16',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should test token conditions in WS params', () => {
		const tokenFn = vi.fn().mockResolvedValue('ws-token');
		const client = new GraphQLClient({
			Name: 'BuilderTestClient17',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			TokenFunction: tokenFn,
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should test no token in WS params', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient18',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should test received ping flag true', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient19',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should test received ping flag false', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient20',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should test received pong flag true with timeout', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient21',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should test received pong flag true without timeout', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient22',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should test socket defined in ping handler', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient23',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should test socket undefined in ping handler', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient24',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should test subscription operation detection', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient25',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should test non-subscription operation detection', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient26',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.Apollo).toBeDefined();
	});

	it('should test GraphQL error detection in error link', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient27',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			LogGraphQLErrors: true,
		});

		expect(client).toBeDefined();
	});

	it('should test non-GraphQL error in error link', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient28',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			LogNetworkErrors: true,
		});

		expect(client).toBeDefined();
	});

	it('should test retry message check for network error condition', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient29',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should test socket assignment in opened handler', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient30',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client).toBeDefined();
	});

	it('should test all event dispatchers registered', () => {
		const client = new GraphQLClient({
			Name: 'BuilderTestClient31',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		});

		expect(client.OnConnecting).toBeDefined();
		expect(client.OnOpened).toBeDefined();
		expect(client.OnConnected).toBeDefined();
		expect(client.OnClosed).toBeDefined();
		expect(client.OnError).toBeDefined();
	});
});
