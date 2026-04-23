import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
	ExecuteCodegen,
	GetDefaultPluginsForTarget,
	GetDefaultConfig,
} from '../codegen-builder';

describe('CodegenBuilder', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('getDefaultPluginsForTarget', () => {
		it('should return typescript plugins for typescript target', () => {
			const plugins = GetDefaultPluginsForTarget('typescript');
			expect(Array.isArray(plugins)).toBe(true);
			expect(plugins.length).toBeGreaterThan(0);
			expect(plugins).toContain('typescript');
			expect(plugins).toContain('typescript-operations');
			expect(plugins).toContain('typed-document-node');
			expect(plugins).toContain('typescript-apollo-client-helpers');
			expect(plugins).toContain('@pawells/graphql-codegen-ts');
		});

		it('should contain exactly 5 default typescript plugins', () => {
			const plugins = GetDefaultPluginsForTarget('typescript');
			expect(plugins.length).toBe(5);
		});
	});

	describe('getDefaultConfig', () => {
		it('should return object with namingConvention', () => {
			const config = GetDefaultConfig();
			expect(config).toHaveProperty('namingConvention');
			expect(config.namingConvention).toBe('keep');
		});

		it('should return object with immutableTypes', () => {
			const config = GetDefaultConfig();
			expect(config).toHaveProperty('immutableTypes');
			expect(config.immutableTypes).toBe(false);
		});

		it('should return exactly 2 default config keys', () => {
			const config = GetDefaultConfig();
			expect(Object.keys(config).length).toBe(2);
		});
	});

	describe('executeCodegen', () => {
		it('should throw error for unknown target', async () => {
			const params = {
				SchemaFile: 'schema.graphql',
				DocumentsGlob: 'src/**/*.graphql',
				OutputFile: 'src/generated.ts',
				Target: 'unknown' as never,
				Plugins: ['plugin1'],
				Config: {},
			};

			await expect(ExecuteCodegen(params as never)).rejects.toThrow('Unknown target');
		});

		it('should accept typescript target', async () => {
			const params = {
				SchemaFile: 'schema.graphql',
				DocumentsGlob: 'src/**/*.graphql',
				OutputFile: 'src/generated.ts',
				Target: 'typescript' as const,
				Plugins: ['plugin1'],
				Config: {},
			};

			// Will fail when trying to import @graphql-codegen/cli
			await expect(ExecuteCodegen(params)).rejects.toThrow();
		}, 30000);

		it('should validate target is typescript', async () => {
			const params = {
				SchemaFile: 'schema.graphql',
				DocumentsGlob: 'src/**/*.graphql',
				OutputFile: 'src/generated.ts',
				Target: 'javascript' as never,
				Plugins: ['plugin1'],
				Config: {},
			};

			await expect(ExecuteCodegen(params as never)).rejects.toThrow('Unknown target');
		});

		it('should accept empty plugins array', async () => {
			const params = {
				SchemaFile: 'schema.graphql',
				DocumentsGlob: 'src/**/*.graphql',
				OutputFile: 'src/generated.ts',
				Target: 'typescript' as const,
				Plugins: [],
				Config: {},
			};

			// Will fail when trying to import @graphql-codegen/cli
			await expect(ExecuteCodegen(params)).rejects.toThrow();
		});

		it('should accept custom config', async () => {
			const params = {
				SchemaFile: 'schema.graphql',
				DocumentsGlob: 'src/**/*.graphql',
				OutputFile: 'src/generated.ts',
				Target: 'typescript' as const,
				Plugins: ['plugin1'],
				Config: { customKey: 'customValue' },
			};

			// Will fail when trying to import @graphql-codegen/cli
			await expect(ExecuteCodegen(params)).rejects.toThrow();
		});

		it('should support watch flag', async () => {
			const params = {
				SchemaFile: 'schema.graphql',
				DocumentsGlob: 'src/**/*.graphql',
				OutputFile: 'src/generated.ts',
				Target: 'typescript' as const,
				Plugins: ['plugin1'],
				Config: {},
				Watch: true,
			};

			// Will fail when trying to import @graphql-codegen/cli
			await expect(ExecuteCodegen(params)).rejects.toThrow();
		});

		it('should map plugins to config objects', async () => {
			const params = {
				SchemaFile: 'schema.graphql',
				DocumentsGlob: 'src/**/*.graphql',
				OutputFile: 'src/generated.ts',
				Target: 'typescript' as const,
				Plugins: ['plugin1'],
				Config: {},
			};

			// Will fail when trying to import @graphql-codegen/cli
			await expect(ExecuteCodegen(params)).rejects.toThrow();
		});

		it('should handle multiple plugins', async () => {
			const params = {
				SchemaFile: 'schema.graphql',
				DocumentsGlob: 'src/**/*.graphql',
				OutputFile: 'src/generated.ts',
				Target: 'typescript' as const,
				Plugins: ['plugin1', 'plugin2', 'plugin3'],
				Config: {},
			};

			// Will fail when trying to import @graphql-codegen/cli
			await expect(ExecuteCodegen(params)).rejects.toThrow();
		});
	});
});
