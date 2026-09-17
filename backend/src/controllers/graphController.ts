import { Request, Response } from 'express';
import { neo4jGraphService } from '../services/neo4jGraphService';

export async function getHubs(req: Request, res: Response) {
  try {
    const hubs = await neo4jGraphService.getAllHubs();
    return res.json({ success: true, count: hubs.length, data: hubs });
  } catch (err: any) {
    console.error('getHubs error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getNetworkGraph(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 40;
    const graph = await neo4jGraphService.getFullNetworkGraph(limit);
    return res.json({ success: true, data: graph });
  } catch (err: any) {
    console.error('getNetworkGraph error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function calculateRoute(req: Request, res: Response) {
  try {
    const { originId, destinationId } = req.body;
    if (!originId || !destinationId) {
      return res.status(400).json({ success: false, error: 'originId and destinationId are required' });
    }

    const route = await neo4jGraphService.findShortestRoute(originId, destinationId);
    return res.json({ success: true, data: route });
  } catch (err: any) {
    console.error('calculateRoute error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getHubInventory(req: Request, res: Response) {
  try {
    const stats = await neo4jGraphService.getHubInventoryStats();
    return res.json({ success: true, data: stats });
  } catch (err: any) {
    console.error('getHubInventory error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getRebalancingRecommendations(req: Request, res: Response) {
  try {
    const recommendations = await neo4jGraphService.getRebalancingRecommendations();
    return res.json({ success: true, data: recommendations });
  } catch (err: any) {
    console.error('getRebalancingRecommendations error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
