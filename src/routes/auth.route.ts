import bcrypt from 'bcryptjs';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { Caregiver } from '../models/Caregiver';
import { Patient } from '../models/Patient';
import { User } from '../models/User';

const router = Router();

router.post('/register', async (req, res) => {
  const { userType, firstName, lastName, gender, birthday, email, password } = req.body;

  try {
    const oldUser = await User.findOne({ email });

    if (oldUser) {
      return res.status(409).json({ status: 'error', message: 'User Already Exists!' });
    }

    const encryptedPassword = await bcrypt.hash(password, 10);

    await User.create({
      userType,
      firstName,
      lastName,
      gender,
      birthday,
      email,
      password: encryptedPassword,
    });

    res.json({ status: 'ok', data: 'User Created' });
  } catch (error) {
    res.status(500).json({ status: 'error', data: error });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(409).json({ status: 'error', data: "User doesn't exist!" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (isValidPassword) {
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET!);
      return res.status(201).json({
        status: 'ok',
        data: token,
        userType: user.userType,
      });
    }

    return res.status(401).json({ status: 'error', data: 'Incorrect Credentials' });
  } catch (error) {
    res.status(500).json({ status: 'error', data: error });
  }
});

router.post('/registerCaregiver', async (req, res) => {
  const { firstName, lastName, gender, birthday, email, password, userType, uniqueCode } = req.body;

  try {
    const oldUser = await User.findOne({ email });

    if (oldUser) {
      return res.status(409).json({ status: 'error', message: 'User Already Exists!' });
    }

    const patient = await Patient.findOne({ uniqueCode }).populate('user');

    if (!patient) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid unique code. Please check and try again.',
      });
    }

    const patientUser = patient.user as any;
    if (!patientUser || !patientUser.email) {
      return res.status(400).json({
        status: 'error',
        message: 'Patient user information not found.',
      });
    }

    const encryptedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      userType,
      firstName,
      lastName,
      gender,
      birthday,
      email,
      password: encryptedPassword,
    });

    await Caregiver.create({
      user: newUser._id,
      patientEmail: patientUser.email,
    });

    const result = await Patient.findOneAndUpdate({ _id: patient._id }, { caregiverEmail: email }, { new: true });

    if (!result) {
      return res.status(400).json({
        status: 'error',
        message: 'Patient could not be updated with caregiver email',
      });
    }

    res.status(200).json({ status: 'ok', message: 'Caregiver User Created' });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating the caregiver user.',
    });
  }
});

router.post('/registerPatient', async (req, res) => {
  const { firstName, lastName, gender, birthday, email, password, userType } = req.body;

  try {
    let uniqueCode = generateUniqueCode();
    while (await Patient.findOne({ uniqueCode })) {
      uniqueCode = generateUniqueCode();
    }

    const encryptedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      userType,
      firstName,
      lastName,
      gender,
      birthday,
      email,
      password: encryptedPassword,
    });

    await Patient.create({
      user: newUser._id,
      uniqueCode,
    });

    res.status(200).json({ status: 'ok', message: 'Patient User Created', uniqueCode });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating the patient user.',
    });
  }
});

function generateUniqueCode(): number {
  return Math.floor(1000 + Math.random() * 9000);
}

export default router;
