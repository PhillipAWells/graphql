export interface IPageInfo {
	Count: number;
	Page: number;
	PageLength: number;
	TotalPages: number;
}

export interface ICachedPageInfo extends IPageInfo {
	RequestID: string;
}

export interface ICachedRequest<T> {
	ID: string;
	Entries: T[];
	Expiration: Date;
}

export class PageInfo implements IPageInfo {
	public Count: number = 0;
	public Page: number = 0;
	public PageLength: number = 0;
	public TotalPages: number = 0;
}

export class CachedPageInfo implements ICachedPageInfo {
	public RequestID: string = '';
	public Count: number = 0;
	public Page: number = 0;
	public PageLength: number = 0;
	public TotalPages: number = 0;
	public ExpiresAt: Date = new Date();
}
