import { GraphSchema } from '../../../types/graph.schema';
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
					type: 'Event',
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
		],
	},
	rules: [
		{
			key: 'remove_node',
			lhs: {
				options: {
					type: 'directed',
				},
				attributes: {},
				nodes: [
					{
						key: 'Node',
						attributes: {
							label: 'C',
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
				nodes: [],
				edges: [],
			},
		},
	],
};

export const expectedOutput: GraphSchema = {
	options: {
		type: 'directed',
	},
	attributes: {},
	nodes: [
		{
			key: 'n_1',
			attributes: {
				label: 'A',
				type: 'Event',
			},
		},
		{
			key: 'n_2',
			attributes: {
				label: 'B',
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
	],
};
