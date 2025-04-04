import Inventory from '../models/Inventory';
import { User } from '../models/User';
import { sendPushNotification } from './notifications.service';

export async function checkLowInventory() {
  try {
    // Get all inventory items that need replenishment and haven't notified caregiver yet
    const items = await Inventory.find({
      needsReplenishment: true,
      caregiverNotified: false,
    }).populate('patientId');

    for (const item of items) {
      // Get the patient's user information
      const patient = item.patientId as any;
      const patientUser = await User.findById(patient.user);
      if (!patientUser) continue;

      // Get the caregiver using the patient's caregiverEmail
      const caregiver = await User.findOne({ email: patient.caregiverEmail });
      if (!caregiver) continue;

      // Send the notification
      await sendPushNotification(
        caregiver.email,
        'Low Inventory Alert',
        `${patientUser.firstName} ${patientUser.lastName} is running low on ${item.itemName}. Current quantity: ${item.quantity} ${item.unit}`,
        {
          itemId: item._id,
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          patientName: `${patientUser.firstName} ${patientUser.lastName}`,
        },
      );

      // Mark the item as notified
      await Inventory.findByIdAndUpdate(item._id, { caregiverNotified: true });
    }
  } catch (error) {
    console.error('Error checking low inventory:', error);
  }
}
