import { ApolloClient, InMemoryCache, ApolloLink, split } from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { setContext } from '@apollo/client/link/context';
import { HttpLink } from '@apollo/client/link/http';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient as createWsClient } from 'graphql-ws';
import type { DocumentNode } from 'graphql';
import type { GraphQLClientOptions, GraphQLConnectionState } from './types';
import { GraphQLConnectionState as State } from './types';

export type TDisposeFunction = () => void;

export interface IGraphQLClientResult {
	client: ApolloClient;
	dispose: TDisposeFunction;
	getConnectionState: () => GraphQLConnectionState;
	onStateChange: (handler: (state: GraphQLConnectionState) => void) => () => void;
}

export function CreateGraphQLClient(options: GraphQLClientOptions): IGraphQLClientResult {
	let _ConnectionState: GraphQLConnectionState = State.Connecting;
	const _StateHandlers: Array<(state: GraphQLConnectionState) => void> = [];

	function SetState(state: GraphQLConnectionState): void {
		_ConnectionState = state;
		for (const Handler of _StateHandlers) Handler(state);
	}

	// eslint-disable-next-line require-await
	async function ResolveToken(): Promise<string | undefined> {
		if (!options.token) return undefined;
		if (typeof options.token === 'function') return options.token();
		return options.token;
	}

	let _PingTimeout: ReturnType<typeof setTimeout> | undefined;
	let _WsSocket: WebSocket | undefined;

	const WsClient = createWsClient({
		url: options.wsUri,
		lazy: false,
		keepAlive: 0,
		retryAttempts: 5,
		connectionParams: async () => {
			const Token = await ResolveToken();
			return Token ? { authorization: `Bearer ${Token}` } : {};
		},
		on: {
			connecting: () => SetState(State.Connecting),
			opened: (socket) => {
				_WsSocket = socket as WebSocket;
				SetState(State.Connected);
			},
			connected: () => SetState(State.Connected),
			closed: () => {
				_WsSocket = undefined;
				if (_PingTimeout) {
					clearTimeout(_PingTimeout);
					_PingTimeout = undefined;
				}
				SetState(State.Disconnected);
			},
			error: () => SetState(State.Error),
			ping: (received) => {
				if (!received) {
					_PingTimeout = setTimeout(() => {
						// eslint-disable-next-line no-magic-numbers
						_WsSocket?.close(4408, 'Request Timeout');
					// eslint-disable-next-line no-magic-numbers
					}, 5000);
				}
			},
			pong: (received) => {
				if (received && _PingTimeout) {
					clearTimeout(_PingTimeout);
					_PingTimeout = undefined;
				}
			},
		},
	});

	const ErrorLink = onError((optionsErr: any) => {
		if (options.logGraphQLErrors && optionsErr.graphQLErrors) {
			optionsErr.graphQLErrors.forEach((err: unknown) => console.error('[GraphQL error]', err));
		}
		if (options.logNetworkErrors && optionsErr.networkError) {
			console.error('[Network error]', optionsErr.networkError);
		}
	});

	const RetryLinkInstance = new RetryLink({
		delay: { initial: 1000, max: 10000, jitter: true },
		attempts: { max: 10 },
	});

	const AuthLink = setContext(async (_op, { headers }) => {
		const Token = await ResolveToken();
		return {
			headers: {
				...headers,
				...(Token ? { Authorization: `Bearer ${Token}` } : {}),
			},
		};
	});

	const HttpLinkInstance = new HttpLink({ uri: options.httpUri });
	const WsLinkInstance = new GraphQLWsLink(WsClient);

	function IsSubscription(op: { query: DocumentNode }): boolean {
		const Def = getMainDefinition(op.query);
		return Def.kind === 'OperationDefinition' && Def.operation === 'subscription';
	}

	const Link = ApolloLink.from([
		ErrorLink,
		RetryLinkInstance,
		AuthLink,
		split(IsSubscription, WsLinkInstance, HttpLinkInstance),
	]);

	const Cache = (options.cache as InMemoryCache | undefined) ?? new InMemoryCache();

	const Client = new ApolloClient({
		link: Link,
		cache: Cache,
		defaultOptions: {
			watchQuery: { fetchPolicy: 'no-cache' },
			query: { fetchPolicy: 'no-cache' },
			mutate: { fetchPolicy: 'no-cache' },
		},
	});

	const Dispose: TDisposeFunction = () => {
		if (_PingTimeout) clearTimeout(_PingTimeout);
		WsClient.dispose();
		Client.stop();
	};

	return {
		client: Client,
		dispose: Dispose,
		getConnectionState: () => _ConnectionState,
		onStateChange: (handler) => {
			_StateHandlers.push(handler);
			return () => {
				const Idx = _StateHandlers.indexOf(handler);
				if (Idx !== -1) _StateHandlers.splice(Idx, 1);
			};
		},
	};
}
