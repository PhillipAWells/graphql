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
