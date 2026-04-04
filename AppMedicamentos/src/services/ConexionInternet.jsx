import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';

/**
 * Wrapper para pantallas que requieren internet estable.
 * - Si no hay conexión, muestra una vista de "sin conexión".
 * - Botón "Reintentar" remonta la pantalla actual (manteniéndote en la misma ruta).
 */
export default function ConexionInternet({ children }) {
  const [isConnected, setIsConnected] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const lastIsConnectedRef = useRef(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && (state.isInternetReachable ?? true));
      setIsConnected(online);
      lastIsConnectedRef.current = online;
    });
    return unsubscribe;
  }, []);

  const handleRetry = useCallback(async () => {
    try {
      const state = await NetInfo.fetch();
      const online = !!(state.isConnected && (state.isInternetReachable ?? true));

      if (online) {
        setIsConnected(true);
        setRetryKey((k) => k + 1);
      } else {
        setIsConnected(false);
      }
    } catch {
      setIsConnected(false);
    }
  }, []);

  const wrappedChild = useMemo(() => {
    if (!React.isValidElement(children)) return children;
    return React.cloneElement(children, { key: `online-retry-${retryKey}` });
  }, [children, retryKey]);

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Ionicons name="cloud-offline-outline" size={56} color="#2563EB" />
          <Text style={styles.title}>Ups al parecer no hay conexion a internet</Text>
          <Text style={styles.subtitle}>revisa tu conexion y vuelve entrar a la app</Text>

          <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.9}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return <>{wrappedChild}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  title: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 18,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
