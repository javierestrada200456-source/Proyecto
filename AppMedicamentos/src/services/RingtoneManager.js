import { NativeModules, Platform } from 'react-native';

const { RingtoneModule } = NativeModules;

/**
 * Obtiene los tonos de notificación del sistema Android.
 * Retorna array de { id, label, uri }
 */
export async function getSystemNotificationTones() {
  if (Platform.OS !== 'android' || !RingtoneModule) return [];
  try {
    return await RingtoneModule.getNotificationRingtones();
  } catch (_) {
    return [];
  }
}

/**
 * Obtiene los tonos de alarma del sistema Android.
 * Retorna array de { id, label, uri }
 */
export async function getSystemAlarmTones() {
  if (Platform.OS !== 'android' || !RingtoneModule) return [];
  try {
    return await RingtoneModule.getAlarmRingtones();
  } catch (_) {
    return [];
  }
}
