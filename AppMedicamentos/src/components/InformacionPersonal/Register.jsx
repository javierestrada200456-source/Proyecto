// src/components/InformacionPersonal/Register.jsx
import React, { useState, useRef } from 'react';
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
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { AppState } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/supabaseClient';
import { commonStyles, colors, animations } from './Styles';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

const Register = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [focusedInput, setFocusedInput] = useState('');

  const usernameRef = useRef();
  const emailRef = useRef();
  const passwordRef = useRef();
  const confirmPasswordRef = useRef();
  const formRef = useRef();
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'El nombre de usuario es obligatorio';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El correo es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Correo electrónico inválido';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Debe tener mayúscula, minúscula y número';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      formRef.current?.shake(800);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await authService.signUp(
        formData.email,
        formData.password,
        formData.username
      );
      console.log('authService.signUp response:', { data, error });

      if (error) {
        if (error.message.includes('User already registered')) {
          setErrors({ email: 'Este correo ya está registrado' });
          showMessage('El correo ya está en uso', 'error');
        } else if (error.message.includes('Password should be at least')) {
          setErrors({ password: 'La contraseña es muy débil' });
          showMessage('La contraseña no cumple los requisitos', 'error');
        } else {
          console.error('Register error detail:', error);
          showMessage('Error al registrarse: ' + error.message, 'error');
        }
        formRef.current?.shake(800);
      } else {
        // Guardar nombre en profiles para que el cuidador lo vea desde el inicio
        if (data?.user) {
          try {
            const cleanName = formData.username.trim();
            await authService.upsertProfile({ name: cleanName, full_name: cleanName });
          } catch (_e) { /* no bloquear el flujo si falla */ }
        }
        // Guardamos un flag indicando que el usuario debe confirmar su correo.
        await AsyncStorage.setItem('awaitingConfirmation', 'true');
        // Marcar que es un usuario nuevo y necesita completar info
        await AsyncStorage.setItem('needsUserInfo', 'true');
        await AsyncStorage.removeItem('userInfoCompleted');
        
        setShowConfirmationModal(true);
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
        });
        // No navegamos automáticamente: dejamos que el usuario cierre o vuelva
        // a la app luego de confirmar el correo. En Login se detectará el retorno.
      }
    } catch (error) {
      console.error('Error:', error);
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

  const getPasswordStrength = (password) => {
    if (password.length === 0) return { strength: 0, color: colors.gray, text: '' };
    if (password.length < 4) return { strength: 25, color: colors.error, text: 'Muy débil' };
    if (password.length < 6) return { strength: 50, color: colors.warning, text: 'Débil' };
    if (password.length < 8) return { strength: 75, color: colors.warning, text: 'Regular' };
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { strength: 75, color: colors.warning, text: 'Regular' };
    }
    return { strength: 100, color: colors.success, text: 'Fuerte' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <LinearGradient colors={isDark ? [theme.background, '#1a1a2e', '#2c3e50'] : [colors.primary, colors.secondary, colors.accent]} style={commonStyles.gradientContainer}>
      <KeyboardAvoidingView
        style={commonStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
      >
        <View style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1 }}>
            <ScrollView
              contentContainerStyle={[
                commonStyles.centerContainer, 
                { 
                  paddingTop: Math.max(16, insets.top),
                  paddingVertical: 40,
                  paddingBottom: 40 + insets.bottom 
                }
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
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
              <Text style={[commonStyles.logoText, { color: isDark ? theme.text : colors.primary }]}>💊</Text>
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
            <Text style={[commonStyles.formTitle, isDark && { color: theme.primary }]}>Crear Cuenta</Text>

            {/* Username */}
            <Animatable.View ref={usernameRef} style={commonStyles.inputContainer}>
              <View style={[
                commonStyles.inputWrapper,
                focusedInput === 'username' && commonStyles.inputWrapperFocused,
                isDark && { backgroundColor: theme.inputBackground, borderColor: theme.border }
              ]}>
                <Ionicons
                  name="person-outline"
                  size={24}
                  color={focusedInput === 'username' ? (isDark ? theme.primary : colors.primary) : (isDark ? theme.textSecondary : colors.gray)}
                  style={commonStyles.inputIcon}
                />
                <Text style={[
                  commonStyles.floatingLabel,
                  formData.username || focusedInput === 'username' ? 
                    commonStyles.floatingLabelTop : 
                    commonStyles.floatingLabelCenter,
                  isDark && { backgroundColor: theme.card, color: focusedInput === 'username' ? theme.primary : theme.textSecondary }
                ]}>
                  {formData.username || focusedInput === 'username' ? 'Usuario' : 'Nombre de usuario'}
                </Text>
                <TextInput
                  style={[commonStyles.input, isDark && { color: theme.text }]}
                  placeholder=""
                  placeholderTextColor={isDark ? theme.textSecondary : colors.gray}
                  value={formData.username}
                  onChangeText={(value) => handleInputChange('username', value)}
                  onFocus={() => setFocusedInput('username')}
                  onBlur={() => setFocusedInput('')}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.username && (
                <Animatable.Text animation="fadeIn" style={commonStyles.errorText}>
                  {errors.username}
                </Animatable.Text>
              )}
            </Animatable.View>

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
                  isDark && { backgroundColor: theme.card, color: focusedInput === 'email' ? theme.primary : theme.textSecondary }
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
              
              {/* Password Strength Indicator */}
              {formData.password.length > 0 && (
                <Animatable.View animation="fadeIn" style={commonStyles.strengthContainer}>
                  <View style={commonStyles.strengthBar}>
                    <Animatable.View 
                      animation="slideInLeft"
                      style={[
                        commonStyles.strengthProgress,
                        {
                          width: `${passwordStrength.strength}%`,
                          backgroundColor: passwordStrength.color
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[commonStyles.strengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.text}
                  </Text>
                </Animatable.View>
              )}
              
              {errors.password && (
                <Animatable.Text animation="fadeIn" style={commonStyles.errorText}>
                  {errors.password}
                </Animatable.Text>
              )}
            </Animatable.View>

            {/* Confirm Password */}
            <Animatable.View ref={confirmPasswordRef} style={commonStyles.inputContainer}>
              <View style={[
                commonStyles.inputWrapper,
                focusedInput === 'confirmPassword' && commonStyles.inputWrapperFocused,
                isDark && { backgroundColor: theme.inputBackground, borderColor: theme.border }
              ]}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={24}
                  color={focusedInput === 'confirmPassword' ? (isDark ? theme.primary : colors.primary) : (isDark ? theme.textSecondary : colors.gray)}
                  style={commonStyles.inputIcon}
                />
                <Text style={[
                  commonStyles.floatingLabel,
                  formData.confirmPassword || focusedInput === 'confirmPassword' ? 
                    commonStyles.floatingLabelTop : 
                    commonStyles.floatingLabelCenter,
                  isDark && { backgroundColor: theme.card, color: focusedInput === 'confirmPassword' ? theme.primary : theme.textSecondary }
                ]}>
                  {formData.confirmPassword || focusedInput === 'confirmPassword' ? 'Confirmar' : 'Confirmar contraseña'}
                </Text>
                <TextInput
                  style={[commonStyles.input, { paddingRight: 55 }, isDark && { color: theme.text }]}
                  placeholder=""
                  placeholderTextColor={isDark ? theme.textSecondary : colors.gray}
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  onFocus={() => setFocusedInput('confirmPassword')}
                  onBlur={() => setFocusedInput('')}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  style={{ position: 'absolute', right: 18, top: '50%', marginTop: -12 }}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={24}
                    color={isDark ? theme.textSecondary : colors.gray}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Animatable.Text animation="fadeIn" style={commonStyles.errorText}>
                  {errors.confirmPassword}
                </Animatable.Text>
              )}
            </Animatable.View>

            {/* Register Button */}
            <Animatable.View animation="fadeInUp" delay={800} style={{ marginTop: 10 }}>
              <TouchableOpacity
                style={[commonStyles.button, commonStyles.primaryButton, isDark && { backgroundColor: theme.primary, shadowColor: theme.primary }]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={commonStyles.buttonText}>Crear Cuenta</Text>
                )}
              </TouchableOpacity>
            </Animatable.View>

            {/* Divider */}
            <View style={commonStyles.divider}>
              <View style={commonStyles.dividerLine} />
              <Text style={[commonStyles.dividerText, isDark && { color: theme.textSecondary }]}>o</Text>
              <View style={commonStyles.dividerLine} />
            </View>

            {/* Login Link */}
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={[commonStyles.linkText, isDark && { color: theme.primary }]}>
                ¿Ya tienes cuenta?{' '}
                <Text style={[commonStyles.linkTextSecondary, isDark && { color: theme.secondary }]}>Inicia sesión</Text>
              </Text>
            </TouchableOpacity>

            {/* Terms */}
            <Animatable.View animation="fadeIn" delay={1200} style={{ marginTop: 25 }}>
              <Text style={{
                color: isDark ? theme.textSecondary : colors.gray,
                fontSize: 12,
                textAlign: 'center',
                lineHeight: 18,
                paddingHorizontal: 10,
              }}>
                Al registrarte aceptas nuestros{' '}
                <Text style={{ color: isDark ? theme.primary : colors.primary, fontWeight: '600' }}>
                  Términos y Condiciones
                </Text>
                {' '}y{' '}
                <Text style={{ color: isDark ? theme.primary : colors.primary, fontWeight: '600' }}>
                  Política de Privacidad
                </Text>
              </Text>
            </Animatable.View>
          </Animatable.View>
              </ScrollView>
            </SafeAreaView>
          </View>

        {/* Modal de espera: central y con overlay oscuro */}
        {showConfirmationModal && (
          <View style={commonStyles.modalOverlay} pointerEvents="box-none">
            <Animatable.View animation="bounceIn" duration={700} style={[commonStyles.modalContainer, isDark && { backgroundColor: theme.card }]}>
              <Ionicons name="mail-outline" style={{ fontSize: 56, marginBottom: 16, color: isDark ? theme.primary : colors.primary }} />
              <Text style={[commonStyles.modalText, isDark && { color: theme.text }]}>
                ✉️ Confirmación por correo
              </Text>
              <Text style={[commonStyles.modalSubText, isDark && { color: theme.textSecondary }]}>
                Hemos enviado un enlace de confirmación a tu bandeja de entrada. Haz clic en él para activar tu cuenta.
              </Text>
              <Text style={[commonStyles.modalSubText, { marginTop: 12, fontWeight: '500', color: isDark ? theme.textSecondary : colors.darkGray }]}>
                📧 Revisa también tu carpeta de spam si no lo ves.
              </Text>
              <View style={{ height: 20 }} />
              <TouchableOpacity
                onPress={() => {
                  setShowConfirmationModal(false);
                  setTimeout(() => {
                    router.replace('/login');
                  }, 300);
                }}
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

        {/* Loading Overlay */}
        {loading && (
          <View style={commonStyles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.white} />
            <Text style={commonStyles.loadingText}>Creando cuenta...</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default Register;
