import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	resolve: {
		alias: {
			'@core': path.resolve(__dirname, 'src/core'),
			'@app': path.resolve(__dirname, 'src/app'),
		},
	},
	test: {
		globals: true,
		environment: 'node',
		include: process.env.INTEGRATION_TESTS_ONLY
			? ['src/**/*integration*.test.ts']
			: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/build/**',
			...(process.env.CI ? ['**/integration/**'] : []),
			...(process.env.INTEGRATION_TESTS_ONLY ? [] : ['**/*integration*.test.ts']),
		],
		watch: true,
	},
});
