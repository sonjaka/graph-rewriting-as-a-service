import fastifyPlugin from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';

import GraphNodeSchema from '../../schemas/node.schema.json';
import GraphEdgeSchema from '../../schemas/edge.schema.json';
import GraphSchema from '../../schemas/graph.schema.json';
import GraphRewritingRule from '../../schemas/rewrite-rule.schema.json';
import GrsSchema from '../../schemas/grs.schema.json';

import grsRoutes from '../grs/routes/grs';

const grsPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
	if (fastify.hasRequestDecorator('dbGraphService')) {
		fastify.register(grsRoutes);
	}

	fastify.addSchema(GraphNodeSchema);
	fastify.addSchema(GraphEdgeSchema);
	fastify.addSchema(GraphSchema);
	fastify.addSchema(GraphRewritingRule);
	fastify.addSchema(GrsSchema);
};

export default fastifyPlugin(grsPlugin, {
	name: 'fastify-grs',
});
