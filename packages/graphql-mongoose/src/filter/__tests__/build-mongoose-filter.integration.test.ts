import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import mongoose, { Schema, Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BuildMongooseFilter } from '../build-mongoose-filter';
import { TFilterSchema } from '../filter-schema.interface';

/**
 * Integration tests for BuildMongooseFilter against a real MongoDB Memory Server instance.
 *
 * Tests verify that BuildMongooseFilter output produces correct query results
 * when executed against Mongoose models with actual documents.
 */

// Test document interface
interface ITestUser {
	_id: Types.ObjectId;
	name: string;
	age: number;
	status: string;
	tags: string[];
	createdAt: Date;
}

// MongoDB Memory Server instance
let mongoServer: MongoMemoryServer;
let userModel: Model<ITestUser>;

// Filter schema for testing
const userFilterSchema: TFilterSchema<unknown> = {
	Name: { MongoField: 'name', Type: 'string' },
	Age: { MongoField: 'age', Type: 'number' },
	Status: { MongoField: 'status', Type: 'string' },
	Tags: { MongoField: 'tags', Type: 'array' },
	CreatedAt: { MongoField: 'createdAt', Type: 'date' },
};

/**
 * Seed documents for testing
 */
const seedDocuments = [
	{
		name: 'Alice',
		age: 28,
		status: 'active',
		tags: ['urgent', 'important'],
		createdAt: new Date('2024-06-01'),
	},
	{
		name: 'Bob',
		age: 35,
		status: 'active',
		tags: ['important'],
		createdAt: new Date('2024-07-15'),
	},
	{
		name: 'Charlie',
		age: 22,
		status: 'inactive',
		tags: [],
		createdAt: new Date('2023-12-01'),
	},
	{
		name: 'Alice Smith',
		age: 31,
		status: 'pending',
		tags: ['urgent', 'important', 'review'],
		createdAt: new Date('2024-01-10'),
	},
	{
		name: 'Diana',
		age: 45,
		status: 'active',
		tags: ['urgent'],
		createdAt: new Date('2024-03-20'),
	},
	{
		name: 'Eve',
		age: 26,
		status: 'active',
		tags: ['important', 'review'],
		createdAt: new Date('2024-05-05'),
	},
	{
		name: 'Frank',
		age: 32,
		status: 'pending',
		tags: ['urgent', 'important', 'review', 'escalated'],
		createdAt: new Date('2024-02-14'),
	},
	{
		name: 'Grace',
		age: 29,
		status: 'inactive',
		tags: ['archived'],
		createdAt: new Date('2023-11-15'),
	},
];

beforeAll(async () => {
	// Start MongoMemoryServer with a compatible version for Debian 12
	mongoServer = await MongoMemoryServer.create({
		binary: {
			version: '7.0.12',
		},
	});
	const mongoUri = mongoServer.getUri();

	// Connect Mongoose
	await mongoose.connect(mongoUri);

	// Create schema and model
	const userSchema = new Schema<ITestUser>({
		name: { type: String, required: true },
		age: { type: Number, required: true },
		status: { type: String, required: true },
		tags: { type: [String], default: [] },
		createdAt: { type: Date, required: true },
	});

	userModel = mongoose.model<ITestUser>('User', userSchema);

	// Insert seed documents
	await userModel.insertMany(seedDocuments);
});

afterAll(async () => {
	// Disconnect Mongoose
	await mongoose.disconnect();

	// Stop MongoMemoryServer
	if (mongoServer) {
		await mongoServer.stop();
	}
});

