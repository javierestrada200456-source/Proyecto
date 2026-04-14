import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert, Modal, Image, FlatList, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import { authService, supabase } from '../../../services/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../context/ThemeContext';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // -- Estilos Cuentas Enlazadas --
  linkedUserCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    backgroundColor: '#e1e4e8',
  },
  userAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  userDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  
  // -- Estilos Detalle Usuario --
  detailHeader: {
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailAvatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  detailAvatar: {
    width: 85,
    height: 85,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: '#fff',
  },
  detailSyncedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#2ecc71',
    borderRadius: 12,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  detailInfo: {
    flex: 1,
  },
  detailName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  detailStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 4,
  },
  statText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  detailActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  syncAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2ecc71',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
    shadowColor: '#2ecc71',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  syncAllButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.85)',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 16,
    gap: 5,
    shadowColor: '#f44336',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  reminderItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 5,
  },
  reminderTime: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
    marginRight: 12,
    minWidth: 55,
  },
  reminderContent: {
    flex: 1,
  },
  reminderMed: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  reminderDose: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  syncButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  syncButtonSecondary: {
    backgroundColor: '#764ba2',
  },
  syncButtonSynced: {
    backgroundColor: '#2ecc71',
  },
  syncButtonDisabled: {
    backgroundColor: '#d5d9e5',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },

  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
  },
  
  // Cards
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },

  // Code Display
  codeContainer: {
    backgroundColor: '#f0f2f5',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e1e4e8',
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  codeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#667eea',
    letterSpacing: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // Input Section
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e1e4e8',
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  
  // QR Placeholder
  qrPlaceHolder: {
    padding: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    marginBottom: 20,
  },
  
  // Tabs for connect method
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  tabTextActive: {
    color: '#667eea',
    fontWeight: '700',
  },

  // Camera Reader
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
    borderRadius: 20,
  },
  cancelScanButton: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },

  // Modal Personalizado
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  modalIconContainer: {
    marginBottom: 20,
  },
  modalIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  modalButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
});

const STORAGE_SYNCED_REMINDERS = '@app_medicamentos_synced_reminders';

const pad2 = (n) => String(n ?? '').padStart(2, '0');

const parseHHMM = (value) => {
  const raw = String(value || '').trim();
  const [hhStr, mmStr] = raw.split(':');
  const hh = Number(hhStr);
  const mm = Number(mmStr);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return { hh, mm, hhmm: `${pad2(hh)}:${pad2(mm)}` };
};

const minutesUntilNextOccurrence = (hh, mm) => {
  const now = new Date();
  const target = new Date(now);
  target.setSeconds(0, 0);
  target.setHours(hh, mm, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / 60000));
};

const humanizeMinutes = (mins) => {
  if (!Number.isFinite(mins)) return '';
  if (mins <= 1) return 'en 1 minuto';
  if (mins < 60) return `en ${mins} minutos`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `en ${h} hora${h === 1 ? '' : 's'}`;
  return `en ${h}h ${m}min`;
};

const getNextDoseTime = (doseTimes) => {
  if (!doseTimes || doseTimes.length === 0) return null;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const sorted = [...doseTimes].filter(Boolean).sort();
  for (const t of sorted) {
    const parsed = parseHHMM(t);
    if (!parsed) continue;
    if (parsed.hh * 60 + parsed.mm > nowMins) return t;
  }
  return sorted[0] || null;
};

// Nombres de días en español (índice = getDay())
const DAY_NAMES_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/**
 * Calcula el timestamp en ms de la PRÓXIMA ocurrencia de (hh:mm) respetando los días.
 * Si la hora ya pasó hoy (o está a menos de 30 seg), avanza al siguiente día válido.
 */
const computeNextOccurrenceMs = (hh, mm, days) => {
  const now = new Date();
  const allDays = !days || days.length === 0;

  for (let ahead = 0; ahead <= 7; ahead++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + ahead);
    candidate.setHours(hh, mm, 0, 0);

    // Debe ser al menos 30 segundos en el futuro
    if (candidate.getTime() <= now.getTime() + 30000) continue;

    if (allDays) return candidate.getTime();

    const dayName = DAY_NAMES_ES[candidate.getDay()];
    const allowed = days.some(d =>
      d === dayName ||
      d === String(candidate.getDay()) ||
      Number(d) === candidate.getDay()
    );
    if (allowed) return candidate.getTime();
  }

  // Fallback: 24 horas desde ahora
  return now.getTime() + 24 * 60 * 60 * 1000;
};

/**
 * Equivalencia de nombres de días en español al número de weekday de Expo/iOS.
 * Expo CALENDAR trigger: 1=Domingo, 2=Lunes, …, 7=Sábado (igual que NSCalendar).
 */
const WEEKDAY_MAP_ES = {
  'Domingo': 1, 'Lunes': 2, 'Martes': 3, 'Miércoles': 4,
  'Jueves': 5, 'Viernes': 6, 'Sábado': 7,
};

/**
 * Programa notificaciones RECURRENTES para una dosis.
 *  - Sin días específicos → dispara cada día a la misma hora (CALENDAR + repeats).
 *  - Con días específicos → una notificación semanal por cada día (CALENDAR + weekday + repeats).
 * Devuelve array de { notifId, day } para poder rastrearlas.
 */
const scheduleDoseNotifications = async (content, hh, mm, days) => {
  const allDays = !days || days.length === 0;

  if (allDays) {
    // DAILY funciona en Android e iOS — repite cada día a la misma hora
    const notifId = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hh,
        minute: mm,
        channelId: 'medication-reminders',
      },
    });
    return [{ notifId, day: 'everyday' }];
  }

  const results = [];
  for (const day of days) {
    const weekday = WEEKDAY_MAP_ES[day] ?? null;
    if (!weekday) continue;
    // WEEKLY funciona en Android e iOS — repite cada semana en ese día
    const notifId = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour: hh,
        minute: mm,
        channelId: 'medication-reminders',
      },
    });
    results.push({ notifId, day });
  }

  // Si ningún día pudo mapearse, cae a diario
  if (results.length === 0) {
    const notifId = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hh,
        minute: mm,
        channelId: 'medication-reminders',
      },
    });
    results.push({ notifId, day: 'everyday' });
  }
  return results;
};

