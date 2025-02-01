import { FastifyReply, FastifyRequest } from 'fastify';

import { GraphEdgeSchema as GraphEdgeSchemaInterface } from '../../../types/edge.schema';

export interface ISingleEdgeParams {
	edgeInternalId: string;
}

export const createEdgeHandler = async (
	request: FastifyRequest<{ Body: GraphEdgeSchemaInterface }>,
	reply: FastifyReply<{ Body: GraphEdgeSchemaInterface }>
): Promise<FastifyReply<{ Body: GraphEdgeSchemaInterface }>> => {
	const neo4jGraphService = request.neo4jGraphService;
	const body = request.body;

	let result = null;
	if (neo4jGraphService) {
		result = await neo4jGraphService.createEdge(
			body.source,
			body.target,
			body.key,
			body.attributes || {}
		);
	}

	return reply.code(201).send(result);
};

// TODO: implement
// export const getEdgeHandler = async () => {};

// export const deleteEdgeHandler = async (
// 	request: FastifyRequest<{ Params: ISingleEdgeParams }>,
// 	reply: FastifyReply
// ) => {
// 	const neo4jGraphService = request.neo4jGraphService;
// 	const params = request.params;
// 	if (neo4jGraphService && params?.edgeInternalId) {
// 		await neo4jGraphService.deleteEdge(params.edgeInternalId);
// 	}

// 	return reply.code(204).send({});
// };

// TODO: implement
// export const getAllEdgesHandler = async () => {};

// TODO: implement
// export const deleteAllEdgesHandler = async () => {};
