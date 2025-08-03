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
    RefreshControl,
} from 'react-native';
import { ProtectedRoute } from '../components/AuthGuard';
import { useAuth } from '../contexts/AuthContext';
import { templatesService, Template, TemplateDataEntry, ApiException } from '../services/api';
import { handleAuthError, checkAndHandleExpiredToken } from '../utils/authErrorHandler';

export default function HistoryScreen() {
  const { logout } = useAuth();
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  
  // Estado del template y datos
  const [template, setTemplate] = useState<Template | null>(null);
  const [historyData, setHistoryData] = useState<TemplateDataEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos al montar el componente
  useEffect(() => {
    if (templateId) {
      loadData();
    }
  }, [templateId]);

  // Actualizar datos cada vez que se enfoque la pantalla
  useFocusEffect(
    useCallback(() => {
      if (templateId) {
        console.log('🔄 Pantalla de historial enfocada - actualizando datos');
        loadData();
      }
    }, [templateId])
  );

  const loadData = async () => {
    if (!templateId) {
      setError('ID del template no proporcionado');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Verificar token
      const { authStorage } = await import('../services/authStorage');
      const token = await authStorage.getAccessToken();
      console.log('🔍 Verificando token antes de cargar historial:', token ? 'Token presente' : 'Token ausente');
      
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
      
      // Cargar template y datos en paralelo
      console.log('📡 Cargando template y datos del historial:', templateId);
      const [templateResponse, historyResponse] = await Promise.all([
        templatesService.getTemplate(templateId),
        templatesService.getTemplateData(templateId)
      ]);
      
      console.log('✅ Datos cargados:', { template: templateResponse, history: historyResponse });
      setTemplate(templateResponse);
      setHistoryData(historyResponse.data);
      
    } catch (error) {
      console.error('❌ Error cargando datos del historial:', error);
      
      // Usar el manejador de errores de autenticación
      const wasAuthError = await handleAuthError(error, { logout });
      if (wasAuthError) {
        return;
      }
      
      // Manejar otros tipos de errores
      if (error instanceof ApiException) {
        if (error.status === 404) {
          setError('Template no encontrado');
        } else {
          setError(`Error: ${error.detail}`);
        }
      } else {
        setError('Error al cargar los datos del historial. Inténtalo nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleBack = () => {
    router.back();
  };

  const handleEditEntry = (entryId: string) => {
    console.log('✏️ handleEditEntry ejecutado');
    console.log('✏️ entryId:', entryId);
    console.log('✏️ templateId:', templateId);
    
    if (!templateId || !entryId) {
      console.log('❌ Faltan parámetros para editar');
      return;
    }
    
    // Navegar a la pantalla de editar entrada con los parámetros necesarios
    router.push(`/edit-entry?templateId=${templateId}&entryId=${entryId}`);
  };


  const deleteEntry = async (entryId: string) => {
    console.log('🗑️ deleteEntry iniciado');
    console.log('🗑️ entryId recibido:', entryId);
    console.log('🗑️ templateId disponible:', templateId);
    
    if (!templateId) {
      console.log('❌ No hay templateId para eliminar');
      return;
    }

    try {
      console.log('🗑️ Iniciando proceso de eliminación...');
      console.log('🗑️ templateId:', templateId);
      console.log('🗑️ entryId:', entryId);
      
      // Verificar token antes de eliminar
      console.log('🔑 Importando authStorage...');
      const { authStorage } = await import('../services/authStorage');
      console.log('🔑 Obteniendo token...');
      const token = await authStorage.getAccessToken();
      console.log('🔑 Token obtenido:', token ? 'Token presente' : 'Token ausente');
      
      if (!token) {
        console.log('❌ No hay token disponible, redirigiendo a login...');
        await logout();
        router.replace('/login');
        return;
      }
      
      // Verificar si el token está expirado
      console.log('🔑 Verificando expiración del token...');
      const tokenExpired = await checkAndHandleExpiredToken(token, { logout });
      if (tokenExpired) {
        console.log('❌ Token expirado');
        return;
      }
      console.log('✅ Token válido');

      console.log('📡 Llamando al servicio deleteTemplateData...');
      console.log('📡 Parámetros: templateId =', templateId, ', entryId =', entryId);
      
      const result = await templatesService.deleteTemplateData(templateId, entryId);
      
      console.log('✅ Respuesta del servicio:', result);
      console.log('✅ Registro eliminado exitosamente del servidor');
      
      // Actualizar la lista eliminando el registro localmente
      console.log('🔄 Actualizando lista local...');
      setHistoryData(prevData => {
        const newData = prevData.filter(entry => entry.id !== entryId);
        console.log('🔄 Lista actualizada, nuevos elementos:', newData.length);
        return newData;
      });
      
      console.log('✅ Proceso de eliminación completado');
      console.log('🎉 ÉXITO: Registro eliminado exitosamente');
      
    } catch (error) {
      console.error('❌ Error eliminando registro:', error);
      console.error('❌ Error completo:', JSON.stringify(error, null, 2));
      
      // Usar el manejador de errores de autenticación
      const wasAuthError = await handleAuthError(error, { logout });
      if (wasAuthError) {
        console.log('🔐 Era un error de autenticación');
        return;
      }
      
      // Manejar otros tipos de errores
      let errorMessage = 'Error al eliminar el registro. Inténtalo nuevamente.';
      if (error instanceof ApiException) {
        console.log('❌ ApiException detectada:', error.status, error.detail);
        if (error.status === 404) {
          errorMessage = 'Registro no encontrado';
        } else {
          errorMessage = `Error: ${error.detail}`;
        }
      }
      
      console.log('🚨 ERROR PARA EL USUARIO:', errorMessage);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatFieldValue = (value: any, fieldType?: string): string => {
    if (value === null || value === undefined) {
      return 'Sin valor';
    }
    
    if (fieldType === 'boolean') {
      return value ? 'Sí' : 'No';
    }
    
    if (fieldType === 'date') {
      try {
        const date = new Date(value);
        return date.toLocaleDateString('es-ES');
      } catch {
        return String(value);
      }
    }
    
    return String(value);
  };

  const getFieldInfo = (fieldName: string) => {
    return template?.fields.find(field => field.name === fieldName);
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Cargando historial...</Text>
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
            <Text style={styles.headerTitle}>Historial</Text>
            {template && (
              <Text style={styles.headerSubtitle}>{template.name}</Text>
            )}
          </View>

          <View style={styles.headerButton} />
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={onRefresh}
              colors={['#4F46E5']}
            />
          }
        >
          {/* Estadísticas */}
          <View style={styles.statsSection}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{historyData.length}</Text>
              <Text style={styles.statLabel}>Total de registros</Text>
            </View>
          </View>

          {/* Lista de datos históricos */}
          {historyData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Sin registros</Text>
              <Text style={styles.emptySubtitle}>
                Aún no hay datos registrados para este template
              </Text>
            </View>
          ) : (
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Registros</Text>
              {historyData.map((entry, index) => (
                <View key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <View style={styles.entryHeaderLeft}>
                      <Text style={styles.entryDate}>
                        {formatDate(entry.created_at)}
                      </Text>
                      <Text style={styles.entryNumber}>#{historyData.length - index}</Text>
                    </View>
                    <View style={styles.actionButtonsContainer}>
                      <TouchableOpacity 
                        style={styles.editButton}
                        onPress={() => {
                          console.log('🔍 Botón editar presionado');
                          console.log('🔍 entry.id:', entry.id);
                          console.log('🔍 templateId:', templateId);
                          handleEditEntry(entry.id);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="create-outline" size={16} color="#4F46E5" />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.deleteButton}
                        onPress={() => {
                          console.log('🔍 Botón eliminar presionado');
                          console.log('🔍 entry.id:', entry.id);
                          console.log('🔍 index:', index);
                          deleteEntry(entry.id);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.entryData}>
                    {Object.entries(entry.values).map(([fieldName, value]) => {
                      const fieldInfo = getFieldInfo(fieldName);
                      return (
                        <View key={fieldName} style={styles.fieldRow}>
                          <Text style={styles.fieldName}>
                            {fieldName}
                            {fieldInfo?.display_unit && (
                              <Text style={styles.fieldUnit}> ({fieldInfo.display_unit})</Text>
                            )}
                          </Text>
                          <Text style={styles.fieldValue}>
                            {formatFieldValue(value, fieldInfo?.type)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}
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
  statsSection: {
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  historySection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  entryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entryDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  entryNumber: {
    fontSize: 12,
    color: '#9CA3AF',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  entryData: {
    gap: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  fieldUnit: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
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
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});