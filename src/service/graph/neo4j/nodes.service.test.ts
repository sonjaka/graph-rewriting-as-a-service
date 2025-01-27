import {
	expect,
	test,
	describe,
	beforeAll,
	afterAll,
	beforeEach,
	afterEach,
	vi,
} from 'vitest';
import neo4j, { Driver, Session } from 'neo4j-driver';
import { Neo4jContainer, StartedNeo4jContainer } from '@testcontainers/neo4j';

import { createNode } from './nodes.service';

let container: StartedNeo4jContainer;
let driver: Driver;
let session: Session;
describe('Test Node Service', () => {
	beforeAll(async () => {
		container = await new Neo4jContainer('neo4j:5.25.1').withApoc().start();

		driver = neo4j.driver(
			container.getBoltUri(),
			neo4j.auth.basic(container.getUsername(), container.getPassword())
		);
	}, 10000);

	beforeEach(() => {
		session = driver.session();
	});

	afterEach(async () => {
		await session.run(`MATCH (n) CALL (n) { DETACH DELETE n } IN TRANSACTIONS`);
		await session.close();
	});

	afterAll(async () => {
		await driver.close();
		await container.stop();
	});

	test('Request existing route', async () => {
		const result = await createNode(session, { hello: 'world' }, 'key');
		const expectedResult = {
			key: 'key',
			attributes: {
				hello: 'world',
			},
		};
		expect(result).toEqual(expectedResult);

		// const result2 = await createNode(session, { hello: 'world' }, 'key');
		// const expectedResult2 = {
		// 	attributes: {
		// 		hello: 'world',
		// 	},
		// };
		// expect(result2).toEqual(expectedResult2);
	});
});
