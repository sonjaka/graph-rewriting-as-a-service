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

	test('Should resolve search graph values correctly', () => {
		const instantiator = new JsonLogicInstantiator();
		const matchesMap = new Map<string, GraphNodeSchema | GraphEdgeSchema>();
		matchesMap.set('node1', {
			key: 'node1',
			attributes: { attributeName: 'attributeValue' },
		} as GraphNodeSchema);

		const rules = [
			{
				if: { '==': ['$.node1.attributeName', 'attributeValue'] },
				then: 'instantiatedAttributeValue',
				data: {},
			},
		];

		const result = instantiator.instantiate({
			rules,
			matchesMap,
		});
		expect(result).toBe('instantiatedAttributeValue');
	});

	test('Should resolve nested search graph values correctly', () => {
		const instantiator = new JsonLogicInstantiator();
		const matchesMap = new Map<string, GraphNodeSchema | GraphEdgeSchema>();
		matchesMap.set('node1', {
			key: 'node1',
			attributes: { label: 'a' },
		} as GraphNodeSchema);
		matchesMap.set('node2', {
			key: 'node2',
			attributes: { label: 'b' },
		} as GraphNodeSchema);

		// This one should return the "then" value as the condition is correct
		let rules = [
			{
				if: {
					and: [
						{ '==': ['$.node1.label', 'a'] },
						{ '==': ['$.node2.label', 'b'] },
					],
				},
				then: 'instantiatedAttributeValue',
				data: {},
			},
		];

		let result = instantiator.instantiate({
			rules,
			matchesMap,
		});
		expect(result).toBe('instantiatedAttributeValue');

		// This one should return the empty string value as the condition is *not* correct
		rules = [
			{
				if: {
					and: [
						{ '==': ['$.node1.label', 'a'] },
						{ '==': ['$.node2.label', 'c'] },
					],
				},
				then: 'instantiatedAttributeValue',
				data: {},
			},
		];

		result = instantiator.instantiate({
			rules,
			matchesMap,
		});
		expect(result).toBe('');
	});

	test('Should resolve jsonLogic rules with data object', () => {
		const instantiator = new JsonLogicInstantiator();
		const matchesMap = new Map<string, GraphNodeSchema | GraphEdgeSchema>();
		matchesMap.set('node1', {
			key: 'node1',
			attributes: { label: 'a' },
		} as GraphNodeSchema);
		matchesMap.set('node2', {
			key: 'node2',
			attributes: { label: 'b' },
		} as GraphNodeSchema);

		// This one should return the "then" value as the condition is correct
		const rules = [
			{
				if: {
					and: [
						{ '==': ['$.node1.label', 'a'] },
						{ '==': [{ var: 'hello' }, 'world'] },
						{ '==': [{ var: 'test.nested' }, 'successful'] },
					],
				},
				then: 'instantiatedAttributeValue',
				data: {
					hello: 'world',
					test: { nested: 'successful' },
				},
			},
		];

		const result = instantiator.instantiate({
			rules,
			matchesMap,
		});
		expect(result).toBe('instantiatedAttributeValue');
	});

	test('Should throw error if rules are not provided', () => {
		const instantiator = new JsonLogicInstantiator();
		expect(() =>
			// @ts-expect-error: Parameters are not as typed
			instantiator.instantiate({
				matchesMap: new Map(),
			})
		).toThrowError(JsonLogicErrors.RulesNotProvided);
	});

	test('Should throw error if matches are not provided', () => {
		const instantiator = new JsonLogicInstantiator();
		expect(() =>
			// @ts-expect-error: Parameters are not as typed
			instantiator.instantiate({
				rules: [],
			})
		).toThrowError(JsonLogicErrors.MatchesNotProvided);
	});

	test('Should throw error if no "if" condition is provided in a rule', () => {
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

	test('Should throw error if jsonLogic fails', () => {
		const instantiator = new JsonLogicInstantiator();
		const matchesMap = new Map<string, GraphNodeSchema | GraphEdgeSchema>();
		matchesMap.set('node1', {
			key: 'node1',
			attributes: { attributeName: 'attributeValue' },
		} as GraphNodeSchema);

		const rules = [
			{
				if: { y812knsef: ['$.node1.attributeName', 'attributeValue'] },
				then: 'instantiatedAttributeValue',
				data: {},
			},
		];

		expect(() =>
			instantiator.instantiate({
				rules,
				matchesMap,
			})
		).toThrowError(JsonLogicErrors.EvaluationFailed);
	});

	test('Should throw error if a referenced node attribute is not found in the matches map', () => {
		const instantiator = new JsonLogicInstantiator();
		const matchesMap = new Map<string, GraphNodeSchema | GraphEdgeSchema>();
		matchesMap.set('node', {
			key: 'node',
			attributes: { attributeName: 'attributeValue' },
		} as GraphNodeSchema);

		const rules = [
			{
				if: { '===': ['$.node.nonexistentProperty', 'value'] },
				then: 'success',
				data: {},
			},
		];

		expect(() =>
			instantiator.instantiate({
				rules,
				matchesMap,
			})
		).toThrowError(
			JsonLogicErrors.NodePropertyNotFound +
				`, property: nonexistentProperty, key: $.node.nonexistentProperty`
		);
	});

	test('Should throw error if a referenced node is not found in the matches map', () => {
		const instantiator = new JsonLogicInstantiator();
		const matchesMap = new Map<string, GraphNodeSchema | GraphEdgeSchema>();

		const rules = [
			{
				if: { '===': ['$.nonexistentNode.attribute', 'value'] },
				then: 'success',
				data: {},
			},
		];

		expect(() =>
			instantiator.instantiate({
				rules,
				matchesMap,
			})
		).toThrowError(
			'JsonLogic value instantiation:  Node referenced in key not found in searchgraph., node: nonexistentNode, key: $.nonexistentNode.attribute'
		);
	});

	test('Should throw error if referenced node is not formatted correctly', () => {
		const instantiator = new JsonLogicInstantiator();
		const matchesMap = new Map<string, GraphNodeSchema | GraphEdgeSchema>();

		const rules = [
			{
				if: { '===': ['$.wrongFormat', 'value'] },
				then: 'success',
				data: {},
			},
		];

		expect(() =>
			instantiator.instantiate({
				rules,
				matchesMap,
			})
		).toThrowError(
			'JsonLogic value instantiation: Node reference incorrect. Should follow the pattern "$.nodeKey.nodePatternName", key: $.wrongFormat'
		);
	});
});
