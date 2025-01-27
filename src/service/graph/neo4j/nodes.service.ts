import { ManagedTransaction, Session, Node, Integer } from 'neo4j-driver';
import {
	GraphNodeInternalId,
	GraphNodeMetadata,
	GraphNodeProperties,
} from '../types';

type Neo4jNode = Node<Integer, GraphNodeProperties>;

interface Neo4jNodeCreated {
	n: Neo4jNode;
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
		tx.run<Neo4jNodeCreated>(cypher, { metadata })
	);

	const nodeRecords = res.records.map((record) => record.get('n'));
	const nodes = mapNodeRecordsToNodesResult(nodeRecords);

	return nodes[0];
}

// Maps the resulting entries into a graphology compatible format
function mapNodeRecordsToNodesResult(
	nodeRecords: Neo4jNode[]
): Neo4jNodeResult[] {
	const nodes = nodeRecords.map((node) => {
		const nodeData: Neo4jNodeResult = {
			key: node.properties._grs_internalId,
			attributes: {
				...node.properties,
			},
		};
		// Remove all keys that were only for internal use
		delete nodeData.attributes._grs_internalId;

		return nodeData;
	});

	return nodes;
}
