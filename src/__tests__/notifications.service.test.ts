import { Expo } from 'expo-server-sdk';
import { Caregiver } from '../models/Caregiver';
import { User } from '../models/User';
import { sendPushNotification } from '../services/notifications.service';

jest.mock('expo-server-sdk');
jest.mock('../models/User');
jest.mock('../models/Caregiver');

describe('Notifications Service', () => {
  const testCaregiverUser = {
    _id: 'mock-caregiver-id',
    email: 'caregiver@example.com',
  };

  const testCaregiver = {
    _id: 'mock-caregiver-id',
    user: testCaregiverUser._id,
    pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Expo.isExpoPushToken as unknown as jest.Mock).mockReturnValue(true);
    (Expo.prototype.chunkPushNotifications as jest.Mock).mockReturnValue([[]]);
    (Expo.prototype.sendPushNotificationsAsync as jest.Mock).mockResolvedValue([{ status: 'ok' }]);
  });

  describe('sendPushNotification', () => {
    it('should send push notification successfully', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(testCaregiverUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue(testCaregiver);

      const result = await sendPushNotification(testCaregiverUser.email, 'Test Title', 'Test Body', { test: 'data' });

      expect(result).toEqual([{ status: 'ok' }]);
      expect(User.findOne).toHaveBeenCalledWith({ email: testCaregiverUser.email });
      expect(Caregiver.findOne).toHaveBeenCalledWith({ user: testCaregiverUser._id });
      expect(Expo.prototype.chunkPushNotifications).toHaveBeenCalled();
      expect(Expo.prototype.sendPushNotificationsAsync).toHaveBeenCalled();
    });

    it('should handle missing user', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const result = await sendPushNotification(testCaregiverUser.email, 'Test Title', 'Test Body');

      expect(result).toBeUndefined();
      expect(User.findOne).toHaveBeenCalledWith({ email: testCaregiverUser.email });
    });

    it('should handle missing caregiver', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (Caregiver.findOne as jest.Mock).mockResolvedValue(null);

      const result = await sendPushNotification(testCaregiverUser.email, 'Test Title', 'Test Body');

      expect(result).toBeUndefined();
      expect(User.findOne).toHaveBeenCalledWith({ email: testCaregiverUser.email });
      expect(Caregiver.findOne).toHaveBeenCalledWith({ email: testCaregiverUser.email });
      expect(Expo.prototype.chunkPushNotifications).not.toHaveBeenCalled();
    });

    it('should handle missing push token', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(testCaregiverUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue({
        ...testCaregiver,
        pushToken: undefined,
      });

      const result = await sendPushNotification(testCaregiverUser.email, 'Test Title', 'Test Body');

      expect(result).toBeUndefined();
      expect(User.findOne).toHaveBeenCalledWith({ email: testCaregiverUser.email });
      expect(Caregiver.findOne).toHaveBeenCalledWith({ user: testCaregiverUser._id });
      expect(Expo.prototype.chunkPushNotifications).not.toHaveBeenCalled();
    });

    it('should handle invalid push token', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(testCaregiverUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue(testCaregiver);
      (Expo.isExpoPushToken as unknown as jest.Mock).mockReturnValue(false);

      const result = await sendPushNotification(testCaregiverUser.email, 'Test Title', 'Test Body');

      expect(result).toBeUndefined();
      expect(User.findOne).toHaveBeenCalledWith({ email: testCaregiverUser.email });
      expect(Caregiver.findOne).toHaveBeenCalledWith({ user: testCaregiverUser._id });
      expect(Expo.prototype.chunkPushNotifications).not.toHaveBeenCalled();
    });

    it('should handle error sending notifications', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(testCaregiverUser);
      (Caregiver.findOne as jest.Mock).mockResolvedValue(testCaregiver);
      (Expo.prototype.sendPushNotificationsAsync as jest.Mock).mockRejectedValue(new Error('Test error'));

      const result = await sendPushNotification(testCaregiverUser.email, 'Test Title', 'Test Body');

      expect(result).toEqual([]);
      expect(User.findOne).toHaveBeenCalledWith({ email: testCaregiverUser.email });
      expect(Caregiver.findOne).toHaveBeenCalledWith({ user: testCaregiverUser._id });
      expect(Expo.prototype.chunkPushNotifications).toHaveBeenCalled();
      expect(Expo.prototype.sendPushNotificationsAsync).toHaveBeenCalled();
    });
  });
});
