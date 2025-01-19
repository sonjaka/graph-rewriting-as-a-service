import 'dotenv/config';

import fastify, { FastifyInstance, FastifyLoggerOptions } from 'fastify';
import { Server, IncomingMessage, ServerResponse } from 'http';

import { loggerConfig } from './config/logger';
import { getAppEnvConfig } from './config/env';

/**
 * Creates a fastify server instance
 */
export function buildServer(): FastifyInstance {
	const appEnvConfig = getAppEnvConfig();

	const server: FastifyInstance<Server, IncomingMessage, ServerResponse> =
		fastify({
			logger: loggerConfig[appEnvConfig.APP_ENV] ?? true,
			ignoreTrailingSlash: true,
		});

	return server;
}
