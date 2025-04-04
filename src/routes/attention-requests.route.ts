import { Router } from 'express';
import { Types } from 'mongoose';
import { authenticateJWT } from '../middleware/auth';
import { AttentionRequest } from '../models/AttentionRequest';
import { Caregiver } from '../models/Caregiver';
import { Patient } from '../models/Patient';
import { User } from '../models/User';
import { sendPushNotification } from '../services/notifications.service';

const router = Router();

// Create a new attention request
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user!.email });
    if (!user || user.userType !== 'patient') {
      return res.status(403).json({ message: 'Only patients can create attention requests' });
    }

    const patient = await Patient.findOne({ user: user._id });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const attentionRequest = new AttentionRequest({
      ...req.body,
      patientId: patient._id,
    });

    await attentionRequest.save();

    // Send push notification to caregiver
    const caregiver = await User.findOne({ email: patient.caregiverEmail });
    if (caregiver) {
      await sendPushNotification(
        caregiver.email,
        'Attention Request Alert',
        `${user.firstName} ${user.lastName} has requested attention`,
        {
          requestId: attentionRequest._id,
          patientName: `${user.firstName} ${user.lastName}`,
          location: attentionRequest.location,
          timestamp: attentionRequest.timestamp,
        },
      );

      // Update the attention request with notification status
      attentionRequest.caregiverNotified = true;
      attentionRequest.caregiverNotifiedAt = new Date();
      await attentionRequest.save();
    }

    res.status(201).json({ status: 'ok', data: attentionRequest });
  } catch (error) {
    console.error('Error creating attention request:', error);
    res.status(500).json({ status: 'error', message: 'Error creating attention request', error });
  }
});

// Get attention requests
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

    const requests = await AttentionRequest.find({ patientId }).sort({ timestamp: -1 });
    const filtered = requests.filter((request) => !request.dismissed);
    res.json({ status: 'ok', data: filtered });
  } catch (error) {
    console.error('Error fetching attention requests:', error);
    res.status(500).json({ status: 'error', message: 'Error fetching attention requests', error });
  }
});

// Get a single attention request
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const request = await AttentionRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        status: 'error',
        message: 'Attention request not found',
      });
    }

    // Check if user has access to this request
    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
    }

    if (user.userType === 'patient') {
      const patient = await Patient.findOne({ user: user._id });
      if (!patient || (patient._id as Types.ObjectId).toString() !== (request.patientId as Types.ObjectId).toString()) {
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
      if (!patient || (patient._id as Types.ObjectId).toString() !== (request.patientId as Types.ObjectId).toString()) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied',
        });
      }
    }

    res.json({
      status: 'ok',
      data: request,
    });
  } catch (error) {
    console.error('Error fetching attention request:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// Update attention request status
router.patch('/:id/status', authenticateJWT, async (req, res) => {
  try {
    const { status } = req.body;
    if (status !== 'resolved') {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const request = await AttentionRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Attention request not found' });
    }

    // Verify user has access to this request
    if (user.userType === 'patient') {
      const patient = await Patient.findOne({ user: user._id });
      if (!patient || (patient._id as Types.ObjectId).toString() !== (request.patientId as Types.ObjectId).toString()) {
        return res.status(403).json({ message: 'Not authorized to update this request' });
      }
    } else {
      const caregiver = await Caregiver.findOne({ user: user._id });
      if (!caregiver) {
        return res.status(403).json({ message: 'Not authorized to update this request' });
      }
      const patientUser = await User.findOne({ email: caregiver.patientEmail });
      if (!patientUser) {
        return res.status(403).json({ message: 'Not authorized to update this request' });
      }
      const patient = await Patient.findOne({ user: patientUser._id });
      if (!patient || (patient._id as Types.ObjectId).toString() !== (request.patientId as Types.ObjectId).toString()) {
        return res.status(403).json({ message: 'Not authorized to update this request' });
      }
    }

    request.status = status;
    request.resolvedAt = new Date();
    request.resolvedBy = user.userType as 'patient' | 'caregiver';

    await request.save();
    res.json({ status: 'ok', data: request });
  } catch (error) {
    console.error('Error updating attention request:', error);
    res.status(500).json({ status: 'error', message: 'Error updating attention request', error });
  }
});

// Dismiss attention request
router.patch('/:id/dismiss', authenticateJWT, async (req, res) => {
  try {
    const request = await AttentionRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ status: 'error', message: 'Attention request not found' });
    }

    // Check if user has access to this request
    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    let hasAccess = false;
    if (user.userType === 'patient') {
      const patient = await Patient.findOne({ user: user._id });
      hasAccess = patient?._id?.toString() === request.patientId?.toString();
    } else {
      const caregiver = await Caregiver.findOne({ user: user._id });
      if (caregiver) {
        const patientUser = await User.findOne({ email: caregiver.patientEmail });
        const patient = await Patient.findOne({ user: patientUser?._id });
        hasAccess = patient?._id?.toString() === request.patientId?.toString();
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ status: 'error', message: 'Access denied' });
    }

    request.dismissed = true;
    request.status = 'resolved';
    await request.save();

    res.json({ status: 'ok', data: request });
  } catch (error) {
    console.error('Error dismissing attention request:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
