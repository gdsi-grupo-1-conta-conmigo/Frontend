import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { authService, ApiException } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { PublicRoute } from '../components/AuthGuard';

interface FormErrors {
  email?: string;
  password?: string;
}

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): { isValid: boolean; message?: string } => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLengthValid = password.length >= 8;

    if (!isLengthValid) {
      return { isValid: false, message: 'La contraseña debe tener al menos 8 caracteres' };
    }
    if (!hasUpperCase) {
      return { isValid: false, message: 'La contraseña debe tener al menos una letra mayúscula' };
    }
    if (!hasLowerCase) {
      return { isValid: false, message: 'La contraseña debe tener al menos una letra minúscula' };
    }
    if (!hasNumber) {
      return { isValid: false, message: 'La contraseña debe tener al menos un número' };
    }
    if (!hasSpecialChar) {
      return { isValid: false, message: 'La contraseña debe tener al menos un carácter especial (!@#$%^&*(),.?":{}|<>)' };
    }

    return { isValid: true };
  };

  const handleRegister = async () => {
    const newErrors: FormErrors = {};

    // Validar email
    if (!email) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Por favor ingresa un correo electrónico válido';
    }

    // Validar contraseña
    if (!password) {
      newErrors.password = 'La contraseña es requerida';
    } else {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.message;
      }
    }

    setErrors(newErrors);

    // Si no hay errores, proceder con el registro
    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      try {
        // Llamada al backend para registrar el usuario
        const response = await authService.signUp({
          email: email.trim(),
          password: password
        });
        
        // Mostrar mensaje de éxito
        Alert.alert(
          'Registro exitoso',
          response.message || 'Tu cuenta ha sido creada exitosamente. Revisa tu correo electrónico para verificar tu cuenta.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/login') // Redirigir al login después del registro
            }
          ]
        );
        
      } catch (error) {
        let errorMessage = 'Hubo un problema al registrar tu cuenta. Inténtalo nuevamente.';
        
        if (error instanceof ApiException) {
          // Manejar errores específicos del backend
          switch (error.status) {
            case 400:
              errorMessage = 'Los datos proporcionados no son válidos. Verifica tu información.';
              break;
            case 409:
              errorMessage = 'Ya existe una cuenta con este correo electrónico.';
              break;
            case 0:
              errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
              break;
            default:
              errorMessage = error.detail || errorMessage;
          }
        }
        
        Alert.alert('Error de registro', errorMessage);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getPasswordStrength = () => {
    const validation = validatePassword(password);
    if (password.length === 0) return { color: '#E5E7EB', text: '' };
    if (validation.isValid) return { color: '#10B981', text: 'Segura' };
    return { color: '#EF4444', text: 'Débil' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <PublicRoute>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Conta conmigo</Text>
          <Text style={styles.subtitle}>Crea tu cuenta para comenzar</Text>
        </View>

        <View style={styles.form}>
          {/* Campo de Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Correo Electrónico</Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="ejemplo@correo.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) {
                    setErrors(prev => ({ ...prev, email: undefined }));
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Campo de Contraseña */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ingresa tu contraseña"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) {
                    setErrors(prev => ({ ...prev, password: undefined }));
                  }
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#6B7280" 
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            
            {/* Indicador de fortaleza de contraseña */}
            {password.length > 0 && (
              <View style={styles.passwordStrength}>
                <View style={[styles.strengthBar, { backgroundColor: passwordStrength.color }]} />
                <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                  {passwordStrength.text}
                </Text>
              </View>
            )}
          </View>

          {/* Requisitos de contraseña */}
          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>La contraseña debe contener:</Text>
            <RequirementItem text="Al menos 8 caracteres" isValid={password.length >= 8} />
            <RequirementItem text="Una letra mayúscula" isValid={/[A-Z]/.test(password)} />
            <RequirementItem text="Una letra minúscula" isValid={/[a-z]/.test(password)} />
            <RequirementItem text="Un número" isValid={/\d/.test(password)} />
            <RequirementItem text="Un carácter especial" isValid={/[!@#$%^&*(),.?":{}|<>]/.test(password)} />
          </View>

          {/* Botón de registro */}
          <TouchableOpacity 
            style={[styles.registerButton, isLoading && styles.disabledButton]} 
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.registerButtonText}>
              {isLoading ? 'Registrando...' : 'Registrarse'}
            </Text>
          </TouchableOpacity>

          {/* Enlace a login */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginLinkText}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.loginLink}>Inicia sesión aquí</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </PublicRoute>
  );
}

interface RequirementItemProps {
  text: string;
  isValid: boolean;
}

const RequirementItem: React.FC<RequirementItemProps> = ({ text, isValid }) => (
  <View style={styles.requirementItem}>
    <Ionicons 
      name={isValid ? "checkmark-circle" : "ellipse-outline"} 
      size={16} 
      color={isValid ? "#10B981" : "#6B7280"} 
    />
    <Text style={[styles.requirementText, isValid && styles.validRequirement]}>
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 48,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
  passwordStrength: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  strengthBar: {
    height: 3,
    width: 40,
    borderRadius: 2,
    marginRight: 8,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  requirementsContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 8,
  },
  validRequirement: {
    color: '#10B981',
  },
  registerButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginLink: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
}); 