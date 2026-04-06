export interface IPageInfo {
	Count: number;
	Page: number;
	PageLength: number;
	TotalPages: number;
}

export interface ICachedPageInfo extends IPageInfo {
	RequestID: string;
	ExpiresAt: Date;
}

export interface ICachedRequest<T> {
	ID: string;
	Entries: T[];
	Expiration: Date;
}

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
