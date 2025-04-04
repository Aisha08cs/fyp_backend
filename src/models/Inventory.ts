import mongoose, { Document, Schema } from 'mongoose';

export interface IInventory extends Document {
  patientId: mongoose.Types.ObjectId;
  itemName: string;
  description?: string;
  quantity: number;
  unit: string;
  lastUsed?: Date;
  needsReplenishment: boolean;
  lowStockThreshold: number;
  caregiverNotified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patients', required: true },
    itemName: { type: String, required: true },
    description: { type: String },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    lastUsed: { type: Date },
    needsReplenishment: { type: Boolean, default: false },
    lowStockThreshold: { type: Number, required: true },
    caregiverNotified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IInventory>('Inventory', InventorySchema);
