import { describe, it, expect } from 'vitest';
import { GetPageEntries } from '../get-page-entries';

describe('GetPageEntries', () => {
	it('should return correct entries for first page', () => {
		const entries = [1, 2, 3, 4, 5];
		const result = GetPageEntries(entries, 1, 2);
		expect(result).toEqual([1, 2]);
	});

	it('should return correct entries for second page', () => {
		const entries = [1, 2, 3, 4, 5];
		const result = GetPageEntries(entries, 2, 2);
		expect(result).toEqual([3, 4]);
	});

	it('should return correct entries for last page', () => {
		const entries = [1, 2, 3, 4, 5];
		const result = GetPageEntries(entries, 3, 2);
		expect(result).toEqual([5]);
	});

	it('should return empty array when page exceeds available pages', () => {
		const entries = [1, 2, 3];
		const result = GetPageEntries(entries, 5, 2);
		expect(result).toEqual([]);
	});

	it('should return all entries when page is 1 and length is greater than array length', () => {
		const entries = [1, 2, 3];
		const result = GetPageEntries(entries, 1, 10);
		expect(result).toEqual([1, 2, 3]);
	});

	it('should handle empty array', () => {
		const entries: number[] = [];
		const result = GetPageEntries(entries, 1, 2);
		expect(result).toEqual([]);
	});

	it('should handle page=1 with length=1', () => {
		const entries = ['a', 'b', 'c'];
		const result = GetPageEntries(entries, 1, 1);
		expect(result).toEqual(['a']);
	});

	it('should handle generic type arrays', () => {
		interface Item { id: number; name: string }
		const entries: Item[] = [
			{ id: 1, name: 'first' },
			{ id: 2, name: 'second' },
			{ id: 3, name: 'third' },
		];
		const result = GetPageEntries(entries, 1, 2);
		expect(result).toEqual([
			{ id: 1, name: 'first' },
			{ id: 2, name: 'second' },
		]);
	});
});
