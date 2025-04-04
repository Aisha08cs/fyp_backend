import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../index';
import { Caregiver } from '../models/Caregiver';
import { Patient } from '../models/Patient';
import { Safezone } from '../models/Safezone';
import { User } from '../models/User';
import { mockCaregiver, mockPatient, mockUser } from './mocks/models';

jest.mock('jsonwebtoken');
jest.mock('../models/User');
jest.mock('../models/Patient');
jest.mock('../models/Caregiver');
jest.mock('../models/Safezone');

describe('Safezones Routes', () => {
  const mockSafezone = {
    _id: 'mockSafezoneId',
    patientId: 'mockPatientId',
    name: 'Home',
    radius: 100,
    location: {
      latitude: 0,
      longitude: 0,
    },
    save: jest.fn().mockResolvedValue(true),
    deleteOne: jest.fn().mockResolvedValue(true),
    toObject: () => ({
      _id: 'mockSafezoneId',
      patientId: 'mockPatientId',
      name: 'Home',
      radius: 100,
      location: {
        latitude: 0,
        longitude: 0,
      },
    }),
  };

  const token = 'mock-token';

  beforeEach(() => {
    jest.clearAllMocks();
    (jwt.verify as jest.Mock).mockImplementation((token, secret) => {
      if (token === 'mock-token' && secret === process.env.JWT_SECRET) {
        return { email: mockUser.email, _id: mockUser._id };
      }
      throw new Error('Invalid token');
    });
  });

  describe('POST /safezones', () => {
    it('should create a new safezone', async () => {
      const caregiverUser = { ...mockUser, userType: 'caregiver' };
      const patientUser = { ...mockUser, email: 'patient@example.com' };
      (User.findOne as jest.Mock).mockResolvedValueOnce(caregiverUser).mockResolvedValueOnce(patientUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue(mockCaregiver);
      (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);
      (Safezone as unknown as jest.Mock).mockImplementation(() => mockSafezone);

      const response = await request(app)
        .post('/safezones')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Home',
          radius: 100,
          location: {
            latitude: 0,
            longitude: 0,
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('ok');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data).toHaveProperty('name');
    });

    it('should return 403 if user is not a caregiver', async () => {
      const nonCaregiverUser = { ...mockUser, userType: 'patient' };
      (User.findOne as jest.Mock).mockResolvedValue(nonCaregiverUser);

      const response = await request(app)
        .post('/safezones')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Home',
          radius: 100,
          location: {
            latitude: 0,
            longitude: 0,
          },
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Only caregivers can create safezones');
    });

    it('should return error if caregiver not found', async () => {
      const caregiverUser = { ...mockUser, userType: 'caregiver' };
      (User.findOne as jest.Mock).mockResolvedValue(caregiverUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/safezones')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Home',
          radius: 100,
          location: {
            latitude: 0,
            longitude: 0,
          },
        });

      expect(response.status).toBe(403);
    });

    it('should return 404 if patient user not found', async () => {
      const caregiverUser = { ...mockUser, userType: 'caregiver' };
      (User.findOne as jest.Mock).mockResolvedValueOnce(caregiverUser).mockResolvedValueOnce(null);
      (Caregiver.findOne as jest.Mock).mockResolvedValue(mockCaregiver);

      const response = await request(app)
        .post('/safezones')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Home',
          radius: 100,
          location: {
            latitude: 0,
            longitude: 0,
          },
        });

      expect(response.status).toBe(404);
    });

    it('should return 404 if patient not found', async () => {
      const caregiverUser = { ...mockUser, userType: 'caregiver' };
      const patientUser = { ...mockUser, email: 'patient@example.com' };
      (User.findOne as jest.Mock).mockResolvedValueOnce(caregiverUser).mockResolvedValueOnce(patientUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue(mockCaregiver);
      (Patient.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/safezones')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Home',
          radius: 100,
          location: {
            latitude: 0,
            longitude: 0,
          },
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Patient user not found');
    });
  });

  describe('GET /safezones', () => {
    it('should get all safezones for a patient', async () => {
      const caregiverUser = { ...mockUser, userType: 'caregiver' };
      const patientUser = { ...mockUser, email: 'patient@example.com' };
      (User.findOne as jest.Mock).mockResolvedValueOnce(caregiverUser).mockResolvedValueOnce(patientUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue(mockCaregiver);
      (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);
      (Safezone.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue([mockSafezone]),
      });

      const response = await request(app).get('/safezones').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 404 if patient not found', async () => {
      const caregiverUser = { ...mockUser, userType: 'caregiver' };
      const patientUser = { ...mockUser, email: 'patient@example.com' };
      (User.findOne as jest.Mock).mockResolvedValueOnce(caregiverUser).mockResolvedValueOnce(patientUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue(mockCaregiver);
      (Patient.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/safezones').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Patient user not found');
    });
  });

  describe('GET /safezones/:id', () => {
    it('should get a single safezone by id', async () => {
      const caregiverUser = { ...mockUser, userType: 'caregiver' };
      (User.findOne as jest.Mock).mockResolvedValue(caregiverUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue(mockCaregiver);
      (Safezone.findById as jest.Mock).mockResolvedValue(mockSafezone);

      const response = await request(app).get(`/safezones/${mockSafezone._id}`).set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.data._id).toBe(mockSafezone._id);
    });

    it('should return 404 if safezone not found', async () => {
      const caregiverUser = { ...mockUser, userType: 'caregiver' };
      (User.findOne as jest.Mock).mockResolvedValue(caregiverUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue(mockCaregiver);
      (Safezone.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/safezones/nonexistent-id').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });

    it('should allow patient to access their own safezone', async () => {
      const patientUser = { ...mockUser, userType: 'patient' };
      (User.findOne as jest.Mock).mockResolvedValue(patientUser);
      (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);
      (Safezone.findById as jest.Mock).mockResolvedValue(mockSafezone);

      const response = await request(app).get(`/safezones/${mockSafezone._id}`).set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('PUT /safezones/:id', () => {
    it('should return 404 if safezone not found', async () => {
      const caregiverUser = { ...mockUser, userType: 'caregiver' };
      (User.findOne as jest.Mock).mockResolvedValue(caregiverUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue(mockCaregiver);
      (Safezone.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .put('/safezones/nonexistent-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
    });

    it('should return 403 if user is not authorized to update safezone', async () => {
      const unauthorizedUser = { ...mockUser, userType: 'patient' };
      (User.findOne as jest.Mock).mockResolvedValue(unauthorizedUser);
      (Patient.findOne as jest.Mock).mockResolvedValue({ ...mockPatient, _id: 'different-patient-id' });
      (Safezone.findById as jest.Mock).mockResolvedValue(mockSafezone);

      const response = await request(app)
        .put(`/safezones/${mockSafezone._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /safezones/:id', () => {
    it('should return 404 if safezone not found', async () => {
      const caregiverUser = { ...mockUser, userType: 'caregiver' };
      (User.findOne as jest.Mock).mockResolvedValue(caregiverUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue(mockCaregiver);
      (Safezone.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).delete('/safezones/nonexistent-id').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 if user is not authorized to delete safezone', async () => {
      const unauthorizedUser = { ...mockUser, userType: 'patient' };
      (User.findOne as jest.Mock).mockResolvedValue(unauthorizedUser);
      (Patient.findOne as jest.Mock).mockResolvedValue({ ...mockPatient, _id: 'different-patient-id' });
      (Safezone.findById as jest.Mock).mockResolvedValue(mockSafezone);

      const response = await request(app)
        .delete(`/safezones/${mockSafezone._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const caregiverUser = { ...mockUser, userType: 'caregiver' };
      (User.findOne as jest.Mock).mockResolvedValue(caregiverUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue(mockCaregiver);
      (Safezone.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app).get(`/safezones/${mockSafezone._id}`).set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
      expect(response.body.status).toBe('error');
    });

    it('should handle invalid token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app).get('/safezones').set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
    });
  });
});
