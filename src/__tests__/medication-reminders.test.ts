import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../index';
import { Caregiver } from '../models/Caregiver';
import MedicationReminder from '../models/MedicationReminder';
import { Patient } from '../models/Patient';
import { User } from '../models/User';
import { mockCaregiver, mockMedicationReminder, mockPatient, mockUser } from './mocks/models';

jest.mock('jsonwebtoken');
jest.mock('../models/MedicationReminder');
jest.mock('../models/User');
jest.mock('../models/Patient');
jest.mock('../models/Caregiver');
jest.mock('node-fetch');

describe('Medication Reminders Endpoints', () => {
  let patientToken: string;
  let caregiverToken: string;
  let patientId: string;

  const testUser = {
    userType: 'patient',
    firstName: 'Test',
    lastName: 'User',
    gender: 'male',
    birthday: '1990-01-01',
    email: 'test@example.com',
    password: 'password123',
  };

  const testCaregiver = {
    userType: 'caregiver',
    firstName: 'Caregiver',
    lastName: 'User',
    email: 'caregiver@example.com',
    password: 'password123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    patientId = mockPatient._id;
    patientToken = 'mock-patient-token';
    caregiverToken = 'mock-caregiver-token';
    (jwt.verify as jest.Mock).mockReturnValue({ email: testUser.email });
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);
  });

  it('should get all medication reminders', async () => {
    (MedicationReminder.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockResolvedValue([mockMedicationReminder]),
    });

    const res = await request(app).get('/medication-reminders').set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]).toEqual(mockMedicationReminder.toObject());
  });

  it('should update a medication reminder', async () => {
    const update = {
      dosage: '2 tablets',
    };

    (MedicationReminder.findById as jest.Mock).mockResolvedValue(mockMedicationReminder);
    (MedicationReminder.findByIdAndUpdate as jest.Mock).mockResolvedValue({
      ...mockMedicationReminder,
      dosage: '2 tablets',
    });

    const res = await request(app)
      .put(`/medication-reminders/${mockMedicationReminder._id}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send(update);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.data.dosage).toBe('2 tablets');
  });

  it('should delete a medication reminder', async () => {
    (MedicationReminder.findById as jest.Mock).mockResolvedValue(mockMedicationReminder);
    (MedicationReminder.findByIdAndDelete as jest.Mock).mockResolvedValue(mockMedicationReminder);

    const res = await request(app)
      .delete(`/medication-reminders/${mockMedicationReminder._id}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(MedicationReminder.findByIdAndDelete).toHaveBeenCalledWith(mockMedicationReminder._id);
  });

  describe('POST /medication-reminders', () => {
    const newReminder = {
      medicationName: 'Test Medication',
      dosage: '1 tablet',
      frequency: 'daily',
      time: '09:00',
    };

    it('should return 404 when user not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/medication-reminders')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(newReminder);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });

    it('should return 403 for non-patient/caregiver users', async () => {
      const adminUser = { ...testUser, userType: 'admin' };
      (User.findOne as jest.Mock).mockResolvedValue(adminUser);

      const res = await request(app)
        .post('/medication-reminders')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(newReminder);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Only patients and caregivers can create reminders');
    });
  });

  describe('POST /medication-reminders/:id/verify', () => {
    const photoUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...';

    it('should verify a medication reminder with photo', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'true' } }],
      };
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const verifiedReminder = {
        ...mockMedicationReminder,
        status: 'taken',
        photoVerification: {
          photoUrl,
          verifiedAt: new Date(),
        },
      };

      (MedicationReminder.findById as jest.Mock).mockResolvedValue(mockMedicationReminder);
      (MedicationReminder.findByIdAndUpdate as jest.Mock).mockResolvedValue(verifiedReminder);

      const res = await request(app)
        .post(`/medication-reminders/${mockMedicationReminder._id}/verify`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ photoUrl });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.data.status).toBe('taken');
      expect(res.body.data.photoVerification.photoUrl).toBe(photoUrl);
    });

    it('should return 400 when medication verification fails', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'false' } }],
      };
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      (MedicationReminder.findById as jest.Mock).mockResolvedValue(mockMedicationReminder);

      const res = await request(app)
        .post(`/medication-reminders/${mockMedicationReminder._id}/verify`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ photoUrl });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain("We couldn't verify the medication");
    });

    it('should return 404 when non-patient tries to verify', async () => {
      const caregiverUser = { ...testUser, userType: 'caregiver' };
      (jwt.verify as jest.Mock).mockReturnValue({ email: caregiverUser.email });
      (User.findOne as jest.Mock).mockResolvedValue(caregiverUser);
      (Patient.findOne as jest.Mock).mockResolvedValue(null);

      (MedicationReminder.findById as jest.Mock).mockResolvedValue(mockMedicationReminder);

      const res = await request(app)
        .post(`/medication-reminders/${mockMedicationReminder._id}/verify`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({ photoUrl });

      expect(res.status).toBe(404);
    });
  });

  describe('Access Control Tests', () => {
    it('should deny access to reminders of other patients', async () => {
      const otherPatientId = 'other-patient-id';
      const otherReminder = { ...mockMedicationReminder, patientId: otherPatientId };
      (MedicationReminder.findById as jest.Mock).mockResolvedValue(otherReminder);

      const res = await request(app)
        .get(`/medication-reminders/${otherReminder._id}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Not authorized to view this reminder');
    });

    it("should allow caregivers to access their patient's reminders", async () => {
      const caregiverUser = { ...testUser, userType: 'caregiver' };
      (jwt.verify as jest.Mock).mockReturnValue({ email: caregiverUser.email });
      (User.findOne as jest.Mock).mockResolvedValue(caregiverUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue(mockCaregiver);
      (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);

      (MedicationReminder.findById as jest.Mock).mockResolvedValue(mockMedicationReminder);

      const res = await request(app)
        .get(`/medication-reminders/${mockMedicationReminder._id}`)
        .set('Authorization', `Bearer ${caregiverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
