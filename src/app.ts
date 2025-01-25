import 'dotenv/config';

import fastify, { FastifyInstance } from 'fastify';
import { Server, IncomingMessage, ServerResponse } from 'http';

import Swagger from '@fastify/swagger';
import SwaggerUI from '@fastify/swagger-ui';

import { loggerConfig } from './config/logger';
import { getAppEnvConfig } from './config/env';

import healthRoutes from './routes/health';

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
	// Access Swagger page through <root-route>/documentation endpoint
	server.register(Swagger);
	server.register(SwaggerUI);

	server.register(healthRoutes);

	return server;
}
