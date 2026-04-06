import type { Types } from '@graphql-codegen/plugin-helpers';
import type { GraphQLSchema } from 'graphql';
import { OperationDefinitionNode } from 'graphql';

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

function IsOptionalVariables(definition: OperationDefinitionNode): boolean {
	if (!definition.variableDefinitions || definition.variableDefinitions.length === 0) {
		return true;
	}

	return !definition.variableDefinitions.some((variableDef) => variableDef.type.kind === 'NonNullType');
}

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
			throw new Error(\`GraphQL error in ${operation.Name}: \${error.message}\`);
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
			throw new Error(\`GraphQL error in ${operation.Name}: \${error.message}\`);
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

function GenerateSubscriptionTypes(operations: IGQLOperation[]): string {
	return operations
		.map((op) => {
			return `export type ${op.Name}EventHandler = SubscriptionHandler<${op.TypeName}>;
export type ${op.Name}Event = SubscriptionResult<${op.TypeName}>;`;
		})
		.join('\n\n');
}

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
