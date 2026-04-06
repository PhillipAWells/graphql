import { ExecutorContext } from '@nx/devkit';
import path from 'node:path';
import { BuildGraphQLSchema } from './schema-builder';

export interface IBuildSchemaExecutorSchema {
	schemaFile: string;
	resolversModule: string;
	project?: string;
}

export default async function BuildSchemaExecutor(
	options: IBuildSchemaExecutorSchema,
	context: ExecutorContext,
): Promise<{ success: boolean }> {
	try {
		const WorkspaceRoot = context.root;
		const ResolversModulePath = path.resolve(WorkspaceRoot, options.resolversModule);

		await BuildGraphQLSchema({
			WorkspaceRoot,
			ResolversModulePath,
			SchemaOutputPath: options.schemaFile,
		});

		return { success: true };
	} catch (error) {
		console.error('build-schema executor failed:', error);
		return { success: false };
	}
}
