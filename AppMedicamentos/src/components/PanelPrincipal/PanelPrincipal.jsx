import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  Alert,
  Modal,
  AppState,
} from 'react-native';
import * as Battery from 'expo-battery';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import ReminderCard from './ReminderCard';
import styles from './PanelPrincipal.Styles';
import { authService, supabase } from '../../services/supabaseClient';
import { useTheme } from '../../context/ThemeContext';
import { registerAndSavePushToken } from './AlarmaYRecordatorio/NotificacionesORecordatorios';

const { width } = Dimensions.get('window');
const ALARMS_KEY = '@alarms_v1';
const DOSE_HISTORY_KEY = '@dose_history';

export default function PanelPrincipal({ userName = 'Usuario', onLogout }) {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [localUserName, setLocalUserName] = useState(userName);
  const [profileImage, setProfileImage] = useState(null);
  const [welcomeMessage, setWelcomeMessage] = useState('¡Bienvenido de vuelta!');
  const [stats, setStats] = useState({ 
    remindersToday: 0, 
    completed: 0, 
    activeMeds: 0,
    daysOfUse: 0,
  });

  const [pendingReminders, setPendingReminders] = useState([]);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyDetailMed, setHistoryDetailMed] = useState(null);
  const [batterySaverOn, setBatterySaverOn] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  // Cargar imagen de perfil al montar el componente
  useEffect(() => {
    loadProfileImage();
    loadWelcomeMessage();
    registerAndSavePushToken();
    checkBatterySaver();

    // Re-chequear cuando la app vuelve al primer plano
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        checkBatterySaver();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

  const checkBatterySaver = async () => {
    try {
      const state = await Battery.getPowerStateAsync();
      setBatterySaverOn(state.lowPowerMode === true);
    } catch (_) {
      setBatterySaverOn(false);
    }
  };

  const loadWelcomeMessage = async () => {
    try {
      const msg = await AsyncStorage.getItem('welcomeMessage');
      if (msg) setWelcomeMessage(msg);
    } catch (e) {
      console.log('Error loading welcome message:', e);
    }
  };

  const loadProfileImage = async () => {
    try {
      // 1. Intentar cargar User Metadata (Google/Auth) primero
      // Esto arregla el caso donde el usuario entra y no se ve su foto de Google
      const { data: { user } } = await authService.getCurrentUser();
      
      let avatarFromMeta = null;
      if (user && user.user_metadata) {
          avatarFromMeta = user.user_metadata.avatar_url || user.user_metadata.picture;
      }

      // 2. Intentar perfil de Supabase (si el usuario la cambió manualmente)
      const { data: profile } = await authService.getProfile();
      
      let finalAvatarUrl = null;

      // Prioridad: Perfil Custom > Metadata Google > Local Storage
      if (profile && profile.avatar_url) {
          finalAvatarUrl = profile.avatar_url;
      } else if (avatarFromMeta) {
          finalAvatarUrl = avatarFromMeta;
      }

      if (finalAvatarUrl) {
          setProfileImage(finalAvatarUrl);
          await AsyncStorage.setItem('profileImage', finalAvatarUrl);
          return;
      }
      
      // 3. Fallback a almacenamiento local
      const savedImage = await AsyncStorage.getItem('profileImage');
      if (savedImage) {
        setProfileImage(savedImage);
      }
    } catch (error) {
      console.log('Error al cargar imagen de perfil:', error);
    }
  };

  const handleChangeProfileImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert(
          'Permiso requerido',
          'Por favor permite el acceso a la galería para cambiar tu foto de perfil',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        setProfileImage(imageUri); // Mostrar inmediatamente
        
        // 1. Guardar localmente
        await AsyncStorage.setItem('profileImage', imageUri);
        
        // 2. Subir a Supabase y actualizar perfil
        try {
            const { url, error } = await authService.uploadAvatar(imageUri);
            if (url && !error) {
                await authService.upsertProfile({ avatar_url: url });
                // Actualizar referencia local con URL remota para consistencia futura
                await AsyncStorage.setItem('profileImage', url);
            } else {
                console.log("Error subiendo imagen", error);
                Alert.alert("Aviso", "La imagen se guardó solo en este dispositivo. Error al subir a la nube.");
            }
        } catch (uploadErr) {
            console.log("Excepción subiendo imagen", uploadErr);
        }
      }
    } catch (error) {
      console.log('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const loadStats = async () => {
    try {
      const { data: userData } = await authService.getCurrentUser();
      const userId = userData?.user?.id;
      // Si no hay usuario, igual intentamos contar alarmas locales

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const remindersRes = await supabase
        .from('reminders')
        .select('id', { count: 'exact', head: true })
        .gte('scheduled_at', start.toISOString())
        .lte('scheduled_at', end.toISOString())
        .eq('user_id', userId);

      const completedRes = await supabase
        .from('reminders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'done');

      const medsRes = await supabase
        .from('medicines')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('active', true);

      // Alarmas locales (AsyncStorage)
      let localActiveAlarms = 0;
      let relevantReminders = [];
      try {
        const stored = await AsyncStorage.getItem(ALARMS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          localActiveAlarms = parsed.filter(a => a.active).length;

          // Lógica para detectar recordatorios pendientes
          const now = new Date();
          const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
          const currentDayIndex = now.getDay(); // 0=Domingo, 1=Lunes, ...
          // Mapeo de días de JS (0-6) a formato guardado en alarma
          // Asumo que 'days' guarda strings: ["Lunes", "Martes", ...] o ids. 
          // Según el código leído en AlarmaYRecordatorio, usa strings completos en 'weekDays'.
          const dayMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
          const todayName = dayMap[currentDayIndex];

          relevantReminders = parsed.filter(alarm => {
             if (!alarm.active) return false;
             if (alarm.hour === undefined || alarm.minute === undefined) return false;

             // 1. Validar Día (Si el array days existe y no está vacío)
             // Si el array days está vacío, asumimos que es una alarma puntual o diaria? 
             // Generalmente si está vacío en selectores de días suele significar "solo una vez" o "todos los días" dependiendo la UX.
             // Asumiremos: Si tiene días, debe coincidir hoy. Si no tiene, asumimos todos los días (o validamos lógica de negocio).
             // Vamos a ser estrictos: Si hay lista de días seleccionados, hoy debe estar en ella.
             if (alarm.days && alarm.days.length > 0) {
                 if (!alarm.days.includes(todayName)) return false;
             }

             const alarmTotalMinutes = alarm.hour * 60 + alarm.minute;
             let diff = alarmTotalMinutes - currentTotalMinutes;

             // Ajuste para cruce de medianoche
             if (diff < -720) diff += 1440; // Por ejemplo, son las 23:55 y alarma es 00:05. alarm=5, curr=1435. diff = -1430.
             if (diff > 720) diff -= 1440;  // Por ejemplo, son las 00:05 y alarma es 23:55. alarm=1435, curr=5. diff = 1430.

             // Obtener tiempo de recordatorio específico de la alarma (o default 5)
             const reminderTime = alarm.reminderMinutes || 5;

             // Rango de visualización:
             // Desde: reminderTime minutos ANTES de la toma (diff <= reminderTime)
             // Hasta: 60 minutos DESPUÉS de la toma (diff >= -60)
             // La condición diff > 0 significa "faltan X minutos". diff < 0 significa "pasaron X minutos".
             
             // Si diff es 10 y reminderTime es 5 -> Faltan 10, aviso a los 5. NO MOSTRAR.
             // Si diff es 4 y reminderTime es 5 -> Faltan 4. MOSTRAR.
             // Si diff es -10 -> Pasaron 10. MOSTRAR (hasta -60).
             
             return diff <= reminderTime && diff >= -60;
          });
        }
      } catch (err) {
        console.log('Error leyendo alarmas locales:', err);
      }
      
      setPendingReminders(relevantReminders);

      // Calcular días de uso basados en la cuenta del usuario (PERSISTENTE)
      let daysOfUse = 1;
      let startDateStr = null;

      if (userData?.user?.created_at) {
          startDateStr = userData.user.created_at;
      } else {
          // Fallback a almacenamiento local si por alguna razón no hay user.created_at
          startDateStr = await AsyncStorage.getItem('appStartDate');
          if (!startDateStr) {
            startDateStr = new Date().toISOString();
            await AsyncStorage.setItem('appStartDate', startDateStr);
          }
      }

      if (startDateStr) {
          const startDate = new Date(startDateStr);
          const currentDate = new Date();
          const diffInMs = currentDate.getTime() - startDate.getTime();
          const fullDaysPassed = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
          daysOfUse = fullDaysPassed + 1;
      }

      // Leer historial de dosis completadas
      let historyList = [];
      try {
        const histStored = await AsyncStorage.getItem(DOSE_HISTORY_KEY);
        historyList = histStored ? JSON.parse(histStored) : [];
      } catch (_e) { /* noop */ }
      setHistoryEntries(historyList);

      setStats({
        remindersToday: remindersRes.count ?? 0,
        completed: historyList.length,
        activeMeds: localActiveAlarms || medsRes.count || 0,
        daysOfUse: daysOfUse,
      });
    } catch (e) {
      console.log('Error loading stats:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
      // Recargar nombre al volver desde el perfil
      const refreshName = async () => {
        try {
          const { data } = await authService.getProfile();
          if (data?.name) {
            setLocalUserName(data.name);
            return;
          }
          const stored = await AsyncStorage.getItem('userName');
          if (stored) setLocalUserName(stored);
        } catch (_) {
          const stored = await AsyncStorage.getItem('userName');
          if (stored) setLocalUserName(stored);
        }
      };
      refreshName();
    }, [])
  );

  const menuItems = [
    {
      id: 1,
      title: 'Crea tus Recordatorios',
      icon: 'alarm',
      color: '#6366F1',
      bgColor: isDark ? '#1e1b4b' : '#eeeeff',
      borderColor: '#6366F1',
      route: '/alarma',
    },
    {
      id: 2,
      title: 'Conecta tus recordatorios',
      icon: 'link',
      color: '#8B5CF6',
      bgColor: isDark ? '#2e1b4e' : '#f0ebff',
      borderColor: '#8B5CF6',
      route: '/conectar',
    },
    {
      id: 3,
      title: 'Buscar Medicamentos',
      icon: 'search',
      color: '#06B6D4',
      bgColor: isDark ? '#0c2a33' : '#e0f9fd',
      borderColor: '#06B6D4',
      route: '/buscar',
    },
    {
      id: 4,
      title: 'Mi Perfil',
      icon: 'person',
      color: '#3B82F6',
      bgColor: isDark ? '#0f1e3d' : '#e8f1ff',
      borderColor: '#3B82F6',
      route: '/perfil',
    },
  ];

  const handleMenuPress = (route) => {
    try {
      router.push(route);
    } catch (e) {
      console.log('Navigation error:', e);
    }
  };

  const bgColors = isDark 
    ? [theme.background, '#1a1a2e', '#16213e'] 
    : ['#667eea', '#764ba2', '#f093fb'];

  return (
    <LinearGradient
      colors={bgColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>

        {/* Overlay ahorro de batería — bloquea pantalla hasta desactivar */}
        {batterySaverOn && (
          <View style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.72)',
            zIndex: 999,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 28,
          }}>
            <Animatable.View
              animation="zoomIn"
              duration={450}
              style={{
                width: '100%',
                borderRadius: 24,
                overflow: 'hidden',
                elevation: 20,
                shadowColor: '#F59E0B',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.5,
                shadowRadius: 16,
              }}
            >
              <LinearGradient
                colors={['#1c1107', '#2d1a0a', '#3d2108']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  padding: 28,
                  borderRadius: 24,
                  borderWidth: 1.5,
                  borderColor: 'rgba(245,158,11,0.5)',
                  alignItems: 'center',
                }}
              >
                {/* Icono principal */}
                <Animatable.View
                  animation="pulse"
                  iterationCount="infinite"
                  duration={2000}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: 'rgba(245,158,11,0.15)',
                    borderWidth: 2,
                    borderColor: 'rgba(245,158,11,0.4)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                  }}
                >
                  <Ionicons name="battery-dead" size={36} color="#F59E0B" />
                </Animatable.View>

                {/* Título */}
                <Text style={{
                  color: '#FCD34D',
                  fontWeight: '800',
                  fontSize: 18,
                  textAlign: 'center',
                  letterSpacing: 0.3,
                  marginBottom: 12,
                }}>
                  Ahorro de energía activo
                </Text>

                {/* Línea divisora */}
                <View style={{ width: 48, height: 2, backgroundColor: '#F59E0B', borderRadius: 2, marginBottom: 16, opacity: 0.6 }} />

                {/* Mensaje */}
                <Text style={{
                  color: '#FDE68A',
                  fontSize: 14,
                  lineHeight: 22,
                  textAlign: 'center',
                  fontWeight: '500',
                  marginBottom: 8,
                }}>
                  Tu dispositivo está en modo ahorro de batería. Esto puede retrasar o bloquear todas las alarmas y notificaciones de medicamentos.
                </Text>
                <Text style={{
                  color: 'rgba(253,230,138,0.65)',
                  fontSize: 13,
                  lineHeight: 20,
                  textAlign: 'center',
                  marginBottom: 24,
                }}>
                  Este mensaje desaparecerá automáticamente cuando desactives el ahorro de energía.
                </Text>

                {/* Indicador */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(245,158,11,0.1)',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(245,158,11,0.25)',
                }}>
                  <Ionicons name="settings-outline" size={16} color="#F59E0B" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '700' }}>
                    Ajustes → Batería → Desactivar ahorro
                  </Text>
                </View>
              </LinearGradient>
            </Animatable.View>
          </View>
        )}

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 24 + insets.bottom }
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          {/* Header */}
          <Animatable.View
            animation="slideInDown"
            duration={800}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.greeting}>{welcomeMessage}</Text>
                <Text style={styles.userName}>{localUserName}</Text>
              </View>
              <View style={styles.profileSection}>
                <TouchableOpacity
                  style={styles.profilePictureContainer}
                  onPress={() => handleMenuPress('/perfil')}
                  activeOpacity={0.7}
                >
                  <View style={styles.profilePicture}>
                    {profileImage ? (
                      <Image 
                        source={{ uri: profileImage }} 
                        style={styles.profileImage}
                      />
                    ) : (
                      <Ionicons name="person" size={32} color="#fff" />
                    )}
                  </View>
                  <TouchableOpacity 
                    style={styles.editIconContainer}
                    onPress={handleChangeProfileImage}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera" size={14} color="#fff" />
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            </View>
          </Animatable.View>

          {/* Botón Recordatorios Pendientes (Condicional) */}
          {pendingReminders.length > 0 && (
            <Animatable.View 
              animation="bounceIn" 
              duration={1000} 
              style={{ marginHorizontal: 20, marginBottom: 20 }}
            >
              <TouchableOpacity
                style={{
                  backgroundColor: '#FF6B6B',
                  padding: 16,
                  borderRadius: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4.65,
                  elevation: 8,
                }}
                activeOpacity={0.8}
                onPress={() => setReminderModalVisible(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)', 
                        padding: 8, 
                        borderRadius: 12,
                        marginRight: 12
                    }}>
                        <Ionicons name="notifications" size={24} color="#fff" />
                    </View>
                    <View>
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                            Recordatorios Pendientes
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>
                            Tienes {pendingReminders.length} medicinas por tomar
                        </Text>
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>
            </Animatable.View>
          )}

          {/* Advanced Stats Card - Diseño moderno y bacano */}
          <Animatable.View
            animation="fadeInUp"
            duration={900}
            delay={200}
            style={[styles.statsContainer, isDark && { shadowColor: '#000', shadowOpacity: 0.5 }]}
          >
            <LinearGradient
              colors={isDark ? [theme.card, 'rgba(30,30,30,0.9)'] : ['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.92)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statsCard}
            >
              {/* Stat 1: Días de uso */}
              <View style={styles.statItem}>
                <View style={[styles.statIconCircle, { backgroundColor: '#667eea' }]}>
                  <Ionicons name="calendar" size={22} color="#fff" />
                </View>
                <Text style={[styles.statNumber, { color: '#667eea' }]}>{stats.daysOfUse}</Text>
                <Text style={[styles.statLabel, isDark && { color: theme.textSecondary }]}>Días de uso</Text>
              </View>

              <View style={styles.verticalDivider} />

              {/* Stat 2: Alarmas activas */}
              <View style={styles.statItem}>
                <View style={[styles.statIconCircle, { backgroundColor: '#764ba2' }]}>
                  <Ionicons name="alarm" size={22} color="#fff" />
                </View>
                <Text style={[styles.statNumber, { color: '#764ba2' }]}>{stats.activeMeds}</Text>
                <Text style={[styles.statLabel, isDark && { color: theme.textSecondary }]}>Recordatorios Activos</Text>
              </View>

              <View style={styles.verticalDivider} />

              {/* Stat 3: Historial de dosis */}
              <TouchableOpacity
                style={styles.statItem}
                onPress={async () => {
                  try {
                    const stored = await AsyncStorage.getItem(DOSE_HISTORY_KEY);
                    setHistoryEntries(stored ? JSON.parse(stored) : []);
                  } catch (_e) {}
                  setHistoryModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.statIconCircle, { backgroundColor: '#4facfe' }]}>
                  <Ionicons name="time" size={22} color="#fff" />
                </View>
                <Text style={[styles.statNumber, { color: '#4facfe' }]}>{stats.completed}</Text>
                <Text style={[styles.statLabel, isDark && { color: theme.textSecondary }]}>Historial de Dosis</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animatable.View>

          {/* Menu Grid - 4 Tiles (2x2) */}
          <View style={styles.menuSection}>
            <View style={styles.menuGrid}>
              {menuItems.map((item, index) => (
                <Animatable.View
                  key={item.id}
                  animation="slideInUp"
                  duration={800}
                  delay={300 + index * 100}
                  style={{
                    width: '48%',
                    borderRadius: 22,
                    backgroundColor: item.bgColor,
                    elevation: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.25,
                    shadowRadius: 14,
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.menuCard,
                      { 
                        borderColor: item.borderColor,
                        backgroundColor: item.bgColor,
                      },
                    ]}
                    onPress={() => handleMenuPress(item.route)}
                  >
                    <View style={[styles.menuCardGradient, { backgroundColor: item.bgColor }]}>
                      <View
                        style={[
                          styles.iconContainer,
                          { 
                            backgroundColor: item.color,
                          },
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={38}
                          color="#fff"
                        />
                      </View>
                      <Text style={[styles.menuTitle2, { color: isDark ? '#F5F5F5' : item.color }]}>
                        {item.title}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animatable.View>
              ))}
            </View>
          </View>

          {/* Info Card */}
          <Animatable.View
            animation="fadeIn"
            duration={1000}
            delay={600}
            style={[styles.infoCard, isDark && { backgroundColor: theme.card }]}
          >
            <Ionicons name="information-circle" size={20} color={isDark ? theme.textSecondary : "#667eea"} />
            <Text style={[styles.infoText, isDark && { color: theme.textSecondary }]}>
              Mantén tus medicinas organizadas y recibe recordatorios personalizados
            </Text>
          </Animatable.View>

          {/* Modal de Recordatorios Pendientes */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={reminderModalVisible}
            onRequestClose={() => setReminderModalVisible(false)}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                <Animatable.View 
                    animation="zoomIn" 
                    duration={400}
                    style={{ backgroundColor: isDark ? theme.card : '#fff', borderRadius: 20, padding: 20, maxHeight: '80%', elevation: 10 }}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' }}>
                        <Text style={{ fontSize: 22, fontWeight: 'bold', color: isDark ? theme.text : '#333' }}>
                            💊 Hora de tu medicina
                        </Text>
                        <TouchableOpacity onPress={() => setReminderModalVisible(false)}>
                            <Ionicons name="close-circle" size={32} color={isDark ? theme.textSecondary : "#ccc"} />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {pendingReminders.length === 0 ? (
                            <Text style={{ textAlign: 'center', color: isDark ? theme.textSecondary : '#666', marginVertical: 20 }}>
                                No hay recordatorios pendientes en este momento.
                            </Text>
                        ) : (
                            pendingReminders.map((reminder, index) => (
                                <View key={index} style={{ 
                                    padding: 15, 
                                    marginBottom: 10,
                                    borderRadius: 12,
                                    backgroundColor: isDark ? '#2d3748' : '#f7fafc',
                                }}>
                                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? theme.text : '#333' }}>
                                        {reminder.medName}
                                    </Text>
                                    <Text style={{ fontSize: 14, color: isDark ? theme.textSecondary : '#666', marginTop: 4 }}>
                                        Gestiona este recordatorio en la sección Alarmas
                                    </Text>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </Animatable.View>
            </View>
          </Modal>

          {/* Modal Historial de Dosis Completadas */}
          <Modal
            visible={historyModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => { setHistoryModalVisible(false); setHistoryDetailMed(null); }}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
              <Animatable.View
                animation="zoomIn"
                duration={400}
                style={{ backgroundColor: isDark ? theme.card : '#fff', borderRadius: 20, padding: 20, maxHeight: '85%', elevation: 10 }}
              >
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    {historyDetailMed && (
                      <TouchableOpacity onPress={() => setHistoryDetailMed(null)} style={{ marginRight: 10 }}>
                        <Ionicons name="arrow-back" size={24} color={isDark ? theme.text : '#333'} />
                      </TouchableOpacity>
                    )}
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? theme.text : '#333', flex: 1 }} numberOfLines={1}>
                      {historyDetailMed ? `💊 ${historyDetailMed}` : '✅ Historial de dosis'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => { setHistoryModalVisible(false); setHistoryDetailMed(null); }}>
                    <Ionicons name="close-circle" size={32} color={isDark ? theme.textSecondary : '#ccc'} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {historyEntries.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: isDark ? theme.textSecondary : '#666', marginVertical: 30, fontSize: 15 }}>
                      Aún no has aceptado ninguna dosis.
                    </Text>
                  ) : historyDetailMed ? (
                    /* Vista detalle: estilo chat (WhatsApp-like) */
                    (() => {
                      const pad = (n) => String(n).padStart(2, '0');
                      const fmt12 = (d) => {
                        const h = d.getHours(), m = pad(d.getMinutes());
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        return `${h % 12 || 12}:${m} ${ampm}`;
                      };
                      const today = new Date();
                      const yesterday = new Date(today);
                      yesterday.setDate(today.getDate() - 1);
                      const getDateLabel = (ts) => {
                        const d = new Date(ts);
                        if (d.toDateString() === today.toDateString()) return 'Hoy';
                        if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
                        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
                      };

                      const entries = historyEntries
                        .filter(e => e.medName === historyDetailMed)
                        .sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt)); // cronológico (como chat)

                      // Construir lista con separadores de fecha
                      const items = [];
                      let lastLabel = '';
                      entries.forEach(entry => {
                        const label = getDateLabel(entry.takenAt);
                        if (label !== lastLabel) {
                          items.push({ type: 'sep', label });
                          lastLabel = label;
                        }
                        items.push({ type: 'msg', entry });
                      });

                      if (items.length === 0) {
                        return (
                          <Text style={{ textAlign: 'center', color: isDark ? '#64748b' : '#aaa', marginTop: 30, fontSize: 14 }}>
                            Sin registros para este medicamento.
                          </Text>
                        );
                      }

                      return (
                        <View style={{ paddingBottom: 10 }}>
                          {items.map((item, i) => {
                            if (item.type === 'sep') {
                              return (
                                <View key={`s-${i}`} style={{ alignItems: 'center', marginVertical: 12 }}>
                                  <View style={{
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)',
                                    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4,
                                  }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#94a3b8' : '#64748b' }}>
                                      {item.label}
                                    </Text>
                                  </View>
                                </View>
                              );
                            }
                            const { entry } = item;
                            const takenDate = new Date(entry.takenAt);
                            const scheduledDate = entry.scheduledTime ? new Date(entry.scheduledTime) : null;
                            return (
                              <View key={entry.id} style={{ alignItems: 'center', marginBottom: 10 }}>
                                <View style={{
                                  backgroundColor: '#16a34a',
                                  borderRadius: 18,
                                  paddingHorizontal: 18,
                                  paddingVertical: 12,
                                  shadowColor: '#000',
                                  shadowOffset: { width: 0, height: 2 },
                                  shadowOpacity: 0.15,
                                  shadowRadius: 4,
                                  elevation: 3,
                                  width: '85%',
                                  alignItems: 'center',
                                }}>
                                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: scheduledDate ? 6 : 4 }}>
                                    {entry.doseLabel}
                                  </Text>
                                  {scheduledDate && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                                      <Ionicons name="alarm-outline" size={12} color="rgba(255,255,255,0.7)" style={{ marginRight: 4 }} />
                                      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
                                        Programada: {fmt12(scheduledDate)}
                                      </Text>
                                    </View>
                                  )}
                                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 2 }}>
                                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                                      {fmt12(takenDate)}
                                    </Text>
                                    <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.9)" />
                                  </View>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      );
                    })()
                  ) : (
                    /* Vista lista: un card por medicamento */
                    (() => {
                      // Agrupar por medName y ordenar por toma más reciente
                      const grouped = {};
                      historyEntries.forEach(e => {
                        if (!grouped[e.medName]) grouped[e.medName] = [];
                        grouped[e.medName].push(e);
                      });
                      // Ordenar medicamentos por la toma más reciente
                      const medsSorted = Object.entries(grouped).sort((a, b) => {
                        const latestA = Math.max(...a[1].map(e => new Date(e.takenAt).getTime()));
                        const latestB = Math.max(...b[1].map(e => new Date(e.takenAt).getTime()));
                        return latestB - latestA;
                      });
                      return medsSorted.map(([medName, entries]) => {
                        const latest = entries.reduce((a, b) => new Date(a.takenAt) > new Date(b.takenAt) ? a : b);
                        const d = new Date(latest.takenAt);
                        const pad = (n) => String(n).padStart(2, '0');
                        const latestStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                        return (
                          <View
                            key={medName}
                            style={{
                              padding: 14,
                              marginBottom: 12,
                              borderRadius: 16,
                              backgroundColor: isDark ? 'rgba(79,172,254,0.08)' : '#f0f8ff',
                              borderWidth: 1,
                              borderColor: isDark ? 'rgba(79,172,254,0.25)' : '#bde0fe',
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontWeight: '800', color: isDark ? '#fff' : '#333' }}>{medName}</Text>
                                <Text style={{ fontSize: 11, color: isDark ? '#aaa' : '#888', marginTop: 1 }}>
                                  {entries.length} dosis registrada{entries.length !== 1 ? 's' : ''}
                                </Text>
                              </View>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                              <Ionicons name="time-outline" size={13} color={isDark ? '#aaa' : '#888'} />
                              <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#888', marginLeft: 4 }}>
                                Última toma: {latestStr}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => setHistoryDetailMed(medName)}
                              style={{
                                backgroundColor: '#4facfe',
                                borderRadius: 10,
                                paddingVertical: 10,
                                alignItems: 'center',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                gap: 6,
                              }}
                            >
                              <Ionicons name="time-outline" size={17} color="#fff" />
                              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Ver historial de este medicamento</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      });
                    })()
                  )}
                </ScrollView>
              </Animatable.View>
            </View>
          </Modal>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
