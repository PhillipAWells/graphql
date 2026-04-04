import { describe, it, expect, vi, afterEach } from 'vitest';
import { GraphQLClient } from '../client';

// Mock @apollo/client
vi.mock('@apollo/client/core', () => {
	class MockApolloClient {
		public resetStore = vi.fn().mockResolvedValue(undefined);
		public stop = vi.fn();
	}

	class MockLink {
		public concat = vi.fn((nextLink: unknown) => nextLink);
	}

	class MockInMemoryCache {
		public constructor() {}
	}

	return {
		ApolloClient: MockApolloClient,
		InMemoryCache: MockInMemoryCache,
		split: (_test: unknown, _ifTrue: unknown, _ifFalse: unknown) => new MockLink(),
	};
});

vi.mock('@apollo/client/link/error', () => {
	class MockLink {
		public concat = vi.fn((nextLink: unknown) => nextLink);
	}

	return {
		onError: () => new MockLink(),
	};
});

vi.mock('@apollo/client/link/retry', () => {
	class MockLink {
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
	class MockLink {
		public concat = vi.fn((nextLink: unknown) => nextLink);
	}

	return {
		setContext: () => new MockLink(),
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
});
