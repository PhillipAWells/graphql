import { describe, it, expect } from 'vitest';
import { CursorUtils } from '../cursor.utils';

describe('CursorUtils', () => {
	it('should encode cursor with id and timestamp', () => {
		const id = 'user-123';
		const timestamp = 1704067200000;
		const cursor = CursorUtils.encodeCursor(id, timestamp);

		expect(cursor).toBeTruthy();
		expect(typeof cursor).toBe('string');
	});

	it('should encode cursor with id and default timestamp', () => {
		const id = 'post-456';
		const cursor = CursorUtils.encodeCursor(id);

		expect(cursor).toBeTruthy();
		expect(typeof cursor).toBe('string');
	});

	it('should decode cursor correctly', () => {
		const id = 'item-789';
		const timestamp = 1704067200000;
		const cursor = CursorUtils.encodeCursor(id, timestamp);

		const decoded = CursorUtils.decodeCursor(cursor);
		expect(decoded.Id).toBe(id);
		expect(decoded.Timestamp).toBe(timestamp);
	});

	it('should perform roundtrip encoding and decoding', () => {
		const id = 'test-id-123';
		const timestamp = 1704067200000;
		const encoded = CursorUtils.encodeCursor(id, timestamp);
		const decoded = CursorUtils.decodeCursor(encoded);

		expect(decoded.Id).toBe(id);
		expect(decoded.Timestamp).toBe(timestamp);
	});

	it('should create cursor from node with Id property', () => {
		const node = { Id: 'node-id-456' };
		const cursor = CursorUtils.createCursor(node);

		expect(cursor).toBeTruthy();
		expect(typeof cursor).toBe('string');
	});

	it('should handle special characters in id', () => {
		const id = 'user_@special-123';
		const cursor = CursorUtils.encodeCursor(id);
		const decoded = CursorUtils.decodeCursor(cursor);

		expect(decoded.Id).toBe(id);
	});

	it('should produce valid base64 cursors', () => {
		const cursor = CursorUtils.encodeCursor('test-id');
		// Base64 should not throw when decoding
		expect(() => Buffer.from(cursor, 'base64').toString('utf-8')).not.toThrow();
	});

	it('should handle multiple ids without collision', () => {
		const cursor1 = CursorUtils.encodeCursor('id-1', 1000);
		const cursor2 = CursorUtils.encodeCursor('id-2', 1000);

		expect(cursor1).not.toBe(cursor2);

		const decoded1 = CursorUtils.decodeCursor(cursor1);
		const decoded2 = CursorUtils.decodeCursor(cursor2);

		expect(decoded1.Id).toBe('id-1');
		expect(decoded2.Id).toBe('id-2');
	});
});
