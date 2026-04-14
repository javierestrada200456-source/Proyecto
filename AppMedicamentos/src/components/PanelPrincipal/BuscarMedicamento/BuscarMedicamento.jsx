import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { useTheme } from '../../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

// ─── Base de datos local de medicamentos de ejemplo ──────────────────────────
const MEDICAMENTOS = [
  {
    id: '1',
    nombre: 'Metformina',
    principioActivo: 'Clorhidrato de metformina',
    presentacion: 'Tableta recubierta · 850 mg',
    concentracion: '850 mg',
    forma: 'Tableta recubierta',
    dosisMinima: '500 mg / día',
    dosisMaxima: '2550 mg / día',
    via: 'Oral',
    categoria: 'Antidiabético',
    efectos: [
      'Náuseas y vómitos al inicio',
      'Diarrea o malestar estomacal',
      'Sabor metálico en la boca',
      'Pérdida de apetito',
      'Hipoglucemia (con otros antidiabéticos)',
    ],
    icono: 'medical',
    gradiente: ['#667eea', '#764ba2'],
    emoji: '💊',
  },
  {
    id: '2',
    nombre: 'Losartán',
    principioActivo: 'Losartán potásico',
    presentacion: 'Tableta recubierta · 50 mg',
    concentracion: '50 mg',
    forma: 'Tableta recubierta',
    dosisMinima: '25 mg / día',
    dosisMaxima: '100 mg / día',
    via: 'Oral',
    categoria: 'Antihipertensivo',
    efectos: [
      'Mareos o sensación de desmayo',
      'Dolor de espalda',
      'Tos seca (poco frecuente)',
      'Fatiga y debilidad',
      'Elevación de potasio en sangre',
    ],
    icono: 'heart',
    gradiente: ['#f5576c', '#f093fb'],
    emoji: '❤️',
  },
  {
    id: '3',
    nombre: 'Atorvastatina',
    principioActivo: 'Atorvastatina cálcica',
    presentacion: 'Tableta recubierta · 20 mg',
    concentracion: '20 mg',
    forma: 'Tableta',
    dosisMinima: '10 mg / día',
    dosisMaxima: '80 mg / día',
    via: 'Oral',
    categoria: 'Hipolipemiante',
    efectos: [
      'Dolores musculares (mialgia)',
      'Elevación de enzimas hepáticas',
      'Dolor de cabeza',
      'Molestias gastrointestinales',
      'Insomnio ocasional',
    ],
    icono: 'fitness',
    gradiente: ['#4facfe', '#00f2fe'],
    emoji: '🔵',
  },
  {
    id: '4',
    nombre: 'Omeprazol',
    principioActivo: 'Omeprazol',
    presentacion: 'Cápsula · 20 mg',
    concentracion: '20 mg',
    forma: 'Cápsula de liberación retardada',
    dosisMinima: '10 mg / día',
    dosisMaxima: '40 mg / día',
    via: 'Oral',
    categoria: 'Inhibidor de bomba de protones',
    efectos: [
      'Dolor de cabeza',
      'Diarrea o estreñimiento',
      'Flatulencia y náuseas',
      'Deficiencia de magnesio (uso prolongado)',
      'Infecciones gastrointestinales',
    ],
    icono: 'bandage',
    gradiente: ['#43e97b', '#38f9d7'],
    emoji: '🟢',
  },
  {
    id: '5',
    nombre: 'Levotiroxina',
    principioActivo: 'Levotiroxina sódica',
    presentacion: 'Tableta · 100 mcg',
    concentracion: '100 mcg',
    forma: 'Tableta',
    dosisMinima: '25 mcg / día',
    dosisMaxima: '200 mcg / día',
    via: 'Oral',
    categoria: 'Hormona tiroidea',
    efectos: [
      'Palpitaciones cardíacas',
      'Nerviosismo o ansiedad',
      'Pérdida de peso no deseada',
      'Insomnio y temblores',
      'Sudoración excesiva',
    ],
    icono: 'pulse',
    gradiente: ['#fa709a', '#fee140'],
    emoji: '🟡',
  },
];

