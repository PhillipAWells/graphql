import { buildSchema, parse } from 'graphql';
import type { Types } from '@graphql-codegen/plugin-helpers';
import { describe, it, expect } from 'vitest';
import { plugin } from '../plugin';

describe('plugin', () => {
	const baseSchema = buildSchema(`
		type Query {
			user(id: ID!): User
			users: [User!]!
		}
		type Mutation {
			createUser(name: String!): User
			updateUser(id: ID!, name: String): User
		}
		type Subscription {
			userAdded: User
			userUpdated(id: ID!): User
		}
		type User {
			id: ID!
			name: String!
			email: String
		}
	`);

	const baseInfo: {
		allPlugins?: Types.ConfiguredPlugin[];
		[key: string]: unknown;
	} = {
		allPlugins: [
			{ typescript: {} } as Types.ConfiguredPlugin,
			{ 'typescript-operations': {} } as Types.ConfiguredPlugin,
			{ 'typed-document-node': {} } as Types.ConfiguredPlugin,
			{ 'typescript-apollo-client-helpers': {} } as Types.ConfiguredPlugin,
		],
	};

	it('should throw when required plugins are missing', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser { user(id: "123") { id name } }'),
				location: 'test.graphql',
			},
		];

		expect(() =>
			plugin(baseSchema, files, {}, { allPlugins: [{ typescript: {} }] }),
		).toThrow('Missing required plugin');
	});

	it('should generate classes for queries', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse(`
					query GetUser($id: ID!) {
						user(id: $id) { id name }
					}
					query GetUsers {
						users { id name }
					}
				`),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('class ApolloQueries');
		expect(result.content).toContain('GetUser');
		expect(result.content).toContain('GetUsers');
		expect(result.content).toContain('ApolloQueryResult');
	});

	it('should generate classes for mutations', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse(`
					mutation CreateUser($name: String!) {
						createUser(name: $name) { id name }
					}
				`),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('class ApolloMutations');
		expect(result.content).toContain('CreateUser');
		expect(result.content).toContain('FetchResult');
	});

	it('should generate classes for subscriptions', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse(`
					subscription OnUserAdded {
						userAdded { id name }
					}
				`),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('class ApolloSubscriptions');
		expect(result.content).toContain('OnUserAdded');
		expect(result.content).toContain('SubscriptionHandler');
		expect(result.content).toContain('SubscriptionResult');
	});

	it('should generate ApolloWrapper class', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser($id: ID!) { user(id: $id) { id } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('class ApolloWrapper');
		expect(result.content).toContain('public readonly Queries: ApolloQueries');
		expect(result.content).toContain('public readonly Mutations: ApolloMutations');
		expect(result.content).toContain('public readonly Subscriptions: ApolloSubscriptions');
	});

	it('should mark variables as optional when no required variables', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse(`
					query GetUsers {
						users { id name }
					}
				`),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('variables?: GetUsersQueryVariables');
	});

	it('should mark variables as required when operation has required variables', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse(`
					query GetUser($id: ID!) {
						user(id: $id) { id name }
					}
				`),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('variables: GetUserQueryVariables');
	});

	it('should generate import statements with eslint-disable', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query Test { users { id } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toMatch(/\/\* eslint-disable \*\//);
		expect(result.content).toContain('@pawells/graphql-codegen-ts');
		expect(result.content).toContain('@apollo/client/core');
		expect(result.content).toContain('zen-observable-ts');
	});

	it('should generate correct type names for operations', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse(`
					query GetUser { users { id } }
					mutation CreateUser { createUser(name: "test") { id } }
					subscription OnUserAdded { userAdded { id } }
				`),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		// Check Query type naming
		expect(result.content).toContain('GetUserQuery');
		expect(result.content).toContain('GetUserQueryVariables');
		expect(result.content).toContain('GetUserDocument');

		// Check Mutation type naming
		expect(result.content).toContain('CreateUserMutation');
		expect(result.content).toContain('CreateUserMutationVariables');
		expect(result.content).toContain('CreateUserDocument');

		// Check Subscription type naming
		expect(result.content).toContain('OnUserAddedSubscription');
		expect(result.content).toContain('OnUserAddedSubscriptionVariables');
		expect(result.content).toContain('OnUserAddedDocument');
	});

	it('should handle multiple operations of different types', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse(`
					query GetUser($id: ID!) { user(id: $id) { id } }
					query GetUsers { users { id } }
					mutation CreateUser($name: String!) { createUser(name: $name) { id } }
					subscription OnUserAdded { userAdded { id } }
				`),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('class ApolloQueries');
		expect(result.content).toContain('class ApolloMutations');
		expect(result.content).toContain('class ApolloSubscriptions');
		expect(result.content).toContain('class ApolloWrapper');
	});

	it('should handle empty operation files', () => {
		const files: Types.DocumentFile[] = [];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('class ApolloQueries');
		expect(result.content).toContain('class ApolloMutations');
		expect(result.content).toContain('class ApolloSubscriptions');
		expect(result.content).toContain('class ApolloWrapper');
	});

	it('should generate subscription event type aliases', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse(`
					subscription OnUserAdded { userAdded { id } }
					subscription OnUserUpdated { userUpdated(id: "1") { id } }
				`),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('export type OnUserAddedEventHandler');
		expect(result.content).toContain('export type OnUserAddedEvent');
		expect(result.content).toContain('export type OnUserUpdatedEventHandler');
		expect(result.content).toContain('export type OnUserUpdatedEvent');
	});

	it('should handle plugins as string type in ValidateRequiredPlugins', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser { users { id } }'),
				location: 'test.graphql',
			},
		];

		// Test with plugins as strings
		const infoWithStringPlugins = {
			allPlugins: [
				'typescript' as any,
				'typescript-operations' as any,
				'typed-document-node' as any,
				'typescript-apollo-client-helpers' as any,
			],
		};

		const result = plugin(baseSchema, files, {}, infoWithStringPlugins) as {
			content: string;
		};

		expect(result.content).toContain('class ApolloQueries');
	});

	it('should handle plugins with mixed types in ValidateRequiredPlugins', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser { users { id } }'),
				location: 'test.graphql',
			},
		];

		// Test with mixed plugin types
		const infoWithMixedPlugins = {
			allPlugins: [
				{ typescript: {} } as Types.ConfiguredPlugin,
				'typescript-operations' as any,
				{ 'typed-document-node': {} } as Types.ConfiguredPlugin,
				'typescript-apollo-client-helpers' as any,
			],
		};

		const result = plugin(baseSchema, files, {}, infoWithMixedPlugins) as {
			content: string;
		};

		expect(result.content).toContain('class ApolloQueries');
	});

	it('should handle unknown plugin type by returning empty string', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser { users { id } }'),
				location: 'test.graphql',
			},
		];

		// Test with plugin as unknown type (array, boolean, etc)
		const infoWithUnknownPlugins = {
			allPlugins: [
				{ typescript: {} } as Types.ConfiguredPlugin,
				'typescript-operations' as any,
				{ 'typed-document-node': {} } as Types.ConfiguredPlugin,
				{ 'typescript-apollo-client-helpers': {} } as Types.ConfiguredPlugin,
				[] as any, // Unknown type - will result in empty string
			],
		};

		// Should work fine - the unknown type will just produce empty string
		const result = plugin(baseSchema, files, {}, infoWithUnknownPlugins) as {
			content: string;
		};

		expect(result.content).toContain('class ApolloQueries');
	});

	it('should generate no subscription types when there are no subscriptions', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse(`
					query GetUser { users { id } }
					mutation CreateUser { createUser(name: "test") { id } }
				`),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		// Should not generate subscription event types
		expect(result.content).not.toContain('EventHandler');
		expect(result.content).toContain('class ApolloQueries');
		expect(result.content).toContain('class ApolloMutations');
	});

	it('should generate ApolloWrapper with proper initialization', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser { users { id } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('export class ApolloWrapper');
		expect(result.content).toContain('public readonly Handle: GraphQLClient');
		expect(result.content).toContain('public readonly Queries: ApolloQueries');
		expect(result.content).toContain('public readonly Mutations: ApolloMutations');
		expect(result.content).toContain('public readonly Subscriptions: ApolloSubscriptions');
	});

	it('should handle operations without names correctly', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse(`
					query { users { id } }
				`),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		// Anonymous operations should not be included
		expect(result.content).toContain('class ApolloQueries');
	});

	it('should properly format method signatures with required variables', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse(`
					query GetUserWithId($id: ID!, $name: String!) {
						user(id: $id) { id name }
					}
				`),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('variables: GetUserWithIdQueryVariables');
		expect(result.content).not.toContain('variables?:');
	});

	it('should properly format error handling in generated methods', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse(`
					query GetUser { users { id } }
				`),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('if (result.errors && result.errors.length > 0)');
		expect(result.content).toContain('throw new Error');
	});

	it('should import subscription types only when needed', () => {
		const queryOnlyFiles: Types.DocumentFile[] = [
			{
				document: parse('query GetUser { users { id } }'),
				location: 'test.graphql',
			},
		];

		const resultWithoutSubscriptions = plugin(baseSchema, queryOnlyFiles, {}, baseInfo) as {
			content: string;
		};

		expect(resultWithoutSubscriptions.content).not.toContain('SubscriptionHandler');
		expect(resultWithoutSubscriptions.content).not.toContain('@pawells/graphql-common');

		const subscriptionFiles: Types.DocumentFile[] = [
			{
				document: parse('subscription OnUserAdded { userAdded { id } }'),
				location: 'test.graphql',
			},
		];

		const resultWithSubscriptions = plugin(baseSchema, subscriptionFiles, {}, baseInfo) as {
			content: string;
		};

		expect(resultWithSubscriptions.content).toContain('SubscriptionHandler');
		expect(resultWithSubscriptions.content).toContain('@pawells/graphql-common');
	});

	it('should handle plugins that are numbers or other non-string/non-object types', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser { users { id } }'),
				location: 'test.graphql',
			},
		];

		// Test with non-string, non-object plugin values (using any to bypass type system)
		const infoWithNumericPlugin = {
			allPlugins: [
				{ typescript: {} } as Types.ConfiguredPlugin,
				'typescript-operations' as any,
				{ 'typed-document-node': {} } as Types.ConfiguredPlugin,
				'typescript-apollo-client-helpers' as any,
				123 as any, // Numeric plugin
			],
		};

		const result = plugin(baseSchema, files, {}, infoWithNumericPlugin) as {
			content: string;
		};

		expect(result.content).toContain('class ApolloQueries');
	});
});
