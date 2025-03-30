import { ReplacementNodeSchema } from '../../../../types/replacementnode.schema';
import { DBGraphNodeInternalId, DBGraphNodeMetadata } from '../../types';

import { QueryComputationResult, sanitizeIdentifier } from './utils';

type NodeUpdateRewriteOptions = ReplacementNodeSchema['rewriteOptions'];

export function createNodeQuery(
	matchVariable: string,
	labels: string[],
	attributes: Record<string, unknown> = {}
): QueryComputationResult {
	const nodeLabels = labels
		.map((label) => `\`${sanitizeIdentifier(label)}\``)
		.join(':');

	const params: Record<string, Record<string, unknown>> = {};
	if (attributes) {
		params.nodeMetadata = attributes;
	}
	const cypher = `CREATE (${matchVariable}:${nodeLabels}${Object.entries(params?.nodeMetadata).length ? ' $nodeMetadata' : ''}) RETURN ${matchVariable}`;

	return { cypher, params };
}

export function updateNodeQuery(
	matchVariable: string,
	internalId: DBGraphNodeInternalId,
	labels: string[] = [],
	removedLabels: string[] = [],
	attributes: DBGraphNodeMetadata = {},
	options: NodeUpdateRewriteOptions = {}
): QueryComputationResult {
	let cypher = '';
	const params = {
		internalId,
		metadata: attributes,
	};

	cypher += `MATCH (${matchVariable} { _grs_internalId: $internalId }) `;

	if (removedLabels && removedLabels.length) {
		const sanitizedRemovedLabels = removedLabels
			.map((label) => `\`${sanitizeIdentifier(label)}\``)
			.join(':');

		cypher += `REMOVE ${matchVariable}:${sanitizedRemovedLabels} `;
	}

	if (labels && labels.length) {
		const sanitizedLabels = labels
			.map((label) => `\`${sanitizeIdentifier(label)}\``)
			.join(':');

		cypher += `SET ${matchVariable}:${sanitizedLabels} `;
	}

	if (options.attributeReplacementMode === 'delete') {
		cypher += `SET ${matchVariable} = {} `;
	} else if (options.attributeReplacementMode === 'replace') {
		cypher += `SET ${matchVariable} = $metadata `;
	} else {
		// default should be to "update" the metadata
		cypher += `SET ${matchVariable} += $metadata `;
	}

	cypher += ` RETURN ${matchVariable}`;

	return { cypher, params };
}