// ─── Componente de tarjeta de resultado ──────────────────────────────────────
function MedCard({ med, onPress, isDark }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={[styles.card, isDark && styles.cardDark]}>
          {/* Barra lateral con gradiente */}
          <LinearGradient
            colors={med.gradiente}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.cardAccent}
          />

          {/* Icono */}
          <LinearGradient
            colors={med.gradiente}
            style={styles.cardIconWrap}
          >
            <Ionicons name={med.icono} size={22} color="#fff" />
          </LinearGradient>

          {/* Info principal */}
          <View style={styles.cardContent}>
            <Text style={[styles.cardName, isDark && styles.textWhite]}>{med.nombre}</Text>
            <Text style={[styles.cardSub, isDark && styles.textMuted]}>{med.principioActivo}</Text>
            <View style={styles.cardBadgeRow}>
              <View style={[styles.badge, { backgroundColor: med.gradiente[0] + '22' }]}>
                <Text style={[styles.badgeText, { color: med.gradiente[0] }]}>{med.forma}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                <Text style={[styles.badgeText, { color: isDark ? '#94a3b8' : '#64748b' }]}>{med.concentracion}</Text>
              </View>
            </View>
          </View>

          {/* Flecha */}
          <Ionicons name="chevron-forward" size={20} color={isDark ? '#475569' : '#cbd5e0'} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Sección de detalle ───────────────────────────────────────────────────────
