import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  Linking,
  Modal,
  Image,
  NativeModules,
  AppState
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useCameraPermissions } from 'expo-camera';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Application from 'expo-application';
import styles from './StylesBienvenida';
import { registerAndSavePushToken } from '../../components/PanelPrincipal/AlarmaYRecordatorio/NotificacionesORecordatorios';

const { AlarmModule } = NativeModules;

export default function Bienvenida({ onContinue }) {
  const insets = useSafeAreaInsets();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const appState = useRef(AppState.currentState);

  const [permissionsState, setPermissionsState] = useState({
    notifications: false,
    background: false,
    camera: false,
    exactAlarm: false,
    fullscreen: false,
  });
  const [permissionsStatus, setPermissionsStatus] = useState({
    notifications: null,
    background: null,
    camera: null,
    exactAlarm: null,
    fullscreen: null,
  });
  const [allGranted, setAllGranted] = useState(false);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);

  const checkPermissions = async () => {
    try {
      // Verificar permisos reales de notificación
      const { status: notifStatus } = await Notifications.getPermissionsAsync();
      const notifGranted = notifStatus === 'granted';

      // Verificar permisos nativos
      let backgroundGranted = permissionsState.background; 
      let exactAlarmGranted = true;

      if (Platform.OS === 'android' && AlarmModule) {
           if (Platform.Version >= 31 && AlarmModule.checkExactAlarmPermission) {
               exactAlarmGranted = await AlarmModule.checkExactAlarmPermission();
           }
      }

      setPermissionsState(prev => ({ 
        ...prev, 
        notifications: notifGranted, 
        // Mantenemos el estado previo si era true, o el nuevo valor
        background: prev.background || backgroundGranted, 
        exactAlarm: exactAlarmGranted,
      }));
      setPermissionsStatus(prev => ({ 
        ...prev, 
        notifications: notifStatus, 
        background: null 
      }));
    } catch (e) {
      console.log('Error checking initial permissions:', e);
    }
  };

  useEffect(() => {
    Keyboard.dismiss();
    checkPermissions();

    // Escuchar cambios de estado de la App (Background -> Active)
    // Esto es CLAVE para detectar si el usuario activó el permiso en settings y volvió
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App ha vuelto al primer plano, re-verificar permisos
        console.log("App has come to foreground, checking permissions...");
        checkPermissions();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);


  // Sync Camera Permission from Hook
  useEffect(() => {
    if (cameraPermission) {
        setPermissionsState(prev => ({ ...prev, camera: cameraPermission.granted }));
        setPermissionsStatus(prev => ({ ...prev, camera: cameraPermission.status }));
    }
  }, [cameraPermission]);

  const requestNotificationPermissions = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === 'granted';

      setPermissionsState((prev) => ({ ...prev, notifications: granted }));
      setPermissionsStatus((prev) => ({ ...prev, notifications: status }));

      // Registrar push token en Supabase al otorgar el permiso
      if (granted) {
        registerAndSavePushToken().catch(() => {});
      }
      
      return granted;
    } catch (error) {
      console.log('Notification permission error:', error);
      return false;
    }
  };

  const handleRequestCamera = async () => {
      try {
          // El hook se encarga de actualizar el estado
          await requestCameraPermission();
      } catch (e) {
          console.log("Camera permission error:", e);
      }
  };

  const requestBackgroundPermissions = async () => {
    setShowBackgroundModal(true);
  };

  const requestExactAlarmPermission = async () => {
      if (Platform.OS === 'android' && AlarmModule) {
          try {
              AlarmModule.requestExactAlarmPermission();
          } catch(e) {
              console.warn("Exact alarm permission error", e);
          }
      }
  };

  const requestFullscreenPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync(
          'android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT',
          { data: 'package:' + Application.applicationId }
        );
      } catch (e) {
        // Fallback: abrir ajustes de la app
        await Linking.openSettings();
      }
      setPermissionsState((prev) => ({ ...prev, fullscreen: true }));
      setPermissionsStatus((prev) => ({ ...prev, fullscreen: 'granted' }));
    }
  };

  const confirmBackgroundPermission = () => {
    setPermissionsState(prev => ({ ...prev, background: true }));
    setPermissionsStatus(prev => ({ ...prev, background: 'granted' }));
    setShowBackgroundModal(false);
  };

  const openSystemSettings = async () => {
    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
          { data: 'package:' + Application.applicationId }
        );
      } catch (e) {
        console.log("Error intent launcher:", e);
        await Linking.openSettings();
      }
    } else {
      await Linking.openSettings();
    }
    
    // Asumimos que el usuario lo hará
    setPermissionsState((prev) => ({ ...prev, background: true }));
    setPermissionsStatus((prev) => ({ ...prev, background: 'granted' }));
    setShowBackgroundModal(false);
  };

  useEffect(() => {
    setAllGranted(
        permissionsState.notifications && 
        permissionsState.background && 
        permissionsState.camera
    );
  }, [permissionsState]);

  // Verificar si permiso fullscreen ya estaba activo al volver de ajustes
  useEffect(() => {
    if (Platform.OS === 'android' && Platform.Version >= 34) {
      // En Android 14+ el permiso USE_FULL_SCREEN_INTENT requiere aprobación manual
      // Lo marcamos como revisado si el usuario ya pasó por ajustes
    }
  }, []);

  const handleContinue = () => {
    if (allGranted) {
      onContinue?.();
    } else {
      Alert.alert(
        'Permisos necesarios',
        'Por favor, activa todos los permisos para continuar.',
        [{ text: 'Entendido', onPress: () => {} }]
      );
    }
  };

  return (
    <LinearGradient colors={['#0f172a', '#334155']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1 }}>
          <KeyboardAvoidingView 
            style={{ flex: 1 }} // Asegurar que ocupe todo el espacio disponible
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView 
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: 40 + insets.bottom }
              ]} 
              showsVerticalScrollIndicator={false}
              bounces={false}
              overScrollMode="never"
            >
              {/* Imagen eliminada para mejor visibilidad */}
              <View style={{ height: 20 }} />

          <Animatable.Text animation="slideInUp" duration={800} style={styles.title}>
            ¡BIENVENIDO!
          </Animatable.Text>

          <Animatable.Text
            animation="slideInUp"
            duration={1000}
            delay={200}
            style={styles.description}
          >
          Tu recordatorio mas confiable necesitara algunos permisos para funcionar correctamente.
          </Animatable.Text>

          <Animatable.View animation="slideInUp" duration={1200} delay={400} style={styles.permissionsCard}>
            
            {/* EXACT ALARM PERMISSION (Android 12+) */}
            {Platform.OS === 'android' && Platform.Version >= 31 && (
            <>
                <View style={styles.permissionItem}>
                    <View style={styles.permissionLeft}>
                        <View
                        style={[
                            styles.permissionIcon,
                            permissionsState.exactAlarm && styles.permissionIconActive,
                        ]}
                        >
                        <Ionicons
                            name={permissionsState.exactAlarm ? 'time' : 'time-outline'}
                            size={24}
                            color={permissionsState.exactAlarm ? '#fff' : '#A5B4FC'}
                        />
                        </View>
                        <View style={styles.permissionText}>
                        <Text style={styles.permissionTitle}>Alarmas Exactas</Text>
                        <Text style={styles.permissionSubtitle}>Puntualidad garantizada</Text>
                        </View>
                    </View>
                    {!permissionsState.exactAlarm ? (
                        <TouchableOpacity style={styles.permissionButton} onPress={requestExactAlarmPermission}>
                        <Text style={styles.buttonText}>Activar</Text>
                        </TouchableOpacity>
                    ) : (
                        <Ionicons name="checkmark-circle" size={32} color="#4ADE80" />
                    )}
                </View>
                <View style={styles.divider} />
            </>
            )}

            {/* NOTIFICACIÓN PANTALLA COMPLETA (Android 14+) */}
            {Platform.OS === 'android' && Platform.Version >= 34 && (
            <>
                <View style={styles.permissionItem}>
                    <View style={styles.permissionLeft}>
                        <View style={[styles.permissionIcon, permissionsState.fullscreen && styles.permissionIconActive]}>
                            <Ionicons
                                name={permissionsState.fullscreen ? 'expand' : 'expand-outline'}
                                size={24}
                                color={permissionsState.fullscreen ? '#fff' : '#A5B4FC'}
                            />
                        </View>
                        <View style={styles.permissionText}>
                            <Text style={styles.permissionTitle}>Alarma en pantalla completa</Text>
                            <Text style={styles.permissionSubtitle}>Alertas visibles con pantalla bloqueada</Text>
                        </View>
                    </View>
                    {!permissionsState.fullscreen ? (
                        <TouchableOpacity style={styles.permissionButton} onPress={requestFullscreenPermission}>
                            <Text style={styles.buttonText}>Activar</Text>
                        </TouchableOpacity>
                    ) : (
                        <Ionicons name="checkmark-circle" size={32} color="#4ADE80" />
                    )}
                </View>
                <View style={styles.divider} />
            </>
            )}

            {/* NOTIFICATIONS PERMISSION */}
            <View style={styles.permissionItem}>
              <View style={styles.permissionLeft}>
                <View
                  style={[
                    styles.permissionIcon,
                    permissionsState.notifications && styles.permissionIconActive,
                  ]}
                >
                  <Ionicons
                    name={permissionsState.notifications ? 'notifications' : 'notifications-outline'}
                    size={24}
                    color={permissionsState.notifications ? '#fff' : '#A5B4FC'}
                  />
                </View>
                <View style={styles.permissionText}>
                  <Text style={styles.permissionTitle}>Notificaciones</Text>
                  <Text style={styles.permissionSubtitle}>Recordatorios de medicinas</Text>
                </View>
              </View>
              {!permissionsState.notifications ? (
                <TouchableOpacity style={styles.permissionButton} onPress={requestNotificationPermissions}>
                  <Text style={styles.buttonText}>Activar</Text>
                </TouchableOpacity>
              ) : (
                <Ionicons name="checkmark-circle" size={32} color="#4ADE80" />
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.permissionItem}>
              <View style={styles.permissionLeft}>
                <View
                  style={[
                    styles.permissionIcon,
                    permissionsState.camera && styles.permissionIconActive,
                  ]}
                >
                  <Ionicons
                    name={permissionsState.camera ? 'camera' : 'camera-outline'}
                    size={24}
                    color={permissionsState.camera ? '#fff' : '#A5B4FC'}
                  />
                </View>
                <View style={styles.permissionText}>
                  <Text style={styles.permissionTitle}>Cámara</Text>
                  <Text style={styles.permissionSubtitle}>Escanear QR</Text>
                </View>
              </View>
              {!permissionsState.camera ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity style={[styles.permissionButton, { marginRight: 8 }]} onPress={handleRequestCamera}>
                    <Text style={styles.buttonText}>Activar</Text>
                  </TouchableOpacity>
                   {permissionsStatus.camera?.status === 'denied' && !permissionsStatus.camera?.canAskAgain && (
                    <TouchableOpacity
                      style={[styles.permissionButton, { backgroundColor: '#475569' }]}
                      onPress={() => Linking.openSettings()}
                    >
                      <Text style={[styles.buttonText, { color: '#F8FAFC' }]}>Ajustes</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Ionicons name="checkmark-circle" size={32} color="#4ADE80" />
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.permissionItem}>
              <View style={styles.permissionLeft}>
                <View
                  style={[
                    styles.permissionIcon,
                    permissionsState.background && styles.permissionIconActive,
                  ]}
                >
                  <Ionicons
                    name={permissionsState.background ? 'flash' : 'flash-outline'}
                    size={24}
                    color={permissionsState.background ? '#fff' : '#A5B4FC'}
                  />
                </View>
                <View style={styles.permissionText}>
                  <Text style={styles.permissionTitle}>Ejecución en segundo plano</Text>
                  <Text style={styles.permissionSubtitle}>Alarmas confiables</Text>
                </View>
              </View>
              {!permissionsState.background ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity style={[styles.permissionButton, { marginRight: 8 }]} onPress={requestBackgroundPermissions}>
                    <Text style={styles.buttonText}>Activar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Ionicons name="checkmark-circle" size={32} color="#4ADE80" />
              )}
            </View>
          </Animatable.View>

          <Animatable.View animation="slideInUp" duration={1400} delay={600}>
            <TouchableOpacity
              style={[styles.continueButton, !allGranted && styles.continueButtonDisabled]}
              onPress={handleContinue}
              disabled={!allGranted}
            >
              <Text style={styles.continueButtonText}>
                {allGranted ? 'Continuar' : 'Activa los permisos'}
              </Text>
              {allGranted && <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />}
            </TouchableOpacity>
          </Animatable.View>

            <Text style={styles.privacyNote}>
                Tus datos están protegidos. Solo usamos estos permisos para tu seguridad.
              </Text>
              <View style={{ height: 40 }} /> 
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>

      {/* Modal informativo de ejecución en segundo plano */}
      <Modal
        visible={showBackgroundModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBackgroundModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animatable.View animation="zoomIn" duration={400} style={styles.modalContent}>
            <Animatable.View animation="pulse" iterationCount="infinite" duration={2000} style={styles.modalIconContainer}>
              <Ionicons name="battery-charging" size={60} color="#667eea" />
            </Animatable.View>

            <Text style={styles.modalTitle}>¿Por qué en segundo plano?</Text>
            
            <View style={styles.modalInfoContainer}>
              <View style={styles.modalInfoRow}>
                <Ionicons name="alarm" size={24} color="#A5B4FC" />
                <Text style={styles.modalInfoText}>Tus alarmas sonarán a tiempo, incluso si cierras la app</Text>
              </View>
              
              <View style={styles.modalInfoRow}>
                <Ionicons name="battery-half" size={24} color="#FDBA74" />
                <Text style={styles.modalInfoText}>Consume batería extra para mantenerse activa</Text>
              </View>
              
              <View style={styles.modalInfoRow}>
                <Ionicons name="shield-checkmark" size={24} color="#4ADE80" />
                <Text style={styles.modalInfoText}>Es necesario para tu salud y seguridad</Text>
              </View>

              <View style={[styles.modalInfoRow, { backgroundColor: 'rgba(251,191,36,0.12)', borderRadius: 10, padding: 8, marginTop: 4 }]}>
                <Ionicons name="warning" size={24} color="#FBBF24" />
                <Text style={[styles.modalInfoText, { color: '#FBBF24', fontWeight: '700' }]}>
                   No actives el ahorro de batería para esta app, puede retrasar o bloquear todas las notificaciones y alarmas
                </Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowBackgroundModal(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={openSystemSettings}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.modalButtonPrimaryText}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        </View>
      </Modal>
   </LinearGradient>
  );
}
