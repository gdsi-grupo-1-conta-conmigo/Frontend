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
    Alert,
} from 'react-native';
import { ProtectedRoute } from '../components/AuthGuard';
import { useAuth } from '../contexts/AuthContext';
import { templatesService, Template, ApiException } from '../services/api';
import { handleAuthError, checkAndHandleExpiredToken } from '../utils/authErrorHandler';

export default function TemplateDetailsScreen() {
  const { logout } = useAuth();
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  
  // Estado del template
  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar detalles del template al montar el componente
  useEffect(() => {
    if (templateId) {
      loadTemplateDetails();
    }
  }, [templateId]);

  // Actualizar detalles del template cada vez que se enfoque la pantalla
  useFocusEffect(
    useCallback(() => {
      if (templateId) {
        console.log('🔄 Pantalla de detalles enfocada - actualizando datos del template');
        loadTemplateDetails();
      }
    }, [templateId])
  );

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
      console.log('🔍 Verificando token antes de cargar detalles del template:', token ? 'Token presente' : 'Token ausente');
      
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
      
      console.log('📡 Cargando detalles del template:', templateId);
      const response = await templatesService.getTemplate(templateId);
      console.log('✅ Detalles del template cargados:', response);
      setTemplate(response);
    } catch (error) {
      console.error('❌ Error cargando detalles del template:', error);
      
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
        setError('Error al cargar los detalles del template. Inténtalo nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleEdit = () => {
    console.log('✏️ handleEdit ejecutado - navegando a editar template');
    console.log('✏️ templateId:', templateId);
    
    if (!templateId) {
      console.log('❌ No hay templateId, no se puede navegar');
      return;
    }
    
    // Navegar a la pantalla de editar template con el templateId
    router.push(`/edit-template?templateId=${templateId}`);
  };

  const handleCount = () => {
    console.log('🔢 handleCount ejecutado - navegando a contar');
    console.log('🔢 templateId:', templateId);
    
    if (!templateId) {
      console.log('❌ No hay templateId, no se puede navegar');
      return;
    }
    
    // Navegar a la pantalla de contar con el templateId
    router.push(`/count-entry?templateId=${templateId}`);
  };

  const handleHistory = () => {
    console.log('📊 handleHistory ejecutado - navegando a historial');
    console.log('📊 templateId:', templateId);
    
    if (!templateId) {
      console.log('❌ No hay templateId, no se puede navegar');
      return;
    }
    
    // Navegar a la pantalla de historial con el templateId
    router.push(`/history?templateId=${templateId}`);
  };

  const handleDelete = () => {
    console.log('🔴 handleDelete ejecutado - botón presionado');
    console.log('🔴 templateId en handleDelete:', templateId);
    console.log('🔴 template actual:', template);
    
    // Llamar directamente a confirmDelete que ahora siempre muestra confirmación
    confirmDelete();
  };

  const confirmDelete = async () => {
    console.log('🔍 confirmDelete iniciado');
    console.log('🔍 templateId:', templateId);
    console.log('🔍 template.id:', template?.id);
    
    if (!templateId) {
      console.log('❌ No hay templateId, abortando eliminación');
      return;
    }

    try {
      console.log('🗑️ Iniciando eliminación directa del template:', templateId);
      console.log('🗑️ Tipo de templateId:', typeof templateId);
      setIsLoading(true);
      
      console.log('📡 Llamando a templatesService.deleteTemplate con force=true...');
      console.log('📡 Parámetros: templateId =', templateId, ', force =', true);
      
      const result = await templatesService.deleteTemplate(templateId, true);
      console.log('✅ Respuesta del servicio:', result);
      
      console.log('✅ Template eliminado exitosamente');
      
      // Redirección inmediata
      console.log('🏠 Redirigiendo a home inmediatamente...');
      router.replace('/home');
      
    } catch (error) {
      console.error('❌ Error eliminando template:', error);
      console.error('❌ Tipo de error:', typeof error);
      console.error('❌ Error completo:', JSON.stringify(error, null, 2));
      console.error('❌ Error instanceof ApiException:', error instanceof ApiException);
      
      if (error instanceof ApiException) {
        console.error('❌ ApiException details - status:', error.status, 'detail:', error.detail);
      }
      
      // Usar el manejador de errores de autenticación
      const wasAuthError = await handleAuthError(error, { logout });
      if (wasAuthError) {
        console.log('🔐 Era un error de autenticación, ya se manejó');
        return; // Era un error de autenticación y ya se manejó
      }
      
      // Manejar otros errores
      let errorMessage = 'Hubo un problema al eliminar el template. Inténtalo nuevamente.';
      if (error instanceof ApiException) {
        errorMessage = `Error ${error.status}: ${error.detail}`;
      }
      
      console.log('🚨 Mostrando error al usuario:', errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      console.log('🔄 Finalizando eliminación, setIsLoading(false)');
      setIsLoading(false);
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

  const getFieldTypeIcon = (type: string): string => {
    const typeIcons: { [key: string]: string } = {
      'string': 'text-outline',
      'int': 'calculator-outline',
      'float': 'calculator-outline',
      'boolean': 'checkmark-circle-outline',
      'date': 'calendar-outline',
    };
    return typeIcons[type] || 'help-circle-outline';
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Cargando detalles del template...</Text>
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
            <Text style={styles.headerTitle}>Detalles del Template</Text>
          </View>

          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleEdit}
          >
            <Ionicons name="create-outline" size={24} color="#4F46E5" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Información del Template */}
          <View style={styles.section}>
            <View style={styles.templateHeader}>
              <Text style={styles.templateName}>{template.name}</Text>
              <View style={styles.templateMeta}>
                <Text style={styles.templateMetaText}>
                  {template.fields.length} campo{template.fields.length !== 1 ? 's' : ''}
                </Text>
                {template.created_at && (
                  <Text style={styles.templateMetaText}>
                    Creado: {new Date(template.created_at).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Campos del Template */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Campos del Template</Text>
            {template.fields.map((field, index) => (
              <View key={index} style={styles.fieldCard}>
                <View style={styles.fieldHeader}>
                  <View style={styles.fieldIcon}>
                    <Ionicons 
                      name={getFieldTypeIcon(field.type) as any} 
                      size={20} 
                      color="#4F46E5" 
                    />
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldName}>
                      {field.name}
                      {field.display_unit && (
                        <Text style={styles.fieldUnit}> ({field.display_unit})</Text>
                      )}
                    </Text>
                    <Text style={styles.fieldType}>
                      {getFieldTypeLabel(field.type)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Acciones */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Acciones</Text>
            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.countButton, isLoading && styles.disabledButton]} 
                onPress={handleCount}
                disabled={isLoading}
              >
                <Ionicons name="add-circle-outline" size={20} color={isLoading ? "#9CA3AF" : "#10B981"} />
                <Text style={[styles.actionButtonText, styles.countButtonText, isLoading && styles.disabledButtonText]}>
                  Contar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.historyButton, isLoading && styles.disabledButton]} 
                onPress={handleHistory}
                disabled={isLoading}
              >
                <Ionicons name="bar-chart-outline" size={20} color={isLoading ? "#9CA3AF" : "#F59E0B"} />
                <Text style={[styles.actionButtonText, styles.historyButtonText, isLoading && styles.disabledButtonText]}>
                  Historial
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, isLoading && styles.disabledButton]} 
                onPress={handleEdit}
                disabled={isLoading}
              >
                <Ionicons name="create-outline" size={20} color={isLoading ? "#9CA3AF" : "#4F46E5"} />
                <Text style={[styles.actionButtonText, isLoading && styles.disabledButtonText]}>
                  Editar Template
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.actionButton, 
                  styles.deleteButton, 
                  isLoading && styles.disabledDeleteButton
                ]} 
                onPress={handleDelete}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#9CA3AF" />
                ) : (
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                )}
                <Text style={[
                  styles.actionButtonText, 
                  styles.deleteButtonText,
                  isLoading && styles.disabledButtonText
                ]}>
                  {isLoading ? 'Eliminando...' : 'Eliminar Template'}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  templateHeader: {
    alignItems: 'center',
  },
  templateName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  templateMeta: {
    alignItems: 'center',
    gap: 4,
  },
  templateMetaText: {
    fontSize: 14,
    color: '#6B7280',
  },
  fieldCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fieldInfo: {
    flex: 1,
  },
  fieldName: {
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
    fontSize: 14,
    color: '#4F46E5',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  countButton: {
    backgroundColor: '#ECFDF5',
  },
  countButtonText: {
    color: '#10B981',
  },
  historyButton: {
    backgroundColor: '#FFFBEB',
  },
  historyButtonText: {
    color: '#F59E0B',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  disabledButton: {
    backgroundColor: '#F3F4F6',
    opacity: 0.6,
  },
  disabledDeleteButton: {
    backgroundColor: '#F3F4F6',
    opacity: 0.6,
  },
  disabledButtonText: {
    color: '#9CA3AF',
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