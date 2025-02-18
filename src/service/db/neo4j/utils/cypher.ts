function computeAttributesString(attributes: Record<string, unknown>) {
	const attributeStrings = [];
	for (const [key, value] of Object.entries(attributes)) {
		attributeStrings.push(`${key}:"${value}"`);
	}

	return attributeStrings.length ? `{${attributeStrings.join(', ')}}` : '';
}

export function createNodeCypher(
	matchVariable: string,
	labels: string[],
	attributes: Record<string, unknown> = {}
) {
	const nodeLabels = labels.map((label) => `\`${label}\``).join(':');

	const params: Record<string, Record<string, unknown>> = {};
	if (attributes) {
		params.nodeMetadata = attributes;
	}
	const cypher = `CREATE (${matchVariable}:${nodeLabels}${Object.entries(params?.nodeMetadata).length ? ' $nodeMetadata' : ''}) RETURN ${matchVariable}`;

	return { cypher, params };
}
