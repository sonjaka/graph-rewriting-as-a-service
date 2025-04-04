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
import { InstantiatorService } from '../instantiation/instantiator.service';
import { PatternGraphSchema } from '../../types/patterngraph.schema';
import { ReplacementGraphSchema } from '../../types/replacementgraph.schema';
import { ReplacementNodeSchema } from '../../types/replacementnode.schema';
import { ReplacementEdgeSchema } from '../../types/replacementedge.schema';
import { getRandomIntBetween } from '../../utils/numbers';
import { SpoRewriteService } from './spo-rewrite.service';

export type ResultGraphSchema = Omit<GraphSchema, 'nodes' | 'edges'> & {
	nodes: (Omit<GraphNodeSchema, 'attributes'> & {
		attributes: DBGraphNodeMetadata;
	})[];
	edges: (Omit<GraphEdgeSchema, 'attributes'> & {
		attributes: DBGraphEdgeMetadata;
	})[];
};

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
			// If no sequence config is given, run and replace only the first match
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

				this.updateHistory();

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

			console.log('MATCHES:', matches);

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

					this.updateHistory();
				}
			}
		}
	}

	private async handleExternalInstantiation(
		match: DBGraphPatternMatchResult,
		replacementGraph: ReplacementGraphSchema | ExternalReplacementGraphConfig
	): Promise<ReplacementGraphSchema> {
		if ('useExternalInstantiation' in replacementGraph) {
			const instantiatorPlugin =
				this.instantiatorService.getGraphInstantiator('externalApi');
			return await instantiatorPlugin.instantiate({ match, replacementGraph });
		}

		return replacementGraph;
	}

	private async performInstantiationAndReplacement(
		match: DBGraphPatternMatchResult,
		lhs: PatternGraphSchema,
		rhs: ReplacementGraphSchema
	) {
		const rhsInstantiated = this.instantiateAttributes(rhs, match);

		const rewriteService = new SpoRewriteService(this.graphService);
		await rewriteService.performReplacement(match, lhs, rhsInstantiated);
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
			return this.handleAttributeInstantiationForEdgeOrNodeItem(
				node,
				formattedMatch
			);
		});
		instantiatedGraph.edges.map((edge) => {
			return this.handleAttributeInstantiationForEdgeOrNodeItem(
				edge,
				formattedMatch
			);
		});

		return instantiatedGraph;
	}

	private handleAttributeInstantiationForEdgeOrNodeItem(
		item: ReplacementEdgeSchema | ReplacementNodeSchema,
		match: GraphSchema
	) {
		if (item?.attributes) {
			for (const [key, attribute] of Object.entries(item.attributes)) {
				if (attribute === null) continue;
				if (typeof attribute === 'object') {
					const instantiatorPlugin =
						this.instantiatorService.getValueInstantiator(attribute.type);
					item.attributes[key] = instantiatorPlugin.instantiate({
						...attribute.args,
						match,
					});
				}
			}
		}
		return item;
	}

	private async updateHistory() {
		if (this.trackHistory) {
			const currentHostgraph = await this.exportHostgraph();
			this.history.push(currentHostgraph);
		}
	}
}
