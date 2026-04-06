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
			plugin(baseSchema, files, {}, { allPlugins: [{ 'typescript-operations': {} }] }),
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
			plugin(baseSchema, files, {}, { allPlugins: [{ typescript: {} }] }),
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
			plugin(baseSchema, files, {}, { allPlugins: [{ typescript: {} }, { 'typescript-operations': {} }] }),
		).toThrow('Missing required plugin: typed-document-node');
	});

	it('should NOT throw when typescript-apollo-client-helpers is missing', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser { user(id: "123") { id name } }'),
				location: 'test.graphql',
			},
		];

		expect(() =>
			plugin(baseSchema, files, {}, baseInfo),
		).not.toThrow();
	});

	it('should generate useGetUserQuery hook for a query operation', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser($id: ID!) { user(id: $id) { id name } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('useGetUserQuery');
		expect(result.content).toContain('GetUserQuery');
		expect(result.content).toContain('GetUserQueryVariables');
		expect(result.content).toContain('GetUserDocument');
	});

	it('should generate useCreateUserMutation hook for a mutation operation', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('mutation CreateUser($name: String!) { createUser(name: $name) { id name } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('useCreateUserMutation');
		expect(result.content).toContain('CreateUserMutation');
		expect(result.content).toContain('CreateUserMutationVariables');
		expect(result.content).toContain('CreateUserDocument');
	});

	it('should generate useOnUserAddedSubscription hook for a subscription operation', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('subscription OnUserAdded { userAdded { id name } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('useOnUserAddedSubscription');
		expect(result.content).toContain('OnUserAddedSubscription');
		expect(result.content).toContain('OnUserAddedSubscriptionVariables');
		expect(result.content).toContain('OnUserAddedDocument');
	});

	it('should generate useGraphQLClient hook in output', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser { users { id } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('useGraphQLClient');
		expect(result.content).toContain('ApolloClient<NormalizedCacheObject>');
	});

	it('should mark query variables as required when operation has required variables', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser($id: ID!) { user(id: $id) { id name } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('variables: GetUserQueryVariables');
	});

	it('should mark query variables as optional when no required variables', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUsers { users { id name } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('variables?: GetUsersQueryVariables');
	});

	it('should NOT require variables for mutations', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('mutation CreateUser($name: String!) { createUser(name: $name) { id name } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		// Mutations should not have variables as a hook parameter
		expect(result.content).toContain('useCreateUserMutation(');
		expect(result.content).toContain('options?: MutationHookOptions');
	});

	it('should generate imports from @apollo/client/react', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser { users { id } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('@apollo/client/react');
		expect(result.content).toContain('useQuery');
		expect(result.content).toContain('useMutation');
		expect(result.content).toContain('useSubscription');
		expect(result.content).toContain('useApolloClient');
	});

	it('should NOT import from @apollo/client/core', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser { users { id } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).not.toContain('@apollo/client/core');
	});

	it('should generate eslint-disable comment', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser { users { id } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toMatch(/\/\* eslint-disable \*\//);
	});

	it('should generate correct hook type names for all operation types', () => {
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

		// Check Query hook naming
		expect(result.content).toContain('useGetUserQuery');
		expect(result.content).toContain('GetUserQuery');
		expect(result.content).toContain('GetUserQueryVariables');
		expect(result.content).toContain('GetUserDocument');

		// Check Mutation hook naming
		expect(result.content).toContain('useCreateUserMutation');
		expect(result.content).toContain('CreateUserMutation');
		expect(result.content).toContain('CreateUserMutationVariables');
		expect(result.content).toContain('CreateUserDocument');

		// Check Subscription hook naming
		expect(result.content).toContain('useOnUserAddedSubscription');
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

		expect(result.content).toContain('useGetUserQuery');
		expect(result.content).toContain('useGetUsersQuery');
		expect(result.content).toContain('useCreateUserMutation');
		expect(result.content).toContain('useOnUserAddedSubscription');
		expect(result.content).toContain('useGraphQLClient');
	});

	it('should handle empty operation files', () => {
		const files: Types.DocumentFile[] = [];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		// Should only have useGraphQLClient hook when there are no operations
		expect(result.content).toContain('useGraphQLClient');
		expect(result.content).toContain('@apollo/client/react');
	});

	it('should return prepend and content in PluginOutput', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('query GetUser { users { id } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			prepend?: string[];
			content: string;
		};

		expect(result.prepend).toBeDefined();
		expect(Array.isArray(result.prepend)).toBe(true);
		expect(result.prepend?.length).toBeGreaterThan(0);
		expect(result.content).toBeDefined();
	});

	it('should include QueryHookOptions, MutationHookOptions, and SubscriptionHookOptions types', () => {
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

		expect(result.content).toContain('QueryHookOptions');
		expect(result.content).toContain('QueryResult');
		expect(result.content).toContain('MutationHookOptions');
		expect(result.content).toContain('MutationTuple');
		expect(result.content).toContain('SubscriptionHookOptions');
		expect(result.content).toContain('SubscriptionResult');
	});

	it('should handle subscription with required variables', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('subscription OnUserUpdated($id: ID!) { userUpdated(id: $id) { id } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('useOnUserUpdatedSubscription');
		expect(result.content).toContain('variables: OnUserUpdatedSubscriptionVariables');
	});

	it('should handle subscription with optional variables', () => {
		const files: Types.DocumentFile[] = [
			{
				document: parse('subscription OnUserAdded { userAdded { id } }'),
				location: 'test.graphql',
			},
		];

		const result = plugin(baseSchema, files, {}, baseInfo) as {
			content: string;
		};

		expect(result.content).toContain('useOnUserAddedSubscription');
		expect(result.content).toContain('variables?: OnUserAddedSubscriptionVariables');
	});
});
