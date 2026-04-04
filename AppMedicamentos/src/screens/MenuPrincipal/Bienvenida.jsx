import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import styles from './StylesBienvenida';

export default function Bienvenida({ onContinue }) {
  const insets = useSafeAreaInsets();
  const [permissionsState, setPermissionsState] = useState({
    notifications: false,
    calendar: false,
  });
  const [allGranted, setAllGranted] = useState(false);

  useEffect(() => {
    // Desactivar el teclado completamente en esta pantalla
    Keyboard.dismiss();
  }, []);

  const requestNotificationPermissions = async () => {
    try {
      // En Expo Go, notificaciones no están disponibles completamente
      // Permitimos continuar de todas formas
      setPermissionsState((prev) => ({
        ...prev,
        notifications: true,
      }));
      checkAllGranted(true, permissionsState.calendar);
      return true;
    } catch (error) {
      console.log('Notification permission error:', error);
      setPermissionsState((prev) => ({
        ...prev,
        notifications: true,
      }));
      checkAllGranted(true, permissionsState.calendar);
      return true;
    }
  };

  const requestCalendarPermissions = async () => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      const granted = status === 'granted';
      setPermissionsState((prev) => ({
        ...prev,
        calendar: granted,
      }));
      if (granted && Platform.OS === 'ios') {
        try {
          await Calendar.requestRemindersPermissionsAsync();
        } catch (e) {
          console.log('Reminder permission error:', e);
        }
      }
      checkAllGranted(permissionsState.notifications, granted);
      return granted;
    } catch (error) {
      console.log('Calendar permission error:', error);
      setPermissionsState((prev) => ({
        ...prev,
        calendar: true,
      }));
      checkAllGranted(permissionsState.notifications, true);
      return true;
    }
  };

  const checkAllGranted = (notifications, calendar) => {
    if (notifications && calendar) {
      setAllGranted(true);
    }
  };

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
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        enabled={false}
      >
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView 
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 24 + insets.bottom }
            ]} 
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
            nestedScrollEnabled={true}
          >
          {/* Pato con gafas animado */}
          <Animatable.View animation="bounce" duration={2000} iterationCount="infinite" style={styles.duckContainer}>
            <Text style={styles.duck}>🦆</Text>
            <View style={styles.glassesContainer}>
              <Text style={styles.glassesEmoji}>💡</Text>
            </View>
          </Animatable.View>

          {/* Título BIENVENIDA */}
          <Animatable.Text animation="slideInUp" duration={800} style={styles.title}>
            ¡BIENVENIDO!
          </Animatable.Text>

          {/* Descripción */}
          <Animatable.Text
            animation="slideInUp"
            duration={1000}
            delay={200}
            style={styles.description}
          >
          Tu recordatorio mas confiable necesitara algunos permisos para funcionar correctamente.
          </Animatable.Text>

          {/* Tarjeta de permisos */}
          <Animatable.View animation="slideInUp" duration={1200} delay={400} style={styles.permissionsCard}>
            {/* Permiso Notificaciones */}
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
                    color={permissionsState.notifications ? '#fff' : '#667eea'}
                  />
                </View>
                <View style={styles.permissionText}>
                  <Text style={styles.permissionTitle}>Notificaciones</Text>
                  <Text style={styles.permissionSubtitle}>Recordatorios de medicinas</Text>
                </View>
              </View>
              {!permissionsState.notifications ? (
                <TouchableOpacity
                  style={styles.permissionButton}
                  onPress={requestNotificationPermissions}
                >
                  <Text style={styles.buttonText}>Activar</Text>
                </TouchableOpacity>
              ) : (
                <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
              )}
            </View>

            {/* Divisor */}
            <View style={styles.divider} />

            {/* Permiso Calendario */}
            <View style={styles.permissionItem}>
              <View style={styles.permissionLeft}>
                <View
                  style={[
                    styles.permissionIcon,
                    permissionsState.calendar && styles.permissionIconActive,
                  ]}
                >
                  <Ionicons
                    name={permissionsState.calendar ? 'calendar' : 'calendar-outline'}
                    size={24}
                    color={permissionsState.calendar ? '#fff' : '#667eea'}
                  />
                </View>
                <View style={styles.permissionText}>
                  <Text style={styles.permissionTitle}>Calendario</Text>
                  <Text style={styles.permissionSubtitle}>Sincronización de citas</Text>
                </View>
              </View>
              {!permissionsState.calendar ? (
                <TouchableOpacity style={styles.permissionButton} onPress={requestCalendarPermissions}>
                  <Text style={styles.buttonText}>Activar</Text>
                </TouchableOpacity>
              ) : (
                <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
              )}
            </View>
          </Animatable.View>

          {/* Botón Continuar */}
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

          {/* Nota de privacidad */}
          <Text style={styles.privacyNote}>
            Tus datos están protegidos. Solo usamos estos permisos para tu seguridad.
          </Text>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
      </KeyboardAvoidingView>
    </View>
  );
}
