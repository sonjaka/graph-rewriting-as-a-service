import Graph from 'graphology';
import { GraphSchema } from '../../types/grs.schema';
import { GraphRewritingRuleSchema } from '../../types/rewrite-rule.schema';
import {
	DBGraphEdgeMetadata,
	DBGraphNodeMetadata,
	DBGraphPatternMatchResult,
	IDBGraphService,
} from '../db/types';
import { GraphologyParserService } from './graphology.parser.service';
import {
	GrsGraphEdgeMetadata,
	GrsGraphMetadata,
	GrsGraphNodeMetadata,
} from './types';
import { GraphNodeSchema } from '../../types/node.schema';
import { GraphEdgeSchema } from '../../types/edge.schema';
import { RewritingRuleProcessingConfigSchema } from '../../types/run-config.schema';
import { createEdgeUuid, createNodeUuid } from '../../utils/uuid';
import { InstantiatorService } from '../instantiation/instantiator.service';

type ResultGraphSchema = Omit<GraphSchema, 'nodes' | 'edges'> & {
	nodes: (Omit<GraphNodeSchema, 'attributes'> & {
		attributes: DBGraphNodeMetadata;
	})[];
	edges: (Omit<GraphEdgeSchema, 'attributes'> & {
		attributes: DBGraphEdgeMetadata;
	})[];
};

type NodeMatchMap = Map<string, GraphNodeSchema | undefined>;
type EdgeMatchMap = Map<string, GraphEdgeSchema | undefined>;
interface GraphDiffResult {
	updatedNodes: NodeMatchMap;
	addedNodes: GraphNodeSchema[];
	removedNodes: GraphNodeSchema[];
	updatedEdges: EdgeMatchMap;
	addedEdges: GraphEdgeSchema[];
	removedEdges: GraphEdgeSchema[];
}

export class GrsService {
	private instantiatorService;

	constructor(private readonly graphService: IDBGraphService) {
		this.instantiatorService = new InstantiatorService();
	}

	public async transformGraph(
		hostgraphData: GraphSchema,
		rules: GraphRewritingRuleSchema[] = [],
		processingConfig: RewritingRuleProcessingConfigSchema[] = []
	): Promise<ResultGraphSchema> {
		this.graphService.graphType = hostgraphData.options.type;
		await this.importHostgraph(hostgraphData);

		if (processingConfig.length) {
			for (const processStep of processingConfig) {
				const ruleConfig = rules.find((rule) => rule.key === processStep.rule);

				if (!ruleConfig) {
					throw Error(`Rule "${processStep.rule}" not found`);
				}

				await this.executeRule(ruleConfig, processStep);
			}
		} else {
			// If no sequence config is give, run and replace only the first match
			for (const rule of rules) {
				await this.executeRule(rule);
			}
		}

		return this.exportHostgraph(hostgraphData);
	}

	private async executeRule(
		ruleConfig: GraphRewritingRuleSchema,
		sequenceConfig?: RewritingRuleProcessingConfigSchema
	) {
		const { lhs, rhs } = ruleConfig;

		const matches = await this.graphService.findPatternMatch(
			lhs.nodes,
			lhs.edges,
			lhs.options.type
		);

		// TODO: Check if match still applies after first replacements have already happened
		// --> either we fix this, or we remove option for multiple replacements
		// --> user can still replace all occurences by sending the request multiple times
		if (matches.length) {
			let max = 1;

			if (sequenceConfig) {
				if (sequenceConfig.options.mode === 'all') {
					max = matches.length;
				} else if (
					sequenceConfig.options.mode === 'intervall' &&
					sequenceConfig.options.intervall?.max
				) {
					max = sequenceConfig.options.intervall.max;
				}
			}

			for (let i = 0; i < max; i++) {
				const match = matches[i];

				await this.performInstantiationAndReplacement(match, lhs, rhs);
			}
		} else {
			// Handle edge case for empty pattern
			// Additions are still possible!
			await this.performInstantiationAndReplacement(
				{ nodes: {}, edges: {} },
				lhs,
				rhs
			);
		}
	}

	private async performInstantiationAndReplacement(
		match: DBGraphPatternMatchResult,
		lhs: GraphSchema,
		rhs: GraphSchema
	) {
		const rhsInstantiated = this.instantiateAttributes(rhs, match);

		const overlapAndDifference = this.computeOverlapAndDifferenceOfLhsAndRhs(
			lhs,
			rhsInstantiated
		);

		await this.replaceMatch(match, overlapAndDifference);
	}

