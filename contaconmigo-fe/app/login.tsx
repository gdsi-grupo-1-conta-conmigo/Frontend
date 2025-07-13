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

export default function LoginScreen() {
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

  const handleLogin = async () => {
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
    }

    setErrors(newErrors);

    // Si no hay errores, proceder con el login
    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      try {
        // Llamada al backend para autenticar el usuario
        const response = await authService.login({
          email: email.trim(),
          password: password
        });
        
        // Guardar la sesión del usuario usando el contexto
        console.log('🔐 Guardando sesión con token:', response.access_token ? 'Token presente' : 'Token ausente');
        await login(
          {
            access_token: response.access_token,
            refresh_token: response.refresh_token
          },
          response.user
        );
        
        console.log('✅ Login exitoso para:', response.user.email);
        
        // Redirigir directamente a la pantalla principal
        console.log('Login exitoso para:', response.user.email);
        router.replace('/home');
        
      } catch (error) {
        let errorMessage = 'Error al iniciar sesión. Verifica tus credenciales.';
        
        if (error instanceof ApiException) {
          // Manejar errores específicos del backend
          switch (error.status) {
            case 401:
              errorMessage = 'Credenciales incorrectas. Verifica tu email y contraseña.';
              break;
            case 400:
              errorMessage = 'Datos inválidos. Verifica la información ingresada.';
              break;
            case 0:
              errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
              break;
            default:
              errorMessage = error.detail || errorMessage;
          }
        }
        
        Alert.alert('Error de inicio de sesión', errorMessage);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleNavigateToRegister = () => {
    router.push('/register');
  };

  return (
    <PublicRoute>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Conta conmigo</Text>
          <Text style={styles.subtitle}>Inicia sesión en tu cuenta</Text>
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
          </View>

          {/* Enlace de ¿Olvidaste tu contraseña? */}
          <TouchableOpacity style={styles.forgotPasswordButton}>
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          {/* Botón de login */}
          <TouchableOpacity 
            style={[styles.loginButton, isLoading && styles.disabledButton]} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Text>
          </TouchableOpacity>

          {/* Enlace a registro */}
          <View style={styles.registerLinkContainer}>
            <Text style={styles.registerLinkText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={handleNavigateToRegister}>
              <Text style={styles.registerLink}>Regístrate aquí</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </PublicRoute>
  );
}

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
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  registerLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerLinkText: {
    fontSize: 14,
    color: '#6B7280',
  },
  registerLink: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
}); 