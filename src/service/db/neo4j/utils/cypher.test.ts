import { vi, expect, test, describe } from 'vitest';
import { createNodeCypher } from './cypher';

describe('Test cypher utils', () => {
	test('Test createNodeCypher with single label and no attributes', () => {
		const cypher = createNodeCypher('n', ['LabelA']);

		expect(cypher).toBe('CREATE (n:`LabelA` ) RETURN n');
	});

	test('Test createNodeCypher with multiple labels and no attributes', () => {
		const cypher = createNodeCypher('n', ['LabelA', 'LabelB']);

		expect(cypher).toBe('CREATE (n:`LabelA`:`LabelB` ) RETURN n');
	});

	test('Test createNodeCypher with single label and attributes', () => {
		const cypher = createNodeCypher('n', ['LabelA', 'LabelB'], {
			attributeA: 'hello',
			attributeB: 2,
		});

		expect(cypher).toBe(
			'CREATE (n:`LabelA`:`LabelB` {attributeA:"hello", attributeB:"2"}) RETURN n'
		);
	});
});
