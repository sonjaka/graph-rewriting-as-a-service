import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import {
	ExternalApiInstantiator,
	ExternalApiInstantiatorErrors,
} from './externalApiInstantiator';
import { DBGraphPatternMatchResult } from '../../db/types';

global.fetch = vi.fn();
vi.mock('fetch');

describe('Test externalApi instantiator', () => {
	afterEach(() => {
		vi.clearAllMocks(); // Reset all mocked calls between tests
	});

	test('Should return the correct instantiator key', () => {
		const instantiator = new ExternalApiInstantiator();
		expect(instantiator.instantiatorKey).toBe('externalApi');
	});

	test('Should call fetch', async () => {
		const instantiator = new ExternalApiInstantiator();

		const match: DBGraphPatternMatchResult = {
			nodes: {
				nodeA: {
					key: 'nodeA',
					attributes: { attributeName: 'a' },
				},
				nodeB: {
					key: 'nodeB',
					attributes: { attributeName: 'b' },
				},
			},
			edges: {},
		};

		const replacementGraph = {
			useExternalInstantiation: true,
			endpoint: 'http://localhost:8080/example-external-api-result',
		};

		const data = {
			nodes: [
				{
					key: 'nodeA',
					attributes: { attributeName: 'Replaced A' },
				},
			],
		};
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: () => new Promise((resolve) => resolve(data)),
		} as Response);

		try {
			await instantiator.instantiate({
				match,
				replacementGraph,
			});
		} catch {
			// console.log('caught error');
		}

		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch).toHaveBeenCalledWith(
			'http://localhost:8080/example-external-api-result',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ searchMatch: match }),
			}
		);
	});

	test('Should call fetch with additional parameters', async () => {
		const instantiator = new ExternalApiInstantiator();

		const match: DBGraphPatternMatchResult = {
			nodes: {
				nodeA: {
					key: 'nodeA',
					attributes: { attributeName: 'a' },
				},
				nodeB: {
					key: 'nodeB',
					attributes: { attributeName: 'a' },
				},
			},
			edges: {},
		};

		const replacementGraph = {
			useExternalInstantiation: true,
			endpoint: 'http://localhost:8080/example-external-api-result',
			additionalRequestBodyParameters: {
				param1: 'hello',
				param2: 'world',
			},
		};

		try {
			await instantiator.instantiate({
				match,
				replacementGraph,
			});
		} catch {
			// do nothing
		}

		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch).toHaveBeenCalledWith(
			'http://localhost:8080/example-external-api-result',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					searchMatch: match,
					param1: 'hello',
					param2: 'world',
				}),
			}
		);
	});

	test('Should ensure valid graph schema', async () => {
		const instantiator = new ExternalApiInstantiator();

		const match: DBGraphPatternMatchResult = {
			nodes: {
				nodeA: {
					key: 'nodeA',
					attributes: { attributeName: 'a' },
				},
				nodeB: {
					key: 'nodeB',
					attributes: { attributeName: 'a' },
				},
			},
			edges: {},
		};

		const replacementGraph = {
			useExternalInstantiation: true,
			endpoint: 'http://localhost:8080/example-external-api-result',
			additionalRequestBodyParameters: {
				param1: 'hello',
				param2: 'world',
			},
		};

		vi.mocked(fetch).mockReturnValue({
			// @ts-expect-error: incorrectly typed
			ok: true,
			json: () => ({ data: { nodes: [] } }),
		});

		const result = await instantiator.instantiate({
			match,
			replacementGraph,
		});
		expect(result).toStrictEqual({ nodes: [], edges: [] });

		vi.mocked(fetch).mockReturnValue({
			// @ts-expect-error: incorrectly typed
			ok: true,
			json: () => ({ data: { edges: [] } }),
		});
		const result2 = await instantiator.instantiate({
			match,
			replacementGraph,
		});
		expect(result2).toStrictEqual({ nodes: [], edges: [] });
	});

	test('Should throw error for response not ok', async () => {
		const instantiator = new ExternalApiInstantiator();

		const match: DBGraphPatternMatchResult = {
			nodes: {},
			edges: {},
		};

		const replacementGraph = {
			useExternalInstantiation: true,
			endpoint: 'http://localhost:8080/example-external-api-result',
		};

		const data = {
			nodes: [{}],
		};
		vi.mocked(fetch).mockResolvedValue({
			ok: false,
			status: 500,
			json: () => new Promise((resolve) => resolve(data)),
		} as Response);

		await expect(() =>
			instantiator.instantiate({
				match,
				replacementGraph,
			})
		).rejects.toThrowError(`${ExternalApiInstantiatorErrors.FailedFetch} 500`);
	});

	test('Should throw error for invalid result', async () => {
		const instantiator = new ExternalApiInstantiator();

		const match: DBGraphPatternMatchResult = {
			nodes: {
				nodeA: {
					key: 'nodeA',
					attributes: { attributeName: 'a' },
				},
				nodeB: {
					key: 'nodeB',
					attributes: { attributeName: 'a' },
				},
			},
			edges: {},
		};

		const replacementGraph = {
			useExternalInstantiation: true,
			endpoint: 'http://localhost:8080/example-external-api-result',
			additionalRequestBodyParameters: {
				param1: 'hello',
				param2: 'world',
			},
		};

		vi.mocked(fetch).mockReturnValueOnce({
			// @ts-expect-error: incorrectly typed
			ok: true,
			json: () => new Promise((resolve) => resolve({ anyData: 'test' })),
		});

		await expect(() =>
			instantiator.instantiate({
				match,
				replacementGraph,
			})
		).rejects.toThrowError(ExternalApiInstantiatorErrors.InvalidResult);
	});

	test('Should throw error because of missing arguments', async ({
		expect,
	}) => {
		const instantiator = new ExternalApiInstantiator();

		const match: DBGraphPatternMatchResult = {
			nodes: {},
			edges: {},
		};

		const replacementGraph = {
			useExternalInstantiation: true,
			additionalRequestBodyParameters: {
				param1: 'hello',
				param2: 'world',
			},
		};

		await expect(() =>
			instantiator.instantiate({
				match,
				// @ts-expect-error: Parameters are not as typed
				replacementGraph,
			})
		).rejects.toThrowError(ExternalApiInstantiatorErrors.NoEndpoint);
	});

	test('Should throw error for unreachable endpoint', async () => {
		const instantiator = new ExternalApiInstantiator();

		const match: DBGraphPatternMatchResult = {
			nodes: {
				nodeA: {
					key: 'nodeA',
					attributes: { attributeName: 'a' },
				},
				nodeB: {
					key: 'nodeB',
					attributes: { attributeName: 'a' },
				},
			},
			edges: {},
		};

		const replacementGraph = {
			useExternalInstantiation: true,
			endpoint: 'http://localhost:8080/example-external-api-result',
			additionalRequestBodyParameters: {
				param1: 'hello',
				param2: 'world',
			},
		};

		vi.mocked(fetch).mockRejectedValue('Api unreachable');

		await expect(() =>
			instantiator.instantiate({
				match,
				replacementGraph,
			})
		).rejects.toThrowError('Api unreachable');
	});

	test('Should throw error because of missing arguments', async ({
		expect,
	}) => {
		const instantiator = new ExternalApiInstantiator();

		const match: DBGraphPatternMatchResult = {
			nodes: {},
			edges: {},
		};

		const replacementGraph = {
			useExternalInstantiation: true,
			additionalRequestBodyParameters: {
				param1: 'hello',
				param2: 'world',
			},
		};

		await expect(() =>
			instantiator.instantiate({
				match,
				// @ts-expect-error: Parameters are not as typed
				replacementGraph,
			})
		).rejects.toThrowError(ExternalApiInstantiatorErrors.NoEndpoint);
	});
});
