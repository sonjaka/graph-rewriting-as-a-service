import {
	describe,
	expect,
	test,
	vi,
	beforeEach,
	afterEach,
	afterAll,
	beforeAll,
} from 'vitest';

import { GrsService } from './grs.service';
import { IDBGraphService } from '../db/types';
import { GraphSchema } from '../../types/graph.schema';
import { GraphRewritingRuleSchema } from '../../types/grs.schema';
import Graph from 'graphology';

import { Neo4jContainer, StartedNeo4jContainer } from '@testcontainers/neo4j';
import neo4j, { Driver, Session } from 'neo4j-driver';
import { Neo4jGraphService } from '../db/neo4j/graph.service';

// Example Data
import sampleGraphData from './testutils/samplegraph.json';
import sampleRules from './testutils/samplerules.json';
import {
	input as addNodeInput,
	expectedOutput as addNodeExpectedOutput,
} from './testutils/addNode';
import {
	input as addEdgeInput,
	expectedOutput as addEdgeExpectedOutput,
} from './testutils/addEdge';
import {
	input as removeNodeInput,
	expectedOutput as removeNodeExpectedOutput,
} from './testutils/removeNode';
import {
	input as removeEdgeInput,
	expectedOutput as removeEdgeExpectedOutput,
} from './testutils/removeEdge';
import {
	input as updateNodeInput,
	expectedOutput as updateNodeExpectedOutput,
} from './testutils/updateNode';
import {
	input as updateEdgeInput,
	expectedOutput as updateEdgeExpectedOutput,
} from './testutils/updateEdge';

import { createNodeUuid, createEdgeUuid } from '../../utils/uuid';

vi.mock('../../utils/uuid');

describe('Test grs service', () => {
	let mockGraphService: IDBGraphService;

	beforeEach(() => {
		mockGraphService = {
			createNode: vi.fn(),
			getAllNodes: vi.fn(),
			deleteAllNodes: vi.fn(),
			createEdge: vi.fn(),
			getAllEdges: vi.fn(),
		} as unknown as IDBGraphService;
	});

	afterEach(() => {
		vi.resetAllMocks(); // Clear and set back implementation
	});

	test.todo(
		'Test loadGraphIntoDb should call GraphService functions',
		async () => {
			const grsService = new GrsService(mockGraphService);

			const createNodeSpy = vi.spyOn(mockGraphService, 'createNode');
			const createEdgeSpy = vi.spyOn(mockGraphService, 'createEdge');
			const deleteAllNodesSpy = vi.spyOn(mockGraphService, 'deleteAllNodes');

			mockGraphService.getAllNodes = vi
				.fn()
				.mockResolvedValue(sampleGraphData.nodes);
			mockGraphService.getAllEdges = vi
				.fn()
				.mockResolvedValue(sampleGraphData.edges);

			const result = await grsService.importHostgraph(
				sampleGraphData as GraphSchema
			);

			// Old nodes should have been deleted
			expect(deleteAllNodesSpy).toHaveBeenCalled();

			// Graph service functions should have been called fo all nodes (2) and edges (1)
			expect(createNodeSpy).toHaveBeenCalled();
			expect(createNodeSpy).toHaveBeenCalledTimes(2);
			expect(createEdgeSpy).toHaveBeenCalled();
			expect(createEdgeSpy).toHaveBeenCalledTimes(1);

			// Result should be the same as the input
			// (except for the changed ids, which we did not respect in the mock above)
			expect(result).toMatchObject({
				options: sampleGraphData.options,
				attributes: sampleGraphData.attributes,
				nodes: result.nodes,
				edges: result.edges,
			});
		}
	);

	test.todo('Test rules are correctly parsed into graphs', () => {
		const grsService = new GrsService(mockGraphService);
		const rulesData = sampleRules as GraphRewritingRuleSchema[];
		// @ts-expect-error parse rules is currently not used / commented out
		const rules = grsService.parseRules(rulesData);
		expect(rules.has('add_triangle')).toBe(true);
		expect(rules.get('add_triangle')).toHaveProperty('lhs');
		expect(rules.get('add_triangle')).toHaveProperty('rhs');
		const singleRule = rules.get('add_triangle');
		const lhs = singleRule?.lhs;
		const rhs = singleRule?.rhs;
		expect(lhs).toBeInstanceOf(Graph);
		expect(rhs).toBeInstanceOf(Graph);
	});
});

