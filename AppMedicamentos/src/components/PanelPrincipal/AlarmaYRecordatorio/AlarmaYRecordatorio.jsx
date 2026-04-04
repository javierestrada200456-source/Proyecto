import React, { useState, useEffect, useRef } from 'react';
import { View,  Text, TouchableOpacity, ScrollView, Modal, TextInput,Alert,Animated,Pressable, Platform, Vibration, Dimensions, Switch, KeyboardAvoidingView} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from './AlarmaYRecordatorio.Styles';
import { scheduleMedicationNotification, cancelMedicationNotification, registerForPushNotificationsAsync, dismissPresentedNotificationsForAlarm } from './NotificacionesORecordatorios';
import ReminderCard from '../ReminderCard';

import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { VolumeManager } from 'react-native-volume-manager';
import { useTheme } from '../../../context/ThemeContext';

import { authService, supabase } from '../../../services/supabaseClient';
import { notifyCaregivers } from '../../../services/CaregiverNotifications';

let Notifications;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.warn("Expo Notifications failed to load", e);
}

// Implementación de Background Fetch para Expo/EAS

const STORAGE_KEY = '@alarms_v1';
const STORAGE_REMINDERS_KEY = '@reminder_history';
const STORAGE_VISIBLE_REMINDERS_KEY = '@app_medicamentos_visible_reminders';
const TONE_LIBRARY_KEY = '@tone_library';
const STORAGE_LAST_TAKEN_KEY = '@app_medicamentos_last_taken';

const weekDays = [
  { short: 'D', full: 'Domingo', value: 0 },
  { short: 'L', full: 'Lunes', value: 1 },
  { short: 'M', full: 'Martes', value: 2 },
  { short: 'M', full: 'Miércoles', value: 3 },
  { short: 'J', full: 'Jueves', value: 4 },
  { short: 'V', full: 'Viernes', value: 5 },
  { short: 'S', full: 'Sábado', value: 6 },
];

const strengthUnits = [
  { label: 'mg', value: 'mg', full: 'Mg' }, // Mg
  { label: 'g', value: 'g', full: 'g' },   // g
  { label: 'mcg', value: 'mcg', full: 'Mcg' }, // Mcg
  { label: 'ui', value: 'ui', full: 'UI' },  // UI
];

const reminderOptions = [
  { label: 'Sin aviso previo', value: 0 },
  { label: '5 min antes', value: 5 },
  { label: '10 min antes', value: 10 },
  { label: '15 min antes', value: 15 },
  { label: '30 min antes', value: 30 },
];

const medicationTypes = [
  'Tableta', 'Cápsula', 'Comprimido', 'Jarabe', 'Inyección'
];

const AlarmToggle = ({ value, disabled, onChange }) => (
  <Switch
    trackColor={{ false: "#767577", true: "#667eea" }}
    thumbColor={value ? "#fff" : "#f4f3f4"}
    ios_backgroundColor="#3e3e3e"
    onValueChange={onChange}
    value={value}
    disabled={disabled}
    style={{ transform: [{ scaleX: .8 }, { scaleY: .8 }] }}
  />
);

