import Graph from 'graphology';
import { GraphSchema } from '../../types/grs.schema';
import { GraphRewritingRuleSchema } from '../../types/rewrite-rule.schema';
import { DBGraphPatternMatchResult, IDBGraphService } from '../db/types';
import { GraphologyParserService } from './graphology.parser.service';
import {
	GrsGraphEdgeMetadata,
	GrsGraphMetadata,
	GrsGraphNodeMetadata,
} from './types';
import { GraphNodeSchema } from '../../types/node.schema';
import { GraphEdgeSchema } from '../../types/edge.schema';

// interface GrsRewriteRule {
// 	lhs: Graph<GrsGraphNodeMetadata, GrsGraphEdgeMetadata, GrsGraphMetadata>;
// 	rhs: Graph<GrsGraphNodeMetadata, GrsGraphEdgeMetadata, GrsGraphMetadata>;
// }

type NodeMatchMap = Map<GraphNodeSchema, GraphNodeSchema | undefined>;
type EdgeMatchMap = Map<GraphEdgeSchema, GraphEdgeSchema | undefined>;
interface GraphDiffResult {
	updatedNodes: NodeMatchMap;
	addedNodes: GraphNodeSchema[];
	removedNodes: GraphNodeSchema[];
	updatedEdges: EdgeMatchMap;
	addedEdges: GraphEdgeSchema[];
	removedEdges: GraphEdgeSchema[];
}

export class GrsService {
	constructor(private readonly graphService: IDBGraphService) {}

	public async replaceGraph(
		hostgraphData: GraphSchema,
		rules: GraphRewritingRuleSchema[]
	): Promise<GraphSchema> {
		this.graphService.graphType = hostgraphData.options.type;
		await this.importHostgraph(hostgraphData);

		for (const rule of rules) {
			const { lhs, rhs } = rule;

			const matches = await this.graphService.findPatternMatch(
				lhs.nodes,
				lhs.edges,
				lhs.options.type
			);

			for (const match of matches) {
				const overlapAndDifference =
					this.computeOverlapAndDifferenceOfLhsAndRhs(lhs, rhs);

				const result = await this.replaceMatch(match, overlapAndDifference);
			}
		}

		// let ruleSet;
		// if (rules) {
		// 	ruleSet = this.parseRules(rules);
		// }

		// ruleSet?.forEach((rule) => {
		// 	console.log('Nodes', rule.lhs.nodes);
		// 	this.graphService.findPatternMatch(rule.lhs);
		// });

		return this.exportHostgraph(hostgraphData);
	}

	public async importHostgraph(
		hostgraphData: GraphSchema
	): Promise<GraphSchema> {
		// First delete all previous nodes and edges
		await this.graphService.deleteAllNodes();

		// not all attributes required by graphology are also required in our input scheme
		// so we need to set default values here
		if (!hostgraphData?.attributes) {
			hostgraphData.attributes = {};
		}

		const parser = new GraphologyParserService();
		const hostgraph = parser.parseGraph(hostgraphData);

		// Load the graph into the database
		await this.loadGraphIntoDB(hostgraph);

		return this.exportHostgraph(hostgraphData);
	}

	// public parseRules(
	// 	rules: GraphRewritingRuleSchema[]
	// ): Map<string, GrsRewriteRule> {
	// 	const parser = new GraphologyParserService();
	// 	const ruleMap = new Map();
	// 	for (const rule of rules) {
	// 		const lhs = parser.parseGraph(rule.lhs);
	// 		const rhs = parser.parseGraph(rule.rhs);

	// 		ruleMap.set(rule.key, {
	// 			lhs,
	// 			rhs,
	// 		});
	// 	}

	// 	return ruleMap;
	// }

	private async loadGraphIntoDB(
		graph: Graph<GrsGraphNodeMetadata, GrsGraphEdgeMetadata, GrsGraphMetadata>
	) {
		for (const node of graph.nodeEntries()) {
			await this.graphService.createNode(
				node.attributes,
				node.attributes._grs_internalId
			);
		}

		for (const edge of graph.edgeEntries()) {
			await this.graphService.createEdge(
				edge.sourceAttributes._grs_internalId,
				edge.targetAttributes._grs_internalId,
				edge.attributes._grs_internalId,
				edge.attributes
			);
		}
	}

	private async exportHostgraph(hostgraph: GraphSchema): Promise<GraphSchema> {
		const nodes = await this.graphService.getAllNodes();
		const edges = await this.graphService.getAllEdges();

		// Attributes & Options should not have changed from the original hostgraph
		const attributes = hostgraph.attributes;
		const options = hostgraph.options;

		return { options, attributes, nodes, edges };
	}

	/**
	 * Main Algorithm performing the actual search & replace of the pattern match
	 * 1. Finds difference between LHS and RHS systems to determine which nodes/edges need to be updated/removed/added
	 * 2. Removes all nodes/edges that are in LHS, but NOT part of the RHS
	 * 3. Updates all nodes/edges that are in LHS and part of the RHS
	 * 4. Adds all nodes/edges that are part of the RHS but not the LHS
	 *
	 * @param occurence The match found in the database for the given lhs pattern
	 * @param lhs
	 * @param rhs
	 */
	private async replaceMatch(
		occurence: DBGraphPatternMatchResult,
		adjustments: GraphDiffResult
	) {

		return;
	}

	private computeOverlapAndDifferenceOfLhsAndRhs(
		lhs: GraphSchema,
		rhs: GraphSchema
	): GraphDiffResult {
		const updatedNodes: NodeMatchMap = new Map();
		const removedNodes: GraphNodeSchema[] = [];
		const addedNodes: GraphNodeSchema[] = [];

		const updatedEdges: EdgeMatchMap = new Map();
		const removedEdges: GraphEdgeSchema[] = [];
		const addedEdges: GraphEdgeSchema[] = [];

		// All nodes in search graph that are also in replacement are "updated"
		// All nodes in search graph that are not in replacement are "deleted"
		for (const lhsNode of lhs.nodes) {
			const rhsNode = rhs.nodes.find((rhsNode) => rhsNode.key === lhsNode.key);

			if (rhsNode) {
				updatedNodes.set(lhsNode, rhsNode);
			} else {
				removedNodes.push(lhsNode);
			}
		}

		// All nodes that are in replacement but not in search graph are "added".
		// All search graph nodes should already be part of updated/removed, so if it
		// can't be found there, it has to be a new/added node
		for (const rhsNode of rhs.nodes) {
			if (!updatedNodes.has(rhsNode)) {
				addedNodes.push(rhsNode);
			}
		}

		// All edges in search graph that are also in replacement are "updated"
		// All edges in search graph that are not in replacement are "deleted"
		for (const lhsEdge of lhs.edges) {
			const rhsEdge = rhs.edges.find((rhsEdge) => rhsEdge.key === lhsEdge.key);

			if (rhsEdge) {
				updatedEdges.set(lhsEdge, rhsEdge);
			} else {
				removedEdges.push(lhsEdge);
			}
		}

		// All nodes that are in replacement but not in search graph are "added".
		// All search graph nodes should already be part of updated/removed, so if it
		// can't be found there, it has to be a new/added node
		for (const rhsEdge of rhs.edges) {
			if (!updatedEdges.has(rhsEdge)) {
				addedEdges.push(rhsEdge);
			}
		}

		return {
			updatedNodes,
			updatedEdges,
			removedNodes,
			removedEdges,
			addedNodes,
			addedEdges,
		};
	}
}
