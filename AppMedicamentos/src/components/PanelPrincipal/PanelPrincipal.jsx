import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  RefreshControl,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ReminderCard from './ReminderCard';
import styles from './PanelPrincipal.Styles';
import { authService, supabase } from '../../services/supabaseClient';
import { useTheme } from '../../context/ThemeContext';
import { registerAndSavePushToken } from './AlarmaYRecordatorio/NotificacionesORecordatorios';

const { width } = Dimensions.get('window');
const ALARMS_KEY = '@app_medicamentos_alarms';

export default function PanelPrincipal({ userName = 'Usuario', onLogout }) {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
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

  // Cargar imagen de perfil al montar el componente
  useEffect(() => {
    loadProfileImage();
    loadWelcomeMessage();
    registerAndSavePushToken(); // Guardar el push token del dispositivo en Supabase
  }, []);

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

      setStats({
        remindersToday: remindersRes.count ?? 0,
        completed: completedRes.count ?? 0,
        activeMeds: localActiveAlarms || medsRes.count || 0,
        daysOfUse: daysOfUse,
      });
    } catch (e) {
      console.log('Error loading stats:', e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setTimeout(() => setRefreshing(false), 800);
  };

  useEffect(() => {
    loadStats();
    // Escuchar cambios de foco para recargar stats (cuando vuelve de otra pantalla)
    // En Expo Router/React Navigation, esto se haría idealmente con useFocusEffect
    // pero como no lo tenemos importado, lo simulamos refrescando al cambiar user
    if (userName) loadStats();
  }, [userName]);

  const menuItems = [
    {
      id: 1,
      title: 'Crea tus Recordatorios',
      icon: 'alarm',
      color: '#667eea',
      bgColor: isDark ? 'transparent' : '#e8ecff',
      borderColor: isDark ? '#667eea' : '#667eea',
      route: '/alarma',
    },
    {
      id: 2,
      title: 'Conectar Recordatorios',
      icon: 'link',
      color: '#764ba2',
      bgColor: isDark ? 'transparent' : '#f3e9f8',
      borderColor: isDark ? '#764ba2' : '#764ba2',
      route: '/conectar',
    },
    {
      id: 3,
      title: 'Buscar Medicamentos',
      icon: 'search',
      color: '#f093fb',
      bgColor: isDark ? 'transparent' : '#fde8ff',
      borderColor: isDark ? '#f093fb' : '#f093fb',
      route: '/buscar',
    },
    {
      id: 4,
      title: 'Mi Perfil',
      icon: 'person',
      color: '#4facfe',
      bgColor: isDark ? 'transparent' : '#e8f5ff',
      borderColor: isDark ? '#4facfe' : '#4facfe',
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
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 24 + insets.bottom }
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
            />
          }
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
                <Text style={styles.userName}>{userName}</Text>
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

              {/* Stat 3: Recordatorios completados */}
              <View style={styles.statItem}>
                <View style={[styles.statIconCircle, { backgroundColor: '#f093fb' }]}>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                </View>
                <Text style={[styles.statNumber, { color: '#f093fb' }]}>{stats.completed}</Text>
                <Text style={[styles.statLabel, isDark && { color: theme.textSecondary }]}>Recordatorios Completados</Text>
              </View>
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
                  style={{ width: '48%' }}
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
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
