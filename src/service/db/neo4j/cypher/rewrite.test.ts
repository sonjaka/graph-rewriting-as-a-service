import { expect, test, describe } from 'vitest';
import { createNodeQuery } from './rewrite';

describe('Test cypher utils', () => {
	describe('Test createNodeCypher', () => {
		test('Test createNodeCypher with single label and no attributes', () => {
			const { cypher, params } = createNodeQuery('n', ['LabelA']);

			expect(cypher).toBe('CREATE (n:`LabelA`) RETURN n');
			expect(params).toStrictEqual({ nodeMetadata: {} });
		});

		test('Test createNodeCypher with single label with special chars and no attributes', () => {
			const { cypher, params } = createNodeQuery('n', ['Label`A']);

			expect(cypher).toBe('CREATE (n:`Label``A`) RETURN n');
			expect(params).toStrictEqual({ nodeMetadata: {} });
		});

		test('Test createNodeCypher with multiple labels and no attributes', () => {
			const { cypher, params } = createNodeQuery('n', ['LabelA', 'LabelB']);

			expect(cypher).toBe('CREATE (n:`LabelA`:`LabelB`) RETURN n');
			expect(params).toStrictEqual({ nodeMetadata: {} });
		});

		test('Test createNodeCypher with single label and attributes', () => {
			const { cypher, params } = createNodeQuery('n', ['LabelA', 'LabelB'], {
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
