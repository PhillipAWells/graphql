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

## License

MIT
