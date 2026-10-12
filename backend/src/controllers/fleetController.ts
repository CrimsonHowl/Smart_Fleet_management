import { Request, Response } from 'express';
import { VehicleModel } from '../models/Vehicle';
import { dataIntegrationMediator } from '../services/dataIntegrationMediator';

/**
 * Fetch all vehicles using XML-governed Data Integration.
 * A single call triggers the mediator to consult data-sources-mapping.xml,
 * query MongoDB (IoT sensors, specs) and Neo4j (Hub network, active customers),
 * and join them on key 'vin'.
 */
export async function getVehicles(req: Request, res: Response) {
  try {
    const vehicles = await dataIntegrationMediator.getIntegratedVehicles(req.query);
    return res.json({
      success: true,
      count: vehicles.length,
      integratedVia: 'data-sources-mapping.xml',
      data: vehicles,
    });
  } catch (err: any) {
    console.error('[fleetController] getVehicles error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Fetch a single vehicle's integrated profile by VIN using the XML mediator.
 */
export async function getVehicleByVin(req: Request, res: Response) {
  try {
    const { vin } = req.params;
    const result = await dataIntegrationMediator.getIntegratedVehicleByVin(vin);

    if (!result || !result.vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    return res.json({
      success: true,
      integratedVia: 'data-sources-mapping.xml',
      data: result,
    });
  } catch (err: any) {
    console.error('[fleetController] getVehicleByVin error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Spatial query: Find vehicles within geospatial radius of given coordinates
 */
export async function findNearbyVehicles(req: Request, res: Response) {
  try {
    const lng = parseFloat(req.query.lng as string);
    const lat = parseFloat(req.query.lat as string);
    const maxDistanceMeters = parseFloat((req.query.maxDistance as string) || '30000'); // 30km default

    if (isNaN(lng) || isNaN(lat)) {
      return res.status(400).json({ success: false, error: 'Valid lng and lat required' });
    }

    const nearbyVehicles = await VehicleModel.find({
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          $maxDistance: maxDistanceMeters,
        },
      },
    });

    return res.json({
      success: true,
      count: nearbyVehicles.length,
      data: nearbyVehicles,
    });
  } catch (err: any) {
    console.error('[fleetController] findNearbyVehicles error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Return the raw XML Data Integration Schema mapping file.
 * Allows examiners, clients, or evaluators to inspect which data comes from MongoDB and which from Neo4j.
 */
export function getIntegrationSchema(req: Request, res: Response) {
  const format = req.query.format;
  if (format === 'json') {
    return res.json({
      success: true,
      schema: dataIntegrationMediator.getIntegrationMetadata(),
    });
  }

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  return res.send(dataIntegrationMediator.getMappingXml());
}

/**
 * Return the formal XSD validation schema for data-sources-mapping.xml.
 */
export function getIntegrationXsd(req: Request, res: Response) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  return res.send(dataIntegrationMediator.getMappingXsd());
}
