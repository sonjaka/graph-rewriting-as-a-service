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
		],
		edges: [
			{
				key: 'aToB',
				source: 'A',
				target: 'B',
				attributes: {},
			},
			{
				key: 'bToA',
				source: 'B',
				target: 'A',
				attributes: {},
			},
		],
	},
	rules: [
		{
			key: 'add_edge',
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
					{
						key: 'B',
						attributes: {
							label: 'B',
							type: 'Function',
						},
					},
				],
				edges: [
					{
						key: 'bToA',
						source: 'B',
						target: 'A',
						attributes: {},
					},
				],
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
				],
				edges: [
					{
						key: 'bToA',
						source: 'B',
						target: 'A',
						attributes: {
							test: 'Test',
						},
					},
				],
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
		{
			key: 'e_2',
			source: 'n_2',
			target: 'n_1',
			attributes: {
				test: 'Test',
			},
		},
	],
};
