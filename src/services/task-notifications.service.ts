import TaskReminder from '../models/TaskReminder';
import { User } from '../models/User';
import { sendPushNotification } from './notifications.service';

export async function checkOverdueTasks() {
  try {
    const tasks = await TaskReminder.find({
      status: 'pending',
      'caregiverNotification.enabled': true,
      caregiverNotified: false,
    }).populate('patientId');

    const now = new Date();

    for (const task of tasks) {
      if (!task.caregiverNotification) continue;

      const [hours, minutes] = task.reminderTime.split(':').map(Number);
      const reminderDate = new Date(task.startDate);
      reminderDate.setHours(hours, minutes, 0, 0);

      const notificationTime = new Date(reminderDate);
      notificationTime.setHours(notificationTime.getHours() + task.caregiverNotification.delayHours);

      if (now >= notificationTime) {
        const patient = task.patientId as any;
        const patientUser = await User.findById(patient.user);
        if (!patientUser) continue;

        const caregiver = await User.findOne({ email: patient.caregiverEmail });
        if (!caregiver) continue;

        await sendPushNotification(
          caregiver.email,
          'Task Overdue Alert',
          `${patientUser.firstName} ${patientUser.lastName} has not completed their task: ${task.taskName}`,
          {
            taskId: task._id,
            taskName: task.taskName,
            patientName: `${patientUser.firstName} ${patientUser.lastName}`,
          },
        );

        task.caregiverNotified = true;
        task.lastNotificationSent = now;
        await task.save();
      }
    }
  } catch (error) {
    console.error('Error checking overdue tasks:', error);
  }
}
