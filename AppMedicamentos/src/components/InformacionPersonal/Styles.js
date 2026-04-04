// src/components/Styles.js
import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Definición de la paleta de colores de la aplicación
export const colors = {
  primary: '#2950fdff',    // Azul principal para elementos destacados
  secondary: '#764ba2',  // Púrpura para elementos secundarios
  accent: '#f093fb',     // Rosa para acentos y detalles
  white: '#fffffff8',      // Blanco para fondos y texto claro
  black: '#000000',      // Negro para texto principal
  gray: '#7c7c7c',      // Gris para texto secundario
  lightGray: '#f5f5f5',  // Gris claro para fondos alternativos
  darkGray: '#333333',   // Gris oscuro para texto de contraste
  error: '#FF6B6B',      // Rojo para mensajes de error
  success: '#4ECDC4',    // Verde azulado para mensajes de éxito
  warning: '#FFE66D',    // Amarillo para advertencias
  transparent: 'transparent', // Transparente para efectos
  overlay: 'rgba(0,0,0,0.5)', // Semi-transparente para superposiciones
};

// Estilos comunes reutilizables en toda la aplicación
export const commonStyles = StyleSheet.create({
  // Contenedor principal que ocupa toda la pantalla
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  
  // Área segura para dispositivos con notch o barras de sistema
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  
  // Contenedor para el fondo con gradiente
  gradientContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    height: '100%',
  },
  
  // Contenedor centrado vertical y horizontalmente
  centerContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    paddingTop: 20,
  },
  
  // Contenedor del logotipo con espaciado inferior
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  
  // Círculo contenedor del logo con efectos visuales
  logoCircle: {
    width: 160,                              // Tamaño del círculo
    height: 160,
    borderRadius: 100,                        // Hace el contenedor circular
    backgroundColor: 'rgba(0, 26, 255, 1)', // Azul semi-transparente
    justifyContent: 'center',                // Centra el contenido
    alignItems: 'center',
    marginBottom: 1,                        // Espacio inferior
    shadowColor: colors.accent,              // Color de la sombra
    shadowOffset: {                          // Desplazamiento de la sombra
      width: 0,
      height: 16,
    },
    shadowOpacity: 0.4,                      // Intensidad de la sombra
    shadowRadius: 30,                        // Difuminado de la sombra
    elevation: 20,                           // Elevación para Android
    borderWidth: 6,                          // Borde del círculo
    borderColor: 'rgba(255, 255, 255, 0.99)',    // Borde semi-transparente
    overflow: 'hidden',                      // Oculta contenido fuera del círculo
  },
  
  // Estilos para la imagen del logo
  logoImage: {
    width: '100%',                           // Tamaño relativo al contenedor
    height: '100%',
    shadowColor: colors.white,              // Efecto de brillo
    shadowOffset: {                         // Sin desplazamiento
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.6,                     // Brillo intenso
    shadowRadius: 15,                       // Difuminado del brillo
  },
  
  logoText: {
    fontSize: 50,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
    letterSpacing: 1,
  },
  
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '300',
  },
  
  formContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: 30,
    paddingHorizontal: 30,
    paddingVertical: 40,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 30,
    letterSpacing: 0.5,
  },
  
  // Contenedor exterior del campo de entrada
  inputContainer: {
    marginBottom: 25,                        // Espacio entre campos
    position: 'relative',                    // Para posicionamiento absoluto interno
  },
  
  // Envoltorio del input con efectos visuales
  inputWrapper: {
    position: 'relative',                    // Para iconos y etiquetas flotantes
    backgroundColor: colors.lightGray,       // Fondo claro
    borderRadius: 15,                        // Bordes redondeados
    borderWidth: 2,                          // Borde visible
    borderColor: 'rgba(102,126,234,0.1)',   // Borde sutil
    shadowColor: colors.primary,             // Sombra del color principal
    shadowOffset: {                          // Desplazamiento sutil
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,                      // Sombra suave
    shadowRadius: 8,                         // Difuminado moderado
    elevation: 3,                            // Elevación en Android
    // overflow: 'hidden',                   // REMOVIDO: Para permitir que el label flotante se salga del borde superior
  },
  
  // Estilos adicionales cuando el input está enfocado
  inputWrapperFocused: {
    borderColor: colors.primary,             // Borde destacado
    shadowOpacity: 0.2,                      // Sombra más visible
    shadowRadius: 12,                        // Mayor difuminado
    elevation: 6,                            // Mayor elevación
  },
  
  // Campo de entrada de texto
  input: {
    height: 60,                              // Altura cómoda para tocar
    paddingHorizontal: 15,                   // Espaciado interno reducido
    paddingLeft: 55,                         // Espacio para el icono
    fontSize: 16,                            // Tamaño de texto legible
    color: colors.darkGray,                  // Color de texto
    backgroundColor: colors.transparent,      // Fondo transparente
    fontWeight: '500',                       // Peso de fuente medio
    overflow: 'hidden',                      // Previene que el texto se salga
  },
  
  inputIcon: {
    position: 'absolute',
    left: 18,
    top: '50%',
    marginTop: -12,
    zIndex: 1,
  },
  
  inputLabel: {
    position: 'absolute',
    left: 55,
    top: -12,
    fontSize: 12,
    color: colors.primary,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: '600',
    overflow: 'hidden',
  },
  
  errorText: {
    color: colors.error,
    fontSize: 13,
    marginTop: 8,
    marginLeft: 15,
    fontWeight: '500',
  },
  
  warningText: {
    color: colors.warning,
    fontSize: 13,
    marginTop: 8,
    marginLeft: 15,
    fontWeight: '500',
  },
  
  button: {
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  
  primaryButton: {
    backgroundColor: colors.primary,
  },
  
  primaryButtonPressed: {
    backgroundColor: colors.secondary,
    transform: [{ scale: 0.98 }],
  },
  
  secondaryButton: {
    backgroundColor: colors.transparent,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },
  
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  
  linkText: {
    color: colors.primary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '600',
  },
  
  linkTextSecondary: {
    color: colors.secondary,
    textDecorationLine: 'underline',
  },
  
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 25,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },
  
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(102,126,234,0.2)',
  },
  
  dividerText: {
    color: colors.gray,
    fontSize: 14,
    marginHorizontal: 15,
    fontWeight: '500',
  },
  
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(102,126,234,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(102,126,234,0.2)',
  },
  
  messageContainer: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: colors.success,
    padding: 15,
    borderRadius: 15,
    zIndex: 1000,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  
  messageText: {
    color: colors.white,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  
  errorMessageContainer: {
    backgroundColor: colors.error,
  },
  
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  
  loadingText: {
    color: colors.white,
    fontSize: 16,
    marginTop: 10,
    fontWeight: '500',
  },

  /* Modal central con overlay oscuro para mensajes importantes (espera / éxito) */
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },

  modalContainer: {
    width: Math.min(width - 60, 360),
    maxHeight: height * 0.7,                 // Altura máxima para que no se corte
    padding: 28,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.99)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 35,
  },

  modalIconWaiting: {
    fontSize: 56,
    marginBottom: 12,
    color: colors.primary,
  },

  modalIconSuccess: {
    fontSize: 56,
    marginBottom: 12,
    color: colors.success,
  },

  modalText: {
    fontSize: 18,
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '700',
    lineHeight: 26,
  },

  modalSubText: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 22,
  },

  // Tarjeta moderna con efecto de cristal y sombras
  modernCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Fondo casi blanco con transparencia
    borderRadius: 25,                             // Bordes muy redondeados
    marginHorizontal: 20,                         // Márgenes laterales
    marginTop: 20,                                // Espacio superior
    paddingHorizontal: 25,                        // Relleno interno horizontal
    paddingVertical: 35,                          // Relleno interno vertical
    shadowColor: colors.accent,                   // Sombra con color de acento
    shadowOffset: {                               // Desplazamiento significativo
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,                         // Opacidad moderada
    shadowRadius: 30,                            // Sombra muy difuminada
    elevation: 15,                               // Elevación para Android
    borderWidth: 3,                              // Borde grueso
    borderColor: 'rgba(0, 0, 0, 0.3)',          // Borde oscuro semi-transparente
  },

  strengthContainer: {
    marginTop: 8,
    marginHorizontal: 5,
  },

  strengthBar: {
    height: 6,
    backgroundColor: 'rgba(102,126,234,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 5,
  },

  strengthProgress: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },

  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },

  floatingLabel: {
    position: 'absolute',
    left: 55,
    backgroundColor: colors.white,
    paddingHorizontal: 6,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },

  floatingLabelTop: {
    top: -8,
  },

  floatingLabelCenter: {
    top: '50%',
    marginTop: -8,
    color: colors.gray,
    fontWeight: '400',
  },
});

export const animations = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  
  slideInUp: {
    from: { translateY: 50, opacity: 0 },
    to: { translateY: 0, opacity: 1 },
  },
  
  slideInDown: {
    from: { translateY: -50, opacity: 0 },
    to: { translateY: 0, opacity: 1 },
  },
  
  shake: {
    0: { translateX: 0 },
    0.25: { translateX: -5 },
    0.5: { translateX: 5 },
    0.75: { translateX: -5 },
    1: { translateX: 0 },
  },
  
  pulse: {
    0: { scale: 1 },
    0.5: { scale: 1.05 },
    1: { scale: 1 },
  },
  
  bounce: {
    0: { scale: 1 },
    0.5: { scale: 1.2 },
    1: { scale: 1 },
  },
};