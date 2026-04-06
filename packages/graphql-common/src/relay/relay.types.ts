/**
 * Relay cursor-based pagination information.
 */
export interface IRelayPageInfo {
	/** Whether there is a next page. */
	HasNextPage: boolean;
	/** Whether there is a previous page. */
	HasPreviousPage: boolean;
	/** Cursor pointing to the first edge. */
	StartCursor: string | null;
	/** Cursor pointing to the last edge. */
	EndCursor: string | null;
}

/**
 * Relay edge: a node with its cursor.
 */
export interface IEdge<T> {
	/** The actual data node. */
	Node: T;
	/** Base64-encoded cursor for pagination. */
	Cursor: string;
}

/**
 * Relay connection: edges and page information.
 */
export interface IConnection<T> {
	/** Array of edges. */
	Edges: IEdge<T>[];
	/** Relay pagination information. */
	PageInfo: IRelayPageInfo;
}
