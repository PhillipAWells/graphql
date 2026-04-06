import { ExecutorContext } from '@nx/devkit';
import path from 'node:path';
import { BuildGraphQLSchema } from './schema-builder';

/**
 * Options for the build-schema executor.
 * Builds a GraphQL schema file from NestJS resolver classes.
 */
export interface IBuildSchemaExecutorSchema {
	/** Output path for the .graphql schema file (relative to workspace root). */
	schemaFile: string;
	/** Path to module that exports GraphQLSchema array of NestJS resolver classes. */
	resolversModule: string;
	/** NX project name (defaults to current project). */
	project?: string;
}

/**
 * NX executor that builds a GraphQL SDL schema file from NestJS resolver classes.
 * Resolves and imports the resolvers module, validates the GraphQLSchema export exists,
 * uses NestJS's schema factory to build the GraphQL schema, and writes SDL to file.
 * @param options - Executor options.
 * @returns Execution result with success flag (never throws; returns success: false on error).
 */
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
