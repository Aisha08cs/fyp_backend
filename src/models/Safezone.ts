import mongoose, { Document, Schema } from 'mongoose';
import { IPatient } from './Patient';

export interface ISafezone extends Document {
  patientId: IPatient['_id'];
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  radius: number;
  createdAt: Date;
  updatedAt: Date;
}

const SafezoneSchema = new Schema<ISafezone>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    location: {
      type: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
      },
      required: true,
    },
    radius: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Add indexes for efficient querying
SafezoneSchema.index({ patientId: 1 });

export const Safezone = mongoose.model<ISafezone>('Safezone', SafezoneSchema);