export default function AlarmaYRecordatorio() {
  const insets = useSafeAreaInsets();
  const { isDark, theme } = useTheme();
  const router = useRouter();
  const { width, height } = Dimensions.get('window');
  
  const [alarms, setAlarms] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [medTypePickerVisible, setMedTypePickerVisible] = useState(false);
  const [unitPickerVisible, setUnitPickerVisible] = useState(false); // Nuevo estado para unidades
  
  // Custom Time Picker — Primera dosis
  const [timeDraft, setTimeDraft] = useState({ hourText: '12', minuteText: '00' });
  const [period, setPeriod] = useState('AM');
  const minuteInputRef = useRef(null);

  // Segunda dosis
  const [dose2Draft, setDose2Draft] = useState({ hourText: '12', minuteText: '00' });
  const [dose2Period, setDose2Period] = useState('AM');
  const dose2MinuteRef = useRef(null);

  // Tercera dosis
  const [dose3Draft, setDose3Draft] = useState({ hourText: '12', minuteText: '00' });
  const [dose3Period, setDose3Period] = useState('AM');
  const dose3MinuteRef = useRef(null);
  const [showSecondDose, setShowSecondDose] = useState(false);
  const [showThirdDose, setShowThirdDose] = useState(false);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);

  const [newAlarm, setNewAlarm] = useState({
    id: null,
    medName: '',
    medType: '',
    medStrength: '',
    medStrengthUnit: 'mg',
    quantityToTake: '',
    days: [],
    time: new Date(),
    active: true,
    soundName: '',
    soundUri: '',
    soundStartSeconds: 0,
    soundVolume: 1.0,
    reminderMinutes: 0
  });

  const [toneModalVisible, setToneModalVisible] = useState(false);
  const [toneLibrary, setToneLibrary] = useState([]);
  const [editingAlarmId, setEditingAlarmId] = useState(null);
  const [selectedToneDuration, setSelectedToneDuration] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [soundPreview, setSoundPreview] = useState(null); // Estado para el objeto Audio.Sound
  const [currentToneSoundInfo, setCurrentToneSoundInfo] = useState(null);
  const [isTonePreviewPlaying, setIsTonePreviewPlaying] = useState(false); 
  const [toneAlertVisible, setToneAlertVisible] = useState(false);

  // --- VARIABLES Y ESTADOS FALTANTES (Restaurados) ---
  const [activeTab, setActiveTab] = useState('recordatorios');
  const [visibleReminderIds, setVisibleReminderIds] = useState([]);
  const [reminderAddModalVisible, setReminderAddModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [removeCardModalVisible, setRemoveCardModalVisible] = useState(false);
  const [reminderActionType, setReminderActionType] = useState('hide'); 
  const [togglingById, setTogglingById] = useState({});
  const [externalSyncActive, setExternalSyncActive] = useState(false);
  const [lastTakenMap, setLastTakenMap] = useState({});

  // Layout constants derived from insets
  const tabBarBottom = insets.bottom > 0 ? insets.bottom + 10 : 20;
  const fabBottom = tabBarBottom + 10;
  const scrollBottomPadding = fabBottom + 80;

  const weekDayShort = weekDays.reduce((acc, curr) => {
    acc[curr.full] = curr.short;
    return acc;
  }, {});

  const formatStrength = (val, unit) => {
    if (!val) return '';
    return `${val} ${unit}`;
  };

  const getDailyDoseCount = (freqHours) => {
    if (!freqHours) return null;
    return Math.floor(24 / parseInt(freqHours, 10));
  };
  
  const confirmRemoveCard = async () => {
      if (!alarmToDeleteId) {
          setRemoveCardModalVisible(false);
          return;
      }
      const id = alarmToDeleteId;
      const actionType = reminderActionType;
      // Cerrar modal inmediatamente
      setRemoveCardModalVisible(false);
      setAlarmToDeleteId(null);

      if (actionType === 'delete') {
          // Eliminar el recordatorio completamente (local + Supabase + notificaciones)
          const alarm = alarms.find(a => a.id === id);
          if (alarm) await cancelMedicationNotification(alarm.notificationIds);
          const updatedAlarms = alarms.filter(a => a.id !== id);
          setAlarms(updatedAlarms);

          // Eliminar directamente de Supabase para garantizar consistencia
          try {
            const { data: { user } } = await authService.getCurrentUser();
            if (user) {
              await supabase.from('reminders').delete().eq('id', id).eq('user_id', user.id);
            }
          } catch (_e) {
            console.warn('Error eliminando alarma de Supabase:', _e);
          }

          await saveAlarmsToStorage(updatedAlarms);

          showToast({
            type: 'success',
            title: 'Recordatorio eliminado',
            message: 'El recordatorio fue eliminado exitosamente.',
          });
      }
      const newIds = visibleReminderIds.filter(vid => vid !== id);
      setVisibleReminderIds(newIds);
      saveVisibleReminders(newIds);
  };
  
  const blockIfExternalSync = () => {
    if (externalSyncActive) {
      setToast({
        type: 'info',
        title: 'Sincronización Activa',
        message: 'No se pueden modificar alarmas mientras la sincronización externa está activa.'
      });
      setTimeout(() => setToast(null), 3000);
      return true;
    }
    return false;
  };

  const [alarmToDeleteId, setAlarmToDeleteId] = useState(null);

  const showToast = ({ type, title, message }) => {
    setToast({ type, title, message });
    // Si la referencia animation view existiera podríamos animarla aquí, 
    // pero el componente Toast ya maneja su animación de entrada con "animation='slideInDown'"
    // Auto-ocultar:
    setTimeout(() => {
        setToast(null);
    }, 4000);
  };
  // ----------------------------------------------------

  useEffect(() => {
    loadAlarms();
    loadReminders();
    loadVisibleReminders();
    loadToneLibrary();
    loadLastTaken();
  }, []);

  const loadVisibleReminders = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_VISIBLE_REMINDERS_KEY);
      if (stored) {
        setVisibleReminderIds(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Error loading visible reminders', e);
    }
  };

  const saveVisibleReminders = async (ids) => {
    try {
      await AsyncStorage.setItem(STORAGE_VISIBLE_REMINDERS_KEY, JSON.stringify(ids));
    } catch (e) {
      console.error('Error saving visible reminders', e);
    }
  };

  const loadLastTaken = async () => {
    try {
        const json = await AsyncStorage.getItem(STORAGE_LAST_TAKEN_KEY);
        if (json) {
            setLastTakenMap(JSON.parse(json));
        }
    } catch (e) {
        console.warn('Error loading last taken map', e);
    }
  };

  const loadAlarms = async () => {
    try {
      const storedAlarms = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedAlarms) {
        const parsed = JSON.parse(storedAlarms);
        const list = Array.isArray(parsed) ? parsed : [];

        // Solo reprogramar si las notificaciones son muy viejas (> 6 días) o no existen.
        // Esto evita cancelar y reprogramar TODAS las alarmas en cada carga, lo que era muy lento.
        const now = Date.now();
        const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;

        const refreshed = [];
        let needsSave = false;

        for (const alarm of list) {
          if (alarm?.active) {
            const lastScheduled = alarm.lastScheduledAt || 0;
            const nids = alarm.notificationIds;
            const hasIds = nids && (
              Array.isArray(nids)
                ? nids.length > 0
                : ((nids.alarmIds?.length ?? 0) + (nids.preReminderIds?.length ?? 0)) > 0
            );
            const isStale = !hasIds || (now - lastScheduled) > SIX_DAYS_MS;

            if (isStale) {
              try {
                await cancelMedicationNotification(alarm.notificationIds);
                const ids = await scheduleMedicationNotification(alarm);
                refreshed.push({ ...alarm, notificationIds: ids, lastScheduledAt: now });
                needsSave = true;
              } catch (e) {
                refreshed.push(alarm);
              }
            } else {
              refreshed.push(alarm);
            }
          } else {
            refreshed.push(alarm);
          }
        }

        if (needsSave) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
        }
        setAlarms(refreshed);
      }
    } catch (e) {
      console.error("Error loading alarms", e);
    }
  };

  const loadReminders = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_REMINDERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const list = Array.isArray(parsed) ? parsed : [];
        setReminders(list);
        return list;
      }
      setReminders([]);
      return [];
    } catch (e) {
      console.warn("Error loading reminders", e);
      return reminders;
    }
  };

  const saveReminders = async (list) => {
    try {
      await AsyncStorage.setItem(STORAGE_REMINDERS_KEY, JSON.stringify(list));
      setReminders(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReminderAction = (id, action) => {
      if (externalSyncActive) {
        blockIfExternalSync();
        return;
      }
      const updated = reminders.map(r => {
          if (r.id === id) {
              if (action === 'done') return { ...r, status: 'done' };
              if (action === 'missed') return { ...r, status: 'missed' };
              if (action === 'snooze') {
                  const newCount = (r.snoozeCount || 0) + 1;
                  // Si es 1a vez (newCount=1), sigue pending. Si es 2a (newCount=2), missed.
                  // Pero la logica ya está en ReminderCard para UI. Aquí persistimos.
                  // ReminderCard envia 'snooze' solo para la primera vez (pending -> pending).
                  // Si envia 'missed' es porque ya fue la segunda.
                  
                  // Calculamos visual time
                  const currentDisplay = new Date(r.displayTime || r.originalTime);
                  const newDisplay = new Date(currentDisplay.getTime() + 5 * 60000);
                  
                  return { 
                      ...r, 
                      snoozeCount: newCount, 
                      displayTime: newDisplay.getTime(),
                      status: 'pending' // Asegurar pending
                  };
              }
          }
          return r;
      });
      saveReminders(updated);
  };
  
  // Generar ID único para un recordatorio de HOY
  const getDailyReminderId = (alarmId, dateObj) => {
      const yStr = dateObj.getFullYear();
      const mStr = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dStr = String(dateObj.getDate()).padStart(2, '0');
      return `${alarmId}_${yStr}-${mStr}-${dStr}`; 
  };
  
  // Chequeo y generación de recordatorios pendientes
      const checkPendingReminders = (baseList) => {
      if (externalSyncActive) return;
      const now = new Date();
      if (!alarms || alarms.length === 0) return;
      
      let newRemindersList = Array.isArray(baseList) ? [...baseList] : [...reminders];
      let changed = false;
        const nowMs = now.getTime();

      alarms.forEach(alarm => {
          if (!alarm.active) return;
          if (!alarm.days || !Array.isArray(alarm.days)) return; // Validación extra
          
          // Verificar si hoy toca
          const todayName = weekDays[now.getDay() === 0 ? 6 : now.getDay() - 1]; // Lunes=0... en weekDays array? No, weekDays[0] es Lunes
          // En JS getDay(): 0=Domingo, 1=Lunes.
          // weekDays = ['Lunes', 'Martes', ...] -> index 0=Lunes
          let todayIndex = now.getDay() - 1; 
          if (todayIndex === -1) todayIndex = 6; // Domingo
          
          const todayStr = weekDays[todayIndex];
          if (!alarm.days.includes(todayStr)) return;

            // Verificar hora de alarma
          const alarmTime = new Date();
          alarmTime.setHours(parseInt(alarm.hour), parseInt(alarm.minute), 0, 0);

            const reminderMinutes = Number.isFinite(parseInt(alarm.reminderMinutes, 10))
            ? parseInt(alarm.reminderMinutes, 10)
            : 5;

            const alarmMs = alarmTime.getTime();
            const preMs = alarmMs - reminderMinutes * 60000;
            const preGraceMs = preMs + 60 * 1000; // 1 minuto después del pre‑recordatorio
            const withinWindow = nowMs >= preGraceMs && nowMs < alarmMs + 12 * 3600 * 1000;

            const remId = getDailyReminderId(alarm.id, now);
            const existsIndex = newRemindersList.findIndex(r => r.id === remId);
            const exists = existsIndex >= 0 ? newRemindersList[existsIndex] : null;

            if (withinWindow && !exists) {
              // Crear recordatorio PENDIENTE (Naranja) cuando ya pasó el pre‑recordatorio + 1 min
              const newRem = {
                id: remId,
                alarmId: alarm.id,
                medName: alarm.medName,
                medStrength: alarm.medStrength,
                medStrengthUnit: alarm.medStrengthUnit,
                dosage: alarm.dosage,
                medType: alarm.medType,
                frequencyHours: alarm.frequencyHours,
                originalTime: alarmMs,
                displayTime: alarmMs,
                status: 'pending', // Naranja
                snoozeCount: 0
              };
              newRemindersList.push(newRem);
              changed = true;
            }

            // Si existe y ya pasó un margen después de la alarma sin aceptar => missed
            if (exists && exists.status === 'pending' && nowMs > alarmMs + 15 * 60000) {
              newRemindersList[existsIndex] = { ...exists, status: 'missed' };
              changed = true;
            }
      });
      
      if (changed) {
          saveReminders(newRemindersList);
      }
  };

  const saveAlarmsToStorage = async (newAlarmsList) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newAlarmsList));
      await syncAlarmsToSupabase(newAlarmsList);
    } catch (e) {
      console.error("Error saving alarms", e);
    }
  };

  const syncAlarmsToSupabase = async (alarmsList) => {
    try {
      const { data: { user } } = await authService.getCurrentUser();
      if (!user) return;

      // Obtener alarmas actuales en Supabase
      const { data: existingReminders, error: fetchError } = await supabase
        .from('reminders')
        .select('id')
        .eq('user_id', user.id);

      if (fetchError) {
        console.error("Error fetching reminders from Supabase", fetchError);
        return;
      }

      const existingIds = existingReminders.map(r => r.id);
      const localIds = alarmsList.map(a => a.id);

      // Eliminar alarmas que ya no existen localmente
      const idsToDelete = existingIds.filter(id => !localIds.includes(id));
      if (idsToDelete.length > 0) {
        await supabase
          .from('reminders')
          .delete()
          .in('id', idsToDelete);
      }

      // Upsert alarmas locales
      const remindersToUpsert = alarmsList.map(alarm => {
        // Primera dosis para campo 'time' (retrocompatibilidad)
        const firstDose = Array.isArray(alarm.times) && alarm.times.length > 0 ? alarm.times[0] : null;
        const timeStr = firstDose
          ? `${String(firstDose.hour).padStart(2, '0')}:${String(firstDose.minute).padStart(2, '0')}`
          : `${String(alarm.hour ?? 0).padStart(2, '0')}:${String(alarm.minute ?? 0).padStart(2, '0')}`;
        return {
          id: alarm.id,
          user_id: user.id,
          med_name: alarm.medName,
          med_strength: alarm.medStrength,
          med_strength_unit: alarm.medStrengthUnit || '',
          med_type: alarm.medType,
          quantity_to_take: alarm.quantityToTake || alarm.medStrength || '1',
          active: alarm.active,
          frequency_hours: alarm.frequencyHours || 0,
          time: timeStr,
          times: Array.isArray(alarm.times) ? alarm.times : [],
          days: Array.isArray(alarm.days) ? alarm.days : [],
          scheduled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      if (remindersToUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from('reminders')
          .upsert(remindersToUpsert, { onConflict: 'id' });

        if (upsertError) {
          console.error("Error upserting reminders to Supabase", upsertError);
        }
      }
    } catch (e) {
      console.error("Error syncing alarms to Supabase", e);
    }
  };

  const clearError = (key) => {
    setFormErrors((prev) => {
      if (!prev || !prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateAlarmForm = () => {
    const nextErrors = {};

    if (!newAlarm.medName || !newAlarm.medName.trim()) {
      nextErrors.medName = 'Obligatorio';
    }

    if (!newAlarm.days || newAlarm.days.length === 0) {
      nextErrors.days = 'Selecciona al menos un día.';
    }

    const hour12 = parseInt(timeDraft.hourText, 10);
    const minute = parseInt(timeDraft.minuteText, 10);
    if (!Number.isFinite(hour12) || hour12 < 1 || hour12 > 12 || !Number.isFinite(minute) || minute < 0 || minute > 59) {
      nextErrors.time = 'Ingresa una hora válida para la primera dosis.';
    }

    if (showSecondDose) {
      const d2h = parseInt(dose2Draft.hourText, 10);
      const d2m = parseInt(dose2Draft.minuteText, 10);
      if (!Number.isFinite(d2h) || d2h < 1 || d2h > 12 || !Number.isFinite(d2m) || d2m < 0 || d2m > 59) {
        nextErrors.dose2Time = 'Ingresa una hora válida para la segunda dosis.';
      }
    }

    return nextErrors;
  };

  const sanitizeTwoDigits = (text) => String(text ?? '').replace(/[^0-9]/g, '').slice(0, 2);

  const commitTimeDraftToAlarm = () => {
    const hour12 = parseInt(timeDraft.hourText, 10);
    const minute = parseInt(timeDraft.minuteText, 10);

    const safeHour = Number.isFinite(hour12) && hour12 >= 1 && hour12 <= 12 ? hour12 : newAlarm.hour;
    const safeMinute = Number.isFinite(minute) && minute >= 0 && minute <= 59 ? minute : newAlarm.minute;

    setNewAlarm((prev) => ({ ...prev, hour: safeHour, minute: safeMinute }));
    setTimeDraft({
      hourText: String(safeHour).padStart(2, '0'),
      minuteText: String(safeMinute).padStart(2, '0'),
    });
  };


  const handleSaveAlarm = async () => {
    if (blockIfExternalSync()) return;
    const nextErrors = validateAlarmForm();
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const hour12 = parseInt(timeDraft.hourText, 10);
    const minute = parseInt(timeDraft.minuteText, 10);
    if (!Number.isFinite(hour12) || hour12 < 1 || hour12 > 12 || !Number.isFinite(minute) || minute < 0 || minute > 59) {
      setFormErrors((prev) => ({ ...prev, time: 'Ingresa una hora válida.' }));
      return;
    }

    // Validación Volumen Bajo
    if (newAlarm.soundUri && newAlarm.soundVolume < 0.3) {
        Alert.alert(
            "Volumen Bajo",
            "El volumen de la alarma parece estar muy bajo. ¿Deseas aumentarlo antes de guardar para asegurarte de escucharlo?",
            [
                { text: "Mantener así", onPress: () => proceedSave() },
                { text: "Subir volumen", onPress: () => {} } // Se queda en modal
            ]
        );
        return; 
    }

    proceedSave();
  };

  const handleAddVisibleReminder = (id) => {
    if (!visibleReminderIds.includes(id)) {
        const newIds = [...visibleReminderIds, id];
        setVisibleReminderIds(newIds);
        saveVisibleReminders(newIds);
        setReminderAddModalVisible(false);
        showToast({ type: 'success', title: 'Añadido', message: 'Recordatorio visible agregado.' });
    }
  };
  
  const handleRemoveVisibleReminder = (id, type) => {
      setReminderActionType(type);
      setAlarmToDeleteId(id); 
      setRemoveCardModalVisible(true);
  };

  const proceedSave = async () => {
    const hour12 = parseInt(timeDraft.hourText, 10);
    const minute = parseInt(timeDraft.minuteText, 10);
    
    // Dosis 1
    const hour24 = convertTo24Hour(hour12, period);
    const formattedHour = String(hour24).padStart(2, '0');
    const formattedMinute = String(minute).padStart(2, '0');

    // Dosis 2 (opcional)
    const timesArr = [{ hour: hour24, minute }];
    if (showSecondDose) {
      const d2h12 = parseInt(dose2Draft.hourText, 10);
      const d2m = parseInt(dose2Draft.minuteText, 10);
      const d2h24 = convertTo24Hour(d2h12, dose2Period);
      timesArr.push({ hour: d2h24, minute: d2m });
    }
    if (showThirdDose) {
      const d3h12 = parseInt(dose3Draft.hourText, 10);
      const d3m = parseInt(dose3Draft.minuteText, 10);
      const d3h24 = convertTo24Hour(d3h12, dose3Period);
      timesArr.push({ hour: d3h24, minute: d3m });
    }

    // Mensaje countdown para la primera dosis
    const durationMsg = getAlarmCountdownMessage({
        hour12Text: timeDraft.hourText,
        minuteText: timeDraft.minuteText,
        periodValue: period,
        days: newAlarm.days,
    });

    // Asegurar permisos antes de programar (Android 13+ requiere POST_NOTIFICATIONS).
    // Si no está otorgado, evitamos intentar programar y devolvemos un mensaje claro.
    try {
      const granted = await registerForPushNotificationsAsync();
      if (!granted) {
        Alert.alert(
          'Permisos requeridos',
          'No se puede programar la alarma porque la app no tiene permiso de Notificaciones. Actívalo en Ajustes → Apps → AppMedicamentos → Notificaciones y vuelve a intentar.'
        );
        return;
      }
    } catch (_e) {
      // Si falla el chequeo de permisos, seguimos y dejaremos que el scheduler reporte el error.
    }

    try {
      if (editingAlarmId) {
        const updatedAlarms = [...alarms];
        const idx = updatedAlarms.findIndex(a => a.id === editingAlarmId);
        if (idx === -1) return;

        // Cancelar notificaciones previas si estaba activo
        if (updatedAlarms[idx].active) {
          await cancelMedicationNotification(updatedAlarms[idx].notificationIds);
        }

        let notificationIds = null;
        // Asumiendo que al editar sigue activo por defecto, o depende del estado previo
        // Usaremos active: true para ser consistentes si estaba activo
        const isActive = updatedAlarms[idx].active !== false; 
        
        const alarmToSchedule = {
            ...updatedAlarms[idx],
            ...newAlarm, // Pisar con nuevos datos
            id: updatedAlarms[idx].id,
            hour: formattedHour,
            minute: formattedMinute,
            times: timesArr,
        };
        
        if (isActive) {
          notificationIds = await scheduleMedicationNotification(alarmToSchedule);
        }

        updatedAlarms[idx] = {
          ...alarmToSchedule,
          active: isActive,
          notificationIds,
        };

        setAlarms(updatedAlarms);
        saveAlarmsToStorage(updatedAlarms);
        showToast({
          type: 'success',
          title: 'Actualizada',
          message: durationMsg || 'El recordatorio fue actualizado correctamente.',
        });
      } else {
        const newId = Date.now().toString();
        const alarmDataToSchedule = {
          ...newAlarm,
          id: newId,
          hour: formattedHour,
          minute: formattedMinute,
          times: timesArr,
        };

        const ids = await scheduleMedicationNotification(alarmDataToSchedule);
        
        const newAlarmObj = {
          ...alarmDataToSchedule,
          active: true,
          notificationIds: ids
        };

        const updatedAlarms = [...alarms, newAlarmObj];
        setAlarms(updatedAlarms);
        saveAlarmsToStorage(updatedAlarms);

        // Añadir automáticamente a la vista de recordatorios
        const newVisibleIds = [...visibleReminderIds, newId];
        setVisibleReminderIds(newVisibleIds);
        saveVisibleReminders(newVisibleIds);

        // Notificar a cuidadores conectados
        notifyCaregivers(
          '🆕 Nuevo recordatorio',
          '[Nombre del paciente] acaba de añadir un nuevo recordatorio de [Nombre del medicamento]',
          { medName: alarmDataToSchedule.medName }
        ).catch(() => {});

        showToast({
          type: 'success',
          title: '¡Listo!',
          message: durationMsg || 'Tu recordatorio se creó y quedó programado.',
        });
      }

      setModalVisible(false);
      resetForm();
    } catch (error) {
      console.error(error);
      const msg = String(error?.message || '').toLowerCase();
      const extraHint =
        msg.includes('exact') && msg.includes('alarm')
          ? '\n\nEn Android, revisa también Ajustes → Acceso especial → Alarmas y recordatorios.'
          : '';
      Alert.alert('Error', `No se pudo programar la notificación.${extraHint}`);
    }
  };

  const handleDeleteAlarm = (id) => {
      if (blockIfExternalSync()) return;
      setAlarmToDeleteId(id);
      setDeleteModalVisible(true);
  };

  const confirmDeleteAlarm = async () => {
     if (!alarmToDeleteId) return;
     
     const id = alarmToDeleteId;
     // Cerrar modal inmediatamente para evitar que se vea congelado
     setDeleteModalVisible(false);
     setAlarmToDeleteId(null);

     const alarm = alarms.find(a => a.id === id);
     if (alarm) await cancelMedicationNotification(alarm.notificationIds);
     const updatedAlarms = alarms.filter(a => a.id !== id);
     setAlarms(updatedAlarms);

     // Eliminar directamente de Supabase para garantizar consistencia
     try {
       const { data: { user } } = await authService.getCurrentUser();
       if (user) {
         await supabase.from('reminders').delete().eq('id', id).eq('user_id', user.id);
       }
     } catch (_e) {
       console.warn('Error eliminando alarma de Supabase:', _e);
     }

     await saveAlarmsToStorage(updatedAlarms);

     // Eliminar también de la lista de recordatorios visibles
     const newVisibleIds = visibleReminderIds.filter(vid => vid !== id);
     setVisibleReminderIds(newVisibleIds);
     saveVisibleReminders(newVisibleIds);

     showToast({
       type: 'success',
       title: 'Recordatorio eliminado',
       message: 'El recordatorio fue eliminado exitosamente.',
     });
  };

  const handleToggleAlarm = async (id, value) => {
    if (blockIfExternalSync()) return;
    const updatedAlarms = [...alarms];
    const index = updatedAlarms.findIndex(a => a.id === id);
    if (index === -1) return;

    const alarm = updatedAlarms[index];
    const prevActive = !!alarm.active;
    const nextActive = !!value;

    // Optimista: actualiza UI/animación inmediatamente
    alarm.active = nextActive;
    setAlarms(updatedAlarms);

    setTogglingById((prev) => ({ ...prev, [id]: true }));
    try {
      if (nextActive) {
        const granted = await registerForPushNotificationsAsync();
        if (!granted) {
          // Revertimos el toggle optimista y avisamos.
          alarm.active = false;
          setAlarms([...updatedAlarms]);
          showToast({
            type: 'error',
            title: 'Permiso requerido',
            message: 'Activa las notificaciones para poder programar alarmas.',
          });
          return;
        }

        // Higiene Android: si había notificaciones pegadas/presentadas de esta alarma,
        // las descartamos para que no parezca que “se disparó de una”.
        await dismissPresentedNotificationsForAlarm(alarm);

        // Defensa: si por algún motivo quedaron notificaciones previas agendadas,
        // las cancelamos antes de reprogramar para evitar duplicados.
        await cancelMedicationNotification(alarm.notificationIds);
        const ids = await scheduleMedicationNotification(alarm);
        alarm.notificationIds = ids;
        showToast({
          type: 'success',
          title: 'Alarma activada',
          message: 'Se volvió a programar correctamente.',
        });
      } else {
        // En Android, si la notificación ya se mostró (y más con `sticky: true`),
        // puede quedar pegada en la bandeja aunque cancelemos las programadas.
        await dismissPresentedNotificationsForAlarm(alarm);
        await cancelMedicationNotification(alarm.notificationIds);
        alarm.notificationIds = null;
        showToast({
          type: 'info',
          title: 'Alarma desactivada',
          message: 'No se enviarán notificaciones hasta que la actives.',
        });
      }

      setAlarms([...updatedAlarms]);
      saveAlarmsToStorage(updatedAlarms);
    } catch (e) {
      console.error(e);
      // Revertir si algo falla
      alarm.active = prevActive;
      setAlarms([...updatedAlarms]);
      saveAlarmsToStorage(updatedAlarms);
      showToast({
        type: 'error',
        title: 'Ups…',
        message: 'No se pudo cambiar el estado de la alarma.',
      });
    } finally {
      setTogglingById((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleToggleShare = (id, newValue) => {
    if (blockIfExternalSync()) return;
    const updatedAlarms = alarms.map(alarm => {
      if (alarm.id === id) {
        return { ...alarm, shared: newValue };
      }
      return alarm;
    });
    setAlarms(updatedAlarms);
    saveAlarmsToStorage(updatedAlarms);
  };

  const handleEditAlarm = async (alarm) => {
    if (blockIfExternalSync()) return;
    // Si estábamos reproduciendo algo, parar
    if (soundPreview) {
        await soundPreview.unloadAsync();
        setSoundPreview(null);
        setIsPlayingPreview(false);
    }

    const { hour, period: periodValue } = convertTo12Hour(alarm.hour);

    setNewAlarm({
      medName: alarm.medName,
      medStrength: alarm.medStrength || '',
      medStrengthUnit: alarm.medStrengthUnit || 'mg',
      quantityToTake: alarm.quantityToTake || '',
      dosage: alarm.dosage,
      medType: alarm.medType,
      frequencyHours: alarm.frequencyHours,
      days: Array.isArray(alarm.days) ? alarm.days : [],
      hour,
      minute: parseInt(alarm.minute, 10) || 0,
      reminderMinutes: alarm.reminderMinutes ?? 5,
      soundUri: alarm.soundUri || null,
      soundVolume: alarm.soundVolume ?? 1.0,
      soundStartSeconds: alarm.soundStartSeconds ?? 0,
    });
    setTimeDraft({
      hourText: String(hour).padStart(2, '0'),
      minuteText: String(parseInt(alarm.minute, 10) || 0).padStart(2, '0'),
    });
    setPeriod(periodValue);

    // Cargar segunda y tercera dosis si existen
    const times = Array.isArray(alarm.times) ? alarm.times : [];
    if (times[1]) {
      const d2 = convertTo12Hour(times[1].hour);
      setDose2Draft({
        hourText: String(d2.hour).padStart(2, '0'),
        minuteText: String(parseInt(times[1].minute, 10) || 0).padStart(2, '0'),
      });
      setDose2Period(d2.period);
      setShowSecondDose(true);
    } else {
      setDose2Draft({ hourText: '12', minuteText: '00' });
      setDose2Period('AM');
      setShowSecondDose(false);
    }
    if (times[2]) {
      const d3 = convertTo12Hour(times[2].hour);
      setDose3Draft({
        hourText: String(d3.hour).padStart(2, '0'),
        minuteText: String(parseInt(times[2].minute, 10) || 0).padStart(2, '0'),
      });
      setDose3Period(d3.period);
      setShowThirdDose(true);
    } else {
      setDose3Draft({ hourText: '12', minuteText: '00' });
      setDose3Period('AM');
      setShowThirdDose(false);
    }

    setEditingAlarmId(alarm.id);
    setModalVisible(true);
  };

  const loadToneLibrary = async () => {
      try {
          const stored = await AsyncStorage.getItem('@app_medicamentos_tones');
          if (stored) {
              setToneLibrary(JSON.parse(stored));
          }
      } catch (e) { console.warn("Error cargando tonos", e); }
  };

  const saveToneLibrary = async (library) => {
      try {
          await AsyncStorage.setItem('@app_medicamentos_tones', JSON.stringify(library));
      } catch (e) { console.warn("Error guardando tonos", e); }
  };

  const handleAddTone = () => {
    setToneAlertVisible(true);
  };
  
  const confirmAddTone = async () => {
    setToneAlertVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/mpeg', 'audio/mp3', 'audio/*'], 
        copyToCacheDirectory: true, 
      });

      if (result.canceled) return;
      
      const asset = result.assets ? result.assets[0] : result;
      if (!asset) return;

      // Obtener duración para mejor UX
      let durationSeconds = 0;
      try {
          const { sound, status } = await Audio.Sound.createAsync({ uri: asset.uri });
          if (status.isLoaded) {
              durationSeconds = status.durationMillis / 1000;
              await sound.unloadAsync();
          }
      } catch (e) { 
          // Si falla carga, asumimos duración default o 0
          console.log("No se pudo obtener duración inicial", e);
      }

      const newTone = {
          id: Date.now().toString(),
          name: asset.name || 'Tono personalizado',
          uri: asset.uri,
          duration: durationSeconds
      };

      const newLib = [...toneLibrary, newTone];
      setToneLibrary(newLib);
      saveToneLibrary(newLib);
      
      // Auto seleccionar el nuevo tono
      selectToneForAlarm(newTone);

    } catch (err) {
      console.warn("Error agregando tono", err);
      Alert.alert('Error', 'No se pudo cargar el archivo de audio.');
    }
  };

  const selectToneForAlarm = async (tone) => {
      // Detener previas
      if (soundPreview) {
          await soundPreview.unloadAsync();
          setSoundPreview(null);
          setIsPlayingPreview(false);
      }
      
      setNewAlarm(prev => ({ 
          ...prev, 
          soundUri: tone.uri, 
          soundName: tone.name, // Guardamos nombre para mostrar
          soundStartSeconds: 0 // Reset inicio al cambiar cancion
      }));
      setSelectedToneDuration(tone.duration || 180); // Default 3 min si no hay info
  };

  const handleDeleteTone = (id) => {
      const newLib = toneLibrary.filter(t => t.id !== id);
      setToneLibrary(newLib);
      saveToneLibrary(newLib);
      if (newAlarm.soundUri && toneLibrary.find(t => t.id === id)?.uri === newAlarm.soundUri) {
          setNewAlarm(prev => ({ ...prev, soundUri: null, soundName: null }));
      }
  };

  // Preview "Estilo Instagram" en el modal/config
  const handleScrubberChange = async (val) => {
      setNewAlarm(prev => ({ ...prev, soundStartSeconds: val }));
      if (soundPreview) {
          // Si está sonando, saltar a esa posición
          if (isPlayingPreview) {
             await soundPreview.playFromPositionAsync(val * 1000);
          } else {
             await soundPreview.setPositionAsync(val * 1000);
          }
      }
  };

  const resetForm = async () => {
    // Detener preview si hay
    if (soundPreview) {
      await soundPreview.unloadAsync();
      setSoundPreview(null);
      setIsPlayingPreview(false);
    }

    setNewAlarm({ medName: '', medStrength: '', dosage: '', medType: '', medStrengthUnit: 'mg', quantityToTake: '', frequencyHours: '8', days: [], hour: 12, minute: 0, reminderMinutes: 5, soundUri: null, soundVolume: 1.0, soundStartSeconds: 0 });
    setPeriod('AM');
    setTimeDraft({ hourText: '12', minuteText: '00' });
    setDose2Draft({ hourText: '12', minuteText: '00' });
    setDose2Period('AM');
    setShowSecondDose(false);
    setDose3Draft({ hourText: '12', minuteText: '00' });
    setDose3Period('AM');
    setShowThirdDose(false);
    setEditingAlarmId(null);
    setFormErrors({});
    setMedTypePickerVisible(false);
  };

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true, // importante en Android
      });

      if (result.canceled) return;
      
      const asset = result.assets ? result.assets[0] : result; // Manejo compatibilidad
      if (!asset) return;
      
      setNewAlarm(prev => ({ ...prev, soundUri: asset.uri }));

      // Cargar preview temporal
      if (soundPreview) {
        await soundPreview.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync({ uri: asset.uri });
      setSoundPreview(sound);
      setIsPlayingPreview(false);

    } catch (err) {
      console.warn("Error picking audio", err);
      Alert.alert('Error', 'No se pudo seleccionar el audio.');
    }
  };

  const handlePreviewPlay = async () => {
    if (!newAlarm.soundUri) return;
    try {
      if (isPlayingPreview) {
        if (soundPreview) await soundPreview.pauseAsync();
        setIsPlayingPreview(false);
      } else {
        if (!soundPreview) {
             const { sound } = await Audio.Sound.createAsync({ uri: newAlarm.soundUri });
             setSoundPreview(sound);
             // Usar volumen del sistema (1.0 multiplicador), ya que VolumeManager controla el dispositivo
             await sound.setVolumeAsync(1.0); 
             await sound.playFromPositionAsync(newAlarm.soundStartSeconds * 1000);
             setIsPlayingPreview(true);
        } else {
             // Usar volumen del sistema (1.0 multiplicador)
             await soundPreview.setVolumeAsync(1.0);
             await soundPreview.playFromPositionAsync(newAlarm.soundStartSeconds * 1000);
             setIsPlayingPreview(true);
        }
      }
    } catch (e) {
      console.warn("Error previewing audio", e);
    }
  };

  const handleVolumeChange = async (val) => {
    setNewAlarm(prev => ({ ...prev, soundVolume: val }));
    
    // Sincronizar volumen del dispositivo
    try {
        await VolumeManager.setVolume(val);
    } catch (e) { console.warn("Cannot set device volume", e); }
    
    // Si tenemos preview, mantener el multiplicador en 1.0 (máx del sistema) para que se escuche el cambio real
    if (soundPreview) {
      await soundPreview.setVolumeAsync(1.0);
    }
  };

  useEffect(() => {
    let volumeListener = null;

    if (modalVisible) {
       // Obtener volumen inicial al abrir el modal
       VolumeManager.getVolume().then((v) => { 
          if(v && typeof v.volume === 'number') {
              setNewAlarm(prev => ({ ...prev, soundVolume: v.volume }));
          }
       });
       
       // Escuchar cambios fisicos (botones)
       volumeListener = VolumeManager.addVolumeListener((data) => {
          setNewAlarm(prev => ({ ...prev, soundVolume: data.volume }));
       });
    }

    return () => {
        if (volumeListener) volumeListener.remove();
    };
  }, [modalVisible]);



  const toggleDay = (day) => {
    const exists = newAlarm.days.includes(day);
    const nextDays = exists ? newAlarm.days.filter(d => d !== day) : [...newAlarm.days, day];
    setNewAlarm({ ...newAlarm, days: nextDays });
  };

  const handleSelectAllDays = () => {
    if (newAlarm.days.length === weekDays.length) {
      setNewAlarm({ ...newAlarm, days: [] });
    } else {
      setNewAlarm({ ...newAlarm, days: weekDays.map(d => d.full) });
      clearError('days');
    }
  };

  const handleHourChange = (text) => {
    setTimeDraft((prev) => ({ ...prev, hourText: sanitizeTwoDigits(text) }));
    clearError('time');
  };

  const handleMinuteChange = (text) => {
    setTimeDraft((prev) => ({ ...prev, minuteText: sanitizeTwoDigits(text) }));
    clearError('time');
  };

  const convertTo24Hour = (hour12, period) => {
    let hour24 = hour12;
    if (period === 'PM' && hour12 !== 12) hour24 = hour12 + 12;
    if (period === 'AM' && hour12 === 12) hour24 = 0;
    return hour24;
  };

  const convertTo12Hour = (hour24) => {
    const h24 = parseInt(hour24, 10);
    const periodValue = h24 >= 12 ? 'PM' : 'AM';
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return { hour: h12, period: periodValue };
  };

  const getAlarmCountdownMessage = ({ hour12Text, minuteText, periodValue, days }) => {
    const hour12 = parseInt(hour12Text, 10);
    const minute = parseInt(minuteText, 10);
    if (!Number.isFinite(hour12) || hour12 < 1 || hour12 > 12 || !Number.isFinite(minute) || minute < 0 || minute > 59) {
      return '';
    }

    const hour24 = convertTo24Hour(hour12, periodValue);
    if (!Number.isFinite(hour24)) return '';

    const now = new Date();
    const target = new Date(now);
    target.setHours(hour24, minute, 0, 0);

    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    if (Array.isArray(days) && days.length > 0) {
      const dayIndexToName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const allowed = new Set(days);
      while (!allowed.has(dayIndexToName[target.getDay()])) {
        target.setDate(target.getDate() + 1);
      }
    }

    const diffMs = target - now;
    const totalMinutes = Math.max(0, Math.round(diffMs / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `La alarma sonará en ${hours} horas y ${minutes} minutos`;
  };

  const countdownMessage = getAlarmCountdownMessage({
    hour12Text: timeDraft.hourText,
    minuteText: timeDraft.minuteText,
    periodValue: period,
    days: newAlarm.days,
  });

  const saveButtonLabel = editingAlarmId ? 'Actualizar alarma' : 'Guardar y Programar';

  return (
    <LinearGradient
      colors={isDark ? ['#1a1f3c', '#0f172a', '#000000'] : ['#667eea', '#764ba2', '#f093fb']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{activeTab === 'recordatorios' ? 'Crea tus recordatorios' : 'Alarma y Recordatorios'}</Text>
        </View>

        {!!toast && (
          <Animatable.View
            ref={toastRef}
            animation="slideInDown"
            duration={300}
            style={styles.toastWrap}
          >
            <LinearGradient
              colors={
                toast.type === 'error'
                  ? ['#ff5f6d', '#ffc371']
                  : toast.type === 'info'
                    ? ['#4facfe', '#00f2fe']
                    : ['#667eea', '#764ba2']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.toastCard}
            >
              <View style={styles.toastIcon}>
                <Ionicons
                  name={toast.type === 'error' ? 'alert-circle' : toast.type === 'info' ? 'information-circle' : 'checkmark-circle'}
                  size={22}
                  color="#fff"
                />
              </View>
              <View style={styles.toastTextWrap}>
                <Text style={styles.toastTitle}>{toast.title}</Text>
                <Text style={styles.toastMessage} numberOfLines={2}>
                  {toast.message}
                </Text>
              </View>
            </LinearGradient>
          </Animatable.View>
        )}

        {externalSyncActive && (
          <View style={styles.syncWarningCard}>
            <Ionicons name="alert-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.syncWarningText}>
              Tus alarmas y recordatorios están deshabilitados por sincronización externa.
            </Text>
          </View>
        )}

        <ScrollView 
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: scrollBottomPadding, flexGrow: 1 }
          ]}
          style={{ flex: 1 }}
        >
          {activeTab === 'alarmas' ? (
            alarms.length === 0 ? (
              <Animatable.View animation="fadeIn" style={styles.emptyStateTransparent}>
                <Ionicons name="alarm-outline" size={80} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyStateTextTransparent}>No tienes alarmas configuradas</Text>
              </Animatable.View>
            ) : (
              alarms.map((alarm, index) => (
                <Animatable.View 
                  key={alarm.id} 
                  animation="fadeInUp" 
                  delay={index * 100}
                  style={[styles.alarmCard, !alarm.active && styles.alarmCardNoShadow]} // Aplicado estilo para quitar sombra
                >
                  <LinearGradient
                    colors={alarm.active ? (isDark ? ['#2d3748', '#1a202c'] : ['rgba(255,255,255,0.98)','rgba(235,238,255,0.95)']) : (isDark ? ['#1a202c', '#171923'] : ['rgba(255,255,255,0.5)','rgba(230,230,240,0.3)'])}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.alarmCardGradient, !alarm.active && styles.alarmCardInactive, isDark && {borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)'}]} 
                  >
                    <View style={styles.alarmInfo}>
                      <View style={styles.timeRow}>
                        <Text style={[styles.alarmTime, !alarm.active && styles.mutedText, isDark && {color: '#fff'}]}>
                          {Array.isArray(alarm.times) && alarm.times.length > 0
                            ? alarm.times.map(t => `${String(t.hour).padStart(2,'0')}:${String(t.minute).padStart(2,'0')}`).join(' • ')
                            : `${alarm.hour}:${alarm.minute}`}
                        </Text>
                      </View>
                      <Text style={[styles.alarmMedName, !alarm.active && styles.mutedText, isDark && {color: '#e2e8f0'}]}>{alarm.medName}</Text>
                      <Text style={[styles.alarmDose, !alarm.active && styles.mutedText, isDark && {color: '#cbd5e1'}]}>
                        {alarm.medStrengthUnit ? `${alarm.medStrengthUnit.toUpperCase()}` : ''}
                        {alarm.medStrength ? ` · ${alarm.medStrength}` : ''}
                      </Text>
                      <View style={styles.daysContainer}>
                        {Array.isArray(alarm.days) && alarm.days.length > 0 ? (
                           [...alarm.days]
                           .sort((a, b) => weekDays.findIndex(d => d.full === a) - weekDays.findIndex(d => d.full === b))
                           .map((day, idx) => (
                              <View key={idx} style={[styles.dayBadge, !alarm.active && styles.dayBadgeInactive, isDark && {backgroundColor: 'rgba(255,255,255,0.1)'}]}>
                                <Text style={[styles.dayBadgeText, !alarm.active && styles.dayBadgeTextInactive, isDark && {color: '#e2e8f0'}]}>
                                  {weekDayShort[day] || day}
                                </Text>
                              </View>
                           ))
                        ) : (
                          <Text style={[styles.alarmDose, !alarm.active && styles.mutedText, isDark && {color: '#cbd5e1'}]}>—</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.alarmActions}>
                      <AlarmToggle
                        value={alarm.active}
                        disabled={externalSyncActive || !!togglingById[alarm.id]}
                        onChange={(val) => handleToggleAlarm(alarm.id, val)}
                      />
                      <View style={styles.actionButtonsRow}>
                        <TouchableOpacity 
                          style={[
                             styles.iconButton, 
                            !alarm.active && styles.iconButtonInactive,
                            externalSyncActive && { opacity: 0.5 }
                          ]}
                          disabled={externalSyncActive}
                          onPress={() => handleEditAlarm(alarm)}
                        >
                          <Ionicons 
                             name="pencil" 
                             size={20} 
                            color={!alarm.active ? "#7b7b8a" : "#667eea"} 
                          />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[
                             styles.iconButton, 
                             styles.iconButtonDelete,
                            !alarm.active && styles.iconButtonInactive,
                            externalSyncActive && { opacity: 0.5 }
                          ]}
                          disabled={externalSyncActive}
                          onPress={() => handleDeleteAlarm(alarm.id)}
                        >
                          <Ionicons 
                             name="trash-outline" 
                             size={20} 
                             color={!alarm.active ? "#7b7b8a" : "#ff4444"} 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </LinearGradient>
                </Animatable.View>
              ))
            )
          ) : (
            visibleReminderIds.length === 0 ? (
              <Animatable.View animation="fadeIn" style={styles.emptyStateTransparent}>
                <Ionicons name="albums-outline" size={80} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyStateTextTransparent}>No tienes recordatorios configurados</Text>
              </Animatable.View>
            ) : (
              visibleReminderIds.map((id, index) => {
                 const alarm = alarms.find(a => a.id === id);
                 if (!alarm) return null;
                 return (
                    <Animatable.View 
                      key={id} 
                      animation="fadeInUp" 
                      delay={index * 100}
                    >
                       <ReminderCard 
                           alarm={alarm}
                           lastTaken={lastTakenMap[id]}
                           onDelete={() => handleRemoveVisibleReminder(id, 'delete')}
                       />
                    </Animatable.View>
                 );
              })
            )
          )}
        </ScrollView>



        {activeTab === 'alarmas' && (
          <Animatable.View
            animation="zoomIn"
            duration={500}
            style={[styles.fab, { bottom: fabBottom }]}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.fabTouchable}
              onPress={() => {
                if (blockIfExternalSync()) return;
                setModalVisible(true);
                resetForm();
              }}
            >
              <LinearGradient
                colors={isDark ? ['#4c1d95', '#6d28d9', '#8b5cf6'] : ['#667eea', '#764ba2', '#f093fb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.fabGradient}
              >
                <Ionicons name="add" size={34} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animatable.View>
        )}

        {activeTab === 'recordatorios' && (
          <Animatable.View
            animation="zoomIn"
            duration={500}
            style={[styles.fab, { bottom: fabBottom }]}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.fabTouchable}
              onPress={() => {
                if (blockIfExternalSync()) return;
                setModalVisible(true);
                resetForm();
              }}
            >
              <LinearGradient
                 colors={isDark ? ['#4c1d95', '#6d28d9', '#8b5cf6'] : ['#667eea', '#764ba2', '#f093fb']}
                 start={{ x: 0, y: 0 }}
                 end={{ x: 1, y: 1 }}
                 style={styles.fabGradient}
              >
                <Ionicons name="add" size={34} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animatable.View>
        )}

        <Modal
          visible={reminderAddModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setReminderAddModalVisible(false)}
        >
          <View style={styles.modalAddOverlay}>
              <Animatable.View 
                animation="zoomIn"
                duration={300}
                style={[styles.modalAddContent, { backgroundColor: isDark ? theme.card : '#fff' }]}
              >
                  <Text style={[styles.modalAddTitle, { color: isDark ? theme.text : '#333' }]}>
                      Añadir Recordatorio
                  </Text>
                  
                  <ScrollView style={styles.modalAddList}>
                      {alarms.filter(a => a.active).length === 0 ? (
                          <View style={{ alignItems: 'center', padding: 20 }}>
                              <Ionicons name="alert-circle-outline" size={40} color={isDark ? theme.textSecondary : '#ccc'} />
                              <Text style={{ textAlign: 'center', color: isDark ? theme.textSecondary : '#666', marginTop: 10 }}>
                                  No tienes alarmas activas para añadir.
                              </Text>
                          </View>
                      ) : (
                          alarms.filter(a => a.active).map((alarm) => {
                             const isAdded = visibleReminderIds.includes(alarm.id);
                             if (isAdded) return null; 
                             return (
                                 <TouchableOpacity 
                                    key={alarm.id}
                                    style={[styles.modalAddItem, { 
                                        backgroundColor: isDark ? '#2d3748' : '#f8fafc',
                                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                                    }]}
                                    onPress={() => handleAddVisibleReminder(alarm.id)}
                                 >
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#48bb78', marginRight: 12 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: '600', fontSize: 16, color: isDark ? '#fff' : '#2d3748' }}>{alarm.medName}</Text>
                                        <Text style={{ fontSize: 13, color: isDark ? '#a0aec0' : '#718096', marginTop: 2 }}>{alarm.hour}:{alarm.minute} • {alarm.medType}</Text>
                                    </View>
                                    <Ionicons name="add-circle" size={28} color={isDark ? '#a0aec0' : '#667eea'} />
                                 </TouchableOpacity>
                             );
                          })
                      )}
                      
                      {alarms.filter(a => a.active).every(a => visibleReminderIds.includes(a.id)) && alarms.filter(a => a.active).length > 0 && (
                          <View style={{ padding: 20 }}>
                              <Text style={{ textAlign: 'center', color: isDark ? theme.textSecondary : '#999' }}>
                                  Todas tus alarmas activas ya están en la lista.
                              </Text>
                          </View>
                      )}
                  </ScrollView>

                  <TouchableOpacity 
                      style={[styles.modalAddCloseButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f2f6' }]}
                      onPress={() => setReminderAddModalVisible(false)}
                  >
                      <Text style={[styles.modalAddCloseText, { color: isDark ? '#fff' : '#555' }]}>Cerrar</Text>
                  </TouchableOpacity>
              </Animatable.View>
          </View>
        </Modal>

        {/* Modal de eliminación personalizado */}
        <Modal
          visible={deleteModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <View style={styles.modalAddOverlay}>
            <Animatable.View
              animation="zoomIn"
              duration={300}
              style={[styles.modalAddContent, { backgroundColor: isDark ? theme.card : '#fff' }]}
            >
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View style={[styles.modalAlertIconCircle, isDark && {backgroundColor: 'rgba(255, 68, 68, 0.1)'}]}>
                  <Ionicons name="trash-outline" size={32} color="#f5576c" />
                </View>
              </View>
              
              <Text style={[styles.modalAddTitle, { color: isDark ? theme.text : '#333' }]}>Eliminar Alarma</Text>
              <Text style={[{ fontSize: 16, color: isDark ? theme.textSecondary : '#555', textAlign: 'center', marginBottom: 24, paddingHorizontal: 10 }]}>
                ¿Estás seguro de que quieres eliminar esta alarma? Esta acción no se puede deshacer.
              </Text>
              
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0', alignItems: 'center' }}
                  onPress={() => setDeleteModalVisible(false)}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#fff' : '#666' }}>CANCELAR</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1, borderRadius: 14, overflow: 'hidden' }}
                  onPress={confirmDeleteAlarm}
                >
                  <LinearGradient
                    colors={['#ff416c', '#ff4b2b']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                  >
                    <Ionicons name="trash-bin-outline" size={18} color="#fff" />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>QUITAR</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animatable.View>
          </View>
        </Modal>

        {/* Modal de remover tarjeta de la vista */}
        <Modal
          visible={removeCardModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setRemoveCardModalVisible(false)}
        >
          <View style={styles.modalAddOverlay}>
            <Animatable.View
              animation="zoomIn"
              duration={300}
              style={[styles.modalAddContent, { backgroundColor: isDark ? theme.card : '#fff' }]}
            >
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View style={[styles.modalAlertIconCircle, isDark && {backgroundColor: 'rgba(255, 68, 68, 0.1)'}]}>
                  <Ionicons 
                    name={reminderActionType === 'delete' ? "trash-outline" : "eye-off-outline"} 
                    size={32} 
                    color="#f5576c" 
                  />
                </View>
              </View>
              
              <Text style={[styles.modalAddTitle, { color: isDark ? theme.text : '#333' }]}>
                {reminderActionType === 'delete' ? "Eliminar Recordatorio" : "Ocultar tarjeta"}
              </Text>
              <Text style={[{ fontSize: 16, color: isDark ? theme.textSecondary : '#555', textAlign: 'center', marginBottom: 24, paddingHorizontal: 10 }]}>
                 {reminderActionType === 'delete' 
                   ? "¿Estás seguro? Se eliminará completamente el recordatorio y el cuidador ya no lo verá."
                   : "¿Estás seguro de que quieres quitar este recordatorio de tu vista principal?"}
              </Text>
              
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0', alignItems: 'center' }}
                  onPress={() => setRemoveCardModalVisible(false)}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#fff' : '#666' }}>CANCELAR</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1, borderRadius: 14, overflow: 'hidden' }}
                  onPress={confirmRemoveCard}
                >
                  <LinearGradient
                    colors={['#ff416c', '#ff4b2b']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                  >
                    <Ionicons 
                      name={reminderActionType === 'delete' ? "trash-bin-outline" : "eye-off"} 
                      size={18} 
                      color="#fff" 
                    />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
                        {reminderActionType === 'delete' ? "ELIMINAR" : "OCULTAR"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animatable.View>
          </View>
        </Modal>

        {/* Modal Formulario Completo */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
              style={{ flex: 1 }}
            >
              <View style={styles.modalContainer}>
                <Animatable.View animation="zoomIn" duration={320} style={[styles.modalContent, isDark && {backgroundColor: '#1e293b', borderColor: '#334155'}]}>
                  <View style={styles.modalHeader}>
                      <Text style={[styles.modalTitle, isDark && {color: '#fff'}]}>Nuevo Recordatorio</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close-circle" size={32} color="#999" />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                {/* Nombre del medicamento */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isDark && {color: '#e2e8f0'}]}>Nombre del medicamento</Text>
                  <TextInput
                    style={[styles.textInput, !!formErrors.medName && styles.textInputError, isDark && {backgroundColor: '#334155', color: '#fff', borderColor: '#475569'}]}
                    placeholder="Ej. Paracetamol, Ibuprofeno..."
                    placeholderTextColor={isDark ? "#94a3b8" : "#999"}
                    value={newAlarm.medName}
                    onChangeText={(text) => {
                      setNewAlarm({ ...newAlarm, medName: text });
                      clearError('medName');
                    }}
                  />
                  {!!formErrors.medName && <Text style={styles.errorText}>{formErrors.medName}</Text>}
                </View>

                {/* Tipo de medicamento */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isDark && {color: '#e2e8f0'}]}>Tipo de medicamento</Text>
                  <Pressable
                    onPress={() => setMedTypePickerVisible(true)}
                    style={({ pressed }) => [
                      styles.dropdown,
                      pressed ? styles.dropdownPressed : null,
                      isDark && { backgroundColor: '#334155', borderColor: '#475569' }
                    ]}
                  >
                    <Text style={[styles.dropdownText, !newAlarm.medType && styles.dropdownPlaceholder, isDark && {color: newAlarm.medType ? '#fff' : '#94a3b8'}]}>
                      {newAlarm.medType || 'Selecciona un tipo'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#667eea" />
                  </Pressable>
                </View>

                {/* Dosis */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isDark && {color: '#e2e8f0'}]}>Dosis</Text>
                  <View style={styles.doseRow}>
                    <TextInput
                      style={[styles.textInput, styles.doseInput, isDark && {backgroundColor: '#334155', color: '#fff', borderColor: '#475569'}]}
                      keyboardType="numeric"
                      placeholder="Ej. 500"
                      placeholderTextColor={isDark ? "#94a3b8" : "#999"}
                      value={newAlarm.medStrength}
                      onChangeText={(text) => setNewAlarm({ ...newAlarm, medStrength: text })}
                    />
                    <TouchableOpacity
                      style={[
                        styles.dropdown,
                        { marginTop: 0, flex: 0, width: 90, marginLeft: 10 },
                        isDark && { backgroundColor: '#334155', borderColor: '#475569' }
                      ]}
                      onPress={() => setUnitPickerVisible(true)}
                    >
                      <Text style={[styles.dropdownText, isDark && {color: '#fff'}]}>
                        {strengthUnits.find(u => u.value === newAlarm.medStrengthUnit)?.full || 'Mg'}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color="#667eea" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Días de la semana */}
                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={[styles.inputLabel, { marginBottom: 0 }, isDark && {color: '#e2e8f0'}]}>Días de la semana</Text>
                    <TouchableOpacity onPress={handleSelectAllDays}>
                      <Text style={{ color: '#667eea', fontWeight: 'bold' }}>
                        {newAlarm.days.length === weekDays.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.weekSquaresWrap}>
                    {weekDays.map((dayObj) => {
                      const dayName = dayObj.full;
                      const selected = newAlarm.days.includes(dayName);
                      return (
                        <TouchableOpacity
                          key={dayName}
                          style={[styles.weekSquare, isDark && {backgroundColor: '#334155', borderColor: '#475569'}, selected && styles.weekSquareActive]}
                          onPress={() => {
                            toggleDay(dayName);
                            clearError('days');
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.weekSquareText, isDark && {color: '#cbd5e1'}, selected && styles.weekSquareTextActive]}>
                            {dayObj.short}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {!!formErrors.days && <Text style={styles.errorText}>{formErrors.days}</Text>}
                </View>

                {/* Recordar antes */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isDark && {color: '#e2e8f0'}]}>Recordar antes</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {reminderOptions.map(opt => {
                      const isActive = newAlarm.reminderMinutes === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[
                            styles.chip,
                            isActive && styles.chipActive,
                            isDark && !isActive && { backgroundColor: '#334155', borderColor: '#475569' },
                          ]}
                          onPress={() => setNewAlarm({ ...newAlarm, reminderMinutes: opt.value })}
                        >
                          <Text style={[
                            styles.chipText,
                            isActive && styles.chipTextActive,
                            isDark && !isActive && { color: '#cbd5e1' },
                          ]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Primera dosis */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isDark && {color: '#e2e8f0'}]}>Primera dosis</Text>
                  <View style={[styles.timePickerContainer, isDark && {backgroundColor: '#334155'}]}>
                    <View style={styles.timePickerColumn}>
                      <TextInput
                        style={[styles.timeInput, isDark && {color: '#fff', backgroundColor: '#1e293b', borderColor: '#475569', borderWidth: 1}]}
                        keyboardType="number-pad"
                        maxLength={2}
                        placeholder="12"
                        placeholderTextColor={isDark ? "#94a3b8" : "#999"}
                        value={timeDraft.hourText}
                        onChangeText={handleHourChange}
                        onBlur={commitTimeDraftToAlarm}
                        onSubmitEditing={() => minuteInputRef.current?.focus()}
                        returnKeyType="next"
                        blurOnSubmit={false}
                        selectTextOnFocus
                      />
                      <Text style={[styles.timePickerLabel, isDark && {color: '#cbd5e1'}]}>Hora</Text>
                    </View>
                    <Text style={[styles.timePickerSeparator, isDark && {color: '#e2e8f0'}]}>:</Text>
                    <View style={styles.timePickerColumn}>
                      <TextInput
                        ref={minuteInputRef}
                        style={[styles.timeInput, isDark && {color: '#fff', backgroundColor: '#1e293b', borderColor: '#475569', borderWidth: 1}]}
                        keyboardType="number-pad"
                        maxLength={2}
                        placeholder="00"
                        placeholderTextColor={isDark ? "#94a3b8" : "#999"}
                        value={timeDraft.minuteText}
                        onChangeText={handleMinuteChange}
                        onBlur={commitTimeDraftToAlarm}
                        selectTextOnFocus
                      />
                      <Text style={[styles.timePickerLabel, isDark && {color: '#cbd5e1'}]}>Minutos</Text>
                    </View>
                    <View style={styles.periodSelector}>
                      <TouchableOpacity
                        style={[styles.periodButton, period === 'AM' && styles.periodButtonActive]}
                        onPress={() => setPeriod('AM')}
                      >
                        <Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>AM</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.periodButton, period === 'PM' && styles.periodButtonActive]}
                        onPress={() => setPeriod('PM')}
                      >
                        <Text style={[styles.periodText, period === 'PM' && styles.periodTextActive]}>PM</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {!!formErrors.time && <Text style={styles.errorText}>{formErrors.time}</Text>}
                </View>

                {/* Segunda dosis (opcional) */}
                {!showSecondDose ? (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      paddingVertical: 10, marginBottom: 16, borderRadius: 10,
                      borderWidth: 1, borderStyle: 'dashed',
                      borderColor: isDark ? '#475569' : '#667eea',
                    }}
                    onPress={() => setShowSecondDose(true)}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#667eea" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#667eea', fontWeight: '600', fontSize: 15 }}>Añadir segunda dosis</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.inputGroup}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={[styles.inputLabel, { marginBottom: 0 }, isDark && {color: '#e2e8f0'}]}>Segunda dosis</Text>
                      <TouchableOpacity onPress={() => { setShowSecondDose(false); setShowThirdDose(false); }}>
                        <Text style={{ color: '#ff4444', fontWeight: '600' }}>Eliminar</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.timePickerContainer, isDark && {backgroundColor: '#334155'}]}>
                      <View style={styles.timePickerColumn}>
                        <TextInput
                          style={[styles.timeInput, isDark && {color: '#fff', backgroundColor: '#1e293b', borderColor: '#475569', borderWidth: 1}]}
                          keyboardType="number-pad"
                          maxLength={2}
                          placeholder="12"
                          placeholderTextColor={isDark ? "#94a3b8" : "#999"}
                          value={dose2Draft.hourText}
                          onChangeText={(text) => setDose2Draft(prev => ({ ...prev, hourText: sanitizeTwoDigits(text) }))}
                          onSubmitEditing={() => dose2MinuteRef.current?.focus()}
                          returnKeyType="next"
                          blurOnSubmit={false}
                          selectTextOnFocus
                        />
                        <Text style={[styles.timePickerLabel, isDark && {color: '#cbd5e1'}]}>Hora</Text>
                      </View>
                      <Text style={[styles.timePickerSeparator, isDark && {color: '#e2e8f0'}]}>:</Text>
                      <View style={styles.timePickerColumn}>
                        <TextInput
                          ref={dose2MinuteRef}
                          style={[styles.timeInput, isDark && {color: '#fff', backgroundColor: '#1e293b', borderColor: '#475569', borderWidth: 1}]}
                          keyboardType="number-pad"
                          maxLength={2}
                          placeholder="00"
                          placeholderTextColor={isDark ? "#94a3b8" : "#999"}
                          value={dose2Draft.minuteText}
                          onChangeText={(text) => setDose2Draft(prev => ({ ...prev, minuteText: sanitizeTwoDigits(text) }))}
                          selectTextOnFocus
                        />
                        <Text style={[styles.timePickerLabel, isDark && {color: '#cbd5e1'}]}>Minutos</Text>
                      </View>
                      <View style={styles.periodSelector}>
                        <TouchableOpacity
                          style={[styles.periodButton, dose2Period === 'AM' && styles.periodButtonActive]}
                          onPress={() => setDose2Period('AM')}
                        >
                          <Text style={[styles.periodText, dose2Period === 'AM' && styles.periodTextActive]}>AM</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.periodButton, dose2Period === 'PM' && styles.periodButtonActive]}
                          onPress={() => setDose2Period('PM')}
                        >
                          <Text style={[styles.periodText, dose2Period === 'PM' && styles.periodTextActive]}>PM</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    {!!formErrors.dose2Time && <Text style={styles.errorText}>{formErrors.dose2Time}</Text>}
                  </View>
                )}

                {/* Tercera dosis (opcional) - solo visible si hay segunda */}
                {showSecondDose && (!showThirdDose ? (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      paddingVertical: 10, marginBottom: 16, borderRadius: 10,
                      borderWidth: 1, borderStyle: 'dashed',
                      borderColor: isDark ? '#475569' : '#667eea',
                    }}
                    onPress={() => setShowThirdDose(true)}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#667eea" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#667eea', fontWeight: '600', fontSize: 15 }}>Añadir tercera dosis</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.inputGroup}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={[styles.inputLabel, { marginBottom: 0 }, isDark && {color: '#e2e8f0'}]}>Tercera dosis</Text>
                      <TouchableOpacity onPress={() => setShowThirdDose(false)}>
                        <Text style={{ color: '#ff4444', fontWeight: '600' }}>Eliminar</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.timePickerContainer, isDark && {backgroundColor: '#334155'}]}>
                      <View style={styles.timePickerColumn}>
                        <TextInput
                          style={[styles.timeInput, isDark && {color: '#fff', backgroundColor: '#1e293b', borderColor: '#475569', borderWidth: 1}]}
                          keyboardType="number-pad"
                          maxLength={2}
                          placeholder="12"
                          placeholderTextColor={isDark ? "#94a3b8" : "#999"}
                          value={dose3Draft.hourText}
                          onChangeText={(text) => setDose3Draft(prev => ({ ...prev, hourText: sanitizeTwoDigits(text) }))}
                          onSubmitEditing={() => dose3MinuteRef.current?.focus()}
                          returnKeyType="next"
                          blurOnSubmit={false}
                          selectTextOnFocus
                        />
                        <Text style={[styles.timePickerLabel, isDark && {color: '#cbd5e1'}]}>Hora</Text>
                      </View>
                      <Text style={[styles.timePickerSeparator, isDark && {color: '#e2e8f0'}]}>:</Text>
                      <View style={styles.timePickerColumn}>
                        <TextInput
                          ref={dose3MinuteRef}
                          style={[styles.timeInput, isDark && {color: '#fff', backgroundColor: '#1e293b', borderColor: '#475569', borderWidth: 1}]}
                          keyboardType="number-pad"
                          maxLength={2}
                          placeholder="00"
                          placeholderTextColor={isDark ? "#94a3b8" : "#999"}
                          value={dose3Draft.minuteText}
                          onChangeText={(text) => setDose3Draft(prev => ({ ...prev, minuteText: sanitizeTwoDigits(text) }))}
                          selectTextOnFocus
                        />
                        <Text style={[styles.timePickerLabel, isDark && {color: '#cbd5e1'}]}>Minutos</Text>
                      </View>
                      <View style={styles.periodSelector}>
                        <TouchableOpacity
                          style={[styles.periodButton, dose3Period === 'AM' && styles.periodButtonActive]}
                          onPress={() => setDose3Period('AM')}
                        >
                          <Text style={[styles.periodText, dose3Period === 'AM' && styles.periodTextActive]}>AM</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.periodButton, dose3Period === 'PM' && styles.periodButtonActive]}
                          onPress={() => setDose3Period('PM')}
                        >
                          <Text style={[styles.periodText, dose3Period === 'PM' && styles.periodTextActive]}>PM</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}

              </ScrollView>

              {/* Botón Guardar */}
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveAlarm}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButtonGradient}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.saveButtonText}>{saveButtonLabel}</Text>
                </LinearGradient>
              </TouchableOpacity>
                </Animatable.View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Modal de Biblioteca de Tonos */}
        <Modal
          animationType="slide"
          presentationStyle="fullScreen"
          visible={toneModalVisible}
          onRequestClose={() => setToneModalVisible(false)}
        >
             <LinearGradient
                colors={isDark ? ['#1a1f3c', '#0f172a', '#000000'] : ['#667eea', '#764ba2', '#f093fb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
             >
                <SafeAreaView style={{ flex: 1, paddingBottom: insets.bottom }}>
                
                {/* Header del Modal */}
                <View style={{
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    paddingHorizontal: 20,
                    paddingTop: 20,
                    paddingBottom: 10,
                }}>
                    <Text style={{
                        fontSize: 28, 
                        fontWeight: '800', 
                        color: '#fff', 
                        textAlign: 'center',
                        textShadowColor: 'rgba(0, 0, 0, 0.2)',
                        textShadowOffset: { width: 0, height: 2 },
                        textShadowRadius: 4,
                    }}>Mis Tonos</Text>
                </View>
                
                <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 100 + insets.bottom}}>
                    {toneLibrary.length === 0 ? (
                        <View style={{alignItems: 'center', marginVertical: 60}}>
                            <Ionicons name="musical-notes-outline" size={100} color="rgba(255,255,255,0.4)" />
                            <Text style={{marginTop: 20, fontSize: 18, color: '#fff', opacity: 0.9, textAlign: 'center', fontWeight: '600'}}>
                                No tienes tonos guardados aún.{'\n'}¡Importa tu música favorita!
                            </Text>
                        </View>
                    ) : (
                        <View style={{gap: 12}}>
                           {toneLibrary.map((tone) => {
                               const isSelected = newAlarm.soundUri === tone.uri;
                               return (
                                   <TouchableOpacity 
                                       key={tone.id}
                                       onPress={() => selectToneForAlarm(tone)}
                                       style={{
                                           flexDirection: 'row',
                                           alignItems: 'center',
                                           backgroundColor: isDark ? '#1e293b' : 'rgba(255, 255, 255, 0.95)',
                                           padding: 16,
                                           borderRadius: 20,
                                           borderWidth: isSelected ? 3 : 0,
                                           borderColor: isSelected ? '#fff' : 'transparent',
                                           shadowColor: '#000',
                                           shadowOffset: {width: 0, height: 4},
                                           shadowOpacity: 0.15,
                                           shadowRadius: 8,
                                           elevation: 4
                                       }}
                                   >
                                       <View style={{
                                           width: 48, 
                                           height: 48, 
                                           borderRadius: 24, 
                                           backgroundColor: isSelected ? 'rgba(102, 126, 234, 0.15)' : (isDark ? '#334155' : '#f0f0f0'),
                                           alignItems: 'center', 
                                           justifyContent: 'center',
                                           marginRight: 14
                                       }}>
                                           <Ionicons 
                                               name={isSelected ? "musical-note" : "musical-note-outline"} 
                                               size={24} 
                                               color={isSelected ? "#667eea" : (isDark ? '#cbd5e1' : "#888")} 
                                           />
                                       </View>
                                       
                                       <View style={{flex: 1}}>
                                           <Text style={{
                                               fontSize: 17, 
                                               fontWeight: isSelected ? '800' : '600',
                                               color: isDark ? '#fff' : '#333',
                                               marginBottom: 4
                                           }}>
                                               {tone.name}
                                           </Text>
                                           <Text style={{fontSize: 13, color: isDark ? '#cbd5e1' : '#666', fontWeight: '500'}}>
                                               {Math.floor(tone.duration / 60)}:{(Math.round(tone.duration % 60)).toString().padStart(2,'0')} 
                                           </Text>
                                       </View>

                                       {/* Botón borrar */}
                                       <TouchableOpacity 
                                            onPress={() => handleDeleteTone(tone.id)}
                                            style={{
                                                padding: 10, 
                                                marginLeft: 5,
                                                backgroundColor: 'rgba(255, 68, 68, 0.1)',
                                                borderRadius: 12
                                            }}
                                        >
                                            <Ionicons name="trash-outline" size={20} color="#ff4444" />
                                        </TouchableOpacity>
                                   </TouchableOpacity>
                               );
                           })}
                        </View>
                    )}

                    <TouchableOpacity 
                         onPress={handleAddTone}
                         style={{
                             flexDirection: 'row',
                             alignItems: 'center',
                             justifyContent: 'center',
                             backgroundColor: 'rgba(255,255,255,0.15)',
                             marginTop: 24,
                             padding: 20,
                             borderRadius: 20,
                             borderWidth: 2,
                             borderColor: 'rgba(255,255,255,0.3)',
                             borderStyle: 'dashed'
                         }}
                    >
                        <Ionicons name="add-circle" size={28} color="#fff" style={{marginRight: 10}} />
                        <Text style={{color: '#fff', fontWeight: '700', fontSize: 17}}>
                            Importar nuevo mp3
                        </Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Footer con botón Listo abajo */}
                <View style={{
                    padding: 20,
                    paddingBottom: Platform.OS === 'ios' ? 20 : 20
                }}>
                    <TouchableOpacity 
                        onPress={() => setToneModalVisible(false)} 
                        style={{
                            backgroundColor: isDark ? '#1e293b' : '#fff',
                            paddingVertical: 18, 
                            borderRadius: 25,
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: {width: 0, height: 4},
                            shadowOpacity: 0.25,
                            shadowRadius: 10,
                            elevation: 8,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            gap: 10
                        }}
                    >
                        <Ionicons name="checkmark-done-circle" size={24} color={isDark ? '#fff' : '#667eea'} />
                        <Text style={{color: isDark ? '#fff' : '#667eea', fontSize: 18, fontWeight: '800'}}>LISTO</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
            </LinearGradient>
        </Modal>

        {/* Dropdown Tipo de medicamento */}
        <Modal
          animationType="fade"
          transparent
          visible={medTypePickerVisible}
          onRequestClose={() => setMedTypePickerVisible(false)}
        >
          <Pressable style={styles.pickerOverlay} onPress={() => setMedTypePickerVisible(false)}>
            <Animatable.View 
                animation="fadeInUp" 
                duration={220} 
                style={[
                    styles.pickerCard,
                    isDark && { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' }
                ]}
            >
              <Text style={[styles.pickerTitle, isDark && {color: '#fff'}]}>Tipo de medicamento</Text>
              <View style={styles.pickerOptionsWrap}>
                {medicationTypes.map((type) => {
                  const selected = newAlarm.medType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                          styles.pickerOption, 
                          selected && styles.pickerOptionSelected,
                          isDark && { backgroundColor: '#0f172a', borderColor: '#334155' },
                          isDark && selected && { backgroundColor: 'rgba(99, 102, 241, 0.2)', borderColor: '#6366f1' }
                      ]}
                      activeOpacity={0.85}
                      onPress={() => {
                        setNewAlarm({ ...newAlarm, medType: type });
                        clearError('medType');
                        setMedTypePickerVisible(false);
                      }}
                    >
                      <Text style={[
                          styles.pickerOptionText, 
                          selected && styles.pickerOptionTextSelected,
                          isDark && { color: '#cbd5e1' },
                          isDark && selected && { color: '#818cf8' }
                      ]}>
                          {type}
                      </Text>
                      {selected ? <Ionicons name="checkmark" size={18} color={isDark ? "#818cf8" : "#667eea"} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                style={[styles.pickerCloseButton, isDark && { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' }]}
                activeOpacity={0.8}
                onPress={() => setMedTypePickerVisible(false)}
              >
                <Text style={[styles.pickerCloseText, isDark && { color: '#fff' }]}>Cerrar</Text>
              </TouchableOpacity>
            </Animatable.View>
          </Pressable>
        </Modal>

        {/* Dropdown Unidad (Dosis) */}
        <Modal
          animationType="fade"
          transparent
          visible={unitPickerVisible}
          onRequestClose={() => setUnitPickerVisible(false)}
        >
          <Pressable style={styles.pickerOverlay} onPress={() => setUnitPickerVisible(false)}>
            <Animatable.View 
                animation="fadeInUp" 
                duration={220} 
                style={[
                    styles.pickerCard,
                    isDark && { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' }
                ]}
            >
              <Text style={[styles.pickerTitle, isDark && {color: '#fff'}]}>Unidad de medida</Text>
              <View style={styles.pickerOptionsWrap}>
                {strengthUnits.map((unit) => {
                  const selected = newAlarm.medStrengthUnit === unit.value;
                  return (
                    <TouchableOpacity
                      key={unit.value}
                      style={[
                          styles.pickerOption, 
                          selected && styles.pickerOptionSelected,
                          isDark && { backgroundColor: '#0f172a', borderColor: '#334155' },
                          isDark && selected && { backgroundColor: 'rgba(99, 102, 241, 0.2)', borderColor: '#6366f1' }
                      ]}
                      activeOpacity={0.85}
                      onPress={() => {
                        setNewAlarm({ ...newAlarm, medStrengthUnit: unit.value });
                        setUnitPickerVisible(false);
                      }}
                    >
                      <Text style={[
                          styles.pickerOptionText, 
                          selected && styles.pickerOptionTextSelected,
                          isDark && { color: '#cbd5e1' },
                          isDark && selected && { color: '#818cf8' }
                      ]}>
                          {unit.full}
                      </Text>
                      {selected ? <Ionicons name="checkmark" size={18} color={isDark ? "#818cf8" : "#667eea"} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                style={[styles.pickerCloseButton, isDark && { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' }]}
                activeOpacity={0.8}
                onPress={() => setUnitPickerVisible(false)}
              >
                <Text style={[styles.pickerCloseText, isDark && { color: '#fff' }]}>Cerrar</Text>
              </TouchableOpacity>
            </Animatable.View>
          </Pressable>
        </Modal>

      <Modal
        visible={toneAlertVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setToneAlertVisible(false)}
      >
        <View style={styles.modalAlertOverlay}>
          <Animatable.View
            animation="zoomIn"
            duration={300}
            style={[styles.modalAlertContent, isDark && { backgroundColor: theme.card }]}
          >
            <View style={styles.modalAlertIconContainer}>
              <View style={[styles.modalAlertIconCircle, isDark && { backgroundColor: 'rgba(102, 126, 234, 0.15)' }]}>
                <Ionicons name="musical-notes" size={32} color="#667eea" />
              </View>
            </View>
            
            <Text style={[styles.modalAlertTitle, isDark && { color: theme.text }]}>Importante</Text>
            <Text style={[styles.modalAlertMessage, isDark && { color: theme.textSecondary }]}>
              Si agrega una cancion debe ser en formato mp3 o si no no va a sonar y si ya la tiene descargada
            </Text>

            <View style={styles.modalAlertButtons}>
              <TouchableOpacity
                style={[styles.modalAlertCancelButton, isDark && { backgroundColor: 'rgba(255,255,255,0.05)' }]}
                onPress={() => setToneAlertVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalAlertCancelText, isDark && { color: theme.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalAlertConfirmButton}
                onPress={confirmAddTone}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalAlertConfirmGradient}
                >
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={styles.modalAlertConfirmText}>Agregar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        </View>
      </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}