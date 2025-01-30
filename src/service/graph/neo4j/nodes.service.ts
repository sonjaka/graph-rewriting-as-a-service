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

export async function createNode(
	session: Session,
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

	const res = await session.executeWrite((tx: ManagedTransaction) =>
		tx.run<Neo4jCreateNodeResult>(cypher, { metadata })
	);

	const nodeRecords = res.records.map((record) => record.get('n'));
	const nodes = mapNodeRecordsToNodesResult(nodeRecords);

	return nodes[0];
}

export async function getNode(
	session: Session,
	internalId: GraphNodeInternalId
) {
	const cypher = `MATCH (n) \
		WHERE n._grs_internalId = $internalId \
		RETURN n`;

	const res = await session.executeRead((tx: ManagedTransaction) =>
		tx.run(cypher, { internalId })
	);

	const nodeRecords = res.records.map((record) => record.get('n'));
	const nodes = mapNodeRecordsToNodesResult(nodeRecords);

	return nodes[0];
}

export async function getAllNodes(session: Session) {
	// const cypher = `MATCH (n)
	// OPTIONAL MATCH (n)-[r]-(m)
	// RETURN COLLECT(DISTINCT n) AS nodes, COLLECT(DISTINCT r) AS relationships`;
	const cypher = `MATCH (n)
        RETURN COLLECT(DISTINCT n) AS nodes`;

	const res = await session.executeRead((tx: ManagedTransaction) =>
		tx.run<Neo4jGetNodesResult>(cypher)
	);

	const nodeRecords = res.records.map((record) => record.get('nodes'));
	const nodes = nodeRecords.map(mapNodeRecordsToNodesResult);

	return nodes;
}

export async function deleteNode(
	session: Session,
	internalId: GraphNodeInternalId
) {
	const cypher = `MATCH (n) \
		WHERE n._grs_internalId = $internalId \
		DETACH DELETE n`;

	const res = await session.executeWrite((tx: ManagedTransaction) =>
		tx.run(cypher, { internalId })
	);
	return res;
}

export async function deleteAllNodes(session: Session) {
	const cypher =
		'MATCH (n) CALL (n) \
    { DETACH DELETE n \
    } IN TRANSACTIONS';

	const result = await session.run(cypher);

	return result.records;
}

// Maps the resulting entries into a graphology compatible format
function mapNodeRecordsToNodesResult(
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
		if (nodeData.attributes?.__grs_internalId) {
			delete nodeData.attributes._grs_internalId;
		}

		return nodeData;
	});

	return nodes;
}
