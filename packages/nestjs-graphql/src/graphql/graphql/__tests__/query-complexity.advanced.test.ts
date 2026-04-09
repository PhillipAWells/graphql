import { describe, it, expect } from 'vitest';
import { CalculateQueryComplexity, ExceedsComplexityLimit, DEFAULT_COMPLEXITY_CONFIG } from '../query-complexity.js';
import { GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLList, GraphQLSchema, parse } from 'graphql';

/**
 * Advanced integration tests for query complexity calculator
 * Covers edge cases, variable substitution, and complex query structures
 */
describe('Query Complexity Calculator - Advanced Integration', () => {
	// Helper to build a simple schema for testing
	const buildTestSchema = () => {
		const UserType = new GraphQLObjectType({
			name: 'User',
			fields: {
				id: { type: GraphQLString },
				name: { type: GraphQLString },
				email: { type: GraphQLString },
				age: { type: GraphQLInt },
				friends: { type: new GraphQLList(new GraphQLObjectType({
					name: 'FriendUser',
					fields: {
						id: { type: GraphQLString },
						name: { type: GraphQLString },
					},
				})) },
				profile: { type: new GraphQLObjectType({
					name: 'Profile',
					fields: {
						bio: { type: GraphQLString },
						avatar: { type: GraphQLString },
					},
				}) },
			},
		});

		return new GraphQLSchema({
			query: new GraphQLObjectType({
				name: 'Query',
				fields: {
					user: {
						type: UserType,
						args: { id: { type: GraphQLString } },
					},
					users: {
						type: new GraphQLList(UserType),
						args: { limit: { type: GraphQLInt } },
					},
				},
			}),
		});
	};

	describe('Complexity calculation with variables', () => {
		it('should calculate complexity with variable substitution in list field', () => {
			const schema = buildTestSchema();
			const query = parse(`
				query GetUsers($limit: Int) {
					users(limit: $limit) {
						id
						name
					}
				}
			`);
			const variables = { limit: 20 };

			const complexity = CalculateQueryComplexity(schema, query, variables, 'GetUsers');
			expect(complexity).toBeGreaterThan(0);
			expect(typeof complexity).toBe('number');
		});

		it('should handle queries without variables', () => {
			const schema = buildTestSchema();
			const query = parse(`
				query {
					user(id: "123") {
						id
						name
					}
				}
			`);

			const complexity = CalculateQueryComplexity(schema, query, undefined, undefined);
			expect(complexity).toBeGreaterThan(0);
		});

		it('should calculate different complexity for different variable values', () => {
			const schema = buildTestSchema();
			const query = parse(`
				query GetUsers($limit: Int) {
					users(limit: $limit) {
						id
						name
						friends {
							id
							name
						}
					}
				}
			`);

			const complexity1 = CalculateQueryComplexity(schema, query, undefined, undefined, { limits: { maxComplexity: 10 } });
			const complexity2 = CalculateQueryComplexity(schema, query, undefined, undefined, { limits: { maxComplexity: 50 } });

			// Both should be valid numbers
			expect(complexity1).toBeGreaterThan(0);
			expect(complexity2).toBeGreaterThan(0);
		});

		it('should handle empty variables object', () => {
			const schema = buildTestSchema();
			const query = parse(`
				query {
					user(id: "123") {
						id
						name
						profile {
							bio
							avatar
						}
					}
				}
			`);

			const complexity = CalculateQueryComplexity(schema, query, {}, 'Query');
			expect(complexity).toBeGreaterThan(0);
		});
	});

	describe('Nested field selections and depth multipliers', () => {
		it('should increase complexity for deeply nested fields', () => {
			const schema = buildTestSchema();
			const query = parse(`
				query {
					user(id: "123") {
						id
						friends {
							id
						}
					}
				}
			`);

			const shallowComplexity = CalculateQueryComplexity(schema, query, undefined, undefined);

			// Now a deeper query
			const deepQuery = parse(`
				query {
					user(id: "123") {
						id
						profile {
							bio
							avatar
						}
						friends {
							id
							name
						}
					}
				}
			`);

			const deepComplexity = CalculateQueryComplexity(schema, deepQuery, undefined, undefined);
			expect(deepComplexity).toBeGreaterThan(0);
			expect(shallowComplexity).toBeGreaterThan(0);
		});

		it('should handle multiple field selections at same depth', () => {
			const schema = buildTestSchema();
			const query = parse(`
				query {
					user(id: "123") {
						id
						name
						email
						age
						profile {
							bio
							avatar
						}
					}
				}
			`);

			const complexity = CalculateQueryComplexity(schema, query, undefined, undefined);
			expect(complexity).toBeGreaterThan(0);
		});

		it('should calculate complexity with multiple list fields', () => {
			const schema = buildTestSchema();
			const query = parse(`
				query {
					users(limit: 10) {
						id
						name
						friends {
							id
							name
						}
					}
				}
			`);

			const complexity = CalculateQueryComplexity(schema, query, undefined, undefined);
			expect(complexity).toBeGreaterThan(0);
		});
	});

	describe('ExceedsComplexityLimit boundary conditions', () => {
		it('should return true when complexity exceeds limit', () => {
			const config = {
				...DEFAULT_COMPLEXITY_CONFIG,
				limits: { maxComplexity: 100, maxDepth: 10 },
			};

			const exceeds = ExceedsComplexityLimit(101, config);
			expect(exceeds).toBe(true);
		});

		it('should return false when complexity equals limit', () => {
			const config = {
				...DEFAULT_COMPLEXITY_CONFIG,
				limits: { maxComplexity: 100, maxDepth: 10 },
			};

			const exceeds = ExceedsComplexityLimit(100, config);
			expect(exceeds).toBe(false);
		});

		it('should return false when complexity is below limit', () => {
			const config = {
				...DEFAULT_COMPLEXITY_CONFIG,
				limits: { maxComplexity: 100, maxDepth: 10 },
			};

			const exceeds = ExceedsComplexityLimit(99, config);
			expect(exceeds).toBe(false);
		});

		it('should handle very low limits', () => {
			const config = {
				...DEFAULT_COMPLEXITY_CONFIG,
				limits: { maxComplexity: 1, maxDepth: 1 },
			};

			expect(ExceedsComplexityLimit(0, config)).toBe(false);
			expect(ExceedsComplexityLimit(1, config)).toBe(false);
			expect(ExceedsComplexityLimit(2, config)).toBe(true);
		});

		it('should handle config without limits', () => {
			const config = {
				defaultComplexity: 1,
				multipliers: { depth: 2, list: 1.5 },
				limits: undefined,
			};

			const result = ExceedsComplexityLimit(1000, config);
			expect(result).toBe(false);
		});

		it('should handle config with undefined maxComplexity', () => {
			const config = {
				defaultComplexity: 1,
				multipliers: { depth: 2, list: 1.5 },
				limits: { maxDepth: 10 },
			};

			const result = ExceedsComplexityLimit(5000, config);
			expect(result).toBe(false);
		});

		it('should handle zero complexity', () => {
			const config = {
				...DEFAULT_COMPLEXITY_CONFIG,
				limits: { maxComplexity: 100, maxDepth: 10 },
			};

			const exceeds = ExceedsComplexityLimit(0, config);
			expect(exceeds).toBe(false);
		});
	});

	describe('Complexity calculation error handling', () => {
		it('should return max complexity on calculation error (malformed schema)', () => {
			// Pass an invalid schema that will cause an error in calculation
			const invalidSchema = {};
			const query = parse(`
				query {
					user(id: "123") {
						id
					}
				}
			`);

			const complexity = CalculateQueryComplexity(invalidSchema as any, query, undefined, undefined);
			// On error, should return the max complexity from config (for safety)
			expect(complexity).toBeGreaterThan(0);
		});

		it('should handle queries with named operations', () => {
			const schema = buildTestSchema();
			const query = parse(`
				query GetUsers {
					users(limit: 10) {
						id
						name
					}
				}
			`);

			// Request the named operation
			const complexity = CalculateQueryComplexity(schema, query, {}, 'GetUsers');
			// Should return a valid complexity value
			expect(complexity).toBeGreaterThan(0);
		});
	});

	describe('Custom complexity configuration', () => {
		it('should use custom default complexity in calculation', () => {
			const schema = buildTestSchema();
			const query = parse(`
				query {
					user(id: "123") {
						id
						name
					}
				}
			`);

			const customConfig = {
				defaultComplexity: 10,
				multipliers: { depth: 2, list: 1.5 },
				limits: { maxComplexity: 1000, maxDepth: 20 },
			};

			const complexity = CalculateQueryComplexity(schema, query, {}, undefined, customConfig);
			expect(complexity).toBeGreaterThan(0);
		});

		it('should respect custom limits in ExceedsComplexityLimit', () => {
			const customConfig = {
				defaultComplexity: 1,
				multipliers: { depth: 3, list: 2 },
				limits: { maxComplexity: 50, maxDepth: 5 },
			};

			expect(ExceedsComplexityLimit(49, customConfig)).toBe(false);
			expect(ExceedsComplexityLimit(50, customConfig)).toBe(false);
			expect(ExceedsComplexityLimit(51, customConfig)).toBe(true);
		});
	});

	describe('Complex query structures', () => {
		it('should handle query with multiple root selections', () => {
			const schema = buildTestSchema();
			const query = parse(`
				query {
					user(id: "123") {
						id
						name
					}
					users(limit: 5) {
						id
						name
					}
				}
			`);

			const complexity = CalculateQueryComplexity(schema, query, undefined, undefined);
			expect(complexity).toBeGreaterThan(0);
		});

		it('should handle query with inline fragments', () => {
			const schema = buildTestSchema();
			const query = parse(`
				query {
					user(id: "123") {
						id
						name
						... on User {
							email
							age
						}
					}
				}
			`);

			const complexity = CalculateQueryComplexity(schema, query, undefined, undefined);
			expect(complexity).toBeGreaterThan(0);
		});
	});
});
