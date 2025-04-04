import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../index';
import { Caregiver } from '../models/Caregiver';
import { Patient } from '../models/Patient';
import { User } from '../models/User';
import { mockUser } from './mocks/models';

jest.mock('jsonwebtoken');
jest.mock('../models/User');
jest.mock('../models/Patient');
jest.mock('../models/Caregiver');

describe('Patients Endpoints', () => {
  const testPatientUser = {
    ...mockUser,
    userType: 'patient',
    _id: 'mock-user-id',
    email: 'patient@example.com',
  };

  const testCaregiverUser = {
    ...mockUser,
    userType: 'caregiver',
    _id: 'mock-caregiver-id',
    email: 'caregiver@example.com',
  };

  const mockPatient = {
    _id: 'mock-patient-id',
    user: testPatientUser._id,
    locationSharing: {
      enabled: false,
    },
    save: jest.fn().mockResolvedValue(true),
  };

  const mockCaregiver = {
    _id: 'mock-caregiver-id',
    user: testCaregiverUser._id,
    patientEmail: testPatientUser.email,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock JWT verification
    (jwt.verify as jest.Mock).mockImplementation((token) => ({
      _id: testPatientUser._id,
      email: testPatientUser.email,
    }));
  });

  describe('GET /patients/me', () => {
    it('should return patient info', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(testPatientUser);
      (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);

      const res = await request(app).get('/patients/me').set('Authorization', 'Bearer mock-token');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.data).toEqual({
        _id: mockPatient._id,
        user: mockPatient.user,
        locationSharing: mockPatient.locationSharing,
      });
    });

    it('should return 404 when user is not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get('/patients/me').set('Authorization', 'Bearer mock-token');

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });

    it('should return 404 when caregiver is not found', async () => {
      (jwt.verify as jest.Mock).mockImplementation((token) => ({
        _id: testCaregiverUser._id,
        email: testCaregiverUser.email,
      }));
      (User.findOne as jest.Mock).mockResolvedValue(testCaregiverUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get('/patients/me').set('Authorization', 'Bearer mock-token');

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });

    it('should return 404 when patient is not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(testPatientUser);
      (Patient.findOne as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get('/patients/me').set('Authorization', 'Bearer mock-token');

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });
  });

  describe('POST /patients/location-sharing', () => {
    it('should enable location sharing', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(testPatientUser);
      (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);

      const res = await request(app)
        .post('/patients/location-sharing')
        .set('Authorization', 'Bearer mock-token')
        .send({ enabled: true });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(mockPatient.save).toHaveBeenCalled();
    });

    it('should disable location sharing', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(testPatientUser);
      (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);

      const res = await request(app)
        .post('/patients/location-sharing')
        .set('Authorization', 'Bearer mock-token')
        .send({ enabled: false });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(mockPatient.save).toHaveBeenCalled();
    });

    it('should return 404 when non-patient tries to update location sharing', async () => {
      (jwt.verify as jest.Mock).mockImplementation((token) => ({
        _id: testCaregiverUser._id,
        email: testCaregiverUser.email,
      }));
      (User.findOne as jest.Mock).mockResolvedValue(testCaregiverUser);
      (Patient.findOne as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/patients/location-sharing')
        .set('Authorization', 'Bearer mock-token')
        .send({ enabled: true });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });
  });

  describe('POST /patients/location', () => {
    it('should update patient location when sharing is enabled', async () => {
      const patientWithSharing = {
        ...mockPatient,
        locationSharing: {
          enabled: true,
        },
      };
      (User.findOne as jest.Mock).mockResolvedValue(testPatientUser);
      (Patient.findOne as jest.Mock).mockResolvedValue(patientWithSharing);

      const res = await request(app)
        .post('/patients/location')
        .set('Authorization', 'Bearer mock-token')
        .send({ latitude: 123, longitude: 456 });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(patientWithSharing.save).toHaveBeenCalled();
    });

    it('should return 403 when location sharing is disabled', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(testPatientUser);
      (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);

      const res = await request(app)
        .post('/patients/location')
        .set('Authorization', 'Bearer mock-token')
        .send({ latitude: 123, longitude: 456 });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Location sharing is not enabled');
    });

    it('should return 404 when non-patient tries to update location', async () => {
      (jwt.verify as jest.Mock).mockImplementation((token) => ({
        _id: testCaregiverUser._id,
        email: testCaregiverUser.email,
      }));
      (User.findOne as jest.Mock).mockResolvedValue(testCaregiverUser);
      (Patient.findOne as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/patients/location')
        .set('Authorization', 'Bearer mock-token')
        .send({ latitude: 123, longitude: 456 });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });
  });
});
