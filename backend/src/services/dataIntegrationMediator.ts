import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { VehicleModel } from '../models/Vehicle';
import { TelemetryModel } from '../models/Telemetry';
import { runCypher } from '../config/database';

export interface DataIntegrationCatalogMetadata {
  system: string;
  version: string;
  dataSources: {
    id: string;
    type: string;
    engine: string;
    description?: string;
  }[];
  entities: {
    name: string;
    primaryJoinKey: string;
    description?: string;
    sources: {
      database: string;
      collectionOrEntity?: string;
      fieldCount: number;
    }[];
  }[];
}

export interface IntegratedVehicleRecord {
  // Common identity
  vin: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  type: string;
  status: string;

  // Sourced from MongoDB (Document Store)
  batteryPct: number;
  fuelPct: number;
  odometerKm: number;
  dailyRate: number;
  speedKmH: number;
  engineTempC: number;
  currentLocation: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  lastSeen: Date | string;
  activeRentalId?: string | null;

  // Sourced from Neo4j (Graph Store)
  currentHubId: string;
  currentHubName?: string;
  currentHubCity?: string;
  currentHubCapacity?: number;
  currentHubType?: string;
  connectedCorridors?: {
    destinationHub: string;
    distanceKm: number;
    durationMinutes: number;
    tollFee: number;
  }[];
  activeCustomerName?: string;
  customerRiskScore?: number;

  // Integration Metadata (Provenance)
  _dataIntegration?: {
    governingXml: string;
    primaryJoinKey: string;
    mongoDbFields: string[];
    neo4jFields: string[];
    integratedAt: string;
  };
}

// Fallback baseline for standalone testing or offline mode
const BASELINE_MONGO_VEHICLES = [
  {
    vin: 'IND-CBE-EV-7001',
    licensePlate: 'TN-38-EV-4410',
    make: 'Tata',
    model: 'Nexon EV Empowered',
    year: 2024,
    type: 'ELECTRIC',
    status: 'AVAILABLE',
    batteryPct: 96,
    fuelPct: 100,
    odometerKm: 14200,
    dailyRate: 46,
    currentHubId: 'hub-cbe-central',
    currentLocation: { type: 'Point', coordinates: [76.9558, 11.0168] },
    speedKmH: 0,
    engineTempC: 35,
    lastSeen: new Date().toISOString(),
    activeRentalId: null,
  },
  {
    vin: 'IND-CBE-SUV-7002',
    licensePlate: 'TN-38-BZ-8822',
    make: 'Mahindra',
    model: 'XUV700 AX7L',
    year: 2024,
    type: 'SUV',
    status: 'ON_RENT',
    batteryPct: 100,
    fuelPct: 82,
    odometerKm: 28400,
    dailyRate: 58,
    currentHubId: 'hub-cbe-central',
    currentLocation: { type: 'Point', coordinates: [77.1000, 11.1500] },
    speedKmH: 74,
    engineTempC: 89,
    lastSeen: new Date().toISOString(),
    activeRentalId: 'RNT-IND-8821',
  },
  {
    vin: 'IND-BLR-EV-7003',
    licensePlate: 'KA-01-EV-2024',
    make: 'Mahindra',
    model: 'XUV400 Pro',
    year: 2024,
    type: 'ELECTRIC',
    status: 'AVAILABLE',
    batteryPct: 88,
    fuelPct: 100,
    odometerKm: 9800,
    dailyRate: 48,
    currentHubId: 'hub-blr-electronic',
    currentLocation: { type: 'Point', coordinates: [77.6602, 12.8452] },
    speedKmH: 0,
    engineTempC: 38,
    lastSeen: new Date().toISOString(),
    activeRentalId: null,
  },
];

