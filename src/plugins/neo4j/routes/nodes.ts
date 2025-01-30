import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
	createNode,
	deleteNode,
	deleteAllNodes,
	getNode,
	getAllNodes,
} from '../../../service/graph/neo4j/nodes.service';

import GraphNodeSchema from '../../../schemas/node.schema.json';
import { GraphNodeSchema as GraphNodeSchemaInterface } from '../../../types/node.schema';

const createNodeHandler = async (
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

const getNodeHandler = async (
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

const getAllHandler = async (
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

interface ISingleNodeParams {
	nodeInternalId: string;
}

const deleteNodeHandler = async (
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

const deleteAllHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	const session = request.neo4j;
	if (session) {
		await deleteAllNodes(session);
	}

	return reply.code(204).send({});
};

export default async function routes(fastify: FastifyInstance) {
	fastify.post<{ Body: GraphNodeSchemaInterface }>(
		'/node',
		{ schema: { body: GraphNodeSchema } },
		createNodeHandler
	);
	fastify.get<{ Params: ISingleNodeParams }>(
		'/node/:nodeInternalId',
		getNodeHandler
	);
	fastify.delete<{ Params: ISingleNodeParams }>(
		'/node/:nodeInternalId',
		deleteNodeHandler
	);

	fastify.get('/nodes', getAllHandler);
	fastify.delete('/nodes', deleteAllHandler);
}
