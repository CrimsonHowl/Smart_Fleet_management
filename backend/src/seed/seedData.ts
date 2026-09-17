import mongoose from 'mongoose';
import { connectMongo, runCypher, disconnectDatabases } from '../config/database';
import { VehicleModel } from '../models/Vehicle';
import { TelemetryModel } from '../models/Telemetry';
import { RentalModel } from '../models/Rental';

interface HubSeed {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  capacity: number;
  type: string;
}

const HUBS: HubSeed[] = [
  {
    id: 'hub-sf-dntn',
    name: 'Downtown Financial Hub',
    city: 'San Francisco',
    lat: 37.7897,
    lng: -122.4014,
    capacity: 25,
    type: 'CENTRAL',
  },
  {
    id: 'hub-sfo-apt',
    name: 'SFO Airport Terminal',
    city: 'San Francisco',
    lat: 37.6213,
    lng: -122.3790,
    capacity: 40,
    type: 'AIRPORT',
  },
  {
    id: 'hub-oak-dntn',
    name: 'Oakland Metro Depot',
    city: 'Oakland',
    lat: 37.8044,
    lng: -122.2712,
    capacity: 20,
    type: 'CENTRAL',
  },
  {
    id: 'hub-palo-alto',
    name: 'Silicon Valley Hub',
    city: 'Palo Alto',
    lat: 37.4419,
    lng: -122.1430,
    capacity: 25,
    type: 'SUBURB',
  },
  {
    id: 'hub-sjc-apt',
    name: 'San Jose Airport Hub',
    city: 'San Jose',
    lat: 37.3639,
    lng: -121.9289,
    capacity: 35,
    type: 'AIRPORT',
  },
  {
    id: 'hub-berkeley',
    name: 'East Bay Tech Station',
    city: 'Berkeley',
    lat: 37.8715,
    lng: -122.2730,
    capacity: 18,
    type: 'SUBURB',
  },
  {
    id: 'hub-fremont',
    name: 'South Bay Logistics Park',
    city: 'Fremont',
    lat: 37.5485,
    lng: -121.9886,
    capacity: 22,
    type: 'PORT',
  },
  {
    id: 'hub-marin',
    name: 'North Bay Gateway',
    city: 'San Rafael',
    lat: 37.9735,
    lng: -122.5311,
    capacity: 15,
    type: 'SUBURB',
  },
];

// Connected bidirectional road network
const CONNECTIONS = [
  { from: 'hub-sf-dntn', to: 'hub-sfo-apt', distanceKm: 21.5, durationMinutes: 25, tollFee: 0 },
  { from: 'hub-sf-dntn', to: 'hub-oak-dntn', distanceKm: 14.8, durationMinutes: 22, tollFee: 7.0 }, // Bay Bridge
  { from: 'hub-sf-dntn', to: 'hub-marin', distanceKm: 28.3, durationMinutes: 32, tollFee: 9.0 }, // Golden Gate
  { from: 'hub-sfo-apt', to: 'hub-palo-alto', distanceKm: 27.2, durationMinutes: 28, tollFee: 0 },
  { from: 'hub-palo-alto', to: 'hub-sjc-apt', distanceKm: 24.1, durationMinutes: 24, tollFee: 0 },
  { from: 'hub-palo-alto', to: 'hub-fremont', distanceKm: 22.8, durationMinutes: 26, tollFee: 7.0 }, // Dumbarton Bridge
  { from: 'hub-oak-dntn', to: 'hub-berkeley', distanceKm: 8.5, durationMinutes: 14, tollFee: 0 },
  { from: 'hub-oak-dntn', to: 'hub-fremont', distanceKm: 39.4, durationMinutes: 38, tollFee: 0 },
  { from: 'hub-fremont', to: 'hub-sjc-apt', distanceKm: 19.3, durationMinutes: 20, tollFee: 0 },
  { from: 'hub-marin', to: 'hub-berkeley', distanceKm: 29.1, durationMinutes: 30, tollFee: 7.0 }, // Richmond Bridge
];