const BASELINE_NEO4J_HUBS: Record<string, any> = {
  'hub-cbe-central': {
    id: 'hub-cbe-central',
    name: 'Coimbatore Tidel Park & Tech Hub',
    city: 'Coimbatore',
    capacity: 32,
    type: 'CENTRAL',
    corridors: [
      { destinationHub: 'Bengaluru Electronic City Hub', distanceKm: 362, durationMinutes: 340, tollFee: 6.0 },
      { destinationHub: 'Chennai Port Logistics Depot', distanceKm: 505, durationMinutes: 460, tollFee: 9.5 },
    ],
  },
  'hub-blr-electronic': {
    id: 'hub-blr-electronic',
    name: 'Bengaluru Electronic City Hub',
    city: 'Bengaluru',
    capacity: 40,
    type: 'CENTRAL',
    corridors: [
      { destinationHub: 'Coimbatore Tidel Park & Tech Hub', distanceKm: 362, durationMinutes: 340, tollFee: 6.0 },
      { destinationHub: 'Hyderabad HITEC City Station', distanceKm: 540, durationMinutes: 470, tollFee: 11.5 },
    ],
  },
};

export class DataIntegrationMediator {
  private xmlFilePath: string;
  private xsdFilePath: string;
  private rawXmlContent: string = '';
  private parsedMapping: any = null;
  private isInitialized: boolean = false;

  constructor() {
    const candidateXmlPaths = [
      path.join(__dirname, '../config/data-sources-mapping.xml'),
      path.join(__dirname, '../../src/config/data-sources-mapping.xml'),
      path.join(process.cwd(), 'src/config/data-sources-mapping.xml'),
      path.join(process.cwd(), 'dist/config/data-sources-mapping.xml'),
    ];
    this.xmlFilePath = candidateXmlPaths.find((p) => fs.existsSync(p)) || candidateXmlPaths[0];

    const candidateXsdPaths = [
      path.join(__dirname, '../config/data-sources-mapping.xsd'),
      path.join(__dirname, '../../src/config/data-sources-mapping.xsd'),
      path.join(process.cwd(), 'src/config/data-sources-mapping.xsd'),
      path.join(process.cwd(), 'dist/config/data-sources-mapping.xsd'),
    ];
    this.xsdFilePath = candidateXsdPaths.find((p) => fs.existsSync(p)) || candidateXsdPaths[0];
  }

  /**
   * Initialize and parse the central XML mapping file at startup
   */
  public initialize(): void {
    try {
      if (!fs.existsSync(this.xmlFilePath)) {
        throw new Error(`XML mapping file not found at ${this.xmlFilePath}`);
      }

      this.rawXmlContent = fs.readFileSync(this.xmlFilePath, 'utf-8');

      // Fast XML Validation
      const validationResult = XMLValidator.validate(this.rawXmlContent);
      if (validationResult !== true) {
        throw new Error(`XML Schema Validation error: ${JSON.stringify(validationResult)}`);
      }

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        allowBooleanAttributes: true,
      });

      this.parsedMapping = parser.parse(this.rawXmlContent);
      this.isInitialized = true;

