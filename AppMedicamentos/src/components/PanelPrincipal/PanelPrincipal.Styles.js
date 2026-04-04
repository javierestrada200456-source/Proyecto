import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints
const isSmall = width < 375;
const isMedium = width >= 375 && width < 414;
const isLarge = width >= 414;

// Tamaños adaptados para los círculos
const circleSize = isSmall ? 95 : isMedium ? 105 : 120;

const PanelPrincipalStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmall ? 14 : 18,
    paddingVertical: 12,
    flexGrow: 1,
  },

  // Header mejorado
  header: {
    marginBottom: 16,
    marginTop: 18,
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: isSmall ? 13 : 15,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  userName: {
    fontSize: isSmall ? 24 : 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  profileSection: {
    alignItems: 'center',
     gap: 6,
  },
  profilePictureContainer: {
    position: 'relative',
    marginTop: 10,
  },
  profilePicture: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3.5,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#764ba2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  // Advanced Stats Card - Moderno y bacano
  statsContainer: {
    marginVertical: 16,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 15,
    maxWidth: 520,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 6,
  },
  statIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    marginBottom: 4,
  },
  statNumber: {
    fontSize: isSmall ? 24 : 28,
    fontWeight: '900',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  statLabel: {
    fontSize: isSmall ? 10 : 11,
    color: '#555',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
  },
  verticalDivider: {
    width: 1.5,
    height: 70,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },

  // Menu Grid (4 tiles - 2x2) - Perfectamente organizado
  menuSection: {
    marginTop: 32,
    marginBottom: 24,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: isSmall ? 12 : 14,
  },
  menuCard: {
    // OJO: el wrapper en PanelPrincipal.jsx ya mide 48%,
    // aquí la card debe ocupar el 100% para no verse pequeña.
    width: '100%',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 12,
    aspectRatio: 1.05,
    minHeight: isSmall ? 140 : 160,
  },
  menuCardGradient: {
    flex: 1,
    padding: isSmall ? 16 : 20,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  iconContainer: {
    width: isSmall ? 56 : isMedium ? 64 : 70,
    height: isSmall ? 56 : isMedium ? 64 : 70,
    borderRadius: isSmall ? 28 : isMedium ? 32 : 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  menuTitle2: {
    fontSize: isSmall ? 14 : isMedium ? 15 : 16,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: isSmall ? 18 : isMedium ? 20 : 22,
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  arrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },

  // Info Card mejorado
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginHorizontal: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: isSmall ? 12 : 13,
    color: '#667eea',
    fontWeight: '600',
    lineHeight: isSmall ? 18 : 20,
  },
});

export default PanelPrincipalStyles;
