import { FormInput } from '@/components/ui/FormInput';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
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
import { templatesService, ApiException } from '../services/api';
import { handleAuthError } from '../utils/authErrorHandler';
import { useAuth } from '../contexts/AuthContext';

interface Field {
  name: string;
  type: 'string' | 'int' | 'float';
  display_unit?: string;
}

interface FormErrors {
  name?: string;
  fields?: { [key: number]: { name?: string; type?: string; display_unit?: string } };
}

export default function CreateTemplateScreen() {
  const { logout } = useAuth();
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState<Field[]>([
    { name: 'Cantidad', type: 'int', display_unit: '' }
  ]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Tipos de campo disponibles
  const fieldTypes = [
    { value: 'string', label: 'Texto' },
    { value: 'int', label: 'Número Entero' },
    { value: 'float', label: 'Número Decimal' },
  ];

  const addField = () => {
    setFields([...fields, { name: '', type: 'string', display_unit: '' }]);
  };

  const removeField = (index: number) => {
    // No permitir eliminar el primer campo (Cantidad)
    if (index === 0) {
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
    // No permitir cambiar el nombre del primer campo (debe mantenerse como "Cantidad")
    if (index === 0 && key === 'name') {
      return;
    }
    
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    setFields(newFields);

    // Limpiar errores del campo modificado
    if (errors.fields && errors.fields[index] && errors.fields[index][key]) {
      const newFieldErrors = { ...errors.fields };
      if (newFieldErrors[index]) {
        delete newFieldErrors[index][key];
        if (Object.keys(newFieldErrors[index]).length === 0) {
          delete newFieldErrors[index];
        }
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

    // Validar campos
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateTemplate = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Preparar datos del template
      const templateData = {
        name: templateName.trim(),
        fields: fields.map(field => {
          const fieldData: any = {
            name: field.name.trim(),
            type: field.type,
          };
          
          // Solo incluir display_unit si tiene valor
          if (field.display_unit && field.display_unit.trim()) {
            fieldData.display_unit = field.display_unit.trim();
          }
          
          return fieldData;
        })
      };

      console.log('📝 Creando template:', templateData);
      
      // Llamar al endpoint
      const response = await templatesService.createTemplate(templateData);
      
      console.log('✅ Template creado exitosamente:', response);
      
      // Redirigir inmediatamente a home
      router.replace('/home');
      
    } catch (error) {
      console.error('❌ Error creando template:', error);
      
      // Usar el manejador de errores de autenticación
      const wasAuthError = await handleAuthError(error, { logout });
      if (wasAuthError) {
        return; // Era un error de autenticación y ya se manejó
      }
      
      // Manejar otros errores
      let errorMessage = 'Hubo un problema al crear el template. Inténtalo nuevamente.';
      if (error instanceof ApiException) {
        errorMessage = `Error: ${error.detail}`;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Información del Template */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Template</Text>
          
          <FormInput
            label="Nombre del Template"
            value={templateName}
            onChangeText={(text) => {
              setTemplateName(text);
              if (errors.name) {
                setErrors(prev => ({ ...prev, name: undefined }));
              }
            }}
            error={errors.name}
            icon="document-text-outline"
            placeholder="Ej: Registro de Ejercicios, Control de Gastos, etc."
          />
        </View>

        {/* Campos del Template */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Campos del Template</Text>
            <TouchableOpacity 
              style={styles.addFieldButton}
              onPress={addField}
            >
              <Ionicons name="add" size={20} color="#4F46E5" />
              <Text style={styles.addFieldText}>Agregar Campo</Text>
            </TouchableOpacity>
          </View>
          
          {fields.map((field, index) => (
            <View key={index} style={styles.fieldContainer}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldTitle}>
                  {index === 0 ? 'Cantidad' : `Campo ${index + 1}`}
                </Text>
                {fields.length > 1 && index > 0 && (
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
                onChangeText={index === 0 ? undefined : (text) => updateField(index, 'name', text)}
                error={errors.fields?.[index]?.name}
                icon="text-outline"
                placeholder={index === 0 ? "Cantidad (campo obligatorio)" : "Ej: Peso, Volumen, Tiempo, etc."}
                containerStyle={{ marginBottom: 12 }}
                editable={index !== 0}
                style={index === 0 ? styles.readOnlyInput : undefined}
              />
              
              <View style={styles.fieldRow}>
                <View style={styles.fieldTypeContainer}>
                  <Text style={styles.fieldLabel}>Tipo de Campo</Text>
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
                            field.type === type.value && styles.selectedTypeOption
                          ]}
                          onPress={() => updateField(index, 'type', type.value as Field['type'])}
                        >
                          <Text style={[
                            styles.typeOptionText,
                            field.type === type.value && styles.selectedTypeOptionText
                          ]}>
                            {type.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                  {errors.fields?.[index]?.type && (
                    <Text style={styles.errorText}>{errors.fields[index].type}</Text>
                  )}
                </View>
              </View>
              
              <FormInput
                label="Unidad (Opcional)"
                value={field.display_unit || ''}
                onChangeText={(text) => updateField(index, 'display_unit', text)}
                error={errors.fields?.[index]?.display_unit}
                icon="calculator-outline"
                placeholder="Ej: kg, ml, $, etc."
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
          ))}
        </View>

        {/* Vista Previa */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vista Previa</Text>
          <View style={styles.previewCard}>
            <Text style={styles.previewName}>
              {templateName.trim() || 'Nombre del Template'}
            </Text>
            <Text style={styles.previewDescription}>
              {fields.length} campo{fields.length !== 1 ? 's' : ''}
            </Text>
            <View style={styles.previewFields}>
              {fields.slice(0, 3).map((field, index) => (
                <View key={index} style={styles.previewField}>
                  <Text style={styles.previewFieldName}>
                    {field.name.trim() || `Campo ${index + 1}`}
                    {field.display_unit && ` (${field.display_unit})`}
                  </Text>
                  <Text style={styles.previewFieldType}>
                    {fieldTypes.find(t => t.value === field.type)?.label || 'Texto'}
                  </Text>
                </View>
              ))}
              {fields.length > 3 && (
                <Text style={styles.previewMoreFields}>
                  +{fields.length - 3} campo{fields.length - 3 !== 1 ? 's' : ''} más
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Botón Crear */}
        <TouchableOpacity 
          style={[styles.createButton, isLoading && styles.disabledButton]}
          onPress={handleCreateTemplate}
          disabled={isLoading}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.createButtonText}>Creando...</Text>
            </View>
          ) : (
            <Text style={styles.createButtonText}>Crear Template</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addFieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addFieldText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  fieldContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fieldTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  removeFieldButton: {
    padding: 4,
  },
  readOnlyInput: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
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
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  selectedTypeOption: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  typeOptionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedTypeOptionText: {
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  previewCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  previewDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  previewFields: {
    gap: 8,
  },
  previewField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  previewFieldName: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
  },
  previewFieldType: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  previewMoreFields: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
}); 