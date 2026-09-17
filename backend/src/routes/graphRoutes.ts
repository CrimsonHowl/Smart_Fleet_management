import { Router } from 'express';
import {
  getHubs,
  getNetworkGraph,
  calculateRoute,
  getHubInventory,
  getRebalancingRecommendations,
} from '../controllers/graphController';

const router = Router();

router.get('/hubs', getHubs);
router.get('/network', getNetworkGraph);
router.get('/inventory', getHubInventory);
router.get('/rebalance', getRebalancingRecommendations);
router.post('/route', calculateRoute);

export default router;
