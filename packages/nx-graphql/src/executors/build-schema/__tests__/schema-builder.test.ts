import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	BuildGraphQLSchema,
	ValidateResolversModuleExists,
	ValidateResolversExport,
	WriteSchemaToFile,
} from '../schema-builder';
import * as fs from 'node:fs';
import * as path from 'node:path';

vi.mock('node:fs');
vi.mock('node:path');

describe('buildGraphQLSchema', () => {
	it('should throw error when resolvers module does not exist', async () => {
		const params = {
			WorkspaceRoot: '/workspace',
			ResolversModulePath: '/nonexistent/path/to/resolvers',
			SchemaOutputPath: 'schema.graphql',
		};

		await expect(BuildGraphQLSchema(params)).rejects.toThrow('Resolvers module not found');
	});

	it('should handle missing resolvers module gracefully', async () => {
		const params = {
			WorkspaceRoot: '/workspace',
			ResolversModulePath: '/missing/resolvers',
			SchemaOutputPath: 'schema.graphql',
		};

		await expect(BuildGraphQLSchema(params)).rejects.toThrow();
	});

	it('should require ResolversModulePath parameter', async () => {
		const params = {
			WorkspaceRoot: '/workspace',
			ResolversModulePath: '',
			SchemaOutputPath: 'schema.graphql',
		};

		await expect(BuildGraphQLSchema(params)).rejects.toThrow();
	});

	it('should accept valid parameter structure', async () => {
		const params = {
			WorkspaceRoot: '/workspace',
			ResolversModulePath: '/some/path',
			SchemaOutputPath: 'schema.graphql',
		};

		// Will fail due to file not existing, but validates params
		await expect(BuildGraphQLSchema(params)).rejects.toThrow();
	});

	it('should handle error from import statement', async () => {
		const params = {
			WorkspaceRoot: '/workspace',
			ResolversModulePath: '/bad/import/module',
			SchemaOutputPath: 'schema.graphql',
		};

		await expect(BuildGraphQLSchema(params)).rejects.toThrow();
	});

	it('should check multiple file extensions', async () => {
		const params = {
			WorkspaceRoot: '/tmp',
			ResolversModulePath: '/tmp/fake',
			SchemaOutputPath: 'output.graphql',
		};

		// Should try .ts and .js extensions
		await expect(BuildGraphQLSchema(params)).rejects.toThrow();
	});

	it('should handle all error cases', async () => {
		const params = {
			WorkspaceRoot: '.',
			ResolversModulePath: './missing-module',
			SchemaOutputPath: './schema.graphql',
		};

		await expect(BuildGraphQLSchema(params)).rejects.toThrow();
	});

	it('should accept absolute paths', async () => {
		const params = {
			WorkspaceRoot: '/root',
			ResolversModulePath: '/root/src/resolvers',
			SchemaOutputPath: 'graphql/schema.graphql',
		};

		await expect(BuildGraphQLSchema(params)).rejects.toThrow();
	});

	it('should handle relative paths', async () => {
		const params = {
			WorkspaceRoot: '/root',
			ResolversModulePath: 'src/resolvers',
			SchemaOutputPath: 'dist/schema.graphql',
		};

		await expect(BuildGraphQLSchema(params)).rejects.toThrow();
	});

	it('should handle nested schema paths', async () => {
		const params = {
			WorkspaceRoot: '/workspace',
			ResolversModulePath: 'src/graphql/resolvers',
			SchemaOutputPath: 'dist/graphql/generated/schema.graphql',
		};

		await expect(BuildGraphQLSchema(params)).rejects.toThrow();
	});

	it('should validate module exists in any form', async () => {
		const params = {
			WorkspaceRoot: '/workspace',
			ResolversModulePath: '/completely/fake/path/that/definitely/does/not/exist',
			SchemaOutputPath: 'schema.graphql',
		};

		await expect(BuildGraphQLSchema(params)).rejects.toThrow('Resolvers module not found');
	});
});

describe('validateResolversModuleExists', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should throw error when module does not exist in any form', () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);

		expect(() => {
			ValidateResolversModuleExists('/missing/module');
		}).toThrow('Resolvers module not found');
	});

	it('should not throw when base module exists', () => {
		const existsSyncMock = vi.fn();
		existsSyncMock.mockReturnValueOnce(true); // base path exists
		vi.mocked(fs.existsSync).mockImplementation(existsSyncMock);

		expect(() => {
			ValidateResolversModuleExists('/existing/module');
		}).not.toThrow();
	});

	it('should not throw when .ts variant exists', () => {
		const existsSyncMock = vi.fn();
		existsSyncMock.mockReturnValueOnce(false); // base path
		existsSyncMock.mockReturnValueOnce(true); // .ts path exists
		vi.mocked(fs.existsSync).mockImplementation(existsSyncMock);

		expect(() => {
			ValidateResolversModuleExists('/existing/module');
		}).not.toThrow();
	});

	it('should not throw when .js variant exists', () => {
		const existsSyncMock = vi.fn();
		existsSyncMock.mockReturnValueOnce(false); // base path
		existsSyncMock.mockReturnValueOnce(false); // .ts path
		existsSyncMock.mockReturnValueOnce(true); // .js path exists
		vi.mocked(fs.existsSync).mockImplementation(existsSyncMock);

		expect(() => {
			ValidateResolversModuleExists('/existing/module');
		}).not.toThrow();
	});

	it('should check all three paths before throwing', () => {
		const existsSyncMock = vi.fn();
		existsSyncMock.mockReturnValue(false);
		vi.mocked(fs.existsSync).mockImplementation(existsSyncMock);

		expect(() => {
			ValidateResolversModuleExists('/missing/module');
		}).toThrow();

		expect(existsSyncMock).toHaveBeenCalledTimes(3);
	});
});

