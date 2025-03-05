import { v4 as uuid } from 'uuid';

// function createNormalizedUuid() {
// 	return `${uuid().replaceAll('-', '')}`;
// }

let edgeCount = 0;
let nodeCount = 0;

export function createNodeUuid() {
	console.log('create Node Uuid');
	nodeCount++;
	return 'n_' + nodeCount.toString();
}

export function createEdgeUuid() {
	console.log('create Edge Uuid');
	edgeCount++;
	return 'e_' + edgeCount.toString;
}
