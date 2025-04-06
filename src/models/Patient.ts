import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IPatient extends Document {
  user: IUser['_id'];
  uniqueCode: number;
  caregiverEmail: string | null;
  pushToken?: string; // Add pushToken field
  locationSharing?: {
    enabled: boolean;
    lastLocation?: {
      latitude: number;
      longitude: number;
      timestamp: Date;
    };
  };
}

const PatientSchema = new Schema<IPatient>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'UserInfo', required: true },
    pushToken: { type: String }, // Add pushToken field
    uniqueCode: { type: Number, required: true },
    caregiverEmail: { type: String, default: null },
    locationSharing: {
      enabled: { type: Boolean, default: false },
      lastLocation: {
        latitude: Number,
        longitude: Number,
        timestamp: Date,
      },
    },
  },
  {
    collection: 'Patients',
  },
);

PatientSchema.index({ user: 1 });

export const Patient = mongoose.model<IPatient>('Patients', PatientSchema);
