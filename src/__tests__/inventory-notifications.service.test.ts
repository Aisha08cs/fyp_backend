import Inventory from '../models/Inventory';
import { User } from '../models/User';
import { checkLowInventory } from '../services/inventory-notifications.service';
import { sendPushNotification } from '../services/notifications.service';

jest.mock('../models/Inventory');
jest.mock('../models/User');
jest.mock('../services/notifications.service');

describe('Inventory Notifications Service', () => {
  const testPatientUser = {
    _id: 'mock-user-id',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
  };

  const testCaregiverUser = {
    _id: 'mock-caregiver-id',
    email: 'caregiver@example.com',
  };

  const mockInventoryItem = {
    _id: 'mock-item-id',
    itemName: 'Test Item',
    quantity: 5,
    unit: 'pills',
    needsReplenishment: true,
    caregiverNotified: false,
    patientId: {
      user: testPatientUser._id,
      caregiverEmail: testCaregiverUser.email,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkLowInventory', () => {
    it('should send notification for low inventory item', async () => {
      // Mock the Mongoose query chain
      const mockQuery = {
        populate: jest.fn().mockResolvedValue([mockInventoryItem]),
      };
      (Inventory.find as jest.Mock).mockReturnValue(mockQuery);
      (User.findById as jest.Mock).mockResolvedValue(testPatientUser);
      (User.findOne as jest.Mock).mockResolvedValue(testCaregiverUser);
      (Inventory.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockInventoryItem);

      await checkLowInventory();

      expect(Inventory.find).toHaveBeenCalledWith({
        needsReplenishment: true,
        caregiverNotified: false,
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('patientId');
      expect(User.findById).toHaveBeenCalledWith(testPatientUser._id);
      expect(User.findOne).toHaveBeenCalledWith({ email: testCaregiverUser.email });
      expect(sendPushNotification).toHaveBeenCalledWith(
        testCaregiverUser.email,
        'Low Inventory Alert',
        `${testPatientUser.firstName} ${testPatientUser.lastName} is running low on ${mockInventoryItem.itemName}. Current quantity: ${mockInventoryItem.quantity} ${mockInventoryItem.unit}`,
        {
          itemId: mockInventoryItem._id,
          itemName: mockInventoryItem.itemName,
          quantity: mockInventoryItem.quantity,
          unit: mockInventoryItem.unit,
          patientName: `${testPatientUser.firstName} ${testPatientUser.lastName}`,
        },
      );
      expect(Inventory.findByIdAndUpdate).toHaveBeenCalledWith(mockInventoryItem._id, { caregiverNotified: true });
    });

    it('should not send notification if item is already notified', async () => {
      const notifiedItem = {
        ...mockInventoryItem,
        caregiverNotified: true,
      };
      const mockQuery = {
        populate: jest.fn().mockResolvedValue([]),
      };
      (Inventory.find as jest.Mock).mockReturnValue(mockQuery);

      await checkLowInventory();

      expect(Inventory.find).toHaveBeenCalledWith({
        needsReplenishment: true,
        caregiverNotified: false,
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('patientId');
      expect(sendPushNotification).not.toHaveBeenCalled();
    });

    it('should handle missing patient user', async () => {
      const mockQuery = {
        populate: jest.fn().mockResolvedValue([mockInventoryItem]),
      };
      (Inventory.find as jest.Mock).mockReturnValue(mockQuery);
      (User.findById as jest.Mock).mockResolvedValue(null);

      await checkLowInventory();

      expect(Inventory.find).toHaveBeenCalledWith({
        needsReplenishment: true,
        caregiverNotified: false,
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('patientId');
      expect(User.findById).toHaveBeenCalledWith(testPatientUser._id);
      expect(sendPushNotification).not.toHaveBeenCalled();
    });

    it('should handle missing caregiver user', async () => {
      const mockQuery = {
        populate: jest.fn().mockResolvedValue([mockInventoryItem]),
      };
      (Inventory.find as jest.Mock).mockReturnValue(mockQuery);
      (User.findById as jest.Mock).mockResolvedValue(testPatientUser);
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await checkLowInventory();

      expect(Inventory.find).toHaveBeenCalledWith({
        needsReplenishment: true,
        caregiverNotified: false,
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('patientId');
      expect(User.findById).toHaveBeenCalledWith(testPatientUser._id);
      expect(User.findOne).toHaveBeenCalledWith({ email: testCaregiverUser.email });
      expect(sendPushNotification).not.toHaveBeenCalled();
    });

    it('should handle error when checking inventory', async () => {
      const mockQuery = {
        populate: jest.fn().mockRejectedValue(new Error('Test error')),
      };
      (Inventory.find as jest.Mock).mockReturnValue(mockQuery);

      await checkLowInventory();

      expect(Inventory.find).toHaveBeenCalledWith({
        needsReplenishment: true,
        caregiverNotified: false,
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('patientId');
      expect(sendPushNotification).not.toHaveBeenCalled();
    });
  });
});
