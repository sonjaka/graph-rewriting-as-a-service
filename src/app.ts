import 'dotenv/config';

import fastify, { FastifyInstance } from 'fastify';
import { Server, IncomingMessage, ServerResponse } from 'http';

import Swagger from '@fastify/swagger';
import SwaggerUI from '@fastify/swagger-ui';

import { loggerConfig } from './config/logger';
import { getAppEnvConfig } from './config/env';

import healthRoutes from './routes/health';

import neo4jConnector from './plugins/neo4j/index';
import grsPlugin from './plugins/grs/index';

/**
 * Creates a fastify server instance
 */
export function buildServer(): FastifyInstance {
	const appEnvConfig = getAppEnvConfig();

	const server: FastifyInstance<Server, IncomingMessage, ServerResponse> =
		fastify({
			logger: loggerConfig[appEnvConfig.APP_ENV] ?? false,
			ignoreTrailingSlash: true,
		});

	// Setup Swagger / SwaggerUI
	// Access Swagger page through http://localhost:8080/documentation endpoint
	server.register(Swagger, {
		openapi: {
			openapi: '3.0.0',
			info: {
				title: 'Graph Rewriting as a Service',
				// description: '',
				version: '1.0.0',
			},
			servers: [
				{
					url: 'http://localhost:8080/',
					description: 'Local Development Server',
				},
			],
			// tags: [
			// 	{ name: 'node', description: 'Node related end-points' },
			// 	{ name: 'edge', description: 'Edge related end-points' },
			// 	{ name: 'grs', description: 'GRS related end-points' },
			// ],
			// components: {
			// 	securitySchemes: {
			// 		apiKey: {
			// 			type: 'apiKey',
			// 			name: 'apiKey',
			// 			in: 'header',
			// 		},
			// 	},
			// },
			externalDocs: {
				url: 'https://github.com/sonjaka/graph-rewriting-as-a-service',
				description:
					'Github Repository of the "Graph Rewriting as a Service" project',
			},
		},
	});
	server.register(SwaggerUI);

	server.register(healthRoutes);

	// Use neo4j
	server.register(neo4jConnector);
	// Add grs plugin
	server.register(grsPlugin);

	return server;
}
