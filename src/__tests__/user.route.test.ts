import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../index';
import { Caregiver } from '../models/Caregiver';
import { Patient } from '../models/Patient';
import { User } from '../models/User';
import SafezoneBreach from '../models/safezone-breach.model';
import { mockCaregiver, mockPatient, mockSafezoneBreach, mockUser } from './mocks/models';

jest.mock('jsonwebtoken');
jest.mock('../models/User');
jest.mock('../models/Patient');
jest.mock('../models/Caregiver');
jest.mock('../models/MedicationReminder');
jest.mock('../models/TaskReminder');
jest.mock('../models/Inventory');
jest.mock('../models/FallEvent');
jest.mock('../models/AttentionRequest');
jest.mock('../models/safezone-breach.model');

describe('User Routes', () => {
  const token = 'mock-token';
  const validObjectId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
    (jwt.verify as jest.Mock).mockImplementation((token, secret) => {
      if (token === 'mock-token' && secret === process.env.JWT_SECRET) {
        return { email: mockUser.email, _id: mockUser._id };
      }
      throw new Error('Invalid token');
    });
  });

  describe('GET /api/users/me', () => {
    it('should return patient user data', async () => {
      const userWithSave = {
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser),
      };
      (User.findOne as jest.Mock).mockResolvedValue(userWithSave);
      (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);

      const response = await request(app).get('/users/me').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.data).toHaveProperty('uniqueCode');
      expect(response.body.data).toHaveProperty('caregiverEmail');
    });

    it('should return caregiver user data', async () => {
      const caregiverUser = { ...mockUser, userType: 'caregiver' };
      const userWithSave = {
        ...caregiverUser,
        save: jest.fn().mockResolvedValue(caregiverUser),
      };
      (User.findOne as jest.Mock).mockResolvedValue(userWithSave);
      (Caregiver.findOne as jest.Mock).mockResolvedValue(mockCaregiver);

      const response = await request(app).get('/users/me').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.data).toHaveProperty('patientEmail');
    });

    it('should return 404 when user not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/users/me').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should return 404 when patient details not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Patient.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/users/me').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should return 404 when caregiver details not found', async () => {
      const caregiverUser = { ...mockUser, userType: 'caregiver' };
      (User.findOne as jest.Mock).mockResolvedValue(caregiverUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/users/me').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should handle server errors', async () => {
      (User.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/users/me').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('PUT /api/users/me', () => {
    const updateData = {
      firstName: 'Updated',
      lastName: 'Name',
      gender: 'female',
      birthday: '1995-01-01',
    };

    it('should update user details successfully', async () => {
      const userWithSave = {
        ...mockUser,
        userType: 'patient',
        save: jest.fn().mockResolvedValue(mockUser),
      };
      (User.findOne as jest.Mock).mockResolvedValue(userWithSave);

      const response = await request(app).put('/users/me').set('Authorization', `Bearer ${token}`).send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });

    it('should return 404 when user not found for update', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app).put('/users/me').set('Authorization', `Bearer ${token}`).send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should handle server errors during update', async () => {
      (User.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app).put('/users/me').set('Authorization', `Bearer ${token}`).send(updateData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /api/users/me/profile-image', () => {
    const imageData = {
      image: 'base64-encoded-image-data',
    };

    it('should update profile image successfully', async () => {
      const userWithSave = {
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser),
      };
      (User.findOne as jest.Mock).mockResolvedValue(userWithSave);

      const response = await request(app)
        .post('/users/me/profile-image')
        .set('Authorization', `Bearer ${token}`)
        .send(imageData);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.data.profileImage).toBe(imageData.image);
    });

    it('should return 400 when no image data provided', async () => {
      const response = await request(app)
        .post('/users/me/profile-image')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('No image data provided');
    });

    it('should return 404 when user not found for profile image update', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/users/me/profile-image')
        .set('Authorization', `Bearer ${token}`)
        .send(imageData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should handle server errors during profile image update', async () => {
      (User.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/users/me/profile-image')
        .set('Authorization', `Bearer ${token}`)
        .send(imageData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /api/users/dashboard', () => {
    it('should return 404 when user not found for dashboard', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/users/dashboard').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should return 404 when patient details not found for dashboard', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Patient.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/users/dashboard').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should return 404 when caregiver details not found for dashboard', async () => {
      const caregiverUser = { ...mockUser, userType: 'caregiver' };
      (User.findOne as jest.Mock).mockResolvedValue(caregiverUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/users/dashboard').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should handle server errors for dashboard', async () => {
      (User.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/users/dashboard').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    describe('POST /api/users/safezone-breach/:id/dismiss', () => {
      it('should return 404 when safezone breach not found', async () => {
        (SafezoneBreach.findById as jest.Mock).mockResolvedValue(null);

        const response = await request(app)
          .post(`/users/safezone-breach/${validObjectId}/dismiss`)
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Safezone breach not found');
      });

      it('should handle server errors when dismissing safezone breach', async () => {
        (SafezoneBreach.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .post(`/users/safezone-breach/${validObjectId}/dismiss`)
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(500);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Internal server error');
      });
    });

    describe('GET /api/users/safezone-breach/:id', () => {
      it('should get safezone breach details successfully for patient', async () => {
        const updatedBreach = {
          ...mockSafezoneBreach,
          _id: validObjectId,
          save: jest.fn().mockResolvedValue(mockSafezoneBreach),
          toObject: () => ({
            ...mockSafezoneBreach,
            _id: validObjectId,
            dismissedAt: expect.anything(),
            timestamp: expect.anything(),
          }),
        };
        (User.findOne as jest.Mock).mockResolvedValue(mockUser);
        (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);
        (SafezoneBreach.findById as jest.Mock).mockResolvedValue(updatedBreach);

        const response = await request(app)
          .get(`/users/safezone-breach/${validObjectId}`)
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
      });

      it('should get safezone breach details successfully for caregiver', async () => {
        const caregiverUser = { ...mockUser, userType: 'caregiver' };
        const mockBreach = {
          _id: validObjectId,
          patientId: mockPatient._id,
        };
        (User.findOne as jest.Mock).mockResolvedValue(caregiverUser);
        (Caregiver.findOne as jest.Mock).mockResolvedValue(mockCaregiver);
        (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);
        (SafezoneBreach.findById as jest.Mock).mockResolvedValue(mockBreach);

        const response = await request(app)
          .get(`/users/safezone-breach/${validObjectId}`)
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
        expect(response.body.data).toEqual(mockBreach);
      });

      it('should return 404 when safezone breach not found', async () => {
        (User.findOne as jest.Mock).mockResolvedValue(mockUser);
        (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);
        (SafezoneBreach.findById as jest.Mock).mockResolvedValue(null);

        const response = await request(app)
          .get(`/users/safezone-breach/${validObjectId}`)
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Safezone breach not found');
      });

      it('should return 403 when user is not authorized to view breach', async () => {
        const mockBreach = {
          _id: validObjectId,
          patientId: 'different-patient-id',
        };
        (User.findOne as jest.Mock).mockResolvedValue(mockUser);
        (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);
        (SafezoneBreach.findById as jest.Mock).mockResolvedValue(mockBreach);

        const response = await request(app)
          .get(`/users/safezone-breach/${validObjectId}`)
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(403);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Not authorized to view this breach');
      });

      it('should handle server errors when getting safezone breach', async () => {
        (User.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .get(`/users/safezone-breach/${validObjectId}`)
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(500);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Internal server error');
      });
    });
  });
});
