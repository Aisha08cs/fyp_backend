import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { Caregiver } from '../models/Caregiver';
import { IPatient, Patient } from '../models/Patient';
import TaskReminder from '../models/TaskReminder';
import { User } from '../models/User';

const router = Router();

// Create a new task reminder
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
      return res.status(403).json({ message: 'Only patients and caregivers can create reminders' });
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

    const reminder = new TaskReminder({
      ...req.body,
      patientId: targetPatientId,
    });

    await reminder.save();

    res.status(201).json({ status: 'ok', data: reminder });
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({ status: 'error', message: 'Error creating reminder', error });
  }
});

// Get all task reminders
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

    const reminders = await TaskReminder.find({ patientId: patient._id }).sort({ createdAt: -1 });

    res.json({ status: 'ok', data: reminders });
  } catch (error) {
    console.error('Error in /task-reminders:', error);
    res.status(500).json({ status: 'error', message: 'Error fetching reminders', error });
  }
});

// Get a specific task reminder
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const reminder = await TaskReminder.findById(req.params.id);
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let hasAccess = false;
    if (user.userType === 'patient') {
      const patient: IPatient | null = await Patient.findOne({ user: user._id });
      hasAccess = patient?._id?.toString() === reminder.patientId.toString();
    } else {
      const caregiver = await Caregiver.findOne({ user: user._id });
      if (caregiver) {
        const patientUser = await User.findOne({ email: caregiver.patientEmail });
        const patient: IPatient | null = await Patient.findOne({ user: patientUser!._id });
        hasAccess = patient?._id?.toString() === reminder.patientId.toString();
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Not authorized to view this reminder' });
    }

    res.json({ status: 'ok', data: reminder });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error fetching reminder', error });
  }
});

// Update a task reminder
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const reminder = await TaskReminder.findById(req.params.id);
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let hasAccess = false;
    if (user.userType === 'patient') {
      const patient: IPatient | null = await Patient.findOne({ user: user._id });
      hasAccess = patient?._id?.toString() === reminder.patientId.toString();
    } else {
      const caregiver = await Caregiver.findOne({ user: user._id });
      if (caregiver) {
        const patientUser = await User.findOne({ email: caregiver.patientEmail });
        const patient: IPatient | null = await Patient.findOne({ user: patientUser!._id });
        hasAccess = patient?._id?.toString() === reminder.patientId.toString();
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Not authorized to update this reminder' });
    }

    const updatedReminder = await TaskReminder.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });

    res.json({ status: 'ok', data: updatedReminder });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error updating reminder', error });
  }
});

// Delete a task reminder
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const reminder = await TaskReminder.findById(req.params.id);
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let hasAccess = false;
    if (user.userType === 'patient') {
      const patient: IPatient | null = await Patient.findOne({ user: user._id });
      hasAccess = patient?._id?.toString() === reminder.patientId.toString();
    } else {
      const caregiver = await Caregiver.findOne({ user: user._id });
      if (caregiver) {
        const patientUser = await User.findOne({ email: caregiver.patientEmail });
        const patient: IPatient | null = await Patient.findOne({ user: patientUser!._id });
        hasAccess = patient?._id?.toString() === reminder.patientId.toString();
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Not authorized to delete this reminder' });
    }

    await TaskReminder.findByIdAndDelete(req.params.id);
    res.json({ status: 'ok', message: 'Reminder deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error deleting reminder', error });
  }
});

// Complete a task reminder
router.post('/:id/complete', authenticateJWT, async (req, res) => {
  try {
    const reminder = await TaskReminder.findById(req.params.id);
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const patient: IPatient | null = await Patient.findOne({ user: user._id });
    if (!patient || patient._id?.toString() !== reminder.patientId.toString()) {
      return res.status(403).json({ message: 'Not authorized to complete this reminder' });
    }

    const updatedReminder = await TaskReminder.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'completed',
        },
      },
      { new: true },
    );

    res.json({ status: 'ok', data: updatedReminder });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error completing reminder', error });
  }
});

export default router;
