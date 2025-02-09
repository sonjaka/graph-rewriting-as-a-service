export type GraphNodeInternalId = string;
export type GraphEdgeInternalId = string;

type GraphElementLabel = string;
export type GraphNodeLabel = GraphElementLabel;
export type GraphEdgeLabel = GraphElementLabel;

export interface GraphNodeProperties {
	_grs_internalId: GraphNodeInternalId;
	// _grs_label: GraphElementLabel;
}

export interface GraphEdgeProperties {
	_grs_internalId: GraphEdgeInternalId;
	_grs_source: GraphNodeInternalId;
	_grs_target: GraphNodeInternalId;
}

export interface GraphNodeMetadata {
	type?: string;
	[key: string]: unknown;
}

export interface GraphEdgeMetadata {
	type?: string;
	[key: string]: unknown;
}

export interface GraphNodeResult {
	key: GraphNodeInternalId;
	attributes: GraphNodeMetadata;
}

export interface GraphEdgeResult {
	key: GraphEdgeInternalId;
	attributes: GraphEdgeMetadata;
	source: GraphNodeInternalId;
	target: GraphNodeInternalId;
}

export interface IGraphService {
	createNode(
		metadata: GraphNodeMetadata,
		internalId?: GraphNodeInternalId
	): Promise<GraphNodeResult>;
	updateNode(
		metadata: GraphNodeMetadata,
		internalId: GraphNodeInternalId,
		oldTypes: string[]
	): Promise<GraphNodeResult>;
	getNode(
		internalId: GraphNodeInternalId
	): Promise<GraphNodeResult | undefined>;
	deleteNode(
		internalId: GraphNodeInternalId
	): Promise<GraphNodeResult | undefined>;
	getAllNodes(): Promise<GraphNodeResult[]>;
	deleteAllNodes(): Promise<GraphNodeResult[]>;
	createEdge(
		internalIdSource: GraphNodeInternalId,
		internalIdTarget: GraphNodeInternalId,
		internalId: GraphEdgeInternalId,
		metadata: GraphEdgeMetadata
	): Promise<GraphEdgeResult>;
	getEdge(
		internalId: GraphEdgeInternalId
	): Promise<GraphEdgeResult | undefined>;
	deleteEdge(internalId: GraphEdgeInternalId): Promise<GraphEdgeResult>;
	getAllEdges(): Promise<GraphEdgeResult[]>;
}
