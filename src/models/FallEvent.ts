import mongoose, { Document, Schema } from 'mongoose';
import { IPatient } from './Patient';

export interface IFallEvent extends Document {
  patientId: IPatient['_id'];
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  status: 'pending' | 'confirmed' | 'resolved';
  confirmedAt?: Date;
  resolvedAt?: Date;
  resolvedBy?: 'patient' | 'caregiver';
  caregiverNotified: boolean;
  caregiverNotifiedAt?: Date;
  dismissed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FallEventSchema = new Schema<IFallEvent>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    location: {
      type: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
      },
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'resolved'],
      required: true,
      default: 'pending',
    },
    confirmedAt: Date,
    resolvedAt: Date,
    resolvedBy: {
      type: String,
      enum: ['patient', 'caregiver'],
    },
    caregiverNotified: {
      type: Boolean,
      required: true,
      default: false,
    },
    caregiverNotifiedAt: Date,
    dismissed: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Add indexes for efficient querying
FallEventSchema.index({ patientId: 1, status: 1 });
FallEventSchema.index({ timestamp: -1 });

export const FallEvent = mongoose.model<IFallEvent>('FallEvent', FallEventSchema);
