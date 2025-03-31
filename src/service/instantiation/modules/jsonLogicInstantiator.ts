import JsonLogic from 'json-logic-js';
import { JSONPath } from 'jsonpath-plus';
import type { AdditionalOperation, RulesLogic } from 'json-logic-js';

import { IValueInstantiator, IValueInstantiatorOptions } from '../types';
import { GraphSchema } from '../../../types/graph.schema';

type JsonLogicRule = RulesLogic<AdditionalOperation>;

export interface JsonLogicInstantiatorOptions
	extends IValueInstantiatorOptions {
	rule: RulesLogic<AdditionalOperation>; // Array of rules to evaluate
	data?: unknown; // Array of rules to evaluate
	match: GraphSchema; // Map of matches for resolving placeholders
}

export enum JsonLogicErrors {
	'RulesNotProvided' = 'JsonLogic value instantiation: "rules" parameter needs to be provided.',
	'MatchNotProvided' = 'JsonLogic value instantiation: "match" parameter needs to be provided.',
	'EvaluationFailed' = 'JsonLogic value instantiation: Evaluating jsonLogic rule failed.',
}

export enum JsonPathErrors {
	'PathAmbigous' = 'JsonLogic value instantiation: JSON Path result is ambigous.',
	'PathUndefined' = 'JsonLogic value instantiation: JSON Path result is undefined.',
	'PathUnresolvable' = 'JSON Path could not be resolved',
}

export class JsonLogicInstantiator
	implements IValueInstantiator<JsonLogicInstantiatorOptions>
{
	_instantiatorKey = 'jsonLogic';

	get instantiatorKey() {
		return this._instantiatorKey;
	}

	public instantiate(
		args: JsonLogicInstantiatorOptions
	): string | number | boolean {
		const { rule, data, match } = args;

		if (!rule) {
			throw new Error(JsonLogicErrors.RulesNotProvided);
		}

		if (!match) {
			throw new Error(JsonLogicErrors.MatchNotProvided);
		}

		return this.resolveJsonLogicRule(rule, match, data);
	}

	private resolveJsonLogicRule(
		rule: RulesLogic<AdditionalOperation>,
		graph: GraphSchema,
		data?: unknown
	): string | number | boolean {
		if (rule && typeof rule === 'object') {
			for (const [key, value] of Object.entries(rule)) {
				if (Array.isArray(value)) {
					(rule as AdditionalOperation)[key] = value.map((item) =>
						this.resolveSearchGraphValue(item, graph)
					);
				} else if (typeof value === 'string') {
					(rule as AdditionalOperation)[key] = this.resolveSearchGraphValue(
						value,
						graph
					);
				}
			}
		}

		if (data && typeof data === 'object') {
			for (const [key, value] of Object.entries(data)) {
				console.log(typeof value);
				if (Array.isArray(value)) {
					(data as AdditionalOperation)[key] = value.map((item) =>
						this.resolveSearchGraphValue(item, graph)
					);
				} else if (typeof value === 'string') {
					(data as AdditionalOperation)[key] = this.resolveSearchGraphValue(
						value,
						graph
					);
				}
			}
		}

		try {
			// since JsonLogic results can be different data types (e.g. arrays)
			// we need to turn these into strings if not primary data type
			const result = JsonLogic.apply(rule, data);
			if (['string', 'boolean', 'number'].includes(typeof result)) {
				return result;
			} else if (result === null) {
				return '';
			} else {
				return String(result);
			}
		} catch (err) {
			// TODO: implement better logging
			console.log(err);
			throw new Error(JsonLogicErrors.EvaluationFailed);
		}
	}

	private resolveSearchGraphValue(value: JsonLogicRule, graph: GraphSchema) {
		if (value && typeof value === 'object') {
			// eslint-disable-next-line prefer-const
			for (let [key, subValue] of Object.entries(value)) {
				if (Array.isArray(subValue)) {
					subValue = subValue.map((item) => {
						const resolvedItem = this.resolveSearchGraphValue(item, graph);
						return resolvedItem;
					});
				} else if (typeof subValue === 'string') {
					subValue = this.resolveSearchGraphValue(subValue, graph);
				}
				// TODO: fix typing?
				(value as AdditionalOperation)[key] = subValue;
			}
		}
		if (value && typeof value === 'string' && value.startsWith('$.')) {
			let result = [];

			try {
				result = JSONPath({ path: value, json: graph, wrap: false });
			} catch (error) {
				console.log(error);
				throw new Error(JsonPathErrors.PathUnresolvable);
			}

			if (!result) {
				throw new Error(JsonPathErrors.PathUnresolvable);
			}
			if (result.length > 1) {
				throw new Error(JsonPathErrors.PathAmbigous);
			}
			return result.shift();
		} else {
			return value;
		}
	}
}
