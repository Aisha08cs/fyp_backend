import { Router } from 'express';
import { Types } from 'mongoose';
import { authenticateJWT } from '../middleware/auth';
import { Caregiver } from '../models/Caregiver';
import { FallEvent } from '../models/FallEvent';
import { Patient } from '../models/Patient';
import { User } from '../models/User';
import { sendPushNotification } from '../services/notifications.service';

const router = Router();

// Create a new fall event
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user!.email });
    if (!user || user.userType !== 'patient') {
      return res.status(403).json({ message: 'Only patients can create fall events' });
    }

    const patient = await Patient.findOne({ user: user._id });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const fallEvent = new FallEvent({
      ...req.body,
      patientId: patient._id,
    });

    await fallEvent.save();

    // Send push notification to caregiver
    const caregiver = await User.findOne({ email: patient.caregiverEmail });
    if (caregiver) {
      await sendPushNotification(
        caregiver.email,
        'Fall Detection Alert',
        `${user.firstName} ${user.lastName} has experienced a potential fall`,
        {
          fallEventId: fallEvent._id,
          patientName: `${user.firstName} ${user.lastName}`,
          location: fallEvent.location,
          timestamp: fallEvent.timestamp,
        },
      );

      // Update the fall event with notification status
      fallEvent.caregiverNotified = true;
      fallEvent.caregiverNotifiedAt = new Date();
      await fallEvent.save();
    }

    res.status(201).json({ status: 'ok', data: fallEvent });
  } catch (error) {
    console.error('Error creating fall event:', error);
    res.status(500).json({ status: 'error', message: 'Error creating fall event', error });
  }
});

// Get fall events
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
        return res.status(404).json({ message: 'Patient not found' });
      }
      const patient = await Patient.findOne({ user: patientUser._id });
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      patientId = patient._id;
    }

    const events = await FallEvent.find({ patientId }).sort({ timestamp: -1 });
    const filtered = events.filter((event) => !event.dismissed);
    res.json({ status: 'ok', data: filtered });
  } catch (error) {
    console.error('Error fetching fall events:', error);
    res.status(500).json({ status: 'error', message: 'Error fetching fall events', error });
  }
});

// Get a single fall event
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const event = await FallEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Fall event not found',
      });
    }

    // Check if user has access to this event
    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
    }

    if (user.userType === 'patient') {
      const patient = await Patient.findOne({ user: user._id });
      if (!patient || (patient._id as Types.ObjectId).toString() !== (event.patientId as Types.ObjectId).toString()) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied',
        });
      }
    } else {
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
      if (!patient || (patient._id as Types.ObjectId).toString() !== (event.patientId as Types.ObjectId).toString()) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied',
        });
      }
    }

    res.json({
      status: 'ok',
      data: event,
    });
  } catch (error) {
    console.error('Error fetching fall event:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// Update fall event status
router.patch('/:id/status', authenticateJWT, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['confirmed', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const event = await FallEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Fall event not found' });
    }

    // Verify user has access to this event
    if (user.userType === 'patient') {
      const patient = await Patient.findOne({ user: user._id });
      if (!patient || (patient._id as Types.ObjectId).toString() !== (event.patientId as Types.ObjectId).toString()) {
        return res.status(403).json({ message: 'Not authorized to update this event' });
      }
    } else {
      const caregiver = await Caregiver.findOne({ user: user._id });
      if (!caregiver) {
        return res.status(403).json({ message: 'Not authorized to update this event' });
      }
      const patientUser = await User.findOne({ email: caregiver.patientEmail });
      if (!patientUser) {
        return res.status(403).json({ message: 'Not authorized to update this event' });
      }
      const patient = await Patient.findOne({ user: patientUser._id });
      if (!patient || (patient._id as Types.ObjectId).toString() !== (event.patientId as Types.ObjectId).toString()) {
        return res.status(403).json({ message: 'Not authorized to update this event' });
      }
    }

    event.status = status as 'confirmed' | 'resolved';
    if (status === 'confirmed') {
      event.confirmedAt = new Date();
    } else {
      event.resolvedAt = new Date();
      event.resolvedBy = user.userType as 'patient' | 'caregiver';
    }

    await event.save();
    res.json({ status: 'ok', data: event });
  } catch (error) {
    console.error('Error updating fall event:', error);
    res.status(500).json({ status: 'error', message: 'Error updating fall event', error });
  }
});

// Dismiss fall event
router.patch('/:id/dismiss', authenticateJWT, async (req, res) => {
  try {
    const event = await FallEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ status: 'error', message: 'Fall event not found' });
    }

    // Check if user has access to this event
    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    if (user.userType === 'patient') {
      const patient = await Patient.findOne({ user: user._id });
      if (!patient || (patient._id as Types.ObjectId).toString() !== (event.patientId as Types.ObjectId).toString()) {
        return res.status(403).json({ status: 'error', message: 'Access denied' });
      }
    } else {
      const caregiver = await Caregiver.findOne({ user: user._id });
      if (!caregiver) {
        return res.status(403).json({ status: 'error', message: 'Access denied' });
      }
      const patientUser = await User.findOne({ email: caregiver.patientEmail });
      if (!patientUser) {
        return res.status(403).json({ status: 'error', message: 'Access denied' });
      }
      const patient = await Patient.findOne({ user: patientUser._id });
      if (!patient || (patient._id as Types.ObjectId).toString() !== (event.patientId as Types.ObjectId).toString()) {
        return res.status(403).json({ status: 'error', message: 'Access denied' });
      }
    }

    event.dismissed = true;
    event.status = 'resolved';
    await event.save();

    res.json({ status: 'ok', data: event });
  } catch (error) {
    console.error('Error dismissing fall event:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
