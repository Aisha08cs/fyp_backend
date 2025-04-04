import MedicationReminder from '../models/MedicationReminder';
import { User } from '../models/User';
import { sendPushNotification } from './notifications.service';

export async function checkOverdueMedications() {
  try {
    // Get all pending medications that have caregiver notifications enabled
    const medications = await MedicationReminder.find({
      status: 'pending',
      'caregiverNotification.enabled': true,
      caregiverNotified: false,
    }).populate('patientId');

    const now = new Date();

    for (const medication of medications) {
      // Skip if caregiverNotification is not defined
      if (!medication.caregiverNotification) continue;

      // Check each medication time for the day
      for (const medicationTime of medication.medicationTimes) {
        const [hours, minutes] = medicationTime.split(':').map(Number);
        const reminderDate = new Date(medication.startDate);
        reminderDate.setHours(hours, minutes, 0, 0);

        // Calculate the notification time (medication time + delay hours)
        const notificationTime = new Date(reminderDate);
        notificationTime.setHours(notificationTime.getHours() + medication.caregiverNotification.delayHours);

        // If it's past the notification time, send the notification
        if (now >= notificationTime) {
          // Get the patient's user information
          const patient = medication.patientId as any;
          const patientUser = await User.findById(patient.user);
          if (!patientUser) continue;

          // Get the caregiver using the patient's caregiverEmail
          const caregiver = await User.findOne({ email: patient.caregiverEmail });
          if (!caregiver) continue;

          // Send the notification
          await sendPushNotification(
            caregiver.email,
            'Medication Overdue Alert',
            `${patientUser.firstName} ${patientUser.lastName} has not taken their medication: ${medication.medicationName} (${medication.dosage})`,
            {
              medicationId: medication._id,
              medicationName: medication.medicationName,
              dosage: medication.dosage,
              patientName: `${patientUser.firstName} ${patientUser.lastName}`,
            },
          );

          // Update the medication
          medication.caregiverNotified = true;
          medication.lastNotificationSent = now;
          await medication.save();
          break; // Only send one notification per medication
        }
      }
    }
  } catch (error) {
    console.error('Error checking overdue medications:', error);
  }
}
