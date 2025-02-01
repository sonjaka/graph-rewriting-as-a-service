import {
	ManagedTransaction,
	Session,
	Node,
	Integer,
	// Relationship,
} from 'neo4j-driver';
import {
	GraphNodeInternalId,
	GraphNodeMetadata,
	GraphNodeProperties,
	GraphNodeResult,
	IGraphService,
	// GraphEdgeProperties,
} from '../types';

type Neo4jNode = Node<Integer, GraphNodeProperties>;
// type Neo4jRelationship = Relationship<Integer, GraphEdgeProperties>;

interface Neo4jNodeResult {
	n: Neo4jNode;
}

type Neo4jCreateNodeResult = Neo4jNodeResult;
type Neo4jUpdateNodeResult = Neo4jNodeResult;
type Neo4jGetNodesResult = Neo4jNodeResult;

export class NodeService implements IGraphService {
	constructor(private readonly session: Session) {}

	public async createNode(
		metadata: GraphNodeMetadata,
		internalId?: GraphNodeInternalId
	): Promise<GraphNodeResult> {
		if (internalId) {
			metadata['_grs_internalId'] = internalId;
		}

		// A default node type of "Node" will be set if no type metadata is set
		let nodeType = 'Node';
		if (metadata.type) {
			nodeType = metadata.type;
		}

		const cypher = `CREATE (n:\`${nodeType}\` $metadata) RETURN n`;

		const res = await this.session.executeWrite((tx: ManagedTransaction) =>
			tx.run<Neo4jCreateNodeResult>(cypher, { metadata })
		);

		const nodeRecords = res.records.map((record) => record.get('n'));
		const nodes = this.mapNodeRecordsToNodesResult(nodeRecords);

		return nodes[0];
	}

	public async updateNode(
		metadata: GraphNodeMetadata,
		internalId: GraphNodeInternalId,
		oldTypes: string[] = []
	): Promise<GraphNodeResult> {
		if (internalId) {
			metadata['_grs_internalId'] = internalId;
		}

		let nodeType = 'Node';
		if (metadata.type) {
			nodeType = metadata.type;
		}

		let cypher = '';
		if (oldTypes.length) {
			const oldNodeType = oldTypes.join(':');

			cypher = `MATCH (n:\`${oldNodeType}\` { _grs_internalId: $internalId }) \
		        REMOVE n:\`${oldNodeType}\` \
		        SET n:\`${nodeType}\`, n = $metadata \
		        RETURN n`;
		} else {
			cypher = `MATCH (n { _grs_internalId: $internalId }) \
		        SET n = $metadata \
		        RETURN n`;
		}

		const res = await this.session.executeWrite((tx: ManagedTransaction) =>
			tx.run<Neo4jUpdateNodeResult>(cypher, { internalId, metadata })
		);

		const nodeRecords = res.records.map((record) => record.get('n'));
		const nodes = this.mapNodeRecordsToNodesResult(nodeRecords);

		return nodes[0];
	}

	public async getNode(internalId: GraphNodeInternalId) {
		const cypher = `MATCH (n) \
            WHERE n._grs_internalId = $internalId \
            RETURN n`;

		const res = await this.session.executeRead((tx: ManagedTransaction) =>
			tx.run(cypher, { internalId })
		);

		const nodeRecords = res.records.map((record) => record.get('n'));
		const nodes = this.mapNodeRecordsToNodesResult(nodeRecords);

		return nodes[0];
	}

	public async getAllNodes() {
		// const cypher = `MATCH (n)
		// OPTIONAL MATCH (n)-[r]-(m)
		// RETURN COLLECT(DISTINCT n) AS nodes, COLLECT(DISTINCT r) AS relationships`;
		const cypher = `MATCH (n)
		    RETURN DISTINCT n`;

		const res = await this.session.executeRead((tx: ManagedTransaction) =>
			tx.run<Neo4jGetNodesResult>(cypher)
		);

		const nodeRecords = res.records.map((record) => record.get('n'));
		const nodes = this.mapNodeRecordsToNodesResult(nodeRecords);

		return nodes;
	}

	public async deleteNode(internalId: GraphNodeInternalId) {
		const cypher = `MATCH (n) \
            WHERE n._grs_internalId = $internalId \
            DETACH DELETE n`;

		const res = await this.session.executeWrite((tx: ManagedTransaction) =>
			tx.run(cypher, { internalId })
		);
		const nodeRecords = res.records.map((record) => record.get('n'));
		const nodes = this.mapNodeRecordsToNodesResult(nodeRecords);

		return nodes[0];
	}

	public async deleteAllNodes() {
		const cypher =
			'MATCH (n) CALL (n) \
            { DETACH DELETE n } \
            IN TRANSACTIONS';

		const res = await this.session.run(cypher);

		const nodeRecords = res.records.map((record) => record.get('n'));
		const nodes = this.mapNodeRecordsToNodesResult(nodeRecords);

		console.log(nodes);

		return nodes || [];
	}

	private mapNodeRecordsToNodesResult(
		nodeRecords: Neo4jNode[]
	): GraphNodeResult[] {
		const nodes = nodeRecords.map((node) => {
			const nodeData: GraphNodeResult = {
				key: node.properties?._grs_internalId,
				attributes: {
					...node.properties,
				},
			};
			// Remove all keys that were only for internal use
			delete nodeData.attributes?._grs_internalId;

			return nodeData;
		});

		return nodes;
	}
}
