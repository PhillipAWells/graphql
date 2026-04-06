export class PageInput {
	public readonly Page?: number;
	public readonly Length?: number;
}

export class CachedPageInput {
	public readonly RequestID?: string;
	public readonly Page?: number;
	public readonly PageLength?: number;
}