function DetailRow({ icon, label, value, isDark, accentColor }) {
  return (
    <View style={[styles.detailRow, isDark && styles.detailRowDark]}>
      <View style={[styles.detailIconWrap, { backgroundColor: accentColor + '22' }]}>
        <Ionicons name={icon} size={16} color={accentColor} />
      </View>
      <View style={styles.detailText}>
        <Text style={[styles.detailLabel, isDark && styles.textMuted]}>{label}</Text>
        <Text style={[styles.detailValue, isDark && styles.textWhite]}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Modal de detalle del medicamento ────────────────────────────────────────
function MedDetailModal({ med, visible, onClose, isDark }) {
  if (!med) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <LinearGradient
        colors={isDark ? ['#0f0c29', '#1a1a2e', '#16213e'] : ['#f8faff', '#eef2ff', '#f0f4ff']}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

          {/* Header con gradiente del medicamento */}
          <LinearGradient
            colors={med.gradiente}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.detailHeader}
          >
            <TouchableOpacity onPress={onClose} style={styles.detailBackBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.detailHeaderContent}>
              {/* Imagen / Icono del medicamento */}
              <View style={styles.detailImgContainer}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.15)']}
                  style={styles.detailImgCircle}
                >
                  <Text style={styles.detailEmoji}>{med.emoji}</Text>
                  <Ionicons name={med.icono} size={36} color="rgba(255,255,255,0.9)" style={{ position: 'absolute', bottom: 8, right: 8, opacity: 0.5 }} />
                </LinearGradient>
              </View>
              <Text style={styles.detailTitle}>{med.nombre}</Text>
              <Text style={styles.detailPrincipio}>{med.principioActivo}</Text>
              <View style={styles.detailCatBadge}>
                <Ionicons name="ribbon" size={12} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.detailCatText}>{med.categoria}</Text>
              </View>
            </View>
          </LinearGradient>

          <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>

            {/* Tarjeta: Presentación */}
            <Animatable.View animation="fadeInUp" delay={50} style={[styles.infoCard, isDark && styles.infoCardDark]}>
              <View style={styles.infoCardHeader}>
                <LinearGradient colors={med.gradiente} style={styles.infoCardIconBg}>
                  <Ionicons name="cube-outline" size={16} color="#fff" />
                </LinearGradient>
                <Text style={[styles.infoCardTitle, isDark && styles.textWhite]}>Presentación</Text>
              </View>
              <Text style={[styles.infoCardValue, isDark && { color: '#e2e8f0' }]}>{med.presentacion}</Text>
              <Text style={[styles.infoCardSub, isDark && styles.textMuted]}>Vía de administración: {med.via}</Text>
            </Animatable.View>

            {/* Tarjeta: Dosis */}
            <Animatable.View animation="fadeInUp" delay={100} style={[styles.infoCard, isDark && styles.infoCardDark]}>
              <View style={styles.infoCardHeader}>
                <LinearGradient colors={med.gradiente} style={styles.infoCardIconBg}>
                  <Ionicons name="analytics-outline" size={16} color="#fff" />
                </LinearGradient>
                <Text style={[styles.infoCardTitle, isDark && styles.textWhite]}>Rango de dosis</Text>
              </View>
              <View style={styles.dosisRow}>
                <View style={[styles.dosisBox, { borderColor: med.gradiente[0] + '55', backgroundColor: med.gradiente[0] + '11' }]}>
                  <Ionicons name="arrow-down-circle-outline" size={20} color={med.gradiente[0]} />
                  <Text style={[styles.dosisBoxLabel, { color: med.gradiente[0] }]}>Mínima</Text>
                  <Text style={[styles.dosisBoxValue, isDark && styles.textWhite]}>{med.dosisMinima}</Text>
                </View>
                <View style={[styles.dosisDivider, { backgroundColor: med.gradiente[0] + '33' }]} />
                <View style={[styles.dosisBox, { borderColor: med.gradiente[1] + '55', backgroundColor: med.gradiente[1] + '11' }]}>
                  <Ionicons name="arrow-up-circle-outline" size={20} color={med.gradiente[1]} />
                  <Text style={[styles.dosisBoxLabel, { color: med.gradiente[1] }]}>Máxima</Text>
                  <Text style={[styles.dosisBoxValue, isDark && styles.textWhite]}>{med.dosisMaxima}</Text>
                </View>
              </View>
            </Animatable.View>

            {/* Tarjeta: Efectos Secundarios */}
            <Animatable.View animation="fadeInUp" delay={150} style={[styles.infoCard, isDark && styles.infoCardDark]}>
              <View style={styles.infoCardHeader}>
                <LinearGradient colors={['#f5576c', '#f093fb']} style={styles.infoCardIconBg}>
                  <Ionicons name="warning-outline" size={16} color="#fff" />
                </LinearGradient>
                <Text style={[styles.infoCardTitle, isDark && styles.textWhite]}>Efectos Secundarios</Text>
              </View>
              {med.efectos.map((efecto, i) => (
                <View key={i} style={styles.efectoRow}>
                  <View style={[styles.efectoBullet, { backgroundColor: med.gradiente[0] }]} />
                  <Text style={[styles.efectoText, isDark && { color: '#cbd5e1' }]}>{efecto}</Text>
                </View>
              ))}
            </Animatable.View>

            {/* Aviso legal */}
            <Animatable.View animation="fadeInUp" delay={200} style={[styles.avisoCard, isDark && styles.avisoCardDark]}>
              <Ionicons name="information-circle-outline" size={18} color={isDark ? '#94a3b8' : '#667eea'} style={{ marginRight: 8 }} />
              <Text style={[styles.avisoText, isDark && { color: '#94a3b8' }]}>
                Esta información es de referencia. Consulta siempre a tu médico antes de iniciar o cambiar un tratamiento.
              </Text>
            </Animatable.View>

          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function BuscarMedicamento() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selectedMed, setSelectedMed] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const filteredMeds = query.trim().length === 0
    ? MEDICAMENTOS
    : MEDICAMENTOS.filter((m) =>
        m.nombre.toLowerCase().includes(query.toLowerCase()) ||
        m.principioActivo.toLowerCase().includes(query.toLowerCase()) ||
        m.categoria.toLowerCase().includes(query.toLowerCase())
      );

  const openDetail = (med) => {
    setSelectedMed(med);
    setModalVisible(true);
  };

  return (
    <LinearGradient
      colors={isDark ? ['#0f0c29', '#1a1a2e', '#16213e'] : ['#f8faff', '#eef2ff', '#f5f7ff']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1, paddingTop: insets.top > 0 ? 0 : 8 }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* ── Header ── */}
        <View style={styles.header}>
          <Animatable.View animation="fadeInDown" duration={500}>
            <Text style={[styles.headerTitle, isDark && styles.textWhite]}>Medicamentos</Text>
            <Text style={[styles.headerSub, isDark && styles.textMuted]}>Consulta información de referencia</Text>
          </Animatable.View>
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.headerIconBg}>
            <Ionicons name="search-circle" size={28} color="#fff" />
          </LinearGradient>
        </View>

        {/* ── Buscador ── */}
        <Animatable.View animation="fadeInDown" delay={100} style={styles.searchWrap}>
          <LinearGradient
            colors={isDark ? ['#1e293b', '#0f172a'] : ['#fff', '#f8faff']}
            style={[styles.searchBox, isDark && styles.searchBoxDark]}
          >
            <Ionicons name="search" size={20} color="#667eea" style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.searchInput, isDark && styles.textWhite]}
              placeholder="Buscar medicamento..."
              placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </LinearGradient>
        </Animatable.View>

        {/* ── Contador ── */}
        <Animatable.View animation="fadeIn" delay={150} style={styles.countRow}>
          <View style={[styles.countBadge, isDark && styles.countBadgeDark]}>
            <Ionicons name="medical" size={13} color="#667eea" style={{ marginRight: 4 }} />
            <Text style={[styles.countText, isDark && { color: '#a5b4fc' }]}>
              {filteredMeds.length} medicamento{filteredMeds.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </Animatable.View>

        {/* ── Lista ── */}
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {filteredMeds.length === 0 ? (
            <Animatable.View animation="fadeIn" style={styles.emptyWrap}>
              <LinearGradient colors={['#667eea22', '#764ba222']} style={styles.emptyIconBg}>
                <Ionicons name="search-outline" size={40} color="#667eea" />
              </LinearGradient>
              <Text style={[styles.emptyTitle, isDark && styles.textWhite]}>Sin resultados</Text>
              <Text style={[styles.emptySub, isDark && styles.textMuted]}>
                No encontramos "{query}" en nuestra base de datos
              </Text>
            </Animatable.View>
          ) : (
            filteredMeds.map((med, i) => (
              <Animatable.View key={med.id} animation="fadeInUp" delay={i * 60} duration={400}>
                <MedCard med={med} onPress={() => openDetail(med)} isDark={isDark} />
              </Animatable.View>
            ))
          )}
        </ScrollView>

        {/* ── Modal de detalle ── */}
        <MedDetailModal
          med={selectedMed}
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          isDark={isDark}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 6,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  headerIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchWrap: {
    paddingHorizontal: 22,
    marginTop: 10,
    marginBottom: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  searchBoxDark: {
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },

  // Count
  countRow: {
    paddingHorizontal: 22,
    marginTop: 8,
    marginBottom: 4,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countBadgeDark: {
    backgroundColor: 'rgba(99,102,241,0.15)',
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
  },

  // List
  list: {
    paddingHorizontal: 22,
    paddingTop: 8,
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 12,
    paddingVertical: 16,
    paddingRight: 16,
    paddingLeft: 8,
    elevation: 3,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 4,
    marginRight: 12,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  cardBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  emptyIconBg: {
    width: 90,
    height: 90,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Detail Header
  detailHeader: {
    paddingTop: 14,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  detailBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  detailHeaderContent: {
    alignItems: 'center',
  },
  detailImgContainer: {
    marginBottom: 14,
  },
  detailImgCircle: {
    width: 110,
    height: 110,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  detailEmoji: {
    fontSize: 52,
  },
  detailTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  detailPrincipio: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    marginBottom: 10,
    textAlign: 'center',
  },
  detailCatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  detailCatText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },

  // Detail scroll
  detailScroll: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 40,
  },

  // Info cards
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  infoCardDark: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  infoCardIconBg: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  infoCardValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  infoCardSub: {
    fontSize: 12,
    color: '#64748b',
  },

  // Dosis boxes
  dosisRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  dosisBox: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  dosisDivider: {
    width: 1,
    marginHorizontal: 10,
  },
  dosisBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dosisBoxValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
  },

  // Efectos
  efectoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  efectoBullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 10,
    marginTop: 5,
  },
  efectoText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },

  // Detail row (general)
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailRowDark: {},
  detailIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailText: { flex: 1 },
  detailLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 1,
  },

  // Aviso
  avisoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  avisoCardDark: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
  },
  avisoText: {
    flex: 1,
    fontSize: 12,
    color: '#4338ca',
    lineHeight: 18,
  },

  // Generic
  textWhite: { color: '#f1f5f9' },
  textMuted: { color: '#64748b' },
});
