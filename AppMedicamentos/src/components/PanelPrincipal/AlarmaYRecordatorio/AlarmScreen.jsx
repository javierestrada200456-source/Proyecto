import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, BackHandler, NativeModules, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { notifyCaregivers } from '../../../services/CaregiverNotifications';
import { limpiarMedicamento } from './AlarmaYRecordatorio';

// Devuelve nombre limpio + concentración a partir de los datos de alarma
// Maneja compatibilidad con datos viejos donde medName era el nombre completo en mayúsculas
function buildDisplayName(medName, medStrength, medStrengthUnit) {
  const rawName = (medName || '').trim();
  let displayName = rawName;
  let displayStrength = [medStrength, medStrengthUnit].filter(Boolean).join(' ');

  // Si el nombre parece ser el nombre completo de la API (mayúsculas o incluye forma farmacéutica)
  if (rawName && (rawName === rawName.toUpperCase() || /TABLETA|CAPSULA|SOLUCION|COMPRIMIDO/i.test(rawName))) {
    const parsed = limpiarMedicamento(rawName);
    displayName = parsed.nombre || rawName;
    // Si no hay concentración explícita, usar la parseada del nombre
    if (!displayStrength) {
      displayStrength = parsed.concentracion || '';
    }
  }
  return { displayName, displayStrength };
}

// Devuelve la forma base (primera palabra) en singular o plural
function buildFormaBase(medType, qty) {
  if (!medType) return '';
  const base = medType.trim().split(/\s+/)[0].toLowerCase();
  const n = parseInt(qty, 10);
  const capitalized = base.charAt(0).toUpperCase() + base.slice(1);
  if (isNaN(n) || n === 1) return capitalized;
  if (/ción$/i.test(base)) return base.replace(/ción$/i, 'ciones').charAt(0).toUpperCase() + base.replace(/ción$/i, 'ciones').slice(1);
  if (/[aeiouáéíóú]$/i.test(base)) return capitalized + 's';
  return capitalized + 'es';
}

