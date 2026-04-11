/**
 * Connection state for GraphQL client.
 */
export enum GraphQLConnectionState {
	/** Client is attempting to establish a connection. */
	Connecting = 'Connecting',
	/** Client has successfully connected. */
	Connected = 'Connected',
	/** Client is attempting to reconnect after a disconnection. */
	Reconnecting = 'Reconnecting',
	/** Client has disconnected. */
	Disconnected = 'Disconnected',
	/** A connection error has occurred. */
	Error = 'Error',
}

/**
 * Configuration options for creating a GraphQL client.
 */
export interface IGraphQLClientOptions {
	/** Client identifier/name. */
	name: string;
	/** HTTP endpoint URI for the GraphQL server. */
	httpUri: string;
	/** WebSocket endpoint URI for subscriptions. */
	wsUri: string;
	token?: string | (() => string | Promise<string>);
	/** Log GraphQL errors to console. */
	logGraphQLErrors?: boolean;
	/** Log network errors to console. */
	logNetworkErrors?: boolean;
	/** Apollo InMemoryCache instance to use. */
	cache?: unknown;
	/** Whether to persist the Apollo cache across sessions. */
	persistCache?: boolean;
}

/**
 * Type alias for GraphQLClientOptions.
 */
export type TGraphQLClientOptions = IGraphQLClientOptions;

/**
 * Event emitted on GraphQL client connection state changes.
 */
export interface IGraphQLConnectionEvent {
	/** New connection state. */
	state: GraphQLConnectionState;
	/** Error object if state is Error. */
	error?: unknown;
}

/**
 * Type alias for GraphQLConnectionEvent.
 */
export type TGraphQLConnectionEvent = IGraphQLConnectionEvent;
