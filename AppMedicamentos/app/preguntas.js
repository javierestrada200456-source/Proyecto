import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Preguntas from '../src/components/InformacionPersonal/Preguntas';
import { authService } from '../src/services/supabaseClient';

export default function PreguntasRoute() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserInfoStatus();
  }, []);

  const checkUserInfoStatus = async () => {
    try {
      const needsInfo = await AsyncStorage.getItem('needsUserInfo');
      if (needsInfo !== 'true') {
        router.replace('/home');
      }
    } catch (error) {
      console.log('Error checking user info status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePreguntas = async (formData) => {
    try {
      setLoading(true);
      
      // Obtener usuario actual
      const { data: userData, error: userError } = await authService.getCurrentUser();
      
      if (userError || !userData?.user) {
        console.error('Error getting user:', userError);
        return;
      }

      // Guardar información del usuario en metadata o en Supabase
      const userId = userData.user.id;
      
      // Guardar en AsyncStorage también para acceso rápido
      await AsyncStorage.setItem(
        'userInfo',
        JSON.stringify({
          fechaNacimiento: formData.fechaNacimiento.toISOString(),
          edad: formData.edad,
          genero: formData.genero,
          peso: formData.peso,
          userId: userId,
        })
      );

      // Marcar que el usuario ya completó la información
      await AsyncStorage.setItem('needsUserInfo', 'false');
      await AsyncStorage.setItem('userInfoCompleted', 'true');

      // Navegar al home
      router.replace('/home');
    } catch (error) {
      console.error('Error saving user info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#667eea' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return <Preguntas onComplete={handleCompletePreguntas} />;
}
