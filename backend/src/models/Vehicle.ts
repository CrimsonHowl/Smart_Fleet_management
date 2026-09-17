import mongoose, { Schema } from 'mongoose';

export type VehicleType = 'SEDAN' | 'SUV' | 'ELECTRIC' | 'VAN' | 'TRUCK';
export type VehicleStatus = 'AVAILABLE' | 'ON_RENT' | 'MAINTENANCE' | 'TRANSIT';

export interface IVehicle {
  vin: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  status: VehicleStatus;
  batteryPct: number;
  fuelPct: number;
  odometerKm: number;
  dailyRate: number;
  currentHubId: string;
  currentLocation: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  speedKmH: number;
  engineTempC: number;
  tirePressurePsi: number[];
  lastSeen: Date;
  activeRentalId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>(
  {
    vin: { type: String, required: true, unique: true, index: true },
    licensePlate: { type: String, required: true },
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    type: {
      type: String,
      enum: ['SEDAN', 'SUV', 'ELECTRIC', 'VAN', 'TRUCK'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ON_RENT', 'MAINTENANCE', 'TRANSIT'],
      default: 'AVAILABLE',
      index: true,
    },
    batteryPct: { type: Number, default: 100 },
    fuelPct: { type: Number, default: 100 },
    odometerKm: { type: Number, default: 0 },
    dailyRate: { type: Number, required: true },
    currentHubId: { type: String, required: true, index: true },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    speedKmH: { type: Number, default: 0 },
    engineTempC: { type: Number, default: 90 },
    tirePressurePsi: { type: [Number], default: [34, 34, 34, 34] },
    lastSeen: { type: Date, default: Date.now },
    activeRentalId: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

VehicleSchema.index({ currentLocation: '2dsphere' });

export const VehicleModel = mongoose.model<IVehicle>('Vehicle', VehicleSchema);
