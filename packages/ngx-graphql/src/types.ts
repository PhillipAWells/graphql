/**
 * GraphQL connection state enum
 * Represents the lifecycle states of the GraphQL WebSocket connection
 */
export type GraphQLConnectionState =
	| 'Connecting'
	| 'Opened'
	| 'Connected'
	| 'Closed'
	| 'Error'
	| undefined;

/**
 * GraphQL connection event
 * Emitted when the connection state changes
 */
export interface GraphQLConnectionEvent {
	State: GraphQLConnectionState;
	Error?: unknown;
}
