import React, { useState, useEffect, useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import WheelPicker from './WheelPicker';
import { useTheme } from '../../../context/ThemeContext';

// Datos estáticos — se crean una sola vez
const HOURS   = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')); // 01 – 12
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));      // 00 – 59

/**
 * TimePickerModal
 *
 * Props:
 *   visible     - boolean
 *   hour        - string '01'-'12'
 *   minute      - string '00'-'59'
 *   period      - 'AM' | 'PM'
 *   onConfirm   - ({ hourText, minuteText, period }) => void
 *   onCancel    - () => void
 *   title       - string (ej: 'Primera dosis')
 */
export default function TimePickerModal({
  visible,
  hour   = '12',
  minute = '00',
  period = 'AM',
  onConfirm,
  onCancel,
  title  = 'Seleccionar hora',
}) {
  const { isDark } = useTheme();

  const [selHour,   setSelHour]   = useState(hour);
  const [selMinute, setSelMinute] = useState(minute);
  const [selPeriod, setSelPeriod] = useState(period);

  // Resetear estado cada vez que el modal se abre con nuevos valores
  useEffect(() => {
    if (visible) {
      setSelHour(String(hour).padStart(2, '0'));
      setSelMinute(String(minute).padStart(2, '0'));
      setSelPeriod(period);
    }
  }, [visible, hour, minute, period]);

  const hourIndex   = useMemo(() => {
    const idx = HOURS.indexOf(String(selHour).padStart(2, '0'));
    return idx >= 0 ? idx : 0;
  }, [selHour]);

  const minuteIndex = useMemo(() => {
    const idx = MINUTES.indexOf(String(selMinute).padStart(2, '0'));
    return idx >= 0 ? idx : 0;
  }, [selMinute]);

  const handleConfirm = () => {
    onConfirm({
      hourText:   String(selHour).padStart(2, '0'),
      minuteText: String(selMinute).padStart(2, '0'),
      period:     selPeriod,
    });
  };

  const bg      = isDark ? '#1e293b' : '#ffffff';
  const textCol = isDark ? '#e2e8f0' : '#1e293b';
  const subCol  = isDark ? '#94a3b8' : '#64748b';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: bg }]}>

          {/* Título */}
          <Text style={[styles.title, { color: textCol }]}>{title}</Text>

          {/* Toggle AM / PM */}
          <View style={styles.periodRow}>
            {['AM', 'PM'].map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, selPeriod === p && styles.periodBtnActive]}
                onPress={() => setSelPeriod(p)}
                activeOpacity={0.75}
              >
                <Text style={[styles.periodTxt, selPeriod === p && styles.periodTxtActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Ruedas */}
          <View style={styles.wheelsRow}>
            <View style={styles.wheelCol}>
              <Text style={[styles.wheelLabel, { color: subCol }]}>Hora</Text>
              <WheelPicker
                key={`h-${visible ? 1 : 0}`}
                data={HOURS}
                selectedIndex={hourIndex}
                onValueChange={(val) => setSelHour(val)}
                isDark={isDark}
              />
            </View>

            <Text style={[styles.colon, { color: textCol }]}>:</Text>

            <View style={styles.wheelCol}>
              <Text style={[styles.wheelLabel, { color: subCol }]}>Min</Text>
              <WheelPicker
                key={`m-${visible ? 1 : 0}`}
                data={MINUTES}
                selectedIndex={minuteIndex}
                onValueChange={(val) => setSelMinute(val)}
                isDark={isDark}
              />
            </View>
          </View>

          {/* Preview de la hora seleccionada */}
          <Text style={[styles.preview, { color: '#667eea' }]}>
            {String(selHour).padStart(2, '0')}:{String(selMinute).padStart(2, '0')} {selPeriod}
          </Text>

          {/* Botones */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnCancel} onPress={onCancel} activeOpacity={0.75}>
              <Text style={[styles.btnCancelTxt, { color: subCol }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnConfirm} onPress={handleConfirm} activeOpacity={0.85}>
              <Text style={styles.btnConfirmTxt}>Confirmar</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 300,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 18,
    letterSpacing: 0.3,
  },
  periodRow: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: 'rgba(102,126,234,0.12)',
    borderRadius: 12,
    padding: 3,
  },
  periodBtn: {
    paddingHorizontal: 28,
    paddingVertical: 8,
    borderRadius: 10,
  },
  periodBtnActive: {
    backgroundColor: '#667eea',
  },
  periodTxt: {
    fontSize: 15,
    fontWeight: '600',
    color: '#667eea',
  },
  periodTxtActive: {
    color: '#ffffff',
  },
  wheelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wheelCol: {
    alignItems: 'center',
  },
  wheelLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  colon: {
    fontSize: 32,
    fontWeight: '700',
    marginHorizontal: 4,
    marginTop: 18, // compensar label
  },
  preview: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 6,
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 10,
    width: '100%',
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(100,116,139,0.12)',
  },
  btnCancelTxt: {
    fontSize: 15,
    fontWeight: '600',
  },
  btnConfirm: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#667eea',
  },
  btnConfirmTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
