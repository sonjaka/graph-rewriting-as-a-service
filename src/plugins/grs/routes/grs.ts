import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { IReply, notFoundReply, okReply } from '../../../utils/response';

import GrsSchema from '../../../schemas/grs.schema.json';
import { GraphRewritingRequestSchema as GrsSchemaInterface } from '../../../types/grs.schema';
import { GraphSchema as GraphSchemaInterface } from '../../../types/graph.schema';
import { GrsService } from '../../../service/grs/grs.service';

const importHostgraph = async (
	request: FastifyRequest<{ Body: GrsSchemaInterface }>,
	reply: FastifyReply
): Promise<FastifyReply> => {
	const graphService = request.graphService;

	if (graphService) {
		const hostgraphData = request.body.hostgraph;

		const grsService = new GrsService(graphService);
		grsService.importHostgraph(hostgraphData);

		return okReply(reply, {});
	}

	return notFoundReply(reply, 'Not found');
};

const grsHandler = async (
	request: FastifyRequest<{ Body: GrsSchemaInterface }>,
	reply: FastifyReply
): Promise<IReply<GraphSchemaInterface>> => {
	const graphService = request.graphService;

	const hostgraphData = request.body.hostgraph;

	if (!graphService) {
		throw new Error('Graph Service not set');
	}

	if (graphService) {
		const grsService = new GrsService(graphService);

		const hostgraph = await grsService.importHostgraph(hostgraphData);
		console.log(hostgraph);

		return okReply(reply, hostgraph);
	}

	return notFoundReply(reply, 'Not found');
};

export default async function routes(fastify: FastifyInstance) {
	fastify.post<{ Body: GrsSchemaInterface }>(
		'/hostgraph',
		{ schema: { body: GrsSchema } },
		importHostgraph
	);

	fastify.post<{
		Body: GrsSchemaInterface;
		Reply: IReply<GraphSchemaInterface>;
	}>('/grs', { schema: { body: GrsSchema } }, grsHandler);
}
