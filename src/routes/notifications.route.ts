import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { Caregiver } from '../models/Caregiver';
import { User } from '../models/User';
import { Patient } from '../models/Patient';

const router = Router();

// // Register push token for a caregiver
// router.post('/register', authenticateJWT, async (req, res) => {
//   try {
//     const { token } = req.body;
//     if (!token) {
//       return res.status(400).json({ message: 'Push token is required' });
//     }

//     const user = await User.findOne({ email: req.user!.email });
//     if (!user || user.userType !== 'caregiver') {
//       return res.status(403).json({ message: 'Only caregivers can register push tokens' });
//     }

//     const caregiver = await Caregiver.findOne({ user: user._id });
//     if (!caregiver) {
//       return res.status(404).json({ message: 'Caregiver not found' });
//     }

//     caregiver.pushToken = token;
//     await caregiver.save();

//     res.json({ message: 'Push token registered successfully' });
//   } catch (error) {
//     console.error('Error registering push token:', error);
//     res.status(500).json({ message: 'Error registering push token', error });
//   }
// });
// Register push token for a user (caregiver or patient)
router.post('/register', authenticateJWT, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Push token is required' });
    }

    // Find the user making the request
    const user = await User.findOne({ email: req.user!.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the token is already associated with another user
    const existingCaregiver = await Caregiver.findOne({ pushToken: token });
    const existingPatient = await Patient.findOne({ pushToken: token });

    if (existingCaregiver) {
      console.log(`Push token already associated with caregiver: ${existingCaregiver.user}`);
      existingCaregiver.pushToken = undefined; // Remove the token from the previous caregiver
      await existingCaregiver.save();
    }

    if (existingPatient) {
      console.log(`Push token already associated with patient: ${existingPatient.user}`);
      existingPatient.pushToken = undefined; // Remove the token from the previous patient
      await existingPatient.save();
    }

    // Associate the token with the current user
    if (user.userType === 'caregiver') {
      const caregiver = await Caregiver.findOne({ user: user._id });
      if (!caregiver) {
        return res.status(404).json({ message: 'Caregiver not found' });
      }

      caregiver.pushToken = token;
      await caregiver.save();
      return res.json({ message: 'Push token registered successfully for caregiver' });
    } else if (user.userType === 'patient') {
      const patient = await Patient.findOne({ user: user._id });
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }

      patient.pushToken = token;
      await patient.save();
      return res.json({ message: 'Push token registered successfully for patient' });
    } else {
      return res.status(403).json({ message: 'Only caregivers and patients can register push tokens' });
    }
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({ message: 'Error registering push token', error });
  }
});

export default router;
