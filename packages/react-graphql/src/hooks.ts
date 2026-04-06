import { GraphQLConnectionState } from './types';
import { useGraphQLContext } from './provider';

/**
 * React hook that returns the current GraphQL client connection state.
 * @returns Current GraphQLConnectionState.
 */
export function useConnectionState(): GraphQLConnectionState {
	return useGraphQLContext().connectionState;
}

/**
 * React hook that returns a function to manually trigger a reconnection.
 * @returns Function that triggers a reconnection attempt.
 */
export function useGraphQLReconnect(): () => void {
	return useGraphQLContext().reconnect;
}
