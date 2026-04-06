interface ICursorPayload {
	id: string;
	timestamp: number;
}

interface IDecodedCursor {
	Id: string;
	Timestamp: number;
}

/**
 * Utilities for encoding, decoding, and creating Relay cursors.
 */
export const CursorUtils = {
	/**
	 * Encode an ID and optional timestamp to a base64-encoded cursor.
	 * @param id - Item ID.
	 * @param timestamp - Optional timestamp (defaults to Date.now()).
	 * @returns Base64-encoded cursor string.
	 */
	encodeCursor(id: string, timestamp?: number): string {
		return Buffer.from(JSON.stringify({ id, timestamp: timestamp ?? Date.now() })).toString('base64');
	},
	/**
	 * Decode a base64-encoded cursor back to its ID and timestamp.
	 * @param cursor - Base64-encoded cursor string.
	 * @returns Object with Id and Timestamp properties.
	 * @throws Error if cursor is malformed.
	 */
	decodeCursor(cursor: string): IDecodedCursor {
		try {
			const Decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8')) as ICursorPayload;
			return { Id: Decoded.id, Timestamp: Decoded.timestamp };
		} catch {
			throw new Error(`Invalid cursor: ${cursor}`);
		}
	},
	/**
	 * Create a cursor from a node with an ID property.
	 * Convenience wrapper around encodeCursor.
	 * @param node - Object with Id property.
	 * @returns Base64-encoded cursor string.
	 */
	createCursor(node: { Id: string }): string {
		return CursorUtils.encodeCursor(node.Id);
	},
};
