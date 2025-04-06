import TaskReminder from '../models/TaskReminder';
import { User } from '../models/User';
import { sendPushNotification } from './notifications.service';

// export async function checkOverdueTasks() {
//   try {
//     console.log('Fetching overdue tasks...');
//     const tasks = await TaskReminder.find({
//       status: 'pending',
//       'caregiverNotification.enabled': true,
//       caregiverNotified: false,
//     }).populate('patientId');
//     console.log(`Found ${tasks.length} overdue tasks.`);
//     const now = new Date();

//     for (const task of tasks) {
//       if (!task.caregiverNotification) continue;

//       const [hours, minutes] = task.reminderTime.split(':').map(Number);
//       const reminderDate = new Date(task.startDate);
//       reminderDate.setHours(hours, minutes, 0, 0);

//       const notificationTime = new Date(reminderDate);
//       notificationTime.setHours(notificationTime.getHours() + task.caregiverNotification.delayHours);

//       if (now >= notificationTime) {
//         const patient = task.patientId as any;
//         const patientUser = await User.findById(patient.user);
//         if (!patientUser) continue;

//         const caregiver = await User.findOne({ email: patient.caregiverEmail });
//         if (!caregiver) continue;

//         await sendPushNotification(
//           caregiver.email,
//           'Task Overdue Alert',
//           `${patientUser.firstName} ${patientUser.lastName} has not completed their task: ${task.taskName}`,
//           {
//             taskId: task._id,
//             taskName: task.taskName,
//             patientName: `${patientUser.firstName} ${patientUser.lastName}`,
//           },
//         );

//         task.caregiverNotified = true;
//         task.lastNotificationSent = now;
//         await task.save();
//       }
//     }
//   } catch (error) {
//     console.error('Error checking overdue tasks:', error);
//   }
// }


export async function checkOverdueTasks() {
  try {
    console.log('Fetching overdue tasks...');
    const tasks = await TaskReminder.find({
      status: 'pending',
    }).populate('patientId');
    console.log(`Found ${tasks.length} overdue tasks.`);
    const now = new Date();
    const localNow = new Date(now.getTime()); 
    localNow.setHours(localNow.getHours()+8); // Adjust to local time (HKT)
    console.log('Current time (local):', localNow);

    for (const task of tasks) {
      const [hours, minutes] = task.reminderTime.split(':').map(Number);
      
      // Create the notification time for today
      const notificationTime = new Date(localNow);
      notificationTime.setHours(hours, minutes, 0, 0); // Set the time to the task's reminder time
      notificationTime.setMilliseconds(0); // Ensure milliseconds are cleared
      notificationTime.setHours(notificationTime.getHours()-4);
      // const localNotificationTime = new Date(notificationTime.getTime() - notificationTime.getTimezoneOffset() * 60000);
      // localNotificationTime.setHours(localNotificationTime.getHours() -4); // Adjust to local time (HKT)
      const caregiverNotificationTime=notificationTime;//fix
      if (task.caregiverNotification) {
        caregiverNotificationTime.setHours(notificationTime.getHours() + task.caregiverNotification.delayHours);//fix
        console.log('Caregiver notification time:', caregiverNotificationTime);
      }

      console.log('Hour:', hours);
      console.log('Minute:', minutes);
      console.log('Notification time (local)-task:', notificationTime);//fix
      console.log('Current time (local)-task:', localNow);

      // Check if the notification should be sent
      if (localNow >= notificationTime || (task.caregiverNotification && localNow >= caregiverNotificationTime)) {//fix
        const patient = task.patientId as any;
        const patientUser = await User.findById(patient.user);
        if (!patientUser) continue;

        // Check if the patient has already been notified
        if (task.patientNotified) {
          console.log(`Patient already notified: ${patientUser.email}`);
          continue;
        }

        // Send notification to the patient
        console.log(`Sending notification to patient: ${patientUser.email}`);
        await sendPushNotification(
          patientUser.email,
          'Task Reminder',
          `You have an overdue task: ${task.taskName}`,
          {
            taskId: task._id,
            taskName: task.taskName,
          },
        );

        // Mark the patient as notified
        task.patientNotified = true;
        task.lastNotificationSent = localNow;
        await task.save();

        // Send notification to the caregiver (if caregiverNotification is enabled)
        if (task.caregiverNotification?.enabled && !task.caregiverNotified && localNow >= caregiverNotificationTime) {
          const caregiver = await User.findOne({ email: patient.caregiverEmail });
          if (caregiver) {
            console.log(`Sending notification to caregiver: ${caregiver.email}`);
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
          }
        }

        // Save the task after updating caregiverNotified
        await task.save();
      }
    }
  } catch (error) {
    console.error('Error checking overdue tasks:', error);
  }
}

