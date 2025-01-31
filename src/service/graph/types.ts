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

export interface GraphNodeResult {
	key: GraphNodeInternalId;
	attributes: GraphNodeMetadata;
}

export interface IGraphService {
	createNode(
		metadata: GraphNodeMetadata,
		internalId?: GraphNodeInternalId
	): Promise<GraphNodeResult>;
	updateNode(
		metadata: GraphNodeMetadata,
		internalId: GraphNodeInternalId,
		label: string,
		oldTypes: string[]
	): Promise<GraphNodeResult>;
	getNode(internalId: GraphNodeInternalId): Promise<GraphNodeResult>;
	deleteNode(internalId: GraphNodeInternalId): Promise<GraphNodeResult>;
	getAllNodes(): Promise<GraphNodeResult[][]>;
	deleteAllNodes(): Promise<GraphNodeResult[][]>;
}
