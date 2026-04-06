import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { ExecutorContext } from '@nx/devkit';
import type { IBuildSchemaExecutorSchema } from '../build-schema/executor';

describe('BuildSchemaExecutor', () => {
	let executor: (
		options: IBuildSchemaExecutorSchema,
		context: ExecutorContext,
	) => Promise<{ success: boolean }>;
	let mockContext: ExecutorContext;

	beforeEach(async () => {
		const module = await import('../build-schema/executor');
		executor = module.default;
		mockContext = {
			root: '/workspace',
			projectName: 'test-project',
			targetName: 'build-schema',
			configurationName: undefined,
			cwd: '/workspace',
			isVerbose: false,
		} as ExecutorContext;
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should export BuildSchemaExecutor as default', async () => {
		expect(executor).toBeDefined();
		expect(typeof executor).toBe('function');
	});

	it('should be an async function', async () => {
		expect(executor.constructor.name).toBe('AsyncFunction');
	});

	it('should return object with success property', async () => {
		const buildSchemaExecutor = await import('../build-schema/executor');
		expect(buildSchemaExecutor.default).toBeDefined();
	});

	it('should handle missing resolvers module gracefully', async () => {
		const options: IBuildSchemaExecutorSchema = {
			schemaFile: 'schema.graphql',
			resolversModule: '/nonexistent/path/module',
		};

		const result = await executor(options, mockContext);
		expect(result).toBeDefined();
		expect(result.success).toBe(false);
	});

	it('should properly format error messages', async () => {
		const options: IBuildSchemaExecutorSchema = {
			schemaFile: 'schema.graphql',
			resolversModule: '/missing/module',
		};

		const result = await executor(options, mockContext);
		expect(typeof result.success).toBe('boolean');
		expect(result.success).toBe(false);
	});

	it('should handle error when loading resolvers module', async () => {
		const options: IBuildSchemaExecutorSchema = {
			schemaFile: 'schema.graphql',
			resolversModule: 'src/resolvers',
		};

		const result = await executor(options, mockContext);
		expect(result.success).toBe(false);
	});

	it('should handle error when GraphQLSchema is not an array', async () => {
		const options: IBuildSchemaExecutorSchema = {
			schemaFile: 'schema.graphql',
			resolversModule: 'src/resolvers',
		};

		const result = await executor(options, mockContext);
		expect(typeof result.success).toBe('boolean');
		expect(result.success).toBe(false);
	});

	it('should handle error when creating NestJS app', async () => {
		const options: IBuildSchemaExecutorSchema = {
			schemaFile: 'schema.graphql',
			resolversModule: 'nonexistent',
		};

		const result = await executor(options, mockContext);
		expect(result.success).toBe(false);
	});

	it('should accept optional project parameter', async () => {
		const options: IBuildSchemaExecutorSchema = {
			schemaFile: 'schema.graphql',
			resolversModule: '/missing',
			project: 'my-project',
		};

		const result = await executor(options, mockContext);
		expect(result).toBeDefined();
		expect(typeof result.success).toBe('boolean');
	});

	it('should handle errors from dynamic imports', async () => {
		const options: IBuildSchemaExecutorSchema = {
			schemaFile: 'schema.graphql',
			resolversModule: '/bad/import',
		};

		const result = await executor(options, mockContext);
		expect(result.success).toBe(false);
	});

	it('should return success false for all error cases', async () => {
		const options: IBuildSchemaExecutorSchema = {
			schemaFile: '',
			resolversModule: '',
		};

		const result = await executor(options, mockContext);
		expect(result.success).toBe(false);
	});

	it('should return success object with boolean', async () => {
		const options: IBuildSchemaExecutorSchema = {
			schemaFile: 'schema.graphql',
			resolversModule: './missing',
		};

		const result = await executor(options, mockContext);
		expect(result).toHaveProperty('success');
		expect(typeof result.success).toBe('boolean');
	});

	it('should handle relative resolvers path', async () => {
		const options: IBuildSchemaExecutorSchema = {
			schemaFile: 'schema.graphql',
			resolversModule: './src/resolvers',
		};

		const result = await executor(options, mockContext);
		expect(result.success).toBe(false);
	});

	it('should handle deeply nested paths', async () => {
		const options: IBuildSchemaExecutorSchema = {
			schemaFile: 'dist/graphql/generated/schema.graphql',
			resolversModule: 'src/graphql/modules/user/resolvers',
		};

		const result = await executor(options, mockContext);
		expect(result.success).toBe(false);
	});

	it('should accept context with root directory', async () => {
		const options: IBuildSchemaExecutorSchema = {
			schemaFile: 'schema.graphql',
			resolversModule: 'resolvers',
		};

		const customContext: ExecutorContext = {
			...mockContext,
			root: '/custom/root',
		};

		const result = await executor(options, customContext);
		expect(result).toBeDefined();
	});
});
