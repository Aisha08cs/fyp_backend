import { Expo } from 'expo-server-sdk';
import { Caregiver } from '../models/Caregiver';
import { User } from '../models/User';
import { Patient } from '../models/Patient';

const expo = new Expo();

export async function sendPushNotification(email: string, title: string, body: string, data?: any) {
  // try {
  //   console.log(`Sending push notification to ${caregiverEmail}...`);
  //   const caregiverUser = await User.findOne({ email: caregiverEmail });
  //   if (!caregiverUser) {
  //     console.log('No user found for caregiver email:', caregiverEmail);
  //     return;
  //   }

  //   const caregiver = await Caregiver.findOne({ user: caregiverUser._id });
  //   if (!caregiver || !caregiver.pushToken) {
  //     console.log('No push token found for caregiver:', caregiverEmail);
  //     return;
  //   }

  //   console.log(`Push token for ${caregiverEmail}: ${caregiver.pushToken}`);
  //   if (!Expo.isExpoPushToken(caregiver.pushToken)) {
  //     console.log(`Push token ${caregiver.pushToken} is not a valid Expo push token`);
  //     return;
  //   }

  //   const messages = [
  //     {
  //       to: caregiver.pushToken,
  //       sound: 'default',
  //       title,
  //       body,
  //       data: data || {},
  //     },
  //   ];

  //   const chunks = expo.chunkPushNotifications(messages);
  //   const tickets = [];

  //   for (const chunk of chunks) {
  //     try {
  //       const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
  //       tickets.push(...ticketChunk);
  //       console.log(`Sent ${chunk.length} notifications successfully.`);
  //     } catch (error) {
  //       console.error('Error sending push notification:', error);
  //     }
  //   }

  //   console.log('All notifications processed successfully:', title);
  //   return tickets;
  // } catch (error) {
  //   console.error('Error in sendPushNotification:', error);
  //   throw error;
  // }
  try {
    console.log(`Sending push notification to ${email}...`);

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log('No user found for email:', email);
      return;
    }

    let pushToken: string | undefined;

    // Check if the user is a caregiver
    if (user.userType === 'caregiver') {
      const caregiver = await Caregiver.findOne({ user: user._id });
      if (!caregiver || !caregiver.pushToken) {
        console.log('No push token found for caregiver:', email);
        return;
      }
      pushToken = caregiver.pushToken;
    }
    // Check if the user is a patient
    else if (user.userType === 'patient') {
      const patient = await Patient.findOne({ user: user._id });
      if (!patient || !patient.pushToken) {
        console.log('No push token found for patient:', email);
        return;
      }
      pushToken = patient.pushToken;
    } else {
      console.log('User is neither a caregiver nor a patient:', email);
      return;
    }

    console.log(`Push token for ${email}: ${pushToken}`);
    if (!Expo.isExpoPushToken(pushToken)) {
      console.log(`Push token ${pushToken} is not a valid Expo push token`);
      return;
    }

    const messages = [
      {
        to: pushToken,
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
