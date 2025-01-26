import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const healthcheck = async (
	request: FastifyRequest,
	reply: FastifyReply
): Promise<FastifyReply> => {
	const session = request.neo4j;

	if (session) {
		reply.code(200).send({});
	}

	throw Error('Neo4j session not found');
};

export default async function routes(fastify: FastifyInstance) {
	fastify.get('/health', healthcheck);
}
