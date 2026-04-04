import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { authService } from '../../../services/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from './InformacionPerfil.Styles';
import { useTheme } from '../../../context/ThemeContext';
import { Switch } from 'react-native';

const { width } = Dimensions.get('window');

export default function InformacionPerfil({ onBack }) {
  const router = useRouter();
  const { isDark, setMode, theme } = useTheme();
  
  // Estilos dinámicos para modo oscuro
  const infoLabelStyle = [styles.infoLabel, isDark && { color: theme.textSecondary }];
  const infoValueStyle = [styles.infoValue, isDark && { color: theme.text }];
  const iconContainerStyle = [styles.infoIconContainer, isDark && { backgroundColor: 'rgba(255,255,255,0.1)' }];

  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [displayName, setDisplayName] = useState('Usuario');
  const [editDraft, setEditDraft] = useState({
    name: '',
    age: '',
    gender: '',
    weight: '',
    bloodType: '',
    allergies: '',
    medicalConditions: '',
    emergencyContact: '',
  });
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        let currentUser = null;
        // Intentar obtener usuario validado por el servidor
        const { data: authData, error: authError } = await authService.getCurrentUser();

        if (authError) {
          // Si falla (ej: sin conexión o sesión no refrescada), intentamos obtener la sesión local
          // console.log('Validación online falló, verificando caché local...');
          const { data: sessionData } = await authService.getSession();
          if (sessionData?.session?.user) {
             currentUser = sessionData.session.user;
          } else {
             // Si tampoco hay sesión local, es un error real de autenticación
             console.error('Error loading user:', authError);
          }
        } else {
          currentUser = authData.user;
        }

        if (currentUser) {
            setUser(currentUser);
            
            // 0. Usar avatar de metadatos (ej: Google) por defecto
            if (currentUser?.user_metadata?.avatar_url) {
                setProfileImage(currentUser.user_metadata.avatar_url);
            }
            
            // 1. Intentar cargar desde Supabase (Fuente de Verdad)
            // Usamos el ID recuperado para evitar llamar a getUser() de nuevo internamente
            try {
                const { data: profile } = await authService.getProfile(currentUser.id);
                if (profile) {
                setDisplayName(profile.name || currentUser?.user_metadata?.username || currentUser?.user_metadata?.full_name || 'Usuario');
                    
                    // Si la imagen en Supabase es diferente o nueva, usarla (sobrescribe la de Google)
                    if (profile.avatar_url) {
                        setProfileImage(profile.avatar_url);
                        await AsyncStorage.setItem('profileImage', profile.avatar_url);
                    }

                    // Construir objeto de datos compatible con la estructura local
                    const profileDataFromCloud = {
                        fechaNacimiento: profile.birth_date ? new Date(profile.birth_date) : null,
                        edad: profile.age?.toString(),
                        genero: profile.gender,
                        peso: profile.weight?.toString(),
                        completedAt: profile.updated_at,
                        bloodType: profile.blood_type,
                        allergies: profile.allergies,
                        medicalConditions: profile.medical_conditions,
                        emergencyContact: profile.emergency_contact
                    };
                    
                    // Relajamos la condición: mostramos datos si existen, aunque onboarding_completed sea false
                    const hasData = profile.birth_date || profile.age || profile.gender || profile.weight;
                    
                    if (profile.onboarding_completed || hasData) {
                    setProfileData(profileDataFromCloud);
                    // Actualizar caché local
                    await AsyncStorage.setItem('userProfile', JSON.stringify(profileDataFromCloud));
                    }
                }
            } catch (remoteErr) {
                console.log("No se pudo cargar perfil remoto", remoteErr);
            }
        } // Fin if curlyUser

        // Fallback de nombre si no vino del perfil remoto
        if (currentUser) {
          setDisplayName(
            currentUser?.user_metadata?.username ||
            currentUser?.user_metadata?.full_name ||
            currentUser?.email?.split('@')?.[0] ||
            'Usuario'
          );
        }

        // 2. Si no hubo datos remotos (offline o sin user remoto), usar local
        // Esto permite ver datos cacheados incluso si falló todo el auth
        const userProfileJSON = await AsyncStorage.getItem('userProfile');
        if (userProfileJSON && !profileData) { // Solo si no hemos cargado ya el remoto
            const profileInfo = JSON.parse(userProfileJSON);
            // Restaurar fecha si viene como string
            if (profileInfo.fechaNacimiento && typeof profileInfo.fechaNacimiento === 'string') {
                profileInfo.fechaNacimiento = new Date(profileInfo.fechaNacimiento);
            }
            setProfileData(profileInfo);
        }

        const savedImage = await AsyncStorage.getItem('profileImage');
        if (savedImage && !profileImage) {
            setProfileImage(savedImage);
        }

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadUserInfo();
  }, []);

  const handleLogout = async () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      setLoggingOut(true);
      setShowLogoutModal(false);
      await authService.signOut();
      
      // Limpieza profunda de sesión local
      const keysToRemove = [
        'awaitingConfirmation',
        'userInfoCompleted',
        'userProfile',
        'profileImage',
        'userName',
        'needsUserInfo',
        'welcomeMessage'
      ];
      await AsyncStorage.multiRemove(keysToRemove);

      // Navegar al login
      router.replace('/login');
    } catch (e) {
      setLoggingOut(false);
      Alert.alert(
        'Error',
        'No se pudo cerrar sesión. Por favor, intenta de nuevo.',
        [{ text: 'Aceptar' }]
      );
      console.error('Logout error:', e);
    }
  };

  const openEdit = () => {
    const next = {
      name: displayName || '',
      age: profileData?.edad?.toString?.() || '',
      gender: profileData?.genero || '',
      weight: profileData?.peso?.toString?.() || '',
      bloodType: profileData?.bloodType || '',
      allergies: profileData?.allergies || '',
      medicalConditions: profileData?.medicalConditions || '',
      emergencyContact: profileData?.emergencyContact || '',
    };
    setEditDraft(next);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
  };

  const saveEdit = async () => {
    try {
      setSaving(true);

      const ageNum = editDraft.age ? parseInt(editDraft.age, 10) : null;
      const weightNum = editDraft.weight ? parseFloat(editDraft.weight) : null;

      const updates = {
        name: (editDraft.name || '').trim() || null,
        age: Number.isFinite(ageNum) ? ageNum : null,
        gender: (editDraft.gender || '').trim() || null,
        weight: Number.isFinite(weightNum) ? weightNum : null,
        blood_type: (editDraft.bloodType || '').trim() || null,
        allergies: (editDraft.allergies || '').trim() || null,
        medical_conditions: (editDraft.medicalConditions || '').trim() || null,
        emergency_contact: (editDraft.emergencyContact || '').trim() || null,
      };

      const { error } = await authService.upsertProfile(updates);
      if (error) throw error;

      const nextProfileData = {
        ...(profileData || {}),
        edad: updates.age !== null ? String(updates.age) : '',
        genero: updates.gender || '',
        peso: updates.weight !== null ? String(updates.weight) : '',
        bloodType: updates.blood_type || '',
        allergies: updates.allergies || '',
        medicalConditions: updates.medical_conditions || '',
        emergencyContact: updates.emergency_contact || '',
        completedAt: new Date().toISOString(),
      };

      setProfileData(nextProfileData);
      await AsyncStorage.setItem('userProfile', JSON.stringify({
        ...nextProfileData,
        fechaNacimiento: nextProfileData.fechaNacimiento ? nextProfileData.fechaNacimiento.toISOString() : null,
      }));

      if (updates.name) setDisplayName(updates.name);
      setEditMode(false);
      Alert.alert('Éxito', 'Perfil actualizado correctamente.');
    } catch (e) {
      console.error('Error guardando perfil:', e);
      Alert.alert('Error', 'No se pudo guardar el perfil. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const bgColors = isDark 
    ? [theme.background, '#1a1a2e', '#16213e'] 
    : ['#667eea', '#764ba2', '#f093fb'];

  if (loading) {
    return (
      <LinearGradient
        colors={bgColors}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={bgColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 24 + insets.bottom }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animatable.View
            animation="slideInDown"
            duration={800}
            style={styles.header}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mi Perfil</Text>
            <View style={styles.backButtonPlaceholder} />
          </Animatable.View>

          {/* Profile Card */}
          <Animatable.View
            animation="slideInUp"
            duration={800}
            delay={200}
            style={[styles.profileCard, isDark && { backgroundColor: theme.card, shadowColor: '#000' }]}
          >
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={48} color="#667eea" />
                )}
              </View>
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: '#667eea',
                  borderRadius: 16,
                  width: 32,
                  height: 32,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: '#fff',
                }}
                activeOpacity={0.8}
                disabled={uploadingPhoto}
                onPress={async () => {
                  try {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') {
                      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto.');
                      return;
                    }
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: true,
                      aspect: [1, 1],
                      quality: 0.7,
                    });
                    if (result.canceled || !result.assets?.[0]?.uri) return;
                    setUploadingPhoto(true);
                    const { url, error } = await authService.uploadAvatar(result.assets[0].uri);
                    if (error) throw error;
                    await authService.upsertProfile({ avatar_url: url });
                    setProfileImage(url);
                    await AsyncStorage.setItem('profileImage', url);
                    Alert.alert('Éxito', 'Foto de perfil actualizada.');
                  } catch (e) {
                    console.error('Error al subir foto:', e);
                    Alert.alert('Error', 'No se pudo actualizar la foto. Intenta de nuevo.');
                  } finally {
                    setUploadingPhoto(false);
                  }
                }}
              >
                {uploadingPhoto
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="camera" size={16} color="#fff" />}
              </TouchableOpacity>
            </View>

            <Text style={[styles.userName, isDark && { color: theme.text }]}>{displayName}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>

            {/* Info Section */}
            <View style={[styles.infoSection, isDark && { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
              <View style={styles.infoItem}>
                <View style={iconContainerStyle}>
                  <Ionicons name="mail" size={20} color="#667eea" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={infoLabelStyle}>Correo Electrónico</Text>
                  <Text style={infoValueStyle}>{user?.email}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={iconContainerStyle}>
                  <Ionicons name="calendar" size={20} color="#764ba2" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={infoLabelStyle}>Cuenta creada</Text>
                  <Text style={infoValueStyle}>
                    {new Date(user?.created_at).toLocaleDateString('es-ES')}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={iconContainerStyle}>
                  <Ionicons name="shield-checkmark" size={20} color="#f093fb" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={infoLabelStyle}>Verificación</Text>
                  <Text style={infoValueStyle}>
                    {user?.email_confirmed_at ? 'Verificado' : 'Pendiente'}
                  </Text>
                </View>
              </View>

              {/* Información adicional del perfil */}
              {profileData && (
                <>
                  {(profileData.birthDate || profileData.fechaNacimiento) && (
                    <View style={styles.infoItem}>
                      <View style={iconContainerStyle}>
                        <Ionicons name="cake" size={20} color="#667eea" />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={infoLabelStyle}>Fecha de Nacimiento</Text>
                        <Text style={infoValueStyle}>
                          {profileData.birthDate || new Date(profileData.fechaNacimiento).toLocaleDateString('es-ES', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </Text>
                      </View>
                    </View>
                  )}

                  {profileData.edad && (
                    <View style={styles.infoItem}>
                      <View style={iconContainerStyle}>
                        <MaterialCommunityIcons name="numeric" size={20} color="#4ECDC4" />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={infoLabelStyle}>Edad</Text>
                        <Text style={infoValueStyle}>{profileData.edad} años</Text>
                      </View>
                    </View>
                  )}

                  {(profileData.gender || profileData.genero) && (
                    <View style={styles.infoItem}>
                      <View style={iconContainerStyle}>
                        <MaterialCommunityIcons name="gender-male-female" size={20} color="#764ba2" />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={infoLabelStyle}>Género</Text>
                        <Text style={infoValueStyle}>
                          {(profileData.gender === 'male' || profileData.genero === 'male') 
                            ? 'Masculino' 
                            : (profileData.gender === 'female' || profileData.genero === 'female') 
                              ? 'Femenino' 
                              : profileData.gender || profileData.genero}
                        </Text>
                      </View>
                    </View>
                  )}

                  {profileData.peso && (
                    <View style={styles.infoItem}>
                      <View style={iconContainerStyle}>
                        <MaterialCommunityIcons name="weight-kilogram" size={20} color="#F38181" />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={infoLabelStyle}>Peso</Text>
                        <Text style={infoValueStyle}>{profileData.peso} kg</Text>
                      </View>
                    </View>
                  )}

                  {profileData.bloodType && (
                    <View style={styles.infoItem}>
                      <View style={iconContainerStyle}>
                        <Ionicons name="water" size={20} color="#f093fb" />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={infoLabelStyle}>Tipo de Sangre</Text>
                        <Text style={infoValueStyle}>{profileData.bloodType}</Text>
                      </View>
                    </View>
                  )}

                  {profileData.allergies && (
                    <View style={styles.infoItem}>
                      <View style={iconContainerStyle}>
                        <MaterialCommunityIcons name="alert-circle" size={20} color="#ff6b6b" />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={infoLabelStyle}>Alergias</Text>
                        <Text style={infoValueStyle}>{profileData.allergies}</Text>
                      </View>
                    </View>
                  )}

                  {profileData.medicalConditions && (
                    <View style={styles.infoItem}>
                      <View style={iconContainerStyle}>
                        <MaterialCommunityIcons name="medical-bag" size={20} color="#4facfe" />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={infoLabelStyle}>Condiciones Médicas</Text>
                        <Text style={infoValueStyle}>{profileData.medicalConditions}</Text>
                      </View>
                    </View>
                  )}

                  {profileData.emergencyContact && (
                    <View style={styles.infoItem}>
                      <View style={iconContainerStyle}>
                        <Ionicons name="call" size={20} color="#f093fb" />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={infoLabelStyle}>Contacto de Emergencia</Text>
                        <Text style={infoValueStyle}>{profileData.emergencyContact}</Text>
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Theme Toggle */}
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(102, 126, 234, 0.05)', 
              borderRadius: 16, 
              padding: 16, 
              marginBottom: 20,
              marginTop: 4,
              width: '100%' 
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.infoIconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }]}>
                  <Ionicons name={isDark ? "moon" : "sunny"} size={20} color={isDark ? "#f093fb" : "#F38181"} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '600', color: isDark ? '#EEE' : '#333' }}>Modo Oscuro</Text>
              </View>
              <Switch
                trackColor={{ false: "#767577", true: "#667eea" }}
                thumbColor={isDark ? "#fff" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={() => setMode(isDark ? 'light' : 'dark')}
                value={isDark}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.editButton}
                activeOpacity={0.8}
                onPress={openEdit}
              >
                <Ionicons name="pencil" size={18} color="#fff" />
                <Text style={styles.editButtonText}>Editar Perfil</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.logoutButtonProfile, loggingOut && styles.logoutButtonDisabled]}
                activeOpacity={0.8}
                onPress={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="log-out" size={18} color="#fff" />
                    <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animatable.View>
        </ScrollView>
        
        {/* Modal de Edición de Perfil */}
        <Modal
            visible={editMode}
            transparent={true}
            animationType="slide"
            onRequestClose={cancelEdit}
        >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: 'center' }}>
                    <Animatable.View 
                        animation="zoomIn" 
                        duration={300} 
                        style={{ 
                            backgroundColor: isDark ? theme.card : '#fff', 
                            borderRadius: 24, 
                            padding: 24, 
                            maxHeight: '85%',
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 10 },
                            shadowOpacity: 0.3,
                            shadowRadius: 20,
                            elevation: 10
                        }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontSize: 22, fontWeight: '800', color: isDark ? theme.text : '#333' }}>Editar Perfil</Text>
                            <TouchableOpacity onPress={cancelEdit}>
                                <Ionicons name="close-circle" size={30} color={isDark ? theme.textSecondary : "#ccc"} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#667eea', marginBottom: 8, marginTop: 4 }}>Nombre</Text>
                            <TextInput
                                value={editDraft.name}
                                onChangeText={(t) => setEditDraft((p) => ({ ...p, name: t }))}
                                placeholder="Tu nombre"
                                placeholderTextColor={isDark ? "#94a3b8" : "#999"}
                                style={{ borderWidth: 1, borderColor: isDark ? '#475569' : '#e1e4e8', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, color: isDark ? '#fff' : '#333', fontSize: 16, backgroundColor: isDark ? '#334155' : '#f9f9f9' }}
                            />

                            <View style={{ flexDirection: 'row', gap: 16 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#667eea', marginBottom: 8 }}>Edad</Text>
                                    <TextInput
                                        value={editDraft.age}
                                        onChangeText={(t) => setEditDraft((p) => ({ ...p, age: t.replace(/[^0-9]/g, '') }))}
                                        keyboardType="numeric"
                                        placeholder="Ej. 25"
                                        placeholderTextColor={isDark ? "#94a3b8" : "#999"}
                                        style={{ borderWidth: 1, borderColor: isDark ? '#475569' : '#e1e4e8', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, color: isDark ? '#fff' : '#333', fontSize: 16, backgroundColor: isDark ? '#334155' : '#f9f9f9' }}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#667eea', marginBottom: 8 }}>Peso (kg)</Text>
                                    <TextInput
                                        value={editDraft.weight}
                                        onChangeText={(t) => setEditDraft((p) => ({ ...p, weight: t.replace(/[^0-9.]/g, '') }))}
                                        keyboardType="numeric"
                                        placeholder="Ej. 70"
                                        placeholderTextColor={isDark ? "#94a3b8" : "#999"}
                                        style={{ borderWidth: 1, borderColor: isDark ? '#475569' : '#e1e4e8', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, color: isDark ? '#fff' : '#333', fontSize: 16, backgroundColor: isDark ? '#334155' : '#f9f9f9' }}
                                    />
                                </View>
                            </View>

                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#667eea', marginBottom: 8 }}>Género</Text>
                            <TextInput
                                value={editDraft.gender}
                                onChangeText={(t) => setEditDraft((p) => ({ ...p, gender: t }))}
                                placeholder="Ej. Masculino"
                                placeholderTextColor={isDark ? "#94a3b8" : "#999"}
                                style={{ borderWidth: 1, borderColor: isDark ? '#475569' : '#e1e4e8', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, color: isDark ? '#fff' : '#333', fontSize: 16, backgroundColor: isDark ? '#334155' : '#f9f9f9' }}
                            />

                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#667eea', marginBottom: 8 }}>Condiciones médicas</Text>
                            <TextInput
                                value={editDraft.medicalConditions}
                                onChangeText={(t) => setEditDraft((p) => ({ ...p, medicalConditions: t }))}
                                placeholder="Ej. Hipertensión (Opcional)"
                                placeholderTextColor={isDark ? "#94a3b8" : "#999"}
                                style={{ borderWidth: 1, borderColor: isDark ? '#475569' : '#e1e4e8', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, color: isDark ? '#fff' : '#333', fontSize: 16, backgroundColor: isDark ? '#334155' : '#f9f9f9' }}
                            />
                            
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
                                <TouchableOpacity
                                    style={{ flex: 1, backgroundColor: '#f5576c', paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}
                                    activeOpacity={0.85}
                                    onPress={cancelEdit}
                                >
                                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Cancelar</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    style={{ flex: 1, backgroundColor: '#667eea', paddingVertical: 16, borderRadius: 16, alignItems: 'center', opacity: saving ? 0.7 : 1 }}
                                    activeOpacity={0.85}
                                    disabled={saving}
                                    onPress={saveEdit}
                                >
                                    {saving ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Guardar Cambios</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </Animatable.View>
                </KeyboardAvoidingView>
            </View>
        </Modal>

        {/* Modal de confirmación de logout */}
        <Modal
          visible={showLogoutModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowLogoutModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Animatable.View
              animation="zoomIn"
              duration={300}
              style={[styles.modalContent, isDark && { backgroundColor: theme.card }]}
            >
              <View style={styles.modalIconContainer}>
                <View style={styles.modalIconCircle}>
                  <Ionicons name="log-out" size={32} color="#f093fb" />
                </View>
              </View>
              
              <Text style={[styles.modalTitle, isDark && { color: theme.text }]}>¿Cerrar Sesión?</Text>
              <Text style={[styles.modalMessage, isDark && { color: theme.textSecondary }]}>
                ¿Estás seguro de que deseas cerrar tu sesión? Tendrás que volver a iniciar sesión la próxima vez.
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, isDark && { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                  onPress={() => setShowLogoutModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalCancelText, isDark && { color: theme.text }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={confirmLogout}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#f093fb', '#f5576c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalConfirmGradient}
                  >
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.modalConfirmText}>Sí, Cerrar</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animatable.View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}
