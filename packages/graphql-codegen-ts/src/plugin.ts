import type { Types } from '@graphql-codegen/plugin-helpers';
import type { GraphQLSchema } from 'graphql';
import { OperationDefinitionNode } from 'graphql';

/**
 * Plugin configuration interface (currently has no configuration options).
 */
export interface IRawPluginConfig {
	// No additional fields for TS variant
}

// Export under old name for backward compatibility
// eslint-disable-next-line @typescript-eslint/naming-convention -- Legacy export name required for compatibility
export type RawPluginConfig = IRawPluginConfig;

interface IGQLOperation {
	Name: string;
	OperationType: 'query' | 'mutation' | 'subscription';
	IsOptionalVariables: boolean;
	TypeName: string;
	VariablesTypeName: string;
	DocumentName: string;
}

interface IGQLOperationGroup {
	queries: IGQLOperation[];
	mutations: IGQLOperation[];
	subscriptions: IGQLOperation[];
}

/**
 * Determines operation type names from the GraphQL document.
 */
function DetermineTypeNames(
	name: string,
	operationType: 'query' | 'mutation' | 'subscription',
): { TypeName: string; VariablesTypeName: string; DocumentName: string } {
	const typeOperationSuffix =
		operationType === 'query'
			? 'Query'
			: operationType === 'mutation'
				? 'Mutation'
				: 'Subscription';

	const typeName = `${name}${typeOperationSuffix}`;
	const variablesTypeName = `${name}${typeOperationSuffix}Variables`;
	const documentName = `${name}Document`;

	return { TypeName: typeName, VariablesTypeName: variablesTypeName, DocumentName: documentName };
}

/**
 * Checks if all operation variables are optional.
 */
function IsOptionalVariables(definition: OperationDefinitionNode): boolean {
	if (!definition.variableDefinitions || definition.variableDefinitions.length === 0) {
		return true;
	}

	return !definition.variableDefinitions.some((variableDef) => variableDef.type.kind === 'NonNullType');
}

/**
 * Extracts query, mutation, and subscription operations from the document.
 */
function ExtractOperations(files: Types.DocumentFile[]): IGQLOperationGroup {
	const operations: IGQLOperationGroup = {
		queries: [],
		mutations: [],
		subscriptions: [],
	};

	for (const file of files) {
		if (!file.document) continue;

		for (const definition of file.document.definitions) {
			if (
				definition.kind === 'OperationDefinition' &&
				definition.name &&
				definition.operation
			) {
				const operationType = definition.operation as 'query' | 'mutation' | 'subscription';
				const { TypeName, VariablesTypeName, DocumentName } =
					DetermineTypeNames(definition.name.value, operationType);

				const operation: IGQLOperation = {
					Name: definition.name.value,
					OperationType: operationType,
					IsOptionalVariables: IsOptionalVariables(definition),
					TypeName,
					VariablesTypeName,
					DocumentName,
				};

				if (operationType === 'query') {
					operations.queries.push(operation);
				} else if (operationType === 'mutation') {
					operations.mutations.push(operation);
				} else if (operationType === 'subscription') {
					operations.subscriptions.push(operation);
				}
			}
		}
	}

	return operations;
}

/**
 * Validates that all required co-plugins are present in the plugin list.
 */
function ValidateRequiredPlugins(info: {
	allPlugins?: Types.ConfiguredPlugin[];
	[key: string]: unknown;
}): void {
	const requiredPlugins = [
		'typescript',
		'typescript-operations',
		'typed-document-node',
		'typescript-apollo-client-helpers',
	];

	const allPlugins = info.allPlugins ?? [];
	const installedPlugins = allPlugins.map((plugin): string => {
		if (typeof plugin === 'string') {
			return plugin;
		}
		if (typeof plugin === 'object' && plugin !== null) {
			const entries = Object.entries(plugin) as Array<[string, unknown]>;
			if (entries.length === 0) {
				return '';
			}
			// eslint-disable-next-line prefer-destructuring -- Destructuring here would be less clear
			const pluginName = entries[0][0];
			return pluginName ?? '';
		}
		return '';
	});

	for (const required of requiredPlugins) {
		if (!installedPlugins.includes(required)) {
			throw new Error(
				`Missing required plugin: ${required}. Required plugins: ${requiredPlugins.join(', ')}`,
			);
		}
	}
}

