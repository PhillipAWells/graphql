/**
 * Page information for pagination (count-based).
 */
export interface IPageInfo {
	/** Total number of items. */
	Count: number;
	/** Current page number (1-based). */
	Page: number;
	/** Number of items per page. */
	PageLength: number;
	/** Total number of pages. */
	TotalPages: number;
}

/**
 * Page information with cache metadata.
 * Extends IPageInfo with request ID and expiration time.
 */
export interface ICachedPageInfo extends IPageInfo {
	/** Unique ID for the cached request. */
	RequestID: string;
	/** When this cached page expires. */
	ExpiresAt: Date;
}

/**
 * Cached page request with entries and expiration.
 */
export interface ICachedRequest<T> {
	/** Request ID for cache lookup. */
	Id: string;
	/** Array of cached entries. */
	Entries: T[];
	/** Expiration time for this cached request. */
	Expiration: Date;
}

/**
 * Implementation of IPageInfo.
 * Constructor parameters: count?, page?, pageLength?, totalPages? (all optional, default 0).
 */
export class PageInfo implements IPageInfo {
	public readonly Count: number;
	public readonly Page: number;
	public readonly PageLength: number;
	public readonly TotalPages: number;

	constructor(count: number = 0, page: number = 0, pageLength: number = 0, totalPages: number = 0) {
		this.Count = count;
		this.Page = page;
		this.PageLength = pageLength;
		this.TotalPages = totalPages;
	}
}

/**
 * Implementation of ICachedPageInfo.
 * Constructor parameters: requestId, count?, page?, pageLength?, totalPages?, expiresAt?.
 */
export class CachedPageInfo implements ICachedPageInfo {
	public readonly RequestID: string;
	public readonly Count: number;
	public readonly Page: number;
	public readonly PageLength: number;
	public readonly TotalPages: number;
	public readonly ExpiresAt: Date;

	constructor(requestId: string = '', count: number = 0, page: number = 0, pageLength: number = 0, totalPages: number = 0, expiresAt: Date = new Date()) {
		this.RequestID = requestId;
		this.Count = count;
		this.Page = page;
		this.PageLength = pageLength;
		this.TotalPages = totalPages;
		this.ExpiresAt = expiresAt;
	}
}
