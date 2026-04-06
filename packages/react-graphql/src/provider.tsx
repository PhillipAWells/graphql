import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import type { ApolloClient } from '@apollo/client/core';
import { CreateGraphQLClient } from './client';
import type { TGraphQLClientOptions } from './types';
import { GraphQLConnectionState } from './types';

interface IGraphQLContextValue {
	connectionState: GraphQLConnectionState;
	reconnect: () => void;
}

export const GraphQLContext = createContext<IGraphQLContextValue | null>(null);

export function useGraphQLContext(): IGraphQLContextValue {
	const ctx = useContext(GraphQLContext);
	if (!ctx) throw new Error('useGraphQLContext must be used inside GraphQLProvider');
	return ctx;
}

export interface IGraphQLProviderProps {
	options: TGraphQLClientOptions;
	children: React.ReactNode;
	fallback?: React.ReactNode;
}

export function GraphQLProvider({ options, children, fallback }: IGraphQLProviderProps): React.ReactElement {
	const clientRef = useRef<ReturnType<typeof CreateGraphQLClient> | null>(null);
	const unsubscribeRef = useRef<(() => void) | null>(null);
	const [connectionState, setConnectionState] = useState<GraphQLConnectionState>(GraphQLConnectionState.Connecting);
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		const result = CreateGraphQLClient(options);
		clientRef.current = result;

		unsubscribeRef.current = result.onStateChange(setConnectionState);
		setIsReady(true);

		return (): void => {
			try {
				unsubscribeRef.current?.();
				result.dispose();
				clientRef.current = null;
			} catch (error) {
				console.error('Error disposing GraphQL client:', error);
			}
		};
	}, [options]);

	function reconnect(): void {
		try {
			unsubscribeRef.current?.();
			if (clientRef.current) {
				clientRef.current.dispose();
			}
			const result = CreateGraphQLClient(options);
			clientRef.current = result;
			unsubscribeRef.current = result.onStateChange(setConnectionState);
		} catch (error) {
			console.error('Error reconnecting GraphQL client:', error);
		}
	}

	if (!isReady || !clientRef.current) {
		return <>{fallback ?? null}</>;
	}

	return (
		<GraphQLContext.Provider value={{ connectionState: connectionState, reconnect: reconnect }}>
			<ApolloProvider client={clientRef.current.client as ApolloClient}>
				{children}
			</ApolloProvider>
		</GraphQLContext.Provider>
	);
}
