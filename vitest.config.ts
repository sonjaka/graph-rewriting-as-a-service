// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		reporters: ['default', 'junit'],
		outputFile: {
			junit: './test/results/junit-report.xml',
		},
		coverage: {
			reporter: ['text', 'html'],
			reportsDirectory: './test/coverage',
		},
		testTimeout: 30000,
		hookTimeout: 30000,
	},
});
