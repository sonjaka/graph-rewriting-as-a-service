import neo4j, { Driver, Session } from 'neo4j-driver';
import { Neo4jContainer, StartedNeo4jContainer } from '@testcontainers/neo4j';

import {
	vi,
	expect,
	test,
	describe,
	beforeAll,
	afterAll,
	beforeEach,
	afterEach,
} from 'vitest';

import { NodeService } from './nodes.service';
import { getApocJsonAllExport } from './testutils/helpers';

let container: StartedNeo4jContainer;
let driver: Driver;
let session: Session;
describe('Test graph service', () => {
	beforeAll(async () => {
		container = await new Neo4jContainer('neo4j:5.25.1').withApoc().start();

		driver = neo4j.driver(
			container.getBoltUri(),
			neo4j.auth.basic(container.getUsername(), container.getPassword())
		);
	}, 30000);

	beforeEach(async () => {
		session = driver.session();
	});

	afterEach(async () => {
		// Clean up database after each test
		await session.run(`MATCH (n) CALL (n) { DETACH DELETE n } IN TRANSACTIONS`);
		await session.close();
	});

	afterAll(async () => {
		await driver.close();
		await container.stop();
	});

	test('Test createNode', async () => {
		const testProperties = [
			{ hello: 'world' },
			{ hello: 'world', test: 'testMe' },
			{},
			{ type: 'Gate', test: 'testMe' },
		];
		const testKey = ['testnode1', '', 'testnode3', 'testnode4'];
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
			{
				key: testKey[3],
				attributes: {
					...testProperties[3],
				},
			},
		];

		const nodeService = new NodeService(session);

		for (let index = 0; index < testProperties.length; index++) {
			const neo4jSpy = vi.spyOn(session, 'executeWrite');

			const result = await nodeService.createNode(
				{ ...testProperties[index], _grs_internalId: testKey[index] },
				testKey[index]
			);
			expect(result).toEqual(expectedResult[index]);
			expect(neo4jSpy).toHaveBeenCalled();
			expect(neo4jSpy).toHaveBeenCalledTimes(index + 1);
		}

		// Check that database contains the correct data
		const finalState = await getApocJsonAllExport(session);
		const finalNodesCount = finalState.records[0].get('nodes');
		expect(finalNodesCount.toNumber()).toEqual(testKey.length);
	}, 10000);

	test('Test getNode', async () => {
		// Prime database with a test node
		await session.run(
			`CREATE (n:Node {label: 'Test', _grs_internalId: 'testnode1'})`
		);

		const nodeService = new NodeService(session);
		const neo4jSpy = vi.spyOn(session, 'executeRead');
		const result = await nodeService.getNode('testnode1');
		expect(result).toEqual({
			key: 'testnode1',
			attributes: {
				label: 'Test',
			},
		});
		expect(neo4jSpy).toHaveBeenCalled();
		expect(neo4jSpy).toHaveBeenCalledTimes(1);
	}, 10000);

	test('Test updateNode', async () => {
		// Prime database with a test node
		await session.run(
			`CREATE (n:Node {label: 'Test', _grs_internalId: 'testnode1'})`
		);

		// Setup test
		const nodeService = new NodeService(session);
		const updatedNodeData = {
			metadata: {
				hello: 'world',
			},
			internalId: 'testnode1',
		};
		const neo4jSpy = vi.spyOn(session, 'executeWrite');
		const result = await nodeService.updateNode(
			updatedNodeData.metadata,
			updatedNodeData.internalId
		);
		expect(result).toEqual({
			key: 'testnode1',
			attributes: {
				hello: 'world',
			},
		});
		expect(neo4jSpy).toHaveBeenCalled();
		expect(neo4jSpy).toHaveBeenCalledTimes(1);
	}, 10000);

	test('Test getAllNodes', async () => {
		// Add testdata to database
		const props = {
			attributes: [
				{ label: 'A', key: 'testnodeA' },
				{ label: 'B', key: 'testnodeB' },
				{ label: 'C', key: 'testnodeC' },
			],
		};
		await session.run(
			`UNWIND $attributes AS config \
			CREATE (n:Node {label: config.label, _grs_internalId: config.key})`,
			props
		);

		const nodeService = new NodeService(session);
		const neo4jSpy = vi.spyOn(session, 'executeRead');
		const result = await nodeService.getAllNodes();
		expect(result).toMatchObject([
			{
				key: 'testnodeA',
				attributes: {
					label: 'A',
				},
			},
			{
				key: 'testnodeB',
				attributes: {
					label: 'B',
				},
			},
			{
				key: 'testnodeC',
				attributes: {
					label: 'C',
				},
			},
		]);
		expect(neo4jSpy).toHaveBeenCalled();
		expect(neo4jSpy).toHaveBeenCalledTimes(1);
	}, 10000);

	test('Test deleteNodes', async () => {
		// Add testdata to database
		const props = {
			attributes: [
				{ label: 'A', key: 'testnodeA' },
				{ label: 'B', key: 'testnodeB' },
				{ label: 'C', key: 'testnodeC' },
			],
		};
		await session.run(
			`UNWIND $attributes AS config \
			CREATE (n:Node {label: config.label, _grs_internalId: config.key})`,
			props
		);

		const nodeService = new NodeService(session);
		const neo4jSpy = vi.spyOn(session, 'executeWrite');
		const result = await nodeService.deleteNode('testnodeA');
		// Check result
		expect(result).toBeUndefined();
		expect(neo4jSpy).toHaveBeenCalled();
		expect(neo4jSpy).toHaveBeenCalledTimes(1);

		// Check that database contains the correct data
		const finalState = await getApocJsonAllExport(session);
		const finalNodesCount = finalState.records[0].get('nodes');
		const finalData = finalState.records[0].get('data');
		expect(finalNodesCount.toNumber()).toEqual(2);
		expect(finalData).not.toContainEqual(
			expect.objectContaining({
				properties: expect.objectContaining({
					label: 'A',
					_grs_internalId: 'testnodeA',
				}),
			})
		);
	});

	test('Test deleteAllNodes', async () => {
		const props = {
			attributes: [
				{ label: 'A', key: 'testnodeA' },
				{ label: 'B', key: 'testnodeB' },
				{ label: 'C', key: 'testnodeC' },
			],
		};
		await session.run(
			`UNWIND $attributes AS config \
			CREATE (n:Node {label: config.label, _grs_internalId: config.key})`,
			props
		);

		const nodeService = new NodeService(session);
		const neo4jSpy = vi.spyOn(session, 'run');
		const result = await nodeService.deleteAllNodes();
		// Check result
		expect(result).toEqual([]);
		expect(neo4jSpy).toHaveBeenCalled();
		expect(neo4jSpy).toHaveBeenCalledTimes(1);

		// Check that database contains the correct data
		const finalState = await getApocJsonAllExport(session);
		const finalNodesCount = finalState.records[0].get('nodes');
		expect(finalNodesCount.toNumber()).toEqual(0);
	});
});
