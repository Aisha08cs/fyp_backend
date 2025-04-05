import { Expo } from 'expo-server-sdk';
import { Caregiver } from '../models/Caregiver';
import { User } from '../models/User';

const expo = new Expo();

export async function sendPushNotification(caregiverEmail: string, title: string, body: string, data?: any) {
  try {
    console.log(`Sending push notification to ${caregiverEmail}...`);
    const caregiverUser = await User.findOne({ email: caregiverEmail });
    if (!caregiverUser) {
      console.log('No user found for caregiver email:', caregiverEmail);
      return;
    }

    const caregiver = await Caregiver.findOne({ user: caregiverUser._id });
    if (!caregiver || !caregiver.pushToken) {
      console.log('No push token found for caregiver:', caregiverEmail);
      return;
    }

    console.log(`Push token for ${caregiverEmail}: ${caregiver.pushToken}`);
    if (!Expo.isExpoPushToken(caregiver.pushToken)) {
      console.log(`Push token ${caregiver.pushToken} is not a valid Expo push token`);
      return;
    }

    const messages = [
      {
        to: caregiver.pushToken,
        sound: 'default',
        title,
        body,
        data: data || {},
      },
    ];

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        console.log(`Sent ${chunk.length} notifications successfully.`);
      } catch (error) {
        console.error('Error sending push notification:', error);
      }
    }

    console.log('All notifications processed successfully:', title);
    return tickets;
  } catch (error) {
    console.error('Error in sendPushNotification:', error);
    throw error;
  }
}
