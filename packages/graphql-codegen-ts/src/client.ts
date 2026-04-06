import {
	ApolloClient,
	InMemoryCache,
	NormalizedCacheObject,
	split,
} from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import { RetryLink as RetryLinkClass } from '@apollo/client/link/retry';
import { setContext } from '@apollo/client/link/context';
import { HttpLink as HttpLinkClass } from '@apollo/client/link/http';
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
// eslint-disable-next-line @typescript-eslint/naming-convention -- Legacy export name required for compatibility
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

	constructor(options: IGraphQLClientOptions) {
		this.Name = options.Name;
		this.HTTP_URI = options.HTTP_URI;
		this.WS_URI = options.WS_URI;
		this.Apollo = this._BuildClient(options);
	}

	public Reset(): void {
		this.Apollo.resetStore().catch((): void => {
			// Ignore reset errors
		});
		this.Apollo.stop();
	}

	private _BuildClient(
		options: IGraphQLClientOptions,
	): ApolloClient<NormalizedCacheObject> {
		const PING_TIMEOUT_CODE = 4408;
		const PING_TIMEOUT_WAIT_MS = 5000;

		const ErrorLink = onError(({ graphQLErrors, networkError }): void => {
			if (options.LogGraphQLErrors && graphQLErrors) {
				for (const Error of graphQLErrors) {
					console.error('[GraphQL Error]', Error);
				}
			}
			if (options.LogNetworkErrors && networkError) {
				console.error('[Network Error]', networkError);
			}
		});

		const RetryLink = new RetryLinkClass({
			delay: {
				initial: 1000,
				max: 10000,
				jitter: true,
			},
			attempts: {
				max: 10,
				retryIf: (error): boolean => {
					const IsNetworkError = !error.message.startsWith('[GraphQL error');
					return IsNetworkError;
				},
			},
		});

		const AuthLink = setContext(async (_, { headers }) => {
			const Token =
				options.UseTokenFunction && options.TokenFunction
					? await options.TokenFunction()
					: options.Token;
			return {
				headers: {
					...headers,
					...(Token ? { Authorization: `Bearer ${Token}` } : {}),
				},
			};
		});

		const WsClient = createClient({
			url: options.WS_URI,
			connectionParams: async () => {
				const Token =
					options.UseTokenFunction && options.TokenFunction
						? await options.TokenFunction()
						: options.Token;
				return Token ? { authorization: `Bearer ${Token}` } : {};
			},
			on: {
				connecting: () => {
					this.OnConnectingEvent.dispatch();
				},
				opened: (socket) => {
					this.Socket = socket as WebSocket;
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
								this.Socket.close(PING_TIMEOUT_CODE, 'Ping timeout');
							}
						}, PING_TIMEOUT_WAIT_MS);
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

		const WsLink = new GraphQLWsLink(WsClient);

		const HttpLink = new HttpLinkClass({
			uri: options.HTTP_URI,
			credentials: 'include',
		});

		const SplitLink = split(
			({ query }) => {
				const Definition = getMainDefinition(query);
				return (
					Definition.kind === 'OperationDefinition' &&
					Definition.operation === 'subscription'
				);
			},
			WsLink,
			HttpLink,
		);

		const Link = ErrorLink.concat(RetryLink).concat(AuthLink).concat(SplitLink);

		return new ApolloClient({
			link: Link,
			cache: new InMemoryCache(),
			defaultOptions: {
				watchQuery: { fetchPolicy: 'no-cache' },
				query: { fetchPolicy: 'no-cache' },
				mutate: { fetchPolicy: 'no-cache' },
			},
		});
	}
}
