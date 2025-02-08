import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { errorReply, notFoundReply, okReply } from '../../../utils/response';

import GrsSchema from '../../../schemas/grs.schema.json';
import { GraphRewritingRequestSchema as GrsSchemaInterface } from '../../../types/grs.schema';
import { GrsService } from '../../../service/grs/grs.service';

// const importHostgraph = async (
// 	request: FastifyRequest,
// 	reply: FastifyReply
// ): Promise<FastifyReply> => {
// 	const graphService = request.graphService;

// 	if (graphService) {
// 		return okReply(reply, {});
// 	}

// 	return notFoundReply(reply, 'Not found');
// };

const grsHandler = async (
	request: FastifyRequest<{ Body: GrsSchemaInterface }>,
	reply: FastifyReply
): Promise<FastifyReply> => {
	const graphService = request.graphService;

	const hostgraphData = request.body.hostgraph;

	if (!graphService) {
		return errorReply(reply, 'Graph Service not set');
	}

	if (graphService) {
		const grsService = new GrsService(graphService);

		grsService.importHostgraph(hostgraphData);

		return okReply(reply, {});
	}

	return notFoundReply(reply, 'Not found');
};

export default async function routes(fastify: FastifyInstance) {
	// fastify.post<{ Body: GraphSchemaInterface }>(
	// 	'/hostgraph',
	// 	{ schema: { body: GraphSchema } },
	// 	importHostgraph
	// );

	fastify.post<{ Body: GrsSchemaInterface }>(
		'/grs',
		{ schema: { body: GrsSchema } },
		grsHandler
	);
}
