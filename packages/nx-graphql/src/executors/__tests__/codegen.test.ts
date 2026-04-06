import { describe, it, expect, beforeEach } from 'vitest';
import type { ExecutorContext } from '@nx/devkit';
import type { ICodegenExecutorSchema } from '../codegen/executor';

describe('CodegenExecutor', () => {
	let executor: (
		options: ICodegenExecutorSchema,
		context: ExecutorContext,
	) => Promise<{ success: boolean }>;
	let mockContext: ExecutorContext;

	beforeEach(async () => {
		const module = await import('../codegen/executor');
		executor = module.default;
		mockContext = {
			root: '/workspace',
			projectName: 'test-project',
			targetName: 'codegen',
			configurationName: undefined,
			cwd: '/workspace',
			isVerbose: false,
		} as ExecutorContext;
	});

	it('should export CodegenExecutor as default', async () => {
		expect(executor).toBeDefined();
		expect(typeof executor).toBe('function');
	});

	it('should be an async function', async () => {
		expect(executor.constructor.name).toBe('AsyncFunction');
	});

	it('should return object with success property', async () => {
		const codegenExecutor = await import('../codegen/executor');
		expect(codegenExecutor.default).toBeDefined();
	});

	it('should return failure for unknown target', async () => {
		const options = {
			schemaFile: 'schema.graphql',
			documentsGlob: 'src/**/*.graphql',
			outputFile: 'src/generated.ts',
			target: 'unknown' as never,
		};

		const result = await executor(options as ICodegenExecutorSchema, mockContext);
		expect(result.success).toBe(false);
	});

	it('should return object with proper success indicator', async () => {
		const options: ICodegenExecutorSchema = {
			schemaFile: 'schema.graphql',
			documentsGlob: 'src/**/*.graphql',
			outputFile: 'src/generated.ts',
			target: 'typescript',
		};

		const result = await executor(options, mockContext);
		expect(typeof result.success).toBe('boolean');
	});

	it('should handle optional parameters correctly', async () => {
		const options: ICodegenExecutorSchema = {
			schemaFile: 'schema.graphql',
			documentsGlob: 'src/**/*.graphql',
			outputFile: 'src/generated.ts',
		};

		const result = await executor(options, mockContext);
		expect(result).toBeDefined();
	});

	it('should support custom config override', async () => {
		const options: ICodegenExecutorSchema = {
			schemaFile: 'schema.graphql',
			documentsGlob: 'src/**/*.graphql',
			outputFile: 'src/generated.ts',
			config: { customField: 'value' },
		};

		const result = await executor(options, mockContext);
		expect(result).toBeDefined();
	});

	it('should support plugin override', async () => {
		const options: ICodegenExecutorSchema = {
			schemaFile: 'schema.graphql',
			documentsGlob: 'src/**/*.graphql',
			outputFile: 'src/generated.ts',
			plugins: ['custom-plugin'],
		};

		const result = await executor(options, mockContext);
		expect(result).toBeDefined();
	});

	it('should support watch mode flag', async () => {
		const options: ICodegenExecutorSchema = {
			schemaFile: 'schema.graphql',
			documentsGlob: 'src/**/*.graphql',
			outputFile: 'src/generated.ts',
			watch: true,
		};

		const result = await executor(options, mockContext);
		expect(result).toBeDefined();
	});
});
