import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import type { ApolloClient } from '@apollo/client/core';
import { CreateGraphQLClient } from './client';
import type { GraphQLClientOptions } from './types';
import { GraphQLConnectionState } from './types';

interface IGraphQLContextValue {
	connectionState: GraphQLConnectionState;
	reconnect: () => void;
}

export const GraphQLContext = createContext<IGraphQLContextValue | null>(null);

export function UseGraphQLContext(): IGraphQLContextValue {
	const Ctx = useContext(GraphQLContext);
	if (!Ctx) throw new Error('useGraphQLContext must be used inside GraphQLProvider');
	return Ctx;
}

export interface IGraphQLProviderProps {
	options: GraphQLClientOptions;
	children: React.ReactNode;
	fallback?: React.ReactNode;
}

export function GraphQLProvider({ options, children, fallback }: IGraphQLProviderProps): React.ReactElement {
	const ClientRef = useRef<ReturnType<typeof CreateGraphQLClient> | null>(null);
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const [ConnectionState, setConnectionState] = useState<GraphQLConnectionState>(GraphQLConnectionState.Connecting);
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const [IsReady, setIsReady] = useState(false);

	useEffect(() => {
		const Result = CreateGraphQLClient(options);
		ClientRef.current = Result;

		const Unsubscribe = Result.onStateChange(setConnectionState);
		setIsReady(true);

		return () => {
			Unsubscribe();
			Result.dispose();
			ClientRef.current = null;
		};
	}, []);

	function Reconnect(): void {
		if (ClientRef.current) {
			ClientRef.current.dispose();
		}
		const Result = CreateGraphQLClient(options);
		ClientRef.current = Result;
		Result.onStateChange(setConnectionState);
	}

	if (!IsReady || !ClientRef.current) {
		return <>{fallback ?? null}</>;
	}

	return (
		<GraphQLContext.Provider value={{ connectionState: ConnectionState, reconnect: Reconnect }}>
			<ApolloProvider client={ClientRef.current.client as unknown as ApolloClient}>
				{children}
			</ApolloProvider>
		</GraphQLContext.Provider>
	);
}
