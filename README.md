# SmartFleet — Big Data IoT Fleet Management & Rental Platform

<p align="center">
  <img src="frontend/public/logo_og.png" alt="SmartFleet Logo" width="160" />
</p>

<p align="center">
  <strong>Enterprise Big Data IoT Platform with Polyglot Persistence (MongoDB + Neo4j)</strong><br />
  Real-time Highway Route Simulation · Graph Network Pathfinding · IoT Telemetry Ingestion · Station Rebalancing
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/MongoDB-7.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Neo4j-5.26-008CC1?style=for-the-badge&logo=neo4j&logoColor=white" alt="Neo4j" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
</p>

---

## 📋 Table of Contents
- [Executive Overview](#-executive-overview)
- [Polyglot Persistence Architecture](#-polyglot-persistence-architecture)
- [System Architecture Diagram](#-system-architecture-diagram)
- [Key Application Features](#-key-application-features)
  - [1. Live OSM India Fleet Map & Real-Time Highway Transit](#1-live-osm-india-fleet-map--real-time-highway-transit)
  - [2. Intelligent Rental Planner & Pathfinding Engine](#2-intelligent-rental-planner--pathfinding-engine)
  - [3. Interactive Neo4j Knowledge Graph Visualizer](#3-interactive-neo4j-knowledge-graph-visualizer)
  - [4. Big Data IoT Aggregation Analytics](#4-big-data-iot-aggregation-analytics)
- [Graph & Document Data Models](#-graph--document-data-models)
- [Quick Start Guide](#-quick-start-guide)
  - [Prerequisites](#prerequisites)
  - [Docker Compose (Recommended)](#1-run-with-docker-compose-recommended)
  - [Local Development Mode](#2-local-development-mode)
- [REST API Specifications](#-rest-api-specifications)
- [Design Aesthetics & Typography](#-design-aesthetics--typography)
- [Academic & Industry Relevance](#-academic--industry-relevance)

---

## 🌟 Executive Overview

**SmartFleet** is an end-to-end, enterprise-grade Fleet Management & IoT Telemetry tracking platform engineered for high-throughput sensor ingestion, multi-modal vehicle rental routing, and graph-based network optimization across India.

The platform solves complex operational challenges in modern smart mobility:
- **High-Velocity Telemetry Streams**: Processing high-frequency sensor readings (GPS coordinates, speed, battery percentage, engine temperature, harsh braking, and geofence events).
- **Interstate Routing & Pathfinding**: Calculating multi-hop shortest paths across transportation hubs using Cypher graph traversal with bridge toll and duration factors.
- **Dynamic Station Fleet Rebalancing**: Detecting surplus and deficit inventory across national hubs and recommending optimal vehicle transfers.
- **Real-Time Highway Route Simulation**: Active vehicle rentals authentically navigate highway trajectories from source to destination with dynamic GPS interpolation and consumption telemetry.

---

## 🧬 Polyglot Persistence Architecture

Rather than forcing an all-in-one database model, SmartFleet implements **Polyglot Persistence**, assigning distinct workloads to the database engine specifically optimized for that data access pattern:

```
                                  ┌──────────────────────────────┐
                                  │   SmartFleet Web Client      │
                                  │  (React 19 + TypeScript)     │
                                  └──────────────┬───────────────┘
                                                 │ HTTP / REST / Vite Proxy
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │   Express / Node.js Engine   │
                                  │    (TypeScript API Server)   │
                                  └──────┬───────────────┬───────┘
                                         │               │
                     High-Throughput IoT │               │ Graph Traversals &
                     Telemetry & Billing │               │ Topology Queries
                                         ▼               ▼
                      ┌────────────────────┐   ┌────────────────────┐
                      │      MongoDB       │   │       Neo4j        │
                      │  (Document Store)  │   │     (Graph DB)     │
                      └────────────────────┘   └────────────────────┘
```

| Operational Domain | Database Engine | Data Model & Technical Rationale |
| :--- | :--- | :--- |
| **IoT Telemetry Streams & Logs** | **MongoDB** | High-throughput time-series sensor ingestion (GPS `[lng, lat]`, speed, battery %, engine temp, harsh braking, geofencing). `2dsphere` spatial indexing for geofencing and proximity searches. |
| **Rental Contracts & Billing** | **MongoDB** | Rich document model storing variable rental specs, driver licensing, payment receipts, and insurance tiers with flexible schema evolution. |
| **Hub Network & Pathfinding** | **Neo4j** | Graph-modeled road network `(:Hub)-[:CONNECTED_TO {distanceKm, durationMinutes, tollFee}]->(:Hub)` utilizing Cypher `shortestPath` algorithms for optimal multi-hub routing. |
| **Fleet Allocation & Inventory** | **Neo4j** | Real-time vehicle station occupancy `(:Vehicle)-[:CURRENTLY_AT]->(:Hub)` and network rebalancing recommendations to transfer vehicles from surplus to deficit hubs. |
| **Customer Lineage & Risk Rings** | **Neo4j** | Graph relationships `(:Customer)-[:RENTED]->(:Vehicle)` tracking user rental histories and relationship clusters. |

---

## 🛠️ Quick Start Guide

### Prerequisites
- [Docker & Docker Desktop](https://www.docker.com/) (v24+)
- [Node.js](https://nodejs.org/) (v18+ or v20+) & `npm`

---

### 1. Run with Docker Compose (Recommended)

Start the entire polyglot stack (MongoDB, Neo4j, Express Backend, and React Frontend) with a single command:

```bash
docker compose up -d --build
```

#### Services and Access URLs:
| Service | URL | Credentials / Notes |
| :--- | :--- | :--- |
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) | React 19 + Nginx production container |
| **Backend REST API** | [http://localhost:5000](http://localhost:5000) | Express + TypeScript API gateway |
| **Neo4j Browser** | [http://localhost:7474](http://localhost:7474) | User: `neo4j` · Password: `password123` |
| **MongoDB** | `localhost:27017` | Database: `smartfleet` |

---

### 2. Local Development Mode

If developing features locally outside of Docker:

```bash
# Step 1: Start database containers only
docker compose up -d mongodb neo4j

# Step 2: Start the Backend Server
cd backend
npm install
npm run seed       # Pre-populates Indian Hubs, Road Network, Vehicles, and Rentals
npm run dev        # Starts Express server on http://localhost:5000

# Step 3: Start the Frontend App (in a separate terminal)
cd ../frontend
npm install
npm run dev        # Starts Vite dev server on http://localhost:5173 or 5174
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