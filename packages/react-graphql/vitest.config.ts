import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: false,
		environment: 'node',
		include: ['src/**/*.test.{ts,tsx}', 'src/**/*.advanced.test.{ts,tsx}', 'src/**/*.integration.test.{ts,tsx}', 'src/**/*.regression.test.{ts,tsx}'],
		exclude: ['node_modules', 'build', 'tmp'],
		silent: true,
		typecheck: {
			tsconfig: './tsconfig.test.json',
		},
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
			exclude: [
				'node_modules/',
				'build/',
				'tmp/',
				'**/*.test.ts',
				'**/*.test.tsx',
				'**/*.advanced.test.ts',
				'**/*.advanced.test.tsx',
				'**/*.integration.test.ts',
				'**/*.integration.test.tsx',
				'**/*.regression.test.ts',
				'**/*.regression.test.tsx',
				'**/types/**',
			],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 80,
				statements: 80,
			},
		},
	},
});
