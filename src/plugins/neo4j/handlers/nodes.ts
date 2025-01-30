import { FastifyReply, FastifyRequest } from 'fastify';
import {
	createNode,
	deleteNode,
	deleteAllNodes,
	getNode,
	getAllNodes,
} from '../../../service/graph/neo4j/nodes.service';

import { GraphNodeSchema as GraphNodeSchemaInterface } from '../../../types/node.schema';

export interface ISingleNodeParams {
	nodeInternalId: string;
}

export const createNodeHandler = async (
	request: FastifyRequest<{ Body: GraphNodeSchemaInterface }>,
	reply: FastifyReply<{ Body: GraphNodeSchemaInterface }>
): Promise<FastifyReply<{ Body: GraphNodeSchemaInterface }>> => {
	const session = request.neo4j;

	const body = request.body;

	let result = null;
	if (session) {
		result = await createNode(session, body?.attributes, body?.key);
	}

	return reply.code(201).send(result);
};

export const getNodeHandler = async (
	request: FastifyRequest<{ Params: ISingleNodeParams }>,
	reply: FastifyReply
): Promise<FastifyReply> => {
	const session = request.neo4j;
	const params = request.params;

	let result = null;
	if (session && params?.nodeInternalId) {
		result = await getNode(session, params.nodeInternalId);
	}

	return reply.code(201).send(result);
};

export const getAllHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
): Promise<FastifyReply> => {
	const session = request.neo4j;

	let result = null;
	if (session) {
		result = await getAllNodes(session);
	}

	return reply.code(201).send(result);
};

export const deleteNodeHandler = async (
	request: FastifyRequest<{ Params: ISingleNodeParams }>,
	reply: FastifyReply
) => {
	const session = request.neo4j;
	const params = request.params;
	if (session && params?.nodeInternalId) {
		await deleteNode(session, params.nodeInternalId);
	}

	return reply.code(204).send({});
};

export const deleteAllHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	const session = request.neo4j;
	if (session) {
		await deleteAllNodes(session);
	}

	return reply.code(204).send({});
};
