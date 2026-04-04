import { GraphQLConnectionState } from './types';
import { UseGraphQLContext } from './provider';

export function UseConnectionState(): GraphQLConnectionState {
	return UseGraphQLContext().connectionState;
}

export function UseGraphQLReconnect(): () => void {
	return UseGraphQLContext().reconnect;
}

// Re-export with camelCase names for React hook convention
// eslint-disable-next-line @typescript-eslint/naming-convention
export const useConnectionState = UseConnectionState;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const useGraphQLReconnect = UseGraphQLReconnect;
