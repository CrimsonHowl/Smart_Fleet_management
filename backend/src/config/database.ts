import mongoose from 'mongoose';
import neo4j, { Driver, Session } from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartfleet';
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password123';

let neo4jDriver: Driver | null = null;

export async function connectMongo(): Promise<typeof mongoose> {
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`[MongoDB] Connected successfully to ${MONGODB_URI}`);
    return conn;
  } catch (err) {
    console.error('[MongoDB] Connection error:', err);
    throw err;
  }
}

export function getNeo4jDriver(): Driver {
  if (!neo4jDriver) {
    neo4jDriver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
      {
        maxConnectionLifetime: 3 * 60 * 60 * 1000,
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 20000,
      }
    );
    console.log(`[Neo4j] Driver initialized for ${NEO4J_URI}`);
  }
  return neo4jDriver;
}

export async function runCypher<T = any>(
  query: string,
  params: Record<string, any> = {}
): Promise<T[]> {
  const driver = getNeo4jDriver();
  const session: Session = driver.session();
  try {
    const result = await session.run(query, params);
    return result.records.map((record) => {
      const obj: Record<string, any> = {};
      record.keys.forEach((key) => {
        const keyStr = String(key);
        const val = record.get(keyStr);
        // Handle Neo4j Integers
        obj[keyStr] = neo4j.isInt(val) ? val.toNumber() : val;
      });
      return obj as T;
    });
  } finally {
    await session.close();
  }
}

export async function checkDatabaseHealth(): Promise<{
  mongodb: boolean;
  neo4j: boolean;
  details?: { mongoState: number; neo4jServer?: string };
}> {
  let mongoOk = false;
  let neo4jOk = false;
  let neo4jServer: string | undefined;

  try {
    mongoOk = mongoose.connection.readyState === 1;
  } catch {
    mongoOk = false;
  }

  try {
    const driver = getNeo4jDriver();
    const serverInfo = await driver.getServerInfo();
    neo4jOk = !!serverInfo;
    neo4jServer = serverInfo.agent;
  } catch (e) {
    neo4jOk = false;
  }

  return {
    mongodb: mongoOk,
    neo4j: neo4jOk,
    details: {
      mongoState: mongoose.connection.readyState,
      neo4jServer,
    },
  };
}

export async function disconnectDatabases(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected');
  }
  if (neo4jDriver) {
    await neo4jDriver.close();
    neo4jDriver = null;
    console.log('[Neo4j] Driver closed');
  }
}
