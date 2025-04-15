import { IGraphInstantiator } from '../types';
import { ReplacementGraphSchema } from '../../../types/replacementgraph.schema';
import { ExternalApiInstantiationOptions } from '../../../types/grs.schema';
import { DBGraphPatternMatchResult } from '../../db/types';

interface ExternalApiInstantiatorOptions
	extends ExternalApiInstantiationOptions {
	match: DBGraphPatternMatchResult;
}

export enum ExternalApiInstantiatorErrors {
	'NoEndpoint' = 'ExternalApiInstantiation: external api endpoint not passed for instantiation of replacement graph',
	'FailedFetch' = 'ExternalApiInstantiation: fetch to external api endpoint failed with response',
	'InvalidResult' = 'ExternalApiInstantiation: external API instantiation did not yield graph schema with nodes and edges',
}

interface ExternalAPIPostRequest {
	method: 'POST';
	headers: Record<string, string>;
	body: string;
}

interface ExternalAPIJSONResult {
	data: ReplacementGraphSchema;
}

export class ExternalApiInstantiator
	implements IGraphInstantiator<ExternalApiInstantiatorOptions>
{
	_instantiatorKey = 'externalApi';

	get instantiatorKey() {
		return this._instantiatorKey;
	}

	public async instantiate(args: ExternalApiInstantiatorOptions) {
		return this.instantiateGraph(args);
	}

	public async instantiateGraph(args: ExternalApiInstantiatorOptions) {
		const result = await this.fetchExternalReplacementGraph(args);

		return result;
	}

	private async fetchExternalReplacementGraph(
		args: ExternalApiInstantiatorOptions
	): Promise<ReplacementGraphSchema> {
		const { match, endpoint, additionalRequestBodyParameters } = args;
		if (!endpoint) {
			throw new Error(ExternalApiInstantiatorErrors.NoEndpoint);
		}

		const params: ExternalAPIPostRequest = {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: this.buildRequestBody(match, additionalRequestBodyParameters),
		};

		try {
			const response = await fetch(endpoint, params);
			if (!response.ok) {
				throw new Error(
					`${ExternalApiInstantiatorErrors.FailedFetch} ${response.status}`
				);
			}
			let { data } = (await response.json()) as ExternalAPIJSONResult;

			data = this.ensureValidGraphSchema(data);

			return data;
		} catch (error) {
			return Promise.reject(error);
		}
	}

	private buildRequestBody(
		searchMatch: DBGraphPatternMatchResult,
		additionalRequestBodyParameters: ExternalApiInstantiatorOptions['additionalRequestBodyParameters']
	): string {
		const body = {
			searchMatch,
			...(additionalRequestBodyParameters || {}),
		};
		return JSON.stringify(body);
	}

	private ensureValidGraphSchema(apiResult): ReplacementGraphSchema {
		if (!apiResult || (!apiResult?.nodes && !apiResult?.edges)) {
			throw new Error(ExternalApiInstantiatorErrors.InvalidResult);
		}

		if (!apiResult.edges) {
			apiResult.edges = [];
		}
		if (!apiResult.nodes) {
			apiResult.nodes = [];
		}

		return apiResult;
	}
}
