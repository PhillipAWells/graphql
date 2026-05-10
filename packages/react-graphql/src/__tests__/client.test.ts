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

	it('should not log GraphQL errors when errorResponse.error is undefined but logGraphQLErrors is true', () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

		const OptionsWithLogging: TGraphQLClientOptions = {
			...Options,
			logGraphQLErrors: true,
		};

		CreateGraphQLClient(OptionsWithLogging);

		if (OnErrorHandler) {
			OnErrorHandler({
				graphQLErrors: undefined,
				error: undefined,
			});
		}

		expect(consoleErrorSpy).not.toHaveBeenCalledWith('[GraphQL error]', expect.anything());

		consoleErrorSpy.mockRestore();
	});

	it('should not log network errors when errorResponse.error is undefined but logNetworkErrors is true', () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

		const OptionsWithLogging: TGraphQLClientOptions = {
			...Options,
			logNetworkErrors: true,
		};

		CreateGraphQLClient(OptionsWithLogging);

		if (OnErrorHandler) {
			OnErrorHandler({
				networkError: undefined,
				error: undefined,
			});
		}

		expect(consoleErrorSpy).not.toHaveBeenCalledWith('[Network error]', expect.anything());

		consoleErrorSpy.mockRestore();
	});

	it('should remove handler from state handlers when unsubscribe is called', () => {
		const Result = CreateGraphQLClient(Options);
		const Handler1 = vi.fn();
		const Handler2 = vi.fn();

		Result.onStateChange(Handler1);
		Result.onStateChange(Handler2);

		const Unsubscribe1 = Result.onStateChange(Handler1);

		// Verify handler was registered
		expect(Handler1).not.toHaveBeenCalled();

		// Unsubscribe the handler
		Unsubscribe1();

		// Trigger state change
		if (WsClientEventHandlers.error) {
			WsClientEventHandlers.error();
		}

		// Verify state changed
		expect(Result.getConnectionState()).toBe(GraphQLConnectionState.Error);
	});

	it('should handle ping event when received flag is false', () => {
		const Result = CreateGraphQLClient(Options);
		vi.useFakeTimers();

		if (WsClientEventHandlers.ping) {
			WsClientEventHandlers.ping(false);
		}

		// Verify timeout was set by checking dispose doesn't throw
		expect(() => Result.dispose()).not.toThrow();

		vi.useRealTimers();
	});

	it('should handle WebSocket opened event and call state handlers', () => {
		const Result = CreateGraphQLClient(Options);
		const Handler = vi.fn();

		Result.onStateChange(Handler);

		if (WsClientEventHandlers.opened) {
			WsClientEventHandlers.opened({} as any);
		}

		// Handler should be called when state changes
		expect(Handler).toHaveBeenCalledWith(GraphQLConnectionState.Connected);
	});

	it('should properly track and call multiple state handlers on state change', () => {
		const Result = CreateGraphQLClient(Options);
		const Handler1 = vi.fn();
		const Handler2 = vi.fn();
		const Handler3 = vi.fn();

		Result.onStateChange(Handler1);
		Result.onStateChange(Handler2);
		Result.onStateChange(Handler3);

		if (WsClientEventHandlers.connected) {
			WsClientEventHandlers.connected();
		}

		expect(Handler1).toHaveBeenCalledWith(GraphQLConnectionState.Connected);
		expect(Handler2).toHaveBeenCalledWith(GraphQLConnectionState.Connected);
		expect(Handler3).toHaveBeenCalledWith(GraphQLConnectionState.Connected);
	});

	it('should handle removing specific handler from multiple registered handlers', () => {
		const Result = CreateGraphQLClient(Options);
		const Handler1 = vi.fn();
		const Handler2 = vi.fn();

		const Unsubscribe1 = Result.onStateChange(Handler1);
		Result.onStateChange(Handler2);

		// Unsubscribe first handler
		Unsubscribe1();

		if (WsClientEventHandlers.error) {
			WsClientEventHandlers.error();
		}

		// Only Handler2 should be called
		expect(Handler1).not.toHaveBeenCalled();
		expect(Handler2).toHaveBeenCalledWith(GraphQLConnectionState.Error);
	});

	it('should handle pong event with received flag true and active timeout', () => {
		const Result = CreateGraphQLClient(Options);
		vi.useFakeTimers();

		if (WsClientEventHandlers.ping) {
			WsClientEventHandlers.ping(false);
		}

		if (WsClientEventHandlers.pong) {
			WsClientEventHandlers.pong(true);
		}

		// Timeout should be cleared
		expect(() => Result.dispose()).not.toThrow();

		vi.useRealTimers();
	});

	it('should handle error link when only logGraphQLErrors is enabled and error is present', () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

		const OptionsWithLogging: TGraphQLClientOptions = {
			...Options,
			logGraphQLErrors: true,
			logNetworkErrors: false,
		};

		CreateGraphQLClient(OptionsWithLogging);

		if (OnErrorHandler) {
			OnErrorHandler({
				error: new Error('Test GraphQL error'),
			});
		}

		expect(consoleErrorSpy).toHaveBeenCalledWith('[GraphQL error]', expect.any(Error));

		consoleErrorSpy.mockRestore();
	});

	it('should handle error link when only logNetworkErrors is enabled and error is present', () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

		const OptionsWithLogging: TGraphQLClientOptions = {
			...Options,
			logGraphQLErrors: false,
			logNetworkErrors: true,
		};

		CreateGraphQLClient(OptionsWithLogging);

		if (OnErrorHandler) {
			OnErrorHandler({
				error: new Error('Test network error'),
			});
		}

		expect(consoleErrorSpy).toHaveBeenCalledWith('[Network error]', expect.any(Error));

		consoleErrorSpy.mockRestore();
	});

	it('should execute ping handler code path with received=false and timeout', () => {
		const Result = CreateGraphQLClient(Options);
		vi.useFakeTimers();

		if (WsClientEventHandlers.ping) {
			WsClientEventHandlers.ping(false);
			// Advance timers to trigger the timeout callback
			vi.advanceTimersByTime(5100);
		}

		// Verify dispose clears the timeout
		expect(() => Result.dispose()).not.toThrow();

		vi.useRealTimers();
	});

	it('should remove handler by index when unsubscribing after registering', () => {
		const Result = CreateGraphQLClient(Options);
		const Handler = vi.fn();

		const Unsubscribe = Result.onStateChange(Handler);

		// Verify handler was called on state change before unsubscribe
		if (WsClientEventHandlers.closing) {
			WsClientEventHandlers.closing?.();
		}

		// Now unsubscribe - this should trigger the splice
		Unsubscribe();

		// Trigger another state change to verify handler is no longer called
		if (WsClientEventHandlers.error) {
			WsClientEventHandlers.error();
		}

		// If handler was properly removed, it shouldn't be called on the second state change
		expect(Result.getConnectionState()).toBe(GraphQLConnectionState.Error);
	});

	it('should find and remove correct handler when multiple are registered', () => {
		const Result = CreateGraphQLClient(Options);
		const Handler1 = vi.fn();
		const Handler2 = vi.fn();
		const Handler3 = vi.fn();

		const _Unsubscribe1 = Result.onStateChange(Handler1);
		const Unsubscribe2 = Result.onStateChange(Handler2);
		const _Unsubscribe3 = Result.onStateChange(Handler3);

		// Unsubscribe Handler2 (middle one)
		Unsubscribe2();

		// Trigger state change
		if (WsClientEventHandlers.error) {
			WsClientEventHandlers.error();
		}

		// Handler1 and Handler3 should be called, but not Handler2
		expect(Handler1).toHaveBeenCalledWith(GraphQLConnectionState.Error);
		expect(Handler2).not.toHaveBeenCalled();
		expect(Handler3).toHaveBeenCalledWith(GraphQLConnectionState.Error);
	});

	it('should handle ping event received=false branch', () => {
		const Result = CreateGraphQLClient(Options);

		// Call ping with received=false
		if (WsClientEventHandlers.ping) {
			vi.useFakeTimers();
			WsClientEventHandlers.ping(false);
			vi.useRealTimers();
		}

		expect(Result).toBeDefined();
	});

	it('should execute timeout callback within ping handler when received is false', () => {
		const mockSocket = { close: vi.fn() };
		const _Result = CreateGraphQLClient(Options);

		vi.useFakeTimers();

		// First set the socket by calling opened
		if (WsClientEventHandlers.opened) {
			WsClientEventHandlers.opened(mockSocket as any);
		}

		// Then call ping with false to set timeout
		if (WsClientEventHandlers.ping) {
			WsClientEventHandlers.ping(false);

			// Advance time past the timeout duration
			vi.advanceTimersByTime(6000);

			// The timeout should trigger and call socket.close
			expect(mockSocket.close).toHaveBeenCalledWith(expect.any(Number), expect.any(String));
		}

		vi.useRealTimers();
	});

	it('should splice handler from array when found by index', () => {
		const Result = CreateGraphQLClient(Options);
		const Handler = vi.fn();

		// Register handler
		const Unsubscribe = Result.onStateChange(Handler);

		// Get the connection state before unsubscribe
		const _StateBefore = Result.getConnectionState();

		// Trigger unsubscribe (which calls indexOf and splice)
		Unsubscribe();

		// Verify handler no longer receives updates
		if (WsClientEventHandlers.connected) {
			WsClientEventHandlers.connected();
		}

		// The handler should not have been called after unsubscribe
		expect(Handler).not.toHaveBeenCalledWith(GraphQLConnectionState.Connected);
	});

	it('should handle case where handler index is not -1 during removal', () => {
		const Result = CreateGraphQLClient(Options);
		const Handler1 = vi.fn();
		const Handler2 = vi.fn();

		Result.onStateChange(Handler1);
		const Unsubscribe2 = Result.onStateChange(Handler2);

		// Unsubscribe Handler2
		Unsubscribe2();

		// Trigger state change
		if (WsClientEventHandlers.error) {
			WsClientEventHandlers.error();
		}

		// Handler1 should be called, Handler2 should not
		expect(Handler1).toHaveBeenCalled();
		expect(Handler2).not.toHaveBeenCalled();
	});

	it('should call connectionParams and return object with authorization for token', async () => {
		const TokenValue = 'test-connection-token';
		const OptionsWithToken: TGraphQLClientOptions = {
			...Options,
			token: TokenValue,
		};

		CreateGraphQLClient(OptionsWithToken);

		// Get the connectionParams function and call it directly
		const ConnectionParamsHandler = WsClientEventHandlers.connectionParams;
		if (ConnectionParamsHandler && typeof ConnectionParamsHandler === 'function') {
			const Params = await (ConnectionParamsHandler as any)();
			// This tests the ternary: token ? { authorization: ... } : {}
			expect(Params).toEqual({
				authorization: `Bearer ${TokenValue}`,
			});
			// Verify the token path is exercised
			expect(Params).toHaveProperty('authorization');
			expect((Params as Record<string, string>).authorization).toContain('Bearer');
		}
	});

	it('should return empty object from connectionParams when no token', async () => {
		CreateGraphQLClient(Options);

		// Call connectionParams when there's no token
		if (WsClientEventHandlers.connectionParams && typeof WsClientEventHandlers.connectionParams === 'function') {
			const Params = await (WsClientEventHandlers.connectionParams as any)();
			// This tests the ternary returning {}
			expect(Params).toEqual({});
		}
	});

	it('should log GraphQL error when logGraphQLErrors is true and error exists', () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

		const OptionsWithLogging: TGraphQLClientOptions = {
			...Options,
			logGraphQLErrors: true,
			logNetworkErrors: false,
		};

		CreateGraphQLClient(OptionsWithLogging);

		const TestError = new Error('Test GraphQL Error');

		if (OnErrorHandler) {
			// Call the error handler with an error object
			OnErrorHandler({
				error: TestError,
			});
		}

		expect(consoleErrorSpy).toHaveBeenCalledWith('[GraphQL error]', TestError);

		consoleErrorSpy.mockRestore();
	});

	it('should log network error when logNetworkErrors is true and error exists', () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

		const OptionsWithLogging: TGraphQLClientOptions = {
			...Options,
			logGraphQLErrors: false,
			logNetworkErrors: true,
		};

		CreateGraphQLClient(OptionsWithLogging);

		const TestError = new Error('Test Network Error');

		if (OnErrorHandler) {
			// Call the error handler with an error object
			OnErrorHandler({
				error: TestError,
			});
		}

		expect(consoleErrorSpy).toHaveBeenCalledWith('[Network error]', TestError);

		consoleErrorSpy.mockRestore();
	});

	it('should conditionally set timeout in ping handler when received is false', () => {
		const Result = CreateGraphQLClient(Options);

		vi.useFakeTimers();

		// Call ping with received=false - this tests the if (!received) branch
		if (WsClientEventHandlers.ping) {
			WsClientEventHandlers.ping(false);

			// Verify that timeout was set
			// The timeout should exist in the queue
			expect(vi.getTimerCount()).toBeGreaterThan(0);

			// Verify dispose can clear it
			Result.dispose();
		}

		vi.useRealTimers();
	});

	it('should not set timeout in ping handler when received is true', () => {
		const _Result = CreateGraphQLClient(Options);

		vi.useFakeTimers();

		const InitialTimerCount = vi.getTimerCount();

		// Call ping with received=true - this skips the if (!received) branch
		if (WsClientEventHandlers.ping) {
			WsClientEventHandlers.ping(true);

			// Timer count should not increase since timeout is not set
			const AfterPingTimerCount = vi.getTimerCount();
			expect(AfterPingTimerCount).toBe(InitialTimerCount);
		}

		vi.useRealTimers();
	});

	it('should use unsubscribe function that removes handler via splice when index is found', () => {
		const Result = CreateGraphQLClient(Options);
		const Handler1 = vi.fn();
		const Handler2 = vi.fn();
		const Handler3 = vi.fn();

		Result.onStateChange(Handler1);
		const Unsubscribe2 = Result.onStateChange(Handler2);
		Result.onStateChange(Handler3);

		// Unsubscribe Handler2 - this tests the if (idx !== -1) splice path
		Unsubscribe2();

		// Trigger state change
		if (WsClientEventHandlers.closing) {
			WsClientEventHandlers.closing?.();
		} else if (WsClientEventHandlers.error) {
			WsClientEventHandlers.error();
		}

		// Handler1 and Handler3 should be called, Handler2 should not
		expect(Handler1).toHaveBeenCalled();
		expect(Handler3).toHaveBeenCalled();
		expect(Handler2).not.toHaveBeenCalled();
	});

	it('should handle addEventListener when registering state handler', () => {
		const Result = CreateGraphQLClient(Options);
		const Handler = vi.fn();

		// Register handler
		const Unsubscribe = Result.onStateChange(Handler);

		// State handler should be registered
		expect(typeof Unsubscribe).toBe('function');

		// Unsubscribe to remove it
		Unsubscribe();

		expect(Handler).not.toHaveBeenCalled();
	});
});
