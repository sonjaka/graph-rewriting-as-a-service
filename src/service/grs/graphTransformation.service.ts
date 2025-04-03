import Graph from 'graphology';
import {
	ExternalReplacementGraphConfig,
	GraphRewritingRequestSchema,
	GraphSchema,
} from '../../types/grs.schema';
import { GraphRewritingRuleSchema } from '../../types/rewrite-rule.schema';
import {
	DBGraphEdgeMetadata,
	DBGraphNACs,
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
import { PatternGraphSchema } from '../../types/patterngraph.schema';
import { PatternNodeSchema } from '../../types/patternnode.schema';
import { ReplacementGraphSchema } from '../../types/replacementgraph.schema';
import { ReplacementNodeSchema } from '../../types/replacementnode.schema';
import { ReplacementEdgeSchema } from '../../types/replacementedge.schema';
import { getRandomIntBetween } from '../../utils/numbers';

export type ResultGraphSchema = Omit<GraphSchema, 'nodes' | 'edges'> & {
	nodes: (Omit<GraphNodeSchema, 'attributes'> & {
		attributes: DBGraphNodeMetadata;
	})[];
	edges: (Omit<GraphEdgeSchema, 'attributes'> & {
		attributes: DBGraphEdgeMetadata;
	})[];
};

type NodeMatchMap = Map<string, ReplacementNodeSchema | undefined>;
type EdgeMatchMap = Map<string, ReplacementEdgeSchema | undefined>;
interface GraphDiffResult {
	updatedNodes: NodeMatchMap;
	addedNodes: ReplacementNodeSchema[];
	removedNodes: PatternNodeSchema[];
	updatedEdges: EdgeMatchMap;
	addedEdges: ReplacementEdgeSchema[];
	removedEdges: GraphEdgeSchema[];
}
interface ExternalAPIPostRequest {
	method: 'POST';
	headers: Record<string, string>;
	body: string;
}

interface ExternalAPIJSONResult {
	data: ReplacementGraphSchema;
}

export class GraphTransformationService {
	private instantiatorService;
	private history: ResultGraphSchema[] = [];
	private trackHistory = false;
	private hostgraphOptions: GraphSchema['options'] = {
		type: 'undirected',
	};

	constructor(private readonly graphService: IDBGraphService) {
		this.instantiatorService = new InstantiatorService();
	}

	public async transformGraph(
		hostgraphData: GraphSchema,
		rules: GraphRewritingRuleSchema[] = [],
		processingConfig: RewritingRuleProcessingConfigSchema[] = [],
		options: GraphRewritingRequestSchema['options'] = {}
	): Promise<ResultGraphSchema[]> {
		this.graphService.graphType = hostgraphData.options.type;
		await this.importHostgraph(hostgraphData);

		this.history = [];
		this.trackHistory = options?.returnHistory || false;
		this.hostgraphOptions = hostgraphData.options;

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

		const finalHostgraph = await this.exportHostgraph();
		this.history.push(finalHostgraph);

		return this.history;
	}

	private async executeRule(
		ruleConfig: GraphRewritingRuleSchema,
		sequenceConfig?: RewritingRuleProcessingConfigSchema
	) {
		const { options, patternGraph } = ruleConfig;
		let replacementGraph = ruleConfig.replacementGraph;

		let repetitions = 1;
		if (sequenceConfig?.options?.repeat) {
			if (
				Array.isArray(sequenceConfig.options.repeat) &&
				sequenceConfig.options.repeat.length === 2
			) {
				const min = sequenceConfig.options.repeat[0];
				const max = sequenceConfig.options.repeat[1];
				repetitions = getRandomIntBetween(min, max);
			} else if (typeof sequenceConfig.options.repeat === 'number') {
				repetitions = sequenceConfig.options.repeat;
			} else {
				throw Error(
					'GraphTransformationService: sequence.options.repeat is not a number or numberArray'
				);
			}
		}

		for (let i = 0; i < repetitions; i++) {
			// Handle edge case for empty pattern
			// Additions are still possible!
			const match = { nodes: {}, edges: {} };
			if (!patternGraph.nodes.length && !patternGraph.edges.length) {
				replacementGraph = await this.handleExternalInstantiation(
					match,
					replacementGraph
				);

				await this.performInstantiationAndReplacement(
					match,
					patternGraph,
					replacementGraph
				);

				return;
			}

			let homomorphic = true;
			if (options && 'homomorphic' in options) {
				homomorphic = options.homomorphic ? true : false;
			}

			let nacs: DBGraphNACs[] = [];
			if (patternGraph.nacs) {
				nacs = [patternGraph.nacs];
			}
			const matches = await this.graphService.findPatternMatch(
				patternGraph.nodes,
				patternGraph.edges,
				patternGraph.options.type,
				homomorphic,
				nacs
			);

			// --> either we fix this, or we remove option for multiple replacements
			// --> user can still replace all occurences by sending the request multiple times
			if (matches.length) {
				let max = 1;

				if (sequenceConfig) {
					if (sequenceConfig.options.mode === 'all') {
						max = matches.length;
					} else if (
						sequenceConfig.options.mode === 'interval' &&
						sequenceConfig.options?.interval?.max
					) {
						max = Math.min(sequenceConfig.options.interval.max, matches.length);
					}
				}

				for (let i = 0; i < max; i++) {
					const match = matches[i];

					replacementGraph = await this.handleExternalInstantiation(
						match,
						replacementGraph
					);

					await this.performInstantiationAndReplacement(
						match,
						patternGraph,
						replacementGraph
					);

					if (this.trackHistory) {
						const currentHostgraph = await this.exportHostgraph();
						this.history.push(currentHostgraph);
					}
				}
			}
		}
	}

	private async handleExternalInstantiation(
		match: DBGraphPatternMatchResult,
		replacementGraph: ReplacementGraphSchema | ExternalReplacementGraphConfig
	): Promise<ReplacementGraphSchema> {
		if ('useExternalInstantiation' in replacementGraph) {
			return await this.fetchExternalReplacementGraph(match, replacementGraph);
		}

		return replacementGraph;
	}

	private async fetchExternalReplacementGraph(
		searchMatch: DBGraphPatternMatchResult,
		replacementGraph: ExternalReplacementGraphConfig
	): Promise<ReplacementGraphSchema> {
		if (!replacementGraph.endpoint) {
			throw new Error(
				'GraphTransformationService: external api endpoint not passed for instantiation of replacement graph'
			);
		}

		const params: ExternalAPIPostRequest = {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: '',
		};

		let body = {
			searchMatch: searchMatch,
		};

		if (replacementGraph.additionalRequestBodyParameters) {
			body = {
				...body,
				...replacementGraph.additionalRequestBodyParameters,
			};
		}

		params.body = JSON.stringify(body);

		try {
			const response = await fetch(replacementGraph.endpoint, params);
			if (!response.ok) {
				throw new Error(
					`GraphTransformationService: fetch to external api endpoint failed with response ${response.status}`
				);
			}
			const { data } = (await response.json()) as ExternalAPIJSONResult;

			if (!data || (!data?.nodes && !data?.edges)) {
				return Promise.reject(
					new Error(
						'GraphTransformationService: external API instantiation did not yield graph schema with nodes and edges'
					)
				);
			}

			if (data.nodes && !data.edges) {
				data.edges = [];
			} else if (!data.nodes && data.edges) {
				data.nodes = [];
			}

			return data;
		} catch (error) {
			return Promise.reject(error);
		}
	}

	private async performInstantiationAndReplacement(
		match: DBGraphPatternMatchResult,
		lhs: PatternGraphSchema,
		rhs: ReplacementGraphSchema
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

		const parser = new GraphologyParserService();
		// graphology requires graph attributes options
		const hostgraph = parser.parseGraph({ ...hostgraphData, attributes: {} });

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
		hostgraph?: GraphSchema
	): Promise<ResultGraphSchema> {
		const nodes = (await this.graphService.getAllNodes()) as GraphNodeSchema[];
		const edges = (await this.graphService.getAllEdges()) as GraphEdgeSchema[];

		let options = this.hostgraphOptions;

		// Options should not have changed from the original hostgraph
		if (hostgraph) {
			options = hostgraph.options;
		}

		return { options, nodes, edges };
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

		if (Object.entries(occurence.nodes).length) {
			// Remove all nodes and edges that are not in the replacement graph
			const removedNodeIds = adjustments.removedNodes.map((node) => {
				return occurence.nodes[node.key].key;
			});
			await this.graphService.deleteNodes(removedNodeIds);
		}

		if (Object.entries(occurence.edges).length) {
			const removedEdgesIds = adjustments.removedEdges.map((edge) => {
				return occurence.edges[edge.key].key;
			});
			await this.graphService.deleteEdges(removedEdgesIds);
		}

		// Update all nodes and edges that are part of both search pattern and replacement graph
		if (Object.entries(occurence.nodes).length) {
			for (const [key, rhsNode] of adjustments.updatedNodes) {
				if (rhsNode) {
					const oldNode = occurence.nodes[key];
					const internalId = oldNode.key;

					let options = {};
					if (rhsNode?.rewriteOptions) {
						options = rhsNode.rewriteOptions;
					}

					await this.graphService.updateNode(
						rhsNode.attributes ?? {},
						internalId,
						oldNode.attributes?.type ? [oldNode.attributes?.type] : [],
						options
					);

					preservedNodes[key] = internalId;
				}
			}
		}

		if (Object.entries(occurence.edges).length) {
			for (const [key, rhsEdge] of adjustments.updatedEdges) {
				if (rhsEdge) {
					const oldEdge = occurence.edges[key];
					const internalId = oldEdge.key;

					const sourceInternalId = preservedNodes[rhsEdge.source];
					const targetInternalId = preservedNodes[rhsEdge.target];

					let options = {};
					if (rhsEdge?.rewriteOptions) {
						options = rhsEdge.rewriteOptions;
					}

					await this.graphService.updateEdge(
						sourceInternalId,
						targetInternalId,
						internalId,
						rhsEdge.attributes ?? [],
						options
					);

					preservedNodes[key] = internalId;
				}
			}
		}

		// Add all new nodes & edges
		for (const rhsNode of adjustments.addedNodes) {
			const internalId = createNodeUuid();

			await this.graphService.createNode(rhsNode.attributes ?? {}, internalId);

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
		lhs: PatternGraphSchema,
		rhs: ReplacementGraphSchema
	): GraphDiffResult {
		const updatedNodes: NodeMatchMap = new Map();
		const removedNodes: PatternNodeSchema[] = [];
		const addedNodes: ReplacementNodeSchema[] = [];

		const updatedEdges: EdgeMatchMap = new Map();
		const removedEdges: GraphEdgeSchema[] = [];
		const addedEdges: ReplacementEdgeSchema[] = [];

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
		graph: ReplacementGraphSchema,
		match: DBGraphPatternMatchResult
	): ReplacementGraphSchema {
		// clone graph for assignment to make sure attribute is only instantiated for this match
		const instantiatedGraph = structuredClone(graph);

		// the match now has a nodes object with the searchgraph key as property key
		// but for th jsonLogic matching we want the same structure as in the searchgraph
		const formattedMatch: GraphSchema = {
			options: graph.options,
			nodes: [],
			edges: [],
		};

		if (match?.nodes) {
			for (const [key, node] of Object.entries(match.nodes)) {
				const formattedNode = { ...node };
				formattedNode.key = key;
				formattedMatch.nodes.push(formattedNode as GraphNodeSchema);
			}
		}

		if (match?.edges) {
			for (const [key, edge] of Object.entries(match.edges)) {
				const formattedEdge = { ...edge };
				formattedEdge.key = key;
				formattedMatch.edges.push(formattedEdge as GraphEdgeSchema);
			}
		}

		instantiatedGraph.nodes.map((node) => {
			if (node?.attributes) {
				for (const [key, attribute] of Object.entries(node.attributes)) {
					if (attribute === null) continue;
					if (typeof attribute === 'object') {
						node.attributes[key] = this.instantiatorService.instantiate(
							attribute.type,
							{ ...attribute.args, match: formattedMatch }
						);
					}
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
