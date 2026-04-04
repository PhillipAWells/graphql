export const CursorUtils = {
	EncodeCursor(id: string, timestamp?: number): string {
		return Buffer.from(JSON.stringify({ id, timestamp: timestamp ?? Date.now() })).toString('base64');
	},
	DecodeCursor(cursor: string): { Id: string; Timestamp: number } {
		const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8')) as { id: string; timestamp: number };
		return { Id: decoded.id, Timestamp: decoded.timestamp };
	},
	CreateCursor(node: { Id: string }): string {
		return CursorUtils.EncodeCursor(node.Id);
	},
};
