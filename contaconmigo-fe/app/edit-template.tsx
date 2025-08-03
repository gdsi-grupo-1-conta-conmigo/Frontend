import { FormInput } from '@/components/ui/FormInput';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
} from 'react-native';
import { ProtectedRoute } from '../components/AuthGuard';
import { useAuth } from '../contexts/AuthContext';
import { templatesService, Template, ApiException } from '../services/api';
import { handleAuthError, checkAndHandleExpiredToken } from '../utils/authErrorHandler';

interface Field {
  name: string;
  type: 'string' | 'int' | 'float';
  display_unit?: string;
}

interface FormErrors {
  name?: string;
  fields?: { [key: number]: { name?: string; type?: string; display_unit?: string } };
}

export default function EditTemplateScreen() {
  const { logout } = useAuth();
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  
  // Estado del template original
  const [originalTemplate, setOriginalTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estado del formulario
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  
  // Estado para verificar si tiene datos asociados
  const [hasAssociatedData, setHasAssociatedData] = useState<boolean | null>(null);

  // Tipos de campo disponibles
  const fieldTypes = [
    { value: 'string', label: 'Texto' },
    { value: 'int', label: 'Número Entero' },
    { value: 'float', label: 'Número Decimal' },
  ];

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
      console.log('🔍 Verificando token antes de cargar template para editar:', token ? 'Token presente' : 'Token ausente');
      
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
      
      console.log('📡 Cargando template para editar:', templateId);
      const response = await templatesService.getTemplate(templateId);
      console.log('✅ Template cargado para editar:', response);
      
      setOriginalTemplate(response);
      setTemplateName(response.name);
      setFields(response.fields.map(field => ({
        name: field.name,
        type: field.type as Field['type'],
        display_unit: field.display_unit || ''
      })));
      
      // Verificar si tiene datos asociados intentando hacer una actualización simulada
      // (el backend nos dirá si tiene datos asociados)
      await checkForAssociatedData(response);
      
    } catch (error) {
      console.error('❌ Error cargando template para editar:', error);
      
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

  const checkForAssociatedData = async (template: Template) => {
    try {
      // Intentamos hacer una actualización con los mismos datos para ver si tiene datos asociados
      console.log('🔍 Verificando si el template tiene datos asociados...');
      await templatesService.updateTemplate(templateId!, {
        name: template.name,
        fields: template.fields
      });
      // Si llega aquí, no tiene datos asociados
      console.log('✅ Template sin datos asociados - totalmente editable');
      setHasAssociatedData(false);
    } catch (error) {
      if (error instanceof ApiException && error.status === 400 && 
          error.detail.includes('datos asociados')) {
        console.log('📊 Template tiene datos asociados - solo nombre editable');
        console.log('🔒 ACTIVANDO PROTECCIÓN TOTAL DE CAMPOS');
        setHasAssociatedData(true);
      } else {
        console.log('⚠️ No se pudo determinar el estado de datos asociados, asumiendo que no tiene');
        setHasAssociatedData(false);
      }
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleCancel = () => {
    console.log('❌ Cancelando edición del template');
    router.back();
  };

  const addField = () => {
    // PROTECCIÓN ABSOLUTA: No permitir agregar campos si tiene datos asociados
    if (hasAssociatedData) {
      console.log('⚠️ Intento de agregar campo con datos asociados bloqueado');
      return;
    }
    setFields([...fields, { name: '', type: 'string', display_unit: '' }]);
  };

  const removeField = (index: number) => {
    // PROTECCIÓN ABSOLUTA: No permitir eliminar campos si tiene datos asociados
    if (hasAssociatedData) {
      console.log('⚠️ Intento de eliminar campo con datos asociados bloqueado:', index);
      return;
    }
    // No permitir eliminar el primer campo (Cantidad)
    if (index === 0) {
      console.log('⚠️ Intento de eliminar campo "Cantidad" bloqueado');
      return;
    }
    if (fields.length > 1) {
      const newFields = fields.filter((_, i) => i !== index);
      setFields(newFields);
      
      // Limpiar errores del campo eliminado
      if (errors.fields && errors.fields[index]) {
        const newFieldErrors = { ...errors.fields };
        delete newFieldErrors[index];
        setErrors(prev => ({ ...prev, fields: newFieldErrors }));
      }
    }
  };

  const updateField = (index: number, key: keyof Field, value: string) => {
    // PROTECCIÓN ABSOLUTA: No permitir editar NINGÚN campo si tiene datos asociados
    if (hasAssociatedData) {
      console.log('⚠️ Intento de editar campo con datos asociados bloqueado:', { index, key, value });
      return;
    }
    
    // No permitir cambiar el nombre del primer campo (debe mantenerse como "Cantidad")
    if (index === 0 && key === 'name') {
      console.log('⚠️ Intento de editar nombre del campo "Cantidad" bloqueado');
      return;
    }
    
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    setFields(newFields);

    // Limpiar errores del campo modificado
    if (errors.fields && errors.fields[index] && errors.fields[index][key]) {
      const newFieldErrors = { ...errors.fields };
      delete newFieldErrors[index][key];
      if (Object.keys(newFieldErrors[index]).length === 0) {
        delete newFieldErrors[index];
      }
      setErrors(prev => ({ ...prev, fields: newFieldErrors }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validar nombre del template
    if (!templateName.trim()) {
      newErrors.name = 'El nombre del template es requerido';
    } else if (templateName.trim().length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    }

    // Validar campos solo si no tiene datos asociados
    if (!hasAssociatedData) {
      const fieldErrors: { [key: number]: { name?: string; type?: string; display_unit?: string } } = {};
      
      fields.forEach((field, index) => {
        const fieldError: { name?: string; type?: string; display_unit?: string } = {};
        
        if (!field.name.trim()) {
          fieldError.name = 'El nombre del campo es requerido';
        } else if (field.name.trim().length < 2) {
          fieldError.name = 'El nombre debe tener al menos 2 caracteres';
        }

        if (!field.type) {
          fieldError.type = 'El tipo de campo es requerido';
        }

        // Validación específica para el campo "Cantidad" (primer campo)
        if (index === 0 && field.type === 'string') {
          fieldError.type = 'El campo "Cantidad" debe ser Número Entero o Número Decimal';
        }

        if (Object.keys(fieldError).length > 0) {
          fieldErrors[index] = fieldError;
        }
      });

      if (Object.keys(fieldErrors).length > 0) {
        newErrors.fields = fieldErrors;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveTemplate = async () => {
    console.log('💾 Guardando cambios del template');
    console.log('💾 Nombre:', templateName);
    console.log('💾 Campos:', fields);
    console.log('💾 Tiene datos asociados:', hasAssociatedData);
    
    if (!templateId) {
      console.log('❌ No hay templateId, no se puede guardar');
      return;
    }

    if (!validateForm()) {
      console.log('❌ Formulario inválido, no se puede guardar');
      return;
    }

    try {
      setIsSaving(true);
      
      // Preparar datos para enviar
      const templateData = {
        name: templateName.trim(),
        fields: hasAssociatedData ? originalTemplate!.fields : fields.map(field => ({
          name: field.name.trim(),
          type: field.type,
          display_unit: field.display_unit?.trim() || undefined
        })).filter(field => field.display_unit === undefined ? 
          { ...field } : 
          { ...field, display_unit: field.display_unit }
        )
      };

      console.log('📡 Enviando datos del template actualizado:', templateData);
      const result = await templatesService.updateTemplate(templateId, templateData);
      console.log('✅ Template actualizado exitosamente:', result);
      
      // Redireccionar de vuelta a los detalles del template
      router.back();
      
    } catch (error) {
      console.error('❌ Error actualizando template:', error);
      
      // Usar el manejador de errores de autenticación
      const wasAuthError = await handleAuthError(error, { logout });
      if (wasAuthError) {
        return; // Era un error de autenticación y ya se manejó
      }
      
      // Manejar otros errores
      let errorMessage = 'Hubo un problema al actualizar el template. Inténtalo nuevamente.';
      if (error instanceof ApiException) {
        errorMessage = `Error ${error.status}: ${error.detail}`;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Cargando template...</Text>
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

  if (!originalTemplate || hasAssociatedData === null) {
    return (
      <ProtectedRoute>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Verificando estado del template...</Text>
          </View>
        </SafeAreaView>
      </ProtectedRoute>
    );
  }

  // Log de debugging para verificar el estado
  console.log('🔍 Estado actual en render:', {
    hasAssociatedData,
    templateName,
    fieldsCount: fields.length,
    templateId
  });

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
            <Text style={styles.headerTitle}>Editar Template</Text>
          </View>

          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Información del estado */}
          {hasAssociatedData && (
            <View style={styles.warningSection}>
              <View style={styles.warningHeader}>
                <Ionicons name="information-circle-outline" size={24} color="#F59E0B" />
                <Text style={styles.warningTitle}>Template con Datos</Text>
              </View>
              <Text style={styles.warningText}>
                Este template tiene datos asociados. Solo puedes editar el nombre. 
                Los campos aparecen en gris y no son editables.
              </Text>
            </View>
          )}

          {/* Nombre del Template */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información del Template</Text>
            
            <FormInput
              label="Nombre del Template"
              value={templateName}
              onChangeText={setTemplateName}
              error={errors.name}
              icon="document-text-outline"
              placeholder="Ej: Agua Tomada, Ejercicio Diario, etc."
            />
          </View>

          {/* Campos del Template */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Campos del Template</Text>
              {!hasAssociatedData && (
                <TouchableOpacity style={styles.addButton} onPress={addField}>
                  <Ionicons name="add-circle-outline" size={20} color="#4F46E5" />
                  <Text style={styles.addButtonText}>Agregar Campo</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {fields.map((field, index) => (
              <View key={index} style={[
                styles.fieldContainer,
                hasAssociatedData && styles.disabledFieldContainer
              ]}>
                <View style={styles.fieldHeader}>
                  <Text style={[
                    styles.fieldTitle,
                    hasAssociatedData && styles.disabledText
                  ]}>
                    {index === 0 ? 'Cantidad' : `Campo ${index + 1}`}
                  </Text>
                  {!hasAssociatedData && fields.length > 1 && index > 0 && (
                    <TouchableOpacity 
                      style={styles.removeFieldButton}
                      onPress={() => removeField(index)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
                
                <FormInput
                  label="Nombre del Campo"
                  value={field.name}
                  onChangeText={hasAssociatedData ? undefined : (index === 0 ? undefined : (text) => updateField(index, 'name', text))}
                  error={errors.fields?.[index]?.name}
                  icon="text-outline"
                  placeholder={index === 0 ? "Cantidad (campo obligatorio)" : "Ej: Peso, Volumen, Tiempo, etc."}
                  containerStyle={{ marginBottom: 12 }}
                  editable={hasAssociatedData ? false : (index !== 0)}
                  style={hasAssociatedData || index === 0 ? styles.readOnlyInput : undefined}
                  selectTextOnFocus={hasAssociatedData ? false : undefined}
                  contextMenuHidden={hasAssociatedData ? true : undefined}
                />
                
                <View style={styles.fieldRow}>
                  <View style={styles.fieldTypeContainer}>
                    <Text style={[
                      styles.fieldLabel,
                      hasAssociatedData && styles.disabledText
                    ]}>
                      Tipo de Campo
                    </Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.typeSelector}
                    >
                      {fieldTypes
                        .filter(type => index === 0 ? type.value !== 'string' : true)
                        .map((type) => (
                          <TouchableOpacity
                            key={type.value}
                            style={[
                              styles.typeOption,
                              field.type === type.value && styles.selectedTypeOption,
                              hasAssociatedData && styles.disabledTypeOption
                            ]}
                            onPress={() => !hasAssociatedData && updateField(index, 'type', type.value as Field['type'])}
                            disabled={hasAssociatedData}
                          >
                            <Text style={[
                              styles.typeOptionText,
                              field.type === type.value && styles.selectedTypeOptionText,
                              hasAssociatedData && styles.disabledText
                            ]}>
                              {type.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                    {errors.fields?.[index]?.type && (
                      <Text style={styles.fieldErrorText}>
                        {errors.fields[index].type}
                      </Text>
                    )}
                  </View>
                </View>
                
                <FormInput
                  label="Unidad (Opcional)"
                  value={field.display_unit || ''}
                  onChangeText={hasAssociatedData ? undefined : (text) => updateField(index, 'display_unit', text)}
                  error={errors.fields?.[index]?.display_unit}
                  icon="calculator-outline"
                  placeholder="Ej: kg, ml, min, etc."
                  editable={!hasAssociatedData}
                  style={hasAssociatedData ? styles.readOnlyInput : undefined}
                  selectTextOnFocus={hasAssociatedData ? false : undefined}
                  contextMenuHidden={hasAssociatedData ? true : undefined}
                />
              </View>
            ))}
          </View>

          {/* Botones */}
          <View style={styles.section}>
            <View style={styles.buttonsContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={isSaving}
              >
                <Ionicons name="close-outline" size={20} color="#6B7280" />
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.saveButton, isSaving && styles.disabledButton]}
                onPress={handleSaveTemplate}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="checkmark-outline" size={20} color="#FFFFFF" />
                )}
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
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
  warningSection: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },
  fieldContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  disabledFieldContainer: {
    backgroundColor: '#F3F4F6',
    borderLeftColor: '#9CA3AF',
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  fieldTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  removeFieldButton: {
    padding: 4,
  },
  fieldRow: {
    marginBottom: 12,
  },
  fieldTypeContainer: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
  },
  typeOption: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  selectedTypeOption: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  disabledTypeOption: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  selectedTypeOptionText: {
    color: '#FFFFFF',
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  readOnlyInput: {
    backgroundColor: '#F3F4F6',
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
  saveButton: {
    backgroundColor: '#4F46E5',
  },
  saveButtonText: {
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