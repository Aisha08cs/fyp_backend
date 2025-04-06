import mongoose, { Document, Schema } from 'mongoose';

export interface ITaskReminder extends Document {
  patientId: mongoose.Types.ObjectId;
  taskName: string;
  description?: string;
  reminderTime: string;
  startDate: Date;
  endDate?: Date;
  frequency: number;
  duration: string;
  status: 'pending' | 'completed' | 'missed';
  caregiverNotification?: {
    enabled: boolean;
    delayHours: number;
  };
  lastNotificationSent?: Date;
  caregiverNotified?: boolean;
  patientNotified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TaskReminderSchema = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patients',
      required: true,
    },
    taskName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    reminderTime: {
      type: String,
      required: true,
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
    frequency: {
      type: Number,
      required: true,
      min: 1,
    },
    duration: {
      type: String,
      required: true,
      enum: ['7', '14', '30', '90', '180', '365', 'ongoing'],
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'completed', 'missed'],
      default: 'pending',
    },
    caregiverNotification: {
      enabled: {
        type: Boolean,
        default: false,
      },
      delayHours: {
        type: Number,
        min: 1,
        default: 4,
      },
    },
    lastNotificationSent: {
      type: Date,
    },
    caregiverNotified: {
      type: Boolean,
      default: false,
    },
    patientNotified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient queries
TaskReminderSchema.index({ patientId: 1, status: 1 });
TaskReminderSchema.index({ patientId: 1, createdAt: -1 });

export default mongoose.model<ITaskReminder>('TaskReminder', TaskReminderSchema, 'TaskReminders');