/**
 * Generates the ApolloQueries class with one method per query operation.
 */
function GenerateApolloQueriesClass(operations: IGQLOperation[]): string {
	if (operations.length === 0) {
		return `export class ApolloQueries {
	private readonly Apollo: ApolloClient<any>;

	public constructor(apollo: ApolloClient<any>) {
		this.Apollo = apollo;
	}
}`;
	}

	const methods = operations
		.map((operation) => {
			const variablesParam = operation.IsOptionalVariables
				? `variables?: ${operation.VariablesTypeName}`
				: `variables: ${operation.VariablesTypeName}`;

			return `	public async ${operation.Name}(${variablesParam}): Promise<ApolloQueryResult<${operation.TypeName}>> {
		const result = await this.Apollo.query({
			query: ${operation.DocumentName},
			variables,
			errorPolicy: 'all',
		});
		if (result.errors && result.errors.length > 0) {
			const error = result.errors[0];
			throw new Error(\`GraphQL error in ${operation.Name}: \${error instanceof Error ? error.message : String(error)}\`);
		}
		return result;
	}`;
		})
		.join('\n\n');

	return `export class ApolloQueries {
	private readonly Apollo: ApolloClient<any>;

	public constructor(apollo: ApolloClient<any>) {
		this.Apollo = apollo;
	}

${methods}
}`;
}

/**
 * Generates the ApolloMutations class with one method per mutation operation.
 */
function GenerateApolloMutationsClass(operations: IGQLOperation[]): string {
	if (operations.length === 0) {
		return `export class ApolloMutations {
	private readonly Apollo: ApolloClient<any>;

	public constructor(apollo: ApolloClient<any>) {
		this.Apollo = apollo;
	}
}`;
	}

	const methods = operations
		.map((operation) => {
			const variablesParam = operation.IsOptionalVariables
				? `variables?: ${operation.VariablesTypeName}`
				: `variables: ${operation.VariablesTypeName}`;

			return `	public async ${operation.Name}(${variablesParam}): Promise<FetchResult<${operation.TypeName}>> {
		const result = await this.Apollo.mutate({
			mutation: ${operation.DocumentName},
			variables,
			errorPolicy: 'all',
		});
		if (result.errors && result.errors.length > 0) {
			const error = result.errors[0];
			throw new Error(\`GraphQL error in ${operation.Name}: \${error instanceof Error ? error.message : String(error)}\`);
		}
		return result;
	}`;
		})
		.join('\n\n');

	return `export class ApolloMutations {
	private readonly Apollo: ApolloClient<any>;

	public constructor(apollo: ApolloClient<any>) {
		this.Apollo = apollo;
	}

${methods}
}`;
}

/**
 * Generates the ApolloSubscriptions class with one method per subscription operation.
 */
function GenerateApolloSubscriptionsClass(operations: IGQLOperation[]): string {
	if (operations.length === 0) {
		return `export class ApolloSubscriptions {
	private readonly Apollo: ApolloClient<any>;

	public constructor(apollo: ApolloClient<any>) {
		this.Apollo = apollo;
	}
}`;
	}

	const methods = operations
		.map((operation) => {
			const variablesParam = operation.IsOptionalVariables
				? `variables?: ${operation.VariablesTypeName}`
				: `variables: ${operation.VariablesTypeName}`;

			return `	public async ${operation.Name}(${variablesParam}, handler: ${operation.Name}EventHandler): Promise<ZenObservable.Subscription> {
		const observable = this.Apollo.subscribe({
			query: ${operation.DocumentName},
			variables,
			errorPolicy: 'all',
		});
		return observable.subscribe(handler);
	}`;
		})
		.join('\n\n');

	return `export class ApolloSubscriptions {
	private readonly Apollo: ApolloClient<any>;

	public constructor(apollo: ApolloClient<any>) {
		this.Apollo = apollo;
	}

${methods}
}`;
}

