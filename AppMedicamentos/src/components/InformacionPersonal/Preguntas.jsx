import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { authService } from '../../services/supabaseClient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, commonStyles } from './Styles';
import {
  styles,
  animationConfig,
  genderOptions,
} from './Preguntas.Styles';

// Datos para el DatePicker
const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const AÑOS = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

// DateTimePicker implementation for React Native
const DatePicker = ({ isVisible, date, onConfirm, onCancel }) => {
  const [selectedDate, setSelectedDate] = useState(date);
  const [selectedDay, setSelectedDay] = useState(date.getDate());
  const [selectedMonth, setSelectedMonth] = useState(date.getMonth());
  const [selectedYear, setSelectedYear] = useState(date.getFullYear());

  const dayScrollViewRef = useRef();
  const monthScrollViewRef = useRef();
  const yearScrollViewRef = useRef();

  // Scroll to center on initial render
  useEffect(() => {
    setTimeout(() => {
      if (dayScrollViewRef.current) {
        dayScrollViewRef.current.scrollToIndex({
          index: selectedDay - 1,
          animated: false,
          viewPosition: 0.5,
        });
      }
      if (monthScrollViewRef.current) {
        monthScrollViewRef.current.scrollToIndex({
          index: selectedMonth,
          animated: false,
          viewPosition: 0.5,
        });
      }
      if (yearScrollViewRef.current) {
        yearScrollViewRef.current.scrollToIndex({
          index: AÑOS.indexOf(selectedYear),
          animated: false,
          viewPosition: 0.5,
        });
      }
    }, 100);
  }, [isVisible]);

  const handleDaySelect = (day) => {
    setSelectedDay(day);
    const newDate = new Date(selectedDate);
    newDate.setDate(day);
    setSelectedDate(newDate);
  };

  const handleMonthSelect = (monthIndex) => {
    setSelectedMonth(monthIndex);
    const newDate = new Date(selectedDate);
    newDate.setMonth(monthIndex);
    setSelectedDate(newDate);
  };

  const handleYearSelect = (year) => {
    setSelectedYear(year);
    const newDate = new Date(selectedDate);
    newDate.setFullYear(year);
    setSelectedDate(newDate);
  };

  const renderPickerItem = (item, isSelected, onSelect) => (
    <TouchableOpacity
      style={[
        styles.pickerItem,
        isSelected && styles.pickerItemSelected,
      ]}
      onPress={() => onSelect(item)}
    >

      <Text
        style={[
          styles.pickerItemText,
          isSelected && styles.pickerItemTextSelected,
        ]}
      >
        {item}
      </Text>
    </TouchableOpacity>
  );
  
  return (
    <Modal visible={isVisible} transparent animationType="slide">
      <View style={styles.datePickerContainer}>
        <View style={styles.datePickerContent}>
          <View style={styles.datePickerHeader}>
            <Text style={styles.datePickerTitle}>Selecciona tu fecha de nacimiento</Text>
          </View>
          
          <View style={styles.datePickersWrapper}>
            {/* Día */}
            <View style={styles.datePickerColumn}>
              <Text style={styles.datePickerColumnLabel}>Día</Text>
              <FlatList
                ref={dayScrollViewRef}
                data={DIAS}
                keyExtractor={(item) => item.toString()}
                renderItem={({ item }) => renderPickerItem(item, item === selectedDay, handleDaySelect)}
                onScrollToIndexFailed={() => {}}
                snapToAlignment="center"
                scrollEventThrottle={16}
                style={styles.datePickerList}
                nestedScrollEnabled={true}
              />
            </View>

            {/* Mes */}
            <View style={styles.datePickerColumn}>
              <Text style={styles.datePickerColumnLabel}>Mes</Text>
              <FlatList
                ref={monthScrollViewRef}
                data={MESES}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item, index }) => renderPickerItem(item, index === selectedMonth, () => handleMonthSelect(index))}
                onScrollToIndexFailed={() => {}}
                snapToAlignment="center"
                scrollEventThrottle={16}
                style={styles.datePickerList}
                nestedScrollEnabled={true}
              />
            </View>

            {/* Año */}
            <View style={styles.datePickerColumn}>
              <Text style={styles.datePickerColumnLabel}>Año</Text>
              <FlatList
                ref={yearScrollViewRef}
                data={AÑOS}
                keyExtractor={(item) => item.toString()}
                renderItem={({ item }) => renderPickerItem(item, item === selectedYear, handleYearSelect)}
                onScrollToIndexFailed={() => {}}
                snapToAlignment="center"
                scrollEventThrottle={16}
                style={styles.datePickerList}
                nestedScrollEnabled={true}
              />
            </View>
          </View>
          
          <View style={styles.datePickerFooter}>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => onCancel()}
            >
              <Text style={styles.datePickerButtonTextCancel}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.datePickerButton, styles.datePickerButtonConfirm]}
              onPress={() => onConfirm(selectedDate)}
            >
              <Text style={styles.datePickerButtonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const Preguntas = ({ onComplete }) => {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState({
    fechaNacimiento: new Date(),
    edad: '',
    genero: '',
    peso: '',
    medicalConditions: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const scrollViewRef = useRef();
  const formRef = useRef();
  const { width } = Dimensions.get('window');

  // Calcular edad automáticamente
  const calcularEdad = (fechaNacimiento) => {
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
    const mes = hoy.getMonth() - fechaNacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const handleDateChange = (selectedDate) => {
    if (selectedDate) {
      const newAge = calcularEdad(selectedDate);
      if (newAge < 1) {
        Alert.alert('Error', 'La edad debe ser al menos 1 año');
        return;
      }
      
      setFormData({
        ...formData,
        fechaNacimiento: selectedDate,
        edad: newAge.toString(),
      });
      
      setErrors({ ...errors, fechaNacimiento: '', edad: '' });
      setCompletedSteps(new Set([...completedSteps, 0]));
      setShowDatePicker(false);
    }
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateForm = () => {
    let newErrors = {};

    if (!formData.fechaNacimiento) {
      newErrors.fechaNacimiento = 'La fecha de nacimiento es requerida';
    }

    if (!formData.edad || formData.edad < 1 || formData.edad > 120) {
      newErrors.edad = 'La edad debe estar entre 1 y 120 años';
    }

    if (!formData.genero) {
      newErrors.genero = 'Debes seleccionar un género';
    }

    if (!formData.peso || parseFloat(formData.peso) < 10 || parseFloat(formData.peso) > 500) {
      newErrors.peso = 'El peso debe estar entre 10 y 500 kg';
    }

    if (!formData.medicalConditions || formData.medicalConditions.trim().length < 2) {
      newErrors.medicalConditions = 'Este campo es obligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Guardar datos en AsyncStorage
      const profileData = {
        fechaNacimiento: formData.fechaNacimiento.toISOString(),
        edad: formData.edad,
        genero: formData.genero,
        peso: formData.peso,
        completedAt: new Date().toISOString(),
        medicalConditions: formData.medicalConditions,
      };
      await AsyncStorage.setItem('userProfile', JSON.stringify(profileData));
      
      // Marcar que el usuario completó las preguntas
      await AsyncStorage.setItem('userInfoCompleted', 'true');
      await AsyncStorage.setItem('needsUserInfo', 'false');

      // --- GUARDAR EN SUPABASE ---
      // Asegurarnos de guardar el nombre en el perfíl también
      const { data: authData } = await authService.getCurrentUser();
      const user = authData?.user;
      let userName = (await AsyncStorage.getItem('userName')) || '';
      
      if (!userName && user) {
          userName = user.user_metadata?.full_name || user.user_metadata?.username || user.email?.split('@')[0] || '';
      }

      // Mapeamos los campos a columnas de la base de datos
      const supabaseData = {
          birth_date: profileData.fechaNacimiento,
          age: parseInt(profileData.edad, 10),
          gender: profileData.genero,
          weight: parseFloat(profileData.peso),
          medical_conditions: formData.medicalConditions,
          onboarding_completed: true,
      };

      // Incluir nombre solo si hay valor — probamos primero 'name', luego 'full_name'
      if (userName) supabaseData.name = userName;

      let { error: upsertError } = await authService.upsertProfile(supabaseData);

      // Si falló con name, reintentamos sin él (por si la columna no existe en Supabase)
      if (upsertError && userName) {
          console.warn('upsertProfile con name falló, reintentando sin él:', upsertError);
          const { age, gender, weight, medical_conditions, onboarding_completed, birth_date } = supabaseData;
          const fallbackData = { age, gender, weight, medical_conditions, onboarding_completed, birth_date };
          const { error: fallbackError } = await authService.upsertProfile(fallbackData);
          upsertError = fallbackError;
      }

      if (upsertError) {
          // Error real: solo lo mostramos en consola, pero NO bloqueamos al usuario
          // (los datos ya están guardados en AsyncStorage)
          console.error("Error guardando informacion personal:", JSON.stringify(upsertError));
      }
      // --------------------------

      // Simular envío de datos
      setTimeout(() => {
        setLoading(false);
        setShowSuccessModal(true);
      }, 1500);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Ocurrió un error al guardar los datos');
    }
  };

  const steps = [
    {
      title: 'Fecha de Nacimiento',
      subtitle: 'Selecciona tu fecha de nacimiento',
      icon: 'calendar',
      color: '#FF6B6B',
    },
    {
      title: 'Edad',
      subtitle: 'Tu edad se calcula automáticamente',
      icon: 'birthday-cake',
      color: '#4ECDC4',
    },
    {
      title: 'Género',
      subtitle: 'Selecciona tu género',
      icon: 'human-male-female',
      color: '#95E1D3',
    },
    {
      title: 'Peso',
      subtitle: 'Ingresa tu peso en kilogramos',
      icon: 'weight-kilogram',
      color: '#F38181',
    },
  ];

  return (
    <LinearGradient
      colors={['#0f172a', '#1e1b4b', '#0f172a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header fijo — fuera del ScrollView */}
        <Animatable.View animation="fadeInDown" duration={800} style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Completa tu Perfil</Text>
            <Text style={styles.headerSubtitle}>
              Proporciona información personal para mejorar tu experiencia
            </Text>
          </View>
        </Animatable.View>

        {/* Barra de progreso fija — fuera del ScrollView */}
        <Animatable.View animation="fadeInUp" duration={800} style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={['#4ECDC4', '#44A08D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressFill,
                {
                  width: `${((completedSteps.size) / 5) * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            Paso {completedSteps.size} de 5
          </Text>
        </Animatable.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
          enabled={Platform.OS === 'ios'}
        >
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 30 + insets.bottom }
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Form Container */}
            <Animatable.View
              ref={formRef}
              animation="fadeInUp"
              duration={900}
              style={styles.formContainer}
            >
              {/* Fecha de Nacimiento */}
              <Animatable.View
                animation="slideInUp"
                duration={400}
                style={styles.fieldContainer}
              >
                <View style={styles.stepHeader}>
                  <View style={[styles.stepIcon, { backgroundColor: '#FF6B6B' }]}>
                    <Ionicons name="calendar" size={24} color="#fff" />
                  </View>
                  <View style={styles.stepInfo}>
                    <Text style={styles.fieldLabel}>Fecha de Nacimiento</Text>
                    <Text style={styles.fieldSubtitle}>
                      Selecciona tu fecha de nacimiento
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    focusedField === 'fechaNacimiento' && styles.dateButtonFocused,
                    errors.fechaNacimiento && styles.fieldError,
                  ]}
                  onPress={() => {
                    setShowDatePicker(true);
                    setFocusedField('fechaNacimiento');
                  }}
                >
                  <MaterialCommunityIcons
                    name="calendar-month"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.dateButtonText}>
                    {formData.fechaNacimiento.toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>

                {errors.fechaNacimiento && (
                  <Text style={styles.errorText}>{errors.fechaNacimiento}</Text>
                )}
              </Animatable.View>

              {/* Date Picker */}
              {showDatePicker && (
                <DatePicker
                  isVisible={showDatePicker}
                  date={formData.fechaNacimiento}
                  onConfirm={handleDateChange}
                  onCancel={() => setShowDatePicker(false)}
                />
              )}

              {/* Edad */}
              <Animatable.View
                animation="slideInUp"
                duration={500}
                style={styles.fieldContainer}
              >
                <View style={styles.stepHeader}>
                  <View style={[styles.stepIcon, { backgroundColor: '#4ECDC4' }]}>
                    <MaterialCommunityIcons
                      name="birthday-cake"
                      size={24}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.stepInfo}>
                    <Text style={styles.fieldLabel}>Edad</Text>
                    <Text style={styles.fieldSubtitle}>
                      Se calcula automáticamente
                    </Text>
                  </View>
                </View>

                <TouchableWithoutFeedback pointerEvents="box-none">
                  <View
                    style={[
                      styles.inputContainer,
                      focusedField === 'edad' && styles.inputContainerFocused,
                      errors.edad && styles.fieldError,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="numeric"
                      size={20}
                      color={focusedField === 'edad' ? colors.primary : colors.gray}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Tu edad"
                      value={formData.edad}
                      editable={false}
                      placeholderTextColor={colors.gray}
                    />
                    <Text style={styles.inputUnit}>años</Text>
                  </View>
                </TouchableWithoutFeedback>

                {errors.edad && <Text style={styles.errorText}>{errors.edad}</Text>}
              </Animatable.View>

              {/* Género */}
              <Animatable.View
                animation="slideInUp"
                duration={600}
                style={styles.fieldContainer}
              >
                <View style={styles.stepHeader}>
                  <View style={[styles.stepIcon, { backgroundColor: '#95E1D3' }]}>
                    <MaterialCommunityIcons
                      name="human-male-female"
                      size={24}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.stepInfo}>
                    <Text style={styles.fieldLabel}>Género</Text>
                    <Text style={styles.fieldSubtitle}>Selecciona tu género</Text>
                  </View>
                </View>

                <View style={styles.genderOptionsContainer}>
                  {genderOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.genderOption,
                        formData.genero === option.value &&
                          styles.genderOptionSelected,
                      ]}
                      onPress={() => {
                        setFormData({ ...formData, genero: option.value });
                        setErrors({ ...errors, genero: '' });
                        setCompletedSteps(new Set([...completedSteps, 2]));
                      }}
                    >
                      <MaterialCommunityIcons
                        name={option.icon}
                        size={28}
                        color={
                          formData.genero === option.value
                            ? '#fff'
                            : colors.primary
                        }
                      />
                      <Text
                        style={[
                          styles.genderLabel,
                          formData.genero === option.value &&
                            styles.genderLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {errors.genero && <Text style={styles.errorText}>{errors.genero}</Text>}
              </Animatable.View>

              {/* Peso */}
              <Animatable.View
                animation="slideInUp"
                duration={700}
                style={styles.fieldContainer}
              >
                <View style={styles.stepHeader}>
                  <View style={[styles.stepIcon, { backgroundColor: '#F38181' }]}>
                    <MaterialCommunityIcons
                      name="weight-kilogram"
                      size={24}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.stepInfo}>
                    <Text style={styles.fieldLabel}>Peso</Text>
                    <Text style={styles.fieldSubtitle}>
                      Ingresa tu peso en kilogramos
                    </Text>
                  </View>
                </View>

                <TouchableWithoutFeedback pointerEvents="box-none">
                  <View
                    style={[
                      styles.inputContainer,
                      focusedField === 'peso' && styles.inputContainerFocused,
                      errors.peso && styles.fieldError,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="weight-kilogram"
                      size={20}
                      color={focusedField === 'peso' ? colors.primary : colors.gray}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Ej: 75"
                      keyboardType="decimal-pad"
                      value={formData.peso}
                      editable={true}
                      selectTextOnFocus={true}
                      onChangeText={(text) => {
                        setFormData({ ...formData, peso: text });
                        if (text && parseFloat(text) >= 10) {
                          setErrors({ ...errors, peso: '' });
                          setCompletedSteps(new Set([...completedSteps, 3]));
                        } else {
                          const next = new Set([...completedSteps]);
                          next.delete(3);
                          setCompletedSteps(next);
                        }
                      }}
                      onFocus={() => setFocusedField('peso')}
                      onBlur={() => setFocusedField('')}
                      placeholderTextColor={colors.gray}
                    />
                    <Text style={styles.inputUnit}>kg</Text>
                  </View>
                </TouchableWithoutFeedback>

                {errors.peso && <Text style={styles.errorText}>{errors.peso}</Text>}
              </Animatable.View>

              {/* Condiciones Médicas */}
              <Animatable.View
                animation="slideInUp"
                duration={750}
                style={styles.fieldContainer}
              >
                <View style={styles.stepHeader}>
                  <View style={[styles.stepIcon, { backgroundColor: '#AC92EB' }]}>
                    <MaterialCommunityIcons
                      name="medical-bag"
                      size={24}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.stepInfo}>
                    <Text style={styles.fieldLabel}>Condiciones Médicas</Text>
                    <Text style={styles.fieldSubtitle}>
                      Ej. Hipertensión, Diabetes, Asma... (Obligatorio)
                    </Text>
                  </View>
                </View>

                <TouchableWithoutFeedback pointerEvents="box-none">
                  <View
                    style={[
                      styles.inputContainer,
                      focusedField === 'medicalConditions' && styles.inputContainerFocused,
                      errors.medicalConditions && styles.fieldError,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="clipboard-pulse-outline"
                      size={20}
                      color={focusedField === 'medicalConditions' ? colors.primary : colors.gray}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Escribe tus condiciones..."
                      value={formData.medicalConditions}
                      onChangeText={(text) => {
                         setFormData({ ...formData, medicalConditions: text });
                         if (text.length > 0) {
                             setCompletedSteps(new Set([...completedSteps, 4]));
                         } else {
                             const next = new Set([...completedSteps]);
                             next.delete(4);
                             setCompletedSteps(next);
                         }
                      }}
                      onFocus={() => setFocusedField('medicalConditions')}
                      onBlur={() => setFocusedField('')}
                      placeholderTextColor={colors.gray}
                    />
                  </View>
                </TouchableWithoutFeedback>

                {errors.medicalConditions && <Text style={styles.errorText}>{errors.medicalConditions}</Text>}
              </Animatable.View>

              {/* Submit Button */}
              <Animatable.View
                animation="slideInUp"
                duration={800}
                style={styles.buttonContainer}
              >
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    loading && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="large" color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={24}
                        color="#fff"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.submitButtonText}>
                        Guardar Información
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </Animatable.View>

              {/* Info Tips */}
              <Animatable.View
                animation="fadeInUp"
                duration={900}
                style={styles.tipsContainer}
              >
                <View style={styles.tipBox}>
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color={colors.primary}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.tipText}>
                    Esta información nos ayuda a personalizar tus recordatorios
                    de medicamentos
                  </Text>
                </View>
              </Animatable.View>
            </Animatable.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
      >
        <View style={styles.successModalOverlay}>
          <Animatable.View
            animation="bounceIn"
            duration={800}
            style={styles.successModalContent}
          >
            <View style={styles.successIconContainer}>
              <MaterialCommunityIcons
                name="check-circle"
                size={80}
                color="#4ECDC4"
              />
            </View>

            <Text style={styles.successTitle}>¡Perfecto!</Text>
            <Text style={styles.successMessage}>
              Tu información ha sido guardada correctamente
            </Text>

            <View style={styles.successDetails}>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons
                  name="calendar"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.detailText}>
                  {formData.fechaNacimiento.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <MaterialCommunityIcons
                  name="numeric"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.detailText}>{formData.edad} años</Text>
              </View>

              <View style={styles.detailRow}>
                <MaterialCommunityIcons
                  name="human-male-female"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.detailText}>
                  {formData.genero === 'male' ? 'Masculino' : 'Femenino'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <MaterialCommunityIcons
                  name="weight-kilogram"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.detailText}>{formData.peso} kg</Text>
              </View>

              {!!formData.medicalConditions && (
                <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                  <MaterialCommunityIcons
                    name="doctor"
                    size={20}
                    color={colors.primary}
                    style={{ marginTop: 2 }}
                  />
                  <Text style={styles.detailText} numberOfLines={2}>
                    {formData.medicalConditions}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setShowSuccessModal(false);
                onComplete && onComplete(formData);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.successButtonText}>Continuar</Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={20}
                color="#fff"
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>
          </Animatable.View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

export default Preguntas;
