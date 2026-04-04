import { Injectable, signal, effect } from '@angular/core';
import { Subject } from 'rxjs';
import {
	ApolloClient,
	InMemoryCache,
	ApolloLink,
	split,
	NormalizedCacheObject,
	Operation,
	FetchResult,
	gql,
} from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { setContext } from '@apollo/client/link/context';
import { HttpLink } from '@apollo/client/link/http';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient, Client as WsClient } from 'graphql-ws';
import type { GraphQLConnectionState, GraphQLConnectionEvent } from './types';

/**
 * Checks if an operation is a GraphQL subscription
 */
function isSubscription(operation: Operation): boolean {
	const def = getMainDefinition(operation.query);
	return def.kind === 'OperationDefinition' && def.operation === 'subscription';
}

/**
 * GraphQL client for Angular applications
 * Provides reactive Apollo + graphql-ws integration with connection state management
 */
@Injectable({ providedIn: 'root' })
export class GraphQLClient {
	public readonly Apollo = signal<ApolloClient<NormalizedCacheObject> | undefined>(undefined);
	public readonly Name = signal<string | undefined>(undefined);
	public readonly HTTP_URI = signal<string | undefined>(undefined);
	public readonly WS_URI = signal<string | undefined>(undefined);
	public readonly Token = signal<string | undefined>(undefined);
	public readonly LogGraphQLErrors = signal<boolean>(false);
	public readonly LogNetworkErrors = signal<boolean>(false);
	public readonly ConnectionState = signal<GraphQLConnectionState>(undefined);
	public readonly OnConnectionState = new Subject<GraphQLConnectionEvent>();

	private wsClient: WsClient | undefined;
	private pingTimeoutHandle: NodeJS.Timeout | undefined;

	constructor() {
		// Register effect that calls Setup() when Name, HTTP_URI, and WS_URI are all set
		effect(
			() => {
				const name = this.Name();
				const httpUri = this.HTTP_URI();
				const wsUri = this.WS_URI();

				if (name && httpUri && wsUri) {
					this.Setup().catch((error) => {
						console.error('Failed to setup GraphQL client:', error);
					});
				}
			},
			{ allowSignalWrites: true },
		);
	}

	/**
	 * Setup the Apollo client with link chain and WebSocket support
	 */
	protected async Setup(): Promise<void> {
		// Create error link for error handling
		const errorLink = onError(
			({ graphQLErrors, networkError, operation, forward }) => {
				if (graphQLErrors && this.LogGraphQLErrors()) {
					graphQLErrors.forEach(({ message, locations, path }) => {
						console.error(
							`[GraphQL error]: Message: ${message}, Location: ${JSON.stringify(locations)}, Path: ${path}`,
						);
					});
				}

				if (networkError && this.LogNetworkErrors()) {
					console.error(`[Network error]: ${networkError}`);
				}

				return forward(operation);
			},
		);

		// Create retry link with exponential backoff (1s-10s, max 10 retries)
		const retryLink = new RetryLink({
			delay: {
				initial: 1000,
				max: 10000,
				jitter: true,
			},
			attempts: {
				max: 10,
				retryIf: (error) => !!error,
			},
		});

		// Create auth link that sets Authorization header
		const authLink = setContext((_, { headers }) => {
			const token = this.Token();
			const authHeaders: Record<string, string> = {
				...headers,
				'Accept': 'application/graphql-response+json;charset=utf-8',
			};

			if (token) {
				authHeaders['Authorization'] = `Bearer ${token}`;
			}

			return {
				headers: authHeaders,
			};
		});

		// Create HTTP link
		const httpLink = new HttpLink({
			uri: this.HTTP_URI(),
			credentials: 'include',
		});

		// Create WebSocket link
		const wsUri = this.WS_URI();
		this.wsClient = createClient({
			url: wsUri,
			lazy: false,
			keepAlive: 0,
			retryAttempts: 5,
			connectionParams: () => {
				const token = this.Token();
				if (token) {
					return { authorization: token };
				}
				return {};
			},
			on: {
				connected: () => {
					this.ConnectionState.set('Connected');
					this.OnConnectionState.next({ State: 'Connected' });
				},
				connecting: () => {
					this.ConnectionState.set('Connecting');
					this.OnConnectionState.next({ State: 'Connecting' });
				},
				opened: () => {
					this.ConnectionState.set('Opened');
					this.OnConnectionState.next({ State: 'Opened' });
				},
				closed: () => {
					this.ConnectionState.set('Closed');
					this.OnConnectionState.next({ State: 'Closed' });
				},
				error: (error) => {
					this.ConnectionState.set('Error');
					this.OnConnectionState.next({ State: 'Error', Error: error });
				},
			},
			shouldRetry: () => true,
		});

		// Set up ping/pong timeout handler
		if (this.wsClient) {
			this.wsClient.on.ping?.(({ received }) => {
				// Clear existing timeout if pong was received
				if (received) {
					if (this.pingTimeoutHandle) {
						clearTimeout(this.pingTimeoutHandle);
						this.pingTimeoutHandle = undefined;
					}
					return;
				}

				// Set timeout for pong response
				this.pingTimeoutHandle = setTimeout(() => {
					if (this.wsClient) {
						this.wsClient.close(4408, 'Request Timeout');
					}
				}, 5000);
			});
		}

		// Create WebSocket link
		const graphQLWsLink = new GraphQLWsLink(this.wsClient!);

		// Combine links: error → retry → auth → split(subscription, ws, http)
		const link = ApolloLink.from([
			errorLink,
			retryLink,
			authLink,
			split(isSubscription, graphQLWsLink, httpLink),
		]);

		// Create Apollo client
		const client = new ApolloClient({
			link,
			cache: new InMemoryCache(),
			defaultOptions: {
				watchQuery: { fetchPolicy: 'no-cache' },
				query: { fetchPolicy: 'no-cache' },
				mutate: { fetchPolicy: 'no-cache' },
			},
		});

		this.Apollo.set(client);
	}

	/**
	 * Reset the Apollo client and re-initialize
	 */
	public Reset(): void {
		const apollo = this.Apollo();
		if (apollo) {
			apollo.resetStore();
			apollo.stop();
		}

		if (this.wsClient) {
			this.wsClient.dispose();
			this.wsClient = undefined;
		}

		if (this.pingTimeoutHandle) {
			clearTimeout(this.pingTimeoutHandle);
			this.pingTimeoutHandle = undefined;
		}

		this.Apollo.set(undefined);
		this.Setup().catch((error) => {
			console.error('Failed to reset GraphQL client:', error);
		});
	}
}
