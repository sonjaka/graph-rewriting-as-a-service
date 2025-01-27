import { expect, test, describe, beforeEach, vi } from 'vitest';
import { Record, Session } from 'neo4j-driver';

import driver from './testutils/driver';
import { createNode } from './nodes.service';

vi.mock('./testutils/driver', () => {
	return {
		default: {
			session: vi.fn(() => ({
				executeWrite: mockExecuteWrite,
				executeRead: mockExecuteRead,
				close: vi.fn(),
			})),
		},
	};
});

const mockExecuteWrite = vi.fn();
const mockExecuteRead = vi.fn();

let session: Session;
describe('Test Node Service', () => {
	beforeEach(() => {
		session = driver.session();
	});

	test('Test adding nodes', async () => {
		const testProperties = [
			{ hello: 'world' },
			{ hello: 'world', test: 'testMe' },
			{},
		];
		const testKey = ['key', '', 'key'];
		const expectedResult = [
			{
				key: testKey[0],
				attributes: {
					...testProperties[0],
				},
			},
			{
				key: testKey[1],
				attributes: {
					...testProperties[1],
				},
			},
			{
				key: testKey[2],
				attributes: {},
			},
		];

		for (let index = 0; index < testProperties.length; index++) {
			mockExecuteWrite.mockImplementationOnce(() => ({
				records: [
					new Record(
						['n'],
						[
							{
								properties: {
									...testProperties[index],
									_grs_internalId: testKey[index],
								},
							},
						],
						{ n: 0 }
					),
				],
			}));

			const result = await createNode(
				session,
				{ ...testProperties[index], _grs_internalId: testKey[index] },
				testKey[index]
			);
			expect(result).toEqual(expectedResult[index]);
		}
	});
});
