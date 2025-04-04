import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../index';
import { Patient } from '../models/Patient';
import TaskReminder from '../models/TaskReminder';
import { User } from '../models/User';
import { mockPatient, mockTaskReminder, mockUser } from './mocks/models';

jest.mock('jsonwebtoken');
jest.mock('../models/TaskReminder');
jest.mock('../models/Caregiver');

describe('Task Reminders Endpoints', () => {
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

  const testCaregiverUser = {
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

    // Mock TaskReminder static methods
    (TaskReminder.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockResolvedValue([mockTaskReminder]),
    });
    (TaskReminder.findById as jest.Mock).mockResolvedValue(mockTaskReminder);
    (TaskReminder.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockTaskReminder);
    (TaskReminder.findByIdAndDelete as jest.Mock).mockResolvedValue(mockTaskReminder);
  });

  it('should get all task reminders', async () => {
    const res = await request(app).get('/task-reminders').set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  it('should update a task reminder', async () => {
    const update = {
      completed: true,
    };

    const updatedReminder = {
      ...mockTaskReminder,
      completed: true,
    };
    (TaskReminder.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedReminder);

    const res = await request(app)
      .put(`/task-reminders/${mockTaskReminder._id}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send(update);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.data.completed).toBe(true);
  });

  it('should delete a task reminder', async () => {
    const res = await request(app)
      .delete(`/task-reminders/${mockTaskReminder._id}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(TaskReminder.findByIdAndDelete).toHaveBeenCalledWith(mockTaskReminder._id);
  });

  describe('Get Specific Task Reminder', () => {
    it('should get a specific task reminder', async () => {
      (TaskReminder.findById as jest.Mock).mockResolvedValue(mockTaskReminder);

      const res = await request(app)
        .get(`/task-reminders/${mockTaskReminder._id}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.data._id).toBe(mockTaskReminder._id);
    });

    it('should return 404 when reminder not found', async () => {
      (TaskReminder.findById as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/task-reminders/non-existent-id')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Reminder not found');
    });

    it("should return 403 when user tries to access another patient's reminder", async () => {
      const otherPatientReminder = { ...mockTaskReminder, patientId: 'other-patient-id' };
      (TaskReminder.findById as jest.Mock).mockResolvedValue(otherPatientReminder);

      const res = await request(app)
        .get(`/task-reminders/${otherPatientReminder._id}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Not authorized to view this reminder');
    });
  });

  describe('Complete Task Reminder', () => {
    it('should complete a task reminder', async () => {
      (TaskReminder.findById as jest.Mock).mockResolvedValue(mockTaskReminder);
      (TaskReminder.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        ...mockTaskReminder,
        status: 'completed',
      });

      const res = await request(app)
        .post(`/task-reminders/${mockTaskReminder._id}/complete`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.data.status).toBe('completed');
    });

    it('should return 403 when non-patient tries to complete reminder', async () => {
      const caregiverUser = { ...testCaregiverUser, _id: 'caregiver-user-id' };
      (jwt.verify as jest.Mock).mockReturnValue({ email: caregiverUser.email });
      (User.findOne as jest.Mock).mockResolvedValue(caregiverUser);
      (TaskReminder.findById as jest.Mock).mockResolvedValue(mockTaskReminder);

      const res = await request(app)
        .post(`/task-reminders/${mockTaskReminder._id}/complete`)
        .set('Authorization', `Bearer ${caregiverToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Not authorized to complete this reminder');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      (TaskReminder.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockRejectedValue(error),
      });

      const res = await request(app).get('/task-reminders').set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(500);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('Error fetching reminders');
    });

    it('should handle invalid reminder ID format', async () => {
      (TaskReminder.findById as jest.Mock).mockRejectedValue(new Error('Invalid ID format'));

      const res = await request(app).get('/task-reminders/invalid-id').set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(500);
      expect(res.body.status).toBe('error');
    });
  });
});