      const mappingMeta = this.getIntegrationMetadata();
      console.log(
        `[XML Data Integration] Successfully initialized Mediator from data-sources-mapping.xml (System: ${mappingMeta.system}, Sources: ${mappingMeta.dataSources.length}, Entities: ${mappingMeta.entities.length})`
      );
    } catch (err: any) {
      console.error('[XML Data Integration] Initialization error:', err.message);
      this.isInitialized = false;
    }
  }

  /**
   * Return the raw XML mapping file content
   */
  public getMappingXml(): string {
    if (!this.rawXmlContent && fs.existsSync(this.xmlFilePath)) {
      this.rawXmlContent = fs.readFileSync(this.xmlFilePath, 'utf-8');
    }
    return this.rawXmlContent;
  }

  /**
   * Return the raw XSD schema content
   */
  public getMappingXsd(): string {
    if (fs.existsSync(this.xsdFilePath)) {
      return fs.readFileSync(this.xsdFilePath, 'utf-8');
    }
    return '';
  }

  /**
   * Extract high-level metadata about the sources and entities declared in the XML
   */
  public getIntegrationMetadata(): DataIntegrationCatalogMetadata {
    if (!this.isInitialized) {
      this.initialize();
    }

    const root = this.parsedMapping?.DataIntegrationMapping || {};
    const sourcesRaw = root.DataSources?.DataSource || [];
    const entitiesRaw = root.Entities?.Entity || [];

    const sourcesArray = Array.isArray(sourcesRaw) ? sourcesRaw : [sourcesRaw];
    const entitiesArray = Array.isArray(entitiesRaw) ? entitiesRaw : [entitiesRaw];

    return {
      system: root['@_system'] || 'SmartFleet',
      version: root['@_version'] || '1.0',
      dataSources: sourcesArray.map((s: any) => ({
        id: s['@_id'],
        type: s['@_type'],
        engine: s['@_engine'],
        description: s.Description,
      })),
      entities: entitiesArray.map((e: any) => {
        const sourceList = Array.isArray(e.Source) ? e.Source : e.Source ? [e.Source] : [];
        return {
          name: e['@_name'],
          primaryJoinKey: e['@_primaryJoinKey'],
          description: e.Description,
          sources: sourceList.map((s: any) => ({
            database: s['@_database'],
            collectionOrEntity: s['@_collection'] || s['@_entity'],
            fieldCount: s.Fields?.Field ? (Array.isArray(s.Fields.Field) ? s.Fields.Field.length : 1) : 0,
          })),
        };
      }),
    };
  }

  /**
   * Fetch all vehicles using XML-governed data integration.
   * Dispatches queries to MongoDB and Neo4j, then performs an in-memory Hash Join on 'vin'.
   */
  public async getIntegratedVehicles(filterQuery: Record<string, any> = {}): Promise<IntegratedVehicleRecord[]> {
    if (!this.isInitialized) {
      this.initialize();
    }

    // 1. Build MongoDB filter
    const mongoFilter: Record<string, any> = {};
    if (filterQuery.status && filterQuery.status !== 'ALL') mongoFilter.status = filterQuery.status;
    if (filterQuery.type && filterQuery.type !== 'ALL') mongoFilter.type = filterQuery.type;
    if (filterQuery.hubId) mongoFilter.currentHubId = filterQuery.hubId;

    // 2. Fetch Document data from MongoDB (as defined in XML for 'mongodb_docstore')
    let mongoVehicles: any[] = [];
    if (mongoose.connection.readyState === 1) {
      mongoVehicles = await VehicleModel.find(mongoFilter).sort({ status: 1, make: 1 }).lean();
    } else {
      // Offline / standalone fallback baseline
      mongoVehicles = BASELINE_MONGO_VEHICLES.filter((v) => {
        if (mongoFilter.status && v.status !== mongoFilter.status) return false;
        if (mongoFilter.type && v.type !== mongoFilter.type) return false;
        if (mongoFilter.currentHubId && v.currentHubId !== mongoFilter.currentHubId) return false;
        return true;
      });
    }

    // 3. Fetch Graph data from Neo4j (as defined in XML for 'neo4j_graphstore')
    const neo4jDataByVin = new Map<string, {
      hub?: { id: string; name: string; city: string; capacity: number; type: string };
      corridors?: any[];
      activeCustomer?: { name: string; riskScore: number };
    }>();

    try {
      // Cypher Query 1: Vehicle Hub assignments and Hub properties
      const hubGraphRows = await runCypher<{
        vin: string;
        hubId: string;
        hubName: string;
        hubCity: string;
        hubCapacity: number;
        hubType: string;
      }>(`
        MATCH (v:Vehicle)
        OPTIONAL MATCH (v)-[:CURRENTLY_AT]->(h:Hub)
        RETURN v.vin AS vin, h.id AS hubId, h.name AS hubName,
               h.city AS hubCity, h.capacity AS hubCapacity, h.type AS hubType
      `);

      for (const row of hubGraphRows) {
        if (row.vin) {
          neo4jDataByVin.set(row.vin, {
            hub: row.hubId ? {
              id: row.hubId,
              name: row.hubName,
              city: row.hubCity,
              capacity: row.hubCapacity,
              type: row.hubType,
            } : undefined,
          });
        }
      }

      // Cypher Query 2: Active customer rentals
      const customerRows = await runCypher<{
        vin: string;
        customerName: string;
        riskScore: number;
      }>(`
        MATCH (c:Customer)-[:RENTED]->(v:Vehicle)
        RETURN v.vin AS vin, c.name AS customerName, c.riskScore AS riskScore
      `);

      for (const row of customerRows) {
        if (row.vin && neo4jDataByVin.has(row.vin)) {
          const entry = neo4jDataByVin.get(row.vin)!;
          entry.activeCustomer = {
            name: row.customerName,
            riskScore: row.riskScore,
          };
        }
      }
    } catch {
      // In offline / fallback mode, use baseline graph data
      for (const mv of mongoVehicles) {
        const hub = BASELINE_NEO4J_HUBS[mv.currentHubId];
        neo4jDataByVin.set(mv.vin, {
          hub,
          corridors: hub?.corridors || [],
          activeCustomer: mv.activeRentalId ? { name: 'Devendra Sharma', riskScore: 10 } : undefined,
        });
      }
    }

    // 4. In-Memory Hash Join Reconciliation on primary join key 'vin' (as dictated by XML)
    const integratedRecords: IntegratedVehicleRecord[] = mongoVehicles.map((mv: any) => {
      const graphInfo = neo4jDataByVin.get(mv.vin);

      return {
        // Shared identity
        vin: mv.vin,
        licensePlate: mv.licensePlate,
        make: mv.make,
        model: mv.model,
        year: mv.year,
        type: mv.type,
        status: mv.status,

        // Sourced from MongoDB (Document Store)
        batteryPct: mv.batteryPct,
        fuelPct: mv.fuelPct,
        odometerKm: mv.odometerKm,
        dailyRate: mv.dailyRate,
        speedKmH: mv.speedKmH,
        engineTempC: mv.engineTempC,
        currentLocation: mv.currentLocation,
        lastSeen: mv.lastSeen,
        activeRentalId: mv.activeRentalId,

        // Sourced from Neo4j (Graph Store)
        currentHubId: graphInfo?.hub?.id || mv.currentHubId,
        currentHubName: graphInfo?.hub?.name || `Hub ${mv.currentHubId}`,
        currentHubCity: graphInfo?.hub?.city,
        currentHubCapacity: graphInfo?.hub?.capacity,
        currentHubType: graphInfo?.hub?.type,
        connectedCorridors: graphInfo?.corridors,
        activeCustomerName: graphInfo?.activeCustomer?.name,
        customerRiskScore: graphInfo?.activeCustomer?.riskScore,

        // Explicit provenance tracking
        _dataIntegration: {
          governingXml: 'data-sources-mapping.xml',
          primaryJoinKey: 'vin',
          mongoDbFields: [
            'batteryPct',
            'fuelPct',
            'odometerKm',
            'speedKmH',
            'engineTempC',
            'currentLocation',
            'dailyRate',
            'lastSeen',
          ],
          neo4jFields: [
            'currentHubName',
            'currentHubCity',
            'currentHubCapacity',
            'currentHubType',
            'activeCustomerName',
            'customerRiskScore',
          ],
          integratedAt: new Date().toISOString(),
        },
      };
    });

    return integratedRecords;
  }

  /**
   * Fetch a single integrated vehicle by VIN, including telemetry history and connected highway corridors
   */
  public async getIntegratedVehicleByVin(vin: string): Promise<{
    vehicle: IntegratedVehicleRecord | null;
    currentHub: any | null;
    telemetryHistory: any[];
  } | null> {
    if (!this.isInitialized) {
      this.initialize();
    }

    // 1. Fetch Vehicle Document from MongoDB
    let vehicleDoc: any = null;
    let telemetryHistory: any[] = [];

    if (mongoose.connection.readyState === 1) {
      vehicleDoc = await VehicleModel.findOne({ vin }).lean();
      if (vehicleDoc) {
        telemetryHistory = await TelemetryModel.find({ vin })
          .sort({ timestamp: -1 })
          .limit(50)
          .lean();
      }
    } else {
      vehicleDoc = BASELINE_MONGO_VEHICLES.find((v) => v.vin === vin) || null;
      if (vehicleDoc) {
        telemetryHistory = [
          {
            vin: vehicleDoc.vin,
            timestamp: new Date().toISOString(),
            speedKmH: vehicleDoc.speedKmH,
            batteryPct: vehicleDoc.batteryPct,
            fuelPct: vehicleDoc.fuelPct,
            engineTempC: vehicleDoc.engineTempC,
            location: vehicleDoc.currentLocation,
            harshBraking: false,
            geofenceViolation: false,
          },
        ];
      }
    }

    if (!vehicleDoc) {
      return null;
    }

    // 2. Fetch Graph Hub and Connected Corridors from Neo4j
    let hubData: any = null;
    let corridors: any[] = [];
    let customerData: any = null;

    try {
      // Find current stationed hub
      const hubResult = await runCypher<any>(
        `
        MATCH (v:Vehicle {vin: $vin})-[:CURRENTLY_AT]->(h:Hub)
        RETURN h.id AS id, h.name AS name, h.city AS city,
               h.capacity AS capacity, h.type AS type,
               h.latitude AS latitude, h.longitude AS longitude
        `,
        { vin }
      );

      if (hubResult.length > 0) {
        hubData = hubResult[0];

        // Fetch outgoing corridors from this hub
        const corridorResult = await runCypher<any>(
          `
          MATCH (h:Hub {id: $hubId})-[r:CONNECTED_TO]->(target:Hub)
          RETURN target.id AS destinationHubId, target.name AS destinationHub,
                 r.distanceKm AS distanceKm, r.durationMinutes AS durationMinutes,
                 r.tollFee AS tollFee
          `,
          { hubId: hubData.id }
        );
        corridors = corridorResult;
      }

      // Find active customer rental
      const custResult = await runCypher<any>(
        `
        MATCH (c:Customer)-[r:RENTED]->(v:Vehicle {vin: $vin})
        RETURN c.name AS customerName, c.riskScore AS riskScore,
               r.rentalId AS rentalId, r.status AS rentalStatus
        `,
        { vin }
      );
      if (custResult.length > 0) {
        customerData = custResult[0];
      }
    } catch {
      // Fallback baseline for hub & corridors
      hubData = BASELINE_NEO4J_HUBS[vehicleDoc.currentHubId] || null;
      corridors = hubData?.corridors || [];
      if (vehicleDoc.activeRentalId) {
        customerData = { customerName: 'Devendra Sharma', riskScore: 10 };
      }
    }

    // 3. Merge records
    const integratedVehicle: IntegratedVehicleRecord = {
      vin: vehicleDoc.vin,
      licensePlate: vehicleDoc.licensePlate,
      make: vehicleDoc.make,
      model: vehicleDoc.model,
      year: vehicleDoc.year,
      type: vehicleDoc.type,
      status: vehicleDoc.status,

      // MongoDB fields
      batteryPct: vehicleDoc.batteryPct,
      fuelPct: vehicleDoc.fuelPct,
      odometerKm: vehicleDoc.odometerKm,
      dailyRate: vehicleDoc.dailyRate,
      speedKmH: vehicleDoc.speedKmH,
      engineTempC: vehicleDoc.engineTempC,
      currentLocation: vehicleDoc.currentLocation,
      lastSeen: vehicleDoc.lastSeen,
      activeRentalId: vehicleDoc.activeRentalId,

      // Neo4j fields
      currentHubId: hubData?.id || vehicleDoc.currentHubId,
      currentHubName: hubData?.name || `Hub ${vehicleDoc.currentHubId}`,
      currentHubCity: hubData?.city,
      currentHubCapacity: hubData?.capacity,
      currentHubType: hubData?.type,
      connectedCorridors: corridors,
      activeCustomerName: customerData?.customerName,
      customerRiskScore: customerData?.riskScore,

      _dataIntegration: {
        governingXml: 'data-sources-mapping.xml',
        primaryJoinKey: 'vin',
        mongoDbFields: ['batteryPct', 'fuelPct', 'odometerKm', 'speedKmH', 'engineTempC', 'currentLocation'],
        neo4jFields: ['currentHubName', 'currentHubCapacity', 'connectedCorridors', 'activeCustomerName'],
        integratedAt: new Date().toISOString(),
      },
    };

    return {
      vehicle: integratedVehicle,
      currentHub: hubData,
      telemetryHistory: telemetryHistory.reverse(),
    };
  }
}

// Export singleton instance
export const dataIntegrationMediator = new DataIntegrationMediator();
