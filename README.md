# Smart Fleet & Rental Tracking System
> A Big Data IoT Platform with Polyglot Persistence (**MongoDB + Neo4j**), **Node.js/Express + TypeScript Backend**, and **React + TypeScript Frontend**.

---

## 🌟 Key Highlights & Big Data Architecture

This project demonstrates **Polyglot Persistence** where two complementary databases handle specialized workloads:

| Capability | Database | Technical Rationale & Role |
| :--- | :--- | :--- |
| **IoT Telemetry Streams & Logs** | **MongoDB** | High-throughput time-series sensor ingestion (GPS `[lng, lat]`, speed, battery %, engine temp, harsh braking, geofencing). `2dsphere` spatial indexing for geofencing and proximity searches. |
| **Rental Contracts & Billing** | **MongoDB** | Rich document model storing variable rental specs, driver licensing, payment receipts, and insurance tiers with flexible schema evolution. |
| **Hub Network & Pathfinding** | **Neo4j** | Graph-modeled road network `(:Hub)-[:CONNECTED_TO {distanceKm, durationMinutes, tollFee}]->(:Hub)` utilizing Cypher `shortestPath` algorithms for optimal multi-hub routing. |
| **Fleet Allocation & Inventory** | **Neo4j** | Real-time vehicle station occupancy `(:Vehicle)-[:CURRENTLY_AT]->(:Hub)` and network rebalancing recommendations to transfer vehicles from surplus to deficit hubs. |
| **Customer Lineage & Risk Rings** | **Neo4j** | Graph relationships `(:Customer)-[:RENTED]->(:Vehicle)` tracking user rental histories and relationship clusters. |

---

## 🚀 Quick Start Guide

### Prerequisites
- [Docker & Docker Desktop](https://www.docker.com/)
- [Node.js](https://nodejs.org/) (v18+) & `npm`

### 1. Run Entire Stack with Docker Compose (Frontend, Backend, MongoDB, Neo4j)
```bash
docker compose up -d --build
```
This starts:
- **Frontend (React + Nginx)**: [http://localhost:5173](http://localhost:5173)
- **Backend (Express + TS)**: [http://localhost:5000](http://localhost:5000)
- **Neo4j Graph Browser**: [http://localhost:7474](http://localhost:7474) (`neo4j` / `password123`)
- **MongoDB**: `localhost:27017`

### 2. (Optional) Run in Local Development Mode
If you prefer developing locally outside of Docker:
```bash
# 1. Start databases only
docker compose up -d mongodb neo4j

# 2. Start Backend
cd backend
npm install
npm run seed     # Pre-populates Hubs, Road Network, Vehicles, Telemetry, and Rentals
npm run dev      # Runs Express on http://localhost:5000

# 3. Start Frontend
cd ../frontend
npm install
npm run dev      # Runs Vite on http://localhost:5173
```

---

## 📱 Application Modules & Features

1. **🗺️ Live Fleet Monitor & Map**:
   - Leaflet interactive map with custom markers for Stations/Hubs and Vehicles.
   - Real-time vehicle tracking with active moving markers driven by the background IoT Telemetry Simulator.
   - Filter vehicles by status (*Available*, *On Rent*, *Maintenance*) and type (*Electric*, *SUV*, *Truck*, *Sedan*, *Van*).
   - Vehicle Diagnostics Drawer showing real-time speed, battery level, engine temperature, and historical telemetry charts (Recharts).

2. **🛣️ Rental & Route Planner**:
   - Origin & Destination Hub Selector.
   - Real-time **Neo4j Cypher Pathfinding** returning total route distance, duration, bridge tolls, and intermediate waypoints.
   - Vehicle picker with live rates and battery levels.
   - Instant dual-write booking (*MongoDB rental document* + *Neo4j customer-vehicle relationship*).
   - Active rental management with one-click return and automatic station inventory updates.

3. **🕸️ Neo4j Knowledge Graph Visualizer**:
   - Interactive SVG force-directed knowledge graph displaying Hubs, Vehicles, Customers, and Connections.
   - Pan, zoom, and inspect Cypher properties for any node.
   - **Hub Inventory & Occupancy Dashboard** (Surplus vs Deficit indicators).
   - **Fleet Rebalancing Engine** recommending vehicle transfers along shortest paths.

4. **📊 Big Data IoT Analytics**:
   - MongoDB aggregation pipelines for fleet energy consumption, mileage by vehicle type, and contract revenue.
   - Real-time IoT anomaly stream logging harsh braking and geofence boundary breaches.

---

## 🛠️ API Reference

- `GET  /api/health` - Check connection status of MongoDB and Neo4j.
- `GET  /api/fleet` - List vehicles with optional filters (`status`, `type`, `hubId`).
- `GET  /api/fleet/:vin` - Detailed vehicle IoT data and historical telemetry.
- `GET  /api/fleet/nearby?lng=...&lat=...` - MongoDB `2dsphere` geospatial proximity query.
- `GET  /api/graph/hubs` - List all transportation hubs.
- `GET  /api/graph/network` - Return graph nodes & edges for visualization.
- `POST /api/graph/route` - Neo4j Cypher `shortestPath` calculation.
- `GET  /api/graph/inventory` - Station capacity and occupancy metrics.
- `GET  /api/graph/rebalance` - Fleet transfer recommendations.
- `GET  /api/rentals` - List rental contracts.
- `POST /api/rentals` - Create rental booking (dual-store sync).
- `POST /api/rentals/:rentalId/complete` - Check-in and return vehicle.
- `GET  /api/telemetry/live` - Real-time IoT positions for all vehicles.
- `POST /api/telemetry/simulate/start|stop|tick` - IoT telemetry simulator controls.
- `GET  /api/analytics` - MongoDB aggregation pipeline metrics.