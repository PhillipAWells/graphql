import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: false,
		environment: 'node',
		include: ['src/**/*.test.ts', 'src/**/*.advanced.test.ts', 'src/**/*.integration.test.ts', 'src/**/*.regression.test.ts'],
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
				'**/*.advanced.test.ts',
				'**/*.integration.test.ts',
				'**/*.regression.test.ts',
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
