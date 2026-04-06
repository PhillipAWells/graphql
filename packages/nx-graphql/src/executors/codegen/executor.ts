import { ExecutorContext } from '@nx/devkit';
import { ExecuteCodegen, GetDefaultPluginsForTarget, GetDefaultConfig } from './codegen-builder';

/**
 * Options for the codegen executor.
 * Runs graphql-codegen with a preset plugin stack (default: @pawells/graphql-codegen-ts for Node.js/TypeScript).
 */
export interface ICodegenExecutorSchema {
	/** Input .graphql schema file path. */
	schemaFile: string;
	/** Glob pattern for GraphQL operation files (e.g., src/**\/*.graphql). */
	documentsGlob: string;
	/** Output .ts file path for generated code. */
	outputFile: string;
	/** Target platform (currently 'typescript' only). Defaults to 'typescript'. */
	target?: 'typescript';
	/** Override default plugin list. Default: typescript, typescript-operations, typed-document-node, typescript-apollo-client-helpers, @pawells/graphql-codegen-ts. */
	plugins?: string[];
	/** Merge into default codegen config (default: { namingConvention: 'keep', immutableTypes: false }). */
	config?: Record<string, unknown>;
	/** Run in watch mode for development. Defaults to false. */
	watch?: boolean;
}

/**
 * NX executor that runs graphql-codegen with a preset plugin stack.
 * Merges default plugins and config with any overrides, calls graphql-codegen's generate function,
 * and supports watch mode for development.
 * @param options - Executor options.
 * @returns Execution result with success flag (never throws; returns success: false on error).
 */
export default async function CodegenExecutor(
	options: ICodegenExecutorSchema,
	_context: ExecutorContext,
): Promise<{ success: boolean }> {
	try {
		const Target = (options.target ?? 'typescript') as 'typescript';

		const DefaultPlugins = GetDefaultPluginsForTarget(Target);
		const Plugins = options.plugins ?? DefaultPlugins;
		const DefaultConfig = GetDefaultConfig();
		const Config = { ...DefaultConfig, ...(options.config ?? {}) };

		await ExecuteCodegen({
			SchemaFile: options.schemaFile,
			DocumentsGlob: options.documentsGlob,
			OutputFile: options.outputFile,
			Target,
			Plugins,
			Config,
			Watch: options.watch,
		});

		return { success: true };
	} catch (error) {
		console.error('codegen executor failed:', error);
		return { success: false };
	}
}
