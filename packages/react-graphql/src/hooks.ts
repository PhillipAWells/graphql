import { GraphQLConnectionState } from './types';
import { useGraphQLContext } from './provider';

export function useConnectionState(): GraphQLConnectionState {
	return useGraphQLContext().connectionState;
}

export function useGraphQLReconnect(): () => void {
	return useGraphQLContext().reconnect;
}
