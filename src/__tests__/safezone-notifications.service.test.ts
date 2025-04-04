import { Patient } from '../models/Patient';
import { Safezone } from '../models/Safezone';
import { User } from '../models/User';
import SafezoneBreach from '../models/safezone-breach.model';
import { sendPushNotification } from '../services/notifications.service';
import { checkSafezoneViolations } from '../services/safezone-notifications.service';
import { mockPatient, mockUser } from './mocks/models';

jest.mock('../models/Patient');
jest.mock('../models/Safezone');
jest.mock('../models/User');
jest.mock('../models/safezone-breach.model');
jest.mock('../services/notifications.service');

describe('Safezone Notifications Service', () => {
  const testPatientUser = {
    ...mockUser,
    userType: 'patient',
    email: 'patient@example.com',
  };

  const testCaregiverUser = {
    ...mockUser,
    userType: 'caregiver',
    email: 'caregiver@example.com',
  };

  const testPatient = {
    ...mockPatient,
    user: testPatientUser._id,
    caregiverEmail: testCaregiverUser.email,
    locationSharing: {
      enabled: true,
      lastLocation: {
        latitude: 52.520008,
        longitude: 13.404954,
        timestamp: new Date(),
      },
    },
  };

  const testSafezone = {
    _id: 'mock-safezone-id',
    patientId: testPatient._id,
    location: {
      latitude: 52.520008,
      longitude: 13.404954,
    },
    radius: 100, // 100 meters
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkSafezoneViolations', () => {
    it('should send notification when patient is outside safezone', async () => {
      // Mock patient find
      (Patient.find as jest.Mock).mockResolvedValue([testPatient]);

      // Mock safezone find
      (Safezone.find as jest.Mock).mockResolvedValue([testSafezone]);

      // Mock safezone breach find
      (SafezoneBreach.findOne as jest.Mock).mockResolvedValue(null);

      // Mock user lookups
      (User.findById as jest.Mock).mockResolvedValue(testPatientUser);
      (User.findOne as jest.Mock).mockResolvedValue(testCaregiverUser);

      // Mock safezone breach create
      (SafezoneBreach.create as jest.Mock).mockResolvedValue({
        patientId: testPatient._id,
        safezoneId: testSafezone._id,
        location: testPatient.locationSharing.lastLocation,
        timestamp: new Date(),
      });

      // Set patient location outside safezone
      testPatient.locationSharing.lastLocation = {
        latitude: 52.530008, // 1km away
        longitude: 13.414954,
        timestamp: new Date(),
      };

      await checkSafezoneViolations();

      expect(Patient.find).toHaveBeenCalledWith({
        'locationSharing.enabled': true,
        'locationSharing.lastLocation': { $exists: true },
      });
      expect(Safezone.find).toHaveBeenCalledWith({ patientId: testPatient._id });
      expect(SafezoneBreach.findOne).toHaveBeenCalledWith({
        patientId: testPatient._id,
        dismissed: false,
      });
      expect(User.findById).toHaveBeenCalledWith(testPatientUser._id);
      expect(User.findOne).toHaveBeenCalledWith({ email: testCaregiverUser.email });
      expect(sendPushNotification).toHaveBeenCalledWith(
        testCaregiverUser.email,
        'Safezone Alert',
        expect.stringContaining('has left their safe zone'),
        expect.any(Object),
      );
      expect(SafezoneBreach.create).toHaveBeenCalled();
    });

    it('should not send notification if patient is inside safezone', async () => {
      // Mock patient find
      (Patient.find as jest.Mock).mockResolvedValue([testPatient]);

      // Mock safezone find
      (Safezone.find as jest.Mock).mockResolvedValue([testSafezone]);

      // Set patient location inside safezone
      testPatient.locationSharing.lastLocation = {
        latitude: 52.520008,
        longitude: 13.404954,
        timestamp: new Date(),
      };

      await checkSafezoneViolations();

      expect(Patient.find).toHaveBeenCalled();
      expect(Safezone.find).toHaveBeenCalled();
      expect(sendPushNotification).not.toHaveBeenCalled();
    });

    it('should not send notification if location sharing is disabled', async () => {
      const disabledPatient = {
        ...testPatient,
        locationSharing: {
          enabled: false,
          lastLocation: undefined,
        },
      };

      // Mock patient find
      (Patient.find as jest.Mock).mockResolvedValue([disabledPatient]);

      await checkSafezoneViolations();

      expect(Patient.find).toHaveBeenCalled();
      expect(Safezone.find).not.toHaveBeenCalled();
      expect(sendPushNotification).not.toHaveBeenCalled();
    });

    it('should not send notification if no safezones exist', async () => {
      // Mock patient find
      (Patient.find as jest.Mock).mockResolvedValue([testPatient]);

      // Mock safezone find
      (Safezone.find as jest.Mock).mockResolvedValue([]);

      await checkSafezoneViolations();

      expect(Patient.find).toHaveBeenCalled();
      expect(Safezone.find).toHaveBeenCalled();
      expect(sendPushNotification).not.toHaveBeenCalled();
    });

    it('should not send notification if there is an existing breach', async () => {
      // Mock patient find
      (Patient.find as jest.Mock).mockResolvedValue([testPatient]);

      // Mock safezone find
      (Safezone.find as jest.Mock).mockResolvedValue([testSafezone]);

      // Mock existing breach
      (SafezoneBreach.findOne as jest.Mock).mockResolvedValue({
        patientId: testPatient._id,
        dismissed: false,
      });

      // Set patient location outside safezone
      testPatient.locationSharing.lastLocation = {
        latitude: 52.530008,
        longitude: 13.414954,
        timestamp: new Date(),
      };

      await checkSafezoneViolations();

      expect(Patient.find).toHaveBeenCalled();
      expect(Safezone.find).toHaveBeenCalled();
      expect(SafezoneBreach.findOne).toHaveBeenCalled();
      expect(sendPushNotification).not.toHaveBeenCalled();
    });

    it('should handle missing patient user', async () => {
      // Mock patient find
      (Patient.find as jest.Mock).mockResolvedValue([testPatient]);

      // Mock safezone find
      (Safezone.find as jest.Mock).mockResolvedValue([testSafezone]);

      // Mock safezone breach find
      (SafezoneBreach.findOne as jest.Mock).mockResolvedValue(null);

      // Mock user lookups
      (User.findById as jest.Mock).mockResolvedValue(null);
      (User.findOne as jest.Mock).mockResolvedValue(testCaregiverUser);

      // Set patient location outside safezone
      testPatient.locationSharing.lastLocation = {
        latitude: 52.530008,
        longitude: 13.414954,
        timestamp: new Date(),
      };

      await checkSafezoneViolations();

      expect(Patient.find).toHaveBeenCalled();
      expect(Safezone.find).toHaveBeenCalled();
      expect(User.findById).toHaveBeenCalledWith(testPatientUser._id);
      expect(sendPushNotification).not.toHaveBeenCalled();
    });

    it('should handle missing caregiver user', async () => {
      // Mock patient find
      (Patient.find as jest.Mock).mockResolvedValue([testPatient]);

      // Mock safezone find
      (Safezone.find as jest.Mock).mockResolvedValue([testSafezone]);

      // Mock safezone breach find
      (SafezoneBreach.findOne as jest.Mock).mockResolvedValue(null);

      // Mock user lookups
      (User.findById as jest.Mock).mockResolvedValue(testPatientUser);
      (User.findOne as jest.Mock).mockResolvedValue(null);

      // Set patient location outside safezone
      testPatient.locationSharing.lastLocation = {
        latitude: 52.530008,
        longitude: 13.414954,
        timestamp: new Date(),
      };

      await checkSafezoneViolations();

      expect(Patient.find).toHaveBeenCalled();
      expect(Safezone.find).toHaveBeenCalled();
      expect(User.findById).toHaveBeenCalledWith(testPatientUser._id);
      expect(User.findOne).toHaveBeenCalledWith({ email: testCaregiverUser.email });
      expect(sendPushNotification).not.toHaveBeenCalled();
    });
  });
});
