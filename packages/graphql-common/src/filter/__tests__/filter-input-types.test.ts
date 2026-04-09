import { describe, it, expect } from 'vitest';
import { ObjectIdFilterInput } from '../object-id-filter-input.js';
import { StringFilterInput } from '../string-filter-input.js';
import { NumberFilterInput } from '../number-filter-input.js';
import { DateFilterInput } from '../date-filter-input.js';
import { ArrayFilterInput } from '../array-filter-input.js';
import { BooleanFilterInput } from '../boolean-filter-input.js';
import type { IFilterCondition } from '../filter-condition.type.js';

describe('Filter Input Types', () => {
	describe('ObjectIdFilterInput', () => {
		it('should create instance with Eq operator', () => {
			const filter = new ObjectIdFilterInput();
			expect(filter).toBeInstanceOf(ObjectIdFilterInput);
		});

		it('should support Eq operator', () => {
			const filter: IFilterCondition<ObjectIdFilterInput> = {
				Eq: '507f1f77bcf86cd799439011',
			};
			expect(filter.Eq).toBe('507f1f77bcf86cd799439011');
		});

		it('should support Ne operator', () => {
			const filter: IFilterCondition<ObjectIdFilterInput> = {
				Ne: '507f1f77bcf86cd799439011',
			};
			expect(filter.Ne).toBe('507f1f77bcf86cd799439011');
		});

		it('should support In operator', () => {
			const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
			const filter: IFilterCondition<ObjectIdFilterInput> = {
				In: ids,
			};
			expect(filter.In).toEqual(ids);
		});

		it('should support Nin operator', () => {
			const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
			const filter: IFilterCondition<ObjectIdFilterInput> = {
				Nin: ids,
			};
			expect(filter.Nin).toEqual(ids);
		});

		it('should support Exists operator', () => {
			const filter: IFilterCondition<ObjectIdFilterInput> = {
				Exists: true,
			};
			expect(filter.Exists).toBe(true);
		});

		it('should support And logical operator', () => {
			const filter: IFilterCondition<ObjectIdFilterInput> = {
				And: [
					{ Eq: '507f1f77bcf86cd799439011' },
					{ Ne: '507f1f77bcf86cd799439012' },
				],
			};
			expect(filter.And).toHaveLength(2);
			expect(filter.And?.[0].Eq).toBe('507f1f77bcf86cd799439011');
			expect(filter.And?.[1].Ne).toBe('507f1f77bcf86cd799439012');
		});

		it('should support Or logical operator', () => {
			const filter: IFilterCondition<ObjectIdFilterInput> = {
				Or: [
					{ Eq: '507f1f77bcf86cd799439011' },
					{ Exists: true },
				],
			};
			expect(filter.Or).toHaveLength(2);
			expect(filter.Or?.[0].Eq).toBe('507f1f77bcf86cd799439011');
			expect(filter.Or?.[1].Exists).toBe(true);
		});

		it('should support combining operators', () => {
			const filter: IFilterCondition<ObjectIdFilterInput> = {
				Eq: '507f1f77bcf86cd799439011',
				Exists: true,
			};
			expect(filter.Eq).toBe('507f1f77bcf86cd799439011');
			expect(filter.Exists).toBe(true);
		});
	});

	describe('StringFilterInput', () => {
		it('should create instance', () => {
			const filter = new StringFilterInput();
			expect(filter).toBeInstanceOf(StringFilterInput);
		});

		it('should support Eq operator', () => {
			const filter: IFilterCondition<StringFilterInput> = {
				Eq: 'test',
			};
			expect(filter.Eq).toBe('test');
		});

		it('should support Ne operator', () => {
			const filter: IFilterCondition<StringFilterInput> = {
				Ne: 'test',
			};
			expect(filter.Ne).toBe('test');
		});

		it('should support In operator', () => {
			const values = ['a', 'b', 'c'];
			const filter: IFilterCondition<StringFilterInput> = {
				In: values,
			};
			expect(filter.In).toEqual(values);
		});

		it('should support Nin operator', () => {
			const values = ['a', 'b', 'c'];
			const filter: IFilterCondition<StringFilterInput> = {
				Nin: values,
			};
			expect(filter.Nin).toEqual(values);
		});

		it('should support Regex operator', () => {
			const filter: IFilterCondition<StringFilterInput> = {
				Regex: '^prefix',
			};
			expect(filter.Regex).toBe('^prefix');
		});

		it('should support RegexOptions operator', () => {
			const filter: IFilterCondition<StringFilterInput> = {
				Regex: '^prefix',
				RegexOptions: 'i',
			};
			expect(filter.Regex).toBe('^prefix');
			expect(filter.RegexOptions).toBe('i');
		});

		it('should support Exists operator', () => {
			const filter: IFilterCondition<StringFilterInput> = {
				Exists: true,
			};
			expect(filter.Exists).toBe(true);
		});

		it('should support logical And', () => {
			const filter: IFilterCondition<StringFilterInput> = {
				And: [
					{ Eq: 'value1' },
					{ Ne: 'value2' },
				],
			};
			expect(filter.And).toHaveLength(2);
		});

		it('should support logical Or', () => {
			const filter: IFilterCondition<StringFilterInput> = {
				Or: [
					{ Regex: '^a' },
					{ Regex: '^b' },
				],
			};
			expect(filter.Or).toHaveLength(2);
		});
	});

	describe('NumberFilterInput', () => {
		it('should create instance', () => {
			const filter = new NumberFilterInput();
			expect(filter).toBeInstanceOf(NumberFilterInput);
		});

		it('should support Eq operator', () => {
			const filter: IFilterCondition<NumberFilterInput> = {
				Eq: 42,
			};
			expect(filter.Eq).toBe(42);
		});

		it('should support Ne operator', () => {
			const filter: IFilterCondition<NumberFilterInput> = {
				Ne: 42,
			};
			expect(filter.Ne).toBe(42);
		});

		it('should support Lt operator', () => {
			const filter: IFilterCondition<NumberFilterInput> = {
				Lt: 100,
			};
			expect(filter.Lt).toBe(100);
		});

		it('should support Lte operator', () => {
			const filter: IFilterCondition<NumberFilterInput> = {
				Lte: 100,
			};
			expect(filter.Lte).toBe(100);
		});

		it('should support Gt operator', () => {
			const filter: IFilterCondition<NumberFilterInput> = {
				Gt: 50,
			};
			expect(filter.Gt).toBe(50);
		});

		it('should support Gte operator', () => {
			const filter: IFilterCondition<NumberFilterInput> = {
				Gte: 50,
			};
			expect(filter.Gte).toBe(50);
		});

		it('should support In operator', () => {
			const values = [1, 2, 3];
			const filter: IFilterCondition<NumberFilterInput> = {
				In: values,
			};
			expect(filter.In).toEqual(values);
		});

		it('should support Nin operator', () => {
			const values = [1, 2, 3];
			const filter: IFilterCondition<NumberFilterInput> = {
				Nin: values,
			};
			expect(filter.Nin).toEqual(values);
		});

		it('should support Exists operator', () => {
			const filter: IFilterCondition<NumberFilterInput> = {
				Exists: true,
			};
			expect(filter.Exists).toBe(true);
		});

		it('should support combining range operators', () => {
			const filter: IFilterCondition<NumberFilterInput> = {
				Gte: 10,
				Lte: 100,
			};
			expect(filter.Gte).toBe(10);
			expect(filter.Lte).toBe(100);
		});

		it('should support logical operators', () => {
			const filter: IFilterCondition<NumberFilterInput> = {
				And: [
					{ Gte: 10 },
					{ Lte: 100 },
				],
			};
			expect(filter.And).toHaveLength(2);
		});
	});

	describe('DateFilterInput', () => {
		it('should create instance', () => {
			const filter = new DateFilterInput();
			expect(filter).toBeInstanceOf(DateFilterInput);
		});

		it('should support Eq operator with ISO date string', () => {
			const date = '2024-01-01T00:00:00Z';
			const filter: IFilterCondition<DateFilterInput> = {
				Eq: date,
			};
			expect(filter.Eq).toBe(date);
		});

		it('should support Ne operator', () => {
			const date = '2024-01-01T00:00:00Z';
			const filter: IFilterCondition<DateFilterInput> = {
				Ne: date,
			};
			expect(filter.Ne).toBe(date);
		});

		it('should support Lt operator', () => {
			const date = '2024-12-31T23:59:59Z';
			const filter: IFilterCondition<DateFilterInput> = {
				Lt: date,
			};
			expect(filter.Lt).toBe(date);
		});

		it('should support Lte operator', () => {
			const date = '2024-12-31T23:59:59Z';
			const filter: IFilterCondition<DateFilterInput> = {
				Lte: date,
			};
			expect(filter.Lte).toBe(date);
		});

		it('should support Gt operator', () => {
			const date = '2024-01-01T00:00:00Z';
			const filter: IFilterCondition<DateFilterInput> = {
				Gt: date,
			};
			expect(filter.Gt).toBe(date);
		});

		it('should support Gte operator', () => {
			const date = '2024-01-01T00:00:00Z';
			const filter: IFilterCondition<DateFilterInput> = {
				Gte: date,
			};
			expect(filter.Gte).toBe(date);
		});

		it('should support In operator', () => {
			const dates = ['2024-01-01T00:00:00Z', '2024-06-01T00:00:00Z'];
			const filter: IFilterCondition<DateFilterInput> = {
				In: dates,
			};
			expect(filter.In).toEqual(dates);
		});

		it('should support Nin operator', () => {
			const dates = ['2024-01-01T00:00:00Z', '2024-06-01T00:00:00Z'];
			const filter: IFilterCondition<DateFilterInput> = {
				Nin: dates,
			};
			expect(filter.Nin).toEqual(dates);
		});

		it('should support Exists operator', () => {
			const filter: IFilterCondition<DateFilterInput> = {
				Exists: true,
			};
			expect(filter.Exists).toBe(true);
		});

		it('should support date range queries', () => {
			const filter: IFilterCondition<DateFilterInput> = {
				Gte: '2024-01-01T00:00:00Z',
				Lte: '2024-12-31T23:59:59Z',
			};
			expect(filter.Gte).toBe('2024-01-01T00:00:00Z');
			expect(filter.Lte).toBe('2024-12-31T23:59:59Z');
		});
	});

	describe('ArrayFilterInput', () => {
		it('should create instance', () => {
			const filter = new ArrayFilterInput();
			expect(filter).toBeInstanceOf(ArrayFilterInput);
		});

		it('should support All operator', () => {
			const filter: IFilterCondition<ArrayFilterInput> = {
				All: ['a', 'b', 'c'],
			};
			expect(filter.All).toEqual(['a', 'b', 'c']);
		});

		it('should support Size operator', () => {
			const filter: IFilterCondition<ArrayFilterInput> = {
				Size: 3,
			};
			expect(filter.Size).toBe(3);
		});

		it('should support ElemMatch operator', () => {
			const filter: IFilterCondition<ArrayFilterInput> = {
				ElemMatch: { Eq: 'value' },
			};
			expect(filter.ElemMatch).toEqual({ Eq: 'value' });
		});

		it('should support Exists operator', () => {
			const filter: IFilterCondition<ArrayFilterInput> = {
				Exists: true,
			};
			expect(filter.Exists).toBe(true);
		});

		it('should support combining array operators', () => {
			const filter: IFilterCondition<ArrayFilterInput> = {
				Size: 5,
				All: ['x', 'y', 'z'],
			};
			expect(filter.Size).toBe(5);
			expect(filter.All).toEqual(['x', 'y', 'z']);
		});

		it('should support logical And with array operators', () => {
			const filter: IFilterCondition<ArrayFilterInput> = {
				And: [
					{ Size: 5 },
					{ All: ['x', 'y'] },
				],
			};
			expect(filter.And).toHaveLength(2);
		});

		it('should support logical Or with array operators', () => {
			const filter: IFilterCondition<ArrayFilterInput> = {
				Or: [
					{ Size: 1 },
					{ Size: 10 },
				],
			};
			expect(filter.Or).toHaveLength(2);
		});
	});

	describe('BooleanFilterInput', () => {
		it('should create instance', () => {
			const filter = new BooleanFilterInput();
			expect(filter).toBeInstanceOf(BooleanFilterInput);
		});

		it('should support Eq operator with true', () => {
			const filter: IFilterCondition<BooleanFilterInput> = {
				Eq: true,
			};
			expect(filter.Eq).toBe(true);
		});

		it('should support Eq operator with false', () => {
			const filter: IFilterCondition<BooleanFilterInput> = {
				Eq: false,
			};
			expect(filter.Eq).toBe(false);
		});

		it('should support Ne operator', () => {
			const filter: IFilterCondition<BooleanFilterInput> = {
				Ne: true,
			};
			expect(filter.Ne).toBe(true);
		});

		it('should support Exists operator', () => {
			const filter: IFilterCondition<BooleanFilterInput> = {
				Exists: true,
			};
			expect(filter.Exists).toBe(true);
		});

		it('should support logical And', () => {
			const filter: IFilterCondition<BooleanFilterInput> = {
				And: [
					{ Eq: true },
					{ Exists: true },
				],
			};
			expect(filter.And).toHaveLength(2);
		});

		it('should support logical Or', () => {
			const filter: IFilterCondition<BooleanFilterInput> = {
				Or: [
					{ Eq: true },
					{ Eq: false },
				],
			};
			expect(filter.Or).toHaveLength(2);
		});
	});

	describe('Complex nested filter conditions', () => {
		it('should support nested AND/OR combinations', () => {
			const filter: IFilterCondition<StringFilterInput> = {
				Or: [
					{
						And: [
							{ Eq: 'a' },
							{ Ne: 'b' },
						],
					},
					{
						Regex: '^prefix',
					},
				],
			};
			expect(filter.Or).toHaveLength(2);
			expect(filter.Or?.[0].And).toHaveLength(2);
		});

		it('should support mixed filter types in And conditions', () => {
			const filter: IFilterCondition<NumberFilterInput> = {
				And: [
					{ Gte: 10 },
					{ Lte: 100 },
					{ Exists: true },
				],
			};
			expect(filter.And).toHaveLength(3);
		});

		it('should support deeply nested logical operators', () => {
			const filter: IFilterCondition<StringFilterInput> = {
				And: [
					{
						Or: [
							{ Eq: 'a' },
							{ Eq: 'b' },
						],
					},
					{
						And: [
							{ Regex: '^test' },
							{ Exists: true },
						],
					},
				],
			};
			expect(filter.And).toHaveLength(2);
			expect(filter.And?.[0].Or).toHaveLength(2);
			expect(filter.And?.[1].And).toHaveLength(2);
		});
	});

	describe('Type instantiation', () => {
		it('should be able to instantiate all filter types', () => {
			expect(new ObjectIdFilterInput()).toBeInstanceOf(ObjectIdFilterInput);
			expect(new StringFilterInput()).toBeInstanceOf(StringFilterInput);
			expect(new NumberFilterInput()).toBeInstanceOf(NumberFilterInput);
			expect(new DateFilterInput()).toBeInstanceOf(DateFilterInput);
			expect(new ArrayFilterInput()).toBeInstanceOf(ArrayFilterInput);
			expect(new BooleanFilterInput()).toBeInstanceOf(BooleanFilterInput);
		});

		it('should be usable as GraphQL input types', () => {
			const filters = {
				string: { Eq: 'test' } as IFilterCondition<StringFilterInput>,
				number: { Gte: 10 } as IFilterCondition<NumberFilterInput>,
				date: { Gte: '2024-01-01T00:00:00Z' } as IFilterCondition<DateFilterInput>,
				objectId: { Eq: '507f1f77bcf86cd799439011' } as IFilterCondition<ObjectIdFilterInput>,
				array: { Size: 5 } as IFilterCondition<ArrayFilterInput>,
				boolean: { Eq: true } as IFilterCondition<BooleanFilterInput>,
			};

			expect(filters.string.Eq).toBe('test');
			expect(filters.number.Gte).toBe(10);
			expect(filters.date.Gte).toBe('2024-01-01T00:00:00Z');
			expect(filters.objectId.Eq).toBe('507f1f77bcf86cd799439011');
			expect(filters.array.Size).toBe(5);
			expect(filters.boolean.Eq).toBe(true);
		});
	});
});
