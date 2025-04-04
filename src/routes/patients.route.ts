import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { Caregiver } from '../models/Caregiver';
import { Patient } from '../models/Patient';
import { User } from '../models/User';

const router = Router();

// Get patient info
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let patient;
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

    res.json({ status: 'ok', data: patient });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error fetching patient info', error });
  }
});

// Toggle location sharing
router.post('/location-sharing', authenticateJWT, async (req, res) => {
  try {
    const { enabled } = req.body;
    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const patient = await Patient.findOne({ user: user._id });
    if (!patient) {
      return res.status(403).json({ message: 'Only patients can update location sharing settings' });
    }

    // Initialize locationSharing if it doesn't exist
    if (!patient.locationSharing) {
      patient.locationSharing = {
        enabled: false,
      };
    }

    patient.locationSharing.enabled = enabled;
    if (!enabled) {
      patient.locationSharing.lastLocation = undefined;
    }
    await patient.save();

    res.json({ status: 'ok', data: patient });
  } catch (error) {
    console.error('Error updating location sharing settings:', error);
    res.status(500).json({ status: 'error', message: 'Error updating location sharing settings', error });
  }
});

// Update patient location
router.post('/location', authenticateJWT, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const patient = await Patient.findOne({ user: user._id });
    if (!patient) {
      return res.status(403).json({ message: 'Only patients can update their location' });
    }

    if (!patient.locationSharing?.enabled) {
      return res.status(403).json({ message: 'Location sharing is not enabled' });
    }

    patient.locationSharing.lastLocation = {
      latitude,
      longitude,
      timestamp: new Date(),
    };
    await patient.save();

    res.json({ status: 'ok', data: patient });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error updating location', error });
  }
});

export default router;
