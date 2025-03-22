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
	'MatchesNotProvided' = 'JsonLogic value instantiation: "matchesMap" parameter needs to be provided.',
	'EvaluationFailed' = 'JsonLogic value instantiation: Evaluating jsonLogic rule failed.',
	'IncompleteRuleConfig' = 'JsonLogic value instantiation: Rule is missing if statement.',
	'NodePropertyNotFound' = 'JsonLogic value instantiation: Node Property referenced in key not found in matched searchgraph node.',
	'NodeNotFound' = 'JsonLogic value instantiation:  Node referenced in key not found in searchgraph.',
	'NodeFormatIncorrect' = 'JsonLogic value instantiation: Node reference incorrect. Should follow the pattern "$.nodeKey.nodePatternName"',
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

		if (!matchesMap) {
			throw new Error(JsonLogicErrors.MatchesNotProvided);
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
				// TODO: implement better logging
				console.log(err);
				throw new Error(JsonLogicErrors.EvaluationFailed);
			}
		} else {
			throw new Error(JsonLogicErrors.IncompleteRuleConfig);
		}

		return ruleConfig;
	}

	private resolveSearchGraphValues(
		value: AdditionalOperation | unknown,
		matchesMap: MatchesMap
	) {
		if (value && typeof value === 'object') {
			for (const [operator, values] of Object.entries(value)) {
				if (operator !== 'var') {
					// if the operator is "var" this is a data reference which should not be instantiated
					// else check if search graph value needs to be instantitated
					const instantiatedValues = values.map((item: unknown) => {
						return this.resolveSearchGraphValues(item, matchesMap);
					});

					(value as Record<string, unknown>)[operator] = instantiatedValues;
				}
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
							JsonLogicErrors.NodePropertyNotFound +
								`, property: ${segments[2]}, key: ${value}`
						);
					}
				} else {
					throw new Error(
						JsonLogicErrors.NodeNotFound +
							`, node: ${segments[1]}, key: ${value}`
					);
				}
			} else {
				throw new Error(
					JsonLogicErrors.NodeFormatIncorrect + `, key: ${value}`
				);
			}
		}

		return value;
	}
}
