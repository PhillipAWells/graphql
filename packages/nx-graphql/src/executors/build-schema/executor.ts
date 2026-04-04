import { ExecutorContext } from '@nx/devkit';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { printSchema } from 'graphql';

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

		if (
			!existsSync(ResolversModulePath) &&
			!existsSync(ResolversModulePath + '.ts') &&
			!existsSync(ResolversModulePath + '.js')
		) {
			throw new Error(`Resolvers module not found: ${ResolversModulePath}`);
		}

		const Module = await import(ResolversModulePath);
		const Resolvers = Module['GraphQLSchema'];

		if (!Array.isArray(Resolvers)) {
			throw new Error(
				`Module at ${ResolversModulePath} must export a 'GraphQLSchema' array of resolver classes`,
			);
		}

		// Dynamic import NestJS GraphQL schema builder to avoid hard dependency at module load time
		const { NestFactory } = await import('@nestjs/core');
		const { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } = await import('@nestjs/graphql');

		const App = await NestFactory.create(GraphQLSchemaBuilderModule, { logger: ['error'] });
		await App.init();

		const GqlSchemaFactory = App.get(GraphQLSchemaFactory);
		const Schema = await GqlSchemaFactory.create(Resolvers);

		await App.close();

		const OutputPath = path.resolve(WorkspaceRoot, options.schemaFile);
		const OutputDir = path.dirname(OutputPath);
		mkdirSync(OutputDir, { recursive: true });
		writeFileSync(OutputPath, printSchema(Schema), 'utf-8');

		console.log(`Schema written to ${options.schemaFile}`);
		return { success: true };
	} catch (error) {
		console.error('build-schema executor failed:', error);
		return { success: false };
	}
}
