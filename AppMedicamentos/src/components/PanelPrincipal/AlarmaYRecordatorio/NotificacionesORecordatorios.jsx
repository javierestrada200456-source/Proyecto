import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supabase } from '../../../services/supabaseClient';

// Nota (Expo SDK 53+): En Expo Go ya no se soportan push remotos de `expo-notifications`.
// En algunos casos, importar el módulo puede lanzar un error y evitar que la app cargue.
// Para que el proyecto abra en Expo Go, cargamos `expo-notifications` de forma segura.
let _NotificationsModule; // undefined = no intentado, null = no disponible
let _configured = false;

const getNotifications = () => {
  if (_NotificationsModule !== undefined) return _NotificationsModule;
  try {
    // Metro soporta require() en runtime
    _NotificationsModule = require('expo-notifications');
  } catch (_e) {
    _NotificationsModule = null;
  }
  return _NotificationsModule;
};

let _NotifeeModule; // undefined = no intentado, null = no disponible
const getNotifee = () => {
  if (_NotifeeModule !== undefined) return _NotifeeModule;
  try {
    const mod = require('@notifee/react-native');
    const notifeeInstance = mod.default || mod;

    // Asegurar que los Enums existan en el objeto devuelto (si vienen como named exports)
    ['TriggerType', 'AndroidImportance', 'AndroidCategory', 'AndroidVisibility', 'AndroidStyle'].forEach(key => {
      if (mod[key] && !notifeeInstance[key]) {
        notifeeInstance[key] = mod[key];
      }
    });

    _NotifeeModule = notifeeInstance;
  } catch (_e) {
    _NotifeeModule = null;
  }
  return _NotifeeModule;
};

const CHANNEL_PRE_REMINDER = 'medication-pre-reminders';
const CHANNEL_ALARM = 'medication-alarms';
const CHANNEL_INFO = 'medication-info';

