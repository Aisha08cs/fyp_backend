import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../index';
import { Caregiver } from '../models/Caregiver';
import { FallEvent } from '../models/FallEvent';
import { Patient } from '../models/Patient';
import { User } from '../models/User';
import { mockFallEvent, mockPatient, mockUser } from './mocks/models';

jest.mock('jsonwebtoken');
jest.mock('../models/User');
jest.mock('../models/Patient');
jest.mock('../models/FallEvent');
jest.mock('../models/Caregiver');
jest.mock('../services/notifications.service');

describe('Fall Events Routes', () => {
  const mockPatientUser = { ...mockUser, userType: 'patient' };
  const mockCaregiverUser = { ...mockUser, userType: 'caregiver' };
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

  describe('POST /fall-events', () => {
    it('should return 403 if user is not a patient', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockCaregiverUser);

      const response = await request(app)
        .post('/fall-events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          location: { lat: 0, lng: 0 },
          timestamp: new Date(),
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Only patients can create fall events');
    });

    it('should return error if patient not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockPatientUser);
      (Patient.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/fall-events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          location: { lat: 0, lng: 0 },
          timestamp: new Date(),
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /fall-events', () => {
    it('should return 404 if user not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/fall-events').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 if patient not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockPatientUser);
      (Patient.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/fall-events').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /fall-events/:id', () => {
    it('should return a single fall event for authorized patient', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockPatientUser);
      (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);
      (FallEvent.findById as jest.Mock).mockResolvedValue(mockFallEvent);

      const response = await request(app)
        .get(`/fall-events/${mockFallEvent._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.data._id).toBe(mockFallEvent._id);
    });

    it('should return 404 if fall event not found', async () => {
      (FallEvent.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/fall-events/nonexistent-id').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it("should return 403 if patient tries to access another patient's event", async () => {
      const otherPatient = { ...mockPatient, _id: 'other-patient-id' };
      (User.findOne as jest.Mock).mockResolvedValue(mockPatientUser);
      (Patient.findOne as jest.Mock).mockResolvedValue(otherPatient);
      (FallEvent.findById as jest.Mock).mockResolvedValue(mockFallEvent);

      const response = await request(app)
        .get(`/fall-events/${mockFallEvent._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /fall-events/:id/status', () => {
    it('should update fall event status to confirmed', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockCaregiverUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue({ patientEmail: mockPatientUser.email });
      (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);
      (FallEvent.findById as jest.Mock).mockResolvedValue(mockFallEvent);
      (mockFallEvent.save as jest.Mock).mockResolvedValue({
        ...mockFallEvent,
        status: 'confirmed',
        confirmedAt: new Date(),
      });

      const response = await request(app)
        .patch(`/fall-events/${mockFallEvent._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'confirmed' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.data.status).toBe('confirmed');
    });

    it('should update fall event status to resolved', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockCaregiverUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue({ patientEmail: mockPatientUser.email });
      (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);
      (FallEvent.findById as jest.Mock).mockResolvedValue(mockFallEvent);
      (mockFallEvent.save as jest.Mock).mockResolvedValue({
        ...mockFallEvent,
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: 'caregiver',
      });

      const response = await request(app)
        .patch(`/fall-events/${mockFallEvent._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'resolved' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.data.status).toBe('resolved');
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .patch(`/fall-events/${mockFallEvent._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'invalid' });

      expect(response.status).toBe(400);
    });

    it('should return 403 if user not authorized to update event', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockCaregiverUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue({ patientEmail: 'other@example.com' });
      (Patient.findOne as jest.Mock).mockResolvedValue({ ...mockPatient, _id: 'other-patient-id' });
      (FallEvent.findById as jest.Mock).mockResolvedValue(mockFallEvent);

      const response = await request(app)
        .patch(`/fall-events/${mockFallEvent._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'confirmed' });

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /fall-events/:id/dismiss', () => {
    it('should dismiss a fall event', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockCaregiverUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue({ patientEmail: mockPatientUser.email });
      (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);
      (FallEvent.findById as jest.Mock).mockResolvedValue(mockFallEvent);
      (mockFallEvent.save as jest.Mock).mockResolvedValue({ ...mockFallEvent, dismissed: true });

      const response = await request(app)
        .patch(`/fall-events/${mockFallEvent._id}/dismiss`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.data.dismissed).toBe(true);
    });

    it('should return 404 if fall event not found', async () => {
      (FallEvent.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .patch('/fall-events/nonexistent-id/dismiss')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 if user not authorized to dismiss event', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockCaregiverUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue({ patientEmail: 'other@example.com' });
      (Patient.findOne as jest.Mock).mockResolvedValue({ ...mockPatient, _id: 'other-patient-id' });
      (FallEvent.findById as jest.Mock).mockResolvedValue(mockFallEvent);

      const response = await request(app)
        .patch(`/fall-events/${mockFallEvent._id}/dismiss`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });
});
