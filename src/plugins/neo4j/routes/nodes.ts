import { FastifyInstance } from 'fastify';

import GraphNodeSchema from '../../../schemas/node.schema.json';
import { GraphNodeSchema as GraphNodeSchemaInterface } from '../../../types/node.schema';
import {
	createNodeHandler,
	deleteAllHandler,
	deleteNodeHandler,
	getAllHandler,
	getNodeHandler,
	type ISingleNodeParams,
} from '../handlers/nodes';

export default async function routes(fastify: FastifyInstance) {
	fastify.post<{ Body: GraphNodeSchemaInterface }>(
		'/node',
		{ schema: { body: GraphNodeSchema } },
		createNodeHandler
	);
	fastify.get<{
		Params: ISingleNodeParams;
	}>('/node/:nodeInternalId', getNodeHandler);

	fastify.delete<{ Params: ISingleNodeParams }>(
		'/node/:nodeInternalId',
		deleteNodeHandler
	);

	fastify.get('/nodes', getAllHandler);
	fastify.delete('/nodes', deleteAllHandler);
}