// Configuraciones constantes de tiempo
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// Formatear hora basada en la zona horaria local del dispositivo
const formatLocalTimeFromTimestamp = (ms) => {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const CATEGORY_PRE_REMINDER = 'medication_pre_reminder';
const CATEGORY_ALARM = 'medication_alarm';

const ACTION_ACKNOWLEDGE = 'ACKNOWLEDGE';
const ACTION_MARK_AS_DONE = 'MARK_AS_DONE';
const ACTION_SNOOZE_10 = 'SNOOZE_10';

const STORAGE_REMINDERS_KEY = '@app_medicamentos_reminders_v2';
const PRE_REMINDER_AUTO_MS = 60 * 1000;
const preReminderTimers = new Map();

const statusPriority = {
  pending: 1,
  missed: 2,
  done: 3,
};

const pickBestStatus = (current, next) => {
  const cur = statusPriority[current] || 0;
  const nxt = statusPriority[next] || 0;
  return nxt >= cur ? next : current;
};

const getAlarmTimestamp = (data) => {
  const ts = data?.alarmTimestamp ?? data?.fireTimestamp;
  if (typeof ts === 'number' && Number.isFinite(ts)) return ts;
  return Date.now();
};

const getReminderDateKey = (timestamp) => {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const buildReminderId = (alarmId, timestamp) => {
  const dateKey = getReminderDateKey(timestamp);
  return `${alarmId || 'alarm'}_${dateKey}`;
};

const getReminderKey = (data) => {
  const alarmId = data?.alarmId || data?.id || 'alarm';
  const ts = getAlarmTimestamp(data);
  return `${alarmId}_${ts}`;
};

export async function upsertReminderFromAlarmData(data, status = 'pending') {
  try {
    const alarmId = data?.alarmId || data?.id;
    const ts = getAlarmTimestamp(data);
    const id = buildReminderId(alarmId, ts);

    const stored = await AsyncStorage.getItem(STORAGE_REMINDERS_KEY);
    const list = stored ? JSON.parse(stored) : [];
    const safeList = Array.isArray(list) ? list : [];

    const idx = safeList.findIndex((r) => r.id === id);
    const existing = idx >= 0 ? safeList[idx] : null;
    const nextStatus = pickBestStatus(existing?.status, status);

    const nextItem = {
      id,
      alarmId,
      medName: data?.medName || existing?.medName,
      medStrength: data?.medStrength || existing?.medStrength,
      dosage: data?.dosage || existing?.dosage,
      medType: data?.medType || existing?.medType,
      quantityToTake: data?.quantityToTake || existing?.quantityToTake,
      originalTime: existing?.originalTime ?? ts,
      displayTime: existing?.displayTime ?? ts,
      status: nextStatus || 'pending',
      snoozeCount: existing?.snoozeCount ?? 0,
    };

    if (idx >= 0) {
      safeList[idx] = nextItem;
    } else {
      safeList.push(nextItem);
    }

    await AsyncStorage.setItem(STORAGE_REMINDERS_KEY, JSON.stringify(safeList));
    return nextItem;
  } catch (_e) {
    return null;
  }
}

async function ensureNotifeeChannels(notifee) {
  if (!notifee?.createChannel) return;

  const importanceHigh =
    notifee?.AndroidImportance?.HIGH ??
    notifee?.AndroidImportance?.DEFAULT ??
    4;

  try {
    await notifee.createChannel({
      id: CHANNEL_ALARM,
      name: 'Alarmas de Medicamentos',
      importance: importanceHigh,
    });
    await notifee.createChannel({
      id: CHANNEL_PRE_REMINDER,
      name: 'Recordatorios (previo)',
      importance: importanceHigh,
      sound: 'tono_recordatorio',
    });
  } catch (_e) {
    // Best-effort
  }
}

function ensureNotifeeTriggerSupport(notifee) {
  if (!notifee || typeof notifee.createTriggerNotification !== 'function') {
    const err = new Error('Notifee no soporta createTriggerNotification. Actualiza Notifee en el build.');
    err.code = 'E_NOTIFEE_UNSUPPORTED';
    throw err;
  }
}

function explainScheduleError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  if (!msg) return null;

  // Android 12+: exact alarms pueden requerir permiso especial / ajuste del sistema.
  if (msg.includes('exact') && msg.includes('alarm')) {
    return 'Android está bloqueando las “alarmas exactas”. En Ajustes → Acceso especial → Alarmas y recordatorios, permite a la app programar alarmas.';
  }
  if (msg.includes('schedule_exact_alarm') || msg.includes('request_schedule_exact_alarm')) {
    return 'Falta permitir “Alarmas y recordatorios” (SCHEDULE_EXACT_ALARM) en Android. Actívalo en Ajustes del sistema y vuelve a intentar.';
  }
  if (msg.includes('post_notifications') || msg.includes('permission') || msg.includes('not authorized')) {
    return 'No hay permiso de notificaciones. Activa Notificaciones para la app y vuelve a intentar.';
  }
  if (msg.includes('channel') && (msg.includes('not found') || msg.includes('no such'))) {
    return 'El canal de notificaciones no existe o no se pudo crear. Reabre la app y vuelve a intentar.';
  }

  return null;
}

function ensureNotificationsConfigured(Notifications) {
  if (_configured) return;
  _configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification?.request?.content?.data;
      const type = data?.type;
      const isAlarm = type === 'alarm';

      // Si es una alarma y estamos en primer plano,
      // retornamos todo falso para que NO muestre bannner ni sonido de sistema.
      // La UI personalizada (AlarmScreen) se encargará de sonar y mostrarse
      // a través del listener `addNotificationReceivedListener`.
      if (isAlarm) {
          return {
              shouldShowAlert: false,
              shouldPlaySound: false,
              shouldSetBadge: false,
          };
      }

      // Para otros tipos (recordatorios previos), sí mostrar.
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      };
    },
  });
}

