import mongoose, { Document, Schema } from 'mongoose';

export interface ISafezoneBreach extends Document {
  patientId: mongoose.Types.ObjectId;
  safezoneId: mongoose.Types.ObjectId;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: Date;
  dismissed: boolean;
  dismissedAt?: Date;
  dismissedBy?: mongoose.Types.ObjectId;
}

const SafezoneBreachSchema = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    safezoneId: {
      type: Schema.Types.ObjectId,
      ref: 'Safezone',
      required: true,
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dismissed: {
      type: Boolean,
      default: false,
    },
    dismissedAt: {
      type: Date,
    },
    dismissedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<ISafezoneBreach>('SafezoneBreach', SafezoneBreachSchema);
