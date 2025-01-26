import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createNode } from '../service/graph/neo4j/nodes.service';

const createNodeRecord = async (
	request: FastifyRequest,
	reply: FastifyReply
): Promise<FastifyReply> => {
	const session = request.neo4j;

	const body = request.body;

	let result = null;
	if (session) {
		result = await createNode(session, body?.attributes, body?.key);
	}

	return reply.code(201).send(result);
};

export default async function routes(fastify: FastifyInstance) {
	fastify.post('/node', createNodeRecord);
	// fastify.get('/node', (request, reply) => {});
}
