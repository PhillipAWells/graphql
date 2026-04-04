/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/prefer-nullish-coalescing, prefer-destructuring */
import type { Types } from '@graphql-codegen/plugin-helpers';
import type { GraphQLSchema } from 'graphql';
import { OperationDefinitionNode } from 'graphql';

export interface IRawPluginConfig {
	// No additional fields for NGX variant
}

// Export under old name for backward compatibility
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
	const operations: IGQLOperationGroup = {
		queries: [],
		mutations: [],
		subscriptions: [],
	};

	for (const file of files) {
		if (!file.document) continue;

		for (const def of file.document.definitions) {
			if (
				def.kind === 'OperationDefinition' &&
				def.name &&
				def.operation
			) {
				const operationType = def.operation as 'query' | 'mutation' | 'subscription';
				const { TypeName, VariablesTypeName, DocumentName } =
					DetermineTypeNames(def.name.value, operationType);

				const operation: IGQLOperation = {
					Name: def.name.value,
					OperationType: operationType,
					IsOptionalVariables: IsOptionalVariables(def),
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
	const RequiredPlugins = [
		'typescript',
		'typescript-operations',
		'typed-document-node',
		'typescript-apollo-client-helpers',
	];

	const InstalledPlugins = (info.allPlugins || []).map((p) => {
		if (typeof p === 'string') return p;
		if (typeof p === 'object' && p !== null) {
			const key = Object.keys(p)[0];
			return key;
		}
		return '';
	});

	for (const required of RequiredPlugins) {
		if (!InstalledPlugins.includes(required)) {
			throw new Error(
				`Missing required plugin: ${required}. Required plugins: ${RequiredPlugins.join(', ')}`,
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
		.map((op) => {
			const variablesParam = op.IsOptionalVariables
				? `variables?: ${op.VariablesTypeName}`
				: `variables: ${op.VariablesTypeName}`;

			return `	public async ${op.Name}(${variablesParam}): QueryResultPromise<${op.TypeName}> {
		const result = await this.Apollo.query({
			query: ${op.DocumentName},
			variables,
			errorPolicy: 'all',
		});
		if (result.errors !== undefined && result.errors.length > 0) {
			throw new Error(result.errors[0].message);
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
		.map((op) => {
			const variablesParam = op.IsOptionalVariables
				? `variables?: ${op.VariablesTypeName}`
				: `variables: ${op.VariablesTypeName}`;

			return `	public async ${op.Name}(${variablesParam}): MutationResultPromise<${op.TypeName}> {
		const result = await this.Apollo.mutate({
			mutation: ${op.DocumentName},
			variables,
			errorPolicy: 'all',
		});
		if (result.errors !== undefined && result.errors.length > 0) {
			throw new Error(result.errors[0].message);
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
		.map((op) => {
			const variablesParam = op.IsOptionalVariables
				? `variables?: ${op.VariablesTypeName}`
				: `variables: ${op.VariablesTypeName}`;

			return `	public async ${op.Name}(handler: ${op.Name}EventHandler, ${variablesParam}): Promise<ZenObservable.Subscription> {
		const observable = this.Apollo.subscribe({
			query: ${op.DocumentName},
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
	if (operations.length === 0) {
		return '';
	}

	return operations
		.map((op) => {
			return `type ${op.Name}EventHandler = SubscriptionHandler<${op.TypeName}>;
export type ${op.Name}Event = SubscriptionResult<${op.TypeName}>;`;
		})
		.join('\n\n');
}

function GenerateApolloWrapperClass(operations: IGQLOperation[]): string {
	const allOperations = operations;

	const forwardingMethods = allOperations
		.map((op) => {
			const variablesParam = op.IsOptionalVariables
				? `variables?: ${op.VariablesTypeName}`
				: `variables: ${op.VariablesTypeName}`;

			const returnType =
				op.OperationType === 'query'
					? `QueryResultPromise<${op.TypeName}>`
					: op.OperationType === 'mutation'
						? `MutationResultPromise<${op.TypeName}>`
						: 'Promise<ZenObservable.Subscription>';

			const handlerParam =
				op.OperationType === 'subscription'
					? `handler: ${op.Name}EventHandler, `
					: '';

			const handlerArg = op.OperationType === 'subscription' ? 'handler, ' : '';
			return `	public async ${op.Name}(${handlerParam}${variablesParam}): ${returnType} {
		if (this.ConnectionState() !== 'Connected') {
			throw new Error('Not Connected');
		}
		return this.${op.OperationType === 'query' ? 'Queries' : op.OperationType === 'mutation' ? 'Mutations' : 'Subscriptions'}.${op.Name}(${handlerArg}variables);
	}`;
		})
		.join('\n\n');

	if (allOperations.length === 0) {
		return `@Injectable({ providedIn: 'root' })
export class ApolloWrapper extends GraphQLClient {
	public Queries!: ApolloQueries;
	public Mutations!: ApolloMutations;
	public Subscriptions!: ApolloSubscriptions;

	public constructor() {
		super();
		effect(() => {
			const apollo = this.Apollo();
			if (apollo === undefined) return;
			this.Queries = new ApolloQueries(apollo);
			this.Mutations = new ApolloMutations(apollo);
			this.Subscriptions = new ApolloSubscriptions(apollo);
		});
	}
}`;
	}

	return `@Injectable({ providedIn: 'root' })
export class ApolloWrapper extends GraphQLClient {
	public Queries!: ApolloQueries;
	public Mutations!: ApolloMutations;
	public Subscriptions!: ApolloSubscriptions;

	public constructor() {
		super();
		effect(() => {
			const apollo = this.Apollo();
			if (apollo === undefined) return;
			this.Queries = new ApolloQueries(apollo);
			this.Mutations = new ApolloMutations(apollo);
			this.Subscriptions = new ApolloSubscriptions(apollo);
		});
	}

${forwardingMethods}
}`;
}

export function plugin(
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
		'import { GraphQLClient } from \'@pawells/ngx-graphql\';',
		'import { effect, Injectable } from \'@angular/core\';',
		'import { ApolloClient, NormalizedCacheObject } from \'@apollo/client/core\';',
		'import * as ZenObservable from \'zen-observable-ts\';',
		OperationGroups.subscriptions.length > 0
			? 'import type { QueryResultPromise, MutationResultPromise, SubscriptionResult, SubscriptionHandler } from \'@pawells/graphql-common\';'
			: 'import type { QueryResultPromise, MutationResultPromise } from \'@pawells/graphql-common\';',
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

	const allOperations = [
		...OperationGroups.queries,
		...OperationGroups.mutations,
		...OperationGroups.subscriptions,
	];
	const WrapperClass = GenerateApolloWrapperClass(allOperations);

	const content = [
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
		content,
	};
}
