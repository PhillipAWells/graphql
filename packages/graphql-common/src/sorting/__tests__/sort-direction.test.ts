import { describe, it, expect } from 'vitest';
import { SortDirection } from '../sort-direction.enum';

describe('SortDirection', () => {
	it('should have Ascending enum value', () => {
		expect(SortDirection.Ascending).toBe('Ascending');
	});

	it('should have Descending enum value', () => {
		expect(SortDirection.Descending).toBe('Descending');
	});

	it('should have exactly two enum values', () => {
		const values = Object.values(SortDirection);
		expect(values).toHaveLength(2);
	});

	it('should support enum value comparisons', () => {
		const direction = SortDirection.Ascending;
		expect(direction).toBe(SortDirection.Ascending);
		expect(direction).not.toBe(SortDirection.Descending);
	});
});
