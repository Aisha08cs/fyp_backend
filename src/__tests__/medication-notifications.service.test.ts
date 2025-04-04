import MedicationReminder from '../models/MedicationReminder';
import { User } from '../models/User';
import { checkOverdueMedications } from '../services/medication-notifications.service';
import { sendPushNotification } from '../services/notifications.service';

jest.mock('../models/MedicationReminder');
jest.mock('../models/User');
jest.mock('../services/notifications.service');

describe('Medication Notifications Service', () => {
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

  const mockMedication = {
    _id: 'mock-medication-id',
    medicationName: 'Test Medication',
    dosage: '1 tablet',
    startDate: new Date(),
    medicationTimes: ['10:00'],
    status: 'pending',
    caregiverNotification: {
      enabled: true,
      delayHours: 1,
    },
    caregiverNotified: false,
    patientId: {
      user: testPatientUser._id,
      caregiverEmail: testCaregiverUser.email,
    },
    save: jest.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('checkOverdueMedications', () => {
    it('should send notification for overdue medication', async () => {
      // Mock the Mongoose query chain
      const mockQuery = {
        populate: jest.fn().mockResolvedValue([mockMedication]),
      };
      (MedicationReminder.find as jest.Mock).mockReturnValue(mockQuery);
      (User.findById as jest.Mock).mockResolvedValue(testPatientUser);
      (User.findOne as jest.Mock).mockResolvedValue(testCaregiverUser);

      // Set current time to after the notification time
      const medicationDate = new Date(mockMedication.startDate);
      medicationDate.setHours(10, 0, 0, 0); // Set to 10:00
      const notificationTime = new Date(medicationDate);
      notificationTime.setHours(notificationTime.getHours() + mockMedication.caregiverNotification.delayHours);
      jest.setSystemTime(notificationTime);

      await checkOverdueMedications();

      expect(MedicationReminder.find).toHaveBeenCalledWith({
        status: 'pending',
        'caregiverNotification.enabled': true,
        caregiverNotified: false,
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('patientId');
      expect(User.findById).toHaveBeenCalledWith(testPatientUser._id);
      expect(User.findOne).toHaveBeenCalledWith({ email: testCaregiverUser.email });
      expect(sendPushNotification).toHaveBeenCalledWith(
        testCaregiverUser.email,
        'Medication Overdue Alert',
        `${testPatientUser.firstName} ${testPatientUser.lastName} has not taken their medication: ${mockMedication.medicationName} (${mockMedication.dosage})`,
        {
          medicationId: mockMedication._id,
          medicationName: mockMedication.medicationName,
          dosage: mockMedication.dosage,
          patientName: `${testPatientUser.firstName} ${testPatientUser.lastName}`,
        },
      );
      expect(mockMedication.save).toHaveBeenCalled();
    });

    it('should not send notification if caregiver notification is disabled', async () => {
      const disabledMedication = {
        ...mockMedication,
        caregiverNotification: {
          enabled: false,
        },
      };
      const mockQuery = {
        populate: jest.fn().mockResolvedValue([disabledMedication]),
      };
      (MedicationReminder.find as jest.Mock).mockReturnValue(mockQuery);

      await checkOverdueMedications();

      expect(MedicationReminder.find).toHaveBeenCalledWith({
        status: 'pending',
        'caregiverNotification.enabled': true,
        caregiverNotified: false,
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('patientId');
      expect(sendPushNotification).not.toHaveBeenCalled();
    });

    it('should not send notification if caregiver is already notified', async () => {
      const notifiedMedication = {
        ...mockMedication,
        caregiverNotified: true,
      };
      const mockQuery = {
        populate: jest.fn().mockResolvedValue([]),
      };
      (MedicationReminder.find as jest.Mock).mockReturnValue(mockQuery);

      await checkOverdueMedications();

      expect(MedicationReminder.find).toHaveBeenCalledWith({
        status: 'pending',
        'caregiverNotification.enabled': true,
        caregiverNotified: false,
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('patientId');
      expect(sendPushNotification).not.toHaveBeenCalled();
    });

    it('should handle missing patient user', async () => {
      const mockQuery = {
        populate: jest.fn().mockResolvedValue([mockMedication]),
      };
      (MedicationReminder.find as jest.Mock).mockReturnValue(mockQuery);
      (User.findById as jest.Mock).mockResolvedValue(null);

      await checkOverdueMedications();

      expect(MedicationReminder.find).toHaveBeenCalledWith({
        status: 'pending',
        'caregiverNotification.enabled': true,
        caregiverNotified: false,
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('patientId');
      expect(User.findById).toHaveBeenCalledWith(testPatientUser._id);
      expect(sendPushNotification).not.toHaveBeenCalled();
    });

    it('should handle missing caregiver user', async () => {
      const mockQuery = {
        populate: jest.fn().mockResolvedValue([mockMedication]),
      };
      (MedicationReminder.find as jest.Mock).mockReturnValue(mockQuery);
      (User.findById as jest.Mock).mockResolvedValue(testPatientUser);
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await checkOverdueMedications();

      expect(MedicationReminder.find).toHaveBeenCalledWith({
        status: 'pending',
        'caregiverNotification.enabled': true,
        caregiverNotified: false,
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('patientId');
      expect(User.findById).toHaveBeenCalledWith(testPatientUser._id);
      expect(User.findOne).toHaveBeenCalledWith({ email: testCaregiverUser.email });
      expect(sendPushNotification).not.toHaveBeenCalled();
    });

    it('should handle error when checking medications', async () => {
      const mockQuery = {
        populate: jest.fn().mockRejectedValue(new Error('Test error')),
      };
      (MedicationReminder.find as jest.Mock).mockReturnValue(mockQuery);

      await checkOverdueMedications();

      expect(MedicationReminder.find).toHaveBeenCalledWith({
        status: 'pending',
        'caregiverNotification.enabled': true,
        caregiverNotified: false,
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('patientId');
      expect(sendPushNotification).not.toHaveBeenCalled();
    });
  });
});
