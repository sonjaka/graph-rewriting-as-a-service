import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import { HistoryService } from './history.service';
import { IDBGraphService } from '../db/types';
import { ResultGraphSchema } from './graph-transformation.service';

describe('Test history service', () => {
	let mockGraphService: IDBGraphService;

	beforeEach(() => {
		mockGraphService = {
			createNode: vi.fn(),
			getAllNodes: vi.fn(),
			deleteAllNodes: vi.fn(),
			createEdge: vi.fn(),
			getAllEdges: vi.fn(),
		} as unknown as IDBGraphService;
	});

	afterEach(() => {
		vi.resetAllMocks(); // Clear and set back implementation
	});

	test('Correct initialization with empty history', async () => {
		const historyService = new HistoryService();

		expect(historyService.getHistory()).toStrictEqual([]);
	});

	test('Adding to History', async () => {
		const historyService = new HistoryService();

		const firstEntry = {
			options: { type: 'directed' },
			nodes: [],
			edges: [],
		} as ResultGraphSchema;
		historyService.addToHistory(firstEntry);

		expect(historyService.getHistory()).toStrictEqual([firstEntry]);

		const secondEntry = {
			options: { type: 'directed' },
			nodes: [{ key: 'node1', attributes: {} }],
			edges: [],
		} as ResultGraphSchema;

		historyService.addToHistory(secondEntry);

		expect(historyService.getHistory()).toStrictEqual([
			firstEntry,
			secondEntry,
		]);
	});

	test('Clearing history', async () => {
		const historyService = new HistoryService();

		const firstEntry = {
			options: { type: 'directed' },
			nodes: [],
			edges: [],
		} as ResultGraphSchema;
		historyService.addToHistory(firstEntry);

		expect(historyService.getHistory()).toStrictEqual([firstEntry]);

		const secondEntry = {
			options: { type: 'directed' },
			nodes: [{ key: 'node1', attributes: {} }],
			edges: [],
		} as ResultGraphSchema;

		historyService.addToHistory(secondEntry);

		historyService.clearHistory();

		expect(historyService.getHistory()).toStrictEqual([]);
	});
});