	public async importHostgraph(
		hostgraphData: GraphSchema
	): Promise<ResultGraphSchema> {
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

	private async exportHostgraph(
		hostgraph: GraphSchema
	): Promise<ResultGraphSchema> {
		const nodes = await this.graphService.getAllNodes();
		const edges = await this.graphService.getAllEdges();

		// Attributes & Options should not have changed from the original hostgraph
		const attributes = hostgraph.attributes;
		const options = hostgraph.options;

		return { options, attributes, nodes, edges };
	}

	/**
	 * Main Algorithm performing the actual replacing of the pattern match
	 * 1. Removes all nodes/edges that are in LHS, but NOT part of the RHS
	 * 2. Updates all nodes/edges that are in LHS and part of the RHS
	 * 3. Adds all nodes/edges that are part of the RHS but not the LHS
	 *
	 * @param occurence The match found in the database for the given lhs pattern
	 * @param adjustment The difference (added, updated, removed) between the LHS and RHS (gluing interface)
	 */
	private async replaceMatch(
		occurence: DBGraphPatternMatchResult,
		adjustments: GraphDiffResult
	) {
		const preservedNodes: Record<string, string> = {};

		// Remove all nodes and edges that are not in the replacement graph
		const removedNodeIds = adjustments.removedNodes.map((node) => {
			return occurence.nodes[node.key].key;
		});
		await this.graphService.deleteNodes(removedNodeIds);

		const removedEdgesIds = adjustments.removedEdges.map((edge) => {
			return occurence.edges[edge.key].key;
		});
		await this.graphService.deleteEdges(removedEdgesIds);

		// Update all nodes and edges that are part of both search pattern and replacement graph
		for (const [key, rhsNode] of adjustments.updatedNodes) {
			if (rhsNode) {
				const oldNode = occurence.nodes[key];
				const internalId = oldNode.key;

				await this.graphService.updateNode(
					rhsNode.attributes,
					internalId,
					oldNode.attributes?.type ? [oldNode.attributes?.type] : []
				);

				preservedNodes[key] = internalId;
			}
		}
		for (const [key, rhsEdge] of adjustments.updatedEdges) {
			if (rhsEdge) {
				const oldEdge = occurence.edges[key];
				const internalId = oldEdge.key;

				const sourceInternalId = preservedNodes[rhsEdge.source];
				const targetInternalId = preservedNodes[rhsEdge.target];

				await this.graphService.updateEdge(
					sourceInternalId,
					targetInternalId,
					internalId,
					rhsEdge.attributes ?? []
				);

				preservedNodes[key] = internalId;
			}
		}

		// Add all new nodes & edges
		for (const rhsNode of adjustments.addedNodes) {
			const internalId = createNodeUuid();

			await this.graphService.createNode(rhsNode.attributes, internalId);

			preservedNodes[rhsNode.key] = internalId;
		}
		for (const rhsEdge of adjustments.addedEdges) {
			const internalId = createEdgeUuid();

			const sourceInternalId = preservedNodes[rhsEdge.source];
			const targetInternalId = preservedNodes[rhsEdge.target];

			await this.graphService.createEdge(
				sourceInternalId,
				targetInternalId,
				internalId,
				rhsEdge.attributes
			);
		}

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
				updatedNodes.set(lhsNode.key, rhsNode);
			} else {
				removedNodes.push(lhsNode);
			}
		}

		// All nodes that are in replacement but not in search graph are "added".
		// All search graph nodes should already be part of updated/removed, so if it
		// can't be found there, it has to be a new/added node
		for (const rhsNode of rhs.nodes) {
			if (!updatedNodes.has(rhsNode.key)) {
				addedNodes.push(rhsNode);
			}
		}

		// All edges in search graph that are also in replacement are "updated"
		// --> An edge is only identical, if both key, source and target match!
		// --> Nodes cannot be updated and will be deleted and recreated
		// TODO: Figure out what to do about attributes that are not explicitly specified
		// All edges in search graph that are not in replacement are "deleted"
		for (const lhsEdge of lhs.edges) {
			const rhsEdge = rhs.edges.find(
				(rhsEdge) =>
					rhsEdge.key === lhsEdge.key &&
					rhsEdge.source === lhsEdge.source &&
					lhsEdge.target === rhsEdge.target
			);

			if (rhsEdge) {
				updatedEdges.set(lhsEdge.key, rhsEdge);
			} else {
				removedEdges.push(lhsEdge);
			}
		}

		// All edges that are in replacement but not in search graph are "added".
		// All search graph edges should already be part of updated/removed, so if it
		// can't be found there, it has to be a new/added edge
		for (const rhsEdge of rhs.edges) {
			if (!updatedEdges.has(rhsEdge.key)) {
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

	private instantiateAttributes(
		graph: GraphSchema,
		match: DBGraphPatternMatchResult
	): GraphSchema {
		// clone graph for assignment to make sure attribute is only instantiated for this match
		const instantiatedGraph = structuredClone(graph);

		// the match now has a nodes object with the searchgraph key as property key
		// but for th jsonLogic matching we want the same structure as in the searchgraph
		const formattedMatch: GraphSchema = {
			attributes: graph.attributes,
			options: graph.options,
			nodes: [],
			edges: [],
		};

		for (const [key, node] of Object.entries(match.nodes)) {
			const formattedNode = { ...node };
			formattedNode.key = key;
			formattedMatch.nodes.push(formattedNode as GraphNodeSchema);
		}

		for (const [key, edge] of Object.entries(match.edges)) {
			const formattedEdge = { ...edge };
			formattedEdge.key = key;
			formattedMatch.edges.push(formattedEdge as GraphEdgeSchema);
		}

		instantiatedGraph.nodes.map((node) => {
			for (const [key, attribute] of Object.entries(node.attributes)) {
				if (typeof attribute === 'object') {
					node.attributes[key] = this.instantiatorService.instantiate(
						attribute.type,
						{ ...attribute.args, match: formattedMatch }
					);
				}
			}
		});
		instantiatedGraph.edges.map((edge) => {
			for (const [key, attribute] of Object.entries(edge.attributes)) {
				if (typeof attribute === 'object') {
					edge.attributes[key] = this.instantiatorService.instantiate(
						attribute.type,
						{ ...attribute.args, match: formattedMatch }
					);
				}
			}
		});

		return instantiatedGraph;
	}
}
