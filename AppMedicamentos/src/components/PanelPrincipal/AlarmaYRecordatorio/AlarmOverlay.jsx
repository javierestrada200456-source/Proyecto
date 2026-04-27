import React, { useEffect, useState } from 'react';
import { Platform, NativeModules, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlarmScreen from './AlarmScreen';
import { notifyCaregivers } from '../../../services/CaregiverNotifications';
import { supabase, authService } from '../../../services/supabaseClient';

const { AlarmModule } = NativeModules;
const STORAGE_LAST_TAKEN_KEY = '@app_medicamentos_last_taken';
const DOSE_HISTORY_KEY = '@dose_history';
const CHANNEL_ALARM = 'medication-alarms';
const CHANNEL_ALARM_LEGACY = 'alarm_channel';

const getDoseLabel = (doseIndex) => {
  const labels = ['Primera dosis', 'Segunda dosis', 'Tercera dosis'];
  const idx = parseInt(doseIndex, 10);
  return labels[idx] ?? 'Primera dosis';
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

    // Guardar en Supabase para que el cuidador/familiar pueda ver el historial
    try {
      const { data: { user } } = await authService.getCurrentUser();
      if (user) {
        await supabase.from('dose_history').insert({
          user_id: user.id,
          med_name: data?.medName || 'Medicamento',
          dose_label: getDoseLabel(data?.doseIndex),
          scheduled_time: data?.alarmTimestamp ? new Date(data.alarmTimestamp).toISOString() : null,
          taken_at: new Date(takenAt).toISOString(),
        });
      }
    } catch (_e) { /* Supabase save optional */ }
  } catch (_e) { /* noop */ }
};

let notifeeInstance;
try {
  const mod = require('@notifee/react-native');
  notifeeInstance = mod.default || mod;
} catch (e) {
  // console.warn('Notifee no instalado o no disponible');
}