describe('Integration tests for grs service agains testcontainers', () => {
	let container: StartedNeo4jContainer;
	let driver: Driver;
	let session: Session;
	let graphService: Neo4jGraphService;

	beforeAll(async () => {
		container = await new Neo4jContainer('neo4j:5.25.1').withApoc().start();

		driver = neo4j.driver(
			container.getBoltUri(),
			neo4j.auth.basic(container.getUsername(), container.getPassword())
		);
	}, 30000);

	beforeEach(async () => {
		session = driver.session();
		graphService = new Neo4jGraphService(session);

		vi.resetAllMocks(); // Clear and set back implementation
	});

	afterEach(async () => {
		// Delete all nodes & relationships
		await session.run(`MATCH (n) CALL (n) { DETACH DELETE n } IN TRANSACTIONS`);
		// Drop all indexes & constraints
		await session.run(`CALL apoc.schema.assert({}, {})`);
		await session.close();

		vi.clearAllMocks();
	});

	afterAll(async () => {
		await driver.close();
		await container.stop();
	});

	test('Test addition of simple node', async () => {
		const grsService = new GrsService(graphService);

		let nodeCount = 0;
		let edgeCount = 0;
		vi.mocked(createEdgeUuid).mockImplementation(() => {
			edgeCount++;
			return `e_${edgeCount}`;
		});
		vi.mocked(createNodeUuid).mockImplementation(() => {
			nodeCount++;
			return `n_${nodeCount}`;
		});

		const output = await grsService.replaceGraph(
			addNodeInput.hostgraph,
			addNodeInput.rules ?? []
		);

		// expect(output).toStrictEqual(addNodeExpectedOutput);
		expect(output).toEqual(expect.objectContaining(addNodeExpectedOutput));
	}, 10000);
	test('Test addition of simple edge', async () => {
		const grsService = new GrsService(graphService);

		let nodeCount = 0;
		let edgeCount = 0;
		vi.mocked(createEdgeUuid).mockImplementation(() => {
			edgeCount++;
			return `e_${edgeCount}`;
		});
		vi.mocked(createNodeUuid).mockImplementation(() => {
			nodeCount++;
			return `n_${nodeCount}`;
		});

		const output = await grsService.replaceGraph(
			addEdgeInput.hostgraph,
			addEdgeInput.rules ?? []
		);

		// expect(output).toStrictEqual(addEdgeExpectedOutput);
		expect(output).toEqual(expect.objectContaining(addEdgeExpectedOutput));
	}, 10000);
	test('Test removal of simple node', async () => {
		const grsService = new GrsService(graphService);

		let nodeCount = 0;
		let edgeCount = 0;
		vi.mocked(createEdgeUuid).mockImplementation(() => {
			edgeCount++;
			return `e_${edgeCount}`;
		});
		vi.mocked(createNodeUuid).mockImplementation(() => {
			nodeCount++;
			return `n_${nodeCount}`;
		});

		const output = await grsService.replaceGraph(
			removeNodeInput.hostgraph,
			removeNodeInput.rules ?? []
		);

		expect(output).toEqual(expect.objectContaining(removeNodeExpectedOutput));
		// expect(output).toStrictEqual(removeNodeExpectedOutput);
	}, 10000);
	test('Test removal of simple edge', async () => {
		const grsService = new GrsService(graphService);

		let nodeCount = 0;
		let edgeCount = 0;
		vi.mocked(createEdgeUuid).mockImplementation(() => {
			edgeCount++;
			return `e_${edgeCount}`;
		});
		vi.mocked(createNodeUuid).mockImplementation(() => {
			nodeCount++;
			return `n_${nodeCount}`;
		});

		const output = await grsService.replaceGraph(
			removeEdgeInput.hostgraph,
			removeEdgeInput.rules ?? []
		);

		expect(output).toEqual(expect.objectContaining(removeEdgeExpectedOutput));
		// expect(output).toStrictEqual(removeNodeExpectedOutput);
	}, 10000);
	test('Test update of simple node', async () => {
		const grsService = new GrsService(graphService);

		let nodeCount = 0;
		let edgeCount = 0;
		vi.mocked(createEdgeUuid).mockImplementation(() => {
			edgeCount++;
			return `e_${edgeCount}`;
		});
		vi.mocked(createNodeUuid).mockImplementation(() => {
			nodeCount++;
			return `n_${nodeCount}`;
		});

		const output = await grsService.replaceGraph(
			updateNodeInput.hostgraph,
			updateNodeInput.rules ?? []
		);

		expect(output).toEqual(expect.objectContaining(updateNodeExpectedOutput));
		// expect(output).toStrictEqual(removeNodeExpectedOutput);
	}, 10000);
	test('Test update of simple edge', async () => {
		const grsService = new GrsService(graphService);

		let nodeCount = 0;
		let edgeCount = 0;
		vi.mocked(createEdgeUuid).mockImplementation(() => {
			edgeCount++;
			return `e_${edgeCount}`;
		});
		vi.mocked(createNodeUuid).mockImplementation(() => {
			nodeCount++;
			return `n_${nodeCount}`;
		});

		const output = await grsService.replaceGraph(
			updateEdgeInput.hostgraph,
			updateEdgeInput.rules ?? []
		);

		expect(output).toEqual(expect.objectContaining(updateEdgeExpectedOutput));
		// expect(output).toStrictEqual(removeNodeExpectedOutput);
	}, 10000);
	test.todo('Test replacement of connected nodes');
	test.todo('Test replacement of connected nodes');
	// REAL WORLD Examples
	test.todo('Test transformation of UML to petrinet');
	test.todo('Test transformation of UML to petrinet');
});
