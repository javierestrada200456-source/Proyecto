import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Bienvenida from '../src/screens/PermisosYSeguridad/Bienvenida';
import PanelPrincipal from '../src/components/PanelPrincipal/PanelPrincipal';
import { authService } from '../src/services/supabaseClient';

export default function HomeRoute() {
  const router = useRouter();
  const [welcomeShown, setWelcomeShown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Usuario');
  const [userInfoCompleted, setUserInfoCompleted] = useState(true);

  useEffect(() => {
    checkUserInfoStatus();
    checkWelcomeStatus();
    loadUserName();
  }, []);

  const loadUserName = async () => {
    try {
      // 1. Intentar leer de AsyncStorage primero
      const storedName = await AsyncStorage.getItem('userName');
      if (storedName) {
        setUserName(storedName);
      }

      // 2. Buscar en Supabase para tener el dato más fresco o si no hay local
      const { data, error } = await authService.getCurrentUser();
      if (!error && data?.user) {
          const meta = data.user.user_metadata;
          // Prioridad: username (custom) -> full_name (google) -> name (google) -> email
          const nameToUse = meta?.username || meta?.full_name || meta?.name || data.user.email?.split('@')[0];
          
          if (nameToUse && nameToUse !== storedName) {
            setUserName(nameToUse);
            await AsyncStorage.setItem('userName', nameToUse);
          }
      }
    } catch (e) {
      console.log('Error loading username:', e);
    }
  };

  const checkUserInfoStatus = async () => {
    try {
      const infoCompleted = await AsyncStorage.getItem('userInfoCompleted');
      if (infoCompleted !== 'true') {
        setUserInfoCompleted(false);
        router.replace('/preguntas');
      } else {
        setUserInfoCompleted(true);
      }
    } catch (error) {
      console.log('Error checking user info status:', error);
    }
  };

  const checkWelcomeStatus = async () => {
    try {
      const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome');
      if (hasSeenWelcome === 'true') {
        setWelcomeShown(true);
      } else {
        setWelcomeShown(false);
      }
    } catch (error) {
      console.log('Error checking welcome status:', error);
      setWelcomeShown(false);
    } finally {
      setLoading(false);
    }
  };

  const handleWelcomeContinue = async () => {
    try {
      await AsyncStorage.setItem('hasSeenWelcome', 'true');
      setWelcomeShown(true);
    } catch (error) {
      console.log('Error saving welcome status:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      setWelcomeShown(false);
    } catch (error) {
      console.log('Error during logout:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  if (!userInfoCompleted) {
    return null; // Se redirige en checkUserInfoStatus
  }

  if (!welcomeShown) {
    return <Bienvenida onContinue={handleWelcomeContinue} />;
  }

  return <PanelPrincipal userName={userName} onLogout={handleLogout} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { marginTop: 8, color: '#666' },
});
