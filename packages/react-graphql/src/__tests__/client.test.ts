import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateGraphQLClient } from '../client';
import { GraphQLConnectionState } from '../types';
import type { GraphQLClientOptions } from '../types';

vi.mock('graphql-ws', () => ({
	createClient: vi.fn(() => ({
		dispose: vi.fn(),
		on: vi.fn(),
	})),
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
	onError: vi.fn((fn) => fn),
}));

vi.mock('@apollo/client/link/retry', () => ({
	RetryLink: vi.fn(),
}));

vi.mock('@apollo/client/link/context', () => ({
	setContext: vi.fn((fn) => fn),
}));

vi.mock('@apollo/client/link/http', () => ({
	HttpLink: vi.fn(),
}));

vi.mock('@apollo/client/link/subscriptions', () => ({
	GraphQLWsLink: vi.fn(),
}));

vi.mock('@apollo/client/utilities', () => ({
	getMainDefinition: vi.fn((_op) => ({
		kind: 'OperationDefinition',
		operation: 'query',
	})),
}));

describe('CreateGraphQLClient', () => {
	let Options: GraphQLClientOptions;

	beforeEach(() => {
		Options = {
			name: 'test-client',
			httpUri: 'http://localhost:4000/graphql',
			wsUri: 'ws://localhost:4000/graphql',
		};
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

	it('should allow disposing the client', () => {
		const Result = CreateGraphQLClient(Options);

		expect(() => Result.dispose()).not.toThrow();
	});

	it('should handle static token string', () => {
		const OptionsWithToken: GraphQLClientOptions = {
			...Options,
			token: 'static-token',
		};

		const Result = CreateGraphQLClient(OptionsWithToken);

		expect(() => Result.dispose()).not.toThrow();
	});

	it('should handle token function', () => {
		const OptionsWithToken: GraphQLClientOptions = {
			...Options,
			token: () => 'dynamic-token',
		};

		const Result = CreateGraphQLClient(OptionsWithToken);

		expect(() => Result.dispose()).not.toThrow();
	});

	it('should handle async token function', () => {
		const OptionsWithToken: GraphQLClientOptions = {
			...Options,
			token: async () => 'async-token',
		};

		const Result = CreateGraphQLClient(OptionsWithToken);

		expect(() => Result.dispose()).not.toThrow();
	});
});
