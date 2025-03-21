import { describe, test, expect } from 'vitest';
import {
	JsonLogicInstantiator,
	JsonLogicErrors,
} from './jsonLogicInstantiator';
import { GraphNodeSchema, GraphEdgeSchema } from '../../../types/node.schema';

describe('JsonLogicInstantiator', () => {
	test('Should return the instantiator key', () => {
		const instantiator = new JsonLogicInstantiator();
		expect(instantiator.instantiatorKey).toBe('jsonLogic');
	});

	test('Should throw an error if rules are not provided', () => {
		const instantiator = new JsonLogicInstantiator();
		expect(() =>
			// @ts-expect-error: Parameters are not as typed
			instantiator.instantiate({
				matchesMap: new Map(),
			})
		).toThrowError(JsonLogicErrors.RulesNotProvided);
	});

	test('Should return the "then" value of the first rule with a positive result', () => {
		const instantiator = new JsonLogicInstantiator();
		const matchesMap = new Map<string, GraphNodeSchema | GraphEdgeSchema>();
		matchesMap.set('node1', {
			key: 'node1',
			attributes: { attributeName: 'a' },
		} as GraphNodeSchema);
		matchesMap.set('node2', {
			key: 'node2',
			attributes: { attributeName: 'a' },
		} as GraphNodeSchema);

		const rules = [
			{
				if: { '==': ['$.node1.attributeName', 'b'] },
				then: 'value1',
				data: {},
			},
			{
				if: { '==': ['$.node2.attributeName', 'a'] },
				then: 'value2',
				data: {},
			},
		];
		const result = instantiator.instantiate({
			rules,
			matchesMap: matchesMap,
		});
		expect(result).toBe('value2');
	});

	test('Should return an empty string if no rules have a positive result', () => {
		const instantiator = new JsonLogicInstantiator();
		const matchesMap = new Map<string, GraphNodeSchema | GraphEdgeSchema>();
		matchesMap.set('node1', {
			key: 'node1',
			attributes: { attributeName: 'a' },
		} as GraphNodeSchema);
		matchesMap.set('node2', {
			key: 'node2',
			attributes: { attributeName: 'a' },
		} as GraphNodeSchema);

		const rules = [
			{
				if: { '==': ['$.node1.attributeName', 'b'] },
				then: 'value1',
				data: {},
			},
			{
				if: { '==': ['$.node2.attributeName', 'c'] },
				then: 'value2',
				data: {},
			},
		];
		const result = instantiator.instantiate({
			rules,
			matchesMap: matchesMap,
		});
		expect(result).toBe('');
	});

	test('Should throw an error if no "if" condition is provided in a rule', () => {
		const instantiator = new JsonLogicInstantiator();
		const rules = [{ then: 'value', data: {} }];
		expect(() =>
			instantiator.instantiate({
				// @ts-expect-error: Parameters are not as typed
				rules,
				matchesMap: new Map(),
			})
		).toThrowError(JsonLogicErrors.IncompleteRuleConfig);
	});
});
