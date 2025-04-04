import mongoose, { Document, Schema } from 'mongoose';

export interface IMedicationReminder extends Document {
  patientId: mongoose.Types.ObjectId;
  medicationName: string;
  type: string;
  dosage: string;
  frequency: number;
  medicationTimes: string[];
  startDate: Date;
  endDate?: Date;
  duration: string;
  specialInstructions?: string;
  status: 'pending' | 'taken' | 'missed';
  photoVerification?: {
    required: boolean;
    photoUrl?: string;
    verifiedAt?: Date;
  };
  lastNotificationSent?: Date;
  caregiverNotified?: boolean;
  caregiverNotification?: {
    enabled: boolean;
    delayHours: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MedicationReminderSchema = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patients',
      required: true,
    },
    medicationName: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['tablet', 'capsule', 'liquid', 'spray', 'injection', 'inhaler', 'cream', 'patch'],
    },
    dosage: {
      type: String,
      required: true,
    },
    frequency: {
      type: Number,
      required: true,
      min: 1,
    },
    medicationTimes: {
      type: [String],
      required: true,
      validate: {
        validator: function (this: IMedicationReminder, times: string[]): boolean {
          return times.length === this.frequency;
        },
        message: 'Number of medication times must match the frequency',
      },
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: false,
    },
    duration: {
      type: String,
      required: true,
      enum: ['7', '14', '30', '90', '180', '365', 'ongoing'],
    },
    specialInstructions: {
      type: String,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'taken', 'missed'],
      default: 'pending',
    },
    photoVerification: {
      required: {
        type: Boolean,
        default: true,
      },
      photoUrl: String,
      verifiedAt: Date,
    },
    lastNotificationSent: {
      type: Date,
    },
    caregiverNotified: {
      type: Boolean,
      default: false,
    },
    caregiverNotification: {
      enabled: {
        type: Boolean,
        default: false,
      },
      delayHours: {
        type: Number,
        default: 4,
      },
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient queries
MedicationReminderSchema.index({ patientId: 1, status: 1 });
MedicationReminderSchema.index({ patientId: 1, createdAt: -1 });

export default mongoose.model<IMedicationReminder>(
  'MedicationReminder',
  MedicationReminderSchema,
  'MedicationReminders',
);
