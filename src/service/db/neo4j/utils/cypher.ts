function sanitizeStringLiteral(string: string) {
	string.trim();
	string.replace(/['|\u0027]/g, "\u005c' ");
	string.replace(/["|\u0022]/g, '\u005c"');

	return string;
}

function sanitizeIdentifier(string: string) {
	string = string.trim();
	string = string.replace(/[`|\u0060]/g, '``');

	return string;
}

function computeAttributesString(attributes: Record<string, unknown>) {
	const attributeStrings = [];
	for (const [key, value] of Object.entries(attributes)) {
		attributeStrings.push(
			`${sanitizeStringLiteral(key)}:"${value instanceof String ? sanitizeStringLiteral(value as string) : value}"`
		);
	}

	return attributeStrings.length ? `{${attributeStrings.join(', ')}}` : '';
}

export function createNodeCypher(
	matchVariable: string,
	labels: string[],
	attributes: Record<string, unknown> = {}
) {
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
