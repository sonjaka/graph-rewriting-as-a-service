export interface GraphNodeMetadata {
	type?: string;
	[key: string]: unknown;
}
export type GraphNodeInternalId = string;
type GraphElementLabel = string;
export type GraphNodeLabel = GraphElementLabel;
export type GraphEdgeLabel = GraphElementLabel;

export interface GraphNodeProperties {
	_grs_internalId: GraphNodeInternalId;
	_grs_label: GraphElementLabel;
}

export interface GraphEdgeProperties {
	_grs_label: GraphElementLabel;
}
