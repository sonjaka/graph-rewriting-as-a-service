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
	// GraphEdgeProperties,
} from '../types';

type Neo4jNode = Node<Integer, GraphNodeProperties>;
// type Neo4jRelationship = Relationship<Integer, GraphEdgeProperties>;

interface Neo4jCreateNodeResult {
	n: Neo4jNode;
}

interface Neo4jGetNodesResult {
	nodes: Neo4jNode[];
	// relationships: Neo4jRelationship[];
}

interface Neo4jNodeResult {
	key: GraphNodeInternalId;
	attributes: GraphNodeMetadata;
}

export class NodeService {
	constructor(private readonly session: Session) {}

	public async createNode(
		metadata: GraphNodeMetadata,
		internalId?: GraphNodeInternalId
	) {
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
            RETURN COLLECT(DISTINCT n) AS nodes`;

		const res = await this.session.executeRead((tx: ManagedTransaction) =>
			tx.run<Neo4jGetNodesResult>(cypher)
		);

		const nodeRecords = res.records.map((record) => record.get('nodes'));
		const nodes = nodeRecords.map(this.mapNodeRecordsToNodesResult);

		return nodes;
	}

	public async deleteNode(internalId: GraphNodeInternalId) {
		const cypher = `MATCH (n) \
            WHERE n._grs_internalId = $internalId \
            DETACH DELETE n`;

		const res = await this.session.executeWrite((tx: ManagedTransaction) =>
			tx.run(cypher, { internalId })
		);
		return res;
	}

	public async deleteAllNodes() {
		const cypher =
			'MATCH (n) CALL (n) \
        { DETACH DELETE n \
        } IN TRANSACTIONS';

		const result = await this.session.run(cypher);

		return result.records;
	}

	private mapNodeRecordsToNodesResult(
		nodeRecords: Neo4jNode[]
	): Neo4jNodeResult[] {
		const nodes = nodeRecords.map((node) => {
			const nodeData: Neo4jNodeResult = {
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
