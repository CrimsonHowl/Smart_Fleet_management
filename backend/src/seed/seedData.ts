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

// ── 10 Indian Transportation Hubs (Centered on India & Coimbatore) ──────────
const HUBS: HubSeed[] = [
  {
    id: 'hub-cbe-central',
    name: 'Coimbatore Tidel Park & Tech Hub',
    city: 'Coimbatore',
    lat: 11.0168,
    lng: 76.9558,
    capacity: 32,
    type: 'CENTRAL',
  },
  {
    id: 'hub-mum-central',
    name: 'Mumbai Central Fleet Depot',
    city: 'Mumbai',
    lat: 18.9696,
    lng: 72.8194,
    capacity: 35,
    type: 'CENTRAL',
  },
  {
    id: 'hub-mum-bkc',
    name: 'Bandra Kurla Complex Hub',
    city: 'Mumbai',
    lat: 19.0657,
    lng: 72.8687,
    capacity: 30,
    type: 'SUBURB',
  },
  {
    id: 'hub-pune-depot',
    name: 'Pune Expressway Terminal',
    city: 'Pune',
    lat: 18.5204,
    lng: 73.8567,
    capacity: 25,
    type: 'CENTRAL',
  },
  {
    id: 'hub-blr-electronic',
    name: 'Bengaluru Electronic City Hub',
    city: 'Bengaluru',
    lat: 12.8452,
    lng: 77.6602,
    capacity: 40,
    type: 'CENTRAL',
  },
  {
    id: 'hub-blr-airport',
    name: "Kempegowda Int'l Airport Hub",
    city: 'Bengaluru',
    lat: 13.1986,
    lng: 77.7066,
    capacity: 50,
    type: 'AIRPORT',
  },
  {
    id: 'hub-del-connaught',
    name: 'Delhi Connaught Place Hub',
    city: 'New Delhi',
    lat: 28.6315,
    lng: 77.2167,
    capacity: 35,
    type: 'CENTRAL',
  },
  {
    id: 'hub-del-igi',
    name: 'IGI Airport Terminal 3 Hub',
    city: 'New Delhi',
    lat: 28.5562,
    lng: 77.1000,
    capacity: 45,
    type: 'AIRPORT',
  },
  {
    id: 'hub-hyd-hitech',
    name: 'Hyderabad HITEC City Station',
    city: 'Hyderabad',
    lat: 17.4474,
    lng: 78.3762,
    capacity: 30,
    type: 'SUBURB',
  },
  {
    id: 'hub-chn-port',
    name: 'Chennai Port Logistics Depot',
    city: 'Chennai',
    lat: 13.0827,
    lng: 80.2707,
    capacity: 28,
    type: 'PORT',
  },
];

// Connected bidirectional Indian Highway Network (Neo4j Graph)
const CONNECTIONS = [
  { from: 'hub-cbe-central', to: 'hub-blr-electronic', distanceKm: 362.0, durationMinutes: 340, tollFee: 6.0 }, // NH544 / NH44
  { from: 'hub-cbe-central', to: 'hub-chn-port', distanceKm: 505.0, durationMinutes: 460, tollFee: 9.5 }, // NH544 / NH48
  { from: 'hub-mum-central', to: 'hub-mum-bkc', distanceKm: 14.5, durationMinutes: 28, tollFee: 0 },
  { from: 'hub-mum-bkc', to: 'hub-pune-depot', distanceKm: 148.0, durationMinutes: 130, tollFee: 5.5 }, // Mumbai-Pune Expressway
  { from: 'hub-mum-central', to: 'hub-pune-depot', distanceKm: 152.0, durationMinutes: 140, tollFee: 5.5 },
  { from: 'hub-blr-electronic', to: 'hub-blr-airport', distanceKm: 52.0, durationMinutes: 58, tollFee: 2.0 },
  { from: 'hub-blr-electronic', to: 'hub-chn-port', distanceKm: 345.0, durationMinutes: 330, tollFee: 7.2 },
  { from: 'hub-blr-airport', to: 'hub-hyd-hitech', distanceKm: 540.0, durationMinutes: 470, tollFee: 11.5 },
  { from: 'hub-del-connaught', to: 'hub-del-igi', distanceKm: 16.2, durationMinutes: 30, tollFee: 0 },
  { from: 'hub-mum-bkc', to: 'hub-hyd-hitech', distanceKm: 710.0, durationMinutes: 620, tollFee: 14.0 },
];