// Configurar categorías de notificaciones (Botones de acción)
async function setupNotificationCategories(Notifications) {
  await Notifications.setNotificationCategoryAsync(CATEGORY_PRE_REMINDER, [
    {
      identifier: ACTION_ACKNOWLEDGE,
      buttonTitle: 'Entendido',
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
}

// Inicializar listener de respuestas
export function setupNotificationListeners(onAction) {
  const Notifications = getNotifications();
  if (!Notifications) {
    console.warn(
      'expo-notifications no está disponible en este entorno (p.ej. Expo Go). Se desactivan listeners de notificaciones.'
    );
    return null;
  }

  ensureNotificationsConfigured(Notifications);
  setupNotificationCategories(Notifications);

  const responseSub = Notifications.addNotificationResponseReceivedListener(async (response) => {
    const { actionIdentifier, notification } = response;
    const { content } = notification.request;
    const data = content.data || {};

    const reminderKey = getReminderKey(data);

    // Si el usuario toca la notificación para abrirla
    if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      if (data.type === 'alarm') {
        if (onAction) onAction({ type: 'OPEN_ALARM', data });
      }
      return;
    }

    if (actionIdentifier === ACTION_ACKNOWLEDGE) {
      if (data.type === 'pre_reminder') {
        const timer = preReminderTimers.get(reminderKey);
        if (timer) {
          clearTimeout(timer);
          preReminderTimers.delete(reminderKey);
        }
        await upsertReminderFromAlarmData(data, 'pending');
      }
      await Notifications.dismissNotificationAsync(notification.request.identifier);
      return;
    }

    if (actionIdentifier === ACTION_SNOOZE_10) {
      // En Android (y más con `sticky: true`) si no se descarta la notificación actual,
      // se acumulan en la bandeja. Primero la cerramos y luego reprogramamos.
      await Notifications.dismissNotificationAsync(notification.request.identifier);

      // Programar nueva notificación para 5 minutos después (según requerimiento)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body, // Mantener body original
          sound: true,
          data: data,
          categoryIdentifier: CATEGORY_ALARM,
          sticky: true,
        },
        trigger: {
          type: 'timeInterval',
          seconds: 60 * 5, // 5 minutos
          channelId: CHANNEL_ALARM,
        },
      });

      if (onAction) onAction({ type: 'SNOOZE', data });

    } else if (actionIdentifier === ACTION_MARK_AS_DONE) {
      // Aquí podrías agregar lógica para marcar como tomado en la base de datos
      console.log('Medicamento marcado como hecho desde notificación');
      await Notifications.dismissNotificationAsync(notification.request.identifier);

      if (data.type === 'alarm') {
        await upsertReminderFromAlarmData(data, 'done');
      }
      
      if (onAction) onAction({ type: 'DONE', data });
    }
  });

  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification?.request?.content?.data || {};

    if (data?.type === 'pre_reminder') {
      const key = getReminderKey(data);
      if (!preReminderTimers.has(key)) {
        const timer = setTimeout(async () => {
          await upsertReminderFromAlarmData(data, 'pending');
          preReminderTimers.delete(key);
        }, PRE_REMINDER_AUTO_MS);
        preReminderTimers.set(key, timer);
      }
    }

    if (data?.type === 'alarm') {
      upsertReminderFromAlarmData(data, 'pending');
    }
  });

  return {
    remove() {
      responseSub?.remove?.();
      receivedSub?.remove?.();
    },
  };
}

