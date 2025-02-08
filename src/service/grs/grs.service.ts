import { GraphSchema } from '../../types/grs.schema';
import { IGraphService } from '../graph/types';
import { GraphologyParserService } from './graphology.parser.service';

export class GrsService {
	constructor(private readonly graphService: IGraphService) {}

	public async importHostgraph(hostgraphData: GraphSchema) {
		// First delete all previous nodes and edges
		await this.graphService.deleteAllNodes();

		// not all attributes required by graphology are also required in our input scheme
		// so we need to set default values here
		if (!hostgraphData?.attributes) {
			hostgraphData.attributes = {};
		}

		const parser = new GraphologyParserService();
		const hostgraph = parser.parseGraph(hostgraphData);

		console.log(hostgraph);
	}
}
