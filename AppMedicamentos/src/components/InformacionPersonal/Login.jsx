// src/components/InformacionPersonal/Login.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { AppState } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/supabaseClient';
import { commonStyles, colors, animations } from './Styles';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

const Login = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [focusedInput, setFocusedInput] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const emailRef = useRef();
  const passwordRef = useRef();
  const formRef = useRef();
  const [showConfirmedModal, setShowConfirmedModal] = useState(false);

  // Cargar credenciales guardadas al montar el componente
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedEmail = await SecureStore.getItemAsync('savedEmail');
        const savedPassword = await SecureStore.getItemAsync('savedPassword');
        const shouldRemember = await AsyncStorage.getItem('rememberMe');
        
        if (savedEmail && savedPassword && shouldRemember === 'true') {
          setFormData({
            email: savedEmail,
            password: savedPassword,
          });
          setRememberMe(true);
        }
      } catch (error) {
        console.log('Error loading saved credentials:', error);
      }
    };
    loadSavedCredentials();
  }, []);

  useEffect(() => {
    // Este useEffect ya no verifica awaitingConfirmation automáticamente
    // Solo se mostrará el modal después de un login exitoso
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'El correo es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Correo electrónico inválido';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      formRef.current.shake(800);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await authService.signIn(formData.email, formData.password);

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrors({ 
            email: 'La cuenta no existe o las credenciales son incorrectas',
            password: 'La cuenta no existe o las credenciales son incorrectas'
          });
          showMessage('La cuenta no existe o las credenciales son incorrectas', 'error');
        } else if (error.message.includes('Email not confirmed')) {
          showMessage('Por favor confirma tu correo electrónico antes de iniciar sesión', 'error');
        } else if (error.message.includes('User not found')) {
          setErrors({ 
            email: 'Esta cuenta no está registrada',
            password: ''
          });
          showMessage('Esta cuenta no está registrada. Por favor regístrate primero', 'error');
        } else {
          showMessage('Error al iniciar sesión: ' + error.message, 'error');
        }
        formRef.current.shake(800);
      } else {
        // Guardar credenciales si está marcado "Recordarme"
        if (rememberMe) {
          try {
            await SecureStore.setItemAsync('savedEmail', formData.email);
            await SecureStore.setItemAsync('savedPassword', formData.password);
            await AsyncStorage.setItem('rememberMe', 'true');
          } catch (error) {
            console.log('Error saving credentials:', error);
          }
        } else {
          // Eliminar credenciales guardadas si no está marcado
          try {
            await SecureStore.deleteItemAsync('savedEmail');
            await SecureStore.deleteItemAsync('savedPassword');
            await AsyncStorage.removeItem('rememberMe');
          } catch (error) {
            console.log('Error deleting credentials:', error);
          }
        }

        showMessage('¡Inicio de sesión exitoso!', 'success');
        await AsyncStorage.setItem('welcomeMessage', 'Bienvenido de vuelta');
        
        // Verificar si venía de un registro y mostrar modal de confirmación
        const awaitingFlag = await AsyncStorage.getItem('awaitingConfirmation');
        if (awaitingFlag === 'true') {
          setShowConfirmedModal(true);
          await AsyncStorage.removeItem('awaitingConfirmation');
        }
        
        // Verificar perfil en SUPABASE primero (para recuperar datos tras reinstalación)
        let isProfileComplete = false;
        let profileFetched = false;
        
        try {
            const { data: profile } = await authService.getProfile();
            profileFetched = true; // Marcamos que se intentó consultar (incluso si el resultado es null)

            if (profile) {
                if (profile.onboarding_completed) {
                    isProfileComplete = true;
                    
                    // Restaurar datos en AsyncStorage
                    const restoredData = {
                        fechaNacimiento: profile.birth_date,
                        edad: profile.age?.toString(),
                        genero: profile.gender,
                        peso: profile.weight?.toString(),
                        completedAt: profile.updated_at
                    };
                    
                    await AsyncStorage.setItem('userProfile', JSON.stringify(restoredData));
                    await AsyncStorage.setItem('userInfoCompleted', 'true');
                    await AsyncStorage.setItem('needsUserInfo', 'false');
                    
                    if (profile.avatar_url) {
                        await AsyncStorage.setItem('profileImage', profile.avatar_url);
                    }
                } else {
                    // Perfil existe pero NO está completo → limpiar caché local
                    await AsyncStorage.multiRemove(['userInfoCompleted', 'userProfile', 'userInfo', 'profileImage']);
                    await AsyncStorage.setItem('needsUserInfo', 'true');
                }
            } else {
                // No hay perfil en Supabase para este usuario (cuenta nueva o fue eliminada).
                // Limpiar todo el caché local para que siempre comience el onboarding.
                await AsyncStorage.multiRemove(['userInfoCompleted', 'userProfile', 'userInfo', 'profileImage']);
                await AsyncStorage.setItem('needsUserInfo', 'true');
                isProfileComplete = false;
            }
        } catch (e) {
            console.warn("Could not fetch remote profile", e);
            // profileFetched sigue false → caerá al fallback local
            profileFetched = false;
        }

        // Fallback offline: solo si no pudo conectar con Supabase
        if (!profileFetched && !isProfileComplete) {
             const localCheck = await AsyncStorage.getItem('userInfoCompleted');
             if (localCheck === 'true') isProfileComplete = true;
        }
        
        setTimeout(async () => {
          try {
            if (isProfileComplete) {
              // Si ya completó las preguntas (remoto o local), ir al home
              router.replace('/home');
            } else {
              // Si es primera vez o perfil eliminado, ir a preguntas
              await AsyncStorage.setItem('needsUserInfo', 'true');
              router.replace('/preguntas');
            }
          } catch (e) {
            console.warn('Router navigation failed:', e);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error:', error);
      showMessage('Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { data, error, userInfo } = await authService.signInWithGoogle();
      if (error) {
        if (error.message === 'Inicio de sesión cancelado') {
          // No mostramos error si el usuario canceló voluntariamente
          console.log('Usuario canceló login Google');
        } else if (error.message.includes('Google Play Services no disponible')) {
          showMessage('Google Play Services no está disponible en este dispositivo', 'error');
        } else {
          console.error('Google sign-in error:', error);
          showMessage('Error al iniciar con Google', 'error');
        }
      } else {
        showMessage('¡Conectado con Google!', 'success');

        // Determinar si es usuario nuevo (creado hace menos de 1 min)
        let isNewUser = false;
        if (data?.user?.created_at) {
          const created = new Date(data.user.created_at).getTime();
          const now = new Date().getTime();
          if (now - created < 60000) {
            isNewUser = true;
          }
        }
        await AsyncStorage.setItem('welcomeMessage', isNewUser ? 'Bienvenido' : 'Bienvenido de vuelta');

        // Guardar datos de Google
        if (userInfo?.user) {
             if (userInfo.user.name) {
                 await AsyncStorage.setItem('userName', userInfo.user.name);
             }
             if (userInfo.user.photo) {
                 await AsyncStorage.setItem('profileImage', userInfo.user.photo);
                 
                 // Si es nuevo, intentar guardar en profile de Supabase
                 if (isNewUser) {
                    try {
                        const updates = {
                            avatar_url: userInfo.user.photo,
                            full_name: userInfo.user.name,
                            onboarding_completed: false 
                        };
                        const { error: upsertErr } = await authService.upsertProfile(updates);
                        if (upsertErr) console.warn("Error update profile google:", upsertErr);
                    } catch (upsertErr) {
                        console.warn("Error guardando perfil inicial Google:", upsertErr);
                    }
                 }
             }
        }

        // Redirigir según estado del perfil
        let isProfileComplete = false;
        let profileFetched = false;

        try {
            // Verificar perfil en SUPABASE
            const { data: profile } = await authService.getProfile();
            profileFetched = true; // Marcamos que la consulta llegó (incluso si profile es null)

            if (profile) {
                if (profile.onboarding_completed) {
                    isProfileComplete = true;
                    const restoredData = {
                      fechaNacimiento: profile.birth_date,
                      edad: profile.age?.toString(),
                      genero: profile.gender,
                      peso: profile.weight?.toString(),
                      completedAt: profile.updated_at
                    };
                    await AsyncStorage.setItem('userProfile', JSON.stringify(restoredData));
                    await AsyncStorage.setItem('userInfoCompleted', 'true');
                    await AsyncStorage.setItem('needsUserInfo', 'false');
                } else {
                    // Perfil incompleto → limpiar caché local
                    await AsyncStorage.multiRemove(['userInfoCompleted', 'userProfile', 'userInfo']);
                    await AsyncStorage.setItem('needsUserInfo', 'true');
                }
            } else {
                // Sin perfil en Supabase → usuario nuevo o eliminado → limpiar caché
                await AsyncStorage.multiRemove(['userInfoCompleted', 'userProfile', 'userInfo']);
                await AsyncStorage.setItem('needsUserInfo', 'true');
            }
        } catch (e) {
            console.warn("Error profile google check", e);
            profileFetched = false;
        }

        if (!profileFetched && !isProfileComplete) {
             const localCheck = await AsyncStorage.getItem('userInfoCompleted');
             if (localCheck === 'true') isProfileComplete = true;
        }

        setTimeout(() => {
           if (isProfileComplete) {
              router.replace('/home');
           } else {
              AsyncStorage.setItem('needsUserInfo', 'true');
              router.replace('/preguntas');
           }
        }, 1000);
      }
    } catch (e) {
      console.error(e);
      showMessage('Error al iniciar con Google', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      setErrors({ email: 'Ingresa tu correo para recuperar la contraseña' });
      emailRef.current.shake(800);
      return;
    }

    setLoading(true);
    try {
      const { error } = await authService.resetPassword(formData.email);
      
      if (error) {
        showMessage('Error al enviar correo: ' + error.message, 'error');
      } else {
        showMessage('Revisa tu correo para restablecer tu contraseña', 'success');
      }
    } catch (error) {
      showMessage('Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <LinearGradient 
      colors={isDark ? [theme.background, '#1a1a2e', '#2c3e50'] : ['#1100ffff', '#b84db8ff', '#d87fd8ff']}
      style={commonStyles.gradientContainer}>
      <KeyboardAvoidingView
        style={[commonStyles.container, { flex: 1 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
      >
        <View style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
              <ScrollView
                contentContainerStyle={[
                  commonStyles.centerContainer, 
                  { 
                    flexGrow: 1, 
                    paddingTop: Math.max(16, insets.top),
                    paddingBottom: (Platform.OS === 'ios' ? 50 : 30) + insets.bottom 
                  }
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
          {/* Mensaje de estado */}
          {message ? (
            <Animatable.View
              animation="slideInDown"
              style={[
                commonStyles.messageContainer,
                messageType === 'error' && commonStyles.errorMessageContainer,
              ]}
            >
              <Text style={commonStyles.messageText}>{message}</Text>
            </Animatable.View>
          ) : null}

          {/* Logo */}
          <Animatable.View animation="bounceIn" duration={1500} style={commonStyles.logoContainer}>
            <Animatable.View
              animation="pulse"
              iterationCount="infinite"
              duration={2000}
              style={[commonStyles.logoCircle, isDark && { backgroundColor: theme.primary, shadowColor: theme.primary, borderColor: theme.card }]}
            >
              <Image 
                source={require('../../../assets/images/Pato.png')}
                style={commonStyles.logoImage}
                resizeMode="contain"
              />
            </Animatable.View>
          </Animatable.View>

          {/* Formulario */}
          <Animatable.View
            ref={formRef}
            animation="slideInUp"
            delay={500}
            duration={1000}
            style={[commonStyles.modernCard, isDark && { backgroundColor: theme.card, shadowColor: theme.border, borderColor: theme.border }]}
          >
            <Text style={[commonStyles.formTitle, isDark && { color: theme.primary }]}>Iniciar Sesión</Text>

            {/* Email */}
            <Animatable.View ref={emailRef} style={commonStyles.inputContainer}>
              <View style={[
                commonStyles.inputWrapper,
                focusedInput === 'email' && commonStyles.inputWrapperFocused,
                isDark && { backgroundColor: theme.inputBackground, borderColor: theme.border }
              ]}>
                <Ionicons
                  name="mail-outline"
                  size={24}
                  color={focusedInput === 'email' ? (isDark ? theme.primary : colors.primary) : (isDark ? theme.textSecondary : colors.gray)}
                  style={commonStyles.inputIcon}
                />
                <Text style={[
                  commonStyles.floatingLabel,
                  formData.email || focusedInput === 'email' ? 
                    commonStyles.floatingLabelTop : 
                    commonStyles.floatingLabelCenter,
                  isDark && { backgroundColor: theme.background, color: focusedInput === 'email' ? theme.primary : theme.textSecondary }
                ]}>
                  {formData.email || focusedInput === 'email' ? 'Correo' : 'Correo electrónico'}
                </Text>
                <TextInput
                  style={[commonStyles.input, isDark && { color: theme.text }]}
                  placeholder=""
                  placeholderTextColor={isDark ? theme.textSecondary : colors.gray}
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput('')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.email && (
                <Animatable.Text animation="fadeIn" style={commonStyles.errorText}>
                  {errors.email}
                </Animatable.Text>
              )}
            </Animatable.View>

            {/* Password */}
            <Animatable.View ref={passwordRef} style={commonStyles.inputContainer}>
              <View style={[
                commonStyles.inputWrapper,
                focusedInput === 'password' && commonStyles.inputWrapperFocused,
                isDark && { backgroundColor: theme.inputBackground, borderColor: theme.border }
              ]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={24}
                  color={focusedInput === 'password' ? (isDark ? theme.primary : colors.primary) : (isDark ? theme.textSecondary : colors.gray)}
                  style={commonStyles.inputIcon}
                />
                <Text style={[
                  commonStyles.floatingLabel,
                  formData.password || focusedInput === 'password' ? 
                    commonStyles.floatingLabelTop : 
                    commonStyles.floatingLabelCenter,
                   isDark && { backgroundColor: theme.card, color: focusedInput === 'password' ? theme.primary : theme.textSecondary }
                ]}>
                  {formData.password || focusedInput === 'password' ? 'Contraseña' : 'Contraseña'}
                </Text>
                <TextInput
                  style={[commonStyles.input, { paddingRight: 55 }, isDark && { color: theme.text }]}
                  placeholder=""
                  placeholderTextColor={isDark ? theme.textSecondary : colors.gray}
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput('')}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={{ position: 'absolute', right: 18, top: '50%', marginTop: -12 }}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={24}
                    color={isDark ? theme.textSecondary : colors.gray}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Animatable.Text animation="fadeIn" style={commonStyles.errorText}>
                  {errors.password}
                </Animatable.Text>
              )}
            </Animatable.View>

            {/* Recordarme */}
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 12 }}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: rememberMe ? (isDark ? theme.primary : colors.primary) : (isDark ? theme.textSecondary : colors.gray),
                backgroundColor: rememberMe ? (isDark ? theme.primary : colors.primary) : 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                {rememberMe && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
              <Text style={{ marginLeft: 8, color: isDark ? theme.text : colors.text, fontSize: 14, fontWeight: '500' }}>
                Recordarme
              </Text>
            </TouchableOpacity>

            {/* Forgot Password */}
            <TouchableOpacity style={commonStyles.forgotPassword} onPress={handleForgotPassword}>
              <Text style={[commonStyles.forgotPasswordText, isDark && { color: theme.primary }]}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <Animatable.View animation="fadeInUp" delay={800}>
              <TouchableOpacity
                style={[commonStyles.button, commonStyles.primaryButton, isDark && { backgroundColor: theme.primary, shadowColor: theme.primary }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={commonStyles.buttonText}>Ingresar</Text>
                )}
              </TouchableOpacity>
            </Animatable.View>

            {/* Social Login: botón Google */}
            <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 8 }}>
              <Text style={{ color: isDark ? theme.textSecondary : colors.gray, marginBottom: 12 }}>O continúa con</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={handleGoogleSignIn}
                  style={{
                    backgroundColor: isDark ? theme.inputBackground : '#fff',
                    paddingVertical: 12,
                    paddingHorizontal: 30, // Más ancho
                    borderRadius: 24, // Más redondeado
                    elevation: 3, // Sombra en Android
                    marginHorizontal: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center', // Centrado
                    borderWidth: 1,
                    borderColor: isDark ? theme.border : '#E0E0E0', 
                    shadowColor: '#000', // Sombra en iOS
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                  }}
                >
                  {/* Logo multicolor oficial de Google */}
                  <View style={{ 
                      backgroundColor: '#fff', 
                      borderRadius: 20, 
                      padding: 2, 
                      width: 26, 
                      height: 26, 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      marginRight: 10
                  }}>
                      <Image 
                        source={{ uri: "https://developers.google.com/identity/images/g-logo.png" }} 
                        style={{ width: 18, height: 18 }} 
                        resizeMode="contain"
                      />
                  </View>
                  <Text style={{ fontWeight: '600', color: isDark ? theme.text : '#1F1F1F', fontSize: 16 }}>Google</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Divider */}
            <View style={commonStyles.divider}>
              <View style={commonStyles.dividerLine} />
              <Text style={[commonStyles.dividerText, isDark && { color: theme.textSecondary }]}>o</Text>
              <View style={commonStyles.dividerLine} />
            </View>

            {/* Register Link */}
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={[commonStyles.linkText, isDark && { color: theme.primary }]}>
                ¿No tienes cuenta?{' '}
                <Text style={[commonStyles.linkTextSecondary, isDark && { color: theme.secondary }]}>Regístrate</Text>
              </Text>
            </TouchableOpacity>
          </Animatable.View>
              </ScrollView>
            </View>
          </SafeAreaView>
        </View>

        {/* Loading Overlay */}
        {loading && (
          <View style={commonStyles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.white} />
            <Text style={commonStyles.loadingText}>Cargando...</Text>
          </View>
        )}

        {/* Modal de éxito si el usuario confirmó su correo */}
        {showConfirmedModal && (
          <View style={commonStyles.modalOverlay}>
            <Animatable.View animation="bounceIn" duration={700} style={[commonStyles.modalContainer, isDark && { backgroundColor: theme.card }]}>
              <Ionicons name="checkmark-circle" style={{ fontSize: 64, marginBottom: 16, color: colors.success }} />
              <Text style={[commonStyles.modalText, isDark && { color: theme.text }]}>
                ¡Cuenta confirmada! 🎉
              </Text>
              <Text style={[commonStyles.modalSubText, isDark && { color: theme.textSecondary }]}>
                Tu cuenta ha sido activada con éxito. Ahora puedes usar la aplicación.
              </Text>
              <View style={{ height: 20 }} />
              <TouchableOpacity
                onPress={() => setShowConfirmedModal(false)}
                style={{
                  backgroundColor: isDark ? theme.primary : colors.primary,
                  paddingVertical: 14,
                  paddingHorizontal: 40,
                  borderRadius: 14,
                  alignSelf: 'center',
                  shadowColor: isDark ? theme.primary : colors.primary,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  elevation: 10,
                  minWidth: 120,
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17, textAlign: 'center' }}>OK</Text>
              </TouchableOpacity>
            </Animatable.View>
          </View>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default Login;
