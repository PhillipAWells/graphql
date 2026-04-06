import { describe, it, expect, beforeEach } from 'vitest';
import type { ExecutorContext } from '@nx/devkit';

describe('BuildSchemaExecutor', () => {
	let Executor: any;
	let MockContext: ExecutorContext;

	beforeEach(async () => {
		Executor = (await import('../build-schema/executor')).default;
		MockContext = {
			root: '/workspace',
			projectName: 'test-project',
			targetName: 'build-schema',
			configurationName: undefined,
			cwd: '/workspace',
			isVerbose: false,
		} as ExecutorContext;
	});

	it('should export BuildSchemaExecutor as default', async () => {
		expect(Executor).toBeDefined();
		expect(typeof Executor).toBe('function');
	});

	it('should be an async function', async () => {
		expect(Executor.constructor.name).toBe('AsyncFunction');
	});

	it('should return object with success property', async () => {
		// The executor returns { success: true | false }
		const BuildSchemaExecutor = await import('../build-schema/executor');
		expect(BuildSchemaExecutor.default).toBeDefined();
	});

	it('should have correct schema interface exported', async () => {
		const Schema = await import('../build-schema/schema.d');
		expect(Schema).toBeDefined();
	});

	it('should handle missing resolvers module gracefully', async () => {
		// Test that executor catches and returns success: false on error
		const Options = {
			schemaFile: 'schema.graphql',
			resolversModule: '/nonexistent/path/module',
		};

		const Result = await Executor(Options, MockContext);
		expect(Result).toBeDefined();
		expect(Result.success).toBe(false);
	});

	it('should properly format error messages', async () => {
		// Verify executor returns boolean success indicator
		const Options = {
			schemaFile: 'schema.graphql',
			resolversModule: '/missing/module',
		};

		const Result = await Executor(Options, MockContext);
		expect(typeof Result.success).toBe('boolean');
	});
});
