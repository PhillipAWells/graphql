interface ICursorPayload {
	id: string;
	timestamp: number;
}

interface IDecodedCursor {
	Id: string;
	Timestamp: number;
}

export const CursorUtils = {
	encodeCursor(id: string, timestamp?: number): string {
		return Buffer.from(JSON.stringify({ id, timestamp: timestamp ?? Date.now() })).toString('base64');
	},
	decodeCursor(cursor: string): IDecodedCursor {
		try {
			const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8')) as ICursorPayload;
			return { Id: decoded.id, Timestamp: decoded.timestamp };
		} catch {
			throw new Error(`Invalid cursor: ${cursor}`);
		}
	},
	createCursor(node: { Id: string }): string {
		return CursorUtils.encodeCursor(node.Id);
	},
};
