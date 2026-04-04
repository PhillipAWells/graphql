import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Subject } from 'rxjs';

// Mock Angular core before importing the client
vi.mock('@angular/core', () => {
	const mockSignal = (initialValue: unknown) => {
		let value = initialValue;
		const sig = () => value;
		sig.set = (v: unknown) => {
			value = v;
		};
		sig.update = (fn: (v: unknown) => unknown) => {
			value = fn(value);
		};
		return sig;
	};

	return {
		Injectable: () => (target: unknown) => target,
		signal: mockSignal,
		effect: (fn: () => void) => {
			fn();
		},
	};
});

// Mock Apollo client
vi.mock('@apollo/client/core', () => ({
	ApolloClient: vi.fn(),
	InMemoryCache: vi.fn(),
	ApolloLink: {
		from: vi.fn((links) => links[0]),
	},
	split: vi.fn(),
	gql: vi.fn(),
}));

vi.mock('@apollo/client/link/error', () => ({
	onError: vi.fn(() => ({})),
}));

vi.mock('@apollo/client/link/retry', () => ({
	RetryLink: vi.fn(),
}));

vi.mock('@apollo/client/link/context', () => ({
	setContext: vi.fn(),
}));

vi.mock('@apollo/client/link/http', () => ({
	HttpLink: vi.fn(),
}));

vi.mock('@apollo/client/link/subscriptions', () => ({
	GraphQLWsLink: vi.fn(),
}));

vi.mock('@apollo/client/utilities', () => ({
	getMainDefinition: vi.fn(() => ({
		kind: 'OperationDefinition',
		operation: 'query',
	})),
}));

vi.mock('graphql-ws', () => ({
	createClient: vi.fn(() => ({
		on: {},
		dispose: vi.fn(),
		close: vi.fn(),
	})),
}));

// Import after mocks are set up
import { GraphQLClient } from '../client';

describe('GraphQLClient', () => {
	let client: GraphQLClient;

	beforeEach(() => {
		client = new GraphQLClient();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Initialization', () => {
		it('should create an instance', () => {
			expect(client).toBeDefined();
		});

		it('should have Apollo signal initialized to undefined', () => {
			const apollo = client.Apollo();
			expect(apollo).toBeUndefined();
		});

		it('should have Name signal initialized to undefined', () => {
			const name = client.Name();
			expect(name).toBeUndefined();
		});

		it('should have HTTP_URI signal initialized to undefined', () => {
			const uri = client.HTTP_URI();
			expect(uri).toBeUndefined();
		});

		it('should have WS_URI signal initialized to undefined', () => {
			const uri = client.WS_URI();
			expect(uri).toBeUndefined();
		});

		it('should have Token signal initialized to undefined', () => {
			const token = client.Token();
			expect(token).toBeUndefined();
		});

		it('should have LogGraphQLErrors signal initialized to false', () => {
			const log = client.LogGraphQLErrors();
			expect(log).toBe(false);
		});

		it('should have LogNetworkErrors signal initialized to false', () => {
			const log = client.LogNetworkErrors();
			expect(log).toBe(false);
		});

		it('should have ConnectionState signal initialized to undefined', () => {
			const state = client.ConnectionState();
			expect(state).toBeUndefined();
		});

		it('should have OnConnectionState as a Subject', () => {
			expect(client.OnConnectionState).toBeInstanceOf(Subject);
		});
	});

	describe('Signals', () => {
		it('should update Name signal', () => {
			client.Name.set('TestClient');
			expect(client.Name()).toBe('TestClient');
		});

		it('should update HTTP_URI signal', () => {
			client.HTTP_URI.set('http://localhost:4000/graphql');
			expect(client.HTTP_URI()).toBe('http://localhost:4000/graphql');
		});

		it('should update WS_URI signal', () => {
			client.WS_URI.set('ws://localhost:4000/graphql');
			expect(client.WS_URI()).toBe('ws://localhost:4000/graphql');
		});

		it('should update Token signal', () => {
			client.Token.set('test-token-123');
			expect(client.Token()).toBe('test-token-123');
		});

		it('should update LogGraphQLErrors signal', () => {
			client.LogGraphQLErrors.set(true);
			expect(client.LogGraphQLErrors()).toBe(true);
		});

		it('should update LogNetworkErrors signal', () => {
			client.LogNetworkErrors.set(true);
			expect(client.LogNetworkErrors()).toBe(true);
		});

		it('should update ConnectionState signal', () => {
			client.ConnectionState.set('Connecting');
			expect(client.ConnectionState()).toBe('Connecting');
		});
	});

	describe('OnConnectionState Subject', () => {
		it('should emit connection state changes', () => {
			return new Promise<void>((resolve) => {
				const subscription = client.OnConnectionState.subscribe((event) => {
					expect(event.State).toBe('Connected');
					subscription.unsubscribe();
					resolve();
				});

				client.OnConnectionState.next({ State: 'Connected' });
			});
		});

		it('should emit connection errors', () => {
			return new Promise<void>((resolve) => {
				const error = new Error('Connection error');
				const subscription = client.OnConnectionState.subscribe((event) => {
					expect(event.State).toBe('Error');
					expect(event.Error).toBe(error);
					subscription.unsubscribe();
					resolve();
				});

				client.OnConnectionState.next({ State: 'Error', Error: error });
			});
		});
	});

	describe('Public API', () => {
		it('should expose readonly Apollo signal', () => {
			expect(typeof client.Apollo).toBe('function');
		});

		it('should expose readonly Name signal', () => {
			expect(typeof client.Name).toBe('function');
		});

		it('should expose readonly HTTP_URI signal', () => {
			expect(typeof client.HTTP_URI).toBe('function');
		});

		it('should expose readonly WS_URI signal', () => {
			expect(typeof client.WS_URI).toBe('function');
		});

		it('should expose readonly Token signal', () => {
			expect(typeof client.Token).toBe('function');
		});

		it('should expose readonly LogGraphQLErrors signal', () => {
			expect(typeof client.LogGraphQLErrors).toBe('function');
		});

		it('should expose readonly LogNetworkErrors signal', () => {
			expect(typeof client.LogNetworkErrors).toBe('function');
		});

		it('should expose readonly ConnectionState signal', () => {
			expect(typeof client.ConnectionState).toBe('function');
		});

		it('should expose OnConnectionState Subject', () => {
			expect(client.OnConnectionState).toBeDefined();
		});

		it('should have Reset method', () => {
			expect(typeof client.Reset).toBe('function');
		});
	});
});
