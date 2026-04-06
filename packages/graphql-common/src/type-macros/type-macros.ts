import type { ApolloQueryResult, FetchResult } from '@apollo/client/core';

export type TQueryResult<T>                    = ApolloQueryResult<T>;
export type TQueryResultPromise<T>             = Promise<TQueryResult<T>>;
export type TQueryNullableResult<T>            = ApolloQueryResult<T> | null;
export type TQueryNullableResultPromise<T>     = Promise<TQueryNullableResult<T>>;
export type TMutationResult<T>                 = FetchResult<T>;
export type TMutationResultPromise<T>          = Promise<TMutationResult<T>>;
export type TMutationNullableResult<T>         = FetchResult<T> | null;
export type TMutationNullableResultPromise<T>  = Promise<TMutationNullableResult<T>>;
export type TSubscriptionResult<T>             = FetchResult<T>;
export type TSubscriptionHandler<T>            = (result: TSubscriptionResult<T>) => Promise<void>;
