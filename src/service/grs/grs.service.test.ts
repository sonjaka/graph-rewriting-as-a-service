import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';

import sampleGraphData from './testutils/samplegraph.json';
import sampleRules from './testutils/samplerules.json';
import { GrsService } from './grs.service';
import { IDBGraphService } from '../db/types';
import { GraphSchema } from '../../types/graph.schema';
import { GraphRewritingRuleSchema } from '../../types/grs.schema';
import Graph from 'graphology';

describe('Test graphology parser service', () => {
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
		vi.clearAllMocks();
	});

	test('Test loadGraphIntoDb should call GraphService functions', async () => {
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
	});

	test.todo('Test rules are correctly parsed into graphs', () => {
		const grsService = new GrsService(mockGraphService);

		const rulesData = sampleRules as GraphRewritingRuleSchema[];

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
