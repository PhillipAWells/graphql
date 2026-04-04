# @pawells/ngx-graphql

Angular reactive Apollo + graphql-ws client base class for GraphQL applications.

## Installation

```bash
npm install @pawells/ngx-graphql @apollo/client graphql-ws rxjs
# or
yarn add @pawells/ngx-graphql @apollo/client graphql-ws rxjs
```

## Features

- **Reactive Apollo Client** — Angular signals-based Apollo client wrapper
- **WebSocket Support** — graphql-ws integration for real-time subscriptions
- **Connection State Management** — Track connection lifecycle with built-in state machine
- **Error Handling** — Configurable GraphQL and network error logging
- **Automatic Retry** — Exponential backoff retry strategy (1s-10s, max 10 attempts)
- **Token Management** — Automatic JWT token injection in headers
- **Ping/Pong Timeout** — Detect stale WebSocket connections

## Usage

```typescript
import { Component, OnInit } from '@angular/core';
import { GraphQLClient } from '@pawells/ngx-graphql';

@Component({
  selector: 'app-root',
  template: `<div>{{ connectionState() }}</div>`,
})
export class AppComponent implements OnInit {
  constructor(private graphql: GraphQLClient) {}

  ngOnInit() {
    // Configure the client
    this.graphql.Name.set('MyGraphQLClient');
    this.graphql.HTTP_URI.set('http://localhost:4000/graphql');
    this.graphql.WS_URI.set('ws://localhost:4000/graphql');
    this.graphql.Token.set('your-jwt-token');

    // Enable error logging
    this.graphql.LogGraphQLErrors.set(true);
    this.graphql.LogNetworkErrors.set(true);

    // Listen to connection state changes
    this.graphql.OnConnectionState.subscribe((event) => {
      console.log('Connection state:', event.State);
    });

    // Get the Apollo client once it's ready
    const apollo = this.graphql.Apollo();
    if (apollo) {
      // Use Apollo client for queries, mutations, subscriptions
    }
  }

  connectionState() {
    return this.graphql.ConnectionState();
  }

  reset() {
    this.graphql.Reset();
  }
}
```

## API

### Signals

- **`Apollo`** — ApolloClient instance (undefined until Setup completes)
- **`Name`** — Client name for identification
- **`HTTP_URI`** — GraphQL HTTP endpoint URI
- **`WS_URI`** — GraphQL WebSocket endpoint URI
- **`Token`** — JWT authentication token
- **`LogGraphQLErrors`** — Enable GraphQL error logging
- **`LogNetworkErrors`** — Enable network error logging
- **`ConnectionState`** — Current WebSocket connection state

### Methods

- **`Reset()`** — Reset the Apollo client and reconnect

### Subjects

- **`OnConnectionState`** — RxJS Subject that emits connection state changes

## Connection States

- `Connecting` — WebSocket is connecting
- `Opened` — WebSocket connection opened
- `Connected` — GraphQL subscription ready
- `Closed` — WebSocket connection closed
- `Error` — Connection error occurred

## Link Chain

The client builds an Apollo link chain in this order:

1. **ErrorLink** — Logs GraphQL and network errors (if enabled)
2. **RetryLink** — Retries failed operations (exponential backoff, max 10 attempts)
3. **AuthLink** — Injects Authorization header with Bearer token
4. **Split** — Routes subscriptions to WebSocket, queries/mutations to HTTP

## Requirements

- Angular 17+
- RxJS 7+
- Apollo Client 3+
- graphql-ws 5+

## License

MIT
