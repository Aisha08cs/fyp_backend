import { Patient } from '../models/Patient';
import { Safezone } from '../models/Safezone';
import { User } from '../models/User';
import SafezoneBreach from '../models/safezone-breach.model';
import { sendPushNotification } from './notifications.service';

// Calculate distance between two points using the Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

function isLocationSignificantlyDifferent(
  loc1: { latitude: number; longitude: number },
  loc2: { latitude: number; longitude: number },
  threshold: number,
): boolean {
  const distance = calculateDistance(loc1.latitude, loc1.longitude, loc2.latitude, loc2.longitude);
  return distance > threshold;
}

export async function checkSafezoneViolations() {
  try {
    const patients = await Patient.find({
      'locationSharing.enabled': true,
      'locationSharing.lastLocation': { $exists: true },
    });

    for (const patient of patients) {
      if (!patient.locationSharing?.enabled || !patient.locationSharing?.lastLocation) {
        continue;
      }

      const safezones = await Safezone.find({ patientId: patient._id });

      if (safezones.length === 0) {
        continue;
      }

      const isOutsideAllSafezones = safezones.every((safezone) => {
        const lastLocation = patient.locationSharing!.lastLocation!;
        const distance = calculateDistance(
          lastLocation.latitude,
          lastLocation.longitude,
          safezone.location.latitude,
          safezone.location.longitude,
        );
        return distance > safezone.radius;
      });

      if (isOutsideAllSafezones) {
        // Check for any existing non-dismissed breaches
        const existingBreach = await SafezoneBreach.findOne({
          patientId: patient._id,
          dismissed: false,
        });

        // Only create a new breach and send notification if there are no active breaches
        if (!existingBreach) {
          // Create a new safezone breach
          await SafezoneBreach.create({
            patientId: patient._id,
            safezoneId: safezones[0]._id,
            location: patient.locationSharing!.lastLocation!,
            timestamp: new Date(),
          });

          // Get the patient's user information
          const patientUser = await User.findById(patient.user);
          if (!patientUser) continue;

          // Get the caregiver using the patient's caregiverEmail
          const caregiver = await User.findOne({ email: patient.caregiverEmail });
          if (!caregiver) continue;

          // Send the notification
          await sendPushNotification(
            caregiver.email,
            'Safezone Alert',
            `${patientUser.firstName} ${patientUser.lastName} has left their safe zone`,
            {
              patientName: `${patientUser.firstName} ${patientUser.lastName}`,
              location: patient.locationSharing!.lastLocation!,
              timestamp: patient.locationSharing!.lastLocation!.timestamp,
            },
          );
        }
      }
    }
  } catch (error) {
    console.error('Error checking safezone violations:', error);
  }
}
