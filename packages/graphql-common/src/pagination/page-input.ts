/**
 * Input type for page-based pagination requests.
 * Properties: Page?: number, Length?: number.
 */
export class PageInput {
	public readonly Page?: number;
	public readonly Length?: number;
}

/**
 * Input type for cached page requests with request ID.
 * Properties: RequestID?: string, Page?: number, PageLength?: number.
 */
export class CachedPageInput {
	public readonly RequestID?: string;
	public readonly Page?: number;
	public readonly PageLength?: number;
}
