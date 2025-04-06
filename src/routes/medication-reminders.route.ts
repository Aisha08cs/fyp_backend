import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { Caregiver } from '../models/Caregiver';
import MedicationReminder from '../models/MedicationReminder';
import { IPatient, Patient } from '../models/Patient';
import { User } from '../models/User';

const router = Router();

// Create a new medication reminder
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let targetPatientId;
    if (user.userType === 'patient') {
      const patient = await Patient.findOne({ user: user._id });

      if (!patient) {
        return res.status(404).json({ message: 'Patient record not found' });
      }
      targetPatientId = patient._id;
    } else if (user.userType === 'caregiver') {
      const caregiver = await Caregiver.findOne({ user: user._id });

      if (!caregiver) {
        return res.status(404).json({ message: 'Caregiver record not found' });
      }

      const patientUser = await User.findOne({ email: caregiver.patientEmail });

      if (!patientUser) {
        return res.status(404).json({ message: 'Patient not found' });
      }

      const targetPatient = await Patient.findOne({ user: patientUser._id });

      if (!targetPatient) {
        return res.status(404).json({ message: 'Patient record not found' });
      }
      targetPatientId = targetPatient._id;
    } else {
      return res.status(403).json({ message: 'Only patients and caregivers can create reminders' });
    }

    const reminder = new MedicationReminder({
      ...req.body,
      patientId: targetPatientId,
    });
    //console.log('Creating reminder:', reminder); 
    await reminder.save();

    res.status(201).json({ status: 'ok', data: reminder });
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({ status: 'error', message: 'Error creating reminder', error });
  }
});

// Get all medication reminders
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

    const reminders = await MedicationReminder.find({ patientId: patient._id }, { photoVerification: 0 }).sort({
      createdAt: -1,
    });

    res.json({ status: 'ok', data: reminders });
  } catch (error) {
    console.error('Error in /medication-reminders:', error);
    res.status(500).json({ status: 'error', message: 'Error fetching reminders', error });
  }
});

// Get a specific medication reminder
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const reminder = await MedicationReminder.findById(req.params.id);
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

// Update a medication reminder
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const reminder = await MedicationReminder.findById(req.params.id);
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

    const updatedReminder = await MedicationReminder.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true },
    );

    res.json({ status: 'ok', data: updatedReminder });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error updating reminder', error });
  }
});

// Delete a medication reminder
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const reminder = await MedicationReminder.findById(req.params.id);
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

    await MedicationReminder.findByIdAndDelete(req.params.id);
    res.json({ status: 'ok', message: 'Reminder deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error deleting reminder', error });
  }
});

// Verify a medication reminder
router.post('/:id/verify', authenticateJWT, async (req, res) => {
  try {
    const { photoUrl } = req.body;
    const reminder = await MedicationReminder.findById(req.params.id);
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const patient: IPatient | null = await Patient.findOne({ user: user._id });
    if (!patient || patient._id?.toString() !== reminder.patientId.toString()) {
      return res.status(403).json({ message: 'Not authorized to verify this reminder' });
    }

    const base64Data = photoUrl.includes('base64,') ? photoUrl.split('base64,')[1] : photoUrl;

    const alibabaResponse = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ALIBABA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen2.5-vl-72b-instruct',
        messages: [
          {
            role: 'system',
            content: [{ type: 'text', text: 'You are a helpful assistant.' }],
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: photoUrl,
                },
              },
              {
                type: 'text',
                text: `Please analyze this image and tell me if it contains the medication name "${reminder.medicationName}", happy with 70% accuracy. Respond with only "true" or "false".`,
              },
            ],
          },
        ],
      }),
    });

    const alibabaData = await alibabaResponse.json();
    const text = alibabaData.choices?.[0]?.message?.content || 'false';
    const isVerified = text.toLowerCase() === 'true';

    if (!isVerified) {
      console.log('Failed to verify medication');
      return res.status(400).json({
        status: 'error',
        message:
          "We couldn't verify the medication in your photo. Please make sure the medication name is clearly visible and try taking another photo.",
      });
    }

    const updatedReminder = await MedicationReminder.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'taken',
          'photoVerification.photoUrl': photoUrl,
          'photoVerification.verifiedAt': new Date(),
        },
      },
      { new: true },
    );

    res.json({ status: 'ok', data: updatedReminder });
  } catch (error) {
    console.error('Error verifying reminder:', error);
    res.status(500).json({ status: 'error', message: 'Error verifying reminder', error });
  }
});

export default router;
