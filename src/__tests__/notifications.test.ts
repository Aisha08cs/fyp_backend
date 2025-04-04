import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../index';
import { Caregiver } from '../models/Caregiver';
import { User } from '../models/User';
import { mockCaregiver, mockUser } from './mocks/models';

jest.mock('jsonwebtoken');
jest.mock('../models/Caregiver');
jest.mock('../models/User');

describe('Notifications Endpoints', () => {
  let caregiverToken: string;

  const testCaregiverUser = {
    ...mockUser,
    userType: 'caregiver',
    email: 'caregiver@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    caregiverToken = 'mock-caregiver-token';

    // Mock JWT verification
    (jwt.verify as jest.Mock).mockImplementation((token) => {
      if (token === caregiverToken) {
        return {
          email: testCaregiverUser.email,
          userType: 'caregiver',
        };
      }
      return null;
    });

    // Mock User lookups
    (User.findOne as jest.Mock).mockImplementation((query) => {
      if (query.email === testCaregiverUser.email) {
        return Promise.resolve(testCaregiverUser);
      }
      return Promise.resolve(null);
    });

    // Mock Caregiver lookups and save
    (Caregiver.findOne as jest.Mock).mockResolvedValue({
      ...mockCaregiver,
      save: jest.fn().mockResolvedValue(mockCaregiver),
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  describe('POST /notifications/register', () => {
    it('should register push token for a caregiver', async () => {
      const res = await request(app)
        .post('/notifications/register')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({ token: 'test-push-token' });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Only caregivers can register push tokens');
    });

    it('should return 400 when token is missing', async () => {
      const res = await request(app)
        .post('/notifications/register')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Push token is required');
    });

    it('should return 403 when non-caregiver tries to register token', async () => {
      // Mock JWT verification for a patient
      (jwt.verify as jest.Mock).mockReturnValue({
        email: 'patient@example.com',
        userType: 'patient',
      });

      const res = await request(app)
        .post('/notifications/register')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({ token: 'test-push-token' });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Only caregivers can register push tokens');
    });

    it('should return 403 when caregiver is not found', async () => {
      (Caregiver.findOne as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/notifications/register')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({ token: 'test-push-token' });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Only caregivers can register push tokens');
    });

    it('should return 403 when user is not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/notifications/register')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({ token: 'test-push-token' });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Only caregivers can register push tokens');
    });
  });
});
