import TaskReminder from '../models/TaskReminder';
import { User } from '../models/User';
import { sendPushNotification } from '../services/notifications.service';
import { checkOverdueTasks } from '../services/task-notifications.service';

jest.mock('../models/User');
jest.mock('../models/TaskReminder');
jest.mock('../services/notifications.service');

describe('Task Notifications Service', () => {
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

  const mockTask = {
    _id: 'mock-task-id',
    taskName: 'Test Task',
    startDate: new Date(),
    reminderTime: '10:00',
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

  describe('checkOverdueTasks', () => {
    it('should send notification for overdue task', async () => {
      // Mock the Mongoose query chain
      const mockQuery = {
        populate: jest.fn().mockResolvedValue([mockTask]),
      };
      (TaskReminder.find as jest.Mock).mockReturnValue(mockQuery);
      (User.findById as jest.Mock).mockResolvedValue(testPatientUser);
      (User.findOne as jest.Mock).mockResolvedValue(testCaregiverUser);

      // Set current time to after the notification time
      const taskDate = new Date(mockTask.startDate);
      taskDate.setHours(10, 0, 0, 0); // Set to 10:00
      const notificationTime = new Date(taskDate);
      notificationTime.setHours(notificationTime.getHours() + mockTask.caregiverNotification.delayHours);
      jest.setSystemTime(notificationTime);

      await checkOverdueTasks();

      expect(TaskReminder.find).toHaveBeenCalledWith({
        status: 'pending',
        'caregiverNotification.enabled': true,
        caregiverNotified: false,
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('patientId');
      expect(User.findById).toHaveBeenCalledWith(testPatientUser._id);
      expect(User.findOne).toHaveBeenCalledWith({ email: testCaregiverUser.email });
      expect(sendPushNotification).toHaveBeenCalledWith(
        testCaregiverUser.email,
        'Task Overdue Alert',
        `${testPatientUser.firstName} ${testPatientUser.lastName} has not completed their task: ${mockTask.taskName}`,
        {
          taskId: mockTask._id,
          taskName: mockTask.taskName,
          patientName: `${testPatientUser.firstName} ${testPatientUser.lastName}`,
        },
      );
      expect(mockTask.save).toHaveBeenCalled();
    });

    it('should not send notification if caregiver notification is disabled', async () => {
      const disabledTask = {
        ...mockTask,
        caregiverNotification: {
          enabled: false,
        },
      };
      const mockQuery = {
        populate: jest.fn().mockResolvedValue([disabledTask]),
      };
      (TaskReminder.find as jest.Mock).mockReturnValue(mockQuery);

      await checkOverdueTasks();

      expect(TaskReminder.find).toHaveBeenCalledWith({
        status: 'pending',
        'caregiverNotification.enabled': true,
        caregiverNotified: false,
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('patientId');
      expect(sendPushNotification).not.toHaveBeenCalled();
    });

    it('should not send notification if caregiver is already notified', async () => {
      const notifiedTask = {
        ...mockTask,
        caregiverNotified: true,
      };
      const mockQuery = {
        populate: jest.fn().mockResolvedValue([]),
      };
      (TaskReminder.find as jest.Mock).mockReturnValue(mockQuery);

      await checkOverdueTasks();

      expect(TaskReminder.find).toHaveBeenCalledWith({
        status: 'pending',
        'caregiverNotification.enabled': true,
        caregiverNotified: false,
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('patientId');
      expect(sendPushNotification).not.toHaveBeenCalled();
    });

    it('should handle missing patient user', async () => {
      const mockQuery = {
        populate: jest.fn().mockResolvedValue([mockTask]),
      };
      (TaskReminder.find as jest.Mock).mockReturnValue(mockQuery);
      (User.findById as jest.Mock).mockResolvedValue(null);

      await checkOverdueTasks();

      expect(TaskReminder.find).toHaveBeenCalledWith({
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
        populate: jest.fn().mockResolvedValue([mockTask]),
      };
      (TaskReminder.find as jest.Mock).mockReturnValue(mockQuery);
      (User.findById as jest.Mock).mockResolvedValue(testPatientUser);
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await checkOverdueTasks();

      expect(TaskReminder.find).toHaveBeenCalledWith({
        status: 'pending',
        'caregiverNotification.enabled': true,
        caregiverNotified: false,
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('patientId');
      expect(User.findById).toHaveBeenCalledWith(testPatientUser._id);
      expect(User.findOne).toHaveBeenCalledWith({ email: testCaregiverUser.email });
      expect(sendPushNotification).not.toHaveBeenCalled();
    });

    it('should handle error when checking tasks', async () => {
      const mockQuery = {
        populate: jest.fn().mockRejectedValue(new Error('Test error')),
      };
      (TaskReminder.find as jest.Mock).mockReturnValue(mockQuery);

      await checkOverdueTasks();

      expect(TaskReminder.find).toHaveBeenCalledWith({
        status: 'pending',
        'caregiverNotification.enabled': true,
        caregiverNotified: false,
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('patientId');
      expect(sendPushNotification).not.toHaveBeenCalled();
    });
  });
});