const { AlarmModule } = NativeModules;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function AlarmScreen({ visible, data, onDismiss, onSnooze, onAccept }) {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState('ringing'); // 'ringing' | 'success'
  const [sound, setSound] = useState(null);
  const [wasLocked, setWasLocked] = useState(false);

  // Bloquear botón atrás (Back Button)
  useEffect(() => {
    if (!visible) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Retornar true bloquea el comportamiento por defecto (salir)
      // Queremos que el usuario solo salga con "Aceptar" o "Posponer"
      return true;
    });
    return () => backHandler.remove();
  }, [visible]);

  // Verificar si la pantalla estaba bloqueada al iniciar Y desbloquear
  useEffect(() => {
    if (visible && AlarmModule?.isLocked) {
        // Intentar desbloquear/mostrar encima
        if (AlarmModule.unlockScreen) {
            AlarmModule.unlockScreen();
        }

        AlarmModule.isLocked().then(locked => {
            console.log("Pantalla bloqueada:", locked);
            setWasLocked(locked);
        }).catch(err => console.log("Error checking lock state:", err));
    }
  }, [visible]);

  useEffect(() => {
    let currentSound = null;

    const playSound = async () => {
        if (!visible || !data) return;
        setStage('ringing');

        try {
          // Configurar audio modo (permitir sonar en silencio)
          await Audio.setAudioModeAsync({
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
              shouldDuckAndroid: true,
          });

          if (data.soundUri) {
              const { sound: s } = await Audio.Sound.createAsync(
                  { uri: data.soundUri },
                  { 
                      shouldPlay: true, 
                      isLooping: true,
                      volume: data.soundVolume ?? 1.0,
                      positionMillis: (data.soundStartSeconds ?? 0) * 1000,
                  }
              );
              currentSound = s;
              setSound(s);
          }
        } catch (e) {
            console.warn("No se pudo reproducir el sonido de la alarma (posiblemente en background):", e);
            // No lanzar el error paara evitar pantalla roja
        }
    };

    if (visible) {
        playSound();
    }

    return () => {
        if (currentSound) {
            currentSound.unloadAsync();
        }
    };
  }, [visible, data]);

  if (!visible || !data) return null;

  const handleAccept = async () => {
    try {
        if (sound) {
            await sound.stopAsync();
            await sound.unloadAsync();
        }
    } catch (e) { console.log(e); }
    setSound(null);
    
    setStage('success');

    // Esperar para mostrar el mensaje de éxito antes de cerrar
    setTimeout(() => {
      // Lógica principal
      if (onAccept) onAccept(data);

      // Enviar notificación al cuidador siempre que el paciente acepte
      sendCaregiverNotification(data);
    
      if (onDismiss) onDismiss();

      // Si la alarma inició en bloqueo, volver al lockscreen sin abrir la app
      if (wasLocked && AlarmModule?.moveTaskToBack) {
        AlarmModule.moveTaskToBack();
      }
    }, 3000); // 3 segundos de mensaje
  };

  const handleSnooze = async () => {
    try {
        if (sound) {
            await sound.stopAsync();
            await sound.unloadAsync();
        }
    } catch (e) { console.log(e); }
    setSound(null);
    
    if (onSnooze) onSnooze(data);
    if (onDismiss) onDismiss();
  };

  const sendCaregiverNotification = async (medData) => {
    try {
      const qty = medData.quantityToTake || '';
      const qtyNum = parseInt(qty, 10);
      const formaLabel = buildFormaBase(medData.medType, qtyNum);
      const DOSE_LABELS = ['Primera', 'Segunda', 'Tercera'];
      const idx = medData.doseIndex !== undefined ? Number(medData.doseIndex) : 0;
      const doseLabel = DOSE_LABELS[idx] ? `${DOSE_LABELS[idx]} dosis` : `Dosis ${idx + 1}`;
      const { displayName, displayStrength } = buildDisplayName(medData.medName, medData.medStrength, medData.medStrengthUnit);
      const medLine = [displayName, displayStrength].filter(Boolean).join(' ');

      const titleTemplate = '💊 [Nombre del paciente] tomó su medicamento';
      const bodyTemplate = `${medLine} — ${doseLabel}${qty && !isNaN(qtyNum) ? `\nCantidad: ${qty}${formaLabel ? ' ' + formaLabel : ''}` : ''}`;

      await notifyCaregivers(titleTemplate, bodyTemplate, { medName: displayName });
    } catch (e) {
      console.log('[AlarmScreen] Error notificando a cuidador:', e);
    }
  };

  if (stage === 'success') {
    return (
      <Modal visible={true} transparent={false} animationType="fade" onRequestClose={() => {}}>
        <LinearGradient
          colors={['#0f0c29', '#302b63', '#24243e']} // Tema oscuro elegante
          style={styles.container}
        >
          <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
          >
            <Animatable.View 
              animation="bounceIn" 
              style={styles.successContainer}
            >
              <Ionicons name="heart" size={100} color="#ff6b6b" />
              <Text style={styles.successTitle}>¡Estoy orgulloso de ti!</Text>
              <Text style={styles.successSubtitle}>Sigue así</Text>
            </Animatable.View>
          </SafeAreaView>
        </LinearGradient>
      </Modal>
    );
  }

  // Extraer datos
  const { medName, medInfo, at } = data; // medInfo viene de la notificación
  
  const now = new Date();
  const timeString = at || `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  const ampm = parseInt(timeString.split(':')[0]) >= 12 ? 'PM' : 'AM';

  return (
    <Modal visible={true} transparent={false} animationType="slide" onRequestClose={() => { /* Bloqueo */ }}>
      <LinearGradient
        colors={['#000000', '#1c1c1c', '#2c3e50']} // Tema oscuro profundo
        style={styles.container}
      >
      <SafeAreaView style={[styles.contentContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Animatable.View animation="pulse" iterationCount="infinite" duration={2000} style={styles.header}>
          <Text style={styles.appName}>AppMedicamentos</Text>
        </Animatable.View>

        <View style={styles.timeContainer}>
          <Text style={styles.bigTime}>{timeString}</Text>
          <Text style={styles.ampm}>{ampm}</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.actionText}>Es hora de tomar:</Text>
          {/* Nombre / concentración */}
          {(() => {
            const DOSE_LABELS = ['Primera', 'Segunda', 'Tercera'];
            const idx = data.doseIndex !== undefined && data.doseIndex !== null ? Number(data.doseIndex) : 0;
            const doseLabel = DOSE_LABELS[idx] ? `${DOSE_LABELS[idx]} dosis` : `Dosis ${idx + 1}`;
            const { displayName, displayStrength } = buildDisplayName(data.medName, data.medStrength, data.medStrengthUnit);
            const nameLine = [displayName, displayStrength].filter(Boolean).join(' ');
            return (
              <>
                <Text style={styles.medName}>{nameLine}</Text>
                <Text style={[styles.medDetails, { color: '#a5b4fc', marginTop: 2 }]}>{doseLabel}</Text>
              </>
            );
          })()}
          {/* Cantidad a tomar */}
          {!!data.quantityToTake && (() => {
            const qty = data.quantityToTake;
            const n = parseInt(qty, 10);
            const tipoLabel = buildFormaBase(data.medType, n);
            return (
              <Text style={[styles.medDetails, { marginTop: 10, fontWeight: 'bold', fontSize: 22, color: '#4facfe' }]}>
                Cantidad a tomar: {qty}{tipoLabel ? ' ' + tipoLabel : ''}
              </Text>
            );
          })()}
        </View>

        <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
                <Ionicons name="checkmark-circle" size={32} color="#fff" />
                <Text style={styles.acceptButtonText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: { // Nuevo estilo separado
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 20, // Reducido de 60
    paddingHorizontal: 20,
    alignItems: 'center',
    // backgroundColor REMOVED
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 24,
    color: '#bbb',
    marginTop: 10,
  },
  appName: {
    fontSize: 24,
    color: '#888',
    fontWeight: '600',
    letterSpacing: 1,
    opacity: 0.8,
  },
  timeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigTime: {
    fontSize: Math.min(80, SCREEN_W * 0.2),
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(255,255,255,0.1)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  ampm: {
    fontSize: 24,
    color: '#ccc',
    marginTop: -10,
    fontWeight: '300',
  },
  infoContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: Math.min(30, SCREEN_W * 0.07),
    borderRadius: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionText: {
    fontSize: 18,
    color: '#aaa',
    marginBottom: 8,
  },
  medName: {
    fontSize: Math.min(36, SCREEN_W * 0.09),
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  medDetails: {
    fontSize: 20,
    color: '#ddd',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snoozeButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 18,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
  buttonText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  acceptButton: {
    width: '65%',
    backgroundColor: '#4facfe',
    paddingVertical: 18,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});