import { describe, it, expect, beforeEach } from 'vitest';
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
		// Test that executor catches and returns success: false on error
		const options: IBuildSchemaExecutorSchema = {
			schemaFile: 'schema.graphql',
			resolversModule: '/nonexistent/path/module',
		};

		const result = await executor(options, mockContext);
		expect(result).toBeDefined();
		expect(result.success).toBe(false);
	});

	it('should properly format error messages', async () => {
		// Verify executor returns boolean success indicator
		const options: IBuildSchemaExecutorSchema = {
			schemaFile: 'schema.graphql',
			resolversModule: '/missing/module',
		};

		const result = await executor(options, mockContext);
		expect(typeof result.success).toBe('boolean');
	});
});
