import type { Types } from '@graphql-codegen/plugin-helpers';
import type { GraphQLSchema } from 'graphql';
import { OperationDefinitionNode } from 'graphql';

export interface IRawPluginConfig {
	// No additional fields for TS variant
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
	const TypeOperationSuffix =
		operationType === 'query'
			? 'Query'
			: operationType === 'mutation'
				? 'Mutation'
				: 'Subscription';

	const TypeName = `${name}${TypeOperationSuffix}`;
	const VariablesTypeName = `${name}${TypeOperationSuffix}Variables`;
	const DocumentName = `${name}Document`;

	return { TypeName, VariablesTypeName, DocumentName };
}

function IsOptionalVariables(definition: OperationDefinitionNode): boolean {
	if (!definition.variableDefinitions || definition.variableDefinitions.length === 0) {
		return true;
	}

	return !definition.variableDefinitions.some((v) => v.type.kind === 'NonNullType');
}

function ExtractOperations(files: Types.DocumentFile[]): IGQLOperationGroup {
	const Operations: IGQLOperationGroup = {
		queries: [],
		mutations: [],
		subscriptions: [],
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
				const { TypeName, VariablesTypeName, DocumentName } =
					DetermineTypeNames(Def.name.value, OperationType);

				const Operation: IGQLOperation = {
					Name: Def.name.value,
					OperationType,
					IsOptionalVariables: IsOptionalVariables(Def),
					TypeName,
					VariablesTypeName,
					DocumentName,
				};

				if (OperationType === 'query') {
					Operations.queries.push(Operation);
				} else if (OperationType === 'mutation') {
					Operations.mutations.push(Operation);
				} else if (OperationType === 'subscription') {
					Operations.subscriptions.push(Operation);
				}
			}
		}
	}

	return Operations;
}

function ValidateRequiredPlugins(info: {
	allPlugins?: Types.ConfiguredPlugin[];
	[key: string]: unknown;
}): void {
	const RequiredPlugins = [
		'typescript',
		'typescript-operations',
		'typed-document-node',
		'typescript-apollo-client-helpers',
	];

	const AllPlugins = info.allPlugins ?? [];
	const InstalledPlugins = AllPlugins.map((plugin): string => {
		if (typeof plugin === 'string') {
			return plugin;
		}
		if (typeof plugin === 'object' && plugin !== null) {
			const [Key] = Object.entries(plugin);
			return Key?.[0] ?? '';
		}
		return '';
	});

	for (const Required of RequiredPlugins) {
		if (!InstalledPlugins.includes(Required)) {
			throw new Error(
				`Missing required plugin: ${Required}. Required plugins: ${RequiredPlugins.join(', ')}`,
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

	const Methods = operations
		.map((operation) => {
			const VariablesParam = operation.IsOptionalVariables
				? `variables?: ${operation.VariablesTypeName}`
				: `variables: ${operation.VariablesTypeName}`;

			return `	public async ${operation.Name}(${VariablesParam}): Promise<ApolloQueryResult<${operation.TypeName}>> {
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

${Methods}
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

	const Methods = operations
		.map((operation) => {
			const VariablesParam = operation.IsOptionalVariables
				? `variables?: ${operation.VariablesTypeName}`
				: `variables: ${operation.VariablesTypeName}`;

			return `	public async ${operation.Name}(${VariablesParam}): Promise<FetchResult<${operation.TypeName}>> {
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

${Methods}
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

	const Methods = operations
		.map((operation) => {
			const VariablesParam = operation.IsOptionalVariables
				? `variables?: ${operation.VariablesTypeName}`
				: `variables: ${operation.VariablesTypeName}`;

			return `	public async ${operation.Name}(${VariablesParam}, handler: ${operation.Name}EventHandler): Promise<ZenObservable.Subscription> {
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

${Methods}
}`;
}

function GenerateSubscriptionTypes(operations: IGQLOperation[]): string {
	if (operations.length === 0) {
		return '';
	}

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

	public get Apollo(): ApolloClient<NormalizedCacheObject> {
		return this.Handle.Apollo;
	}

	public Queries: ApolloQueries;
	public Mutations: ApolloMutations;
	public Subscriptions: ApolloSubscriptions;

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

	const OperationGroups = ExtractOperations(files);

	const ImportStatements = [
		'/* eslint-disable */',
		'import { GraphQLClient, GraphQLClientOptions } from \'@pawells/graphql-codegen-ts\';',
		'import { ApolloClient, NormalizedCacheObject, ApolloQueryResult, FetchResult } from \'@apollo/client/core\';',
		'import * as ZenObservable from \'zen-observable-ts\';',
		OperationGroups.subscriptions.length > 0
			? 'import type { SubscriptionHandler, SubscriptionResult } from \'@pawells/graphql-common\';'
			: '',
	]
		.filter(Boolean)
		.join('\n');

	const SubscriptionTypes =
		OperationGroups.subscriptions.length > 0
			? `\n\n${GenerateSubscriptionTypes(OperationGroups.subscriptions)}`
			: '';

	const QueriesClass = GenerateApolloQueriesClass(OperationGroups.queries);
	const MutationsClass = GenerateApolloMutationsClass(OperationGroups.mutations);
	const SubscriptionsClass = GenerateApolloSubscriptionsClass(
		OperationGroups.subscriptions,
	);
	const WrapperClass = GenerateApolloWrapperClass();

	const Content = [
		ImportStatements,
		SubscriptionTypes,
		'',
		QueriesClass,
		'',
		MutationsClass,
		'',
		SubscriptionsClass,
		'',
		WrapperClass,
	]
		.join('\n');

	return {
		content: Content,
	};
}

/** @deprecated Use Plugin instead */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const plugin = Plugin;
