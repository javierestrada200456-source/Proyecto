import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
let GoogleSigninModule;
let GoogleSigninStatusCodes;

const getGoogleSigninModule = () => {
  if (GoogleSigninModule !== undefined) {
    return { GoogleSignin: GoogleSigninModule, statusCodes: GoogleSigninStatusCodes };
  }

  try {
    const mod = require('@react-native-google-signin/google-signin');
    GoogleSigninModule = mod.GoogleSignin;
    GoogleSigninStatusCodes = mod.statusCodes;
  } catch (_e) {
    GoogleSigninModule = null;
    GoogleSigninStatusCodes = null;
  }

  return { GoogleSignin: GoogleSigninModule, statusCodes: GoogleSigninStatusCodes };
};

// Configuración de Supabase 
const supabaseUrl = "https://obmlmqorhxdwdtgyknfy.supabase.co";
const supabaseAnonKey = "sb_publishable_Byd4tG_efU5HjVI7v41Zbg_BPxvnd3Y";

// Adaptador de almacenamiento para Supabase 
const storageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

// Clase de servicio de autenticación
class AuthService {
  constructor() {
    this.client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: storageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    // Configuración de Google Sign-In
    // DEBES REEMPLAZAR ESTE ID CON EL TUYO OBTENIDO EN GOOGLE CLOUD
    const { GoogleSignin } = getGoogleSigninModule();
    if (GoogleSignin?.configure) {
      GoogleSignin.configure({
        webClientId: '5101264046-cfaeoh38gdi0rhssbmp41ne5jnsarc2t.apps.googleusercontent.com',
        offlineAccess: true,
      });
    }
  }

  // Obtener usuario actual
  async getCurrentUser() {
    return await this.client.auth.getUser();
  }

  // Obtener sesión actual
  async getSession() {
    return await this.client.auth.getSession();
  }

  // Iniciar sesión con email
  async signIn(email, password) {
    return await this.client.auth.signInWithPassword({
      email,
      password,
    });
  }

  // Registrarse
  async signUp(email, password, username) {
    return await this.client.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
      },
    });
  }

  // Cerrar sesión
  async signOut() {
    try {
      const { GoogleSignin } = getGoogleSigninModule();
      if (GoogleSignin?.signOut) {
        await GoogleSignin.signOut();
      }
    } catch (error) {
      console.log('Error cerrando sesión de Google:', error);
    }
    return await this.client.auth.signOut();
  }

  // Restablecer contraseña
  async resetPassword(email) {
    return await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: 'mi-app://reset-password',
    });
  }

  // Iniciar sesión con Google 
  async signInWithGoogle() {
    try {
      const { GoogleSignin, statusCodes } = getGoogleSigninModule();
      if (!GoogleSignin?.hasPlayServices || !GoogleSignin?.signIn) {
        return { error: { message: 'Google Sign-In no está disponible en este entorno' } };
      }

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      // En versiones recientes, el token viene en userInfo.data.idToken
      const idToken = userInfo.data?.idToken || userInfo.idToken;

      if (!idToken) {
        throw new Error('No se pudo obtener el token de Google');
      }

      // Usar signInWithIdToken en lugar de signInWithOAuth
      const { data, error } = await this.client.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      return { data, error, userInfo };

    } catch (error) {
      const { statusCodes } = getGoogleSigninModule();
      if (statusCodes && error.code === statusCodes.SIGN_IN_CANCELLED) {
        return { error: { message: 'Inicio de sesión cancelado' } };
      } else if (statusCodes && error.code === statusCodes.IN_PROGRESS) {
        return { error: { message: 'Inicio de sesión ya en curso' } };
      } else if (statusCodes && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { error: { message: 'Google Play Services no disponible' } };
      } else {
        console.error("Google Signin Error Custom:", error);
        return { error };
      }
    }
  }

  // Escuchar cambios de autenticación
  onAuthStateChange(callback) {
    return this.client.auth.onAuthStateChange(callback);
  }

  // --- MÉTODOS DE PERFIL ---

  // Actualizar metadatos del usuario autenticado (ej. username)
  async updateUserMetadata(metadata) {
    return await this.client.auth.updateUser({ data: metadata });
  }

  // Guardar/Actualizar perfil
  async upsertProfile(profileData) {
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) return { error: 'No authenticated user' };

    const updates = {
      id: user.id,
      ...profileData,
      updated_at: new Date(),
    };

    const { error } = await this.client
      .from('profiles')
      .upsert(updates);
    
    return { error };
  }

  // Obtener perfil
  async getProfile(userId = null) {
    let uid = userId;
    
    // Si no se pasa ID, intentar obtenerlo del usuario autenticado
    if (!uid) {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return { data: null, error: 'No authenticated user' };
      uid = user.id;
    }

    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();
      
    return { data, error };
  }

  // Subir Avatar
  async uploadAvatar(uri) {
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Usar ArrayBuffer
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}.${fileExt}`; 
      const filePath = `${fileName}`;

      const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

      // Subir a bucket 'avatars'
      const { error: uploadError } = await this.client.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, { 
            upsert: true,
            contentType: contentType
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data } = this.client.storage.from('avatars').getPublicUrl(filePath);
      return { url: data.publicUrl, error: null };
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return { url: null, error };
    }
  }
}

export const authService = new AuthService();
export const supabase = authService.client;