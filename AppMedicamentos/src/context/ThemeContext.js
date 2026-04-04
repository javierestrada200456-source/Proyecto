import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/theme';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

const ThemeContext = createContext({
  theme: Colors.light,
  mode: 'system', // 'light' | 'dark' | 'system'
  isDark: false,
  setMode: (mode) => {},
});

const STORAGE_THEME_KEY = 'user_theme_preference';

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState('system');
  const [loaded, setLoaded] = useState(false);

  // Cargar preferencia guardada al inicio
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(STORAGE_THEME_KEY);
        if (savedMode) {
          setMode(savedMode);
        }
      } catch (e) {
        console.warn('Error loading theme preference', e);
      } finally {
        setLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // Guardar preferencia cuando cambia
  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(STORAGE_THEME_KEY, mode).catch((e) =>
        console.warn('Error saving theme preference', e)
      );
    }
  }, [mode, loaded]);

  // Determinar si es oscuro
  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

  // Obtener colores actuales
  const themeColors = isDark ? Colors.dark : Colors.light;

  // Crear objeto de tema para React Navigation
  const navigationTheme = isDark ? {
      ...DarkTheme,
      colors: {
          ...DarkTheme.colors,
          background: themeColors.background,
          card: themeColors.card,
          text: themeColors.text,
          border: themeColors.border,
          primary: themeColors.primary,
          notification: themeColors.notification,
      }
  } : {
      ...DefaultTheme,
      colors: {
          ...DefaultTheme.colors,
          background: themeColors.background,
          card: themeColors.card,
          text: themeColors.text,
          border: themeColors.border,
          primary: themeColors.primary,
          notification: themeColors.notification,
      }
  };

  if (!loaded) return null; // O un splash screen custom

  return (
    <ThemeContext.Provider value={{ theme: themeColors, mode, isDark, setMode }}>
      <NavigationThemeProvider value={navigationTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={themeColors.background} />
        {children}
      </NavigationThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