const VEHICLES_SEED = [
  // Coimbatore Fleet
  { vin: 'IND-CBE-EV-7001', plate: 'TN-38-EV-4410', make: 'Tata', model: 'Nexon EV Empowered', year: 2024, type: 'ELECTRIC' as const, rate: 46, hub: 'hub-cbe-central', status: 'AVAILABLE' as const, batt: 96, fuel: 100 },
  { vin: 'IND-CBE-SUV-7002', plate: 'TN-38-BZ-8822', make: 'Mahindra', model: 'XUV700 AX7L', year: 2024, type: 'SUV' as const, rate: 58, hub: 'hub-cbe-central', status: 'ON_RENT' as const, batt: 100, fuel: 82 },
  { vin: 'IND-CBE-SED-7003', plate: 'TN-38-AJ-1020', make: 'Honda', model: 'City e:HEV Hybrid', year: 2023, type: 'SEDAN' as const, rate: 42, hub: 'hub-cbe-central', status: 'AVAILABLE' as const, batt: 100, fuel: 90 },

  // Bengaluru Fleet
  { vin: 'IND-BLR-EV-7004', plate: 'KA-01-EV-2024', make: 'Mahindra', model: 'XUV400 Pro', year: 2024, type: 'ELECTRIC' as const, rate: 48, hub: 'hub-blr-electronic', status: 'AVAILABLE' as const, batt: 88, fuel: 100 },
  { vin: 'IND-BLR-EV-7005', plate: 'KA-05-EV-1102', make: 'Tata', model: 'Tiago EV Tech Lux', year: 2024, type: 'ELECTRIC' as const, rate: 36, hub: 'hub-blr-electronic', status: 'ON_RENT' as const, batt: 62, fuel: 100 },
  { vin: 'IND-BLR-VAN-7006', plate: 'KA-51-TR-9081', make: 'Force', model: 'Urbania Luxury Van', year: 2023, type: 'VAN' as const, rate: 85, hub: 'hub-blr-airport', status: 'AVAILABLE' as const, batt: 100, fuel: 74 },
  { vin: 'IND-BLR-SUV-7007', plate: 'KA-03-MY-4421', make: 'Toyota', model: 'Innova Hycross ZX', year: 2024, type: 'SUV' as const, rate: 65, hub: 'hub-blr-airport', status: 'AVAILABLE' as const, batt: 100, fuel: 80 },

  // Mumbai Fleet
  { vin: 'IND-MUM-EV-7008', plate: 'MH-01-EV-9021', make: 'Tata', model: 'Nexon EV Long Range', year: 2024, type: 'ELECTRIC' as const, rate: 50, hub: 'hub-mum-central', status: 'AVAILABLE' as const, batt: 92, fuel: 100 },
  { vin: 'IND-MUM-SUV-7009', plate: 'MH-02-DN-4401', make: 'Mahindra', model: 'Scorpio-N 4xplor', year: 2024, type: 'SUV' as const, rate: 54, hub: 'hub-mum-central', status: 'ON_RENT' as const, batt: 100, fuel: 68 },
  { vin: 'IND-MUM-SED-7010', plate: 'MH-03-BT-7711', make: 'Hyundai', model: 'Verna Turbo SX', year: 2023, type: 'SEDAN' as const, rate: 44, hub: 'hub-mum-bkc', status: 'AVAILABLE' as const, batt: 100, fuel: 86 },

  // Pune Fleet
  { vin: 'IND-PUN-EV-7011', plate: 'MH-12-EV-5544', make: 'MG', model: 'ZS EV Exclusive', year: 2024, type: 'ELECTRIC' as const, rate: 52, hub: 'hub-pune-depot', status: 'AVAILABLE' as const, batt: 79, fuel: 100 },
  { vin: 'IND-PUN-TRK-7012', plate: 'MH-14-GH-3309', make: 'Isuzu', model: 'D-Max V-Cross 4x4', year: 2023, type: 'TRUCK' as const, rate: 70, hub: 'hub-pune-depot', status: 'AVAILABLE' as const, batt: 100, fuel: 65 },

  // Delhi Fleet
  { vin: 'IND-DEL-EV-7013', plate: 'DL-01-EV-8080', make: 'Hyundai', model: 'Ioniq 5 RWD', year: 2024, type: 'ELECTRIC' as const, rate: 95, hub: 'hub-del-connaught', status: 'AVAILABLE' as const, batt: 94, fuel: 100 },
  { vin: 'IND-DEL-SUV-7014', plate: 'DL-03-CY-2211', make: 'Tata', model: 'Safari Dark Edition', year: 2024, type: 'SUV' as const, rate: 62, hub: 'hub-del-igi', status: 'ON_RENT' as const, batt: 100, fuel: 71 },

  // Hyderabad Fleet
  { vin: 'IND-HYD-EV-7015', plate: 'TS-09-EV-3301', make: 'BYD', model: 'Atto 3 Superior', year: 2024, type: 'ELECTRIC' as const, rate: 68, hub: 'hub-hyd-hitech', status: 'AVAILABLE' as const, batt: 87, fuel: 100 },
  { vin: 'IND-HYD-SED-7016', plate: 'TS-07-EK-6622', make: 'Skoda', model: 'Slavia 1.5 TSI', year: 2023, type: 'SEDAN' as const, rate: 45, hub: 'hub-hyd-hitech', status: 'AVAILABLE' as const, batt: 100, fuel: 92 },

  // Chennai Fleet
  { vin: 'IND-CHN-EV-7017', plate: 'TN-01-EV-5050', make: 'Tata', model: 'Curvv EV 55', year: 2024, type: 'ELECTRIC' as const, rate: 55, hub: 'hub-chn-port', status: 'AVAILABLE' as const, batt: 85, fuel: 100 },
  { vin: 'IND-CHN-TRK-7018', plate: 'TN-04-TR-1288', make: 'Tata', model: 'Yodha 2.0 Pickup', year: 2023, type: 'TRUCK' as const, rate: 60, hub: 'hub-chn-port', status: 'MAINTENANCE' as const, batt: 100, fuel: 40 },
];