async function getUserName() {
  try {
    const CACHE_KEY = '@app_medicamentos_first_name';

    const normalizeFirstName = (value) => {
      if (!value || typeof value !== 'string') return '';
      const cleaned = value.trim().replace(/\s+/g, ' ');
      if (!cleaned) return '';
      return cleaned.split(' ')[0];
    };

    // Primero intentamos con la sesión local (NO depende de internet)
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    const meta = user?.user_metadata || {};

    const candidate =
      meta.given_name ||
      meta.first_name ||
      meta.full_name ||
      meta.name ||
      meta.username;

    const firstFromMeta = normalizeFirstName(candidate);
    if (firstFromMeta) {
      await AsyncStorage.setItem(CACHE_KEY, firstFromMeta);
      return firstFromMeta;
    }

    // Fallback: usar el email (antes del @) si existe
    const firstFromEmail = normalizeFirstName(user?.email?.split('@')?.[0]);
    if (firstFromEmail) {
      await AsyncStorage.setItem(CACHE_KEY, firstFromEmail);
      return firstFromEmail;
    }

    // Último fallback: usar caché local
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    return cached || 'Usuario';
  } catch (_error) {
    try {
      const cached = await AsyncStorage.getItem('@app_medicamentos_first_name');
      return cached || 'Usuario';
    } catch {
      return 'Usuario';
    }
  }
}

