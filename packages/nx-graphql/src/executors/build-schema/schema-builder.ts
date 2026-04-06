import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { printSchema } from 'graphql';

export interface IBuildSchemaParams {
	WorkspaceRoot: string;
	ResolversModulePath: string;
	SchemaOutputPath: string;
}

export function ValidateResolversModuleExists(modulePath: string): void {
	if (
		!existsSync(modulePath) &&
		!existsSync(`${modulePath}.ts`) &&
		!existsSync(`${modulePath}.js`)
	) {
		throw new Error(`Resolvers module not found: ${modulePath}`);
	}
}

export function ValidateResolversExport(resolvers: unknown): asserts resolvers is unknown[] {
	if (!Array.isArray(resolvers)) {
		throw new Error(
			'Module must export a \'GraphQLSchema\' array of resolver classes',
		);
	}
}

export function WriteSchemaToFile(
	workspaceRoot: string,
	schemaOutputPath: string,
	schemaContent: string,
): void {
	const outputPath = path.resolve(workspaceRoot, schemaOutputPath);
	const outputDir = path.dirname(outputPath);
	mkdirSync(outputDir, { recursive: true });
	writeFileSync(outputPath, schemaContent, 'utf-8');
	console.log(`Schema written to ${schemaOutputPath}`);
}

async function BuildNestJSGraphQLSchema(resolvers: unknown[]): Promise<string> {
	// Dynamic import NestJS GraphQL schema builder to avoid hard dependency at module load time
	const { NestFactory } = await import('@nestjs/core');
	const { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } = await import('@nestjs/graphql');

	// Create the NestJS app
	const app = await NestFactory.create(GraphQLSchemaBuilderModule, { logger: ['error'] });
	await app.init();

	try {
		// Build the GraphQL schema
		const gqlSchemaFactory = app.get(GraphQLSchemaFactory);
		const schema = await gqlSchemaFactory.create(resolvers as unknown as Function[]);
		return printSchema(schema);
	} finally {
		// Clean up the app
		await app.close();
	}
}

export async function BuildGraphQLSchema(params: IBuildSchemaParams): Promise<void> {
	const { WorkspaceRoot, ResolversModulePath, SchemaOutputPath } = params;

	// Validate module exists in at least one form
	ValidateResolversModuleExists(ResolversModulePath);

	// Import the resolvers module
	const module = await import(ResolversModulePath);
	const resolvers = module['GraphQLSchema'] as unknown;

	// Validate the export is an array
	ValidateResolversExport(resolvers);

	// Build the schema using NestJS
	const schemaContent = await BuildNestJSGraphQLSchema(resolvers);

	// Write the schema to disk
	WriteSchemaToFile(WorkspaceRoot, SchemaOutputPath, schemaContent);
}