describe('BuildMongooseFilter Integration Tests', () => {
	describe('String equality and comparison', () => {
		it('should match documents with name equality', async () => {
			const filter = BuildMongooseFilter({ Name: { Eq: 'Alice' } }, userFilterSchema);
			const results = await userModel.find(filter);

			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('Alice');
		});

		it('should match documents with names starting with pattern (case-insensitive)', async () => {
			const filter = BuildMongooseFilter(
				{ Name: { Regex: '^Al', RegexOptions: 'i' } },
				userFilterSchema,
			);
			const results = await userModel.find(filter);

			expect(results).toHaveLength(2);
			const names = results.map((r) => r.name).sort();
			expect(names).toEqual(['Alice', 'Alice Smith']);
		});
	});

	describe('Numeric range filtering', () => {
		it('should match documents with age >= 25 and < 35', async () => {
			const filter = BuildMongooseFilter(
				{ Age: { Gte: 25, Lt: 35 } },
				userFilterSchema,
			);
			const results = await userModel.find(filter);

			// Alice (28), Bob (35 - excluded), Eve (26), Alice Smith (31), Diana (45 - excluded)
			expect(results.length).toBeGreaterThanOrEqual(3);
			results.forEach((r) => {
				expect(r.age).toBeGreaterThanOrEqual(25);
				expect(r.age).toBeLessThan(35);
			});
		});

		it('should match documents with age > 30 and <= 50', async () => {
			const filter = BuildMongooseFilter(
				{ Age: { Gt: 30, Lte: 50 } },
				userFilterSchema,
			);
			const results = await userModel.find(filter);

			// Alice Smith (31), Diana (45), Frank (32), Bob (35)
			expect(results.length).toBeGreaterThanOrEqual(3);
			results.forEach((r) => {
				expect(r.age).toBeGreaterThan(30);
				expect(r.age).toBeLessThanOrEqual(50);
			});
		});
	});

	describe('Array field filtering', () => {
		it('should match documents with arrays containing both tags', async () => {
			const filter = BuildMongooseFilter(
				{ Tags: { All: ['urgent', 'important'] } },
				userFilterSchema,
			);
			const results = await userModel.find(filter);

			// Alice (urgent, important), Alice Smith (urgent, important, review), Frank (urgent, important, review, escalated)
			expect(results.length).toBeGreaterThanOrEqual(2);
			results.forEach((r) => {
				expect(r.tags).toContain('urgent');
				expect(r.tags).toContain('important');
			});
		});

		it('should match documents with exactly 2 tags', async () => {
			const filter = BuildMongooseFilter(
				{ Tags: { Size: 2 } },
				userFilterSchema,
			);
			const results = await userModel.find(filter);

			// Alice (2 tags), Bob (1 tag - no), Eve (2 tags)
			expect(results.length).toBeGreaterThanOrEqual(1);
			results.forEach((r) => {
				expect(r.tags).toHaveLength(2);
			});
		});
	});

	describe('Date range filtering', () => {
		it('should match documents created in 2024', async () => {
			const filter = BuildMongooseFilter(
				{
					CreatedAt: {
						Gte: new Date('2024-01-01'),
						Lt: new Date('2025-01-01'),
					},
				},
				userFilterSchema,
			);
			const results = await userModel.find(filter);

			// Alice (6/1/2024), Bob (7/15/2024), Alice Smith (1/10/2024), Diana (3/20/2024), Eve (5/5/2024), Frank (2/14/2024)
			expect(results.length).toBeGreaterThanOrEqual(5);
			results.forEach((r) => {
				expect(r.createdAt.getFullYear()).toBe(2024);
			});
		});
	});

	describe('Logical OR filtering', () => {
		it('should match documents with name equal to Alice or Bob', async () => {
			const filter = BuildMongooseFilter(
				{
					Or: [
						{ Name: { Eq: 'Alice' } },
						{ Name: { Eq: 'Bob' } },
					],
				},
				userFilterSchema,
			);
			const results = await userModel.find(filter);

			expect(results).toHaveLength(2);
			const names = results.map((r) => r.name).sort();
			expect(names).toEqual(['Alice', 'Bob']);
		});
	});

	describe('Logical AND filtering', () => {
		it('should match active users aged 25 or older', async () => {
			const filter = BuildMongooseFilter(
				{
					And: [
						{ Status: { Eq: 'active' } },
						{ Age: { Gte: 25 } },
					],
				},
				userFilterSchema,
			);
			const results = await userModel.find(filter);

			// Alice (28, active), Bob (35, active), Diana (45, active), Eve (26, active)
			expect(results.length).toBeGreaterThanOrEqual(3);
			results.forEach((r) => {
				expect(r.status).toBe('active');
				expect(r.age).toBeGreaterThanOrEqual(25);
			});
		});
	});

	describe('Negation with $ne', () => {
		it('should match all non-inactive documents', async () => {
			const filter = BuildMongooseFilter(
				{ Status: { Ne: 'inactive' } },
				userFilterSchema,
			);
			const results = await userModel.find(filter);

			// active (4) + pending (2) = 6
			expect(results.length).toBeGreaterThanOrEqual(4);
			results.forEach((r) => {
				expect(r.status).not.toBe('inactive');
			});
		});
	});

	describe('Existence check', () => {
		it('should match documents with a status field', async () => {
			const filter = BuildMongooseFilter(
				{ Status: { Exists: true } },
				userFilterSchema,
			);
			const results = await userModel.find(filter);

			// All seed documents have status
			expect(results).toHaveLength(seedDocuments.length);
			results.forEach((r) => {
				expect(r.status).toBeDefined();
			});
		});
	});

	describe('Complex combined queries', () => {
		it('should match urgent and important documents that are active', async () => {
			const filter = BuildMongooseFilter(
				{
					Status: { Eq: 'active' },
					Tags: { All: ['urgent', 'important'] },
				},
				userFilterSchema,
			);
			const results = await userModel.find(filter);

			// Alice (active, urgent+important), Diana (active, urgent only - no)
			expect(results.length).toBeGreaterThanOrEqual(1);
			results.forEach((r) => {
				expect(r.status).toBe('active');
				expect(r.tags).toContain('urgent');
				expect(r.tags).toContain('important');
			});
		});

		it('should match documents with nested logical operators', async () => {
			const filter = BuildMongooseFilter(
				{
					Or: [
						{
							And: [
								{ Status: { Eq: 'active' } },
								{ Age: { Gte: 30 } },
							],
						},
						{ Name: { Regex: '^Alice' } },
					],
				},
				userFilterSchema,
			);
			const results = await userModel.find(filter);

			// Alice (name matches), Alice Smith (name matches), Bob (active + 35 >= 30), Diana (active + 45 >= 30)
			expect(results.length).toBeGreaterThanOrEqual(3);
		});
	});

	describe('Edge cases', () => {
		it('should handle empty filter and match all documents', async () => {
			const filter = BuildMongooseFilter({}, userFilterSchema);
			const results = await userModel.find(filter);

			expect(results).toHaveLength(seedDocuments.length);
		});

		it('should handle null filter and match all documents', async () => {
			const filter = BuildMongooseFilter(null, userFilterSchema);
			const results = await userModel.find(filter);

			expect(results).toHaveLength(seedDocuments.length);
		});

		it('should handle undefined filter and match all documents', async () => {
			const filter = BuildMongooseFilter(undefined, userFilterSchema);
			const results = await userModel.find(filter);

			expect(results).toHaveLength(seedDocuments.length);
		});

		it('should return no results for impossible condition', async () => {
			const filter = BuildMongooseFilter(
				{ Age: { Gte: 100 } },
				userFilterSchema,
			);
			const results = await userModel.find(filter);

			expect(results).toHaveLength(0);
		});

		it('should match using In operator with multiple values', async () => {
			const filter = BuildMongooseFilter(
				{ Status: { In: ['active', 'pending'] } },
				userFilterSchema,
			);
			const results = await userModel.find(filter);

			// All except inactive (Charlie, Grace)
			expect(results.length).toBeGreaterThanOrEqual(6);
			results.forEach((r) => {
				expect(['active', 'pending']).toContain(r.status);
			});
		});
	});
});
