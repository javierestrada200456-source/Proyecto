import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

const ALL_DAYS = [
  { full: 'Domingo',   short: 'Dom' },
  { full: 'Lunes',     short: 'Lun' },
  { full: 'Martes',    short: 'Mar' },
  { full: 'Miércoles', short: 'Mié' },
  { full: 'Jueves',    short: 'Jue' },
  { full: 'Viernes',   short: 'Vie' },
  { full: 'Sábado',    short: 'Sáb' },
];

// Limpia nombre del medicamento para mostrar solo nombre principal en sentence case
function cleanMedName(raw) {
  if (!raw || typeof raw !== 'string') return raw || '';
  // Si ya está en formato limpio (no todo mayúsculas), solo sentence case
  const isAllCaps = raw === raw.toUpperCase();
  const hasForm = /TABLETA|CAPSULA|SOLUCION|COMPRIMIDO|SUSPENSION|JARABE/i.test(raw);
  if (!isAllCaps && !hasForm) {
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  // Aplicar lógica de limpieza: quitar concentración y forma farmacéutica
  let texto = raw.replace(/\s+/g, ' ').trim();
  // Quitar concentración
  texto = texto.replace(/(\d+(?:[,.]?\d+)?(?:\s*\/\s*\d+(?:[,.]?\d+)?)?)\s*(?:mg|mcg|ml|g(?!\w)|ui|iu|meq|meg|%)/gi, '');
  // Quitar formas farmacéuticas
  const formasRe = /\b(TABLETA|CÁPSULA|CAPSULA|COMPRIMIDO|SOLUCIÓN|SOLUCION|SUSPENSIÓN|SUSPENSION|PARCHE|INYECTABLE|INYECCIÓN|INYECCION|JARABE|POLVO|AMPOLLA|AEROSOL|ÓVULO|OVULO|SUPOSITORIO|CREMA|GEL|POMADA|EMULSIÓN|EMULSION|GOTAS|SPRAY|INHALADOR|ELIXIR|RECUBIERTA|BLANDA|DURA|ORAL|PROLONGADA|SUBLINGUAL|MASTICABLE|DISPERSABLE|EFERVESCENTE|RECONSTITUIR)\b/gi;
  texto = texto.replace(formasRe, '').replace(/\s+/g, ' ').replace(/[/\-.]+$/, '').trim();
  if (!texto) return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

const ReminderCard = ({ alarm, lastTaken, onDelete }) => {
  const { isDark } = useTheme();
  const [timeSince, setTimeSince] = useState('');

  useEffect(() => {
    updateTimeSince();
    const interval = setInterval(updateTimeSince, 60000);
    return () => clearInterval(interval);
  }, [lastTaken]);

  const updateTimeSince = () => {
    if (!lastTaken) {
      setTimeSince('Sin registro de toma');
      return;
    }
    const cleanDiff = Math.max(0, Date.now() - lastTaken);
    const hours = Math.floor(cleanDiff / 3600000);
    const minutes = Math.floor((cleanDiff % 3600000) / 60000);
    if (hours === 0 && minutes === 0) {
      setTimeSince('Recién tomado');
    } else {
      setTimeSince(`Hace ${hours > 0 ? `${hours}h ` : ''}${minutes}min`);
    }
  };

  // Construir lista de dosis
  const times = Array.isArray(alarm.times) && alarm.times.length > 0
    ? alarm.times
    : alarm.hour !== undefined
      ? [{ hour: alarm.hour, minute: alarm.minute || 0 }]
      : [];

  const activeDays = new Set(Array.isArray(alarm.days) ? alarm.days : []);
  const selectedDays = ALL_DAYS.filter((d) => activeDays.has(d.full));
  const strength = alarm.medStrength
    ? `${alarm.medStrength} ${(alarm.medStrengthUnit || 'mg').toLowerCase()}`
    : null;

  return (
    <View style={[s.wrapper, isDark && s.wrapperDark]}>
      {/* Barra de color lateral */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={s.accentBar}
      />

      <View style={s.body}>
        {/* HEADER: nombre + botón eliminar */}
        <View style={s.headerRow}>
          <View style={s.medIconWrap}>
            <LinearGradient colors={['#667eea', '#764ba2']} style={s.medIcon}>
              <Ionicons name="medical" size={18} color="#fff" />
            </LinearGradient>
          </View>
          <View style={s.nameWrap}>
            <Text style={[s.medName, isDark && s.textWhite]} numberOfLines={1}>
              {cleanMedName(alarm.medName) || 'Medicamento'}
            </Text>
            {strength && (
              <Text style={s.strengthBadgeText}>{strength}</Text>
            )}
          </View>
          <TouchableOpacity style={s.deleteBtn} onPress={() => onDelete(alarm.id)}>
            <Ionicons name="trash-outline" size={18} color="#ff416c" />
          </TouchableOpacity>
        </View>

        {/* DIVISOR */}
        <View style={[s.divider, isDark && s.dividerDark]} />

        {/* DOSIS */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, isDark && s.sectionLabelDark]}>
            <Ionicons name="time-outline" size={13} />  Dosis
          </Text>
          <View style={s.dosesGrid}>
            {times.map((t, i) => {
              const h24 = Number(t.hour);
              const ampm = h24 < 12 ? 'AM' : 'PM';
              const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
              return (
                <View key={i} style={[s.doseChip, isDark && s.doseChipDark]}>
                  <Text style={s.doseNumber}>{i + 1}</Text>
                  <Text style={[s.doseTime, isDark && s.textWhite]}>
                    {String(h12).padStart(2, '0')}:{String(t.minute).padStart(2, '0')}
                  </Text>
                  <Text style={s.dosePeriod}>{ampm}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* DÍAS */}
        {selectedDays.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionLabel, isDark && s.sectionLabelDark]}>
              <Ionicons name="calendar-outline" size={13} />  Días
            </Text>
            <View style={s.daysRow}>
              {selectedDays.map((d) => (
                <View key={d.full} style={[s.dayBadge, s.dayBadgeActive]}>
                  <Text style={[s.dayText, s.dayTextActive]}>{d.short}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* FOOTER: tiempo desde última toma */}
        <View style={[s.footer, isDark && s.footerDark]}>
          <Ionicons
            name="checkmark-circle-outline"
            size={14}
            color={lastTaken ? '#4ade80' : '#94a3b8'}
          />
          <Text style={[s.footerText, lastTaken && s.footerTextTaken]}>
            {timeSince}
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  wrapperDark: {
    backgroundColor: '#1e293b',
    shadowColor: '#000',
  },
  accentBar: {
    width: 5,
  },
  body: {
    flex: 1,
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  medIconWrap: {
    marginRight: 10,
  },
  medIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameWrap: {
    flex: 1,
  },
  medName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: 0.2,
  },
  strengthBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
    marginTop: 2,
  },
  textWhite: {
    color: '#f1f5f9',
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,65,108,0.08)',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 10,
  },
  dividerDark: {
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  section: {
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  sectionLabelDark: {
    color: '#64748b',
  },
  dosesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  doseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  doseChipDark: {
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  doseNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: '#667eea',
    backgroundColor: 'rgba(102,126,234,0.15)',
    width: 18,
    height: 18,
    borderRadius: 9,
    textAlign: 'center',
    lineHeight: 18,
  },
  doseTime: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.5,
  },
  dosePeriod: {
    fontSize: 11,
    fontWeight: '700',
    color: '#667eea',
    letterSpacing: 0.5,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
  },
  dayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayBadgeActive: {
    backgroundColor: 'rgba(102,126,234,0.15)',
    borderColor: '#667eea',
  },
  dayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  dayTextActive: {
    color: '#667eea',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerDark: {
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  footerTextTaken: {
    color: '#4ade80',
  },
});


export default React.memo(ReminderCard);

