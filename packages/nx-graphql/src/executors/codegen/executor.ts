import { ExecutorContext } from '@nx/devkit';
import type { Types } from '@graphql-codegen/plugin-helpers';

export interface ICodegenExecutorSchema {
	schemaFile: string;
	documentsGlob: string;
	outputFile: string;
	target?: 'typescript' | 'angular';
	plugins?: string[];
	config?: Record<string, unknown>;
	watch?: boolean;
}

const DEFAULT_PLUGINS_TYPESCRIPT = [
	'typescript',
	'typescript-operations',
	'typed-document-node',
	'typescript-apollo-client-helpers',
	'@pawells/graphql-codegen-ts',
];

const DEFAULT_PLUGINS_ANGULAR = [
	'typescript',
	'typescript-operations',
	'typed-document-node',
	'typescript-apollo-client-helpers',
	'@pawells/graphql-codegen-ngx',
];

const DEFAULT_CONFIG = {
	namingConvention: 'keep',
	immutableTypes: false,
};

export default async function CodegenExecutor(
	options: ICodegenExecutorSchema,
	_context: ExecutorContext,
): Promise<{ success: boolean }> {
	try {
		const Target = options.target ?? 'typescript';

		let DefaultPlugins: string[];
		if (Target === 'typescript') {
			DefaultPlugins = DEFAULT_PLUGINS_TYPESCRIPT;
		} else if (Target === 'angular') {
			DefaultPlugins = DEFAULT_PLUGINS_ANGULAR;
		} else {
			throw new Error(`Unknown target: ${Target}. Must be 'typescript' or 'angular'.`);
		}

		const Plugins = options.plugins ?? DefaultPlugins;
		const Config = { ...DEFAULT_CONFIG, ...(options.config ?? {}) };

		// Build the add plugin for eslint-disable comment
		const AddPlugin = { add: { content: '/* eslint-disable */' } };

		// Build plugin config objects
		const PluginObjects = Plugins.map(p => ({ [p]: {} }));

		const Generates: Record<string, Types.ConfiguredOutput> = {
			[options.outputFile]: {
				schema: options.schemaFile,
				documents: options.documentsGlob,
				plugins: [AddPlugin, ...PluginObjects] as Types.ConfiguredPlugin[],
				config: Config,
			},
		};

		const CodegenConfig: Types.Config = {
			schema: options.schemaFile,
			documents: options.documentsGlob,
			generates: Generates,
			watch: options.watch,
		};

		const { generate } = await import('@graphql-codegen/cli');
		await generate(CodegenConfig, true);

		return { success: true };
	} catch (error) {
		console.error('codegen executor failed:', error);
		return { success: false };
	}
}
