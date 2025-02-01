import { FastifyReply, FastifyRequest } from 'fastify';

import { GraphNodeSchema as GraphNodeSchemaInterface } from '../../../types/node.schema';

export interface ISingleNodeParams {
	nodeInternalId: string;
}

export const createNodeHandler = async (
	request: FastifyRequest<{ Body: GraphNodeSchemaInterface }>,
	reply: FastifyReply<{ Body: GraphNodeSchemaInterface }>
): Promise<FastifyReply<{ Body: GraphNodeSchemaInterface }>> => {
	const neo4jGraphService = request.neo4jGraphService;
	const body = request.body;

	let result = null;
	if (neo4jGraphService) {
		result = await neo4jGraphService.createNode(body?.attributes, body?.key);
	}

	return reply.code(201).send(result);
};

export const getNodeHandler = async (
	request: FastifyRequest<{ Params: ISingleNodeParams }>,
	reply: FastifyReply
): Promise<FastifyReply> => {
	const neo4jGraphService = request.neo4jGraphService;
	const params = request.params;

	let result = null;
	if (neo4jGraphService && params?.nodeInternalId) {
		result = await neo4jGraphService.getNode(params.nodeInternalId);
	}

	return reply.code(201).send(result);
};

export const getAllHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
): Promise<FastifyReply> => {
	const neo4jGraphService = request.neo4jGraphService;

	let result = null;
	if (neo4jGraphService) {
		result = await neo4jGraphService.getAllNodes();
	}

	return reply.code(201).send(result);
};

export const deleteNodeHandler = async (
	request: FastifyRequest<{ Params: ISingleNodeParams }>,
	reply: FastifyReply
) => {
	const neo4jGraphService = request.neo4jGraphService;
	const params = request.params;
	if (neo4jGraphService && params?.nodeInternalId) {
		await neo4jGraphService.deleteNode(params.nodeInternalId);
	}

	return reply.code(204).send({});
};

export const deleteAllHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	const neo4jGraphService = request.neo4jGraphService;
	if (neo4jGraphService) {
		await neo4jGraphService.deleteAllNodes();
	}

	return reply.code(204).send({});
};
