import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { Caregiver } from '../models/Caregiver';
import Inventory from '../models/Inventory';
import { IPatient, Patient } from '../models/Patient';
import { User } from '../models/User';

const router = Router();

// Create a new inventory item
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is a patient
    const patient = await Patient.findOne({ user: user._id });

    // Check if user is a caregiver
    const caregiver = await Caregiver.findOne({ user: user._id });

    if (!patient && !caregiver) {
      return res.status(403).json({ message: 'Only patients and caregivers can create inventory items' });
    }

    // If it's a caregiver, find the patient by email
    let targetPatientId;
    if (caregiver) {
      const patientUser = await User.findOne({ email: caregiver.patientEmail });
      if (!patientUser) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      const targetPatient = await Patient.findOne({ user: patientUser._id });
      if (!targetPatient) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      targetPatientId = targetPatient._id;
    } else {
      targetPatientId = patient!._id;
    }

    const inventoryItem = new Inventory({
      ...req.body,
      patientId: targetPatientId,
    });

    await inventoryItem.save();
    res.status(201).json({ status: 'ok', data: inventoryItem });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({ status: 'error', message: 'Error creating inventory item', error });
  }
});

// Get all inventory items
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let patient: IPatient | null;
    if (user.userType === 'patient') {
      patient = await Patient.findOne({ user: user._id });
    } else {
      const caregiver = await Caregiver.findOne({ user: user._id });
      if (!caregiver) {
        return res.status(403).json({ message: 'Caregiver not found' });
      }

      const patientUser = await User.findOne({ email: caregiver.patientEmail });
      patient = await Patient.findOne({ user: patientUser!._id });
    }

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const inventoryItems = await Inventory.find({ patientId: patient._id }).sort({ createdAt: -1 });
    res.json({ status: 'ok', data: inventoryItems });
  } catch (error) {
    console.error('Error in /inventory:', error);
    res.status(500).json({ status: 'error', message: 'Error fetching inventory items', error });
  }
});

// Get a specific inventory item
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let hasAccess = false;
    if (user.userType === 'patient') {
      const patient: IPatient | null = await Patient.findOne({ user: user._id });
      hasAccess = patient?._id?.toString() === item.patientId.toString();
    } else {
      const caregiver = await Caregiver.findOne({ user: user._id });
      if (caregiver) {
        const patientUser = await User.findOne({ email: caregiver.patientEmail });
        const patient: IPatient | null = await Patient.findOne({ user: patientUser!._id });
        hasAccess = patient?._id?.toString() === item.patientId.toString();
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Not authorized to view this item' });
    }

    res.json({ status: 'ok', data: item });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error fetching inventory item', error });
  }
});

// Update an inventory item
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let hasAccess = false;
    if (user.userType === 'patient') {
      const patient: IPatient | null = await Patient.findOne({ user: user._id });
      hasAccess = patient?._id?.toString() === item.patientId.toString();
    } else {
      const caregiver = await Caregiver.findOne({ user: user._id });
      if (caregiver) {
        const patientUser = await User.findOne({ email: caregiver.patientEmail });
        const patient: IPatient | null = await Patient.findOne({ user: patientUser!._id });
        hasAccess = patient?._id?.toString() === item.patientId.toString();
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Not authorized to update this item' });
    }

    // If quantity is being updated, check if it needs replenishment
    const updateData = { ...req.body };
    if ('quantity' in updateData) {
      const needsReplenishment = updateData.quantity <= item.lowStockThreshold;
      updateData.needsReplenishment = needsReplenishment;
      // Reset caregiverNotified if item is no longer low on stock
      if (!needsReplenishment) {
        updateData.caregiverNotified = false;
      }
    }

    const updatedItem = await Inventory.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true });
    res.json({ status: 'ok', data: updatedItem });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error updating inventory item', error });
  }
});

// Delete an inventory item
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let hasAccess = false;
    if (user.userType === 'patient') {
      const patient: IPatient | null = await Patient.findOne({ user: user._id });
      hasAccess = patient?._id?.toString() === item.patientId.toString();
    } else {
      const caregiver = await Caregiver.findOne({ user: user._id });
      if (caregiver) {
        const patientUser = await User.findOne({ email: caregiver.patientEmail });
        const patient: IPatient | null = await Patient.findOne({ user: patientUser!._id });
        hasAccess = patient?._id?.toString() === item.patientId.toString();
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Not authorized to delete this item' });
    }

    await Inventory.findByIdAndDelete(req.params.id);
    res.json({ status: 'ok', message: 'Inventory item deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error deleting inventory item', error });
  }
});

// Mark an item as used
router.post('/:id/use', authenticateJWT, async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const patient: IPatient | null = await Patient.findOne({ user: user._id });
    if (!patient || patient._id?.toString() !== item.patientId.toString()) {
      return res.status(403).json({ message: 'Not authorized to use this item' });
    }

    const { quantityUsed = 1 } = req.body;
    const newQuantity = Math.max(0, item.quantity - quantityUsed);

    const updatedItem = await Inventory.findByIdAndUpdate(
      req.params.id,
      {
        quantity: newQuantity,
        lastUsed: new Date(),
        needsReplenishment: newQuantity <= item.lowStockThreshold,
      },
      { new: true },
    );

    res.json({ status: 'ok', data: updatedItem });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error marking item as used', error });
  }
});

export default router;
