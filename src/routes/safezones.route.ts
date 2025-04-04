import { Router } from 'express';
import { Types } from 'mongoose';
import { authenticateJWT } from '../middleware/auth';
import { Caregiver } from '../models/Caregiver';
import { Patient } from '../models/Patient';
import { Safezone } from '../models/Safezone';
import { User } from '../models/User';

const router = Router();

// Create a new safezone
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user!.email });
    if (!user || user.userType !== 'caregiver') {
      return res.status(403).json({ message: 'Only caregivers can create safezones' });
    }

    const caregiver = await Caregiver.findOne({ user: user._id });
    if (!caregiver) {
      return res.status(404).json({ message: 'Caregiver not found' });
    }

    const patientUser = await User.findOne({ email: caregiver.patientEmail });
    if (!patientUser) {
      return res.status(404).json({ message: 'Patient user not found' });
    }

    const patient = await Patient.findOne({ user: patientUser._id });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const safezone = new Safezone({
      ...req.body,
      patientId: patient._id,
    });

    await safezone.save();

    res.status(201).json({ status: 'ok', data: safezone });
  } catch (error) {
    console.error('Error creating safezone:', error);
    res.status(500).json({ status: 'error', message: 'Error creating safezone', error });
  }
});

// Get all safezones for a patient
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let patientId;
    if (user.userType === 'patient') {
      const patient = await Patient.findOne({ user: user._id });
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      patientId = patient._id;
    } else {
      const caregiver = await Caregiver.findOne({ user: user._id });
      if (!caregiver) {
        return res.status(404).json({ message: 'Caregiver not found' });
      }
      const patientUser = await User.findOne({ email: caregiver.patientEmail });
      if (!patientUser) {
        return res.status(404).json({ message: 'Patient user not found' });
      }
      const patient = await Patient.findOne({ user: patientUser._id });
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      patientId = patient._id;
    }

    const safezones = await Safezone.find({ patientId }).sort({ createdAt: -1 });
    res.json({ status: 'ok', data: safezones });
  } catch (error) {
    console.error('Error fetching safezones:', error);
    res.status(500).json({ status: 'error', message: 'Error fetching safezones', error });
  }
});

// Get a single safezone
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const safezone = await Safezone.findById(req.params.id);
    if (!safezone) {
      return res.status(404).json({
        status: 'error',
        message: 'Safezone not found',
      });
    }

    // Check if user has access to this safezone
    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
    }

    if (user.userType === 'patient') {
      const patient = await Patient.findOne({ user: user._id });
      if (
        !patient ||
        (patient._id as Types.ObjectId).toString() !== (safezone.patientId as Types.ObjectId).toString()
      ) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied',
        });
      }
    } else if (user.userType === 'caregiver') {
      const caregiver = await Caregiver.findOne({ user: user._id });
      if (!caregiver) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied',
        });
      }
      const patientUser = await User.findOne({ email: caregiver.patientEmail });
      if (!patientUser) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied',
        });
      }
      const patient = await Patient.findOne({ user: patientUser._id });
      if (
        !patient ||
        (patient._id as Types.ObjectId).toString() !== (safezone.patientId as Types.ObjectId).toString()
      ) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied',
        });
      }
    }

    res.json({
      status: 'ok',
      data: safezone,
    });
  } catch (error) {
    console.error('Error fetching safezone:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// Update a safezone
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const safezone = await Safezone.findById(req.params.id);
    if (!safezone) {
      return res.status(404).json({ message: 'Safezone not found' });
    }

    // Check if user has access to this safezone
    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (user.userType === 'patient') {
      const patient = await Patient.findOne({ user: user._id });
      if (
        !patient ||
        (patient._id as Types.ObjectId).toString() !== (safezone.patientId as Types.ObjectId).toString()
      ) {
        return res.status(403).json({ message: 'Not authorized to update this safezone' });
      }
    } else {
      const caregiver = await Caregiver.findOne({ user: user._id });
      if (!caregiver) {
        return res.status(403).json({ message: 'Not authorized to update this safezone' });
      }
      const patientUser = await User.findOne({ email: caregiver.patientEmail });
      if (!patientUser) {
        return res.status(403).json({ message: 'Not authorized to update this safezone' });
      }
      const patient = await Patient.findOne({ user: patientUser._id });
      if (
        !patient ||
        (patient._id as Types.ObjectId).toString() !== (safezone.patientId as Types.ObjectId).toString()
      ) {
        return res.status(403).json({ message: 'Not authorized to update this safezone' });
      }
    }

    // Update safezone fields
    safezone.name = req.body.name || safezone.name;
    safezone.location = req.body.location || safezone.location;
    safezone.radius = req.body.radius || safezone.radius;

    await safezone.save();
    res.json({ status: 'ok', data: safezone });
  } catch (error) {
    console.error('Error updating safezone:', error);
    res.status(500).json({ status: 'error', message: 'Error updating safezone', error });
  }
});

// Delete a safezone
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const safezone = await Safezone.findById(req.params.id);
    if (!safezone) {
      return res.status(404).json({ message: 'Safezone not found' });
    }

    // Check if user has access to this safezone
    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (user.userType === 'patient') {
      const patient = await Patient.findOne({ user: user._id });
      if (
        !patient ||
        (patient._id as Types.ObjectId).toString() !== (safezone.patientId as Types.ObjectId).toString()
      ) {
        return res.status(403).json({ message: 'Not authorized to delete this safezone' });
      }
    } else {
      const caregiver = await Caregiver.findOne({ user: user._id });
      if (!caregiver) {
        return res.status(403).json({ message: 'Not authorized to delete this safezone' });
      }
      const patientUser = await User.findOne({ email: caregiver.patientEmail });
      if (!patientUser) {
        return res.status(403).json({ message: 'Not authorized to delete this safezone' });
      }
      const patient = await Patient.findOne({ user: patientUser._id });
      if (
        !patient ||
        (patient._id as Types.ObjectId).toString() !== (safezone.patientId as Types.ObjectId).toString()
      ) {
        return res.status(403).json({ message: 'Not authorized to delete this safezone' });
      }
    }

    await safezone.deleteOne();
    res.json({ status: 'ok', message: 'Safezone deleted successfully' });
  } catch (error) {
    console.error('Error deleting safezone:', error);
    res.status(500).json({ status: 'error', message: 'Error deleting safezone', error });
  }
});

export default router;
