export interface QueryComputationResult {
	cypher: string;
	params?: Record<string, unknown>;
}

export interface MatchQueryComputationResult extends QueryComputationResult {
	where?: string;
}

export function sanitizeStringLiteral(string: string) {
	string.trim();
	string.replace(/['|\u0027]/g, "\u005c' ");
	string.replace(/["|\u0022]/g, '\u005c"');

	return string;
}

export function sanitizeIdentifier(string: string) {
	string = string.trim();
	string = string.replace(/[`|\u0060]/g, '``');

	return string;
}

export function computeAttributesString(attributes: Record<string, unknown>) {
	const attributeStrings = [];
	for (const [key, value] of Object.entries(attributes)) {
		attributeStrings.push(
			`${sanitizeStringLiteral(key)}:"${value instanceof String ? sanitizeStringLiteral(value as string) : value}"`
		);
	}

	return attributeStrings.length ? `{${attributeStrings.join(', ')}}` : '';
}