const VEHICLES_SEED = [
  { vin: '1FTFW1ED8NFA00001', plate: '7XYZ101', make: 'Ford', model: 'F-150 Lightning', year: 2024, type: 'TRUCK', rate: 120, hub: 'hub-sf-dntn', status: 'AVAILABLE', batt: 92, fuel: 100 },
  { vin: '5YJ3E1EB8NF100002', plate: '8ABC202', make: 'Tesla', model: 'Model 3 Long Range', year: 2024, type: 'ELECTRIC', rate: 95, hub: 'hub-sf-dntn', status: 'ON_RENT', batt: 68, fuel: 100 },
  { vin: '5YJYGDEE7NF200003', plate: '9DEF303', make: 'Tesla', model: 'Model Y Performance', year: 2023, type: 'ELECTRIC', rate: 110, hub: 'hub-sfo-apt', status: 'AVAILABLE', batt: 85, fuel: 100 },
  { vin: 'WA1VAAF18KD300004', plate: '4GHI404', make: 'Audi', model: 'A4 Quattro', year: 2023, type: 'SEDAN', rate: 85, hub: 'hub-sfo-apt', status: 'AVAILABLE', batt: 100, fuel: 78 },
  { vin: 'JT3HP10U8R0400005', plate: '5JKL505', make: 'Toyota', model: 'RAV4 Hybrid', year: 2024, type: 'SUV', rate: 75, hub: 'hub-sfo-apt', status: 'ON_RENT', batt: 90, fuel: 62 },
  { vin: '1C4HJXDG9MW500006', plate: '6MNO606', make: 'BMW', model: 'X5 xDrive40i', year: 2023, type: 'SUV', rate: 135, hub: 'hub-palo-alto', status: 'AVAILABLE', batt: 100, fuel: 90 },
  { vin: '5YJSA1E28MF600007', plate: '2PQR707', make: 'Tesla', model: 'Model S Plaid', year: 2023, type: 'ELECTRIC', rate: 160, hub: 'hub-palo-alto', status: 'AVAILABLE', batt: 95, fuel: 100 },
  { vin: 'WD4PF4CC4MT700008', plate: '3STU808', make: 'Mercedes-Benz', model: 'Sprinter Cargo', year: 2022, type: 'VAN', rate: 115, hub: 'hub-oak-dntn', status: 'AVAILABLE', batt: 100, fuel: 84 },
  { vin: '1FTNE3Y89KD800009', plate: '1VWX909', make: 'Ford', model: 'Transit 250 Van', year: 2023, type: 'VAN', rate: 105, hub: 'hub-oak-dntn', status: 'MAINTENANCE', batt: 100, fuel: 40 },
  { vin: '7PDSGABA4PP900010', plate: '8YZA010', make: 'Rivian', model: 'R1T Adventure', year: 2024, type: 'TRUCK', rate: 145, hub: 'hub-sjc-apt', status: 'AVAILABLE', batt: 88, fuel: 100 },
  { vin: '1G1FX6S05M4000011', plate: '7BCD111', make: 'Chevrolet', model: 'Bolt EUV', year: 2023, type: 'ELECTRIC', rate: 65, hub: 'hub-sjc-apt', status: 'ON_RENT', batt: 44, fuel: 100 },
  { vin: '4S4WTAED8N3000012', plate: '9EFG212', make: 'Subaru', model: 'Outback XT', year: 2023, type: 'SUV', rate: 80, hub: 'hub-berkeley', status: 'AVAILABLE', batt: 100, fuel: 89 },
  { vin: '2C3CDXHG7PH000013', plate: '3HIJ313', make: 'Toyota', model: 'Camry XSE', year: 2024, type: 'SEDAN', rate: 70, hub: 'hub-berkeley', status: 'AVAILABLE', batt: 100, fuel: 95 },
  { vin: '1FM5K8GC8MGA00014', plate: '5KLM414', make: 'Ford', model: 'Explorer Limited', year: 2023, type: 'SUV', rate: 90, hub: 'hub-fremont', status: 'AVAILABLE', batt: 100, fuel: 72 },
  { vin: '5YJ3E1EB3LF000015', plate: '6NOP515', make: 'Tesla', model: 'Model 3 Standard', year: 2022, type: 'ELECTRIC', rate: 85, hub: 'hub-fremont', status: 'AVAILABLE', batt: 80, fuel: 100 },
  { vin: 'WP0AA2A15MSA00016', plate: '4QRS616', make: 'Porsche', model: 'Taycan 4S', year: 2023, type: 'ELECTRIC', rate: 210, hub: 'hub-marin', status: 'AVAILABLE', batt: 91, fuel: 100 },
  { vin: 'JTDKARFP8N3000017', plate: '2TUV717', make: 'Toyota', model: 'Prius Prime', year: 2024, type: 'SEDAN', rate: 68, hub: 'hub-marin', status: 'AVAILABLE', batt: 96, fuel: 98 },
  { vin: '1FTFW1E84KFA00018', plate: '1WXY818', make: 'Ford', model: 'F-150 SuperCrew', year: 2022, type: 'TRUCK', rate: 110, hub: 'hub-sf-dntn', status: 'AVAILABLE', batt: 100, fuel: 65 },
];

