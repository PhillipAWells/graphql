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
	context: ExecutorContext,
): Promise<{ success: boolean }> {
	try {
		const target = (options.target ?? 'typescript') as 'typescript';

		const defaultPlugins = GetDefaultPluginsForTarget(target);
		const plugins = options.plugins ?? defaultPlugins;
		const defaultConfig = GetDefaultConfig();
		const config = { ...defaultConfig, ...(options.config ?? {}) };

		await ExecuteCodegen({
			SchemaFile: options.schemaFile,
			DocumentsGlob: options.documentsGlob,
			OutputFile: options.outputFile,
			Target: target,
			Plugins: plugins,
			Config: config,
			Watch: options.watch,
		});

		return { success: true };
	} catch (error) {
		console.error('codegen executor failed:', error);
		return { success: false };
	}
}
