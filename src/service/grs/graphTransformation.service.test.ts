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

import {
	GraphTransformationService,
	ResultGraphSchema,
} from './graphTransformation.service';
import { IDBGraphService } from '../db/types';
import { GraphSchema } from '../../types/graph.schema';

import { Neo4jContainer, StartedNeo4jContainer } from '@testcontainers/neo4j';
import neo4j, { Driver, Session } from 'neo4j-driver';
import { Neo4jGraphService } from '../db/neo4j/graph.service';

// Example Data
import sampleGraphData from './testutils/samplegraph.json';
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
import {
	inputHomomorphic as homomorphicMatchingInput,
	inputIsomorphic as isomorphicMatchingInput,
	expectedOutputHomomorphic as homomorphicMatchingExpectedOutput,
	expectedOutputIsomorphic as isomorphicMatchingExpectedOutput,
} from './testutils/homomorphicMatching';

import {
	createNodeUuid,
	createEdgeUuid,
	createParameterUuid,
} from '../../utils/uuid';

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

	test('Test loadGraphIntoDb should call GraphService functions', async () => {
		const grsService = new GraphTransformationService(mockGraphService);

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
			nodes: result.nodes,
			edges: result.edges,
		});
	});
});

describe('Integration tests for grs service against testcontainers', () => {
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

		let nodeCount = 0;
		let edgeCount = 0;
		let paramCount = 0;
		vi.mocked(createEdgeUuid).mockImplementation(() => {
			edgeCount++;
			return `e_${edgeCount}`;
		});
		vi.mocked(createNodeUuid).mockImplementation(() => {
			nodeCount++;
			return `n_${nodeCount}`;
		});
		vi.mocked(createParameterUuid).mockImplementation(() => {
			paramCount++;
			return `p_${paramCount}`;
		});
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
		const grsService = new GraphTransformationService(graphService);

		const output = await grsService.transformGraph(
			addNodeInput.hostgraph,
			addNodeInput.rules ?? []
		);

		expectOutputGraphToMatchExpectedOutputGraph(
			output[0],
			addNodeExpectedOutput
		);
	}, 10000);

	test('Test addition of simple edge', async () => {
		const grsService = new GraphTransformationService(graphService);

		const output = await grsService.transformGraph(
			addEdgeInput.hostgraph,
			addEdgeInput.rules
		);

		expectOutputGraphToMatchExpectedOutputGraph(
			output[0],
			addEdgeExpectedOutput
		);
	}, 10000);

	test('Test removal of simple node', async () => {
		const grsService = new GraphTransformationService(graphService);

		const output = await grsService.transformGraph(
			removeNodeInput.hostgraph,
			removeNodeInput.rules ?? []
		);

		expectOutputGraphToMatchExpectedOutputGraph(
			output[0],
			removeNodeExpectedOutput
		);
	}, 10000);

	test('Test removal of simple edge', async () => {
		const grsService = new GraphTransformationService(graphService);

		const output = await grsService.transformGraph(
			removeEdgeInput.hostgraph,
			removeEdgeInput.rules ?? []
		);

		expectOutputGraphToMatchExpectedOutputGraph(
			output[0],
			removeEdgeExpectedOutput
		);
	}, 10000);

	test('Test update of simple node', async () => {
		const grsService = new GraphTransformationService(graphService);

		// Default mode: modify
		const output = await grsService.transformGraph(
			updateNodeInput.hostgraph,
			updateNodeInput.rules ?? []
		);

		expectOutputGraphToMatchExpectedOutputGraph(
			output[0],
			updateNodeExpectedOutput
		);
	}, 10000);

	test('Test update of simple edge', async () => {
		const grsService = new GraphTransformationService(graphService);

		const output = await grsService.transformGraph(
			updateEdgeInput.hostgraph,
			updateEdgeInput.rules ?? []
		);

		expectOutputGraphToMatchExpectedOutputGraph(
			output[0],
			updateEdgeExpectedOutput
		);
	}, 10000);

	test('Test homomorphic matching', async () => {
		const grsService = new GraphTransformationService(graphService);

		const output = await grsService.transformGraph(
			homomorphicMatchingInput.hostgraph,
			homomorphicMatchingInput.rules ?? [],
			homomorphicMatchingInput.sequence
		);

		expectOutputGraphToMatchExpectedOutputGraph(
			output[0],
			homomorphicMatchingExpectedOutput
		);
	}, 10000);

	test('Test isomorphic matching', async () => {
		const grsService = new GraphTransformationService(graphService);

		const output = await grsService.transformGraph(
			isomorphicMatchingInput.hostgraph,
			isomorphicMatchingInput.rules ?? [],
			isomorphicMatchingInput.sequence
		);

		expectOutputGraphToMatchExpectedOutputGraph(
			output[0],
			isomorphicMatchingExpectedOutput
		);
	}, 10000);

	test.todo('Test repetitions', async () => {
		//
	});
	// // REAL WORLD Examples
	// test.todo('Test transformation of UML to petrinet');
	// test.todo('Test transformation of UML to petrinet');
});

function expectOutputGraphToMatchExpectedOutputGraph(
	output: ResultGraphSchema,
	expectedOutput: GraphSchema
) {
	expect(output.options).toEqual(
		expect.objectContaining(expectedOutput.options)
	);
	expect(output.nodes).toEqual(expect.arrayContaining(expectedOutput.nodes));
	expect(output.edges).toEqual(expect.arrayContaining(expectedOutput.edges));
}
