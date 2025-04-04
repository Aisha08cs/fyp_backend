import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface ICaregiver extends Document {
  user: IUser['_id'];
  patientEmail: string;
  pushToken?: string;
}

const CaregiverSchema = new Schema<ICaregiver>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'UserInfo', required: true },
    patientEmail: { type: String, required: true },
    pushToken: { type: String },
  },
  {
    collection: 'Caregivers',
  },
);

CaregiverSchema.index({ user: 1 });
CaregiverSchema.index({ patientEmail: 1 });

export const Caregiver = mongoose.model<ICaregiver>('Caregivers', CaregiverSchema);
