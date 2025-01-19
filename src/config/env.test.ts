import { vi, expect, test, describe } from 'vitest';

import { getAppEnvConfig } from './env';

describe('Test getting of environment config', () => {
	test('Sets APP_ENV when found in .env file', async () => {
		vi.stubEnv('APP_ENV', 'production');
		const envConfig = getAppEnvConfig();

		expect(envConfig.APP_ENV).toBe('production');
		vi.unstubAllEnvs();
	});

	test('Defaults to development if no APP_ENV var found', async () => {
		vi.stubEnv('APP_ENV', undefined);
		const envConfig = getAppEnvConfig();

		expect(envConfig.APP_ENV).toBe('production');
		vi.unstubAllEnvs();
	});
});
