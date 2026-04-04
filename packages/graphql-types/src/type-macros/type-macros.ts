import type { ApolloQueryResult, FetchResult } from '@apollo/client/core';

export type QueryResult<T>                    = ApolloQueryResult<T>;
export type QueryResultPromise<T>             = Promise<QueryResult<T>>;
export type QueryNullableResult<T>            = ApolloQueryResult<T> | null;
export type QueryNullableResultPromise<T>     = Promise<QueryNullableResult<T>>;
export type MutationResult<T>                 = FetchResult<T>;
export type MutationResultPromise<T>          = Promise<MutationResult<T>>;
export type MutationNullableResult<T>         = FetchResult<T> | null;
export type MutationNullableResultPromise<T>  = Promise<MutationNullableResult<T>>;
export type SubscriptionResult<T>             = FetchResult<T>;
export type SubscriptionHandler<T>            = (result: SubscriptionResult<T>) => Promise<void>;
