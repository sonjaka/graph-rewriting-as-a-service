import fastifyPlugin from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';

import GraphRewritingRule from '../../schemas/rewrite-rule.schema.json';
import GrsSchema from '../../schemas/grs.schema.json';
import PatterngraphSchema from '../../schemas/patterngraph.schema.json';
import RewritingRuleProcessingConfigSchema from '../../schemas/run-config.schema.json';

import grsRoutes from '../grs/routes/grs';

const grsPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
	if (fastify.hasRequestDecorator('dbGraphService')) {
		fastify.register(grsRoutes);
	}

	fastify.addSchema(RewritingRuleProcessingConfigSchema);
	fastify.addSchema(PatterngraphSchema);
	fastify.addSchema(GraphRewritingRule);
	fastify.addSchema(GrsSchema);
};

export default fastifyPlugin(grsPlugin, {
	name: 'fastify-grs',
});
