import { Request, Response } from 'express';
import { RentalModel } from '../models/Rental';
import { VehicleModel } from '../models/Vehicle';
import { neo4jGraphService } from '../services/neo4jGraphService';

export async function getRentals(req: Request, res: Response) {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const rentals = await RentalModel.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, count: rentals.length, data: rentals });
  } catch (err: any) {
    console.error('getRentals error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function createRental(req: Request, res: Response) {
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      vin,
      originHubId,
      destinationHubId,
      durationDays = 2,
      insuranceTier = 'BASIC',
    } = req.body;

    if (!customerId || !customerName || !vin || !originHubId || !destinationHubId) {
      return res.status(400).json({ success: false, error: 'Missing required rental booking fields' });
    }

    // 1. Verify vehicle availability in MongoDB
    const vehicle = await VehicleModel.findOne({ vin });
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }
    if (vehicle.status !== 'AVAILABLE') {
      return res.status(400).json({ success: false, error: `Vehicle is currently ${vehicle.status}` });
    }

    // 2. Query Neo4j for shortest route and hubs
    const route = await neo4jGraphService.findShortestRoute(originHubId, destinationHubId);
    const hubs = await neo4jGraphService.getAllHubs();
    const originHub = hubs.find((h) => h.id === originHubId);
    const destHub = hubs.find((h) => h.id === destinationHubId);

    const rentalId = `RNT-${Date.now().toString().slice(-6)}`;
    const estimatedCost = (vehicle.dailyRate * durationDays) + route.totalTollFee;
    const routePathNames = route.path.map((p) => p.name);

    // 3. Create Rental Document in MongoDB
    const rental = await RentalModel.create({
      rentalId,
      customerId,
      customerName,
      customerPhone: customerPhone || '+1-555-000-0000',
      customerRiskScore: 10,
      vehicleVin: vin,
      vehicleModel: `${vehicle.make} ${vehicle.model}`,
      originHubId,
      originHubName: originHub?.name || originHubId,
      destinationHubId,
      destinationHubName: destHub?.name || destinationHubId,
      startDate: new Date(),
      expectedEndDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      estimatedDistanceKm: route.totalDistanceKm,
      estimatedDurationMin: route.totalDurationMin,
      routePath: routePathNames,
      dailyRate: vehicle.dailyRate,
      estimatedCost,
      insuranceTier,
    });

    // 4. Update Vehicle in MongoDB
    vehicle.status = 'ON_RENT';
    vehicle.activeRentalId = rentalId;
    await vehicle.save();

    // 5. Dual-write to Neo4j: link Customer -[:RENTED]-> Vehicle
    await neo4jGraphService.recordRentalInNeo4j({
      customerId,
      customerName,
      customerPhone: customerPhone || '+1-555-000-0000',
      customerRiskScore: 10,
      vin,
      rentalId,
      startDate: new Date().toISOString(),
    });

    return res.status(201).json({
      success: true,
      message: 'Rental created successfully with dual MongoDB and Neo4j sync',
      data: {
        rental,
        routePlan: route,
      },
    });
  } catch (err: any) {
    console.error('createRental error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function completeRental(req: Request, res: Response) {
  try {
    const { rentalId } = req.params;
    const { returnHubId } = req.body;

    const rental = await RentalModel.findOne({ rentalId });
    if (!rental) {
      return res.status(404).json({ success: false, error: 'Rental not found' });
    }

    if (rental.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: `Rental is already ${rental.status}` });
    }

    const actualReturnHubId = returnHubId || rental.destinationHubId;
    const hubs = await neo4jGraphService.getAllHubs();
    const returnHub = hubs.find((h) => h.id === actualReturnHubId);

    // 1. Update Rental in MongoDB
    rental.status = 'COMPLETED';
    rental.actualEndDate = new Date();
    rental.finalCost = rental.estimatedCost;
    await rental.save();

    // 2. Update Vehicle in MongoDB
    const vehicle = await VehicleModel.findOne({ vin: rental.vehicleVin });
    if (vehicle) {
      vehicle.status = 'AVAILABLE';
      vehicle.activeRentalId = null;
      vehicle.currentHubId = actualReturnHubId;
      if (returnHub) {
        vehicle.currentLocation = {
          type: 'Point',
          coordinates: [returnHub.longitude, returnHub.latitude],
        };
      }
      vehicle.speedKmH = 0;
      await vehicle.save();
    }

    // 3. Complete Rental in Neo4j and attach vehicle to return Hub
    await neo4jGraphService.completeRentalInNeo4j({
      rentalId,
      vin: rental.vehicleVin,
      returnHubId: actualReturnHubId,
      completedDate: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: 'Rental returned and completed across MongoDB and Neo4j',
      data: { rental, vehicle },
    });
  } catch (err: any) {
    console.error('completeRental error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
