import { expect, test, describe } from 'vitest';
import { createNodeCypher } from './cypher';

describe('Test cypher utils', () => {
	describe('Test createNodeCypher', () => {
		test('Test createNodeCypher with single label and no attributes', () => {
			const { cypher, params } = createNodeCypher('n', ['LabelA']);

			expect(cypher).toBe('CREATE (n:`LabelA`) RETURN n');
			expect(params).toStrictEqual({ nodeMetadata: {} });
		});

		test('Test createNodeCypher with single label with special chars and no attributes', () => {
			const { cypher, params } = createNodeCypher('n', ['Label`A']);

			expect(cypher).toBe('CREATE (n:`Label``A`) RETURN n');
			expect(params).toStrictEqual({ nodeMetadata: {} });
		});

		test('Test createNodeCypher with multiple labels and no attributes', () => {
			const { cypher, params } = createNodeCypher('n', ['LabelA', 'LabelB']);

			expect(cypher).toBe('CREATE (n:`LabelA`:`LabelB`) RETURN n');
			expect(params).toStrictEqual({ nodeMetadata: {} });
		});

		test('Test createNodeCypher with single label and attributes', () => {
			const { cypher, params } = createNodeCypher('n', ['LabelA', 'LabelB'], {
				attributeA: 'hello',
				attributeB: 2,
			});

			expect(cypher).toBe(
				'CREATE (n:`LabelA`:`LabelB` $nodeMetadata) RETURN n'
			);
			expect(params).toStrictEqual({
				nodeMetadata: {
					attributeA: 'hello',
					attributeB: 2,
				},
			});
		});
	});
});
