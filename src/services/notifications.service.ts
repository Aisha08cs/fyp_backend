import { Expo } from 'expo-server-sdk';
import { Caregiver } from '../models/Caregiver';
import { User } from '../models/User';

const expo = new Expo();

export async function sendPushNotification(caregiverEmail: string, title: string, body: string, data?: any) {
  try {
    // First find the caregiver's user
    const caregiverUser = await User.findOne({ email: caregiverEmail });
    if (!caregiverUser) {
      console.log('No user found for caregiver email:', caregiverEmail);
      return;
    }

    // Then find the caregiver by user ID
    const caregiver = await Caregiver.findOne({ user: caregiverUser._id });
    if (!caregiver || !caregiver.pushToken) {
      console.log('No push token found for caregiver:', caregiverEmail);
      return;
    }

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
        console.log('Sent the following notifications:', messages.map((m) => m.body).join(', '));
      } catch (error) {
        console.error('Error sending push notification:', error);
      }
    }

    return tickets;
  } catch (error) {
    console.error('Error in sendPushNotification:', error);
    throw error;
  }
}
