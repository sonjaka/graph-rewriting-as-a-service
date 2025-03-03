export type DBGraphNodeInternalId = string;
export type DBGraphEdgeInternalId = string;

type DBGraphElementLabel = string;
export type DBGraphNodeLabel = DBGraphElementLabel;
export type DBGraphEdgeLabel = DBGraphElementLabel;

export interface DBGraphNodeProperties {
	_grs_internalId: DBGraphNodeInternalId;
	// _grs_label: GraphElementLabel;
}

export interface DBGraphEdgeProperties {
	_grs_internalId: DBGraphEdgeInternalId;
	_grs_source: DBGraphNodeInternalId;
	_grs_target: DBGraphNodeInternalId;
}

export interface DBGraphNodeMetadata {
	type?: string;
	[key: string]: unknown;
}

export interface DBGraphEdgeMetadata {
	type?: string;
	[key: string]: unknown;
}

export interface DBGraphNode {
	key: DBGraphNodeInternalId;
	attributes: DBGraphNodeMetadata;
}

export interface DBGraphEdge {
	key: DBGraphEdgeInternalId;
	attributes: DBGraphEdgeMetadata;
	source: DBGraphNodeInternalId;
	target: DBGraphNodeInternalId;
}

export type DBGraphNodeResult = DBGraphNode;
export type DBGraphEdgeResult = DBGraphEdge;

export type DBGraphType = 'directed' | 'undirected';

export interface DBGraphPatternMatchResult {
	nodes: Record<string, DBGraphNodeResult>;
	edges: Record<string, DBGraphEdgeResult>;
}

export interface IDBGraphService {
	graphType: DBGraphType;
	createNode(
		metadata: DBGraphNodeMetadata,
		internalId?: DBGraphNodeInternalId
	): Promise<DBGraphNodeResult>;
	updateNode(
		metadata: DBGraphNodeMetadata,
		internalId: DBGraphNodeInternalId,
		oldTypes: string[]
	): Promise<DBGraphNodeResult>;
	getNode(
		internalId: DBGraphNodeInternalId
	): Promise<DBGraphNodeResult | undefined>;
	deleteNode(
		internalId: DBGraphNodeInternalId
	): Promise<DBGraphNodeResult | undefined>;
	deleteNodes(
		internalIds: DBGraphNodeInternalId[]
	): Promise<DBGraphNodeResult[] | undefined>;
	getAllNodes(): Promise<DBGraphNodeResult[]>;
	deleteAllNodes(): Promise<DBGraphNodeResult[]>;
	createEdge(
		internalIdSource: DBGraphNodeInternalId,
		internalIdTarget: DBGraphNodeInternalId,
		internalId: DBGraphEdgeInternalId,
		metadata: DBGraphEdgeMetadata
	): Promise<DBGraphEdgeResult>;
	updateEdge(
		internalIdSource: DBGraphNodeInternalId,
		internalIdTarget: DBGraphNodeInternalId,
		internalId: DBGraphEdgeInternalId,
		metadata: DBGraphEdgeMetadata
	): Promise<DBGraphEdgeResult>;
	getEdge(
		internalId: DBGraphEdgeInternalId
	): Promise<DBGraphEdgeResult | undefined>;
	deleteEdge(internalId: DBGraphEdgeInternalId): Promise<DBGraphEdgeResult>;
	deleteEdges(
		internalIds: DBGraphEdgeInternalId[]
	): Promise<DBGraphEdgeResult[]>;
	getAllEdges(): Promise<DBGraphEdgeResult[]>;
	findPatternMatch(
		nodes: DBGraphNode[],
		edges: DBGraphEdge[],
		type: DBGraphType
	): Promise<DBGraphPatternMatchResult[] | []>;
}