export const registerForPushNotificationsAsync = async () => {
  const Notifications = getNotifications();
  if (!Notifications) return false;

  ensureNotificationsConfigured(Notifications);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_PRE_REMINDER, {
      name: 'Recordatorios (previo)',
      // IMPORTANCE_MAX para heads-up (banner) con sonido cuando estás en otra app.
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      // Nota: en Android el sonido personalizado depende del canal.
      // Para que funcione, el archivo debe existir como recurso nativo (res/raw) en builds (Dev Client / EAS).
      sound: 'tono_recordatorio',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync(CHANNEL_ALARM, {
      name: 'Alarmas de Medicamentos',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync(CHANNEL_INFO, {
      name: 'Información (siguiente medicación)',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0],
      lightColor: '#FF231F7C',
      sound: null,
    });

    await Notifications.setNotificationChannelAsync('medication-reminders', {
      name: 'Recordatorios de Medicamentos (legacy)',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // Después de obtener POST_NOTIFICATIONS, solicitar permisos especiales de Android
  if (finalStatus === 'granted' && Platform.OS === 'android') {
    // 1. SCHEDULE_EXACT_ALARM: necesario en Android 12+ para disparar alarmas exactas
    const notifee = getNotifee();
    if (notifee) {
      try {
        const settings = await notifee.getNotificationSettings();
        // AndroidNotificationSetting.DISABLED === 0
        if (settings?.android?.alarm === 0) {
          await notifee.openAlarmPermissionSettings();
        }
      } catch (_) { /* best-effort */ }
    }

    // 2. USE_FULL_SCREEN_INTENT: en Android 14+ (API 34+) requiere aprobación del usuario
    //    Solo se pide una vez (guardamos un flag en AsyncStorage)
    if (Platform.Version >= 34) {
      try {
        const alreadySolicited = await AsyncStorage.getItem('fsiPermissionRequested');
        if (!alreadySolicited) {
          await AsyncStorage.setItem('fsiPermissionRequested', '1');
          const { startActivityAsync } = require('expo-intent-launcher');
          await startActivityAsync(
            'android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT',
            { data: 'package:com.javierestrada.appmedicamentos' }
          );
        }
      } catch (_) { /* el dispositivo puede no admitirlo o el usuario canceló */ }
    }
  }

  return finalStatus === 'granted';
};

export const registerAndSavePushToken = async () => {
  const Notifications = getNotifications();
  if (!Notifications) return;
  const granted = await registerForPushNotificationsAsync();
  if (!granted) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Obtener el projectId desde expo-constants
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId || 'a1b5bcce-b4bb-4f4b-8924-976ac2aaaed7';
    if (!projectId) {
      console.warn("No projectId found for Expo Push Token.");
      return;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    if (tokenResponse?.data) {
      const token = tokenResponse.data;
      const { error } = await supabase
        .from('push_tokens')
        .upsert({ user_id: user.id, token }, { onConflict: 'user_id, token' });
      
      if (error) {
        console.error("Error guardando el push token en Supabase:", error);
      } else {
        console.log("Push token registrado correctamente.");
      }
    }
  } catch (error) {
    console.error("Error generando/guardando Expo Push Token:", error);
  }
};

export const scheduleMedicationNotification = async (alarmData) => {
  const Notifications = getNotifications();
  if (!Notifications) {
    return { preReminderIds: [], alarmIds: [], reminderIds: [] };
  }

  const notifee = getNotifee();

  ensureNotificationsConfigured(Notifications);

  // Asegurar canales + permisos antes de programar (especialmente Android 13+).
  // Esto también reduce fallos de Notifee por channelId inexistente.
  const granted = await registerForPushNotificationsAsync();
  if (!granted) {
    const err = new Error('Notifications permission not granted');
    err.code = 'E_NOTIF_PERMISSION';
    throw err;
  }

  if (Platform.OS === 'android') {
    if (!notifee) {
      const err = new Error('Notifee no está disponible en Android. Usa un build con EAS/Dev Client.');
      err.code = 'E_NOTIFEE_MISSING';
      throw err;
    }
    ensureNotifeeTriggerSupport(notifee);
    await ensureNotifeeChannels(notifee);
  }

  const { id: alarmId, medName, dosage, medType, hour, minute, days, reminderMinutes, frequencyHours, medStrength, medStrengthUnit, quantityToTake } = alarmData;
  const userName = await getUserName();
  const parsedMinutes = parseInt(reminderMinutes, 10);
  const minutesBefore = Number.isFinite(parsedMinutes) ? parsedMinutes : 5;

  const safeHour = parseInt(hour, 10);
  const safeMinute = parseInt(minute, 10);
  const baseHour = Number.isFinite(safeHour) ? safeHour : 12;
  const baseMinute = Number.isFinite(safeMinute) ? safeMinute : 0;

  // Construir lista de tiempos de dosis: usar times[] si existe, si no primer dosis solo
  const rawTimes = Array.isArray(alarmData.times) && alarmData.times.length > 0
    ? alarmData.times
    : [{ hour: baseHour, minute: baseMinute }];

  const doseTimes = rawTimes.map(t => ({
    hour: Number.isFinite(parseInt(t.hour, 10)) ? parseInt(t.hour, 10) : baseHour,
    minute: Number.isFinite(parseInt(t.minute, 10)) ? parseInt(t.minute, 10) : baseMinute,
  }));

  const nowMs = Date.now();
  const MIN_FUTURE_MS = 15 * 1000;
  const horizonDays = 7;

  const allDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const daysToUse = Array.isArray(days) && days.length > 0 ? days : allDays;
  const selected = new Set(daysToUse);

  const dayIndexToName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const localNow = new Date();
  const startOfTodayMs = new Date(
    localNow.getFullYear(),
    localNow.getMonth(),
    localNow.getDate(),
    0, 0, 0, 0
  ).getTime();

  const preReminderIds = [];
  const alarmIds = [];

  for (let dayOffset = 0; dayOffset <= horizonDays; dayOffset += 1) {
    const dayStartMs = startOfTodayMs + dayOffset * DAY_MS;

    const dayDate = new Date(dayStartMs);
    const dayName = dayIndexToName[dayDate.getDay()];
    if (!selected.has(dayName)) continue;

    // Iterar cada dosis del día (1, 2 o 3)
    for (let doseIdx = 0; doseIdx < doseTimes.length; doseIdx++) {
      const dose = doseTimes[doseIdx];
      const tMs = new Date(
        dayDate.getFullYear(),
        dayDate.getMonth(),
        dayDate.getDate(),
        dose.hour,
        dose.minute,
        0,
        0
      ).getTime();

      const alarmTimeText = formatLocalTimeFromTimestamp(tMs);

      // Definir doseLabel aquí para que esté disponible en ambos bloques (alarma y pre-recordatorio)
      const doseLabels = ['Primera dosis', 'Segunda dosis', 'Tercera dosis'];
      const doseLabel = doseLabels[doseIdx] || `Dosis ${doseIdx + 1}`;

      if (tMs > nowMs + MIN_FUTURE_MS) {
        const doseInfoDetail = [
          medStrength ? `${medStrength} ${medStrengthUnit || ''}`.trim() : null,
          dosage || null,
          medType || null,
        ].filter(Boolean).join(' ');
        
        const alarmPayloadData = {
          alarmId: String(alarmId || ''),
          medName: String(medName || ''),
          dosage: String(dosage || ''),
          medStrength: String(medStrength || ''),
          medStrengthUnit: String(medStrengthUnit || ''),
          medType: String(medType || ''),
          quantityToTake: String(quantityToTake || ''),
          doseIndex: doseIdx,
          type: 'alarm',
          at: alarmTimeText,
          freqHours: Number(frequencyHours) || 0,
          medInfo: `Dosis: ${doseInfoDetail}`,
          // Para evitar abrir alarmas viejas en frío
          fireTimestamp: Number(tMs),
          alarmTimestamp: Number(tMs),
          // Datos del sonido personalizado para AlarmScreen
          soundUri: typeof alarmData.soundUri === 'string' ? alarmData.soundUri : '',
          soundVolume: Number(alarmData.soundVolume || 1),
          soundStartSeconds: Number(alarmData.soundStartSeconds || 0),
        };

        // Android: usamos Notifee para full-screen intent (muestra UI sobre bloqueo y enciende pantalla).
        if (Platform.OS === 'android' && notifee) {
          ensureNotifeeTriggerSupport(notifee);
          const {
            TriggerType,
            AndroidCategory,
            AndroidVisibility,
          } = notifee;

          const trigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: tMs,
            alarmManager: {
              allowWhileIdle: true,
            },
          };

          try {
            const id = await notifee.createTriggerNotification(
              {
                title: 'AppMedicamentos',
                body: `Es hora de tomar: ${medName}\n${doseLabel}`,
                data: alarmPayloadData,
                android: {
                  channelId: CHANNEL_ALARM,
                  category: AndroidCategory.ALARM,
                  // Botón "Aceptar" visible en el banner cuando el teléfono está desbloqueado
                  actions: [
                    {
                      title: 'Aceptar',
                      pressAction: { id: 'MARK_AS_DONE' },
                    },
                  ],
                  // Importante: esto fuerza la UI a pantalla completa (alarma) incluso con el dispositivo bloqueado.
                  fullScreenAction: {
                    id: 'alarm_fullscreen',
                    launchActivity: 'default',
                  },
                  pressAction: {
                    id: 'default',
                    launchActivity: 'default',
                  },
                  visibility: AndroidVisibility.PUBLIC,
                  ongoing: true,
                  autoCancel: false,
                  sound: 'default',
                },
              },
              trigger
            );
            alarmIds.push(id);
          } catch (err) {
            // En Android no hacemos fallback a notificación normal para evitar comportamiento de "notificación".
            const hint = explainScheduleError(err);
            if (hint) console.warn('[scheduleMedicationNotification] Hint:', hint);
            throw err;
          }
        } else {
          // iOS (sin Notifee): se dispara notificación normal.
          const alarmIdScheduled = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'AppMedicamentos',
              body: `Es hora de tomar: ${medName}\n${doseLabel}`,
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.MAX,
              data: alarmPayloadData,
              sticky: true,
            },
            trigger: {
              type: 'date',
              date: new Date(tMs),
              channelId: CHANNEL_ALARM,
            },
          });
          alarmIds.push(alarmIdScheduled);
        }
      }

      if (minutesBefore > 0) {
        const preMs = tMs - minutesBefore * MINUTE_MS;
        if (preMs > nowMs + MIN_FUTURE_MS) {
          const preTimeText = formatLocalTimeFromTimestamp(preMs);
          
          // Nuevo formato solicitado
          const bodyText = `Hola ${userName},\n\nTe recordamos que en ${minutesBefore} minutos debes tomar:\n\n\u2022 ${medName} (${doseLabel})${medStrength ? ` - ${medStrength} ${medStrengthUnit || ''}`.trim() : ''}${medType ? `\n\u2022 Tipo: ${medType}` : ''}`;

          if (Platform.OS === 'android' && notifee) {
            ensureNotifeeTriggerSupport(notifee);
            await ensureNotifeeChannels(notifee);
            const { TriggerType, AndroidCategory, AndroidVisibility } = notifee;
            const preId = await notifee.createTriggerNotification(
              {
                title: 'AppMedicamentos',
                body: bodyText,
                data: {
                  alarmId: String(alarmId || ''),
                  medName: String(medName || ''),
                  dosage: String(dosage || ''),
                  medStrength: String(medStrength || ''),
                  medType: String(medType || ''),
                  quantityToTake: String(quantityToTake || ''),
                  type: 'pre_reminder',
                  at: alarmTimeText,
                  preAt: preTimeText,
                  alarmTimestamp: Number(tMs),
                },
                android: {
                  channelId: CHANNEL_PRE_REMINDER,
                  category: AndroidCategory.REMINDER,
                  pressAction: { id: 'default', launchActivity: 'default' },
                  visibility: AndroidVisibility.PUBLIC,
                  autoCancel: true,
                  sound: typeof alarmData.soundUri === 'string' && alarmData.soundUri ? alarmData.soundUri : 'tono_recordatorio',
                },
              },
              {
                type: TriggerType.TIMESTAMP,
                timestamp: preMs,
                alarmManager: { allowWhileIdle: true },
              }
            );
            preReminderIds.push(preId);
          } else {
            const preId = await Notifications.scheduleNotificationAsync({
              content: {
                title: 'AppMedicamentos',
                body: bodyText,
                // Usar el tono personalizado del alarm si existe
                sound: typeof alarmData.soundUri === 'string' && alarmData.soundUri ? alarmData.soundUri : 'tono_recordatorio',
                priority: Notifications.AndroidNotificationPriority.MAX,
                data: { 
                    alarmId, medName, dosage, medStrength, medType, quantityToTake,
                    type: 'pre_reminder', at: alarmTimeText, preAt: preTimeText, alarmTimestamp: tMs
                },
                categoryIdentifier: CATEGORY_PRE_REMINDER,
                sticky: false,
              },
              trigger: {
                type: 'date',
                date: new Date(preMs),
                channelId: CHANNEL_PRE_REMINDER,
              },
            });
            preReminderIds.push(preId);
          }
        }
      }
    }
  }

  return { preReminderIds, alarmIds, reminderIds: preReminderIds };
};

