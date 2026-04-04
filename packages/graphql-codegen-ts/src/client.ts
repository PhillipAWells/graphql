import {
	ApolloClient,
	InMemoryCache,
	NormalizedCacheObject,
	split,
} from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { setContext } from '@apollo/client/link/context';
import { HttpLink } from '@apollo/client/link/http';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { SignalDispatcher, SimpleEventDispatcher } from 'strongly-typed-events';

export interface IGraphQLClientOptions {
	Name: string;
	HTTP_URI: string;
	WS_URI: string;
	UseTokenFunction?: boolean;
	Token?: string;
	TokenFunction?: () => Promise<string>;
	IsBrowser?: boolean;
	LogGraphQLErrors?: boolean;
	LogNetworkErrors?: boolean;
}

// Export under old name for backward compatibility
export type TGraphQLClientOptions = IGraphQLClientOptions;
/** @deprecated Use TGraphQLClientOptions instead */
export type GraphQLClientOptions = TGraphQLClientOptions;

export class GraphQLClient {
	public readonly Apollo: ApolloClient<NormalizedCacheObject>;
	public readonly Name: string;
	public readonly HTTP_URI: string;
	public readonly WS_URI: string;

	private readonly OnConnectingEvent: SignalDispatcher = new SignalDispatcher();
	private readonly OnOpenedEvent: SignalDispatcher = new SignalDispatcher();
	private readonly OnConnectedEvent: SignalDispatcher = new SignalDispatcher();
	private readonly OnClosedEvent: SignalDispatcher = new SignalDispatcher();
	private readonly OnErrorEvent: SimpleEventDispatcher<unknown> =
		new SimpleEventDispatcher<unknown>();
	private PingTimeout: ReturnType<typeof setTimeout> | undefined;
	private Socket: WebSocket | undefined;

	public get OnConnecting(): unknown {
		return this.OnConnectingEvent.asEvent();
	}

	public get OnOpened(): unknown {
		return this.OnOpenedEvent.asEvent();
	}

	public get OnConnected(): unknown {
		return this.OnConnectedEvent.asEvent();
	}

	public get OnClosed(): unknown {
		return this.OnClosedEvent.asEvent();
	}

	public get OnError(): unknown {
		return this.OnErrorEvent.asEvent();
	}

	public constructor(options: IGraphQLClientOptions) {
		this.Name = options.Name;
		this.HTTP_URI = options.HTTP_URI;
		this.WS_URI = options.WS_URI;
		this.Apollo = this._BuildClient(options);
	}

	public Reset(): void {
		this.Apollo.resetStore().catch(() => void 0);
		this.Apollo.stop();
	}

	private _BuildClient(
		options: IGraphQLClientOptions,
	): ApolloClient<NormalizedCacheObject> {
		const errorLink = onError(({ graphQLErrors, networkError }): void => {
			if (options.LogGraphQLErrors && graphQLErrors) {
				for (const err of graphQLErrors) {
					console.error('[GraphQL Error]', err);
				}
			}
			if (options.LogNetworkErrors && networkError) {
				console.error('[Network Error]', networkError);
			}
		});

		const retryLink = new RetryLink({
			delay: {
				initial: 1000,
				max: 10000,
				jitter: true,
			},
			attempts: {
				max: 10,
				retryIf: (error) => {
					const isNetworkError = !error.message.startsWith('[GraphQL error]');
					return isNetworkError;
				},
			},
		});

		const authLink = setContext(async (_, { headers }) => {
			const token =
				options.UseTokenFunction && options.TokenFunction
					? await options.TokenFunction()
					: options.Token;
			return {
				headers: {
					...headers,
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
			};
		});

		const wsClient = createClient({
			url: options.WS_URI,
			connectionParams: async () => {
				const token =
					options.UseTokenFunction && options.TokenFunction
						? await options.TokenFunction()
						: options.Token;
				return token ? { authorization: `Bearer ${token}` } : {};
			},
			on: {
				connecting: () => {
					this.OnConnectingEvent.dispatch();
				},
				opened: (socket) => {
					this.Socket = socket as unknown as WebSocket;
					this.OnOpenedEvent.dispatch();
				},
				connected: () => {
					this.OnConnectedEvent.dispatch();
				},
				closed: () => {
					this.OnClosedEvent.dispatch();
				},
				error: (err) => {
					this.OnErrorEvent.dispatch(err);
				},
				ping: (received) => {
					if (!received) {
						// Client sent ping, set 5s timeout for pong
						this.PingTimeout = setTimeout(() => {
							if (this.Socket) {
								this.Socket.close(4408, 'Ping timeout');
							}
						}, 5000);
					}
				},
				pong: (received) => {
					if (received && this.PingTimeout !== undefined) {
						// Received pong, clear timeout
						clearTimeout(this.PingTimeout);
						this.PingTimeout = undefined;
					}
				},
			},
		});

		const wsLink = new GraphQLWsLink(wsClient);

		const httpLink = new HttpLink({
			uri: options.HTTP_URI,
			credentials: 'include',
		});

		const splitLink = split(
			({ query }) => {
				const definition = getMainDefinition(query);
				return (
					definition.kind === 'OperationDefinition' &&
					definition.operation === 'subscription'
				);
			},
			wsLink,
			httpLink,
		);

		const link = errorLink.concat(retryLink).concat(authLink).concat(splitLink);

		return new ApolloClient({
			link,
			cache: new InMemoryCache(),
			defaultOptions: {
				watchQuery: { fetchPolicy: 'no-cache' },
				query: { fetchPolicy: 'no-cache' },
				mutate: { fetchPolicy: 'no-cache' },
			},
		});
	}
}