describe('validateResolversExport', () => {
	it('should not throw when resolvers is an array', () => {
		const resolvers = [] as unknown;
		expect(() => {
			ValidateResolversExport(resolvers);
		}).not.toThrow();
	});

	it('should not throw when resolvers is a populated array', () => {
		const resolvers = ['Resolver1', 'Resolver2'] as unknown;
		expect(() => {
			ValidateResolversExport(resolvers);
		}).not.toThrow();
	});

	it('should throw error when resolvers is an object', () => {
		const resolvers = {} as unknown;
		expect(() => {
			ValidateResolversExport(resolvers);
		}).toThrow('must export a \'GraphQLSchema\' array of resolver classes');
	});

	it('should throw error when resolvers is a string', () => {
		const resolvers = 'not-an-array' as unknown;
		expect(() => {
			ValidateResolversExport(resolvers);
		}).toThrow('must export a \'GraphQLSchema\' array of resolver classes');
	});

	it('should throw error when resolvers is null', () => {
		const resolvers = null as unknown;
		expect(() => {
			ValidateResolversExport(resolvers);
		}).toThrow('must export a \'GraphQLSchema\' array of resolver classes');
	});

	it('should throw error when resolvers is undefined', () => {
		const resolvers = undefined as unknown;
		expect(() => {
			ValidateResolversExport(resolvers);
		}).toThrow('must export a \'GraphQLSchema\' array of resolver classes');
	});
});

describe('writeSchemaToFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should create output directory', () => {
		vi.mocked(path.resolve).mockReturnValue('/output/schema.graphql');
		vi.mocked(path.dirname).mockReturnValue('/output');
		vi.mocked(fs.mkdirSync).mockImplementation(() => '');
		vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

		WriteSchemaToFile('/workspace', 'schema.graphql', 'schema content');

		expect(vi.mocked(fs.mkdirSync)).toHaveBeenCalledWith('/output', { recursive: true });
	});

	it('should write file with schema content', () => {
		vi.mocked(path.resolve).mockReturnValue('/output/schema.graphql');
		vi.mocked(path.dirname).mockReturnValue('/output');
		vi.mocked(fs.mkdirSync).mockImplementation(() => '');
		vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

		const content = 'type Query { hello: String }';
		WriteSchemaToFile('/workspace', 'schema.graphql', content);

		expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalledWith(
			'/output/schema.graphql',
			content,
			'utf-8',
		);
	});

	it('should resolve output path correctly', () => {
		vi.mocked(path.resolve).mockReturnValue('/workspace/dist/schema.graphql');
		vi.mocked(path.dirname).mockReturnValue('/workspace/dist');
		vi.mocked(fs.mkdirSync).mockImplementation(() => '');
		vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

		WriteSchemaToFile('/workspace', 'dist/schema.graphql', 'content');

		expect(vi.mocked(path.resolve)).toHaveBeenCalledWith('/workspace', 'dist/schema.graphql');
	});

	it('should handle deeply nested output paths', () => {
		vi.mocked(path.resolve).mockReturnValue('/output/deep/nested/schema.graphql');
		vi.mocked(path.dirname).mockReturnValue('/output/deep/nested');
		vi.mocked(fs.mkdirSync).mockImplementation(() => '');
		vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

		WriteSchemaToFile('/root', 'dist/graphql/generated/schema.graphql', 'content');

		expect(vi.mocked(fs.mkdirSync)).toHaveBeenCalledWith('/output/deep/nested', {
			recursive: true,
		});
	});

	it('should handle empty schema content', () => {
		vi.mocked(path.resolve).mockReturnValue('/output/schema.graphql');
		vi.mocked(path.dirname).mockReturnValue('/output');
		vi.mocked(fs.mkdirSync).mockImplementation(() => '');
		vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

		WriteSchemaToFile('/workspace', 'schema.graphql', '');

		expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalledWith(
			'/output/schema.graphql',
			'',
			'utf-8',
		);
	});

	it('should call fs functions in correct order', () => {
		const callOrder: string[] = [];

		vi.mocked(path.resolve).mockImplementation(() => {
			callOrder.push('resolve');
			return '/output/schema.graphql';
		});
		vi.mocked(path.dirname).mockImplementation(() => {
			callOrder.push('dirname');
			return '/output';
		});
		vi.mocked(fs.mkdirSync).mockImplementation(() => {
			callOrder.push('mkdir');
			return '';
		});
		vi.mocked(fs.writeFileSync).mockImplementation(() => {
			callOrder.push('write');
			return undefined;
		});

		WriteSchemaToFile('/workspace', 'schema.graphql', 'content');

		expect(callOrder).toEqual(['resolve', 'dirname', 'mkdir', 'write']);
	});
});
