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

	const nodeAttributes = computeAttributesString(attributes);

	return `CREATE (${matchVariable}:${nodeLabels} ${nodeAttributes}) RETURN ${matchVariable}`;
}
