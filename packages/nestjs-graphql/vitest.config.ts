import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: false,
		environment: 'node',
		include: ['src/**/*.test.ts', 'src/**/*.advanced.test.ts', 'src/**/*.integration.test.ts', 'src/**/*.regression.test.ts', 'src/**/*.type-safety.test.ts'],
		exclude: ['node_modules', 'build', 'tmp'],
		silent: true,
		env: {
			LOG_LEVEL: 'silent',
		},
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
				'**/*.type-safety.test.ts',
				'**/types/**',
			],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 70,
				statements: 80,
			},
		},
	},
});
