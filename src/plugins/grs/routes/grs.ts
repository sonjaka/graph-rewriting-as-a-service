import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { IReply, notFoundReply, okReply } from '../../../utils/response';

import GrsSchema from '../../../schemas/grs.schema.json';
import { GraphRewritingRequestSchema as GrsSchemaInterface } from '../../../types/grs.schema';
import { GraphSchema as GraphSchemaInterface } from '../../../types/graph.schema';
import { GraphTransformationService } from '../../../service/grs/graphTransformation.service';

const importHostgraph = async (
	request: FastifyRequest<{ Body: GrsSchemaInterface }>,
	reply: FastifyReply
): Promise<FastifyReply> => {
	const dbGraphService = request.dbGraphService;

	if (dbGraphService) {
		const hostgraphData = request.body.hostgraph;

		const grsService = new GraphTransformationService(dbGraphService);
		grsService.importHostgraph(hostgraphData);

		return okReply(reply, {});
	}

	return notFoundReply(reply, 'Not found');
};

const grsHandler = async (
	request: FastifyRequest<{ Body: GrsSchemaInterface }>,
	reply: FastifyReply
): Promise<IReply<GraphSchemaInterface>> => {
	const dbGraphService = request.dbGraphService;

	const hostgraphData = request.body.hostgraph;
	const rules = request.body.rules || [];
	const sequence = request.body.sequence || [];
	const options = request.body.options || {};

	if (!dbGraphService) {
		throw new Error('Graph Service not set');
	}

	if (dbGraphService) {
		const grsService = new GraphTransformationService(dbGraphService);

		const result = await grsService.transformGraph(
			hostgraphData,
			rules,
			sequence,
			options
		);

		return okReply(reply, result);
	}

	return notFoundReply(reply, 'Not found');
};

const externalApiExampleHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	const result = {
		options: {
			type: 'directed',
		},
		nodes: [
			{
				key: 'A',
				attributes: {
					label: "This is A's new label!",
				},
			},
			{
				key: 'B',
				attributes: {
					label: "This is B's new label!",
				},
			},
		],
		edges: [
			{
				key: 'aToB',
				source: 'A',
				target: 'B',
				attributes: {
					label: 'This is the new edge label! :)',
				},
			},
		],
	};
	return okReply(reply, result);
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

	fastify.post('/example-external-api-result', externalApiExampleHandler);
}