export default function ConectarRecordatorios() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [method, setMethod] = useState('code'); // 'code' | 'qr'
  
  // Custom Alert State
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: '',
    message: '',
    icon: 'notifications',
    color: '#667eea',
    buttons: []
  });

  const showCustomAlert = (title, message, buttons = []) => {
    let icon = 'notifications';
    let color = '#667eea'; // Azul por defecto

    const lowerTitle = title.toLowerCase();
    const lowerMsg = message?.toLowerCase() || '';

    if (lowerTitle.includes('error') || lowerTitle.includes('inválido') || lowerTitle.includes('propio') || lowerTitle.includes('no válido')) {
        icon = 'alert-circle';
        color = '#f5576c'; // Rojo
    } else if (lowerTitle.includes('conectado') || lowerTitle.includes('copiado') || lowerTitle.includes('éxito') || lowerTitle.includes('conexión')) {
        icon = 'checkmark-circle';
        color = '#4CAF50'; // Verde
    } else if (lowerTitle.includes('eliminar') || lowerTitle.includes('desincronizar')) {
        icon = 'trash';
        color = '#f5576c';
    } else if (lowerTitle.includes('permiso') || lowerTitle.includes('sesión') || lowerTitle.includes('inactivo') || lowerMsg.includes('seguro')) {
        icon = 'warning';
        color = '#FF9800'; // Naranja
    } else if (buttons.length > 1) {
         icon = 'help-circle';
         color = '#667eea';
    }

    const alertButtons = buttons.length > 0 ? buttons : [{ text: 'Aceptar', onPress: () => setCustomAlert(prev => ({...prev, visible: false})) }];

    setCustomAlert({
        visible: true,
        title,
        message,
        icon,
        color,
        buttons: alertButtons
    });
  };

  const [viewMode, setViewMode] = useState('main'); // 'main' | 'list' | 'detail'
  const [selectedUser, setSelectedUser] = useState(null);
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [syncedReminders, setSyncedReminders] = useState([]);
  const [syncedUsers, setSyncedUsers] = useState({}); // { [userId]: boolean }
  const [syncBanner, setSyncBanner] = useState(null); // { type, message }
  const [clockTick, setClockTick] = useState(0);

  const [myCode, setMyCode] = useState('CARGANDO...');
  const [connectCode, setConnectCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    fetchMyCode();
    loadLinkedAccounts();
    loadSyncedReminders();

    // Listener: cuando el cuidador TOCA una notificación push de "Nuevo recordatorio",
    // re-sincroniza automáticamente los recordatorios de ese paciente
    let responseSub;
    try {
      responseSub = Notifications.addNotificationResponseReceivedListener(async (response) => {
        const data = response?.notification?.request?.content?.data;
        if (!data?.isCaregiverNotification) return;

        try {
          const { data: { user } } = await authService.getCurrentUser();
          if (!user) return;

          const { data: links } = await supabase
            .from('shared_links')
            .select('owner_id')
            .eq('viewer_id', user.id);

          if (!links || links.length === 0) return;

          const ownerIds = links.map(l => l.owner_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', ownerIds);

          if (!profiles) return;

          for (const profile of profiles) {
            const { data: remRows } = await supabase
              .from('reminders')
              .select('*')
              .eq('user_id', profile.id)
              .eq('active', true);

            if (!remRows || remRows.length === 0) continue;

            // Mapear usando las mismas funciones del componente
            const reminders = remRows.map(row => {
              const timesArray = Array.isArray(row?.times) && row.times.length > 0 ? row.times : null;
              const buildDoseTimes = timesArray
                ? timesArray.map(t => {
                    const hhmm = `${String(t.hour).padStart(2,'0')}:${String(t.minute).padStart(2,'0')}`;
                    return hhmm;
                  }).filter(Boolean)
                : (row?.time ? [row.time] : []);
              const doseTimes = [...new Set(buildDoseTimes)];
              return {
                id: row.id,
                medName: row.med_name || 'Medicamento',
                dose: row.dose ?? row.med_strength ?? '',
                time: doseTimes[0] || '—',
                doseTimes,
                days: Array.isArray(row?.days) ? row.days : [],
                medType: row.med_type || '',
                quantityToTake: row.quantity_to_take || '',
                active: row.active === undefined ? true : !!row.active,
              };
            });

            const rawDisplayName = profile.name || profile.full_name || profile.username || '';
            const displayName = (rawDisplayName && !PLACEHOLDERS.includes(rawDisplayName.toLowerCase().trim()))
              ? rawDisplayName
              : (profile.email?.split('@')[0] || 'Paciente');
            const account = { id: profile.id, name: displayName, reminders };

            // Cancelar todo y reprogramar
            await Notifications.cancelAllScheduledNotificationsAsync();
            await AsyncStorage.setItem(STORAGE_SYNCED_REMINDERS, JSON.stringify([]));

            const { data: { user: cUser } } = await authService.getCurrentUser();
            const caregiverName = cUser?.user_metadata?.full_name || cUser?.user_metadata?.name || 'Cuidador';
            let newSynced = [];

            for (const reminder of reminders) {
              for (let doseIndex = 0; doseIndex < reminder.doseTimes.length; doseIndex++) {
                const timeStr = reminder.doseTimes[doseIndex];
                const parts = timeStr.split(':');
                if (parts.length < 2) continue;
                const hh = parseInt(parts[0], 10);
                const mm = parseInt(parts[1], 10);
                if (isNaN(hh) || isNaN(mm)) continue;

                const ORDINALS = ['Primera', 'Segunda', 'Tercera'];
                const doseOrdinal = ORDINALS[doseIndex] || `${doseIndex + 1}.ª`;

                const notifContent = {
                  title: `⏰ Es hora de la dosis de ${account.name}`,
              body: `👋 Hola, ${caregiverName}.\n${doseOrdinal} dosis: ${reminder.medName}`,
                  sound: 'default',
                  priority: Notifications.AndroidNotificationPriority.HIGH,
                  data: {
                    type: 'external_reminder',
                    ownerName: account.name,
                    medName: reminder.medName,
                    doseIndex,
                    time: timeStr,
                    accountId: account.id,
                    reminderId: reminder.id,
                    days: JSON.stringify(reminder.days || []),
                  },
                };

                // Programar notificación RECURRENTE
                const scheduled = await scheduleDoseNotifications(notifContent, hh, mm, reminder.days);

                for (const { notifId, day } of scheduled) {
                  newSynced.push({
                    accountId: account.id,
                    reminderId: reminder.id,
                    doseIndex,
                    time: timeStr,
                    medName: reminder.medName,
                    day,
                    notificationId: notifId,
                  });
                }
              }
            }

            await AsyncStorage.setItem(STORAGE_SYNCED_REMINDERS, JSON.stringify(newSynced));
            setSyncedUsers(prev => ({ ...prev, [account.id]: true }));
            console.log('[autoSync] Re-sincronización automática completada:', newSynced.length, 'dosis programadas');
          }
        } catch (_e) {
          console.warn('[autoSync] Error en re-sincronización automática:', _e);
        }
      });
    } catch (_e) {}

    return () => {
      if (responseSub) responseSub.remove();
    };
  }, []);

  // Ticker para recalcular "en X minutos" sin depender de interacción del usuario
  useEffect(() => {
    const id = setInterval(() => setClockTick((t) => t + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const ensureExternalReminderNotificationReady = async () => {
    try {
      // Permisos
      const perm = await Notifications.getPermissionsAsync();
      if (perm?.status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        if (req?.status !== 'granted') {
          throw new Error('No se otorgó permiso de notificaciones');
        }
      }

      // Canal Android (reusar legacy ya existente en la app)
      if (Platform.OS === 'android') {
        let _sp = {};
        try { const _r = await AsyncStorage.getItem('@sound_prefs'); if (_r) _sp = JSON.parse(_r); } catch (_) {}
        const _sound = (!_sp.selectedNotifTone || _sp.selectedNotifTone === 'melody_med') ? 'tono_recordatorio' : _sp.selectedNotifTone;
        const _vib = _sp.vibrationEnabled !== false ? [250, 250, 250, 250] : null;

        await Notifications.setNotificationChannelAsync('medication-reminders', {
          name: 'Recordatorios de Medicamentos',
          importance: Notifications.AndroidImportance.MAX,
          ...(_vib ? { vibrationPattern: _vib } : {}),
          lightColor: '#FF231F7C',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          sound: _sound,
        });
      }

      // Categoría con botón “Aceptar”
      await Notifications.setNotificationCategoryAsync('medication_pre_reminder', [
        {
          identifier: 'ACKNOWLEDGE',
          buttonTitle: 'Aceptar',
          options: { opensAppToForeground: false },
        },
      ]);

      return true;
    } catch (e) {
      return false;
    }
  };

  const generateLinkCode = (length = 6) => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < length; i += 1) {
      code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return code;
  };

  const mapReminderRow = (row) => {
    // Soporte multi-dosis: times es un array [{hour, minute}, ...]
    const timesArray = Array.isArray(row?.times) && row.times.length > 0
      ? row.times
      : null;

    // Construir lista de HH:MM para cada dosis (deduplicada)
    const buildDoseTimes = timesArray
      ? timesArray.map(t => {
          const parsed = parseHHMM(`${pad2(t.hour)}:${pad2(t.minute)}`);
          return parsed ? parsed.hhmm : null;
        }).filter(Boolean)
      : (() => {
          // Fallback: campo time o scheduled_at
          const timeFromScheduledAt = row?.scheduled_at ? (() => {
            try {
              const d = new Date(row.scheduled_at);
              if (Number.isNaN(d.getTime())) return null;
              return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
            } catch {
              return null;
            }
          })() : null;
          const raw = row?.time || timeFromScheduledAt;
          const parsed = parseHHMM(raw);
          return parsed ? [parsed.hhmm] : [];
        })();

    // Eliminar duplicados de doseTimes
    const doseTimes = [...new Set(buildDoseTimes)];

    // Primera dosis para retrocompatibilidad en campos que esperan string
    const firstTime = doseTimes[0] || '—';
    const parsed = parseHHMM(firstTime);

    return {
      id: row.id,
      medName: row.med_name || row.medName || 'Medicamento',
      dose: row.dose ?? row.med_strength ?? row.medStrength ?? '',
      time: firstTime,
      doseTimes,                   // ← nuevo: todas las dosis
      days: Array.isArray(row?.days) ? row.days : [],
      strength: row.strength || row.presentation || row.presentacion || row.med_type || row.medType || '',
      medType: row.med_type || row.medType || row.presentation || row.presentacion || '',
      medStrengthUnit: row.med_strength_unit || row.medStrengthUnit || '',
      quantityToTake: row.quantity_to_take || row.quantityToTake || row.quantity || row.cantidad_a_tomar || '',
      active: row.active === undefined ? true : !!row.active,
      frequency: row.frequency || row.frequency_hours || row.frequencyHours || 'No definida',
      lastTaken: row.last_taken ? new Date(row.last_taken).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
      nextDose: row.next_dose_time
        ? new Date(row.next_dose_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : (firstTime || '—'),
      _scheduledAt: row.scheduled_at || null,
    };
  };

  const PLACEHOLDERS = ['nombre del paciente', 'paciente', 'usuario', 'sin nombre', 'user'];
  const isPlaceholder = (val) => !val || PLACEHOLDERS.includes(val.toLowerCase().trim());

  const mapProfileRow = (row, reminders = []) => {
    let displayName = 'Sin nombre';
    // Mapeo exhaustivo de posibles campos de nombre, ignorando placeholders genéricos
    if (row?.first_name && !isPlaceholder(row.first_name)) {
      displayName = `${row.first_name} ${row.last_name || ''}`.trim();
    } else if (row?.full_name && !isPlaceholder(row.full_name)) {
      displayName = row.full_name;
    } else if (row?.display_name && !isPlaceholder(row.display_name)) {
      displayName = row.display_name;
    } else if (row?.name && !isPlaceholder(row.name)) {
      displayName = row.name;
    } else if (row?.username && !isPlaceholder(row.username)) {
      displayName = row.username;
    } else if (row?.email) {
      displayName = row.email.split('@')[0];
    }
    
    // Si viene "Usuario" genérico y tenemos email o username, preferir esos
    if (isPlaceholder(displayName) && row?.username && !isPlaceholder(row.username)) displayName = row.username;

    return {
      id: row.id,
      linkCode: row.link_code,
      name: displayName,
      age: row.age ? `${row.age} años` : null,
      gender: row.gender || null,
      weight: row.weight ? `${row.weight} kg` : null,
      bloodType: row.blood_type || null,
      allergies: row.allergies || null,
      medicalCondition: row.medical_conditions || row.medical_condition || row.condicion_medica || row.condition || row.medical_condition_text || null,
      emergencyContact: row.emergency_contact || null,
      photo: row.photo || row.avatar_url || row.avatar || null,
      reminders,
    };
  };

  // Manejo del botón atrás
  const handleBackPress = () => {
    if (viewMode === 'detail') {
      setViewMode('list');
      setSelectedUser(null);
    } else if (viewMode === 'list') {
      setViewMode('main');
    } else {
      router.back();
    }
  };

  const fetchMyCode = async () => {
    try {
      const { data: { user } } = await authService.getCurrentUser();
      if (!user) {
        setMyCode('——————');
        return;
      }

      const { data: profileRows, error } = await supabase
        .from('profiles')
        .select('id, link_code')
        .eq('id', user.id)
        .limit(1);

      if (error) {
        setMyCode('ERROR');
        return;
      }

      const profile = Array.isArray(profileRows) ? profileRows[0] : null;
      if (profile?.link_code) {
        setMyCode(profile.link_code);
        return;
      }

      let nextCode = null;
      for (let i = 0; i < 6; i += 1) {
        const candidate = generateLinkCode();
        const { data: existingRows } = await supabase
          .from('profiles')
          .select('id')
          .eq('link_code', candidate)
          .limit(1);
        const existing = Array.isArray(existingRows) ? existingRows[0] : null;
        if (!existing) {
          nextCode = candidate;
          break;
        }
      }

      if (!nextCode) {
        setMyCode('ERROR');
        return;
      }

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, link_code: nextCode });

      if (upsertError) {
        setMyCode('ERROR');
        return;
      }

      setMyCode(nextCode);
    } catch (e) {
      setMyCode('ERROR');
    }
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(myCode);
    showCustomAlert('¡Copiado!', 'Tu código se ha copiado al portapapeles.');
  };

  const fetchRemindersForUser = async (userId) => {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('time', { ascending: true });

    if (error || !Array.isArray(data)) return [];
    return data.map(mapReminderRow);
  };

  const loadLinkedAccounts = async () => {
    try {
      const { data: { user } } = await authService.getCurrentUser();
      if (!user) {
        setLinkedAccounts([]);
        return;
      }

      const { data: links, error: linksError } = await supabase
        .from('shared_links')
        .select('owner_id')
        .eq('viewer_id', user.id);

      if (linksError || !links || links.length === 0) {
        setLinkedAccounts([]);
        return;
      }

      const ownerIds = links.map((link) => link.owner_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', ownerIds);

      if (profilesError || !profiles) {
        setLinkedAccounts([]);
        return;
      }

      const accounts = [];
      for (const profile of profiles) {
        const reminders = await fetchRemindersForUser(profile.id);
        const account = mapProfileRow(profile, reminders);
        accounts.push(account);
      }

      setLinkedAccounts(accounts);

      // ── Auto-resync silencioso al abrir la app ──────────────────────────────
      // Garantiza que las notificaciones estén programadas aunque el teléfono
      // se haya reiniciado o la app se haya reinstalado.
      if (accounts.length > 0) {
        backgroundSyncAllAccounts(accounts).catch(() => {});
      }
    } catch (e) {
      setLinkedAccounts([]);
    }
  };

  const loadSyncedReminders = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_SYNCED_REMINDERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        const items = Array.isArray(parsed) ? parsed : [];
        setSyncedReminders(items);
        // Inicializar syncedUsers desde datos guardados para que el botón se oculte al reabrir
        const userMap = {};
        items.forEach(item => { if (item.accountId) userMap[item.accountId] = true; });
        setSyncedUsers(prev => ({ ...userMap, ...prev }));
      }
    } catch (e) {
      setSyncedReminders([]);
    }
  };

  const saveSyncedReminders = async (items) => {
    setSyncedReminders(items);
    try {
      await AsyncStorage.setItem(STORAGE_SYNCED_REMINDERS, JSON.stringify(items));
    } catch (e) {
      // noop
    }
  };

  const [syncInProgress, setSyncInProgress] = useState(false);
  const isSyncingRef = React.useRef(false); // Ref para guard síncrono
  const isBackgroundSyncRunning = React.useRef(false); // Guard para evitar doble backgroundSync

  const handleSyncAllReminders = async (user) => {
    if (isSyncingRef.current) return; // Guard síncrono (no depende del ciclo de render)
    isSyncingRef.current = true;
    setSyncInProgress(true);

    const activeReminders = (user.reminders || []).filter(r => !!r.active);

    if (activeReminders.length === 0) {
      isSyncingRef.current = false;
      setSyncInProgress(false);
      showCustomAlert(
        'Sin recordatorios activos',
        'Este usuario no tiene recordatorios activos para sincronizar.',
        [{ text: 'Aceptar' }]
      );
      return;
    }

    await autoSyncAllReminders(user, activeReminders);
    isSyncingRef.current = false;
    setSyncInProgress(false);

    showCustomAlert(
      '¡Sincronización exitosa!',
      `Se sincronizaron ${activeReminders.length} recordatorio${activeReminders.length !== 1 ? 's' : ''} de recordatorios exitosamente.`,
      [{
        text: 'Confirmar',
        onPress: () => {
          setSyncedUsers(prev => ({ ...prev, [user.id]: true }));
          showCustomAlert(
            '¡Listo!',
            'Mantente pendiente de las notificaciones que te llegarán de los recordatorios.',
            [{ text: 'Entendido' }]
          );
        }
      }]
    );
  };

  // ── Sincronización silenciosa de todos los pacientes ────────────────────────
  const backgroundSyncAllAccounts = async (accounts) => {
    if (isBackgroundSyncRunning.current) return;
    isBackgroundSyncRunning.current = true;
    try {
      const ready = await ensureExternalReminderNotificationReady();
      if (!ready) return;

      const { data: { user } } = await authService.getCurrentUser();
      const caregiverName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Cuidador';

      // Cancelar todo una sola vez antes de reprogramar todos los pacientes
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
      } catch (_e) { /* noop */ }

      const newSynced = [];

      for (const account of accounts) {
        const activeReminders = (account.reminders || []).filter(r => !!r.active);
        if (activeReminders.length === 0) continue;

        for (const reminder of activeReminders) {
          const times = reminder.doseTimes?.length > 0 ? reminder.doseTimes : [reminder.time];
          for (let doseIndex = 0; doseIndex < times.length; doseIndex++) {
            const timeStr = times[doseIndex];
            const parsed = parseHHMM(timeStr);
            if (!parsed) continue;

            const DOSE_ORDINALS = ['Primera', 'Segunda', 'Tercera'];
            const doseOrdinal = DOSE_ORDINALS[doseIndex] || `${doseIndex + 1}.ª`;

            const _dose = reminder.dose || '';
            const _unit = _dose ? (reminder.medStrengthUnit || '') : '';
            const _str = [_dose, _unit].filter(Boolean).join(' ');
            const _qty = reminder.quantityToTake || reminder.quantity_to_take || '';
            const _line1 = `${doseOrdinal} dosis: ${reminder.medName}${_str ? ` — ${_str}` : ''}`;
            const _line2 = _qty ? `Cantidad: ${_qty}${reminder.medType ? ` ${reminder.medType}` : ''}` : '';

            const notifContent = {
              title: `⏰ Es hora de la dosis de ${account.name}`,
              body: `👋 Hola, ${caregiverName}.\n${_line1}${_line2 ? `\n${_line2}` : ''}`,
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.HIGH,
              data: {
                type: 'external_reminder',
                ownerName: account.name,
                medName: reminder.medName,
                doseIndex,
                time: parsed.hhmm,
                accountId: account.id,
                reminderId: reminder.id,
                days: JSON.stringify(reminder.days || []),
              },
            };

            const scheduled = await scheduleDoseNotifications(notifContent, parsed.hh, parsed.mm, reminder.days);
            for (const { notifId, day } of scheduled) {
              newSynced.push({
                accountId: account.id,
                reminderId: reminder.id,
                doseIndex,
                time: timeStr,
                medName: reminder.medName,
                day,
                notificationId: notifId,
              });
            }
          }
        }
      }

      await saveSyncedReminders(newSynced);
      const userMap = {};
      newSynced.forEach(item => { if (item.accountId) userMap[item.accountId] = true; });
      setSyncedUsers(prev => ({ ...userMap, ...prev }));
      console.log('[backgroundSync] Sincronización automática completada:', newSynced.length, 'notificaciones programadas');
    } catch (e) {
      console.warn('[backgroundSync] Error:', e);
    } finally {
      isBackgroundSyncRunning.current = false;
    }
  };
  // ────────────────────────────────────────────────────────────────────────────

  const autoSyncAllReminders = async (account, reminders) => {
    try {
      const ready = await ensureExternalReminderNotificationReady();
      if (!ready) return;

      const { data: { user } } = await authService.getCurrentUser();
      const caregiverName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Cuidador';

      // ── PASO 1: Cancelar ABSOLUTAMENTE TODAS las notificaciones programadas en el dispositivo
      // (En el celular del cuidador, expo-notifications solo programa external_reminders,
      //  así que esto es seguro. Las alarmas del paciente usan Notifee, no se ven afectadas)
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log('[autoSync] Todas las notificaciones previas canceladas');
      } catch (_e) {
        console.warn('Error cancelando todas las notificaciones:', _e);
      }

      // ── PASO 2: Limpiar TODO el tracking local (ya cancelamos todo arriba)
      await AsyncStorage.setItem(STORAGE_SYNCED_REMINDERS, JSON.stringify([]));
      let newSynced = [];

      // ── PASO 3: Programar UNA notificación por dosis activa
      console.log(`[autoSync] Recordatorios a programar: ${reminders.length}`);
      for (const reminder of reminders) {
        if (!reminder.active) continue;

        const times = reminder.doseTimes && reminder.doseTimes.length > 0
          ? reminder.doseTimes
          : [reminder.time];

        console.log(`[autoSync] ${reminder.medName}: doseTimes = ${JSON.stringify(times)}`);

        for (let doseIndex = 0; doseIndex < times.length; doseIndex++) {
          const timeStr = times[doseIndex];
          const parsed = parseHHMM(timeStr);
          if (!parsed) continue;

          const DOSE_ORDINALS = ['Primera', 'Segunda', 'Tercera'];
          const doseOrdinal = DOSE_ORDINALS[doseIndex] || `${doseIndex + 1}.ª`;
          const medTypeStr = reminder.medType ? ` (${reminder.medType})` : '';

          console.log(`[autoSync] Programando: ${reminder.medName} dosis${doseIndex+1} a las ${timeStr} (recurrente)`);

          const notifContent = {
            title: `⏰ Es hora de la dosis de ${account.name}`,
            body: (() => {
              const _dose = reminder.dose || '';
              const _unit = _dose ? (reminder.medStrengthUnit || '') : '';
              const _str = [_dose, _unit].filter(Boolean).join(' ');
              const _qty = reminder.quantityToTake || reminder.quantity_to_take || '';
              const _line1 = `${doseOrdinal} dosis: ${reminder.medName}${_str ? ` — ${_str}` : ''}`;
              const _line2 = _qty ? `Cantidad: ${_qty}${reminder.medType ? ` ${reminder.medType}` : ''}` : '';
              return `👋 Hola, ${caregiverName}.\n${_line1}${_line2 ? `\n${_line2}` : ''}`;
            })(),
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
            data: {
              type: 'external_reminder',
              ownerName: account.name,
              medName: reminder.medName,
              dose: reminder.dose,
              quantityToTake: reminder.quantityToTake || reminder.quantity_to_take || '--',
              medType: reminder.medType,
              doseIndex,
              time: parsed.hhmm,
              accountId: account.id,
              reminderId: reminder.id,
              days: JSON.stringify(reminder.days || []),
            },
          };

          // Programar notificación RECURRENTE (no de un solo disparo)
          const scheduled = await scheduleDoseNotifications(notifContent, parsed.hh, parsed.mm, reminder.days);

          for (const { notifId, day } of scheduled) {
            newSynced.push({
              accountId: account.id,
              reminderId: reminder.id,
              doseIndex,
              time: timeStr,
              medName: reminder.medName,
              dose: reminder.dose,
              ownerName: account.name,
              days: JSON.stringify(reminder.days || []),
              day,
              notificationId: notifId,
            });
          }
        }
      }

      // ── PASO 4: Guardar el nuevo tracking
      await saveSyncedReminders(newSynced);

    } catch (error) {
      console.log("Error auto-syncing reminders:", error);
    }
  };

  const linkAccountByCode = async (code) => {
    const normalized = String(code || '').trim().toUpperCase();
    if (!normalized) {
      showCustomAlert('Error', 'Por favor ingresa un código válido.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await authService.getCurrentUser();
      if (!user) {
        setLoading(false);
        showCustomAlert('Sesión requerida', 'Inicia sesión para vincular cuentas.');
        return;
      }

      const { data: profileRows, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('link_code', normalized)
        .limit(1);

      console.log('[ConectarRecordatorios] linkAccountByCode:', {
        normalized,
        profileRows,
        error,
        errorCode: error?.code,
        errorMessage: error?.message,
        errorDetails: error?.details,
        errorHint: error?.hint,
      });

      const profile = Array.isArray(profileRows) ? profileRows[0] : null;
      if (error || !profile) {
        setLoading(false);
        // Diagnóstico específico
        let diagMsg = 'No encontramos una cuenta con ese código. Verifica e intenta nuevamente.';
        if (error) {
          diagMsg = `Error de base de datos: ${error.message || error.code || 'desconocido'}`;
        } else if (Array.isArray(profileRows) && profileRows.length === 0) {
          diagMsg = 'No encontramos una cuenta con ese código. Puede que no exista o que los permisos de la base de datos estén bloqueando la búsqueda.';
        }
        showCustomAlert('Código no válido', diagMsg);
        return;
      }

      if (profile.id === user.id) {
        setLoading(false);
        showCustomAlert('Código propio', 'No puedes vincularte a tu propia cuenta.');
        return;
      }

      if (linkedAccounts.length >= 3 && !linkedAccounts.some(a => a.id === profile.id)) {
        setLoading(false);
        showCustomAlert('Límite alcanzado', 'Solo puedes conectar hasta 3 cuentas de usuario simultáneamente.');
        return;
      }

      const { error: linkError } = await supabase
        .from('shared_links')
        .upsert({ owner_id: profile.id, viewer_id: user.id }, { onConflict: 'owner_id,viewer_id' });

      console.log('[linkAccountByCode] shared_links upsert:', { linkError, ownerId: profile.id, viewerId: user.id });

      if (linkError) {
        setLoading(false);
        showCustomAlert('Error', `No se pudo crear el vínculo: ${linkError.message || linkError.code || 'desconocido'}`);
        return;
      }

      const reminders = await fetchRemindersForUser(profile.id);
      const account = mapProfileRow(profile, reminders);
      const next = [
        account,
        ...linkedAccounts.filter((item) => item.id !== profile.id),
      ];

      setLinkedAccounts(next);
      setSelectedUser(account);
      setViewMode('detail');
      setConnectCode('');
      setLoading(false);
      showCustomAlert('Conexión exitosa', `Ahora estás conectado con ${account.name}.`);
    } catch (e) {
      setLoading(false);
      console.log('[linkAccountByCode] excepción:', e?.message, e);
      showCustomAlert('Error', `Ocurrió un error al conectar: ${e?.message || 'desconocido'}`);
    }
  };

  const handleConnect = () => {
    linkAccountByCode(connectCode);
  };

  const openCamera = async () => {
      if (!permission) {
          // Permisos aun cargando
          return; 
      }
      
      if (!permission.granted) {
          const result = await requestPermission();
          if (!result.granted) {
              showCustomAlert('Permiso requerido', 'Necesitamos acceso a la cámara para escanear el código QR.');
              return;
          }
      }
      setScanned(false);
      setCameraVisible(true);
  };

  const handleBarCodeScanned = ({ type, data }) => {
      setScanned(true);
      setCameraVisible(false);
      // La data debe ser el link_code (mismo formato que el código de texto)
      setConnectCode(data);
      showCustomAlert(
          'Código QR Detectado', 
          `Se ha leído el código: ${data}. ¿Deseas conectar?`,
          [
              { text: 'Cancelar', style: 'cancel', onPress: () => setConnectCode('') },
              { text: 'Conectar', onPress: () => {
                   setConnectCode(data);
                   setTimeout(() => linkAccountByCode(data), 300);
              }}
          ]
      );
  };

  const isReminderSynced = (accountId, reminderId) => {
    return syncedReminders.some((item) => item.accountId === accountId && item.reminderId === reminderId);
  };

  const getSyncedItem = (accountId, reminderId) => {
    return syncedReminders.find((item) => item.accountId === accountId && item.reminderId === reminderId) || null;
  };

  const getSyncedDescription = (timeStr) => {
    const parsed = parseHHMM(timeStr);
    if (!parsed) return null;
    const mins = minutesUntilNextOccurrence(parsed.hh, parsed.mm);
    const whenTxt = humanizeMinutes(mins);
    return `Este recordatorio te avisa a las ${parsed.hhmm} (${whenTxt}).`;
  };

  const handleSyncReminder = async (account, reminder) => {
    if (!reminder.active) {
      showCustomAlert('Recordatorio inactivo', 'Solo puedes sincronizar recordatorios activos.');
      return;
    }

    const alreadySynced = isReminderSynced(account.id, reminder.id);
    if (alreadySynced) {
      showCustomAlert(
        'Desactivar recordatorio',
        '¿Estás seguro de desactivar este recordatorio? Ya no te enviará notificaciones de este recordatorio.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Desactivar', style: 'destructive', onPress: async () => {
              const itemToDesync = syncedReminders.find(i => i.accountId === account.id && i.reminderId === reminder.id);
              if (itemToDesync?.notificationId) {
                  await Notifications.cancelScheduledNotificationAsync(itemToDesync.notificationId);
              }
              const next = syncedReminders.filter((item) => !(item.accountId === account.id && item.reminderId === reminder.id));
              await saveSyncedReminders(next);
              setSyncBanner({ type: 'info', message: 'Recordatorio desactivado. Ya no recibirás notificaciones de este recordatorio.' });
            }}
        ]
      );
      return;
    }

    // Verificar conflictos con alarmas locales
    try {
        const localAlarmsJson = await AsyncStorage.getItem('@app_medicamentos_alarms');
        const localAlarms = localAlarmsJson ? JSON.parse(localAlarmsJson) : [];
        const parsed = parseHHMM(reminder.time);
        const reminderHHMM = parsed?.hhmm || String(reminder.time || '').trim();
        const conflict = Array.isArray(localAlarms)
          ? localAlarms.find((a) => {
              if (!a?.active) return false;
              const alarmHHMM = a?.time
                ? String(a.time)
                : (a?.hour !== undefined && a?.minute !== undefined ? `${pad2(a.hour)}:${pad2(a.minute)}` : '');
              return String(alarmHHMM).trim() === reminderHHMM;
            })
          : null;

        if (conflict) {
            showCustomAlert('Conflicto de Horario', `No puedes sincronizar. Tienes una alarma local activa a las ${reminder.time} (${conflict.label || 'Alarma'}). Debes desactivarla primero.`);
            return;
        }
    } catch (e) {
        // Ignorar error de lectura
    }

    showCustomAlert(
      'Sincronizar recordatorio',
      'Sincronización de recordatorio activo. Te avisaremos cuando el usuario tenga que tomar este medicamento.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Ok', onPress: async () => {
            let notifId = null;
            try {
                const parsed = parseHHMM(reminder.time);
                if (!parsed) {
                  showCustomAlert('Error', 'Hora del recordatorio inválida.');
                  return;
                }

                const ready = await ensureExternalReminderNotificationReady();
                if (!ready) {
                  showCustomAlert('Permiso requerido', 'Activa las notificaciones para poder sincronizar este recordatorio.');
                  return;
                }

                const mins = minutesUntilNextOccurrence(parsed.hh, parsed.mm);
                const whenTxt = humanizeMinutes(mins);
                const presentation = reminder.medType || reminder.strength || '--';
                const qty = reminder.quantityToTake || '--';
                const qtyUnit = reminder.medType ? ` ${reminder.medType}` : '';

                const { data: { user } } = await authService.getCurrentUser();
                const caregiverName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Cuidador';

                // Leer prefs de sonido del cuidador
                let _caregiverSp = {};
                try { const _r = await AsyncStorage.getItem('@sound_prefs'); if (_r) _caregiverSp = JSON.parse(_r); } catch (_) {}
                const _caregiverSound = (!_caregiverSp.selectedNotifTone || _caregiverSp.selectedNotifTone === 'melody_med') ? 'tono_recordatorio' : _caregiverSp.selectedNotifTone;

                notifId = await Notifications.scheduleNotificationAsync({
                    content: {
                        title: `⏰ Es hora de la dosis de ${account.name}`,
                        body: (() => {
                          const _dose = reminder.dose || '';
                          const _unit = _dose ? (reminder.medStrengthUnit || '') : '';
                          const _str = [_dose, _unit].filter(Boolean).join(' ');
                          const _line1 = `Primera dosis: ${reminder.medName}${_str ? ` — ${_str}` : ''}`;
                          const _line2 = qty && qty !== '--' ? `Cantidad: ${qty}${qtyUnit}` : '';
                          return `👋 Hola, ${caregiverName}.\n${_line1}${_line2 ? `\n${_line2}` : ''}`;
                        })(),
                        sound: _caregiverSound,
                        priority: Notifications.AndroidNotificationPriority.HIGH,
                        categoryIdentifier: 'medication_pre_reminder',
                        data: {
                          type: 'external_reminder',
                          ownerName: account.name,
                          medName: reminder.medName,
                          dose: reminder.dose,
                          presentation,
                          quantityToTake: qty,
                          medType: reminder.medType,
                          time: parsed.hhmm,
                          inMinutes: mins,
                        },
                    },
                    trigger: {
                      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                      hour: parsed.hh,
                      minute: parsed.mm,
                      second: 0,
                      repeats: true,
                      channelId: 'medication-reminders',
                    },
                });

                setSyncBanner({
                  type: 'success',
                  message: `Sincronizado: te avisará a las ${parsed.hhmm} (${whenTxt}).`,
                });
            } catch (error) {
                console.log("Error scheduling notification:", error);
            }

            const next = [
              ...syncedReminders,
              {
                accountId: account.id,
                reminderId: reminder.id,
                time: reminder.time,
                medName: reminder.medName,
                dose: reminder.dose,
                strength: reminder.strength,
                notificationId: notifId,
              }
            ];
            await saveSyncedReminders(next);
            showCustomAlert('Sincronizado', `Recordatorio sincronizado. Te notificaremos a las ${reminder.time} para ${account.name}.`);
          }}
      ]
    );
  };

  const handleUnlinkUser = (userToUnlink) => {
    showCustomAlert(
      'Eliminar Usuario',
      'Si eliminas esta cuenta, se borrarán los recordatorios sincronizados de la misma.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: async () => {
            setLoading(true);
            try {
              const { data: { user } } = await authService.getCurrentUser();
              if (user) {
                  const { error } = await supabase.from('shared_links')
                      .delete()
                      .eq('owner_id', userToUnlink.id)
                      .eq('viewer_id', user.id);
                  
                  if (error) throw error;
              }
              
              // Cancelar TODAS las notificaciones del sistema (seguro: el cuidador
              // solo tiene external_reminders programadas con expo-notifications)
              try {
                await Notifications.cancelAllScheduledNotificationsAsync();
              } catch (_e) {}

              // Limpiar tracking completo
              await saveSyncedReminders([]);
              setSyncedUsers({});

              const nextAccounts = linkedAccounts.filter(a => a.id !== userToUnlink.id);
              setLinkedAccounts(nextAccounts);
              
              setLoading(false);
              setViewMode('list');
              setSelectedUser(null);
              showCustomAlert('Eliminado', 'Usuario eliminado correctamente.');
            } catch (e) {
              setLoading(false);
              showCustomAlert('Error', 'No se pudo eliminar el usuario.');
            }
          }
        }
      ]
    );
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
        <LinearGradient
          colors={isDark ? ['#1a1f3c', '#0f172a', '#000000'] : ['#667eea', '#764ba2', '#f093fb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.container}
        >
          <View style={[styles.safeArea, { paddingTop: insets.top }]}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
              enabled={Platform.OS === 'ios'}
            >
                <ScrollView 
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                  <Animatable.View animation="slideInDown" duration={600} style={styles.header}>
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={handleBackPress}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                       {viewMode === 'main' ? 'Vincular Dispositivo' : 
                        viewMode === 'list' ? 'Cuentas Enlazadas' : 'Detalle de Cuenta'}
                    </Text>
                  </Animatable.View>

                  {!!syncBanner?.message && (
                    <Animatable.View
                      animation="fadeIn"
                      duration={300}
                      style={{
                        marginBottom: 14,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 14,
                        backgroundColor:
                          syncBanner.type === 'success'
                            ? 'rgba(76, 175, 80, 0.18)'
                            : 'rgba(255, 255, 255, 0.18)',
                        borderWidth: 1,
                        borderColor:
                          syncBanner.type === 'success'
                            ? 'rgba(76, 175, 80, 0.35)'
                            : 'rgba(255, 255, 255, 0.25)',
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700' }}>
                        {syncBanner.message}
                      </Text>
                    </Animatable.View>
                  )}

          {/* VISTA PRINCIPAL (VINCTULAR) */}
          {viewMode === 'main' && (
            <>
              {/* Selector de Método y Ver Cuentas */}
              <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                  <View style={[styles.tabsContainer, { flex: 1, marginBottom: 0, marginRight: 10 }, isDark && {backgroundColor: 'rgba(0,0,0,0.3)'}]}>
                    <TouchableOpacity 
                      style={[styles.tab, method === 'code' && styles.tabActive, method === 'code' && isDark && {backgroundColor: '#334155'}]}
                      onPress={() => setMethod('code')}
                    >
                      <Text style={[styles.tabText, method === 'code' && styles.tabTextActive, isDark && {color: method === 'code' ? '#fff' : '#94a3b8'}]}>Usar Código</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.tab, method === 'qr' && styles.tabActive, method === 'qr' && isDark && {backgroundColor: '#334155'}]}
                      onPress={() => setMethod('qr')}
                    >
                      <Text style={[styles.tabText, method === 'qr' && styles.tabTextActive, isDark && {color: method === 'qr' ? '#fff' : '#94a3b8'}]}>Usar QR</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity 
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      width: 52,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.3)'
                    }}
                    onPress={() => setViewMode('list')}
                  >
                      <Ionicons name="people" size={24} color="#fff" />
                  </TouchableOpacity>
              </View>

              {/* MI CÓDIGO */}
              <Animatable.View animation="fadeInUp" delay={200} style={[styles.card, isDark && {backgroundColor: '#1e293b'}]}>
                <View style={{ marginBottom: 16, backgroundColor: isDark ? '#334155' : '#eef2ff', padding: 12, borderRadius: 50 }}>
                  <Ionicons name={method === 'qr' ? "qr-code" : "key"} size={32} color={isDark ? '#fff' : "#667eea"} />
                </View>
                
                <Text style={[styles.cardTitle, isDark && {color: '#fff'}]}>Tu Código de Vinculación</Text>
                <Text style={[styles.cardDescription, isDark && {color: '#cbd5e1'}]}>
                  Comparte este {method === 'qr' ? 'código QR' : 'código de texto'} con un familiar o cuidador para que pueda recibir tus recordatorios.
                </Text>

                {method === 'code' ? (
                    <>
                        <View style={[styles.codeContainer, isDark && {backgroundColor: '#334155', borderColor: '#475569'}]}>
                            <Text style={[styles.codeText, isDark && {color: '#fff'}]}>{myCode}</Text>
                        </View>
                        <TouchableOpacity style={styles.actionButton} onPress={copyToClipboard} activeOpacity={0.8}>
                            <Ionicons name="copy-outline" size={20} color="#fff" />
                            <Text style={styles.actionButtonText}>Copiar Código</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={{ alignItems: 'center' }}>
                        <View style={styles.qrPlaceHolder}>
                            {/* Generación de código QR */}
                            <QRCode 
                              value={myCode} 
                              size={180} 
                              color="#333" 
                              backgroundColor="#fff" 
                            />
                        </View>
                        <Text style={{ fontSize: 12, color: '#fff', backgroundColor: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 8 }}>
                            ID: {myCode}
                        </Text>
                    </View>
                )}
              </Animatable.View>

              {/* CONECTAR CODIGO OTRO USUARIO */}
              <Animatable.View animation="fadeInUp" delay={400} style={[styles.card, isDark && {backgroundColor: '#1e293b'}]}>
                <Text style={[styles.cardTitle, isDark && {color: '#fff'}]}>Conectar con alguien más</Text>
                <Text style={[styles.cardDescription, isDark && {color: '#cbd5e1'}]}>
                  {method === 'qr' 
                    ? 'Escanea el código QR del dispositivo que quieres supervisar.' 
                    : 'Ingresa el código que te proporcionaron para sincronizar los recordatorios.'}
                </Text>

                {method === 'code' ? (
                    <>
                    <View style={styles.inputContainer}>
                      <Text style={[styles.inputLabel, isDark && {color: '#e2e8f0'}]}>Código de vinculación</Text>
                      <View style={[styles.inputWrapper, isDark && {backgroundColor: '#334155', borderColor: '#475569'}]}>
                        <Ionicons name="link-outline" size={20} color="#999" style={{ marginRight: 10 }} />
                        <TextInput 
                            style={[styles.input, isDark && {color: '#fff'}]}
                            placeholder="Ej. AB12CD"
                            placeholderTextColor={isDark ? "#94a3b8" : "#aaa"}
                            value={connectCode}
                            onChangeText={text => setConnectCode(text.toUpperCase())}
                            maxLength={8}
                        />
                      </View>
                    </View>

                    <TouchableOpacity 
                        style={[styles.actionButton, { width: '100%', justifyContent: 'center', backgroundColor: '#764ba2' }]} 
                        onPress={handleConnect} 
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <Text style={styles.actionButtonText}>Conectando...</Text>
                        ) : (
                            <>
                                <Ionicons name="people" size={20} color="#fff" />
                                <Text style={styles.actionButtonText}>Conectar Dispositivo</Text>
                            </>
                        )}
                    </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity 
                        style={[styles.actionButton, { width: '100%', justifyContent: 'center', backgroundColor: '#333' }]} 
                        onPress={openCamera} 
                        activeOpacity={0.8}
                    >
                        <Ionicons name="camera-outline" size={22} color="#fff" />
                        <Text style={styles.actionButtonText}>Abrir Cámara</Text>
                    </TouchableOpacity>
                )}
              </Animatable.View>
            </>
          )}

          {/* VISTA LISTA CUENTAS */}
          {viewMode === 'list' && (
             <Animatable.View animation="fadeInUp" duration={500}>
              {linkedAccounts.length === 0 ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                  <Ionicons name="people-outline" size={80} color="rgba(255,255,255,0.3)" />
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, marginTop: 16, textAlign: 'center' }}>Sin cuentas enlazadas</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 6, textAlign: 'center' }}>Conecta una cuenta con código o QR.</Text>
                </View>
              ) : (
                linkedAccounts.map((account) => (
                  <TouchableOpacity 
                    key={account.id} 
                    style={[styles.linkedUserCard, isDark && {backgroundColor: '#1e293b'}]}
                    onPress={() => {
                      setSelectedUser(account);
                      setViewMode('detail');
                    }}
                  >
                    {account.photo ? (
                       <Image source={{ uri: account.photo }} style={styles.userAvatar} />
                    ) : (
                       <View style={styles.userAvatarPlaceholder}>
                         <Ionicons name="person" size={30} color="#fff" />
                       </View>
                    )}
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, isDark && {color: '#fff'}]}>{account.name}</Text>
                      <Text style={[styles.userDetails, isDark && {color: '#cbd5e1'}]}>
                        {[account.age, account.weight, account.gender].filter(Boolean).join(' • ') || 'Sin información adicional'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#ccc" />
                  </TouchableOpacity>
                ))
              )}
             </Animatable.View>
          )}

          {/* VISTA DETALLE USUARIO */}
          {viewMode === 'detail' && selectedUser && (
              <Animatable.View animation="fadeIn" duration={400}>
                  {/* Tarjeta de Perfil */}
                  <View style={styles.detailHeader}>
                      <View style={styles.detailHeaderRow}>
                          {/* Avatar con badge de sincronizado */}
                          <View style={styles.detailAvatarContainer}>
                              {selectedUser.photo ? (
                                  <Image source={{ uri: selectedUser.photo }} style={styles.detailAvatar} />
                              ) : (
                                  <View style={[styles.detailAvatar, { backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }]}>
                                      <Ionicons name="person" size={44} color="#764ba2" />
                                  </View>
                              )}
                              {!!syncedUsers[selectedUser.id] && (
                                  <View style={styles.detailSyncedBadge}>
                                      <Ionicons name="checkmark" size={12} color="#fff" />
                                  </View>
                              )}
                          </View>

                          {/* Nombre */}
                          <View style={styles.detailInfo}>
                              <Text style={styles.detailName}>{selectedUser.name}</Text>
                              {/* Badges básicos */}
                              <View style={styles.detailStats}>
                                  {selectedUser.age && (
                                    <View style={styles.statBadge}>
                                        <Text style={styles.statText}>🎂 {selectedUser.age}</Text>
                                    </View>
                                  )}
                                  {selectedUser.gender && (
                                    <View style={styles.statBadge}>
                                        <Text style={styles.statText}>👤 {selectedUser.gender}</Text>
                                    </View>
                                  )}
                                  {selectedUser.weight && (
                                    <View style={styles.statBadge}>
                                        <Text style={styles.statText}>⚖️ {selectedUser.weight}</Text>
                                    </View>
                                  )}
                                  {selectedUser.bloodType && (
                                    <View style={styles.statBadge}>
                                        <Text style={styles.statText}>🩸 {selectedUser.bloodType}</Text>
                                    </View>
                                  )}
                              </View>
                          </View>
                      </View>

                      {/* Info médica adicional */}
                      {(selectedUser.medicalCondition || selectedUser.allergies || selectedUser.emergencyContact) && (
                        <View style={{ marginTop: 12, gap: 6 }}>
                          {selectedUser.medicalCondition && (
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                              <Ionicons name="medkit-outline" size={14} color="rgba(255,255,255,0.7)" style={{ marginTop: 2 }} />
                              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, flex: 1 }}>
                                <Text style={{ fontWeight: '700' }}>Condición: </Text>{selectedUser.medicalCondition}
                              </Text>
                            </View>
                          )}
                          {selectedUser.allergies && (
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                              <Ionicons name="alert-circle-outline" size={14} color="rgba(255,200,0,0.9)" style={{ marginTop: 2 }} />
                              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, flex: 1 }}>
                                <Text style={{ fontWeight: '700', color: 'rgba(255,220,0,0.9)' }}>Alergias: </Text>{selectedUser.allergies}
                              </Text>
                            </View>
                          )}
                          {selectedUser.emergencyContact && (
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                              <Ionicons name="call-outline" size={14} color="rgba(255,255,255,0.7)" style={{ marginTop: 2 }} />
                              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, flex: 1 }}>
                                <Text style={{ fontWeight: '700' }}>Contacto emergencia: </Text>{selectedUser.emergencyContact}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Botones de acción */}
                      <View style={styles.detailActionsRow}>
                          {!syncedUsers[selectedUser.id] && (
                          <TouchableOpacity
                              style={[styles.syncAllButton, syncInProgress && { opacity: 0.5 }]}
                              onPress={() => !syncInProgress && handleSyncAllReminders(selectedUser)}
                              activeOpacity={0.8}
                              disabled={syncInProgress}
                          >
                              <Ionicons name={syncInProgress ? 'hourglass-outline' : 'sync'} size={16} color="#fff" />
                              <Text style={styles.syncAllButtonText}>{syncInProgress ? 'Sincronizando...' : 'Sincronizar Recordatorios'}</Text>
                          </TouchableOpacity>
                          )}
                          <TouchableOpacity
                              style={styles.deleteUserButton}
                              onPress={() => handleUnlinkUser(selectedUser)}
                              activeOpacity={0.8}
                          >
                              <Ionicons name="trash-outline" size={16} color="#fff" />
                              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Eliminar</Text>
                          </TouchableOpacity>
                      </View>
                  </View>

                  {/* Lista de recordatorios */}
                  {(() => {
                    const activeReminders = (selectedUser.reminders || []).filter((r) => !!r.active);
                    return (
                      <>
                        <Text style={{ fontSize: 18, color: '#fff', fontWeight: '700', marginBottom: 16, marginLeft: 4 }}>
                          Recordatorios activos ({activeReminders.length})
                        </Text>

                        {activeReminders.length === 0 ? (
                          <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: 24, borderRadius: 16, alignItems: 'center' }}>
                            <Ionicons name="notifications-off-outline" size={44} color="rgba(255,255,255,0.5)" />
                            <Text style={{ color: '#fff', fontWeight: '700', marginTop: 10, fontSize: 15 }}>Sin recordatorios activos</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.6)', marginTop: 4, fontSize: 13, textAlign: 'center' }}>Este usuario no tiene recordatorios activos.</Text>
                          </View>
                        ) : (
                          activeReminders.map((reminder) => {
                            const times = (reminder.doseTimes && reminder.doseTimes.length > 0) ? reminder.doseTimes : [reminder.time];
                            const nextTime = getNextDoseTime(times);
                            const isSynced = !!syncedUsers[selectedUser.id];
                            const strength = reminder.dose
                              ? `${reminder.dose}${reminder.medStrengthUnit ? ' ' + reminder.medStrengthUnit : ' mg'}`
                              : null;

                            return (
                              <View
                                key={reminder.id}
                                style={[
                                  {
                                    backgroundColor: isDark ? '#1e293b' : '#fff',
                                    borderRadius: 18,
                                    marginBottom: 14,
                                    flexDirection: 'row',
                                    overflow: 'hidden',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 3 },
                                    shadowOpacity: 0.12,
                                    shadowRadius: 8,
                                    elevation: 5,
                                  }
                                ]}
                              >
                                {/* Barra acento lateral */}
                                <View style={{ width: 6, backgroundColor: '#667eea', borderTopLeftRadius: 18, borderBottomLeftRadius: 18 }} />

                                <View style={{ flex: 1, padding: 14 }}>
                                  {/* Header: ícono + nombre + dosis */}
                                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                    <View style={{
                                      width: 38, height: 38, borderRadius: 10,
                                      backgroundColor: '#667eea', alignItems: 'center', justifyContent: 'center',
                                      marginRight: 10,
                                    }}>
                                      <Ionicons name="medical" size={20} color="#fff" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <Text style={{ fontSize: 16, fontWeight: '800', color: isDark ? '#fff' : '#1e293b' }} numberOfLines={1}>
                                        {reminder.medName}
                                      </Text>
                                      {strength && (
                                        <Text style={{ fontSize: 12, color: '#667eea', fontWeight: '700', marginTop: 1 }}>{strength}</Text>
                                      )}
                                    </View>
                                    {/* Badge estado */}
                                    <View style={{
                                      backgroundColor: isSynced ? 'rgba(46,204,113,0.15)' : 'rgba(76,175,80,0.12)',
                                      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
                                    }}>
                                      <Text style={{ fontSize: 10, fontWeight: '800', color: isSynced ? '#2ecc71' : '#4CAF50' }}>
                                        {isSynced ? 'SINCRONIZADO' : 'ACTIVO'}
                                      </Text>
                                    </View>
                                  </View>

                                  {/* Divisor */}
                                  <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0', marginBottom: 10 }} />

                                  {/* Info: presentación + cantidad */}
                                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                                    {(reminder.medType || reminder.strength) ? (
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Ionicons name="cube-outline" size={13} color={isDark ? '#94a3b8' : '#888'} />
                                        <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#555' }}>
                                          {reminder.medType || reminder.strength}
                                        </Text>
                                      </View>
                                    ) : null}
                                    {reminder.quantityToTake ? (
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Ionicons name="eyedrop-outline" size={13} color={isDark ? '#94a3b8' : '#888'} />
                                        <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#555' }}>
                                          Cantidad: {reminder.quantityToTake}
                                        </Text>
                                      </View>
                                    ) : null}
                                  </View>

                                  {/* Dosis (horas) */}
                                  <Text style={{ fontSize: 11, color: isDark ? '#64748b' : '#aaa', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    <Ionicons name="time-outline" size={11} />  Dosis
                                  </Text>
                                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                                    {times.map((t, idx) => {
                                      const isNext = t === nextTime;
                                      return (
                                        <View key={idx} style={{
                                          flexDirection: 'row', alignItems: 'center',
                                          backgroundColor: isNext
                                            ? (isDark ? '#1e3a5f' : '#eff6ff')
                                            : (isDark ? '#334155' : '#f8f9fa'),
                                          paddingHorizontal: 10, paddingVertical: 5,
                                          borderRadius: 10,
                                          borderWidth: isNext ? 1.5 : 0,
                                          borderColor: isNext ? '#2563eb' : 'transparent',
                                        }}>
                                          <View style={{
                                            width: 18, height: 18, borderRadius: 9,
                                            backgroundColor: isNext ? '#2563eb' : (isDark ? '#475569' : '#e2e8f0'),
                                            alignItems: 'center', justifyContent: 'center', marginRight: 5,
                                          }}>
                                            <Text style={{ fontSize: 9, fontWeight: '800', color: isNext ? '#fff' : (isDark ? '#94a3b8' : '#64748b') }}>{idx + 1}</Text>
                                          </View>
                                          <Text style={{ fontSize: 13, fontWeight: '700', color: isNext ? '#2563eb' : (isDark ? '#e2e8f0' : '#334155') }}>
                                            {t}
                                          </Text>
                                          {isNext && (
                                            <Text style={{ fontSize: 9, color: '#2563eb', fontWeight: '700', marginLeft: 4 }}>← Próx.</Text>
                                          )}
                                        </View>
                                      );
                                    })}
                                  </View>

                                  {/* Días activos */}
                                  {Array.isArray(reminder.days) && reminder.days.length > 0 && (
                                    <>
                                      <Text style={{ fontSize: 11, color: isDark ? '#64748b' : '#aaa', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        <Ionicons name="calendar-outline" size={11} />  Días
                                      </Text>
                                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                                        {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map((day) => {
                                          const active = reminder.days.includes(day);
                                          return (
                                            <View key={day} style={{
                                              paddingHorizontal: 8, paddingVertical: 3,
                                              borderRadius: 8,
                                              backgroundColor: active
                                                ? (isDark ? 'rgba(102,126,234,0.25)' : 'rgba(102,126,234,0.12)')
                                                : (isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6'),
                                            }}>
                                              <Text style={{ fontSize: 10, fontWeight: active ? '800' : '500', color: active ? '#667eea' : (isDark ? '#475569' : '#aaa') }}>
                                                {day.slice(0, 3)}
                                              </Text>
                                            </View>
                                          );
                                        })}
                                      </View>
                                    </>
                                  )}

                                  {/* Texto de aviso de sincronización */}
                                  {isSynced && (() => {
                                    void clockTick;
                                    const toParse = nextTime || times[0];
                                    const parsed = parseHHMM(toParse);
                                    if (!parsed) return null;
                                    const mins = minutesUntilNextOccurrence(parsed.hh, parsed.mm);
                                    const whenTxt = humanizeMinutes(mins);
                                    return (
                                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(46,204,113,0.1)', padding: 8, borderRadius: 10, marginTop: 4 }}>
                                        <Ionicons name="notifications" size={14} color="#2ecc71" style={{ marginRight: 6 }} />
                                        <Text style={{ color: '#27ae60', fontWeight: '700', fontSize: 12, flex: 1 }}>
                                          Aviso a las {parsed.hhmm} ({whenTxt})
                                        </Text>
                                      </View>
                                    );
                                  })()}
                                </View>
                              </View>
                            );
                          })
                        )}
                      </>
                    );
                  })()}
              </Animatable.View>
          )}

        </ScrollView>
            </KeyboardAvoidingView>
          </View>
      </LinearGradient>

      <Modal visible={cameraVisible} animationType="slide" transparent={false}>
          <View style={styles.cameraContainer}>
            <CameraView 
                style={styles.camera}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
            >
                <View style={styles.overlay}>
                    <Text style={{color: 'white', fontSize: 18, marginBottom: 20, fontWeight: '600'}}>Escanea el código QR</Text>
                    <View style={styles.scanArea} />
                    <Text style={{color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 20}}>Coloca el código dentro del cuadro</Text>
                    
                    <TouchableOpacity style={styles.cancelScanButton} onPress={() => setCameraVisible(false)}>
                        <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </CameraView>
          </View>
      </Modal>

      {/* Modal Personalizado Global (Estilo unificado) */}
      <Modal
        visible={customAlert.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
           if(customAlert.buttons.length <= 1) setCustomAlert(prev => ({...prev, visible: false}));
        }}
      >
        <View style={styles.modalOverlay}>
            <Animatable.View 
                animation="zoomIn" 
                duration={300} 
                style={[styles.modalContent, isDark && { backgroundColor: theme.card }]}
            >
                <View style={styles.modalIconContainer}>
                    <View style={[styles.modalIconCircle, { borderColor: customAlert.color + '33', backgroundColor: customAlert.color + '1A' }]}>
                        <Ionicons name={customAlert.icon} size={32} color={customAlert.color} />
                    </View>
                </View>

                <Text style={[styles.modalTitle, isDark && { color: theme.text }]}>{customAlert.title}</Text>
                <Text style={[styles.modalMessage, isDark && { color: theme.textSecondary }]}>{customAlert.message}</Text>

                <View style={[styles.modalButtons, { flexDirection: customAlert.buttons.length > 2 ? 'column' : 'row' }]}>
                    {customAlert.buttons.map((btn, index) => {
                        const isCancel = btn.style === 'cancel';
                        const isDestructive = btn.style === 'destructive';
                        
                        if (isCancel) {
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.modalCancelButton, isDark && { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                                    onPress={() => {
                                        setCustomAlert(prev => ({...prev, visible: false}));
                                        if (btn.onPress) btn.onPress();
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.modalCancelText, isDark && { color: theme.text }]}>{btn.text}</Text>
                                </TouchableOpacity>
                            );
                        }

                        return (
                            <TouchableOpacity
                                key={index}
                                style={styles.modalButton}
                                onPress={() => {
                                    setCustomAlert(prev => ({...prev, visible: false}));
                                    if(btn.onPress) btn.onPress();
                                }}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={isDestructive ? ['#ff4b1f', '#ff9068'] : ['#f093fb', '#f5576c']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.modalButtonGradient}
                                >
                                    <Text style={styles.modalButtonText}>{btn.text}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </Animatable.View>
        </View>
      </Modal>

    </View>
  );
}
