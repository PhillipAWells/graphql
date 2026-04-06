export enum GraphQLConnectionState {
	Connecting = 'Connecting',
	Connected = 'Connected',
	Reconnecting = 'Reconnecting',
	Disconnected = 'Disconnected',
	Error = 'Error',
}

export interface IGraphQLClientOptions {
	name: string;
	httpUri: string;
	wsUri: string;
	token?: string | (() => string | Promise<string>);
	logGraphQLErrors?: boolean;
	logNetworkErrors?: boolean;
	cache?: unknown;
	persistCache?: boolean;
}

export type TGraphQLClientOptions = IGraphQLClientOptions;

export interface IGraphQLConnectionEvent {
	state: GraphQLConnectionState;
	error?: unknown;
}

export type TGraphQLConnectionEvent = IGraphQLConnectionEvent;
