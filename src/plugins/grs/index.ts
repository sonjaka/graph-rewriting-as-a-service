import fastifyPlugin from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';

import GraphRewritingRule from '../../shared/schemas/rewrite-rule.schema.json';
import GrsSchema from '../../shared/schemas/grs.schema.json';
import PatterngraphSchema from '../../shared/schemas/patterngraph.schema.json';
import RewritingRuleProcessingConfigSchema from '../../shared/schemas/run-config.schema.json';

import grsRoutes from '../grs/routes/grs';

const grsPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
	if (fastify.hasRequestDecorator('dbGraphService')) {
		fastify.register(grsRoutes);
	} else {
		fastify.log.error('Fastify GRS Plugin: No database plugin installed.');
	}

	fastify.addSchema(RewritingRuleProcessingConfigSchema);
	fastify.addSchema(PatterngraphSchema);
	fastify.addSchema(GraphRewritingRule);
	fastify.addSchema(GrsSchema);
};

export default fastifyPlugin(grsPlugin, {
	name: 'fastify-grs',
});
