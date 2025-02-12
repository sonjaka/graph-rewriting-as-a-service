import { FastifyInstance } from 'fastify';

import NotFoundResponseSchema from '../../../schemas/response/404.schema.json';
import GraphNodeSchema from '../../../schemas/node.schema.json';
import { GraphNodeSchema as GraphNodeSchemaInterface } from '../../../types/node.schema';
import {
	createNodeHandler,
	deleteAllNodesHandler,
	deleteNodeHandler,
	getAllNodesHandler,
	getNodeHandler,
	type ISingleNodeParams,
} from '../handlers/nodes';

export default async function routes(fastify: FastifyInstance) {
	fastify.post<{ Body: GraphNodeSchemaInterface }>(
		'/node',
		{
			schema: {
				body: GraphNodeSchema,
				response: {
					201: {
						description: 'Expected Response',
						type: 'object',
						properties: {
							code: { enum: [201] },
							status: { enum: ['success'] },
							data: GraphNodeSchema,
						},
					},
				},
			},
		},
		createNodeHandler
	);
	fastify.get<{
		Params: ISingleNodeParams;
	}>(
		'/node/:nodeInternalId',
		{
			schema: {
				response: {
					200: {
						description: 'Expected Response',
						type: 'object',
						properties: {
							code: { enum: [200] },
							status: { enum: ['success'] },
							data: GraphNodeSchema,
						},
					},
					404: NotFoundResponseSchema,
				},
			},
		},
		getNodeHandler
	);

	fastify.delete<{ Params: ISingleNodeParams }>(
		'/node/:nodeInternalId',
		deleteNodeHandler
	);

	fastify.get('/nodes', getAllNodesHandler);
	fastify.delete('/nodes', deleteAllNodesHandler);
}
