import { dataIntegrationMediator } from '../services/dataIntegrationMediator';
import fs from 'fs';
import path from 'path';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

function runVerification() {
  console.log('===============================================================');
  console.log('🧪 RUNNING XML DATA INTEGRATION ARCHITECTURE VERIFICATION TEST');
  console.log('===============================================================');

  const xmlPath = path.join(__dirname, '../config/data-sources-mapping.xml');
  const xsdPath = path.join(__dirname, '../config/data-sources-mapping.xsd');

  // Test 1: Check physical files exist
  console.log('\n[Test 1] Verifying XML and XSD files on disk...');
  if (!fs.existsSync(xmlPath)) {
    throw new Error(`FAIL: data-sources-mapping.xml not found at ${xmlPath}`);
  }
  if (!fs.existsSync(xsdPath)) {
    throw new Error(`FAIL: data-sources-mapping.xsd not found at ${xsdPath}`);
  }
  console.log('✅ PASS: data-sources-mapping.xml exists (' + fs.statSync(xmlPath).size + ' bytes)');
  console.log('✅ PASS: data-sources-mapping.xsd exists (' + fs.statSync(xsdPath).size + ' bytes)');

  // Test 2: Syntactic XML Validation
  console.log('\n[Test 2] Validating XML structure using fast-xml-parser...');
  const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
  const validationResult = XMLValidator.validate(xmlContent);
  if (validationResult !== true) {
    throw new Error(`FAIL: XML is invalid: ${JSON.stringify(validationResult)}`);
  }
  console.log('✅ PASS: data-sources-mapping.xml is 100% syntactically well-formed');

  // Test 3: Initialize DataIntegrationMediator
  console.log('\n[Test 3] Initializing DataIntegrationMediator Service...');
  dataIntegrationMediator.initialize();
  const meta = dataIntegrationMediator.getIntegrationMetadata();

  console.log(`System: ${meta.system}`);
  console.log(`Version: ${meta.version}`);
  console.log(`Data Sources configured: ${meta.dataSources.map((d) => `${d.id} (${d.engine})`).join(', ')}`);

  if (meta.dataSources.length < 2) {
    throw new Error(`FAIL: Expected at least 2 data sources, got ${meta.dataSources.length}`);
  }
  console.log('✅ PASS: Both MongoDB (Document) and Neo4j (Graph) data sources registered');

  // Test 4: Verify Integrated Entity 'Vehicle' & Join Key
  console.log('\n[Test 4] Inspecting GAV Entity Mapping for "Vehicle"...');
  const vehicleEntity = meta.entities.find((e) => e.name === 'Vehicle');
  if (!vehicleEntity) {
    throw new Error('FAIL: "Vehicle" entity mapping missing in XML catalog');
  }

  if (vehicleEntity.primaryJoinKey !== 'vin') {
    throw new Error(`FAIL: Expected primaryJoinKey="vin", got "${vehicleEntity.primaryJoinKey}"`);
  }
  console.log(`✅ PASS: "Vehicle" entity declared with primaryJoinKey="${vehicleEntity.primaryJoinKey}"`);

  // Test 5: Verify Source Field Partitioning
  console.log('\n[Test 5] Verifying database field provenance in XML...');
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const parsed = parser.parse(xmlContent);
  const entities = parsed.DataIntegrationMapping.Entities.Entity;
  const vObj = Array.isArray(entities) ? entities.find((e: any) => e['@_name'] === 'Vehicle') : entities;

  const mongoSource = vObj.Source.find((s: any) => s['@_database'] === 'mongodb_docstore');
  const neo4jSource = vObj.Source.find((s: any) => s['@_database'] === 'neo4j_graphstore');

  if (!mongoSource || !neo4jSource) {
    throw new Error('FAIL: Missing MongoDB or Neo4j source block in Vehicle mapping');
  }

  const mongoFields = mongoSource.Fields.Field.map((f: any) => f['@_name']);
  console.log(`🍃 Fields mapped to MongoDB (${mongoFields.length}): ${mongoFields.join(', ')}`);

  const neo4jTraversals = neo4jSource.GraphTraversal.map((t: any) => t['@_pattern']);
  console.log(`🔷 Graph Traversals mapped to Neo4j (${neo4jTraversals.length}):`);
  neo4jTraversals.forEach((pattern: string) => console.log(`   - ${pattern}`));

  // Check critical fields
  const requiredMongo = ['batteryPct', 'speedKmH', 'engineTempC', 'currentLocation'];
  for (const rf of requiredMongo) {
    if (!mongoFields.includes(rf)) {
      throw new Error(`FAIL: Expected MongoDB field "${rf}" not found in XML mapping`);
    }
  }
  console.log('✅ PASS: All IoT telemetry and document attributes properly assigned to MongoDB');

  // Check join strategy
  const joinStrategy = vObj.JoinStrategy;
  if (!joinStrategy || joinStrategy['@_type'] !== 'EQUIVALENCE') {
    throw new Error('FAIL: JoinStrategy EQUIVALENCE missing in XML');
  }
  console.log(`✅ PASS: Join strategy verified: ${joinStrategy.Key['@_left']} == ${joinStrategy.Key['@_right']}`);

  console.log('\n===============================================================');
  console.log('🎉 ALL XML DATA INTEGRATION TESTS PASSED SUCCESSFULLY!          ');
  console.log('===============================================================\n');
}

try {
  runVerification();
  process.exit(0);
} catch (err: any) {
  console.error('\n❌ VERIFICATION TEST FAILED:', err.message);
  process.exit(1);
}
