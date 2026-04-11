import { describe, it, expect } from 'vitest';
import {
	GetFieldComplexityWeight,
	CalculateListComplexity,
	CalculateNestedComplexity,
	CalculateConnectionComplexity,
	ValidateComplexityConfig,
	CreateComplexityConfig,
	COMPLEXITY_WEIGHTS,
	DEFAULT_COMPLEXITY_RULES,
	FIELD_COMPLEXITY_RULES,
} from '../complexity-rules.js';
import type { IComplexityConfig } from '../query-complexity.js';

describe('Complexity Rules', () => {
	describe('GetFieldComplexityWeight', () => {
		it('should return field-specific weight for known type and field', () => {
			const weight = GetFieldComplexityWeight('user', 'profile');
			expect(weight).toBe(COMPLEXITY_WEIGHTS.OBJECT_FIELD);
		});

		it('should return simple field weight for unknown field', () => {
			const weight = GetFieldComplexityWeight('user', 'unknownField');
			expect(weight).toBe(COMPLEXITY_WEIGHTS.SIMPLE_FIELD);
		});

		it('should return simple field weight for unknown type', () => {
			const weight = GetFieldComplexityWeight('unknownType' as any, 'field');
			expect(weight).toBe(COMPLEXITY_WEIGHTS.SIMPLE_FIELD);
		});

		it('should return correct weights for all product fields', () => {
			expect(GetFieldComplexityWeight('product', 'details')).toBe(COMPLEXITY_WEIGHTS.OBJECT_FIELD);
			expect(GetFieldComplexityWeight('product', 'reviews')).toBe(COMPLEXITY_WEIGHTS.LIST_ITEM);
			expect(GetFieldComplexityWeight('product', 'related')).toBe(COMPLEXITY_WEIGHTS.LIST_ITEM);
		});

		it('should return correct weights for all order fields', () => {
			expect(GetFieldComplexityWeight('order', 'items')).toBe(COMPLEXITY_WEIGHTS.LIST_ITEM);
			expect(GetFieldComplexityWeight('order', 'history')).toBe(COMPLEXITY_WEIGHTS.LIST_ITEM);
			expect(GetFieldComplexityWeight('order', 'customer')).toBe(COMPLEXITY_WEIGHTS.OBJECT_FIELD);
		});

		it('should return correct weights for all comment fields', () => {
			expect(GetFieldComplexityWeight('comment', 'replies')).toBe(COMPLEXITY_WEIGHTS.LIST_ITEM);
			expect(GetFieldComplexityWeight('comment', 'author')).toBe(COMPLEXITY_WEIGHTS.OBJECT_FIELD);
			expect(GetFieldComplexityWeight('comment', 'post')).toBe(COMPLEXITY_WEIGHTS.OBJECT_FIELD);
		});

		it('should return correct weights for all tag fields', () => {
			expect(GetFieldComplexityWeight('tag', 'posts')).toBe(COMPLEXITY_WEIGHTS.LIST_ITEM);
			expect(GetFieldComplexityWeight('tag', 'related')).toBe(COMPLEXITY_WEIGHTS.LIST_ITEM);
		});
	});

	describe('CalculateListComplexity', () => {
		it('should calculate list complexity with default estimated items', () => {
			const complexity = CalculateListComplexity(5);
			expect(complexity).toBeGreaterThan(5);
		});

		it('should multiply by list multiplier', () => {
			const baseComplexity = 10;
			const items = 20;
			const complexity = CalculateListComplexity(baseComplexity, items);
			const expectedListMultiplier = DEFAULT_COMPLEXITY_RULES.multipliers?.list ?? 1;
			const expected = baseComplexity + (items * expectedListMultiplier);
			expect(complexity).toBe(expected);
		});

		it('should handle zero items', () => {
			const complexity = CalculateListComplexity(5, 0);
			expect(complexity).toBe(5);
		});

		it('should handle one item', () => {
			const baseComplexity = 3;
			const complexity = CalculateListComplexity(baseComplexity, 1);
			const listMultiplier = DEFAULT_COMPLEXITY_RULES.multipliers?.list ?? 1;
			expect(complexity).toBe(baseComplexity + listMultiplier);
		});

		it('should handle large item counts', () => {
			const complexity = CalculateListComplexity(1, 10000);
			expect(complexity).toBeGreaterThan(1000);
		});

		it('should use custom config multiplier', () => {
			const customConfig: IComplexityConfig = {
				...DEFAULT_COMPLEXITY_RULES,
				multipliers: { ...DEFAULT_COMPLEXITY_RULES.multipliers, list: 5 },
			};
			const complexity = CalculateListComplexity(10, 10, customConfig);
			expect(complexity).toBe(10 + (10 * 5));
		});
	});

	describe('CalculateNestedComplexity', () => {
		it('should apply exponential depth multiplier', () => {
			const baseComplexity = 10;
			const depth = 2;
			const complexity = CalculateNestedComplexity(baseComplexity, depth);
			const depthMultiplier = DEFAULT_COMPLEXITY_RULES.multipliers?.depth ?? 2;
			const expected = baseComplexity * Math.pow(depthMultiplier, depth);
			expect(complexity).toBe(expected);
		});

		it('should return base complexity at depth 0', () => {
			const baseComplexity = 15;
			const complexity = CalculateNestedComplexity(baseComplexity, 0);
			expect(complexity).toBe(baseComplexity);
		});

		it('should double at depth 1 with default multiplier', () => {
			const baseComplexity = 5;
			const complexity = CalculateNestedComplexity(baseComplexity, 1);
			const depthMultiplier = DEFAULT_COMPLEXITY_RULES.multipliers?.depth ?? 2;
			expect(complexity).toBe(baseComplexity * depthMultiplier);
		});

		it('should exponentially increase with depth', () => {
			const baseComplexity = 1;
			const depth1 = CalculateNestedComplexity(baseComplexity, 1);
			const depth2 = CalculateNestedComplexity(baseComplexity, 2);
			const depth3 = CalculateNestedComplexity(baseComplexity, 3);
			expect(depth2).toBeGreaterThan(depth1);
			expect(depth3).toBeGreaterThan(depth2);
		});

		it('should handle large depths', () => {
			const complexity = CalculateNestedComplexity(1, 10);
			expect(complexity).toBeGreaterThan(100);
		});

		it('should use custom depth multiplier', () => {
			const customConfig: IComplexityConfig = {
				...DEFAULT_COMPLEXITY_RULES,
				multipliers: { ...DEFAULT_COMPLEXITY_RULES.multipliers, depth: 3 },
			};
			const complexity = CalculateNestedComplexity(2, 2, customConfig);
			expect(complexity).toBe(2 * Math.pow(3, 2));
		});
	});

	describe('CalculateConnectionComplexity', () => {
		it('should include connection base weight', () => {
			const complexity = CalculateConnectionComplexity(5, 10);
			expect(complexity).toBeGreaterThan(COMPLEXITY_WEIGHTS.CONNECTION);
		});

		it('should add base complexity and list calculation', () => {
			const baseComplexity = 5;
			const first = 20;
			const complexity = CalculateConnectionComplexity(baseComplexity, first);
			const listComplexity = CalculateListComplexity(baseComplexity, first);
			const expected = COMPLEXITY_WEIGHTS.CONNECTION + listComplexity;
			expect(complexity).toBe(expected);
		});

		it('should use default items when not specified', () => {
			const baseComplexity = 5;
			const complexity = CalculateConnectionComplexity(baseComplexity);
			expect(complexity).toBeGreaterThan(COMPLEXITY_WEIGHTS.CONNECTION);
		});

		it('should handle zero items', () => {
			const baseComplexity = 5;
			const complexity = CalculateConnectionComplexity(baseComplexity, 0);
			expect(complexity).toBe(COMPLEXITY_WEIGHTS.CONNECTION + baseComplexity);
		});

		it('should handle large result sets', () => {
			const complexity = CalculateConnectionComplexity(5, 1000);
			expect(complexity).toBeGreaterThan(1000);
		});

		it('should use custom config', () => {
			const customConfig: IComplexityConfig = {
				...DEFAULT_COMPLEXITY_RULES,
				multipliers: { ...DEFAULT_COMPLEXITY_RULES.multipliers, list: 10 },
			};
			const baseComplexity = 5;
			const first = 10;
			const complexity = CalculateConnectionComplexity(baseComplexity, first, customConfig);
			const listComplexity = CalculateListComplexity(baseComplexity, first, customConfig);
			expect(complexity).toBe(COMPLEXITY_WEIGHTS.CONNECTION + listComplexity);
		});
	});

	describe('ValidateComplexityConfig', () => {
		it('should validate default config', () => {
			const isValid = ValidateComplexityConfig(DEFAULT_COMPLEXITY_RULES);
			expect(isValid).toBe(true);
		});

		it('should reject config with depth multiplier < 1', () => {
			const invalidConfig: IComplexityConfig = {
				...DEFAULT_COMPLEXITY_RULES,
				multipliers: { ...DEFAULT_COMPLEXITY_RULES.multipliers, depth: 0.5 },
			};
			const isValid = ValidateComplexityConfig(invalidConfig);
			expect(isValid).toBe(false);
		});

		it('should reject config with list multiplier < 1', () => {
			const invalidConfig: IComplexityConfig = {
				...DEFAULT_COMPLEXITY_RULES,
				multipliers: { ...DEFAULT_COMPLEXITY_RULES.multipliers, list: 0.5 },
			};
			const isValid = ValidateComplexityConfig(invalidConfig);
			expect(isValid).toBe(false);
		});

		it('should reject config with maxComplexity < 1', () => {
			const invalidConfig: IComplexityConfig = {
				...DEFAULT_COMPLEXITY_RULES,
				limits: { ...DEFAULT_COMPLEXITY_RULES.limits, maxComplexity: 0 },
			};
			const isValid = ValidateComplexityConfig(invalidConfig);
			expect(isValid).toBe(false);
		});

		it('should reject config with maxDepth < 1', () => {
			const invalidConfig: IComplexityConfig = {
				...DEFAULT_COMPLEXITY_RULES,
				limits: { ...DEFAULT_COMPLEXITY_RULES.limits, maxDepth: 0 },
			};
			const isValid = ValidateComplexityConfig(invalidConfig);
			expect(isValid).toBe(false);
		});

		it('should allow config with only multipliers', () => {
			const config: IComplexityConfig = {
				...DEFAULT_COMPLEXITY_RULES,
				multipliers: { depth: 2, list: 5 },
			};
			const isValid = ValidateComplexityConfig(config);
			expect(isValid).toBe(true);
		});

		it('should allow config with only limits', () => {
			const config: IComplexityConfig = {
				...DEFAULT_COMPLEXITY_RULES,
				limits: { maxComplexity: 1000, maxDepth: 10 },
			};
			const isValid = ValidateComplexityConfig(config);
			expect(isValid).toBe(true);
		});

		it('should handle config with undefined multipliers', () => {
			const config: IComplexityConfig = {
				...DEFAULT_COMPLEXITY_RULES,
				multipliers: undefined,
			};
			const isValid = ValidateComplexityConfig(config);
			expect(isValid).toBe(true);
		});

		it('should handle config with undefined limits', () => {
			const config: IComplexityConfig = {
				...DEFAULT_COMPLEXITY_RULES,
				limits: undefined,
			};
			const isValid = ValidateComplexityConfig(config);
			expect(isValid).toBe(true);
		});
	});

	describe('CreateComplexityConfig', () => {
		it('should create default config when no overrides provided', () => {
			const config = CreateComplexityConfig();
			expect(config).toEqual(DEFAULT_COMPLEXITY_RULES);
		});

		it('should merge multiplier overrides', () => {
			const config = CreateComplexityConfig({
				multipliers: { depth: 3 },
			});
			expect(config.multipliers?.depth).toBe(3);
			expect(config.multipliers?.list).toBe(DEFAULT_COMPLEXITY_RULES.multipliers?.list);
		});

		it('should merge limit overrides', () => {
			const config = CreateComplexityConfig({
				limits: { maxComplexity: 5000 },
			});
			expect(config.limits?.maxComplexity).toBe(5000);
			expect(config.limits?.maxDepth).toBe(DEFAULT_COMPLEXITY_RULES.limits?.maxDepth);
		});

		it('should merge both multiplier and limit overrides', () => {
			const config = CreateComplexityConfig({
				multipliers: { list: 10 },
				limits: { maxDepth: 20 },
			});
			expect(config.multipliers?.list).toBe(10);
			expect(config.limits?.maxDepth).toBe(20);
		});

		it('should throw error for invalid multiplier override', () => {
			expect(() => {
				CreateComplexityConfig({
					multipliers: { depth: 0.5 },
				});
			}).toThrow();
		});

		it('should throw error for invalid limit override', () => {
			expect(() => {
				CreateComplexityConfig({
					limits: { maxComplexity: -5 },
				});
			}).toThrow();
		});

		it('should preserve unmodified defaults', () => {
			const config = CreateComplexityConfig({
				multipliers: { depth: 2.5 },
			});
			expect(config.limits).toEqual(DEFAULT_COMPLEXITY_RULES.limits);
		});

		it('should allow multiple overrides in single call', () => {
			const config = CreateComplexityConfig({
				multipliers: { depth: 3, list: 8 },
				limits: { maxComplexity: 2000, maxDepth: 15 },
			});
			expect(config.multipliers?.depth).toBe(3);
			expect(config.multipliers?.list).toBe(8);
			expect(config.limits?.maxComplexity).toBe(2000);
			expect(config.limits?.maxDepth).toBe(15);
		});
	});

	describe('COMPLEXITY_WEIGHTS constants', () => {
		it('should have all required weight constants', () => {
			expect(COMPLEXITY_WEIGHTS.SIMPLE_FIELD).toBe(1);
			expect(COMPLEXITY_WEIGHTS.OBJECT_FIELD).toBe(5);
			expect(COMPLEXITY_WEIGHTS.LIST_ITEM).toBeGreaterThan(0);
			expect(COMPLEXITY_WEIGHTS.NESTED_LIST_ITEM).toBe(50);
			expect(COMPLEXITY_WEIGHTS.CONNECTION).toBe(20);
			expect(COMPLEXITY_WEIGHTS.UNION_FIELD).toBe(3);
			expect(COMPLEXITY_WEIGHTS.CUSTOM_SCALAR).toBeGreaterThan(0);
		});

		it('should have consistent hierarchy', () => {
			expect(COMPLEXITY_WEIGHTS.NESTED_LIST_ITEM).toBeGreaterThan(COMPLEXITY_WEIGHTS.LIST_ITEM);
			expect(COMPLEXITY_WEIGHTS.CONNECTION).toBeGreaterThan(COMPLEXITY_WEIGHTS.OBJECT_FIELD);
		});
	});

	describe('FIELD_COMPLEXITY_RULES constants', () => {
		it('should define rules for user fields', () => {
			expect(FIELD_COMPLEXITY_RULES.user).toBeDefined();
			expect(FIELD_COMPLEXITY_RULES.user.profile).toBe(COMPLEXITY_WEIGHTS.OBJECT_FIELD);
			expect(FIELD_COMPLEXITY_RULES.user.friends).toBe(COMPLEXITY_WEIGHTS.LIST_ITEM);
		});

		it('should define rules for product fields', () => {
			expect(FIELD_COMPLEXITY_RULES.product).toBeDefined();
			expect(FIELD_COMPLEXITY_RULES.product.details).toBe(COMPLEXITY_WEIGHTS.OBJECT_FIELD);
			expect(FIELD_COMPLEXITY_RULES.product.reviews).toBe(COMPLEXITY_WEIGHTS.LIST_ITEM);
		});

		it('should define rules for order fields', () => {
			expect(FIELD_COMPLEXITY_RULES.order).toBeDefined();
			expect(FIELD_COMPLEXITY_RULES.order.items).toBe(COMPLEXITY_WEIGHTS.LIST_ITEM);
			expect(FIELD_COMPLEXITY_RULES.order.customer).toBe(COMPLEXITY_WEIGHTS.OBJECT_FIELD);
		});

		it('should define rules for comment fields', () => {
			expect(FIELD_COMPLEXITY_RULES.comment).toBeDefined();
			expect(FIELD_COMPLEXITY_RULES.comment.replies).toBe(COMPLEXITY_WEIGHTS.LIST_ITEM);
			expect(FIELD_COMPLEXITY_RULES.comment.author).toBe(COMPLEXITY_WEIGHTS.OBJECT_FIELD);
		});

		it('should define rules for tag fields', () => {
			expect(FIELD_COMPLEXITY_RULES.tag).toBeDefined();
			expect(FIELD_COMPLEXITY_RULES.tag.posts).toBe(COMPLEXITY_WEIGHTS.LIST_ITEM);
		});
	});

	describe('DEFAULT_COMPLEXITY_RULES constant', () => {
		it('should be a valid IComplexityConfig', () => {
			expect(ValidateComplexityConfig(DEFAULT_COMPLEXITY_RULES)).toBe(true);
		});

		it('should have defined multipliers', () => {
			expect(DEFAULT_COMPLEXITY_RULES.multipliers).toBeDefined();
			expect(DEFAULT_COMPLEXITY_RULES.multipliers?.depth).toBeGreaterThan(0);
			expect(DEFAULT_COMPLEXITY_RULES.multipliers?.list).toBeGreaterThan(0);
		});

		it('should have defined limits', () => {
			expect(DEFAULT_COMPLEXITY_RULES.limits).toBeDefined();
			expect(DEFAULT_COMPLEXITY_RULES.limits?.maxComplexity).toBeGreaterThan(0);
			expect(DEFAULT_COMPLEXITY_RULES.limits?.maxDepth).toBeGreaterThan(0);
		});
	});
});
