export interface IRelayPageInfo {
	HasNextPage: boolean;
	HasPreviousPage: boolean;
	StartCursor: string | null;
	EndCursor: string | null;
}

export interface IEdge<T> {
	Node: T;
	Cursor: string;
}

export interface IConnection<T> {
	Edges: IEdge<T>[];
	PageInfo: IRelayPageInfo;
}
