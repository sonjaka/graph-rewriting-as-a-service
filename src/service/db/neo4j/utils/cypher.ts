export function createNodeCypher(
	matchVariable: string,
	labels: string[],
	attributes: Record<string, unknown>
) {
	const nodeLabels = labels.map((label) => `\`${label}\``).join(':');

	let nodeAttributes = '';
	for (const [key, value] of Object.entries(attributes)) {
		if (nodeAttributes !== '') nodeAttributes += ', ';
		nodeAttributes += `${key}:'${value}'`;
	}

	return `CREATE (${matchVariable}:${nodeLabels} {${nodeAttributes}}) RETURN n`;
}
