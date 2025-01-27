import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createNode } from '../service/graph/neo4j/nodes.service';

import GraphNodeSchema from '../schemas/node.schema.json';
import { GraphNodeSchema as GraphNodeSchemaInterface } from '../types/node.schema';

const createNodeRecord = async (
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

export default async function routes(fastify: FastifyInstance) {
	fastify.post<{ Body: GraphNodeSchemaInterface }>(
		'/node',
		{ schema: { body: GraphNodeSchema } },
		createNodeRecord
	);
	// fastify.get('/node', (request, reply) => {});
}