const CUSTOMERS = [
  { id: 'CUST-001', name: 'Alex Johnson', email: 'alex.j@example.com', phone: '+1-415-555-0101', riskScore: 12 },
  { id: 'CUST-002', name: 'Elena Rostova', email: 'elena.r@example.com', phone: '+1-415-555-0102', riskScore: 8 },
  { id: 'CUST-003', name: 'Marcus Chen', email: 'marcus.c@example.com', phone: '+1-510-555-0103', riskScore: 15 },
  { id: 'CUST-004', name: 'Sarah Miller', email: 'sarah.m@example.com', phone: '+1-408-555-0104', riskScore: 7 },
  { id: 'CUST-005', name: 'David Kumar', email: 'david.k@example.com', phone: '+1-650-555-0105', riskScore: 22 },
];

export async function seed() {
  console.log('--- Starting Smart Fleet Database Seed ---');

  await connectMongo();

  // Clear Mongo collections
  await VehicleModel.deleteMany({});
  await TelemetryModel.deleteMany({});
  await RentalModel.deleteMany({});
  console.log('[MongoDB] Collections cleared');

  // Clear Neo4j
  console.log('[Neo4j] Clearing existing graph...');
  await runCypher('MATCH (n) DETACH DELETE n');

  // 1. Seed Hubs in Neo4j
  console.log('[Neo4j] Seeding Hubs...');
  for (const h of HUBS) {
    await runCypher(
      `
      CREATE (hub:Hub {
        id: $id,
        name: $name,
        city: $city,
        latitude: $lat,
        longitude: $lng,
        capacity: $capacity,
        type: $type
      })
    `,
      h
    );
  }

  // 2. Seed Hub Connections in Neo4j
  console.log('[Neo4j] Seeding Hub Road Network Connections...');
  for (const conn of CONNECTIONS) {
    await runCypher(
      `
      MATCH (h1:Hub {id: $from}), (h2:Hub {id: $to})
      MERGE (h1)-[r1:CONNECTED_TO {distanceKm: $distanceKm, durationMinutes: $durationMinutes, tollFee: $tollFee}]->(h2)
      MERGE (h2)-[r2:CONNECTED_TO {distanceKm: $distanceKm, durationMinutes: $durationMinutes, tollFee: $tollFee}]->(h1)
    `,
      conn
    );
  }

  // 3. Seed Customers in Neo4j
  console.log('[Neo4j] Seeding Customers...');
  for (const c of CUSTOMERS) {
    await runCypher(
      `
      CREATE (cust:Customer {
        id: $id,
        name: $name,
        email: $email,
        phone: $phone,
        riskScore: $riskScore
      })
    `,
      c
    );
  }

  // 4. Seed Vehicles in MongoDB and Neo4j
  console.log('[MongoDB & Neo4j] Seeding Vehicles & Fleet Distribution...');
  const hubMap = new Map(HUBS.map((h) => [h.id, h]));

  for (const vData of VEHICLES_SEED) {
    const hub = hubMap.get(vData.hub)!;
    // Location with slight offset
    const lng = hub.lng + (Math.random() - 0.5) * 0.005;
    const lat = hub.lat + (Math.random() - 0.5) * 0.005;

    const mongoVehicle = await VehicleModel.create({
      vin: vData.vin,
      licensePlate: vData.plate,
      make: vData.make,
      model: vData.model,
      year: vData.year,
      type: vData.type,
      status: vData.status,
      batteryPct: vData.batt,
      fuelPct: vData.fuel,
      odometerKm: Math.floor(12000 + Math.random() * 25000),
      dailyRate: vData.rate,
      currentHubId: vData.hub,
      currentLocation: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      speedKmH: vData.status === 'ON_RENT' ? 65 : 0,
      engineTempC: vData.status === 'ON_RENT' ? 92 : 72,
      tirePressurePsi: [35, 35, 34, 34],
      lastSeen: new Date(),
    });

    // Neo4j node and CURRENTLY_AT relationship
    await runCypher(
      `
      MATCH (h:Hub {id: $hubId})
      CREATE (v:Vehicle {
        vin: $vin,
        licensePlate: $plate,
        make: $make,
        model: $model,
        type: $type,
        status: $status
      })
      CREATE (v)-[:CURRENTLY_AT]->(h)
    `,
      {
        hubId: vData.hub,
        vin: vData.vin,
        plate: vData.plate,
        make: vData.make,
        model: vData.model,
        type: vData.type,
        status: vData.status,
      }
    );

    // Initial Telemetry Points for each vehicle
    await TelemetryModel.create({
      vin: vData.vin,
      vehicleId: mongoVehicle._id,
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
      location: {
        type: 'Point',
        coordinates: [lng - 0.01, lat - 0.01],
      },
      speedKmH: vData.status === 'ON_RENT' ? 55 : 0,
      batteryPct: Math.min(100, vData.batt + 1),
      fuelPct: Math.min(100, vData.fuel + 1),
      engineTempC: 85,
      harshBraking: false,
      geofenceViolation: false,
    });

    await TelemetryModel.create({
      vin: vData.vin,
      vehicleId: mongoVehicle._id,
      timestamp: new Date(),
      location: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      speedKmH: vData.status === 'ON_RENT' ? 65 : 0,
      batteryPct: vData.batt,
      fuelPct: vData.fuel,
      engineTempC: vData.status === 'ON_RENT' ? 92 : 72,
      harshBraking: false,
      geofenceViolation: false,
    });
  }

  // 5. Seed Active and Completed Rentals
  console.log('[Dual-Store] Seeding Active & Historical Rentals...');
  const rentalSeedList = [
    {
      rentalId: 'RNT-2024-001',
      customerId: 'CUST-001',
      customerName: 'Alex Johnson',
      customerPhone: '+1-415-555-0101',
      vin: '5YJ3E1EB8NF100002',
      vehicleModel: 'Tesla Model 3 Long Range',
      originHubId: 'hub-sf-dntn',
      originHubName: 'Downtown Financial Hub',
      destHubId: 'hub-sjc-apt',
      destHubName: 'San Jose Airport Hub',
      status: 'ACTIVE' as const,
      estimatedDistanceKm: 72.8,
      estimatedDurationMin: 77,
      routePath: ['Downtown Financial Hub', 'SFO Airport Terminal', 'Silicon Valley Hub', 'San Jose Airport Hub'],
      dailyRate: 95,
      estimatedCost: 190,
      insuranceTier: 'PREMIUM' as const,
    },
    {
      rentalId: 'RNT-2024-002',
      customerId: 'CUST-002',
      customerName: 'Elena Rostova',
      customerPhone: '+1-415-555-0102',
      vin: 'JT3HP10U8R0400005',
      vehicleModel: 'Toyota RAV4 Hybrid',
      originHubId: 'hub-sfo-apt',
      originHubName: 'SFO Airport Terminal',
      destHubId: 'hub-fremont',
      destHubName: 'South Bay Logistics Park',
      status: 'ACTIVE' as const,
      estimatedDistanceKm: 50.0,
      estimatedDurationMin: 54,
      routePath: ['SFO Airport Terminal', 'Silicon Valley Hub', 'South Bay Logistics Park'],
      dailyRate: 75,
      estimatedCost: 150,
      insuranceTier: 'BASIC' as const,
    },
    {
      rentalId: 'RNT-2024-003',
      customerId: 'CUST-003',
      customerName: 'Marcus Chen',
      customerPhone: '+1-510-555-0103',
      vin: '1G1FX6S05M4000011',
      vehicleModel: 'Chevrolet Bolt EUV',
      originHubId: 'hub-sjc-apt',
      originHubName: 'San Jose Airport Hub',
      destHubId: 'hub-oak-dntn',
      destHubName: 'Oakland Metro Depot',
      status: 'ACTIVE' as const,
      estimatedDistanceKm: 58.7,
      estimatedDurationMin: 58,
      routePath: ['San Jose Airport Hub', 'South Bay Logistics Park', 'Oakland Metro Depot'],
      dailyRate: 65,
      estimatedCost: 130,
      insuranceTier: 'BASIC' as const,
    },
  ];

  for (const r of rentalSeedList) {
    await RentalModel.create({
      rentalId: r.rentalId,
      customerId: r.customerId,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      customerRiskScore: 10,
      vehicleVin: r.vin,
      vehicleModel: r.vehicleModel,
      originHubId: r.originHubId,
      originHubName: r.originHubName,
      destinationHubId: r.destHubId,
      destinationHubName: r.destHubName,
      startDate: new Date(Date.now() - 1000 * 60 * 120), // started 2 hours ago
      expectedEndDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // 2 days
      status: r.status,
      estimatedDistanceKm: r.estimatedDistanceKm,
      estimatedDurationMin: r.estimatedDurationMin,
      routePath: r.routePath,
      dailyRate: r.dailyRate,
      estimatedCost: r.estimatedCost,
      insuranceTier: r.insuranceTier,
    });

    // Update activeRentalId on vehicle in Mongo
    await VehicleModel.updateOne({ vin: r.vin }, { activeRentalId: r.rentalId });

    // Link customer-vehicle rental in Neo4j
    await runCypher(
      `
      MATCH (c:Customer {id: $customerId}), (v:Vehicle {vin: $vin})
      CREATE (c)-[:RENTED {
        rentalId: $rentalId,
        startDate: datetime().epochMillis,
        status: 'ACTIVE'
      }]->(v)
    `,
      {
        customerId: r.customerId,
        vin: r.vin,
        rentalId: r.rentalId,
      }
    );
  }

  // 6. Generate historical telemetry points for the active rented vehicles along their path
  console.log('[MongoDB] Generating realistic historical telemetry trails...');
  const activeVehicles = await VehicleModel.find({ status: 'ON_RENT' });
  for (const av of activeVehicles) {
    const [cLng, cLat] = av.currentLocation.coordinates;
    for (let i = 15; i >= 1; i--) {
      await TelemetryModel.create({
        vin: av.vin,
        vehicleId: av._id,
        rentalId: av.activeRentalId,
        timestamp: new Date(Date.now() - i * 1000 * 60 * 4), // 4 mins apart
        location: {
          type: 'Point',
          coordinates: [cLng - (i * 0.003), cLat - (i * 0.0025)],
        },
        speedKmH: Math.floor(50 + Math.random() * 35),
        batteryPct: Math.min(100, av.batteryPct + Math.floor(i * 0.5)),
        fuelPct: Math.min(100, av.fuelPct + Math.floor(i * 0.4)),
        engineTempC: Math.floor(88 + Math.random() * 5),
        harshBraking: i === 7, // one harsh brake in history
        geofenceViolation: false,
        alertType: i === 7 ? 'HARSH_BRAKING_EVENT' : null,
      });
    }
  }

  console.log('--- Database Seeding Successfully Completed! ---');
  await disconnectDatabases();
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
