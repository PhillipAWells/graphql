import { describe, it, expect } from 'vitest';
import type { IGraphQLClientOptions, TGraphQLClientOptions, GraphQLClientOptions } from '../client';

describe('GraphQLClient Type Safety', () => {
	it('should accept all valid IGraphQLClientOptions properties', () => {
		const options: IGraphQLClientOptions = {
			Name: 'TypeSafeClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			Token: 'test-token',
			TokenFunction: async () => 'dynamic-token',
			IsBrowser: true,
			LogGraphQLErrors: true,
			LogNetworkErrors: true,
		};

		expect(options.Name).toBe('TypeSafeClient');
		expect(options.HTTP_URI).toBe('http://localhost:4000/graphql');
		expect(options.WS_URI).toBe('ws://localhost:4000/graphql');
	});

	it('should allow TGraphQLClientOptions as alias for IGraphQLClientOptions', () => {
		const options: TGraphQLClientOptions = {
			Name: 'AliasTestClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		};

		expect(options.Name).toBe('AliasTestClient');
	});

	it('should allow GraphQLClientOptions as deprecated alias', () => {
		const options: GraphQLClientOptions = {
			Name: 'DeprecatedAliasClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		};

		expect(options.Name).toBe('DeprecatedAliasClient');
	});

	it('should have required Name property', () => {
		const options: IGraphQLClientOptions = {
			Name: 'RequiredNameClient',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		};

		expect(typeof options.Name).toBe('string');
	});

	it('should have required HTTP_URI property', () => {
		const options: IGraphQLClientOptions = {
			Name: 'Client',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		};

		expect(typeof options.HTTP_URI).toBe('string');
	});

	it('should have required WS_URI property', () => {
		const options: IGraphQLClientOptions = {
			Name: 'Client',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		};

		expect(typeof options.WS_URI).toBe('string');
	});

	it('should allow optional UseTokenFunction property', () => {
		const options: IGraphQLClientOptions = {
			Name: 'Client',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
		};

		expect(typeof options.UseTokenFunction).toBe('boolean');
	});

	it('should allow optional Token property', () => {
		const options: IGraphQLClientOptions = {
			Name: 'Client',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			Token: 'test-token',
		};

		expect(typeof options.Token).toBe('string');
	});

	it('should allow optional TokenFunction property', async () => {
		const tokenFn = async () => 'dynamic-token';
		const options: IGraphQLClientOptions = {
			Name: 'Client',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			TokenFunction: tokenFn,
		};

		const token = await options.TokenFunction!();
		expect(token).toBe('dynamic-token');
	});

	it('should allow optional IsBrowser property', () => {
		const options: IGraphQLClientOptions = {
			Name: 'Client',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			IsBrowser: true,
		};

		expect(typeof options.IsBrowser).toBe('boolean');
	});

	it('should allow optional LogGraphQLErrors property', () => {
		const options: IGraphQLClientOptions = {
			Name: 'Client',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			LogGraphQLErrors: true,
		};

		expect(typeof options.LogGraphQLErrors).toBe('boolean');
	});

	it('should allow optional LogNetworkErrors property', () => {
		const options: IGraphQLClientOptions = {
			Name: 'Client',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			LogNetworkErrors: true,
		};

		expect(typeof options.LogNetworkErrors).toBe('boolean');
	});

	it('should accept minimal configuration with only required properties', () => {
		const minimalOptions: IGraphQLClientOptions = {
			Name: 'Minimal',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
		};

		expect(minimalOptions.Name).toBeDefined();
		expect(minimalOptions.HTTP_URI).toBeDefined();
		expect(minimalOptions.WS_URI).toBeDefined();
	});

	it('should accept full configuration with all properties', () => {
		const fullOptions: IGraphQLClientOptions = {
			Name: 'Full',
			HTTP_URI: 'http://localhost:4000/graphql',
			WS_URI: 'ws://localhost:4000/graphql',
			UseTokenFunction: true,
			Token: 'token',
			TokenFunction: async () => 'token',
			IsBrowser: true,
			LogGraphQLErrors: true,
			LogNetworkErrors: true,
		};

		expect(Object.keys(fullOptions).length).toBeGreaterThanOrEqual(3);
	});
});
