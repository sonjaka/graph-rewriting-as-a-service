import Graph from 'graphology';
import { GraphSchema } from '../../types/grs.schema';
import { IGraphService } from '../graph/types';
import { GraphologyParserService } from './graphology.parser.service';
import {
	GrsGraphEdgeMetadata,
	GrsGraphMetadata,
	GrsGraphNodeMetadata,
} from './types';

export class GrsService {
	constructor(private readonly graphService: IGraphService) {}

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

	private prepareReturnGraph(
		graph: Graph<GrsGraphNodeMetadata, GrsGraphEdgeMetadata, GrsGraphMetadata>
	): Graph {
		for (const node of graph.nodeEntries()) {
			console.log(node);
			graph.removeNodeAttribute(node.node, '_grs_internalId');
		}

		for (const edge of graph.edgeEntries()) {
			graph.removeEdgeAttribute(edge.edge, '_grs_internalId');
			graph.removeEdgeAttribute(edge.edge, '_grs_source');
			graph.removeEdgeAttribute(edge.edge, '_grs_target');
		}

		return graph;
	}
}