export const cancelMedicationNotification = async (notificationIds) => {
  const Notifications = getNotifications();
  if (!Notifications) return;

  const notifee = getNotifee();

  if (!notificationIds) return;

  const ids = [];
  if (Array.isArray(notificationIds)) {
    ids.push(...notificationIds);
  } else {
    if (Array.isArray(notificationIds?.preReminderIds)) ids.push(...notificationIds.preReminderIds);
    if (Array.isArray(notificationIds?.alarmIds)) ids.push(...notificationIds.alarmIds);
    if (Array.isArray(notificationIds?.reminderIds)) ids.push(...notificationIds.reminderIds);
  }

  if (!ids.length) return;

  for (const id of ids) {
    // Puede venir de expo-notifications o de Notifee (trigger). Cancelamos ambos de forma best-effort.
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (_e) {
      // noop
    }
    if (Platform.OS === 'android' && notifee) {
      try {
        await notifee.cancelTriggerNotification(id);
      } catch (_e2) {
        // noop
      }
    }
  }
};

export async function triggerSnooze(data) {
  const Notifications = getNotifications();
  if (!Notifications) return;

  const notifee = getNotifee();

  const { medName } = data;

  // Si hay Notifee, mantenemos el comportamiento de pantalla completa también en snooze.
  if (Platform.OS === 'android' && notifee) {
    ensureNotifeeTriggerSupport(notifee);
    await ensureNotifeeChannels(notifee);
    const { TriggerType, AndroidCategory, AndroidVisibility } = notifee;
    const ts = Date.now() + 60 * 5 * 1000;
    try {
      await notifee.createTriggerNotification(
        {
          title: 'AppMedicamentos',
          body: `Alarma pospuesta: Tomar ${medName}`,
          data: { ...data, type: 'alarm', fireTimestamp: ts },
          android: {
            channelId: CHANNEL_ALARM,
            category: AndroidCategory.ALARM,
            actions: [
              {
                title: 'Aceptar',
                pressAction: { id: 'MARK_AS_DONE' },
              },
            ],
            fullScreenAction: { id: 'alarm_fullscreen', launchActivity: 'default' },
            pressAction: { id: 'default', launchActivity: 'default' },
            visibility: AndroidVisibility.PUBLIC,
            ongoing: true,
            autoCancel: false,
            sound: 'default',
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: ts,
          alarmManager: { allowWhileIdle: true },
        }
      );
      return;
    } catch (err) {
      console.warn('[triggerSnooze] Notifee failed, falling back to expo-notifications:', err);
      const hint = explainScheduleError(err);
      if (hint) console.warn('[triggerSnooze] Hint:', hint);
    }
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'AppMedicamentos',
      body: `Alarma pospuesta: Tomar ${medName}`,
      sound: 'default',
      data: data,
      categoryIdentifier: CATEGORY_ALARM,
      sticky: true,
    },
    trigger: {
      type: 'timeInterval',
      seconds: 60 * 5,
      channelId: CHANNEL_ALARM,
    },
  });
}

