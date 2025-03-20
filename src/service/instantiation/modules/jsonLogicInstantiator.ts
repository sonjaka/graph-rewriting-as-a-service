import JsonLogic from 'json-logic-js';
import type { AdditionalOperation } from 'json-logic-js';
import { IValueInstantiator, IValueInstantiatorOptions } from '../types';
import { GraphNodeSchema } from '../../../types/node.schema';
import { GraphEdgeSchema } from '../../../types/edge.schema';

type MatchesMap = Map<string, GraphNodeSchema | GraphEdgeSchema>;

interface JsonLogicRule {
	if: AdditionalOperation;
	then: string;
	result?: boolean;
	data: unknown;
}

interface JsonLogicInstantiatorOptions extends IValueInstantiatorOptions {
	rules: JsonLogicRule[]; // Type this correctly
	matchesMap: MatchesMap;
}

export enum JsonLogicErrors {
	'RulesNotProvided' = 'JsonLogic value instantiation: "rules" parameter needs to be provided.',
}

export class JsonLogicInstantiator
	implements IValueInstantiator<JsonLogicInstantiatorOptions>
{
	_instantiatorKey = 'jsonLogic';

	get instantiatorKey() {
		return this._instantiatorKey;
	}

	public instantiate(args: JsonLogicInstantiatorOptions) {
		const { rules, matchesMap } = args;

		if (!rules) {
			throw new Error(JsonLogicErrors.RulesNotProvided);
		}

		if (rules) {
			rules.map((ruleConfig) => {
				return this.resolveJsonLogicRules(ruleConfig, matchesMap);
			});

			for (const ruleConfig of rules) {
				// Return the first positive rule test
				if (ruleConfig?.result && ruleConfig?.then) {
					return ruleConfig?.then;
				}
			}
		}

		return '';
	}

	private resolveJsonLogicRules(
		ruleConfig: JsonLogicRule,
		matchesMap: MatchesMap
	) {
		// config includes multiple rules
		// each rule can contain a
		// - only a rule - the rules return value is the returned value
		// - a rule and a data object
		// - a rule and a then value - the value is the returned value
		if (ruleConfig?.if) {
			// replace placeholder values from searchgraph match nodes
			for (const [operator, jsonLogicRule] of Object.entries(ruleConfig?.if)) {
				ruleConfig.if[operator] = jsonLogicRule.map(
					(item: AdditionalOperation | unknown) => {
						return this.resolveSearchGraphValues(item, matchesMap);
					}
				);
			}

			const data = ruleConfig?.data ?? {};
			try {
				ruleConfig['result'] = JsonLogic.apply(ruleConfig.if, data);
			} catch (err) {
				console.log(err);
				throw new Error(
					`Error initialising jsonLogic rule: Evaluating jsonLogic rule failed.`
				);
			}
		} else {
			throw new Error(`No jsonLogic rule configuration found.`);
		}

		return ruleConfig;
	}

	private resolveSearchGraphValues(
		value: AdditionalOperation | unknown,
		matchesMap: MatchesMap
	) {
		if (value && typeof value === 'object') {
			for (const [operator, values] of Object.entries(value)) {
				const instantiatedValues = values.map((item: unknown) => {
					return this.resolveSearchGraphValues(item, matchesMap);
				});

				(value as Record<string, unknown>)[operator] = instantiatedValues;
			}
		}

		if (typeof value === 'string' && value.startsWith('$.')) {
			// this is a template string that refernces a matched node
			const segments = value.split('.');
			// there have to be at three segments
			// 1. "$."
			// 2. Node Key in Searchgraph
			// 3. Node Property in Searchgraph Match
			if (segments.length === 3) {
				const node = matchesMap.has(segments[1])
					? matchesMap.get(segments[1])
					: null;

				if (node) {
					if (node.attributes[segments[2]]) {
						return node.attributes[segments[2]];
					} else {
						throw new Error(
							`Error initialising jsonLogic rule: Node Property ${segments[2]} referenced in key ${value} not found in matched searchgraph node.`
						);
					}
				} else {
					throw new Error(
						`Error initialising jsonLogic rule: Node ${segments[1]} referenced in key ${value} not found in searchgraph.`
					);
				}
			} else {
				throw new Error(
					`Error initialising jsonLogic rule: Referenced Key ${value} not found in searchgraph.`
				);
			}
		}

		return value;
	}
}
