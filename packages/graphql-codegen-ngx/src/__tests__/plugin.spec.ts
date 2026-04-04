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

	it('should throw when typescript plugin is missing', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser { user(id: "123") { id name } }'),
				location: 'test.graphql',
			},
		];

		expect(() =>
			plugin(baseSchema, files, {}, {
				allPlugins: [
					{ 'typescript-operations': {} },
					{ 'typed-document-node': {} },
					{ 'typescript-apollo-client-helpers': {} },
				],
			}),
		).toThrow('Missing required plugin: typescript');
	});

	it('should throw when typescript-operations plugin is missing', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser { user(id: "123") { id name } }'),
				location: 'test.graphql',
			},
		];

		expect(() =>
			plugin(baseSchema, files, {}, {
				allPlugins: [
					{ typescript: {} },
					{ 'typed-document-node': {} },
					{ 'typescript-apollo-client-helpers': {} },
				],
			}),
		).toThrow('Missing required plugin: typescript-operations');
	});

	it('should throw when typed-document-node plugin is missing', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser { user(id: "123") { id name } }'),
				location: 'test.graphql',
			},
		];

		expect(() =>
			plugin(baseSchema, files, {}, {
				allPlugins: [
					{ typescript: {} },
					{ 'typescript-operations': {} },
					{ 'typescript-apollo-client-helpers': {} },
				],
			}),
		).toThrow('Missing required plugin: typed-document-node');
	});

	it('should throw when typescript-apollo-client-helpers plugin is missing', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser { user(id: "123") { id name } }'),
				location: 'test.graphql',
			},
		];

		expect(() =>
			plugin(baseSchema, files, {}, {
				allPlugins: [
					{ typescript: {} },
					{ 'typescript-operations': {} },
					{ 'typed-document-node': {} },
				],
			}),
		).toThrow('Missing required plugin: typescript-apollo-client-helpers');
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
		expect(result.content).toContain('QueryResultPromise');
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
		expect(result.content).toContain('MutationResultPromise');
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

	it('should generate ApolloWrapper class that extends GraphQLClient', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser($id: ID!) { user(id: $id) { id } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('class ApolloWrapper extends GraphQLClient');
		expect(result.content).toContain('public Queries!: ApolloQueries');
		expect(result.content).toContain('public Mutations!: ApolloMutations');
		expect(result.content).toContain('public Subscriptions!: ApolloSubscriptions');
	});

	it('should have @Injectable decorator on ApolloWrapper', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser($id: ID!) { user(id: $id) { id } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('@Injectable({ providedIn: \'root\' })');
		expect(result.content).toMatch(/@Injectable.*\n.*export class ApolloWrapper/);
	});

	it('should use effect() in ApolloWrapper constructor', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser($id: ID!) { user(id: $id) { id } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('effect(() => {');
		expect(result.content).toContain('const apollo = this.Apollo();');
		expect(result.content).toContain('this.Queries = new ApolloQueries(apollo);');
		expect(result.content).toContain('this.Mutations = new ApolloMutations(apollo);');
		expect(result.content).toContain('this.Subscriptions = new ApolloSubscriptions(apollo);');
	});

	it('should have ConnectionState guard in forwarding methods', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser($id: ID!) { user(id: $id) { id } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('if (this.ConnectionState() !== \'Connected\') {');
		expect(result.content).toContain('throw new Error(\'Not Connected\');');
	});

	it('should import from @pawells/ngx-graphql', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser($id: ID!) { user(id: $id) { id } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('from \'@pawells/ngx-graphql\'');
	});

	it('should import effect and Injectable from @angular/core', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser($id: ID!) { user(id: $id) { id } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('from \'@angular/core\'');
		expect(result.content).toContain('effect');
		expect(result.content).toContain('Injectable');
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
		expect(result.content).toContain('@pawells/ngx-graphql');
		expect(result.content).toContain('@angular/core');
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

		expect(result.content).toContain('GetUserQuery');
		expect(result.content).toContain('CreateUserMutation');
		expect(result.content).toContain('OnUserAddedSubscription');
	});

	it('should generate subscription type aliases', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse(`
					subscription OnUserAdded {
						userAdded { id }
					}
					subscription OnUserUpdated {
						userUpdated(id: "123") { id }
					}
				`),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('type OnUserAddedEventHandler = SubscriptionHandler<OnUserAddedSubscription>;');
		expect(result.content).toContain('export type OnUserAddedEvent = SubscriptionResult<OnUserAddedSubscription>;');
		expect(result.content).toContain('type OnUserUpdatedEventHandler = SubscriptionHandler<OnUserUpdatedSubscription>;');
		expect(result.content).toContain('export type OnUserUpdatedEvent = SubscriptionResult<OnUserUpdatedSubscription>;');
	});

	it('should generate forwarding methods in ApolloWrapper with ConnectionState guard', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse(`
					query GetUser($id: ID!) {
						user(id: $id) { id }
					}
					mutation CreateUser($name: String!) {
						createUser(name: $name) { id }
					}
					subscription OnUserAdded {
						userAdded { id }
					}
				`),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		// Query forwarding
		expect(result.content).toContain('public async GetUser(variables: GetUserQueryVariables): QueryResultPromise<GetUserQuery>');
		expect(result.content).toContain('return this.Queries.GetUser(variables);');

		// Mutation forwarding
		expect(result.content).toContain('public async CreateUser(variables: CreateUserMutationVariables): MutationResultPromise<CreateUserMutation>');
		expect(result.content).toContain('return this.Mutations.CreateUser(variables);');

		// Subscription forwarding
		expect(result.content).toContain('public async OnUserAdded(handler: OnUserAddedEventHandler,');
		expect(result.content).toContain('return this.Subscriptions.OnUserAdded(handler, variables);');
	});

	it('should handle empty operations gracefully', () => {
		const files: Types.DocumentFile[] = [];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('class ApolloQueries');
		expect(result.content).toContain('class ApolloMutations');
		expect(result.content).toContain('class ApolloSubscriptions');
		expect(result.content).toContain('class ApolloWrapper extends GraphQLClient');
	});
});
