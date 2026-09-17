import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectMongo, checkDatabaseHealth, disconnectDatabases } from './config/database';
import fleetRoutes from './routes/fleetRoutes';
import graphRoutes from './routes/graphRoutes';
import rentalRoutes from './routes/rentalRoutes';
import telemetryRoutes from './routes/telemetryRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import { telemetrySimulatorService } from './services/telemetrySimulatorService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/fleet', fleetRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint verifying dual-database status
app.get('/api/health', async (req: Request, res: Response) => {
  const health = await checkDatabaseHealth();
  const allHealthy = health.mongodb && health.neo4j;
  return res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'HEALTHY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    databases: {
      mongodb: health.mongodb ? 'CONNECTED' : 'DISCONNECTED',
      neo4j: health.neo4j ? 'CONNECTED' : 'DISCONNECTED',
      details: health.details,
    },
  });
});

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Smart Fleet & Rental Tracking System API',
    endpoints: [
      '/api/health',
      '/api/fleet',
      '/api/graph/hubs',
      '/api/graph/network',
      '/api/graph/route',
      '/api/graph/inventory',
      '/api/graph/rebalance',
      '/api/rentals',
      '/api/telemetry/live',
      '/api/analytics',
    ],
  });
});

async function bootstrap() {
  try {
    await connectMongo();
    console.log('[Server] Connected to MongoDB');

    // Test Neo4j connection via checkDatabaseHealth
    const health = await checkDatabaseHealth();
    console.log(`[Server] Database health - Mongo: ${health.mongodb}, Neo4j: ${health.neo4j}`);

    // Auto-start simulation service with 4-second intervals
    telemetrySimulatorService.startSimulation(4000);

    const server = app.listen(PORT, () => {
      console.log(`🚀 SmartFleet Server running on http://localhost:${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\nShutting down server gracefully...');
      telemetrySimulatorService.stopSimulation();
      server.close(async () => {
        await disconnectDatabases();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  }
}

bootstrap();
