import { FastifyReply, FastifyRequest } from 'fastify';

import { GraphNodeSchema as GraphNodeSchemaInterface } from '../../../types/node.schema';

export interface ISingleNodeParams {
	nodeInternalId: string;
}

export const createNodeHandler = async (
	request: FastifyRequest<{ Body: GraphNodeSchemaInterface }>,
	reply: FastifyReply<{ Body: GraphNodeSchemaInterface }>
): Promise<FastifyReply<{ Body: GraphNodeSchemaInterface }>> => {
	const nodeService = request.nodeService;
	const body = request.body;

	let result = null;
	if (nodeService) {
		result = await nodeService.createNode(body?.attributes, body?.key);
	}

	return reply.code(201).send(result);
};

export const getNodeHandler = async (
	request: FastifyRequest<{ Params: ISingleNodeParams }>,
	reply: FastifyReply
): Promise<FastifyReply> => {
	const nodeService = request.nodeService;
	const params = request.params;

	let result = null;
	if (nodeService && params?.nodeInternalId) {
		result = await nodeService.getNode(params.nodeInternalId);
	}

	return reply.code(201).send(result);
};

export const getAllHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
): Promise<FastifyReply> => {
	const nodeService = request.nodeService;

	let result = null;
	if (nodeService) {
		result = await nodeService.getAllNodes();
	}

	return reply.code(201).send(result);
};

export const deleteNodeHandler = async (
	request: FastifyRequest<{ Params: ISingleNodeParams }>,
	reply: FastifyReply
) => {
	const nodeService = request.nodeService;
	const params = request.params;
	if (nodeService && params?.nodeInternalId) {
		await nodeService.deleteNode(params.nodeInternalId);
	}

	return reply.code(204).send({});
};

export const deleteAllHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	const nodeService = request.nodeService;
	if (nodeService) {
		await nodeService.deleteAllNodes();
	}

	return reply.code(204).send({});
};
