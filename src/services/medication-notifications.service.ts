import MedicationReminder from '../models/MedicationReminder';
import { User } from '../models/User';
import { sendPushNotification } from './notifications.service';

export async function checkOverdueMedications() {
  try {
    console.log('Fetching overdue medications...');
    const medications = await MedicationReminder.find({
      status: 'pending',
    }).populate('patientId');

    console.log(`Found ${medications.length} overdue medications.`);
    if (medications.length === 0) {
      console.log('No medications matched the query. Check query conditions or database records.');
    }
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000); // Convert UTC to local time
    console.log('Current time (local):', localNow);

    for (const medication of medications) {
      console.log('Processing medication:', medication);
      
      // Check each medication time for the day
      for (const medicationTime of medication.medicationTimes) {
        const [hours, minutes] = medicationTime.split(':').map(Number);

        // Create the notification time for today
        const notificationTime = new Date(); // Start with today's date
        notificationTime.setHours(hours, minutes, 0, 0); // Set the time to the medication time
        notificationTime.setMilliseconds(0); // Ensure milliseconds are cleared
        
        // Adjust notificationTime to the local time zone
        const localNotificationTime = new Date(notificationTime.getTime() - notificationTime.getTimezoneOffset() * 60000);
        localNotificationTime.setHours(localNotificationTime.getHours() -4);
        const caregiverNotificationTime=localNotificationTime;
        if (medication.caregiverNotification) {
          caregiverNotificationTime.setHours(localNotificationTime.getHours() + medication.caregiverNotification.delayHours);
          console.log('Caregiver notification time:', caregiverNotificationTime);
        }
        console.log('Hour:', hours);
        console.log('Minute:', minutes);
        console.log('Notification time (local)-med:',medication.medicationName, localNotificationTime);
        console.log('Current time (local)-med:', localNow);

        // If it's past the notification time, send the notification
        if (localNow >= localNotificationTime || (medication.caregiverNotification && localNow >= caregiverNotificationTime)) {
          // Get the patient's user information
          const patient = medication.patientId as any;
          const patientUser = await User.findById(patient.user);
          if (!patientUser) continue;

          // Check if the patient has already been notified
          if (medication.patientNotified) {
            console.log(`Patient already notified: ${patientUser.email}`);
            continue;
          }

          // Send notification to the patient
          console.log(`Sending notification to patient: ${patientUser.email}`);
          await sendPushNotification(
            patientUser.email,
            'Medication Reminder',
            `You have an overdue medication: ${medication.medicationName} (${medication.dosage})`,
            {
              medicationId: medication._id,
              medicationName: medication.medicationName,
              dosage: medication.dosage,
            },
          );

          // Mark the patient as notified
          medication.patientNotified = true;
          medication.lastNotificationSent = localNow;
          await medication.save();

                  // Send notification to the caregiver (if caregiverNotification is enabled)
                  if (medication.caregiverNotification?.enabled && !medication.caregiverNotified && localNow >= caregiverNotificationTime) {
                    const caregiver = await User.findOne({ email: patient.caregiverEmail });
                    if (caregiver) {
                      console.log(`Sending notification to caregiver: ${caregiver.email}`);
                      await sendPushNotification(
                        caregiver.email,
                        'Task Overdue Alert',
                        `${patientUser.firstName} ${patientUser.lastName} has not completed their task: ${medication.medicationName}`,
                        {
                          medicationId: medication._id,
                          medicationName: medication.medicationName,
                          patientName: `${patientUser.firstName} ${patientUser.lastName}`,
                        },
                      );
                      medication.caregiverNotified = true;
                    }
                  }
          
                  // Save the task after updating caregiverNotified
                  await medication.save();
        }
      }
    }
  } catch (error) {
    console.error('Error checking overdue medications:', error);
  }
}