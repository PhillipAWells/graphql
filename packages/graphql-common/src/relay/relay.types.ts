export interface RelayPageInfo {
	HasNextPage: boolean;
	HasPreviousPage: boolean;
	StartCursor: string | null;
	EndCursor: string | null;
}

export interface Edge<T> {
	Node: T;
	Cursor: string;
}

export interface Connection<T> {
	Edges: Edge<T>[];
	PageInfo: RelayPageInfo;
}
