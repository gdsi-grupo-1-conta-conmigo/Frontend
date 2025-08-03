import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { ProtectedRoute } from '../components/AuthGuard';
import { useAuth } from '../contexts/AuthContext';
import { templatesService, Template, TemplateDataEntry, ApiException } from '../services/api';
import { handleAuthError, checkAndHandleExpiredToken } from '../utils/authErrorHandler';

export default function EditEntryScreen() {
  const { logout } = useAuth();
  const { templateId, entryId } = useLocalSearchParams<{ templateId: string; entryId: string }>();
  
  // Estado del template, entrada y formulario
  const [template, setTemplate] = useState<Template | null>(null);
  const [originalEntry, setOriginalEntry] = useState<TemplateDataEntry | null>(null);
  const [formData, setFormData] = useState<{ [key: string]: any }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos al montar el componente
  useEffect(() => {
    if (templateId && entryId) {
      loadData();
    }
  }, [templateId, entryId]);

  const loadData = async () => {
    if (!templateId || !entryId) {
      setError('Parámetros faltantes');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Verificar token
      const { authStorage } = await import('../services/authStorage');
      const token = await authStorage.getAccessToken();
      console.log('🔍 Verificando token antes de cargar datos de edición:', token ? 'Token presente' : 'Token ausente');
      
      if (!token) {
        console.log('❌ No hay token disponible, redirigiendo a login...');
        await logout();
        router.replace('/login');
        return;
      }
      
      // Verificar si el token está expirado
      const tokenExpired = await checkAndHandleExpiredToken(token, { logout });
      if (tokenExpired) {
        return;
      }
      
      // Cargar template y datos de la entrada específica en paralelo
      console.log('📡 Cargando template y datos de la entrada:', templateId, entryId);
      const [templateResponse, entryResponse] = await Promise.all([
        templatesService.getTemplate(templateId),
        templatesService.getTemplateDataEntry(templateId, entryId)
      ]);
      
      console.log('✅ Datos cargados:', { template: templateResponse, entry: entryResponse });
      console.log('📝 Valores disponibles para editar:', entryResponse.values);
      console.log('📋 Campos del template:', templateResponse.fields);
      
      setTemplate(templateResponse);
      setOriginalEntry(entryResponse);
      setFormData(entryResponse.values);
      
    } catch (error) {
      console.error('❌ Error cargando datos para edición:', error);
      
      // Usar el manejador de errores de autenticación
      const wasAuthError = await handleAuthError(error, { logout });
      if (wasAuthError) {
        return;
      }
      
      // Manejar otros tipos de errores
      if (error instanceof ApiException) {
        if (error.status === 404) {
          setError('Template o registro no encontrado');
        } else {
          setError(`Error: ${error.detail}`);
        }
      } else {
        setError('Error al cargar los datos. Inténtalo nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    console.log(`📝 Campo ${fieldName} cambiado:`, value, typeof value);
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const processFormDataForSave = (data: { [key: string]: any }) => {
    const processedData: { [key: string]: any } = {};
    
    template?.fields.forEach(field => {
      const fieldName = field.name;
      const fieldType = field.type;
      const value = data[fieldName];
      
      console.log(`🔍 Procesando campo ${fieldName} (${fieldType}):`, value, typeof value);
      
      if (value !== undefined && value !== null) {
        if (fieldType === 'int') {
          // Convertir a números enteros
          if (typeof value === 'string') {
            if (value === '' || value === '-') {
              processedData[fieldName] = 0;
            } else {
              const numValue = parseInt(value, 10);
              processedData[fieldName] = isNaN(numValue) ? 0 : numValue;
            }
          } else if (typeof value === 'number') {
            processedData[fieldName] = Math.floor(value);
          } else {
            processedData[fieldName] = 0;
          }
        } else if (fieldType === 'float') {
          // Convertir a números decimales
          if (typeof value === 'string') {
            if (value === '' || value === '-' || value === '.' || value === '-.') {
              processedData[fieldName] = 0;
            } else {
              const numValue = parseFloat(value);
              processedData[fieldName] = isNaN(numValue) ? 0 : numValue;
            }
          } else if (typeof value === 'number') {
            processedData[fieldName] = value;
          } else {
            processedData[fieldName] = 0;
          }
        } else {
          // Para otros tipos (string, boolean, date) mantener el valor tal como está
          processedData[fieldName] = value;
        }
      }
      
      console.log(`✅ Campo ${fieldName} procesado:`, processedData[fieldName], typeof processedData[fieldName]);
    });
    
    return processedData;
  };

  const handleSave = async () => {
    if (!templateId || !entryId) {
      console.log('❌ Faltan parámetros para guardar');
      return;
    }

    try {
      setIsSaving(true);
      
      // Verificar token antes de guardar
      const { authStorage } = await import('../services/authStorage');
      const token = await authStorage.getAccessToken();
      
      if (!token) {
        console.log('❌ No hay token disponible, redirigiendo a login...');
        await logout();
        router.replace('/login');
        return;
      }
      
      // Verificar si el token está expirado
      const tokenExpired = await checkAndHandleExpiredToken(token, { logout });
      if (tokenExpired) {
        return;
      }

      // Procesar los datos del formulario antes de enviar
      const processedFormData = processFormDataForSave(formData);

      console.log('💾 Guardando cambios...');
      console.log('💾 templateId:', templateId);
      console.log('💾 entryId:', entryId);
      console.log('💾 formData original:', formData);
      console.log('💾 formData procesado:', processedFormData);
      
      const result = await templatesService.updateTemplateData(templateId, entryId, {
        values: processedFormData
      });
      
      console.log('✅ Datos actualizados exitosamente:', result);
      console.log('🎉 ÉXITO: Registro actualizado exitosamente');
      
      // Volver a la pantalla anterior
      router.back();
      
    } catch (error) {
      console.error('❌ Error guardando cambios:', error);
      
      // Usar el manejador de errores de autenticación
      const wasAuthError = await handleAuthError(error, { logout });
      if (wasAuthError) {
        return;
      }
      
      // Manejar otros tipos de errores
      let errorMessage = 'Error al guardar los cambios. Inténtalo nuevamente.';
      if (error instanceof ApiException) {
        if (error.status === 404) {
          errorMessage = 'Registro no encontrado';
        } else if (error.status === 400) {
          errorMessage = 'Datos inválidos. Verifica los valores ingresados.';
        } else {
          errorMessage = `Error: ${error.detail}`;
        }
      }
      
      console.log('🚨 ERROR PARA EL USUARIO:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldTypeLabel = (type: string): string => {
    const typeLabels: { [key: string]: string } = {
      'string': 'Texto',
      'int': 'Número Entero',
      'float': 'Número Decimal',
      'boolean': 'Sí/No',
      'date': 'Fecha',
    };
    return typeLabels[type] || type;
  };

  const renderFieldInput = (field: any) => {
    const fieldName = field.name;
    const fieldType = field.type;
    const currentValue = formData[fieldName] || '';

    switch (fieldType) {
      case 'string':
        return (
          <TextInput
            style={styles.textInput}
            value={String(currentValue)}
            onChangeText={(value) => handleFieldChange(fieldName, value)}
            placeholder={`Ingresa ${fieldName}`}
            multiline={false}
          />
        );
      
      case 'int':
        return (
          <TextInput
            style={styles.textInput}
            value={String(currentValue)}
            onChangeText={(value) => {
              // Permitir solo números enteros y estados temporales válidos
              if (value === '' || value === '-') {
                handleFieldChange(fieldName, value);
              } else {
                // Validar que contenga solo dígitos (y opcionalmente un signo negativo al inicio)
                const integerRegex = /^-?\d*$/;
                if (integerRegex.test(value)) {
                  handleFieldChange(fieldName, value);
                }
              }
            }}
            placeholder={`Ingresa ${fieldName}`}
            keyboardType="numeric"
          />
        );
      
      case 'float':
        return (
          <TextInput
            style={styles.textInput}
            value={String(currentValue)}
            onChangeText={(value) => {
              // Permitir números decimales y estados temporales válidos
              if (value === '' || value === '.' || value === '-' || value === '-.' || value === '-.') {
                handleFieldChange(fieldName, value);
              } else {
                // Validar que sea un patrón de número decimal válido
                const decimalRegex = /^-?\d*\.?\d*$/;
                if (decimalRegex.test(value)) {
                  // Solo verificar que no tenga múltiples puntos decimales
                  const dotCount = (value.match(/\./g) || []).length;
                  if (dotCount <= 1) {
                    handleFieldChange(fieldName, value);
                  }
                }
              }
            }}
            placeholder={`Ingresa ${fieldName} (ej: 5.3)`}
            keyboardType="decimal-pad"
          />
        );
      
      case 'boolean':
        return (
          <View style={styles.booleanContainer}>
            <TouchableOpacity
              style={[
                styles.booleanOption,
                currentValue === true && styles.booleanOptionSelected
              ]}
              onPress={() => handleFieldChange(fieldName, true)}
            >
              <Text style={[
                styles.booleanOptionText,
                currentValue === true && styles.booleanOptionTextSelected
              ]}>
                Sí
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.booleanOption,
                currentValue === false && styles.booleanOptionSelected
              ]}
              onPress={() => handleFieldChange(fieldName, false)}
            >
              <Text style={[
                styles.booleanOptionText,
                currentValue === false && styles.booleanOptionTextSelected
              ]}>
                No
              </Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'date':
        return (
          <TextInput
            style={styles.textInput}
            value={String(currentValue)}
            onChangeText={(value) => handleFieldChange(fieldName, value)}
            placeholder="AAAA-MM-DD"
          />
        );
      
      default:
        return (
          <TextInput
            style={styles.textInput}
            value={String(currentValue)}
            onChangeText={(value) => handleFieldChange(fieldName, value)}
            placeholder={`Ingresa ${fieldName}`}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Cargando datos para editar...</Text>
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
            <TouchableOpacity style={styles.retryButton} onPress={loadData}>
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

  if (!template || !originalEntry) {
    return (
      <ProtectedRoute>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="document-outline" size={64} color="#D1D5DB" />
            <Text style={styles.errorTitle}>Datos no encontrados</Text>
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
            <Text style={styles.headerTitle}>Editar Registro</Text>
            <Text style={styles.headerSubtitle}>{template.name}</Text>
          </View>

          <TouchableOpacity 
            style={[
              styles.headerButton,
              styles.saveButton,
              isSaving && styles.disabledButton
            ]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="checkmark" size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Formulario de edición */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Editar Valores</Text>
            {template.fields.map((field, index) => (
              <View key={index} style={styles.fieldContainer}>
                <View style={styles.fieldHeader}>
                  <Text style={styles.fieldLabel}>
                    {field.name}
                    {field.display_unit && (
                      <Text style={styles.fieldUnit}> ({field.display_unit})</Text>
                    )}
                  </Text>
                  <Text style={styles.fieldType}>
                    {getFieldTypeLabel(field.type)}
                  </Text>
                </View>
                {renderFieldInput(field)}
              </View>
            ))}
          </View>

          {/* Botón de confirmación */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={[
                styles.confirmButton,
                isSaving && styles.disabledButton
              ]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.confirmButtonText}>
                {isSaving ? 'Guardando...' : 'Confirmar Cambios'}
              </Text>
            </TouchableOpacity>
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
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#4F46E5',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
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
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldHeader: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  fieldUnit: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
  },
  fieldType: {
    fontSize: 12,
    color: '#4F46E5',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#111827',
  },
  booleanContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  booleanOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  booleanOptionSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  booleanOptionText: {
    fontSize: 16,
    color: '#6B7280',
  },
  booleanOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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