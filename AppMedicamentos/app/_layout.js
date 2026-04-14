import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { authService } from '../src/services/supabaseClient';
import { saveTokenIfAlreadyGranted } from '../src/components/PanelPrincipal/AlarmaYRecordatorio/NotificacionesORecordatorios';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { setupNotificationListeners } from '../src/components/PanelPrincipal/AlarmaYRecordatorio/NotificacionesORecordatorios';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LogBox } from 'react-native';
import AlarmOverlay from '../src/components/PanelPrincipal/AlarmaYRecordatorio/AlarmOverlay';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../src/context/ThemeContext';

// Ignorar advertencias de obsolescencia específicas
LogBox.ignoreLogs([
  'Expo AV has been deprecated',
  'SafeAreaView has been deprecated'
]);

// Evita que la app renderice antes de cargar fuentes (icons)
SplashScreen.preventAutoHideAsync().catch(() => {
  // ignore
});

export default function Layout() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {
        // ignore
      });
    }
  }, [fontsLoaded]);

  // Refrescar push token al iniciar sesión (solo si permisos ya otorgados, sin mostrar diálogos)
  useEffect(() => {
    const { data: subscription } = authService.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        saveTokenIfAlreadyGranted().catch(() => {});
      }
    });
    return () => {
      if (subscription?.subscription?.unsubscribe) subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Configurar listeners de notificaciones
    // const notificationSubscription = setupNotificationListeners();

    // Suscribirse a cambios de auth desde Supabase
    // SOLO navegamos a /login para mostrar el modal si ya existe la flag
    // `awaitingConfirmation` (establecida al registrarse).
    /*
    const { data: subscription } = authService.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_IN') {
          const flag = await AsyncStorage.getItem('awaitingConfirmation');
          if (flag === 'true') {
            try {
              router.replace('/login');
            } catch (e) {
              console.warn('Router replace to /login failed:', e);
            }
          }
        }
      } catch (e) {
        console.warn('Error handling auth event:', e);
      }
    });

    return () => {
      if (subscription && subscription.unsubscribe) subscription.unsubscribe();      if (notificationSubscription && notificationSubscription.remove) notificationSubscription.remove();    };
    */
  }, [router]);

  // No renderizar hasta que las fuentes estén listas (esto evita iconos “vacíos”)
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <AlarmOverlay />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
