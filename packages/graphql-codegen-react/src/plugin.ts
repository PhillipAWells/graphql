import type { Types } from '@graphql-codegen/plugin-helpers';
import type { GraphQLSchema } from 'graphql';
import { OperationDefinitionNode } from 'graphql';

import CodeBlockWriter from 'code-block-writer';

export interface IRawPluginConfig {
	// No React-specific config fields
}

// Export under old name for backward compatibility
// eslint-disable-next-line @typescript-eslint/naming-convention
export type RawPluginConfig = IRawPluginConfig;

interface IGQLOperation {
	Name: string;
	OperationType: 'query' | 'mutation' | 'subscription';
	IsOptionalVariables: boolean;
	TypeName: string;
	VariablesTypeName: string;
	DocumentName: string;
	HookName: string;
}

interface IGQLOperationGroup {
	Queries: IGQLOperation[];
	Mutations: IGQLOperation[];
	Subscriptions: IGQLOperation[];
}

/**
 * Determine the type names for a GraphQL operation based on its name and type.
 */
function DetermineTypeNames(
	name: string,
	operationType: 'query' | 'mutation' | 'subscription',
): {
	TypeName: string;
	VariablesTypeName: string;
	DocumentName: string;
	HookName: string;
} {
	const TypeOperationSuffix =
		operationType === 'query'
			? 'Query'
			: operationType === 'mutation'
				? 'Mutation'
				: 'Subscription';

	const TypeName = `${name}${TypeOperationSuffix}`;
	const VariablesTypeName = `${name}${TypeOperationSuffix}Variables`;
	const DocumentName = `${name}Document`;
	const HookName = `use${name}${TypeOperationSuffix}`;

	return { TypeName, VariablesTypeName, DocumentName, HookName };
}

/**
 * Check if an operation's variables are optional (all are nullable or none exist).
 */
function IsOptionalVariables(definition: OperationDefinitionNode): boolean {
	if (!definition.variableDefinitions || definition.variableDefinitions.length === 0) {
		return true;
	}

	return !definition.variableDefinitions.some((v) => v.type.kind === 'NonNullType');
}

/**
 * Extract GraphQL operations from document files and organize them by type.
 */
function ExtractOperations(files: Types.DocumentFile[]): IGQLOperationGroup {
	const Operations: IGQLOperationGroup = {
		Queries: [],
		Mutations: [],
		Subscriptions: [],
	};

	for (const File of files) {
		if (!File.document) continue;

		for (const Def of File.document.definitions) {
			if (
				Def.kind === 'OperationDefinition' &&
				Def.name &&
				Def.operation
			) {
				const OperationType = Def.operation as 'query' | 'mutation' | 'subscription';
				const { TypeName, VariablesTypeName, DocumentName, HookName } =
					DetermineTypeNames(Def.name.value, OperationType);

				const Operation: IGQLOperation = {
					Name: Def.name.value,
					OperationType,
					IsOptionalVariables: IsOptionalVariables(Def),
					TypeName,
					VariablesTypeName,
					DocumentName,
					HookName,
				};

				if (OperationType === 'query') {
					Operations.Queries.push(Operation);
				} else if (OperationType === 'mutation') {
					Operations.Mutations.push(Operation);
				} else if (OperationType === 'subscription') {
					Operations.Subscriptions.push(Operation);
				}
			}
		}
	}

	return Operations;
}

/**
 * Validate that all required GraphQL Codegen plugins are installed.
 */
function ValidateRequiredPlugins(info: {
	allPlugins?: Types.ConfiguredPlugin[];
	[key: string]: unknown;
}): void {
	const RequiredPlugins = [
		'typescript',
		'typescript-operations',
		'typed-document-node',
	];

	const InstalledPlugins = (info.allPlugins ?? []).map((p) => {
		if (typeof p === 'string') return p;
		if (typeof p === 'object' && p !== null) {
			const [Key] = Object.keys(p);
			return Key;
		}
		return '';
	}).filter(Boolean);

	for (const Required of RequiredPlugins) {
		if (!InstalledPlugins.includes(Required)) {
			throw new Error(
				`Missing required plugin: ${Required}. Required plugins: ${RequiredPlugins.join(', ')}`,
			);
		}
	}
}

/**
 * Generate React hook code for GraphQL query operations.
 */
