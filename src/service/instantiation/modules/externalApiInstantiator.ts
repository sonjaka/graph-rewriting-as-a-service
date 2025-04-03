import { IGraphInstantiator, IInstantiatorOptions } from '../types';
import { ReplacementGraphSchema } from '../../../types/replacementgraph.schema';
import { ExternalReplacementGraphConfig } from '../../../types/grs.schema';
import { DBGraphPatternMatchResult } from '../../db/types';

interface ExternalApiInstantiatorOptions extends IInstantiatorOptions {
	match: DBGraphPatternMatchResult;
	replacementGraph: ExternalReplacementGraphConfig;
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
		const { match, replacementGraph } = args;

		if (!replacementGraph.endpoint) {
			throw new Error(ExternalApiInstantiatorErrors.NoEndpoint);
		}

		try {
			const result = await this.fetchExternalReplacementGraph(
				match,
				replacementGraph
			);

			return result;
		} catch (error) {
			throw new Error(error);
		}
	}

	private async fetchExternalReplacementGraph(
		searchMatch: DBGraphPatternMatchResult,
		replacementGraph: ExternalReplacementGraphConfig
	): Promise<ReplacementGraphSchema> {
		const params: ExternalAPIPostRequest = {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: this.buildRequestBody(searchMatch, replacementGraph),
		};

		try {
			const response = await fetch(replacementGraph.endpoint, params);
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
		replacementGraph: ExternalReplacementGraphConfig
	): string {
		const body = {
			searchMatch,
			...(replacementGraph.additionalRequestBodyParameters || {}),
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