const CUSTOMERS = [
  { id: 'CUST-IND-801', name: 'Devendra Sharma', email: 'devendra.s@fleet.in', phone: '+91-98200-11223', riskScore: 8 },
  { id: 'CUST-IND-802', name: 'Priya Sundaram', email: 'priya.s@tech.in', phone: '+91-94432-88102', riskScore: 10 },
  { id: 'CUST-IND-803', name: 'Rajesh Varma', email: 'rajesh.v@trans.in', phone: '+91-98450-44221', riskScore: 14 },
  { id: 'CUST-IND-804', name: 'Ananya Deshmukh', email: 'ananya.d@pune.in', phone: '+91-98221-55009', riskScore: 6 },
  { id: 'CUST-IND-805', name: 'Vikramaditya Rao', email: 'vikram.r@hyd.in', phone: '+91-99890-33441', riskScore: 12 },
];

export async function seed() {
  console.log('========================================================================');
  console.log('🇮🇳 SEEDING SMARTFLEET INDIAN HIGHWAY & POLYGLOT PERSISTENCE DATA');
  console.log('========================================================================\n');

  await connectMongo();
  console.log('[MongoDB] Connected to database');

  // Clear Mongo collections
  await VehicleModel.deleteMany({});
  await TelemetryModel.deleteMany({});
  await RentalModel.deleteMany({});
  console.log('[MongoDB] Collections cleared (vehicles, telemetries, rentals)');

  // Clear Neo4j
  console.log('[Neo4j] Clearing existing graph...');
  await runCypher('MATCH (n) DETACH DELETE n');

  // 1. Seed Hubs in Neo4j
  console.log('[Neo4j] Seeding 10 Indian Transportation Hubs...');
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

  // 2. Seed Hub Highway Connections in Neo4j
  console.log('[Neo4j] Seeding Connected Interstate Highway Corridors...');
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
  console.log('[Neo4j] Seeding Enterprise Customers...');
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
  console.log('[MongoDB & Neo4j] Seeding Fleet Vehicles with Dual-Store Linking...');
  const hubMap = new Map(HUBS.map((h) => [h.id, h]));

  for (const vData of VEHICLES_SEED) {
    const hub = hubMap.get(vData.hub)!;
    const lng = hub.lng + (Math.random() - 0.5) * 0.006;
    const lat = hub.lat + (Math.random() - 0.5) * 0.006;

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
      odometerKm: Math.floor(8000 + Math.random() * 20000),
      dailyRate: vData.rate,
      currentHubId: vData.hub,
      currentLocation: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      speedKmH: vData.status === 'ON_RENT' ? 72 : 0,
      engineTempC: vData.status === 'ON_RENT' ? 90 : 70,
      tirePressurePsi: [34, 34, 34, 34],
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

    // Initial Telemetry Points for each vehicle in MongoDB
    await TelemetryModel.create({
      vin: vData.vin,
      vehicleId: mongoVehicle._id,
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
      location: {
        type: 'Point',
        coordinates: [lng - 0.002, lat - 0.002],
      },
      speedKmH: vData.status === 'ON_RENT' ? 68 : 0,
      batteryPct: Math.min(100, vData.batt + 1),
      fuelPct: Math.min(100, vData.fuel + 1),
      engineTempC: 84,
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
      speedKmH: vData.status === 'ON_RENT' ? 75 : 0,
      batteryPct: vData.batt,
      fuelPct: vData.fuel,
      engineTempC: vData.status === 'ON_RENT' ? 88 : 70,
      harshBraking: false,
      geofenceViolation: false,
    });
  }

  // 5. Seed Active and Completed Rentals
  console.log('[Dual-Store] Seeding Active Indian Highway Rentals...');
  const rentalSeedList = [
    {
      rentalId: 'RNT-IND-8821',
      customerId: 'CUST-IND-801',
      customerName: 'Devendra Sharma',
      customerPhone: '+91-98200-11223',
      vin: 'IND-CBE-SUV-7002',
      vehicleModel: 'Mahindra XUV700 AX7L',
      originHubId: 'hub-cbe-central',
      originHubName: 'Coimbatore Tidel Park & Tech Hub',
      destHubId: 'hub-blr-electronic',
      destHubName: 'Bengaluru Electronic City Hub',
      status: 'ACTIVE' as const,
      estimatedDistanceKm: 362.0,
      estimatedDurationMin: 340,
      routePath: ['Coimbatore Tidel Park & Tech Hub', 'Bengaluru Electronic City Hub'],
      dailyRate: 58,
      estimatedCost: 122,
      insuranceTier: 'PREMIUM' as const,
    },
    {
      rentalId: 'RNT-IND-8822',
      customerId: 'CUST-IND-802',
      customerName: 'Priya Sundaram',
      customerPhone: '+91-94432-88102',
      vin: 'IND-BLR-EV-7005',
      vehicleModel: 'Tata Tiago EV Tech Lux',
      originHubId: 'hub-blr-electronic',
      originHubName: 'Bengaluru Electronic City Hub',
      destHubId: 'hub-chn-port',
      destHubName: 'Chennai Port Logistics Depot',
      status: 'ACTIVE' as const,
      estimatedDistanceKm: 345.0,
      estimatedDurationMin: 330,
      routePath: ['Bengaluru Electronic City Hub', 'Chennai Port Logistics Depot'],
      dailyRate: 36,
      estimatedCost: 79,
      insuranceTier: 'BASIC' as const,
    },
    {
      rentalId: 'RNT-IND-8823',
      customerId: 'CUST-IND-804',
      customerName: 'Ananya Deshmukh',
      customerPhone: '+91-98221-55009',
      vin: 'IND-MUM-SUV-7009',
      vehicleModel: 'Mahindra Scorpio-N 4xplor',
      originHubId: 'hub-mum-central',
      originHubName: 'Mumbai Central Fleet Depot',
      destHubId: 'hub-pune-depot',
      destHubName: 'Pune Expressway Terminal',
      status: 'ACTIVE' as const,
      estimatedDistanceKm: 152.0,
      estimatedDurationMin: 140,
      routePath: ['Mumbai Central Fleet Depot', 'Bandra Kurla Complex Hub', 'Pune Expressway Terminal'],
      dailyRate: 54,
      estimatedCost: 113,
      insuranceTier: 'BASIC' as const,
    },
  ];

  for (const r of rentalSeedList) {
    await RentalModel.create({
      rentalId: r.rentalId,
      customerId: r.customerId,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      customerRiskScore: 8,
      vehicleVin: r.vin,
      vehicleModel: r.vehicleModel,
      originHubId: r.originHubId,
      originHubName: r.originHubName,
      destinationHubId: r.destHubId,
      destinationHubName: r.destHubName,
      startDate: new Date(Date.now() - 1000 * 60 * 90),
      expectedEndDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
      status: r.status,
      estimatedDistanceKm: r.estimatedDistanceKm,
      estimatedDurationMin: r.estimatedDurationMin,
      routePath: r.routePath,
      dailyRate: r.dailyRate,
      estimatedCost: r.estimatedCost,
      insuranceTier: r.insuranceTier,
    });

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

  // 6. Generate historical telemetry trails
  console.log('[MongoDB] Generating historical telemetry sensor trails for active vehicles...');
  const activeVehicles = await VehicleModel.find({ status: 'ON_RENT' });
  for (const av of activeVehicles) {
    const [cLng, cLat] = av.currentLocation.coordinates;
    for (let i = 12; i >= 1; i--) {
      await TelemetryModel.create({
        vin: av.vin,
        vehicleId: av._id,
        rentalId: av.activeRentalId,
        timestamp: new Date(Date.now() - i * 1000 * 60 * 3),
        location: {
          type: 'Point',
          coordinates: [cLng - i * 0.002, cLat - i * 0.0018],
        },
        speedKmH: Math.floor(65 + Math.random() * 20),
        batteryPct: Math.min(100, av.batteryPct + Math.floor(i * 0.4)),
        fuelPct: Math.min(100, av.fuelPct + Math.floor(i * 0.3)),
        engineTempC: Math.floor(86 + Math.random() * 5),
        harshBraking: i === 5,
        geofenceViolation: false,
        alertType: i === 5 ? 'HARSH_BRAKING_EVENT' : null,
      });
    }
  }

  console.log('\n========================================================================');
  console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  console.log('   - 10 Indian Hubs & Interstate Highway Corridors seeded in Neo4j');
  console.log('   - 18 Fleet Vehicles seeded in MongoDB & Neo4j');
  console.log('   - Active Rentals & IoT Telemetry seeded in MongoDB & Neo4j');
  console.log('========================================================================\n');

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
