import { ExecutorContext } from '@nx/devkit';
import { ExecuteCodegen, GetDefaultPluginsForTarget, GetDefaultConfig } from './codegen-builder';

export interface ICodegenExecutorSchema {
	schemaFile: string;
	documentsGlob: string;
	outputFile: string;
	target?: 'typescript';
	plugins?: string[];
	config?: Record<string, unknown>;
	watch?: boolean;
}

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
