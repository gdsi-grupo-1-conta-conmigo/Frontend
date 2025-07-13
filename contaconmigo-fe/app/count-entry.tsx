import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Alert,
    TextInput,
    Switch,
} from 'react-native';
import { ProtectedRoute } from '../components/AuthGuard';
import { useAuth } from '../contexts/AuthContext';
import { templatesService, Template, ApiException } from '../services/api';
import { handleAuthError, checkAndHandleExpiredToken } from '../utils/authErrorHandler';

export default function CountEntryScreen() {
  const { logout } = useAuth();
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  
  // Estado del template
  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para los valores del formulario
  const [formValues, setFormValues] = useState<{ [key: string]: any }>({});

  // Cargar detalles del template al montar el componente
  useEffect(() => {
    if (templateId) {
      loadTemplateDetails();
    }
  }, [templateId]);

  const loadTemplateDetails = async () => {
    if (!templateId) {
      setError('ID del template no proporcionado');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Verificar si tenemos token antes de hacer la petición
      const { authStorage } = await import('../services/authStorage');
      const token = await authStorage.getAccessToken();
      console.log('🔍 Verificando token antes de cargar template para contar:', token ? 'Token presente' : 'Token ausente');
      
      if (!token) {
        console.log('❌ No hay token disponible, redirigiendo a login...');
        await logout();
        router.replace('/login');
        return;
      }
      
      // Verificar si el token está expirado proactivamente
      const tokenExpired = await checkAndHandleExpiredToken(token, { logout });
      if (tokenExpired) {
        return; // El token estaba expirado y ya se manejó
      }
      
      console.log('📡 Cargando template para contar:', templateId);
      const response = await templatesService.getTemplate(templateId);
      console.log('✅ Template cargado para contar:', response);
      setTemplate(response);
      
      // Inicializar valores del formulario
      const initialValues: { [key: string]: any } = {};
      response.fields.forEach(field => {
        switch (field.type) {
          case 'boolean':
            initialValues[field.name] = false;
            break;
          case 'int':
          case 'float':
            initialValues[field.name] = '';
            break;
          case 'string':
          case 'date':
          default:
            initialValues[field.name] = '';
            break;
        }
      });
      setFormValues(initialValues);
      
    } catch (error) {
      console.error('❌ Error cargando template para contar:', error);
      
      // Usar el manejador de errores de autenticación
      const wasAuthError = await handleAuthError(error, { logout });
      if (wasAuthError) {
        return; // Era un error de autenticación y ya se manejó
      }
      
      // Manejar otros tipos de errores
      if (error instanceof ApiException) {
        if (error.status === 404) {
          setError('Template no encontrado');
        } else {
          setError(`Error: ${error.detail}`);
        }
      } else {
        setError('Error al cargar el template. Inténtalo nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleCancel = () => {
    console.log('❌ Cancelando entrada de datos');
    router.back();
  };

  const handleSubmit = async () => {
    console.log('📝 Enviando datos del formulario');
    console.log('📝 Valores actuales:', formValues);
    
    if (!templateId) {
      console.log('❌ No hay templateId, no se puede enviar');
      return;
    }

    // Log detallado de cada campo para debugging
    template?.fields.forEach(field => {
      const value = formValues[field.name];
      console.log(`📝 Campo "${field.name}" (${field.type}):`, {
        valor: value,
        tipo: typeof value,
        esVacio: value === '' || value === null || value === undefined,
        trimmed: String(value).trim()
      });
    });

    // Validar que todos los campos requeridos estén completos
    const emptyFields = template?.fields.filter(field => {
      const value = formValues[field.name];
      if (field.type === 'boolean') {
        return false; // Los boolean siempre tienen valor (true/false)
      }
      
      // Verificar si el valor está vacío, es null, undefined o solo contiene espacios
      if (value === null || value === undefined) {
        return true;
      }
      
      // Convertir a string y verificar si está vacío o solo tiene espacios
      const stringValue = String(value).trim();
      return stringValue === '';
    });

    if (emptyFields && emptyFields.length > 0) {
      console.log('❌ Campos vacíos detectados:', emptyFields.map(f => f.name));
      Alert.alert(
        'Campos Incompletos',
        'Debe completar todos los campos antes de enviar.'
      );
      return;
    }

    // Validación adicional para campos numéricos
    const invalidNumericFields = template?.fields.filter(field => {
      const value = formValues[field.name];
      if (field.type === 'int' || field.type === 'float') {
        const stringValue = String(value).trim();
        if (stringValue === '') return false; // Ya se validó arriba
        
        // Verificar si es un número válido
        const numericValue = field.type === 'int' ? parseInt(stringValue) : parseFloat(stringValue);
        return isNaN(numericValue);
      }
      return false;
    });

    if (invalidNumericFields && invalidNumericFields.length > 0) {
      console.log('❌ Campos numéricos inválidos detectados:', invalidNumericFields.map(f => f.name));
      Alert.alert(
        'Valores Inválidos',
        `Los siguientes campos deben contener números válidos: ${invalidNumericFields.map(f => f.name).join(', ')}`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Convertir los valores según el tipo de campo
      const processedValues: { [key: string]: any } = {};
      template?.fields.forEach(field => {
        let value = formValues[field.name];
        
        switch (field.type) {
          case 'int':
            processedValues[field.name] = parseInt(value) || 0;
            break;
          case 'float':
            processedValues[field.name] = parseFloat(value) || 0.0;
            break;
          case 'boolean':
            processedValues[field.name] = Boolean(value);
            break;
          case 'string':
          case 'date':
          default:
            processedValues[field.name] = String(value);
            break;
        }
      });

      console.log('📡 Enviando datos procesados:', processedValues);
      
      // Llamar al endpoint POST /templates/{template_id}/data
      const result = await templatesService.submitTemplateData(templateId, { values: processedValues });
      console.log('✅ Datos enviados exitosamente:', result);
      
      // Redireccionar de vuelta a los detalles del template
      router.back();
      
    } catch (error) {
      console.error('❌ Error enviando datos:', error);
      
      // Usar el manejador de errores de autenticación
      const wasAuthError = await handleAuthError(error, { logout });
      if (wasAuthError) {
        return; // Era un error de autenticación y ya se manejó
      }
      
      // Manejar otros errores
      let errorMessage = 'Hubo un problema al enviar los datos. Inténtalo nuevamente.';
      if (error instanceof ApiException) {
        errorMessage = `Error ${error.status}: ${error.detail}`;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormValue = (fieldName: string, value: any) => {
    console.log(`📝 Actualizando campo ${fieldName}:`, value);
    setFormValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const renderField = (field: any, index: number) => {
    const value = formValues[field.name];
    
    switch (field.type) {
      case 'boolean':
        return (
          <View key={index} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.name}
              {field.display_unit && (
                <Text style={styles.fieldUnit}> ({field.display_unit})</Text>
              )}
            </Text>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>No</Text>
              <Switch
                value={value}
                onValueChange={(newValue) => updateFormValue(field.name, newValue)}
                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
              />
              <Text style={styles.switchLabel}>Sí</Text>
            </View>
          </View>
        );
      
      case 'int':
      case 'float':
        return (
          <View key={index} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.name}
              {field.display_unit && (
                <Text style={styles.fieldUnit}> ({field.display_unit})</Text>
              )}
            </Text>
            <TextInput
              style={styles.textInput}
              value={value}
              onChangeText={(text) => updateFormValue(field.name, text)}
              keyboardType="numeric"
              placeholder={`Ingresa ${field.type === 'int' ? 'número entero' : 'número decimal'}`}
            />
          </View>
        );
      
      case 'date':
        return (
          <View key={index} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.name}
              {field.display_unit && (
                <Text style={styles.fieldUnit}> ({field.display_unit})</Text>
              )}
            </Text>
            <TextInput
              style={styles.textInput}
              value={value}
              onChangeText={(text) => updateFormValue(field.name, text)}
              placeholder="YYYY-MM-DD"
            />
          </View>
        );
      
      case 'string':
      default:
        return (
          <View key={index} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.name}
              {field.display_unit && (
                <Text style={styles.fieldUnit}> ({field.display_unit})</Text>
              )}
            </Text>
            <TextInput
              style={styles.textInput}
              value={value}
              onChangeText={(text) => updateFormValue(field.name, text)}
              placeholder={`Ingresa ${field.name.toLowerCase()}`}
            />
          </View>
        );
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Cargando formulario...</Text>
          </View>
        </SafeAreaView>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
            <Text style={styles.errorTitle}>Error al cargar</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadTemplateDetails}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ProtectedRoute>
    );
  }

  if (!template) {
    return (
      <ProtectedRoute>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="document-outline" size={64} color="#D1D5DB" />
            <Text style={styles.errorTitle}>Template no encontrado</Text>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color="#4F46E5" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Contar: {template.name}</Text>
          </View>

          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Instrucciones */}
          <View style={styles.section}>
            <Text style={styles.instructionsTitle}>Completa los siguientes campos:</Text>
            <Text style={styles.instructionsText}>
              Ingresa los valores para cada campo del template "{template.name}".
            </Text>
          </View>

          {/* Formulario */}
          <View style={styles.section}>
            {template.fields.map((field, index) => renderField(field, index))}
          </View>

          {/* Botones */}
          <View style={styles.section}>
            <View style={styles.buttonsContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={isSubmitting}
              >
                <Ionicons name="close-outline" size={20} color="#6B7280" />
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.submitButton, isSubmitting && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="checkmark-outline" size={20} color="#FFFFFF" />
                )}
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Enviando...' : 'Enviar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  fieldUnit: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#111827',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
}); 