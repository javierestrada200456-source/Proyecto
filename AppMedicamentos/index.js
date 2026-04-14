// Punto de entrada raíz — debe estar fuera de cualquier componente React.
// Registra el handler de Notifee para background/killed app ANTES de que React monte.
import AsyncStorage from '@react-native-async-storage/async-storage';

const DOSE_HISTORY_KEY = '@dose_history';
const STORAGE_LAST_TAKEN_KEY = '@app_medicamentos_last_taken';

const getDoseLabel = (doseIndex) => {
  const labels = ['Primera dosis', 'Segunda dosis', 'Tercera dosis'];
  const idx = parseInt(doseIndex, 10);
  return labels[Number.isFinite(idx) ? idx : 0] ?? 'Primera dosis';
};

const saveToHistory = async (data, takenAt) => {
  try {
    const stored = await AsyncStorage.getItem(DOSE_HISTORY_KEY);
    const history = stored ? JSON.parse(stored) : [];
    history.unshift({
      id: takenAt.toString(),
      medName: data?.medName || 'Medicamento',
      doseLabel: getDoseLabel(data?.doseIndex),
      scheduledTime: data?.alarmTimestamp || null,
      takenAt,
    });
    await AsyncStorage.setItem(DOSE_HISTORY_KEY, JSON.stringify(history));
  } catch (_e) { /* noop */ }
};

const markAsTaken = async (alarmId, data) => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_LAST_TAKEN_KEY);
    const map = stored ? JSON.parse(stored) : {};
    if (!map[alarmId]) {
      const takenAt = Date.now();
      map[alarmId] = takenAt;
      await AsyncStorage.setItem(STORAGE_LAST_TAKEN_KEY, JSON.stringify(map));
      await saveToHistory(data, takenAt);
    }
  } catch (_e) { /* noop */ }
};

// Registrar onBackgroundEvent de Notifee (corre incluso con la app cerrada/background)
try {
  const notifeeModule = require('@notifee/react-native');
  const notifee = notifeeModule.default || notifeeModule;

  if (notifee && typeof notifee.onBackgroundEvent === 'function') {
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      const { notification, pressAction } = detail || {};
      const data = notification?.data || {};
      const alarmId = data?.alarmId || data?.id;

      // EventType.PRESS = 1, EventType.ACTION_PRESS = 2
      const EventType = notifeeModule.EventType || {};
      const ACTION_PRESS = EventType.ACTION_PRESS ?? 2;
      const PRESS = EventType.PRESS ?? 1;

      const isAlarmChannel =
        notification?.android?.channelId === 'medication-alarms' ||
        notification?.android?.channelId === 'alarm_channel' ||
        data?.type === 'alarm';

      // Botón "Aceptar" en el banner con app cerrada
      if (
        type === ACTION_PRESS &&
        pressAction?.id === 'MARK_AS_DONE' &&
        isAlarmChannel &&
        alarmId
      ) {
        await markAsTaken(alarmId, data);
        // Cancelar la notificación ongoing
        try {
          if (notification?.id) {
            await notifee.cancelNotification(notification.id);
          }
        } catch (_e) { /* noop */ }
        return;
      }

      // Toque directo sobre la notificación (sin botón específico)
      if (type === PRESS && isAlarmChannel) {
        // La app se abrirá sola vía fullScreenAction/pressAction — no hace falta nada más aquí
        return;
      }
    });
  }
} catch (_e) {
  // Notifee no disponible (Expo Go) — se ignora silenciosamente
}

// Cargar el entry de expo-router como siempre
import 'expo-router/entry';
