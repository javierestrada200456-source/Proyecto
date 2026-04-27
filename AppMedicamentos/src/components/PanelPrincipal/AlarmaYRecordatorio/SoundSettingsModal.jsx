import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Switch, Modal, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSystemNotificationTones } from '../../../services/RingtoneManager';

const APP_TONES = [
  {
    id: 'melody_med',
    label: 'Melodía Medicamento',
    file: require('../../../../assets/sounds/tono_recordatorio.mp3'),
    isApp: true,
  },
];

export default function SoundSettingsModal({ visible, onClose, isDark = false, theme = {} }) {
  const [selectedNotifTone, setSelectedNotifTone] = useState('melody_med');
  const [notifVolume, setNotifVolume] = useState(0.8);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  const [systemNotifTones, setSystemNotifTones] = useState([]);
  const [loadingTones, setLoadingTones] = useState(false);
  const [tonePickerVisible, setTonePickerVisible] = useState(false);
  const [playingTone, setPlayingTone] = useState(null);
  const soundRef = useRef(null);

  useEffect(() => {
    if (visible) {
      loadPrefs();
      if (systemNotifTones.length === 0) {
        setLoadingTones(true);
        getSystemNotificationTones().then((tones) => {
          setSystemNotifTones(tones);
          setLoadingTones(false);
        });
      }
    }
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync().catch(() => {});
    };
  }, [visible]);

  const loadPrefs = async () => {
    try {
      const raw = await AsyncStorage.getItem('@sound_prefs');
      if (raw) {
        const p = JSON.parse(raw);
        if (p.selectedNotifTone) setSelectedNotifTone(p.selectedNotifTone);
        if (p.notifVolume !== undefined) setNotifVolume(p.notifVolume);
        if (p.vibrationEnabled !== undefined) setVibrationEnabled(p.vibrationEnabled);
      }
    } catch (_) {}
  };

  const savePrefs = async () => {
    try {
      const raw = await AsyncStorage.getItem('@sound_prefs');
      const existing = raw ? JSON.parse(raw) : {};
      await AsyncStorage.setItem(
        '@sound_prefs',
        JSON.stringify({ ...existing, selectedNotifTone, notifVolume, vibrationEnabled }),
      );
    } catch (_) {}
    onClose();
  };

  const previewTone = async (tone) => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      if (playingTone === tone.id) { setPlayingTone(null); return; }
      if (!tone.isApp && !tone.uri) { setPlayingTone(null); return; }
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const source = tone.isApp && tone.file ? tone.file : { uri: tone.uri };
      const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true, volume: notifVolume });
      soundRef.current = sound;
      setPlayingTone(tone.id);
      sound.setOnPlaybackStatusUpdate((s) => {
        if (s.didJustFinish) { setPlayingTone(null); sound.unloadAsync(); soundRef.current = null; }
      });
    } catch (_) { setPlayingTone(null); }
  };

  const closeTonePicker = async () => {
    setTonePickerVisible(false);
    if (soundRef.current) {
      try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch (_) {}
      soundRef.current = null;
    }
    setPlayingTone(null);
  };

  const getSelectedToneLabel = () => {
    const all = [...APP_TONES, ...systemNotifTones];
    return all.find((t) => t.id === selectedNotifTone)?.label ?? 'Sin tono';
  };

  return (
    <>
      {/* ─── Modal principal de Sonidos y Tonos ─── */}
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
          <Animatable.View
            animation="slideInUp"
            duration={380}
            style={{
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              maxHeight: '85%',
              paddingBottom: 32,
            }}
          >
            {/* Handle */}
            <View style={{ alignItems: 'center', paddingTop: 12, marginBottom: 4 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? '#334155' : '#cbd5e1' }} />
            </View>

            {/* Header */}
            <LinearGradient
              colors={isDark ? ['#1e293b', '#0f172a'] : ['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ marginHorizontal: 16, borderRadius: 18, padding: 18, marginBottom: 8 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    width: 42, height: 42, borderRadius: 21,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    alignItems: 'center', justifyContent: 'center', marginRight: 12,
                  }}>
                    <Ionicons name="musical-notes" size={22} color="#fff" />
                  </View>
                  <View>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>Sonidos y Tonos</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Notificaciones y vibración</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close-circle" size={30} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>

              {/* ── Tono de notificación ── */}
              <View style={{ marginBottom: 12, marginTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#8b5cf6', marginRight: 8 }} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#94a3b8' : '#64748b', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Notificaciones
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setTonePickerVisible(true)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: isDark ? '#1e293b' : '#fff',
                    borderRadius: 16, padding: 16,
                    borderWidth: 1, borderColor: isDark ? '#1e293b' : '#e2e8f0',
                  }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? '#334155' : '#ede9fe', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Ionicons name="notifications" size={20} color="#8b5cf6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: isDark ? '#f1f5f9' : '#1e293b' }}>
                      {getSelectedToneLabel()}
                    </Text>
                    <Text style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8', marginTop: 2 }}>Toca para cambiar</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={isDark ? '#475569' : '#94a3b8'} />
                </TouchableOpacity>
              </View>

              {/* ── Nivel de Notificación ── */}
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#38bdf8', marginRight: 8 }} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#94a3b8' : '#64748b', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Nivel de Notificación
                  </Text>
                </View>
                <View style={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: 16, padding: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="notifications" size={16} color="#38bdf8" style={{ marginRight: 8 }} />
                      <Text style={{ fontWeight: '700', fontSize: 14, color: isDark ? '#f1f5f9' : '#1e293b' }}>Volumen</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#38bdf8' }}>{Math.round(notifVolume * 100)}%</Text>
                  </View>
                  <Slider
                    style={{ width: '100%', height: 36 }}
                    minimumValue={0}
                    maximumValue={1}
                    value={notifVolume}
                    onValueChange={setNotifVolume}
                    minimumTrackTintColor="#38bdf8"
                    maximumTrackTintColor={isDark ? '#334155' : '#e2e8f0'}
                    thumbTintColor="#38bdf8"
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 10, color: isDark ? '#475569' : '#94a3b8' }}>0%</Text>
                    <Text style={{ fontSize: 10, color: '#38bdf8', fontWeight: '700' }}>Recomendado: 80%+</Text>
                    <Text style={{ fontSize: 10, color: isDark ? '#475569' : '#94a3b8' }}>100%</Text>
                  </View>
                  {notifVolume < 0.6 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: 8, padding: 8 }}>
                      <Ionicons name="warning" size={14} color="#FBBF24" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 11, color: '#FBBF24', fontWeight: '600' }}>Volumen bajo — puedes perder recordatorios</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* ── Vibración en notificaciones ── */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80', marginRight: 8 }} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#94a3b8' : '#64748b', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Vibración en notificaciones
                  </Text>
                </View>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: isDark ? '#1e293b' : '#fff',
                  borderRadius: 16, padding: 16,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: isDark ? '#334155' : '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Ionicons name="phone-portrait" size={20} color="#4ade80" />
                    </View>
                    <View>
                      <Text style={{ fontWeight: '700', fontSize: 14, color: isDark ? '#f1f5f9' : '#1e293b' }}>Vibración en notificaciones</Text>
                      <Text style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8', marginTop: 1 }}>
                        {vibrationEnabled ? 'Activada' : 'Desactivada'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    trackColor={{ false: isDark ? '#334155' : '#e2e8f0', true: '#4ade80' }}
                    thumbColor={vibrationEnabled ? '#fff' : isDark ? '#475569' : '#f4f3f4'}
                    onValueChange={(val) => {
                      setVibrationEnabled(val);
                      if (val) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }}
                    value={vibrationEnabled}
                  />
                </View>
              </View>

              {/* Guardar */}
              <TouchableOpacity onPress={savePrefs} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                >
                  <Ionicons name="save" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Guardar configuración</Text>
                </LinearGradient>
              </TouchableOpacity>

            </ScrollView>
          </Animatable.View>
        </View>
      </Modal>

      {/* ─── Mini-modal Selector de Tono ─── */}
      <Modal visible={tonePickerVisible} animationType="fade" transparent onRequestClose={closeTonePicker}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
          <Animatable.View
            animation="zoomIn"
            duration={250}
            style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderRadius: 24, width: '100%', maxHeight: '75%', overflow: 'hidden' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#1e293b' : '#e2e8f0' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? '#334155' : '#ede9fe', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="notifications" size={18} color="#8b5cf6" />
              </View>
              <Text style={{ fontWeight: '800', fontSize: 16, color: isDark ? '#f1f5f9' : '#1e293b', flex: 1 }}>Tono de notificación</Text>
              <TouchableOpacity onPress={closeTonePicker} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={isDark ? '#64748b' : '#94a3b8'} />
              </TouchableOpacity>
            </View>

            {loadingTones ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={{ marginTop: 12, color: isDark ? '#64748b' : '#94a3b8', fontSize: 13 }}>Cargando tonos...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
                {[...APP_TONES, ...systemNotifTones].map((tone) => {
                  const isSelected = selectedNotifTone === tone.id;
                  const isPlaying = playingTone === tone.id;
                  return (
                    <TouchableOpacity
                      key={tone.id}
                      onPress={() => {
                        setSelectedNotifTone(tone.id);
                        previewTone(tone);
                      }}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row', alignItems: 'center',
                        backgroundColor: isSelected ? (isDark ? '#1e293b' : '#f5f3ff') : 'transparent',
                        borderRadius: 14, padding: 14, marginBottom: 4,
                        borderWidth: isSelected ? 1.5 : 1,
                        borderColor: isSelected ? '#8b5cf6' : isDark ? '#1e293b' : '#e2e8f0',
                      }}
                    >
                      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: isSelected ? '#8b5cf6' : isDark ? '#475569' : '#cbd5e1', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#8b5cf6' }} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: isSelected ? '700' : '500', fontSize: 14, color: isSelected ? (isDark ? '#f1f5f9' : '#1e293b') : (isDark ? '#94a3b8' : '#475569') }}>
                          {tone.label}
                        </Text>
                        {tone.isApp && <Text style={{ fontSize: 10, color: isDark ? '#475569' : '#94a3b8', marginTop: 1 }}>App</Text>}
                      </View>
                      {isPlaying && <ActivityIndicator size="small" color="#8b5cf6" style={{ marginLeft: 8 }} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </Animatable.View>
        </View>
      </Modal>
    </>
  );
}
