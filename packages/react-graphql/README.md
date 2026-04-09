# React GraphQL Client

[![GitHub Release](https://img.shields.io/github/v/release/PhillipAWells/graphql)](https://github.com/PhillipAWells/graphql/releases)
[![CI](https://github.com/PhillipAWells/graphql/actions/workflows/ci.yml/badge.svg)](https://github.com/PhillipAWells/graphql/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@pawells/react-graphql.svg?style=flat)](https://www.npmjs.com/package/@pawells/react-graphql)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/PhillipAWells/graphql/blob/main/LICENSE)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/PhillipAWells?style=social)](https://github.com/sponsors/PhillipAWells)

## Installation

```bash
yarn add @pawells/react-graphql @apollo/client graphql graphql-ws
```

## Quick Start

```tsx
import { GraphQLProvider } from '@pawells/react-graphql';
import App from './App';

export default function Root() {
  return (
    <GraphQLProvider
      options={{
        name: 'my-app',
        httpUri: 'http://localhost:4000/graphql',
        wsUri: 'ws://localhost:4000/graphql',
      }}
    >
      <App />
    </GraphQLProvider>
  );
}
```

## Features

- **Apollo Client Setup** — Preconfigured with HTTP and WebSocket links
- **Connection State Management** — Track connection status (Connecting, Connected, Reconnecting, Disconnected, Error)
- **Auto-retry with Exponential Backoff** — Handles network failures gracefully
- **Token-based Authentication** — Support for static and dynamic JWT tokens
- **WebSocket Subscriptions** — Built-in support for GraphQL subscriptions via graphql-ws
- **Error Logging** — Optional logging for GraphQL and network errors
- **Custom Cache** — Use your own Apollo InMemoryCache or let us create one

## API

### GraphQLProvider

Wraps your app with Apollo Client and connection state context.

```tsx
<GraphQLProvider
  options={{
    name: 'my-app',
    httpUri: 'http://localhost:4000/graphql',
    wsUri: 'ws://localhost:4000/graphql',
    token: () => localStorage.getItem('auth_token'),
    logGraphQLErrors: true,
    logNetworkErrors: true,
  }}
  fallback={<LoadingSpinner />}
>
  <YourApp />
</GraphQLProvider>
```

### useConnectionState

Returns the current GraphQL connection state.

```tsx
import { useConnectionState, GraphQLConnectionState } from '@pawells/react-graphql';

function Header() {
  const state = useConnectionState();
  
  return (
    <div>
      Status: {state}
      {state === GraphQLConnectionState.Disconnected && (
        <span className="error">Connection lost</span>
      )}
    </div>
  );
}
```

### useGraphQLReconnect

Manually trigger a reconnection.

```tsx
import { useGraphQLReconnect } from '@pawells/react-graphql';

function ConnectionControl() {
  const reconnect = useGraphQLReconnect();
  
  return <button onClick={reconnect}>Reconnect</button>;
}
```

## Connection States

- **Connecting** — Initial connection attempt or explicit reconnection
- **Connected** — Successfully connected to GraphQL server
- **Reconnecting** — Automatic reconnection after losing connection
- **Disconnected** — Connection closed normally
- **Error** — Connection error occurred

## Advanced Usage

### Custom Error Handling

Implement detailed error handling for GraphQL and network errors:

```tsx
import { GraphQLProvider } from '@pawells/react-graphql';

function CustomErrorHandler() {
  const handleErrors = {
    logGraphQLErrors: true,
    logNetworkErrors: true,
  };

  return (
    <GraphQLProvider
      options={{
        name: 'my-app',
        httpUri: 'http://localhost:4000/graphql',
        wsUri: 'ws://localhost:4000/graphql',
        ...handleErrors,
      }}
    >
      <App />
    </GraphQLProvider>
  );
}
```

With custom logging, errors are logged to the console before being passed to your error handlers. Differentiate between GraphQL errors (resolver failures) and network errors (connection issues):

```tsx
// In your client-side error handling
import { GraphQLError } from 'graphql';

function handleGraphQLError(error: GraphQLError) {
  const code = error.extensions?.code;
  const statusCode = error.extensions?.statusCode;
  
  if (statusCode === 401) {
    // Handle unauthorized — refresh token or redirect to login
  } else if (statusCode === 403) {
    // Handle forbidden — show permission error
  }
}
```

### Token Refresh Strategies

Implement dynamic token refresh on each request:

```tsx
import { GraphQLProvider } from '@pawells/react-graphql';

function TokenManager() {
  const getToken = async () => {
    // Check if token is expired
    const token = localStorage.getItem('auth_token');
    const expiresAt = localStorage.getItem('token_expires_at');
    
    if (expiresAt && Date.now() >= parseInt(expiresAt)) {
      // Refresh token
      const response = await fetch('/api/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      const { token: newToken, expiresIn } = await response.json();
      localStorage.setItem('auth_token', newToken);
      localStorage.setItem('token_expires_at', Date.now() + expiresIn * 1000);
      return newToken;
    }
    
    return token;
  };

  return (
    <GraphQLProvider
      options={{
        name: 'my-app',
        httpUri: 'http://localhost:4000/graphql',
        wsUri: 'ws://localhost:4000/graphql',
        token: getToken, // Function called on each request
      }}
    >
      <App />
    </GraphQLProvider>
  );
}
```

### Custom Apollo Cache Configuration

Use a custom InMemoryCache for advanced caching strategies:

```tsx
import { GraphQLProvider } from '@pawells/react-graphql';
import { InMemoryCache, possibleTypesResult } from '@apollo/client';

function CacheConfiguration() {
  const cache = new InMemoryCache({
    possibleTypes: possibleTypesResult.possibleTypes,
    typePolicies: {
      Query: {
        fields: {
          user: {
            read(existing, { args, toReference }) {
              // Custom read policy for user queries
              return existing || toReference({ __typename: 'User', id: args.id });
            },
          },
        },
      },
      User: {
        keyFields: ['id'],
        fields: {
          posts: {
            merge(existing = [], incoming) {
              // Merge new posts with existing
              return [...existing, ...incoming];
            },
          },
        },
      },
    },
  });

  return (
    <GraphQLProvider
      options={{
        name: 'my-app',
        httpUri: 'http://localhost:4000/graphql',
        wsUri: 'ws://localhost:4000/graphql',
        cache,
      }}
    >
      <App />
    </GraphQLProvider>
  );
}
```

### Connection State Monitoring

Monitor detailed connection state changes and react to them:

```tsx
import { useConnectionState, GraphQLConnectionState, useGraphQLReconnect } from '@pawells/react-graphql';
import { useEffect } from 'react';

function ConnectionMonitor() {
  const state = useConnectionState();
  const reconnect = useGraphQLReconnect();

  useEffect(() => {
    if (state === GraphQLConnectionState.Error) {
      // Automatically reconnect on error after 5 seconds
      const timer = setTimeout(() => reconnect(), 5000);
      return () => clearTimeout(timer);
    }
  }, [state, reconnect]);

  useEffect(() => {
    const logConnection = () => {
      console.log(`GraphQL connection: ${state}`);
      
      switch (state) {
        case GraphQLConnectionState.Connecting:
          console.log('Attempting to connect...');
          break;
        case GraphQLConnectionState.Connected:
          console.log('Connected to GraphQL server');
          break;
        case GraphQLConnectionState.Reconnecting:
          console.log('Reconnecting after connection loss...');
          break;
        case GraphQLConnectionState.Disconnected:
          console.log('Disconnected from server');
          break;
        case GraphQLConnectionState.Error:
          console.error('Connection error occurred');
          break;
      }
    };

    logConnection();
  }, [state]);

  return (
    <div className={`connection-status ${state.toLowerCase()}`}>
      Status: {state}
    </div>
  );
}
```

## License

MIT
