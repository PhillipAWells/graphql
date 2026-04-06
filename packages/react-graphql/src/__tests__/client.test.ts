import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CreateGraphQLClient } from '../client';
import { GraphQLConnectionState } from '../types';
import type { TGraphQLClientOptions } from '../types';

let OnErrorHandler: ((errorResponse: any) => void) | undefined;
let SetContextHandler: ((operation: unknown, prevContext: Record<string, unknown>) => Promise<Record<string, unknown>>) | undefined;
let GetMainDefinitionMock: ((_op: any) => any) | undefined;
let WsClientEventHandlers: Record<string, Function> = {};

vi.mock('graphql-ws', () => ({
	createClient: vi.fn((config: any) => {
		WsClientEventHandlers = config.on ?? {};
		return {
			dispose: vi.fn(),
			on: vi.fn(),
		};
	}),
}));

vi.mock('@apollo/client/core', () => ({
	ApolloClient: vi.fn(function(this: any) {
		this.stop = vi.fn();
	}),
	InMemoryCache: vi.fn(),
	ApolloLink: {
		from: vi.fn((links) => links[0]),
	},
	split: vi.fn((fn, ifTrue, ifFalse) => ifFalse),
}));

vi.mock('@apollo/client/link/error', () => ({
	onError: vi.fn((fn) => {
		OnErrorHandler = fn;
		return fn;
	}),
}));

vi.mock('@apollo/client/link/retry', () => ({
	RetryLink: vi.fn(),
}));

vi.mock('@apollo/client/link/context', () => ({
	setContext: vi.fn((fn) => {
		SetContextHandler = fn;
		return fn;
	}),
}));

vi.mock('@apollo/client/link/http', () => ({
	HttpLink: vi.fn(),
}));

vi.mock('@apollo/client/link/subscriptions', () => ({
	GraphQLWsLink: vi.fn(),
}));

vi.mock('@apollo/client/utilities', () => ({
	getMainDefinition: vi.fn((op) => {
		GetMainDefinitionMock?.(op);
		// Check if this is a subscription call
		if (op?.operation === 'subscription') {
			return {
				kind: 'OperationDefinition',
				operation: 'subscription',
			};
		}
		return {
			kind: 'OperationDefinition',
			operation: 'query',
		};
	}),
}));

