import mongoose, { Schema } from 'mongoose';

export type RentalStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type InsuranceTier = 'BASIC' | 'PREMIUM' | 'ENTERPRISE';

export interface IRental {
  rentalId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerRiskScore: number;
  vehicleVin: string;
  vehicleModel: string;
  originHubId: string;
  originHubName: string;
  destinationHubId: string;
  destinationHubName: string;
  startDate: Date;
  expectedEndDate: Date;
  actualEndDate?: Date | null;
  status: RentalStatus;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  routePath: string[]; // List of Hub names/IDs in path
  dailyRate: number;
  estimatedCost: number;
  finalCost?: number;
  insuranceTier: InsuranceTier;
  createdAt: Date;
  updatedAt: Date;
}

const RentalSchema = new Schema<IRental>(
  {
    rentalId: { type: String, required: true, unique: true, index: true },
    customerId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerRiskScore: { type: Number, default: 10 },
    vehicleVin: { type: String, required: true, index: true },
    vehicleModel: { type: String, required: true },
    originHubId: { type: String, required: true, index: true },
    originHubName: { type: String, required: true },
    destinationHubId: { type: String, required: true, index: true },
    destinationHubName: { type: String, required: true },
    startDate: { type: Date, default: Date.now },
    expectedEndDate: { type: Date, required: true },
    actualEndDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    estimatedDistanceKm: { type: Number, required: true },
    estimatedDurationMin: { type: Number, required: true },
    routePath: { type: [String], default: [] },
    dailyRate: { type: Number, required: true },
    estimatedCost: { type: Number, required: true },
    finalCost: { type: Number, default: null },
    insuranceTier: {
      type: String,
      enum: ['BASIC', 'PREMIUM', 'ENTERPRISE'],
      default: 'BASIC',
    },
  },
  {
    timestamps: true,
  }
);

export const RentalModel = mongoose.model<IRental>('Rental', RentalSchema);
