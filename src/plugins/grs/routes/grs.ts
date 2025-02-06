import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { notFoundReply, okReply } from '../../../utils/response';

import GraphSchema from '../../../schemas/graph.schema.json';
import { GraphSchema as GraphSchemaInterface } from '../../../types/graph.schema';

const importHostgraph = async (
	request: FastifyRequest,
	reply: FastifyReply
): Promise<FastifyReply> => {
	const graphService = request.graphService;

	if (graphService) {
		return okReply(reply, {});
	}

	return notFoundReply(reply, 'Not found');
};

export default async function routes(fastify: FastifyInstance) {
	fastify.post<{ Body: GraphSchemaInterface }>(
		'/hostgraph',
		{ schema: { body: GraphSchema } },
		importHostgraph
	);
}
