export type GrsGraphMetadata = Record<string, unknown>;

export interface GrsGraphNodeMetadata {
	internalId: string;
	[name: string]: unknown;
}

export interface GrsGraphEdgeMetadata {
	internalId: string;
	[name: string]: unknown;
}
