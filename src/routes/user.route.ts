import { Router } from 'express';
import mongoose from 'mongoose';
import { authenticateJWT } from '../middleware/auth';
import { IAttentionRequest } from '../models/AttentionRequest';
import { Caregiver, ICaregiver } from '../models/Caregiver';
import { IFallEvent } from '../models/FallEvent';
import { IInventory } from '../models/Inventory';
import { IMedicationReminder } from '../models/MedicationReminder';
import { IPatient, Patient } from '../models/Patient';
import { Safezone } from '../models/Safezone';
import { ITaskReminder } from '../models/TaskReminder';
import { User } from '../models/User';
import SafezoneBreach from '../models/safezone-breach.model';

const router = Router();

router.get('/me', authenticateJWT, async (req, res) => {
  const { email } = req.user!;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user.toObject();
    const type = user.userType;
    let finalUser;

    if (type === 'patient') {
      finalUser = await Patient.findOne({ user: user._id });
      if (finalUser) {
        const { uniqueCode, caregiverEmail } = finalUser.toObject();
        return res.json({
          status: 'ok',
          data: { ...userWithoutPassword, uniqueCode, caregiverEmail },
        });
      }
    } else {
      finalUser = await Caregiver.findOne({ user: user._id });
      if (finalUser) {
        const { patientEmail } = finalUser.toObject();
        return res.json({
          status: 'ok',
          data: { ...userWithoutPassword, patientEmail },
        });
      }
    }

    res.status(404).json({ message: 'User details not found' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/me', authenticateJWT, async (req, res) => {
  const { email } = req.user!;
  const { firstName, lastName, gender, birthday } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user fields
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.gender = gender || user.gender;
    user.birthday = birthday || user.birthday;

    await user.save();

    const { password, ...userWithoutPassword } = user.toObject();
    const type = user.userType;
    let finalUser;

    if (type === 'patient') {
      finalUser = await Patient.findOne({ user: user._id });
      if (finalUser) {
        const { uniqueCode, caregiverEmail } = finalUser.toObject();

        console.log({ ...userWithoutPassword, uniqueCode, caregiverEmail });
        return res.json({
          status: 'ok',
          data: { ...userWithoutPassword, uniqueCode, caregiverEmail },
        });
      }
    } else {
      finalUser = await Caregiver.findOne({ user: user._id });
      if (finalUser) {
        const { patientEmail } = finalUser.toObject();
        return res.json({
          status: 'ok',
          data: { ...userWithoutPassword, patientEmail },
        });
      }
    }

    res.status(404).json({ message: 'User details not found' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/me/profile-image', authenticateJWT, async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ message: 'No image data provided' });
    }

    const { email } = req.user!;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user's profile image with the base64 string
    user.profileImage = image;
    await user.save();

    res.json({
      status: 'ok',
      data: {
        profileImage: image,
      },
    });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/dashboard', authenticateJWT, async (req, res) => {
  const { email } = req.user!;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user.toObject();
    const { profileImage, ...userWithoutProfileImage } = userWithoutPassword;
    const type = user.userType;
    let finalUser: IPatient | ICaregiver | null = null;
    let patientId: mongoose.Types.ObjectId | null = null;
    let isPatientLocationSharingEnabled = false;

    if (type === 'patient') {
      finalUser = await Patient.findOne({ user: user._id });
      if (!finalUser) {
        return res.status(404).json({ message: 'Patient details not found' });
      }
      patientId = finalUser._id as mongoose.Types.ObjectId;
      isPatientLocationSharingEnabled = (finalUser as IPatient).locationSharing?.enabled || false;
    } else {
      finalUser = await Caregiver.findOne({ user: user._id });
      if (!finalUser) {
        return res.status(404).json({ message: 'Caregiver details not found' });
      }
      const patient = await Patient.findOne({ caregiverEmail: (finalUser as ICaregiver).patientEmail });
      if (!patient) {
        const caregiver = await Caregiver.findOne({ patientEmail: (finalUser as ICaregiver).patientEmail });
        if (!caregiver) {
          return res.status(404).json({ message: 'Patient not found for caregiver' });
        }
        const patientUser = await User.findOne({ email: (finalUser as ICaregiver).patientEmail });
        if (!patientUser) {
          return res.status(404).json({ message: 'Patient user not found' });
        }
        const patientDoc = await Patient.findOne({ user: patientUser._id });
        if (!patientDoc) {
          return res.status(404).json({ message: 'Patient document not found' });
        }
        patientId = patientDoc._id as mongoose.Types.ObjectId;
        isPatientLocationSharingEnabled = (patientDoc as IPatient).locationSharing?.enabled || false;
      } else {
        patientId = patient._id as mongoose.Types.ObjectId;
        isPatientLocationSharingEnabled = (patient as IPatient).locationSharing?.enabled || false;
      }
    }

    const medicationPromise = (async () => {
      const result = await mongoose
        .model<IMedicationReminder>('MedicationReminder')
        .find(
          {
            patientId,
            status: 'pending',
          },
          { photoVerification: 0 },
        )
        .lean()
        .limit(50);
      return result;
    })();

    const taskPromise = (async () => {
      const result = await mongoose
        .model<ITaskReminder>('TaskReminder')
        .find({
          patientId,
          status: 'pending',
        })
        .lean()
        .limit(50);
      return result;
    })();

    const inventoryPromise = (async () => {
      const result = await mongoose.model<IInventory>('Inventory').find({ patientId }).lean().limit(50);
      return result;
    })();

    const fallEventsPromise =
      type === 'caregiver'
        ? (async () => {
            const result = await mongoose
              .model<IFallEvent>('FallEvent')
              .find({
                patientId,
                dismissed: false,
                status: { $ne: 'resolved' },
              })
              .lean()
              .limit(50);
            return result;
          })()
        : Promise.resolve([]);

    const attentionRequestsPromise =
      type === 'caregiver'
        ? (async () => {
            const result = await mongoose
              .model<IAttentionRequest>('AttentionRequest')
              .find({
                patientId,
                dismissed: false,
                status: { $ne: 'resolved' },
              })
              .lean()
              .limit(50);
            return result;
          })()
        : Promise.resolve([]);

    const locationPromise = (async () => {
      if (!isPatientLocationSharingEnabled) {
        return {
          locationSharing: {
            enabled: false,
            lastLocation: null,
          },
        };
      }
      const result =
        type === 'patient'
          ? await Patient.findOne({ user: user._id }).select('locationSharing').lean()
          : type === 'caregiver'
            ? await Patient.findOne({ caregiverEmail: email }).select('locationSharing').lean()
            : null;

      return result;
    })();

    const safezonesPromise = (async () => {
      const result = await Safezone.find({ patientId }).lean().limit(50);
      return result;
    })();

    const safezoneBreachesPromise = (async () => {
      const result = await SafezoneBreach.find({ patientId, dismissed: false }).lean().limit(50);
      return result;
    })();

    const [
      medicationRes,
      taskRes,
      inventoryRes,
      fallEventsRes,
      attentionRequestsRes,
      locationRes,
      safezonesRes,
      safezoneBreachesRes,
    ] = await Promise.all([
      medicationPromise,
      taskPromise,
      inventoryPromise,
      fallEventsPromise,
      attentionRequestsPromise,
      locationPromise,
      safezonesPromise,
      safezoneBreachesPromise,
    ]);

    const dashboardData = {
      user: {
        ...userWithoutProfileImage,
        ...(type === 'patient' && 'uniqueCode' in finalUser
          ? { uniqueCode: finalUser.uniqueCode, caregiverEmail: finalUser.caregiverEmail }
          : {}),
        ...(type === 'caregiver' && 'patientEmail' in finalUser ? { patientEmail: finalUser.patientEmail } : {}),
      },
      pendingMedications: medicationRes,
      pendingTasks: taskRes,
      inventoryItems: inventoryRes,
      fallEvents: type === 'caregiver' ? fallEventsRes : [],
      attentionRequests: type === 'caregiver' ? attentionRequestsRes : [],
      locationSharing: locationRes?.locationSharing || null,
      safezones: safezonesRes,
      safezoneBreaches: safezoneBreachesRes,
    };

    res.json({
      status: 'ok',
      data: dashboardData,
    });
  } catch (error) {
    console.error('Error in dashboard route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/safezone-breach/:id/dismiss', authenticateJWT, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'User not authenticated' });
    }

    const breach = await SafezoneBreach.findById(req.params.id);
    if (!breach) {
      return res.status(404).json({ status: 'error', message: 'Safezone breach not found' });
    }

    breach.dismissed = true;
    breach.dismissedAt = new Date();
    breach.dismissedBy = new mongoose.Types.ObjectId(req.user._id);
    await breach.save();

    res.json({ status: 'ok', message: 'Safezone breach dismissed' });
  } catch (error) {
    console.error('Error dismissing safezone breach:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Get a single safezone breach by ID
router.get('/safezone-breach/:id', authenticateJWT, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'User not authenticated' });
    }

    const breach = await SafezoneBreach.findById(req.params.id);
    if (!breach) {
      return res.status(404).json({ status: 'error', message: 'Safezone breach not found' });
    }

    // Check if the user is authorized to view this breach
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to view this breach' });
    }

    let patientId: mongoose.Types.ObjectId;
    if (user.userType === 'patient') {
      const patient = await Patient.findOne({ user: user._id });
      if (!patient) {
        return res.status(403).json({ status: 'error', message: 'Not authorized to view this breach' });
      }
      patientId = patient._id as mongoose.Types.ObjectId;
    } else {
      const caregiver = await Caregiver.findOne({ user: user._id });
      if (!caregiver) {
        return res.status(403).json({ status: 'error', message: 'Not authorized to view this breach' });
      }
      const patientUser = await User.findOne({ email: caregiver.patientEmail });
      if (!patientUser) {
        return res.status(403).json({ status: 'error', message: 'Not authorized to view this breach' });
      }
      const patient = await Patient.findOne({ user: patientUser._id });
      if (!patient) {
        return res.status(403).json({ status: 'error', message: 'Not authorized to view this breach' });
      }
      patientId = patient._id as mongoose.Types.ObjectId;
    }

    if (breach.patientId.toString() !== patientId.toString()) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to view this breach' });
    }

    res.json({
      status: 'ok',
      data: breach,
    });
  } catch (error) {
    console.error('Error fetching safezone breach:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