export default function AlarmOverlay() {
  const [alarmVisible, setAlarmVisible] = useState(false);
  const [alarmData, setAlarmData] = useState(null);

  // Helper para procesar el evento
  const isAlarmNotification = (notification, pressAction) => {
    if (!notification) return false;

    const channelId = notification?.android?.channelId;
    const category = notification?.android?.category;
    const type = notification?.data?.type;

    return (
      channelId === CHANNEL_ALARM ||
      channelId === CHANNEL_ALARM_LEGACY ||
      category === 'alarm' ||
      type === 'alarm' ||
      pressAction?.id === 'alarm_fullscreen'
    );
  };

  // forceShow = true cuando el usuario presionó activamente la notificación (type PRESS)
  // o cuando la app fue lanzada por la alarma (fullScreen / AlarmReceiver).
  // En esos casos siempre mostramos AlarmScreen.
  // Si forceShow = false (DELIVERED automático), solo mostramos AlarmScreen si el teléfono
  // está bloqueado o la pantalla está apagada; de lo contrario la notificación banner basta.
  const handleNotificationEvent = async (detail, forceShow = false) => {
    const { notification, pressAction } = detail || {};
    const isAlarm = isAlarmNotification(notification, pressAction);

    if (!isAlarm) return;

    // Verificar si esta alarma ya fue aceptada (desde notificación push o pantalla bloqueada)
    const alarmId = notification?.data?.id || notification?.data?.alarmId;
    if (alarmId) {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_LAST_TAKEN_KEY);
        const map = stored ? JSON.parse(stored) : {};
        if (map[alarmId]) {
          // Ya fue aceptada — cancelar notificación si aún está visible y no mostrar AlarmScreen
          try { if (notifeeInstance) await notifeeInstance.cancelNotification(notification.id); } catch (_e) {}
          return;
        }
      } catch (_e) { /* noop */ }
    }

    // Determinar si el teléfono está bloqueado/pantalla apagada
    let isLocked = forceShow; // Si vinimos de una pulsación, asumir "quiere AlarmScreen"
    if (!forceShow && AlarmModule?.isLocked) {
      try {
        isLocked = await AlarmModule.isLocked();
      } catch (_e) {
        isLocked = true; // En caso de error, comportamiento seguro: mostrar AlarmScreen
      }
    }

    if (!isLocked) {
      // Teléfono desbloqueado / app activa:
      // La notificación banner con el botón "Aceptar" ya es suficiente.
      // No mostramos AlarmScreen.
      return;
    }

    // Teléfono bloqueado o pantalla apagada: mostrar pantalla de alarma completa
    setAlarmData({
      ...notification.data,
      title: notification.title,
      body: notification.body,
      notificationId: notification.id,
    });
    setAlarmVisible(true);

    // Resetear el registro de "última toma" para que el contador reinicie
    if (alarmId) {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_LAST_TAKEN_KEY);
        const map = stored ? JSON.parse(stored) : {};
        if (map[alarmId]) {
          delete map[alarmId];
          await AsyncStorage.setItem(STORAGE_LAST_TAKEN_KEY, JSON.stringify(map));
        }
      } catch (_e) { /* noop */ }
    }
  };

  // Aceptar el medicamento directamente desde el banner de notificación (sin abrir AlarmScreen)
  const handleAcceptFromNotification = async (detail) => {
    const { notification } = detail || {};
    if (!notification) return;
    try {
      if (notifeeInstance) await notifeeInstance.cancelNotification(notification.id);
    } catch (_e) { /* noop */ }

    // Guardar timestamp de "Tomado"
    const alarmId = notification.data?.id || notification.data?.alarmId;
    const takenAt = Date.now();
    if (alarmId) {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_LAST_TAKEN_KEY);
        const map = stored ? JSON.parse(stored) : {};
        map[alarmId] = takenAt;
        await AsyncStorage.setItem(STORAGE_LAST_TAKEN_KEY, JSON.stringify(map));
      } catch (_e) { /* noop */ }
    }
    await saveToHistory(notification.data, takenAt);

    // Notificar al cuidador que el paciente aceptó la dosis desde el banner
    try {
      notifyCaregivers(
        'Su paciente se tomó su dosis',
        '[Nombre de paciente] se acaba de tomar su dosis de [Nombre del medicamento]',
        notification.data || {}
      );
    } catch (_e) { /* noop */ }
  };

  useEffect(() => {
    if (Platform.OS !== 'android' || !notifeeInstance) return;

    // 1. La app se abrió por una notificación (Initial Notification / fullScreenAction).
    //    Como la app fue lanzada por la alarma, siempre mostramos AlarmScreen.
    notifeeInstance.getInitialNotification().then((initialNotification) => {
      if (initialNotification) {
        handleNotificationEvent(initialNotification, true);
      }
    });

    // 1b. Si ya hay notificaciones de alarma desplegadas al iniciar, verificar si el teléfono
    //     estaba bloqueado antes de restaurar AlarmScreen.
    notifeeInstance.getDisplayedNotifications().then((displayed) => {
      const list = Array.isArray(displayed) ? displayed : [];
      const alarmItem = list.find((item) => isAlarmNotification(item?.notification, item?.pressAction));
      if (alarmItem) {
        handleNotificationEvent({
          notification: alarmItem.notification,
          pressAction: alarmItem.pressAction || { id: 'alarm_fullscreen' },
        }, false);
      }
    });

    // 2. Escuchar eventos en Foreground (app abierta o encima del lockscreen)
    const unsubscribe = notifeeInstance.onForegroundEvent(({ type, detail }) => {
      // type 2 = ACTION_PRESS (usuario toca un botón de acción en la notificación)
      if (type === 2) {
        const actionId = detail?.pressAction?.id;
        if (actionId === 'MARK_AS_DONE') {
          // Usuario presionó "Aceptar" en el banner → aceptar sin abrir AlarmScreen
          handleAcceptFromNotification(detail);
          return;
        }
      }

      // type 3 = DELIVERED: notificación mostrada automáticamente.
      // Solo mostramos AlarmScreen si el teléfono está bloqueado/pantalla apagada.
      // Además notificamos al cuidador SOLO si es la alarma propia del paciente.
      if (type === 3) {
        const notifData = detail?.notification?.data;
        // Solo disparar push al cuidador para alarmas propias del paciente (type === 'alarm')
        // NO para 'external_reminder' que son las notificaciones locales del cuidador
        if (notifData?.type === 'alarm') {
          try {
            notifyCaregivers(
              '🔔 Es hora de la dosis',
              'Hola [Nombre Cuidador], Es hora de la [Nombre dosis] dosis para [Nombre de paciente]',
              notifData
            );
          } catch (_e) { /* noop */ }
        }
        handleNotificationEvent(detail, false);
        return;
      }

      // type 1 = PRESS: usuario presionó el cuerpo de la notificación.
      // Tratamos como acción voluntaria → mostrar AlarmScreen independientemente del bloqueo.
      if (type === 1) {
        handleNotificationEvent(detail, true);
      }
    });

    // 3. Revisar si la app se abrió directamente por AlarmReceiver (Pantalla de bloqueo)
    const checkLaunchAlarm = () => {
      if (AlarmModule?.getLaunchAlarmData) {
        AlarmModule.getLaunchAlarmData().then(data => {
          if (data && data.isAlarm) {
            setAlarmData({
              ...data,
              medName: data.medName || 'Medicamento',
              medInfo: data.medInfo || 'Hora de tu dosis',
            });
            setAlarmVisible(true);
          }
        }).catch(_err => { /* noop */ });
      }
    };

    checkLaunchAlarm();

    // Listener para cuando la app vuelve al primer plano (resume).
    // Solo mostrar AlarmScreen si el teléfono estaba bloqueado.
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkLaunchAlarm();
        notifeeInstance.getDisplayedNotifications().then((displayed) => {
          const list = Array.isArray(displayed) ? displayed : [];
          const alarmItem = list.find((item) => isAlarmNotification(item?.notification, item?.pressAction));
          if (alarmItem) {
            handleNotificationEvent({
              notification: alarmItem.notification,
              pressAction: alarmItem.pressAction || { id: 'alarm_fullscreen' },
            }, false);
          }
        });
      }
    });

    return () => {
      unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  const handleDismiss = () => {
    setAlarmVisible(false);
    setAlarmData(null);
  };

  const handleSnooze = async (minutes) => {
    console.log(`Posponer ${minutes} min`);
    if (alarmData?.notificationId && notifeeInstance) {
        await notifeeInstance.cancelNotification(alarmData.notificationId);
    }
    // TODO: Implementar reprogramación real
    setAlarmVisible(false);
  };

  const handleAccept = async () => {
    console.log("Tomar medicamento");
    if (alarmData?.notificationId && notifeeInstance) {
        await notifeeInstance.cancelNotification(alarmData.notificationId);
    }
    
    const takenAt = Date.now();
    // Guardar timestamp de "Tomado"
    const alarmId = alarmData?.id || alarmData?.alarmId;
    if (alarmId) {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_LAST_TAKEN_KEY);
            const map = stored ? JSON.parse(stored) : {};
            map[alarmId] = takenAt;
            await AsyncStorage.setItem(STORAGE_LAST_TAKEN_KEY, JSON.stringify(map));
        } catch(e) { console.log("Error saving last taken", e); }
    }
    await saveToHistory(alarmData, takenAt);

    setAlarmVisible(false);
  };

  if (!alarmVisible || !alarmData) return null;

  return (
    <AlarmScreen 
      visible={alarmVisible}
      data={alarmData}
      onDismiss={handleDismiss}
      onSnooze={handleSnooze}
      onAccept={handleAccept}
    />
  );
}