export async function triggerNextAlarmInfo(data) {
  const Notifications = getNotifications();
  if (!Notifications) return;
  
  const freq = data.freqHours || 24;
  const safeFreq = Number.isFinite(parseInt(freq, 10)) ? parseInt(freq, 10) : 24;
  const userName = await getUserName();

  // Requerimiento: al aceptar, mostrar inmediatamente una notificación con la info de la siguiente medicación.
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Siguiente Medicación',
      body: `Hola ${userName}, en ${safeFreq} horas deberás tomarte la siguiente medicación.`,
      data: { ...data, type: 'info' },
      categoryIdentifier: CATEGORY_PRE_REMINDER,
      sound: null,
    },
    trigger: {
      type: 'timeInterval',
      seconds: 1,
      channelId: CHANNEL_INFO,
    },
  });
}

// Extender el dismiss para notificaciones mostradas con Notifee (Android)
export async function dismissPresentedNotificationsForAlarm(alarmData) {
  try {
    const Notifications = getNotifications();
    const notifee = getNotifee();

    const alarmId = alarmData?.alarmId ?? alarmData?.id;
    const medName = alarmData?.medName;
    const dosage = alarmData?.dosage;
    if (!alarmId && !medName && !dosage) return;

    const matchesAlarmData = (data) => {
      const sameId = alarmId ? data?.alarmId === alarmId || data?.id === alarmId : true;
      const sameMed = medName ? data?.medName === medName : true;
      const sameDose = dosage ? data?.dosage === dosage : true;
      return sameId && sameMed && sameDose;
    };

    if (Notifications) {
      const presented = await Notifications.getPresentedNotificationsAsync();
      const toDismiss = (Array.isArray(presented) ? presented : []).filter((n) => matchesAlarmData(n?.request?.content?.data || {}));
      for (const n of toDismiss) {
        await Notifications.dismissNotificationAsync(n.request.identifier);
      }
    }

    if (Platform.OS === 'android' && notifee) {
      const displayed = await notifee.getDisplayedNotifications();
      const toCancel = (Array.isArray(displayed) ? displayed : []).filter((n) => matchesAlarmData(n?.notification?.data || {}));
      for (const n of toCancel) {
        await notifee.cancelNotification(n.notification.id);
      }
    }
  } catch (_e) {
    // Silencioso
  }
}