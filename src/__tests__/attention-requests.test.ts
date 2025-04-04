import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../index';
import { AttentionRequest } from '../models/AttentionRequest';
import { Patient } from '../models/Patient';
import { User } from '../models/User';
import { mockAttentionRequest, mockPatient, mockUser } from './mocks/models';

jest.mock('jsonwebtoken');
jest.mock('../models/AttentionRequest');
jest.mock('../models/Patient');
jest.mock('../models/User');

describe('Attention Requests Endpoints', () => {
  let patientToken: string;
  let patientId: string;
  let mockAttentionRequestInstance: any;

  const testUser = {
    ...mockUser,
    userType: 'patient',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    patientId = mockPatient._id;
    patientToken = 'mock-token';

    // Mock JWT verification with user type
    (jwt.verify as jest.Mock).mockReturnValue({
      email: testUser.email,
      userType: 'patient',
    });

    // Mock User and Patient lookups
    (User.findOne as jest.Mock).mockResolvedValue(testUser);
    (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);

    // Create a proper mock instance with all required methods
    mockAttentionRequestInstance = {
      ...mockAttentionRequest,
      save: jest.fn().mockResolvedValue(mockAttentionRequest),
      toObject: () => ({
        _id: mockAttentionRequest._id,
        patientId: mockAttentionRequest.patientId,
        timestamp: mockAttentionRequest.timestamp.toISOString(),
        location: mockAttentionRequest.location,
        type: mockAttentionRequest.type,
        status: mockAttentionRequest.status,
        resolvedAt: mockAttentionRequest.resolvedAt,
        resolvedBy: mockAttentionRequest.resolvedBy,
        caregiverNotified: mockAttentionRequest.caregiverNotified,
        caregiverNotifiedAt: mockAttentionRequest.caregiverNotifiedAt,
        dismissed: mockAttentionRequest.dismissed,
        createdAt: mockAttentionRequest.createdAt.toISOString(),
        updatedAt: mockAttentionRequest.updatedAt.toISOString(),
      }),
    };

    // Mock static methods
    (AttentionRequest as jest.MockedClass<typeof AttentionRequest>).find = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([mockAttentionRequestInstance]),
    });
    (AttentionRequest as jest.MockedClass<typeof AttentionRequest>).findById = jest
      .fn()
      .mockResolvedValue(mockAttentionRequestInstance);
    (AttentionRequest as jest.MockedClass<typeof AttentionRequest>).prototype.save = jest
      .fn()
      .mockResolvedValue(mockAttentionRequestInstance);
  });

  afterAll(async () => {
    // Clean up any open handles
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('should get all attention requests', async () => {
    const res = await request(app).get('/attention-requests').set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  it('should get a specific attention request', async () => {
    const res = await request(app)
      .get(`/attention-requests/${mockAttentionRequestInstance._id}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.data).toEqual(mockAttentionRequestInstance.toObject());
  });

  it('should update an attention request status', async () => {
    const update = { status: 'resolved' };
    const res = await request(app)
      .patch(`/attention-requests/${mockAttentionRequestInstance._id}/status`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send(update);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.data.status).toBe('resolved');
    expect(mockAttentionRequestInstance.save).toHaveBeenCalled();
  });

  it('should dismiss an attention request', async () => {
    const res = await request(app)
      .patch(`/attention-requests/${mockAttentionRequestInstance._id}/dismiss`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.data.dismissed).toBe(true);
    expect(mockAttentionRequestInstance.save).toHaveBeenCalled();
  });
});
