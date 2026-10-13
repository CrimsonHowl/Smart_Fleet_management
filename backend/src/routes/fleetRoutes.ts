import { Router } from 'express';
import {
  getVehicles,
  getVehicleByVin,
  findNearbyVehicles,
  getIntegrationSchema,
  getIntegrationXsd,
} from '../controllers/fleetController';

const router = Router();

// XML Data Integration Catalog routes
router.get('/integration-schema', getIntegrationSchema);
router.get('/integration-xsd', getIntegrationXsd);

// Core Fleet routes (powered by XML Data Integration Mediator)
router.get('/', getVehicles);
router.get('/nearby', findNearbyVehicles);
router.get('/:vin', getVehicleByVin);

export default router;
