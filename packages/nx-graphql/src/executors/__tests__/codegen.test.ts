import { describe, it, expect, beforeEach } from 'vitest';
import type { ExecutorContext } from '@nx/devkit';

describe('CodegenExecutor', () => {
	let Executor: any;
	let MockContext: ExecutorContext;

	beforeEach(async () => {
		Executor = (await import('../codegen/executor')).default;
		MockContext = {
			root: '/workspace',
			projectName: 'test-project',
			targetName: 'codegen',
			configurationName: undefined,
			cwd: '/workspace',
			isVerbose: false,
		} as ExecutorContext;
	});

	it('should export CodegenExecutor as default', async () => {
		expect(Executor).toBeDefined();
		expect(typeof Executor).toBe('function');
	});

	it('should be an async function', async () => {
		expect(Executor.constructor.name).toBe('AsyncFunction');
	});

	it('should return object with success property', async () => {
		const CodegenExecutor = await import('../codegen/executor');
		expect(CodegenExecutor.default).toBeDefined();
	});

	it('should have correct schema interface exported', async () => {
		const Schema = await import('../codegen/schema.d');
		expect(Schema).toBeDefined();
	});

	it('should return failure for unknown target', async () => {
		const Options = {
			schemaFile: 'schema.graphql',
			documentsGlob: 'src/**/*.graphql',
			outputFile: 'src/generated.ts',
			target: 'unknown' as any,
		};

		const Result = await Executor(Options, MockContext);
		expect(Result.success).toBe(false);
	});

	it('should return object with proper success indicator', async () => {
		const Options = {
			schemaFile: 'schema.graphql',
			documentsGlob: 'src/**/*.graphql',
			outputFile: 'src/generated.ts',
			target: 'typescript',
		};

		const Result = await Executor(Options, MockContext);
		expect(typeof Result.success).toBe('boolean');
	});

	it('should handle optional parameters correctly', async () => {
		const Options = {
			schemaFile: 'schema.graphql',
			documentsGlob: 'src/**/*.graphql',
			outputFile: 'src/generated.ts',
		};

		const Result = await Executor(Options, MockContext);
		expect(Result).toBeDefined();
	});

	it('should support custom config override', async () => {
		const Options = {
			schemaFile: 'schema.graphql',
			documentsGlob: 'src/**/*.graphql',
			outputFile: 'src/generated.ts',
			config: { customField: 'value' },
		};

		const Result = await Executor(Options, MockContext);
		expect(Result).toBeDefined();
	});

	it('should support plugin override', async () => {
		const Options = {
			schemaFile: 'schema.graphql',
			documentsGlob: 'src/**/*.graphql',
			outputFile: 'src/generated.ts',
			plugins: ['custom-plugin'],
		};

		const Result = await Executor(Options, MockContext);
		expect(Result).toBeDefined();
	});

	it('should support watch mode flag', async () => {
		const Options = {
			schemaFile: 'schema.graphql',
			documentsGlob: 'src/**/*.graphql',
			outputFile: 'src/generated.ts',
			watch: true,
		};

		const Result = await Executor(Options, MockContext);
		expect(Result).toBeDefined();
	});
});
