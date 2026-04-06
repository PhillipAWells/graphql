import type { Types } from '@graphql-codegen/plugin-helpers';

export interface ICodegenBuilderParams {
	SchemaFile: string;
	DocumentsGlob: string;
	OutputFile: string;
	Target: 'typescript';
	Plugins: string[];
	Config: Record<string, unknown>;
	Watch?: boolean;
}

const DEFAULT_PLUGINS_TYPESCRIPT = [
	'typescript',
	'typescript-operations',
	'typed-document-node',
	'typescript-apollo-client-helpers',
	'@pawells/graphql-codegen-ts',
];

const DEFAULT_CONFIG = {
	namingConvention: 'keep',
	immutableTypes: false,
};

export async function ExecuteCodegen(params: ICodegenBuilderParams): Promise<void> {
	const { SchemaFile, DocumentsGlob, OutputFile, Target, Plugins, Config, Watch } = params;

	if (Target !== 'typescript') {
		throw new Error(`Unknown target: ${Target}. Must be 'typescript'.`);
	}

	// Build the add plugin for eslint-disable comment
	const AddPlugin = { add: { content: '/* eslint-disable */' } };

	// Build plugin config objects
	const PluginObjects = Plugins.map((p) => ({ [p]: {} }));

	const Generates = {
		[OutputFile]: {
			schema: SchemaFile,
			documents: DocumentsGlob,
			plugins: [AddPlugin, ...PluginObjects] as Types.ConfiguredPlugin[],
			config: Config,
		},
	};

	const CodegenConfig = {
		schema: SchemaFile,
		documents: DocumentsGlob,
		generates: Generates,
		watch: Watch,
	};

	const { generate } = await import('@graphql-codegen/cli');
	await generate(CodegenConfig, true);
}

export function GetDefaultPluginsForTarget(target: 'typescript'): string[] {
	if (target === 'typescript') {
		return DEFAULT_PLUGINS_TYPESCRIPT;
	}
	return [];
}

export function GetDefaultConfig(): Record<string, unknown> {
	return DEFAULT_CONFIG;
}
