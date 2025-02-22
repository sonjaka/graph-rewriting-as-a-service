import Graph from 'graphology';
import { GraphSchema } from '../../types/grs.schema';
import { GraphRewritingRuleSchema } from '../../types/rewrite-rule.schema';
import { IDBGraphService } from '../db/types';
import { GraphologyParserService } from './graphology.parser.service';
import {
	GrsGraphEdgeMetadata,
	GrsGraphMetadata,
	GrsGraphNodeMetadata,
} from './types';

// interface GrsRewriteRule {
// 	lhs: Graph<GrsGraphNodeMetadata, GrsGraphEdgeMetadata, GrsGraphMetadata>;
// 	rhs: Graph<GrsGraphNodeMetadata, GrsGraphEdgeMetadata, GrsGraphMetadata>;
// }

export class GrsService {
	constructor(private readonly graphService: IDBGraphService) {}

	public async replaceGraph(
		hostgraphData: GraphSchema,
		rules: GraphRewritingRuleSchema[]
	): Promise<GraphSchema> {
		this.graphService.graphType = hostgraphData.options.type;
		await this.importHostgraph(hostgraphData);

		for (const rule of rules) {
			const lhs = rule.lhs;

			await this.graphService.findPatternMatch(
				lhs.nodes,
				lhs.edges,
				lhs.options.type
			);

			console.log(lhs);
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
}