/**
 * Generates TypeScript type aliases for subscription event handlers.
 */
function GenerateSubscriptionTypes(operations: IGQLOperation[]): string {
	return operations
		.map((op) => {
			return `export type ${op.Name}EventHandler = SubscriptionHandler<${op.TypeName}>;
export type ${op.Name}Event = SubscriptionResult<${op.TypeName}>;`;
		})
		.join('\n\n');
}

/**
 * Generates the ApolloWrapper class that ties Queries, Mutations, and Subscriptions together.
 */
function GenerateApolloWrapperClass(): string {
	return `export class ApolloWrapper {
	public readonly Handle: GraphQLClient;
	public readonly Queries: ApolloQueries;
	public readonly Mutations: ApolloMutations;
	public readonly Subscriptions: ApolloSubscriptions;

	public get Apollo(): ApolloClient<NormalizedCacheObject> {
		return this.Handle.Apollo;
	}

	public constructor(options: GraphQLClientOptions) {
		this.Handle = new GraphQLClient(options);
		this.Queries = new ApolloQueries(this.Apollo);
		this.Mutations = new ApolloMutations(this.Apollo);
		this.Subscriptions = new ApolloSubscriptions(this.Apollo);
	}
}`;
}

/**
 * GraphQL Code Generator plugin entry point for TypeScript Apollo client code generation.
 *
 * This plugin generates type-safe Apollo client wrapper classes (ApolloQueries, ApolloMutations,
 * ApolloSubscriptions, and ApolloWrapper) from GraphQL document files.
 *
 * Requires the following co-plugins to be installed:
 * - `typescript`
 * - `typescript-operations`
 * - `typed-document-node`
 * - `typescript-apollo-client-helpers`
 *
 * All required co-plugins are validated at code generation time.
 * Missing plugins will cause code generation to fail with a descriptive error.
 *
 * @param _schema The GraphQL schema (unused).
 * @param files The GraphQL document files to process.
 * @param _config Plugin configuration (currently unused).
 * @param info Plugin metadata including the list of all configured plugins.
 * @returns Generated TypeScript code containing Apollo client wrapper classes.
 */
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

	const operationGroups = ExtractOperations(files);

	const importStatements = [
		'/* eslint-disable */',
		'import { GraphQLClient, GraphQLClientOptions } from \'@pawells/graphql-codegen-ts\';',
		'import { ApolloClient, NormalizedCacheObject, ApolloQueryResult, FetchResult } from \'@apollo/client/core\';',
		'import * as ZenObservable from \'zen-observable-ts\';',
		operationGroups.subscriptions.length > 0
			? 'import type { SubscriptionHandler, SubscriptionResult } from \'@pawells/graphql-common\';'
			: '',
	]
		.filter(Boolean)
		.join('\n');

	const subscriptionTypes =
		operationGroups.subscriptions.length > 0
			? `\n\n${GenerateSubscriptionTypes(operationGroups.subscriptions)}`
			: '';

	const queriesClass = GenerateApolloQueriesClass(operationGroups.queries);
	const mutationsClass = GenerateApolloMutationsClass(operationGroups.mutations);
	const subscriptionsClass = GenerateApolloSubscriptionsClass(
		operationGroups.subscriptions,
	);
	const wrapperClass = GenerateApolloWrapperClass();

	const content = [
		importStatements,
		subscriptionTypes,
		'',
		queriesClass,
		'',
		mutationsClass,
		'',
		subscriptionsClass,
		'',
		wrapperClass,
	]
		.join('\n');

	return {
		content,
	};
}

/** @deprecated Use Plugin instead */
export const plugin = Plugin;
