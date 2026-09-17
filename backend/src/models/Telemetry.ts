import mongoose, { Schema } from 'mongoose';

export interface ITelemetry {
  vin: string;
  vehicleId?: mongoose.Types.ObjectId;
  rentalId?: string | null;
  timestamp: Date;
  location: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  speedKmH: number;
  batteryPct: number;
  fuelPct: number;
  engineTempC: number;
  harshBraking: boolean;
  geofenceViolation: boolean;
  alertType?: string | null;
}

const TelemetrySchema = new Schema<ITelemetry>(
  {
    vin: { type: String, required: true, index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    rentalId: { type: String, default: null, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    location: {
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
    speedKmH: { type: Number, required: true },
    batteryPct: { type: Number, required: true },
    fuelPct: { type: Number, required: true },
    engineTempC: { type: Number, required: true },
    harshBraking: { type: Boolean, default: false },
    geofenceViolation: { type: Boolean, default: false },
    alertType: { type: String, default: null },
  },
  {
    timestamps: false,
  }
);

TelemetrySchema.index({ vin: 1, timestamp: -1 });
TelemetrySchema.index({ location: '2dsphere' });

export const TelemetryModel = mongoose.model<ITelemetry>('Telemetry', TelemetrySchema);
