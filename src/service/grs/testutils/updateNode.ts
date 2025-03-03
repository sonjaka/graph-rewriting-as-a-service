import { GraphRewritingRequestSchema } from '../../../types/grs.schema';

export const input: GraphRewritingRequestSchema = {
	hostgraph: {
		options: {
			type: 'directed',
		},
		attributes: {},
		nodes: [
			{
				key: 'A',
				attributes: {
					label: 'A',
					type: 'Event',
				},
			},
			{
				key: 'B',
				attributes: {
					label: 'B',
					type: 'Function',
				},
			},
			{
				key: 'C',
				attributes: {
					label: 'C',
					type: 'Function',
				},
			},
		],
		edges: [
			{
				key: 'aToB',
				source: 'A',
				target: 'B',
				attributes: {},
			},
			{
				key: 'aToC',
				source: 'A',
				target: 'C',
				attributes: {},
			},
		],
	},
	rules: [
		{
			key: 'add_node',
			lhs: {
				options: {
					type: 'directed',
				},
				attributes: {},
				nodes: [
					{
						key: 'A',
						attributes: {
							label: 'A',
							type: 'Event',
						},
					},
				],
				edges: [],
			},
			rhs: {
				options: {
					type: 'directed',
				},
				attributes: {},
				nodes: [
					{
						key: 'A',
						attributes: {
							label: 'Z',
							type: 'Test',
						},
					},
				],
				edges: [],
			},
		},
	],
};

export const expectedOutput = {
	options: {
		type: 'directed',
	},
	attributes: {},
	nodes: [
		{
			key: 'n_1',
			attributes: {
				label: 'Z',
				type: 'Test',
			},
		},
		{
			key: 'n_2',
			attributes: {
				label: 'B',
				type: 'Function',
			},
		},
		{
			key: 'n_3',
			attributes: {
				label: 'C',
				type: 'Function',
			},
		},
	],
	edges: [
		{
			key: 'e_1',
			source: 'n_1',
			target: 'n_2',
			attributes: {},
		},
		{
			key: 'e_2',
			source: 'n_1',
			target: 'n_3',
			attributes: {},
		},
	],
};