function GenerateQueryHooks(operations: IGQLOperation[]): string {
	const writer = new CodeBlockWriter({ useTabs: true });

	for (const op of operations) {
		const VariablesParam = op.IsOptionalVariables
			? `variables?: ${op.VariablesTypeName}`
			: `variables: ${op.VariablesTypeName}`;
		const VariablesArg = op.IsOptionalVariables
			? '{ ...(variables && { variables }), ...options }'
			: '{ variables, ...options }';

		writer
			.writeLine(`export function ${op.HookName}(`)
			.indent(() => {
				writer
					.writeLine(`${VariablesParam},`)
					.writeLine(`options?: QueryHookOptions<${op.TypeName}, ${op.VariablesTypeName}>,`);
			})
			.write(`): QueryResult<${op.TypeName}, ${op.VariablesTypeName}>`)
			.block(() => {
				writer.writeLine(`return useQuery<${op.TypeName}, ${op.VariablesTypeName}>(${op.DocumentName}, ${VariablesArg});`);
			})
			.blankLine();
	}

	return writer.toString().trimEnd();
}

/**
 * Generate React hook code for GraphQL mutation operations.
 */
function GenerateMutationHooks(operations: IGQLOperation[]): string {
	const writer = new CodeBlockWriter({ useTabs: true });

	for (const op of operations) {
		writer
			.writeLine(`export function ${op.HookName}(`)
			.indent(() => {
				writer.writeLine(`options?: MutationHookOptions<${op.TypeName}, ${op.VariablesTypeName}>,`);
			})
			.write(`): MutationTuple<${op.TypeName}, ${op.VariablesTypeName}>`)
			.block(() => {
				writer.writeLine(`return useMutation<${op.TypeName}, ${op.VariablesTypeName}>(${op.DocumentName}, options);`);
			})
			.blankLine();
	}

	return writer.toString().trimEnd();
}

/**
 * Generate React hook code for GraphQL subscription operations.
 */
function GenerateSubscriptionHooks(operations: IGQLOperation[]): string {
	const writer = new CodeBlockWriter({ useTabs: true });

	for (const op of operations) {
		const VariablesParam = op.IsOptionalVariables
			? `variables?: ${op.VariablesTypeName}`
			: `variables: ${op.VariablesTypeName}`;

		const SubscriptionArg = op.IsOptionalVariables
			? '{ ...(variables && { variables }), ...options }'
			: '{ variables, ...options }';

		writer
			.writeLine(`export function ${op.HookName}(`)
			.indent(() => {
				writer
					.writeLine(`${VariablesParam},`)
					.writeLine(`options?: SubscriptionHookOptions<${op.TypeName}, ${op.VariablesTypeName}>,`);
			})
			.write(`): SubscriptionResult<${op.TypeName}>`)
			.block(() => {
				writer
					.writeLine(`return useSubscription<${op.TypeName}, ${op.VariablesTypeName}>(`)
					.indent(() => {
						writer
							.writeLine(`${op.DocumentName},`)
							.writeLine(`${SubscriptionArg},`);
					})
					.writeLine(');');
			})
			.blankLine();
	}

	return writer.toString().trimEnd();
}

/**
 * Generate a hook for accessing the Apollo GraphQL client.
 */
function GenerateUseGraphQLClientHook(): string {
	return `export function useGraphQLClient(): ApolloClient<NormalizedCacheObject> {
	return useApolloClient() as ApolloClient<NormalizedCacheObject>;
}`;
}

export function Plugin(
	_schema: GraphQLSchema,
	files: Types.DocumentFile[],
	_config: IRawPluginConfig,
	info: {
		outputFile?: string;
		allPlugins?: Types.ConfiguredPlugin[];
		[key: string]: unknown;
	},
): Types.Promisable<Types.PluginOutput> {
	ValidateRequiredPlugins(info);

	const OperationGroups = ExtractOperations(files);

	const ImportStatements = [
		'/* eslint-disable */',
		'import {',
		'	useQuery,',
		'	useMutation,',
		'	useSubscription,',
		'	useApolloClient,',
		'} from \'@apollo/client/react\';',
		'import type {',
		'	QueryHookOptions,',
		'	QueryResult,',
		'	MutationHookOptions,',
		'	MutationTuple,',
		'	SubscriptionHookOptions,',
		'	SubscriptionResult,',
		'	ApolloClient,',
		'	NormalizedCacheObject,',
		'} from \'@apollo/client/react\';',
	].join('\n');

	const QueryHooks = OperationGroups.Queries.length > 0
		? GenerateQueryHooks(OperationGroups.Queries)
		: '';

	const MutationHooks = OperationGroups.Mutations.length > 0
		? GenerateMutationHooks(OperationGroups.Mutations)
		: '';

	const SubscriptionHooks = OperationGroups.Subscriptions.length > 0
		? GenerateSubscriptionHooks(OperationGroups.Subscriptions)
		: '';

	const UseGraphQLClientHook = GenerateUseGraphQLClientHook();

	const ContentParts = [
		ImportStatements,
		QueryHooks,
		MutationHooks,
		SubscriptionHooks,
		UseGraphQLClientHook,
	].filter(Boolean);

	const Content = ContentParts.join('\n\n');

	return {
		content: Content,
	};
}
