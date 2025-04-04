import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { Caregiver } from '../models/Caregiver';
import { User } from '../models/User';

const router = Router();

// Register push token for a caregiver
router.post('/register', authenticateJWT, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Push token is required' });
    }

    const user = await User.findOne({ email: req.user!.email });
    if (!user || user.userType !== 'caregiver') {
      return res.status(403).json({ message: 'Only caregivers can register push tokens' });
    }

    const caregiver = await Caregiver.findOne({ user: user._id });
    if (!caregiver) {
      return res.status(404).json({ message: 'Caregiver not found' });
    }

    caregiver.pushToken = token;
    await caregiver.save();

    res.json({ message: 'Push token registered successfully' });
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({ message: 'Error registering push token', error });
  }
});

export default router;
