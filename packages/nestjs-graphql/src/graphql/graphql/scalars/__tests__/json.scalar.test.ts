import { describe, it, expect, beforeEach } from 'vitest';
import { Kind } from 'graphql';
import { JSONScalar } from '../json.scalar.js';

describe('JSONScalar', () => {
	let Scalar: JSONScalar;

	beforeEach(() => {
		Scalar = new JSONScalar();
	});

	describe('parseValue', () => {
		it('should return the value as-is', () => {
			const Value = { test: 'data' };
			expect(Scalar.parseValue(Value)).toBe(Value);
		});

		it('should handle primitives', () => {
			expect(Scalar.parseValue('string')).toBe('string');
			expect(Scalar.parseValue(123)).toBe(123);
			expect(Scalar.parseValue(true)).toBe(true);
			expect(Scalar.parseValue(null)).toBe(null);
		});

		it('should handle objects and arrays', () => {
			const Obj = { nested: { value: 1 } };
			const Arr = [1, 2, 3];
			expect(Scalar.parseValue(Obj)).toBe(Obj);
			expect(Scalar.parseValue(Arr)).toBe(Arr);
		});
	});

	describe('serialize', () => {
		it('should return the value as-is', () => {
			const Value = { test: 'data' };
			expect(Scalar.serialize(Value)).toBe(Value);
		});

		it('should handle primitives', () => {
			expect(Scalar.serialize('string')).toBe('string');
			expect(Scalar.serialize(123)).toBe(123);
			expect(Scalar.serialize(true)).toBe(true);
			expect(Scalar.serialize(null)).toBe(null);
		});
	});

	describe('parseLiteral', () => {
		it('should handle STRING kind', () => {
			const Ast = {
				kind: Kind.STRING,
				value: 'test string',
			};
			expect(Scalar.parseLiteral(Ast as any)).toBe('test string');
		});

		it('should handle INT kind', () => {
			const Ast = {
				kind: Kind.INT,
				value: '42',
			};
			expect(Scalar.parseLiteral(Ast as any)).toBe(42);
		});

		it('should handle FLOAT kind', () => {
			const Ast = {
				kind: Kind.FLOAT,
				value: '3.14',
			};
			expect(Scalar.parseLiteral(Ast as any)).toBe(3.14);
		});

		it('should handle BOOLEAN kind', () => {
			const AstTrue = {
				kind: Kind.BOOLEAN,
				value: true,
			};
			const AstFalse = {
				kind: Kind.BOOLEAN,
				value: false,
			};
			expect(Scalar.parseLiteral(AstTrue as any)).toBe(true);
			expect(Scalar.parseLiteral(AstFalse as any)).toBe(false);
		});

		it('should handle NULL kind', () => {
			const Ast = {
				kind: Kind.NULL,
			};
			expect(Scalar.parseLiteral(Ast as any)).toBe(null);
		});

		it('should handle LIST kind', () => {
			const Ast = {
				kind: Kind.LIST,
				values: [
					{ kind: Kind.INT, value: '1' },
					{ kind: Kind.INT, value: '2' },
					{ kind: Kind.INT, value: '3' },
				],
			};
			expect(Scalar.parseLiteral(Ast as any)).toEqual([1, 2, 3]);
		});

		it('should handle nested LIST', () => {
			const Ast = {
				kind: Kind.LIST,
				values: [
					{
						kind: Kind.LIST,
						values: [
							{ kind: Kind.INT, value: '1' },
							{ kind: Kind.INT, value: '2' },
						],
					},
					{ kind: Kind.INT, value: '3' },
				],
			};
			expect(Scalar.parseLiteral(Ast as any)).toEqual([[1, 2], 3]);
		});

		it('should handle OBJECT kind', () => {
			const Ast = {
				kind: Kind.OBJECT,
				fields: [
					{
						name: { value: 'field1' },
						value: { kind: Kind.STRING, value: 'value1' },
					},
					{
						name: { value: 'field2' },
						value: { kind: Kind.INT, value: '42' },
					},
				],
			};
			const Result = Scalar.parseLiteral(Ast as any);
			expect(Result).toEqual({
				field1: 'value1',
				field2: 42,
			});
		});

		it('should handle nested OBJECT', () => {
			const Ast = {
				kind: Kind.OBJECT,
				fields: [
					{
						name: { value: 'nested' },
						value: {
							kind: Kind.OBJECT,
							fields: [
								{
									name: { value: 'innerField' },
									value: { kind: Kind.STRING, value: 'innerValue' },
								},
							],
						},
					},
				],
			};
			const Result = Scalar.parseLiteral(Ast as any);
			expect(Result).toEqual({
				nested: {
					innerField: 'innerValue',
				},
			});
		});

		it('should throw error for unsupported kind', () => {
			const Ast = {
				kind: 'UNSUPPORTED_KIND',
			};
			expect(() => Scalar.parseLiteral(Ast as any)).toThrow('Unsupported JSON literal kind');
		});

		it('should handle empty OBJECT', () => {
			const Ast = {
				kind: Kind.OBJECT,
				fields: [],
			};
			expect(Scalar.parseLiteral(Ast as any)).toEqual({});
		});

		it('should handle empty LIST', () => {
			const Ast = {
				kind: Kind.LIST,
				values: [],
			};
			expect(Scalar.parseLiteral(Ast as any)).toEqual([]);
		});

		it('should handle OBJECT with mixed value types', () => {
			const Ast = {
				kind: Kind.OBJECT,
				fields: [
					{
						name: { value: 'string' },
						value: { kind: Kind.STRING, value: 'text' },
					},
					{
						name: { value: 'number' },
						value: { kind: Kind.INT, value: '100' },
					},
					{
						name: { value: 'bool' },
						value: { kind: Kind.BOOLEAN, value: true },
					},
					{
						name: { value: 'null' },
						value: { kind: Kind.NULL },
					},
				],
			};
			const Result = Scalar.parseLiteral(Ast as any);
			expect(Result).toEqual({
				string: 'text',
				number: 100,
				bool: true,
				null: null,
			});
		});
	});
});
