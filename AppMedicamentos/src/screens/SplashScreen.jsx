// src/screens/SplashScreen.jsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  useEffect(() => {
    const checkSessionAndNavigate = async () => {
      try {
        // Espera la animación
        await new Promise(res => setTimeout(res, 3500));
        // Verifica si hay sesión activa
        const { data } = await require('../services/supabaseClient').authService.getCurrentUser();
        if (data?.user) {
          // Usuario antiguo: verificar si ya completó las preguntas
          const userInfoCompleted = await AsyncStorage.getItem('userInfoCompleted');
          if (userInfoCompleted === 'true') {
            // Ya completó preguntas, ir al panel principal (home)
            router.replace('/home');
          } else {
            // Primera vez o no ha completado preguntas
            await AsyncStorage.setItem('needsUserInfo', 'true');
            router.replace('/preguntas');
          }
        } else {
          router.replace('/login');
        }
      } catch (e) {
        router.replace('/login');
        console.warn('Router replace failed:', e);
      }
    };
    checkSessionAndNavigate();
  }, [router]);

  return (
    <LinearGradient
      colors={isDark ? [theme.background, '#1a1a2e', '#16213e'] : ['#667eea', '#764ba2', '#f093fb']}
      style={styles.container}
    >
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        <Animatable.View
          animation="bounceIn"
          duration={1600}
          style={styles.logoContainer}
        >
          {/* Imagen responsiva: coloca aquí `src/assets/pato.png` */}
          <Animatable.View animation="pulse" iterationCount={1} duration={1400}>
            <Image
              source={require('../../assets/images/Pato.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animatable.View>
        </Animatable.View>

        <Animatable.Text
          animation="fadeInUp"
          delay={600}
          duration={1200}
          style={[styles.appName, isDark && { color: theme.text }]}
        >
          AppMedicamentos
        </Animatable.Text>

        <Animatable.Text
          animation="fadeInUp"
          delay={900}
          duration={1200}
          style={[styles.subtitle, isDark && { color: theme.textSecondary }]}
        >
          Tu salud en buenas manos
        </Animatable.Text>

        <Animatable.View
          animation="fadeIn"
          delay={1400}
          duration={800}
          style={[styles.loadingContainer, { bottom: 80 + insets.bottom }]}
        >
          <View style={styles.loadingBar}>
            <Animatable.View
              animation="slideInLeft"
              delay={1400}
              duration={800}
              style={styles.loadingProgress}
            />
          </View>
        </Animatable.View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoImage: {
    width: width * 0.72,
    height: width * 0.72,
    maxWidth: 420,
    maxHeight: 420,
   
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 50,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    width: width * 0.6,
  },
  loadingBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: 'white',
    width: '100%',
  },
});

export default SplashScreen;