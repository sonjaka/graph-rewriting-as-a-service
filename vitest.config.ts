// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { coverageConfigDefaults } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		reporters: ['verbose', 'junit'],
		outputFile: {
			junit: './test/results/junit-report.xml',
		},
		coverage: {
			reporter: ['text', 'html'],
			reportsDirectory: './test/coverage',
			exclude: [...coverageConfigDefaults.exclude, '**/testutils/**'],
		},
		testTimeout: 30000,
		hookTimeout: 30000,
	},
});
