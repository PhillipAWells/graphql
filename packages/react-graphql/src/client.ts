import { ApolloClient, InMemoryCache, ApolloLink, split } from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import type { ErrorLink } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { setContext } from '@apollo/client/link/context';
import { HttpLink } from '@apollo/client/link/http';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient as createWsClient } from 'graphql-ws';
import type { DocumentNode } from 'graphql';
import type { TGraphQLClientOptions, GraphQLConnectionState } from './types';
import { GraphQLConnectionState as State } from './types';

export type TDisposeFunction = () => void;

/**
 * @internal
 * Stores the previous state for the connection provider.
 * Used internally to track context changes and notify subscribers.
 */
interface IContextPrevious {
	headers?: Record<string, string | undefined>;
	[key: string]: unknown;
}

/**
 * Result object returned when creating a GraphQL client.
 * Contains the configured Apollo Client and connection state provider.
 */
export interface IGraphQLClientResult {
	client: ApolloClient;
	dispose: TDisposeFunction;
	getConnectionState: () => GraphQLConnectionState;
	onStateChange: (handler: (state: GraphQLConnectionState) => void) => () => void;
}

/**
 * WebSocket ping timeout code
 * @internal
 */
const PING_TIMEOUT_CODE = 4408;

/**
 * WebSocket ping timeout duration in milliseconds
 */
export const PING_TIMEOUT_MS = 5000;

/**
 * Creates a configured Apollo Client with HTTP and WebSocket transport.
 * Supports automatic reconnection with exponential backoff, connection state tracking, and error logging.
 * @param options - Configuration options for the client.
 * @returns Configured Apollo Client with connection state provider.
 */
export function CreateGraphQLClient(options: TGraphQLClientOptions): IGraphQLClientResult {
	let _connectionState: GraphQLConnectionState = State.Connecting;
	const _stateHandlers: Array<(state: GraphQLConnectionState) => void> = [];

	function setState(state: GraphQLConnectionState): void {
		_connectionState = state;
		for (const handler of _stateHandlers) {
			handler(state);
		}
	}

	// eslint-disable-next-line require-await
	async function resolveToken(): Promise<string | undefined> {
		if (!options.token) return undefined;
		if (typeof options.token === 'function') return options.token();
		return options.token;
	}

	let _pingTimeout: ReturnType<typeof setTimeout> | undefined;
	let _wsSocket: WebSocket | undefined;

	const wsClient = createWsClient({
		url: options.wsUri,
		lazy: false,
		keepAlive: 0,
		retryAttempts: 5,
		connectionParams: async () => {
			const token = await resolveToken();
			return token ? { authorization: `Bearer ${token}` } : {};
		},
		on: {
			connecting: () => setState(State.Connecting),
			opened: (socket) => {
				_wsSocket = socket as WebSocket;
				setState(State.Connected);
			},
			connected: () => setState(State.Connected),
			closed: () => {
				_wsSocket = undefined;
				if (_pingTimeout) {
					clearTimeout(_pingTimeout);
					_pingTimeout = undefined;
				}
				setState(State.Disconnected);
			},
			error: () => setState(State.Error),
			ping: (received) => {
				if (!received) {
					_pingTimeout = setTimeout(() => {
						_wsSocket?.close(PING_TIMEOUT_CODE, 'Request Timeout');
					}, PING_TIMEOUT_MS);
				}
			},
			pong: (received) => {
				if (received && _pingTimeout) {
					clearTimeout(_pingTimeout);
					_pingTimeout = undefined;
				}
			},
		},
	});

	const errorLink = onError((errorResponse: ErrorLink.ErrorHandlerOptions) => {
		if (options.logGraphQLErrors && errorResponse.error) {
			console.error('[GraphQL error]', errorResponse.error);
		}
		if (options.logNetworkErrors && errorResponse.error) {
			console.error('[Network error]', errorResponse.error);
		}
	});

	const retryLinkInstance = new RetryLink({
		delay: { initial: 1000, max: 10000, jitter: true },
		attempts: { max: 10 },
	});

	const authLink = setContext(async (_: unknown, prevContext: IContextPrevious): Promise<IContextPrevious> => {
		const token = await resolveToken();
		const prevHeaders = (prevContext.headers as Record<string, string | undefined>) || {};
		return {
			...prevContext,
			headers: {
				...prevHeaders,
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
		};
	});

	const httpLinkInstance = new HttpLink({ uri: options.httpUri });
	const wsLinkInstance = new GraphQLWsLink(wsClient);

	function isSubscription(op: { readonly query: DocumentNode }): boolean {
		const def = getMainDefinition(op.query);
		return def.kind === 'OperationDefinition' && def.operation === 'subscription';
	}

	const link = ApolloLink.from([
		errorLink,
		retryLinkInstance,
		authLink,
		split(isSubscription, wsLinkInstance, httpLinkInstance),
	]);

	const cache = (options.cache as InMemoryCache | undefined) ?? new InMemoryCache();

	const client = new ApolloClient({
		link,
		cache,
		defaultOptions: {
			watchQuery: { fetchPolicy: 'no-cache' },
			query: { fetchPolicy: 'no-cache' },
			mutate: { fetchPolicy: 'no-cache' },
		},
	});

	const dispose: TDisposeFunction = (): void => {
		if (_pingTimeout) clearTimeout(_pingTimeout);
		wsClient.dispose();
		client.stop();
	};

	return {
		client,
		dispose,
		getConnectionState: (): GraphQLConnectionState => _connectionState,
		onStateChange: (handler): (() => void) => {
			_stateHandlers.push(handler);
			return (): void => {
				const idx = _stateHandlers.indexOf(handler);
				if (idx !== -1) _stateHandlers.splice(idx, 1);
			};
		},
	};
}
