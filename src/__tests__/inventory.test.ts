import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../index';
import Inventory from '../models/Inventory';
import { Patient } from '../models/Patient';
import { User } from '../models/User';
import { mockInventoryItem, mockPatient, mockUser } from './mocks/models';

jest.mock('jsonwebtoken');
jest.mock('../models/Inventory');

describe('Inventory Endpoints', () => {
  let patientToken: string;
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

  beforeEach(() => {
    jest.clearAllMocks();
    patientId = mockPatient._id;
    patientToken = 'mock-token';
    (jwt.verify as jest.Mock).mockReturnValue({ email: testUser.email });
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);
  });

  describe('GET /inventory', () => {
    it('should get all inventory items', async () => {
      (Inventory.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue([mockInventoryItem]),
      });

      const res = await request(app).get('/inventory').set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]).toEqual(mockInventoryItem.toObject());
    });

    it('should return 404 if user not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get('/inventory').set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });

    it('should return 404 if patient not found', async () => {
      (Patient.findOne as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get('/inventory').set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });
  });

  describe('PUT /inventory/:id', () => {
    it('should update an inventory item', async () => {
      const update = {
        quantity: 10,
      };

      (Inventory.findById as jest.Mock).mockResolvedValue(mockInventoryItem);
      (Inventory.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        ...mockInventoryItem,
        quantity: 10,
      });

      const res = await request(app)
        .put(`/inventory/${mockInventoryItem._id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send(update);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.data.quantity).toBe(10);
    });

    it('should set needsReplenishment when quantity is below threshold', async () => {
      const update = {
        quantity: 3,
      };

      const itemWithThreshold = {
        ...mockInventoryItem,
        lowStockThreshold: 5,
      };

      (Inventory.findById as jest.Mock).mockResolvedValue(itemWithThreshold);
      (Inventory.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        ...itemWithThreshold,
        quantity: 3,
        needsReplenishment: true,
      });

      const res = await request(app)
        .put(`/inventory/${mockInventoryItem._id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send(update);

      expect(res.status).toBe(200);
      expect(res.body.data.needsReplenishment).toBe(true);
    });

    it('should return 403 if user is not authorized to update item', async () => {
      const unauthorizedUser = {
        ...mockUser,
        _id: 'different-id',
      };

      (User.findOne as jest.Mock).mockResolvedValue(unauthorizedUser);
      (Inventory.findById as jest.Mock).mockResolvedValue(mockInventoryItem);

      const res = await request(app)
        .put(`/inventory/${mockInventoryItem._id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ quantity: 10 });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Not authorized to update this item');
    });
  });

  describe('DELETE /inventory/:id', () => {
    it('should delete an inventory item', async () => {
      (Inventory.findById as jest.Mock).mockResolvedValue(mockInventoryItem);
      (Inventory.findByIdAndDelete as jest.Mock).mockResolvedValue(mockInventoryItem);

      const res = await request(app)
        .delete(`/inventory/${mockInventoryItem._id}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(Inventory.findByIdAndDelete).toHaveBeenCalledWith(mockInventoryItem._id);
    });

    it('should return 404 if item not found', async () => {
      (Inventory.findById as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .delete(`/inventory/${mockInventoryItem._id}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Inventory item not found');
    });
  });

  describe('POST /inventory/:id/use', () => {
    it('should mark an item as used and update quantity', async () => {
      const itemToUse = {
        ...mockInventoryItem,
        quantity: 10,
        lowStockThreshold: 5,
      };

      (Inventory.findById as jest.Mock).mockResolvedValue(itemToUse);
      (Inventory.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        ...itemToUse,
        quantity: 9,
        lastUsed: expect.any(Date),
        needsReplenishment: false,
      });

      const res = await request(app)
        .post(`/inventory/${mockInventoryItem._id}/use`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ quantityUsed: 1 });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.data.quantity).toBe(9);
      expect(res.body.data.lastUsed).toBeDefined();
    });

    it('should set needsReplenishment when quantity goes below threshold', async () => {
      const itemToUse = {
        ...mockInventoryItem,
        quantity: 6,
        lowStockThreshold: 5,
      };

      (Inventory.findById as jest.Mock).mockResolvedValue(itemToUse);
      (Inventory.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        ...itemToUse,
        quantity: 4,
        lastUsed: expect.any(Date),
        needsReplenishment: true,
      });

      const res = await request(app)
        .post(`/inventory/${mockInventoryItem._id}/use`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ quantityUsed: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data.needsReplenishment).toBe(true);
    });

    it('should not allow negative quantity', async () => {
      const itemToUse = {
        ...mockInventoryItem,
        quantity: 2,
      };

      (Inventory.findById as jest.Mock).mockResolvedValue(itemToUse);
      (Inventory.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        ...itemToUse,
        quantity: 0,
        lastUsed: expect.any(Date),
      });

      const res = await request(app)
        .post(`/inventory/${mockInventoryItem._id}/use`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ quantityUsed: 3 });

      expect(res.status).toBe(200);
      expect(res.body.data.quantity).toBe(0);
    });
  });
});
