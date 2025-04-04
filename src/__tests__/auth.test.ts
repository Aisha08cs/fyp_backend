import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../index';
import { Patient } from '../models/Patient';
import { User } from '../models/User';
import { mockUser } from './mocks/models';

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../models/User');
jest.mock('../models/Patient');
jest.mock('../models/Caregiver');

describe('Authentication Endpoints', () => {
  const testUser = {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'password123',
    userType: 'patient',
    gender: 'male',
    birthday: '1990-01-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (jwt.sign as jest.Mock).mockReturnValue('mock-token');
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app).post('/auth/register').send(testUser);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.data).toBe('User Created');
      expect(bcrypt.hash).toHaveBeenCalledWith(testUser.password, 10);
    });

    it('should return 409 if user already exists', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app).post('/auth/register').send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('User Already Exists!');
    });

    it('should handle server errors during registration', async () => {
      (User.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      const res = await request(app).post('/auth/register').send(testUser);

      expect(res.status).toBe(500);
      expect(res.body.status).toBe('error');
      expect(res.body.data).toBeDefined();
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully', async () => {
      const mockFoundUser = {
        ...mockUser,
        password: 'hashed-password',
      };
      (User.findOne as jest.Mock).mockResolvedValue(mockFoundUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const res = await request(app).post('/auth/login').send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('ok');
      expect(res.body.data).toBe('mock-token');
    });

    it('should return 401 for invalid credentials', async () => {
      const mockFoundUser = {
        ...mockUser,
        password: 'hashed-password',
      };
      (User.findOne as jest.Mock).mockResolvedValue(mockFoundUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const res = await request(app).post('/auth/login').send({ email: testUser.email, password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body.data).toBe('Incorrect Credentials');
    });

    it('should return 409 if user does not exist', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' });

      expect(res.status).toBe(409);
      expect(res.body.status).toBe('error');
      expect(res.body.data).toBe("User doesn't exist!");
    });

    it('should handle server errors during login', async () => {
      (User.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      const res = await request(app).post('/auth/login').send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(500);
      expect(res.body.status).toBe('error');
      expect(res.body.data).toBeDefined();
    });
  });

  describe('POST /auth/registerCaregiver', () => {
    const caregiverData = {
      firstName: 'Caregiver',
      lastName: 'Test',
      email: 'caregiver@example.com',
      password: 'password123',
      userType: 'caregiver',
      gender: 'female',
      birthday: '1990-01-01',
      uniqueCode: '1234',
    };

    it('should return 409 if caregiver email already exists', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app).post('/auth/registerCaregiver').send(caregiverData);

      expect(res.status).toBe(409);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('User Already Exists!');
    });

    it('should handle server errors during caregiver registration', async () => {
      (User.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      const res = await request(app).post('/auth/registerCaregiver').send(caregiverData);

      expect(res.status).toBe(500);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('An error occurred while creating the caregiver user.');
    });
  });

  describe('POST /auth/registerPatient', () => {
    const patientData = {
      firstName: 'Patient',
      lastName: 'Test',
      email: 'patient@example.com',
      password: 'password123',
      userType: 'patient',
      gender: 'male',
      birthday: '1990-01-01',
    };

    it('should register a new patient successfully', async () => {
      (User.create as jest.Mock).mockResolvedValue(mockUser);
      (Patient.findOne as jest.Mock).mockResolvedValue(null);
      (Patient.create as jest.Mock).mockResolvedValue({ _id: 'patient-id', uniqueCode: '1234' });

      const res = await request(app).post('/auth/registerPatient').send(patientData);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.message).toBe('Patient User Created');
      expect(res.body.uniqueCode).toBeDefined();
    });

    it('should handle server errors during patient registration', async () => {
      (User.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const res = await request(app).post('/auth/registerPatient').send(patientData);

      expect(res.status).toBe(500);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('An error occurred while creating the patient user.');
    });
  });

  afterAll(async () => {
    // Clean up any open handles
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('should get user profile', async () => {
    // Mock JWT verification
    (jwt.verify as jest.Mock).mockReturnValue({ email: testUser.email });

    // Mock User.findOne to return a proper user object
    const mockFoundUser = {
      ...mockUser,
      toObject: () => ({
        ...mockUser,
        password: undefined,
      }),
    };
    (User.findOne as jest.Mock).mockResolvedValue(mockFoundUser);

    const res = await request(app).get('/users/me').set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.data).toEqual({
      _id: mockUser._id,
      userType: testUser.userType,
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      gender: testUser.gender,
      birthday: testUser.birthday,
      email: testUser.email,
    });
  });
});
