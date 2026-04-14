import { StyleSheet, Dimensions, Platform } from 'react-native';
import { colors } from './Styles';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isMediumDevice = width >= 375 && width < 768;
const isLargeDevice = width >= 768;

export const genderOptions = [
  { id: 1, label: 'Masculino', value: 'male', icon: 'human-male' },
  { id: 2, label: 'Femenino', value: 'female', icon: 'human-female' },
];

export const animationConfig = {
  headerAnimation: {
    duration: 800,
    delay: 200,
  },
  fieldAnimation: {
    duration: 600,
    delay: 100,
  },
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },

  safeArea: {
    flex: 1,
  },

  keyboardContainer: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingBottom: 30,
  },

  // Header Styles
  header: {
    marginTop: 20,
    marginBottom: 16,
    marginHorizontal: isSmallDevice ? 12 : 16,
  },

  headerContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    padding: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#818cf8',
  },

  headerTitle: {
    fontSize: isSmallDevice ? 26 : 32,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  headerSubtitle: {
    fontSize: isSmallDevice ? 13 : 14,
    color: 'rgba(203, 213, 225, 0.85)',
    lineHeight: 20,
    fontWeight: '500',
  },

  // Progress Indicator
  progressContainer: {
    marginBottom: 16,
    marginHorizontal: isSmallDevice ? 12 : 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },

  progressFill: {
    height: '100%',
    borderRadius: 10,
  },

  progressText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Form Container
  formContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 24,
    padding: isSmallDevice ? 16 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  // Field Container
  fieldContainer: {
    marginBottom: 24,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },

  // Step Header
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  stepIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  stepInfo: {
    flex: 1,
  },

  fieldLabel: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 4,
  },

  fieldSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },

  // Input Container
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 54,
    borderWidth: 2,
    borderColor: 'rgba(148,163,184,0.25)',
    marginTop: 12,
    transition: 'all 0.3s ease',
  },

  inputContainerFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(41, 80, 253, 0.02)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  inputIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#f1f5f9',
    paddingVertical: 8,
  },

  inputUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
    backgroundColor: 'rgba(41, 80, 253, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  // Date Button
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 54,
    borderWidth: 2,
    borderColor: 'rgba(148,163,184,0.25)',
    marginTop: 12,
  },

  dateButtonFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(41, 80, 253, 0.02)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  dateButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#f1f5f9',
    marginLeft: 10,
  },

  // Gender Options
  genderOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },

  genderOption: {
    flex: 1,
    height: 100,
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(148,163,184,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    transition: 'all 0.3s ease',
  },

  genderOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },

  genderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a5b4fc',
    marginTop: 8,
  },

  genderLabelSelected: {
    color: '#ffffff',
  },

  // Error Styling
  fieldError: {
    borderColor: colors.error,
    backgroundColor: 'rgba(255, 107, 107, 0.04)',
  },

  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 8,
    fontWeight: '500',
    marginLeft: 4,
  },

  // Button Styles
  buttonContainer: {
    marginTop: 30,
    marginBottom: 20,
  },

  submitButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  submitButtonDisabled: {
    opacity: 0.7,
  },

  submitButtonText: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  // Tips Container
  tipsContainer: {
    marginTop: 20,
  },

  tipBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },

  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '500',
    lineHeight: 18,
  },

  // Date Picker Styles
  datePickerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  datePickerContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },

  datePickerHeader: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 16,
  },

  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'center',
  },

  dateInputsWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
    gap: 12,
  },

  dateInputGroup: {
    flex: 1,
    alignItems: 'center',
  },

  dateInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },

  dateInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1a1a1a',
  },

  datePickerFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },

  datePickerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  datePickerButtonConfirm: {
    backgroundColor: colors.primary,
  },

  datePickerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },

  datePickerButtonTextCancel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },

  // DatePicker List Styles
  datePickersWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginVertical: 20,
    gap: 10,
    height: 280,
    paddingHorizontal: 10,
  },

  datePickerColumn: {
    flex: 1,
    alignItems: 'center',
  },

  datePickerColumnLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#a5b4fc',
    marginBottom: 12,
  },

  datePickerList: {
    flex: 1,
    width: '100%',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(148,163,184,0.2)',
    backgroundColor: '#1e293b',
  },

  pickerItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    paddingHorizontal: 8,
  },

  pickerItemSelected: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    marginHorizontal: 4,
    marginVertical: 2,
    borderBottomWidth: 0,
  },

  pickerItemIndicator: {
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  pickerItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#94a3b8',
    flex: 1,
    textAlign: 'center',
  },

  pickerItemTextSelected: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  successModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  successIconContainer: {
    marginBottom: 24,
  },

  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 12,
    letterSpacing: 0.5,
  },

  successMessage: {
    fontSize: 16,
    fontWeight: '500',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },

  successDetails: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    gap: 12,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    marginBottom: 4,
  },

  detailText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginLeft: 12,
    flex: 1,
  },

  successButton: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  successButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  // Responsive adjustments for large devices
  ...(isLargeDevice && {
    formContainer: {
      maxWidth: 600,
      alignSelf: 'center',
      marginHorizontal: 'auto',
    },
  }),
});
