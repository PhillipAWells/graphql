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
	const OutputPath = path.resolve(workspaceRoot, schemaOutputPath);
	const OutputDir = path.dirname(OutputPath);
	mkdirSync(OutputDir, { recursive: true });
	writeFileSync(OutputPath, schemaContent, 'utf-8');
	console.log(`Schema written to ${schemaOutputPath}`);
}

async function BuildNestJSGraphQLSchema(resolvers: unknown[]): Promise<string> {
	// Dynamic import NestJS GraphQL schema builder to avoid hard dependency at module load time
	const { NestFactory } = await import('@nestjs/core');
	const { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } = await import('@nestjs/graphql');

	// Create the NestJS app
	const App = await NestFactory.create(GraphQLSchemaBuilderModule, { logger: ['error'] });
	await App.init();

	try {
		// Build the GraphQL schema
		const GqlSchemaFactory = App.get(GraphQLSchemaFactory);
		// Cast to Function[] after type validation above; NestJS GraphQL builder requires Function[] constructor type
		const Schema = await GqlSchemaFactory.create(resolvers as Function[]);
		return printSchema(Schema);
	} finally {
		// Clean up the app
		await App.close();
	}
}

export async function BuildGraphQLSchema(params: IBuildSchemaParams): Promise<void> {
	const { WorkspaceRoot, ResolversModulePath, SchemaOutputPath } = params;

	// Validate module exists in at least one form
	ValidateResolversModuleExists(ResolversModulePath);

	// Import the resolvers module
	const Module = await import(ResolversModulePath);
	const Resolvers = Module['GraphQLSchema'] as unknown;

	// Validate the export is an array
	ValidateResolversExport(Resolvers);

	// Build the schema using NestJS
	const SchemaContent = await BuildNestJSGraphQLSchema(Resolvers);

	// Write the schema to disk
	WriteSchemaToFile(WorkspaceRoot, SchemaOutputPath, SchemaContent);
}
