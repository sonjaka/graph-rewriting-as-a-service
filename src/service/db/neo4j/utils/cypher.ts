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

export function computeNodeQueryString(
	matchVariable: string,
	labels: string[],
	attributes: Record<string, unknown>
) {
	matchVariable = sanitizeIdentifier(matchVariable);

	// TODO: Use parameters instead of string concatenation for attributes
	const nodeLabels = labels
		.map((label) => `\`${sanitizeIdentifier(label)}\``)
		.join(':');

	const metadata = computeAttributesString(attributes);

	return `(\`${matchVariable}\`:${nodeLabels}${metadata.length ? ` ${metadata}` : ''})`;
}

export function computeEdgeQueryString(
	matchVariable: string,
	type: string,
	attributes: Record<string, unknown>,
	source: string,
	target: string,
	directed = false
) {
	matchVariable = sanitizeIdentifier(matchVariable);

	return `(${source})-${type ? `[\`${matchVariable}\`:${type}]` : ''}-${directed ? '>' : ''}(${target})`;
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
