import neo4j, { Driver } from 'neo4j-driver';

const driver: Driver = neo4j.driver(
	'bolt://localhost:7687',
	neo4j.auth.basic('neo4j', 'test')
);

export default driver;
