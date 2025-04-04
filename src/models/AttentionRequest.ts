import mongoose, { Document, Schema } from 'mongoose';
import { IPatient } from './Patient';

export interface IAttentionRequest extends Document {
  patientId: IPatient['_id'];
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  status: 'pending' | 'resolved';
  resolvedAt?: Date;
  resolvedBy?: 'patient' | 'caregiver';
  caregiverNotified: boolean;
  caregiverNotifiedAt?: Date;
  dismissed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AttentionRequestSchema = new Schema<IAttentionRequest>(
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
      enum: ['pending', 'resolved'],
      required: true,
      default: 'pending',
    },
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
AttentionRequestSchema.index({ patientId: 1, status: 1 });

export const AttentionRequest = mongoose.model<IAttentionRequest>('AttentionRequest', AttentionRequestSchema);
