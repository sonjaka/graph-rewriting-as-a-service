import { expect, test, describe } from 'vitest';

import { createNodeUuid, createEdgeUuid } from './uuid';

describe('Test uuid helpers', () => {
	test("Test nodeUuid should start with 'n' an contain no '-' chars", () => {
		const nodeUuid = createNodeUuid();

		expect(nodeUuid).not.toContain('-');
		expect(nodeUuid.startsWith('n')).toBe(true);
	});

	test("Test edgeUuid should start with 'e' an contain no '-' chars", () => {
		const edgeUuid = createEdgeUuid();

		expect(edgeUuid).not.toContain('-');
		expect(edgeUuid.startsWith('e')).toBe(true);
	});
});