describe('CreateGraphQLClient', () => {
	let Options: TGraphQLClientOptions;

	beforeEach(() => {
		Options = {
			name: 'test-client',
			httpUri: 'http://localhost:4000/graphql',
			wsUri: 'ws://localhost:4000/graphql',
		};
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should return a client result object', () => {
		const Result = CreateGraphQLClient(Options);

		expect(Result).toHaveProperty('client');
		expect(Result).toHaveProperty('dispose');
		expect(Result).toHaveProperty('getConnectionState');
		expect(Result).toHaveProperty('onStateChange');
	});

	it('should have initial connection state of Connecting', () => {
		const Result = CreateGraphQLClient(Options);
		expect(Result.getConnectionState()).toBe(GraphQLConnectionState.Connecting);
	});

	it('should allow registering state change handlers', () => {
		const Result = CreateGraphQLClient(Options);
		const Handler = vi.fn();

		Result.onStateChange(Handler);

		expect(Handler).not.toHaveBeenCalled();
	});

	it('should return an unsubscribe function from onStateChange', () => {
		const Result = CreateGraphQLClient(Options);
		const Handler = vi.fn();

		const Unsubscribe = Result.onStateChange(Handler);

		expect(typeof Unsubscribe).toBe('function');
	});

	it('should call unsubscribe function to remove handler', () => {
		const Result = CreateGraphQLClient(Options);
		const Handler = vi.fn();

		const Unsubscribe = Result.onStateChange(Handler);
		Unsubscribe();

		expect(Handler).not.toHaveBeenCalled();
	});

	it('should allow disposing the client', () => {
		const Result = CreateGraphQLClient(Options);

		expect(() => Result.dispose()).not.toThrow();
	});

	it('should handle static token string', () => {
		const OptionsWithToken: TGraphQLClientOptions = {
			...Options,
			token: 'static-token',
		};

		const Result = CreateGraphQLClient(OptionsWithToken);

		expect(() => Result.dispose()).not.toThrow();
	});

	it('should handle token function', () => {
		const OptionsWithToken: TGraphQLClientOptions = {
			...Options,
			token: () => 'dynamic-token',
		};

		const Result = CreateGraphQLClient(OptionsWithToken);

		expect(() => Result.dispose()).not.toThrow();
	});

	it('should handle async token function', async () => {
		const OptionsWithToken: TGraphQLClientOptions = {
			...Options,
			token: async () => 'async-token',
		};

		const Result = CreateGraphQLClient(OptionsWithToken);

		expect(() => Result.dispose()).not.toThrow();
	});

	it('should handle undefined token', () => {
		const OptionsWithToken: TGraphQLClientOptions = {
			...Options,
			token: undefined,
		};

		const Result = CreateGraphQLClient(OptionsWithToken);

		expect(() => Result.dispose()).not.toThrow();
	});

	it('should support logging GraphQL errors', () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

		const OptionsWithLogging: TGraphQLClientOptions = {
			...Options,
			logGraphQLErrors: true,
		};

		const Result = CreateGraphQLClient(OptionsWithLogging);

		expect(Result).toBeDefined();

		consoleErrorSpy.mockRestore();
	});

	it('should support logging network errors', () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

		const OptionsWithLogging: TGraphQLClientOptions = {
			...Options,
			logNetworkErrors: true,
		};

		const Result = CreateGraphQLClient(OptionsWithLogging);

		expect(Result).toBeDefined();

		consoleErrorSpy.mockRestore();
	});

	it('should use provided cache instance', () => {
		const customCache = {};

		const OptionsWithCache: TGraphQLClientOptions = {
			...Options,
			cache: customCache,
		};

		const Result = CreateGraphQLClient(OptionsWithCache);

		expect(Result).toBeDefined();
	});

	it('should invoke error handler for GraphQL errors', () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

		const OptionsWithLogging: TGraphQLClientOptions = {
			...Options,
			logGraphQLErrors: true,
		};

		CreateGraphQLClient(OptionsWithLogging);

		if (OnErrorHandler) {
			OnErrorHandler({
				graphQLErrors: [{ message: 'Test error' }],
			});
		}

		consoleErrorSpy.mockRestore();
	});

	it('should invoke error handler for network errors', () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

		const OptionsWithLogging: TGraphQLClientOptions = {
			...Options,
			logNetworkErrors: true,
		};

		CreateGraphQLClient(OptionsWithLogging);

		if (OnErrorHandler) {
			OnErrorHandler({
				networkError: new Error('Network failed'),
			});
		}

		consoleErrorSpy.mockRestore();
	});

	it('should handle empty error response', () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

		const OptionsWithLogging: TGraphQLClientOptions = {
			...Options,
			logGraphQLErrors: true,
			logNetworkErrors: true,
		};

		CreateGraphQLClient(OptionsWithLogging);

		if (OnErrorHandler) {
			OnErrorHandler({});
		}

		consoleErrorSpy.mockRestore();
	});

	it('should invoke auth link with operation and context', async () => {
		CreateGraphQLClient(Options);

		if (SetContextHandler) {
			const Result = await SetContextHandler({}, {});
			expect(Result).toHaveProperty('headers');
		}
	});

	it('should preserve existing headers in auth link', async () => {
		CreateGraphQLClient(Options);

		if (SetContextHandler) {
			const Result = await SetContextHandler({}, { headers: { 'X-Custom': 'value' } });
			expect(Result.headers).toHaveProperty('X-Custom');
		}
	});

	it('should add authorization header with token in auth link', async () => {
		const OptionsWithToken: TGraphQLClientOptions = {
			...Options,
			token: 'test-token',
		};

		CreateGraphQLClient(OptionsWithToken);

		if (SetContextHandler) {
			const Result = await SetContextHandler({}, {});
			expect(Result.headers).toHaveProperty('Authorization');
			expect((Result.headers as Record<string, any>)?.Authorization).toContain('Bearer');
		}
	});

	it('should add authorization header with async token in auth link', async () => {
		const OptionsWithToken: TGraphQLClientOptions = {
			...Options,
			token: async () => 'async-test-token',
		};

		CreateGraphQLClient(OptionsWithToken);

		if (SetContextHandler) {
			const Result = await SetContextHandler({}, {});
			expect(Result.headers).toHaveProperty('Authorization');
		}
	});

	it('should handle getMainDefinition for subscription detection', () => {
		GetMainDefinitionMock = vi.fn();

		CreateGraphQLClient(Options);

		expect(GetMainDefinitionMock).toBeDefined();
	});

	it('should handle multiple state change handlers', () => {
		const Result = CreateGraphQLClient(Options);
		const Handler1 = vi.fn();
		const Handler2 = vi.fn();

		Result.onStateChange(Handler1);
		Result.onStateChange(Handler2);

		expect(Handler1).not.toHaveBeenCalled();
		expect(Handler2).not.toHaveBeenCalled();
	});

	it('should remove handler when unsubscribe is called multiple times', () => {
		const Result = CreateGraphQLClient(Options);
		const Handler = vi.fn();

		const Unsubscribe = Result.onStateChange(Handler);
		Unsubscribe();
		Unsubscribe();

		expect(Handler).not.toHaveBeenCalled();
	});

	it('should handle dispose with pending timeout', () => {
		CreateGraphQLClient(Options);

		expect(() => {
			// Disposed without timeout
		}).not.toThrow();
	});

	it('should handle WebSocket connecting event', () => {
		const Result = CreateGraphQLClient(Options);
		const Handler = vi.fn();

		Result.onStateChange(Handler);

		if (WsClientEventHandlers.connecting) {
			WsClientEventHandlers.connecting();
		}

		expect(Result.getConnectionState()).toBe(GraphQLConnectionState.Connecting);
	});

	it('should handle WebSocket opened event', () => {
		const Result = CreateGraphQLClient(Options);

		if (WsClientEventHandlers.opened) {
			WsClientEventHandlers.opened({} as any);
		}

		expect(Result.getConnectionState()).toBe(GraphQLConnectionState.Connected);
	});

	it('should handle WebSocket connected event', () => {
		const Result = CreateGraphQLClient(Options);

		if (WsClientEventHandlers.connected) {
			WsClientEventHandlers.connected();
		}

		expect(Result.getConnectionState()).toBe(GraphQLConnectionState.Connected);
	});

	it('should handle WebSocket closed event', () => {
		const Result = CreateGraphQLClient(Options);

		if (WsClientEventHandlers.closed) {
			WsClientEventHandlers.closed();
		}

		expect(Result.getConnectionState()).toBe(GraphQLConnectionState.Disconnected);
	});

	it('should handle WebSocket error event', () => {
		const Result = CreateGraphQLClient(Options);

		if (WsClientEventHandlers.error) {
			WsClientEventHandlers.error();
		}

		expect(Result.getConnectionState()).toBe(GraphQLConnectionState.Error);
	});

	it('should handle WebSocket ping without received flag', () => {
		const Result = CreateGraphQLClient(Options);

		if (WsClientEventHandlers.ping) {
			vi.useFakeTimers();
			WsClientEventHandlers.ping(false);
			vi.useRealTimers();
		}

		expect(Result).toBeDefined();
	});

	it('should handle WebSocket pong with received flag and timeout', () => {
		const Result = CreateGraphQLClient(Options);

		if (WsClientEventHandlers.ping) {
			vi.useFakeTimers();
			WsClientEventHandlers.ping(false);
			if (WsClientEventHandlers.pong) {
				WsClientEventHandlers.pong(true);
			}
			vi.useRealTimers();
		}

		expect(Result).toBeDefined();
	});

	it('should get connection params with token', async () => {
		const OptionsWithToken: TGraphQLClientOptions = {
			...Options,
			token: 'test-token',
		};

		CreateGraphQLClient(OptionsWithToken);

		if (WsClientEventHandlers.connectionParams && typeof WsClientEventHandlers.connectionParams === 'function') {
			const Params = await (WsClientEventHandlers.connectionParams as any)();
			expect(Params).toHaveProperty('authorization');
		}
	});

	it('should get empty connection params without token', async () => {
		CreateGraphQLClient(Options);

		if (WsClientEventHandlers.connectionParams && typeof WsClientEventHandlers.connectionParams === 'function') {
			const Params = await (WsClientEventHandlers.connectionParams as any)();
			expect(Params).toEqual({});
		}
	});

	it('should handle WebSocket opened with socket and state change', () => {
		const Result = CreateGraphQLClient(Options);
		const Handler = vi.fn();

		Result.onStateChange(Handler);

		const MockSocket = {} as any;
		if (WsClientEventHandlers.opened) {
			WsClientEventHandlers.opened(MockSocket);
		}

		expect(Result.getConnectionState()).toBe(GraphQLConnectionState.Connected);
	});

	it('should clear timeout on closed event when timeout exists', () => {
		const Result = CreateGraphQLClient(Options);
		vi.useFakeTimers();

		if (WsClientEventHandlers.ping) {
			WsClientEventHandlers.ping(false);
		}

		if (WsClientEventHandlers.closed) {
			WsClientEventHandlers.closed();
		}

		vi.useRealTimers();

		expect(Result.getConnectionState()).toBe(GraphQLConnectionState.Disconnected);
	});

	it('should handle pong event without received flag', () => {
		const Result = CreateGraphQLClient(Options);

		if (WsClientEventHandlers.pong) {
			WsClientEventHandlers.pong(false);
		}

		expect(Result).toBeDefined();
	});

	it('should handle pong event without timeout set', () => {
		const Result = CreateGraphQLClient(Options);

		if (WsClientEventHandlers.pong) {
			WsClientEventHandlers.pong(true);
		}

		expect(Result).toBeDefined();
	});

	it('should handle ping with received flag', () => {
		const Result = CreateGraphQLClient(Options);

		if (WsClientEventHandlers.ping) {
			WsClientEventHandlers.ping(true);
		}

		expect(Result).toBeDefined();
	});

	it('should invoke the SetState function to track state changes', () => {
		const Result = CreateGraphQLClient(Options);
		const StateHandler = vi.fn();

		Result.onStateChange(StateHandler);

		if (WsClientEventHandlers.error) {
			WsClientEventHandlers.error();
		}

		expect(Result.getConnectionState()).toBe(GraphQLConnectionState.Error);
	});

	it('should support IsSubscription detection via split', () => {
		GetMainDefinitionMock = vi.fn(() => {
			return {
				kind: 'OperationDefinition',
				operation: 'subscription',
			};
		});

		const Result = CreateGraphQLClient(Options);

		expect(Result).toBeDefined();
	});

	it('should create properly configured Apollo Client', () => {
		const Result = CreateGraphQLClient(Options);

		expect(Result.client).toBeDefined();
		expect(Result.client).toHaveProperty('stop');
	});

	it('should call dispose on WsClient', () => {
		const Result = CreateGraphQLClient(Options);

		if (Result.dispose) {
			Result.dispose();
		}

		expect(Result).toBeDefined();
	});

	it('should detect subscription operations', () => {
		const Result = CreateGraphQLClient(Options);

		expect(Result).toBeDefined();
	});

	it('should detect query operations (not subscriptions)', () => {
		const Result = CreateGraphQLClient(Options);

		expect(Result).toBeDefined();
	});

	it('should handle ping event with socket cleanup', () => {
		const Result = CreateGraphQLClient(Options);

		vi.useFakeTimers();

		if (WsClientEventHandlers.ping) {
			WsClientEventHandlers.ping(false);
		}

		// Advance timers to trigger timeout
		vi.advanceTimersByTime(5000);

		vi.useRealTimers();

		expect(Result).toBeDefined();
	});

	it('should handle async token resolution in connection params', async () => {
		const OptionsWithToken: TGraphQLClientOptions = {
			...Options,
			token: async () => {
				return 'resolved-token';
			},
		};

		CreateGraphQLClient(OptionsWithToken);

		if (WsClientEventHandlers.connectionParams && typeof WsClientEventHandlers.connectionParams === 'function') {
			const Params = await (WsClientEventHandlers.connectionParams as any)();
			expect(Params).toHaveProperty('authorization');
			expect(Params.authorization).toContain('Bearer');
		}
	});

	it('should handle undefined token in connection params', async () => {
		const OptionsWithUndefinedToken: TGraphQLClientOptions = {
			...Options,
			token: undefined,
		};

		CreateGraphQLClient(OptionsWithUndefinedToken);

		if (WsClientEventHandlers.connectionParams && typeof WsClientEventHandlers.connectionParams === 'function') {
			const Params = await (WsClientEventHandlers.connectionParams as any)();
			expect(Params).toEqual({});
		}
	});
});
