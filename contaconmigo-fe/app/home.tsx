import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
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
    Linking,
} from 'react-native';
import { ProtectedRoute } from '../components/AuthGuard';
import { useAuth } from '../contexts/AuthContext';
import { templatesService, Template, ApiException } from '../services/api';
import { debugAuthState } from '../utils/debugAuth';
import { handleAuthError, checkAndHandleExpiredToken } from '../utils/authErrorHandler';



export default function HomeScreen() {
  const { user, logout } = useAuth();
  
  // Estado de templates del usuario
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateCounters, setTemplateCounters] = useState<{ [templateId: string]: number }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar templates al montar el componente
  useEffect(() => {
    loadTemplates();
  }, []);

  // Actualizar templates cada vez que se enfoque la pantalla
  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [])
  );

  const loadTemplateCounters = async (templateList: Template[]) => {
    console.log('🔢 Cargando contadores para templates...');
    const counters: { [templateId: string]: number } = {};
    
    try {
      // Cargar contadores para cada template en paralelo
      const counterPromises = templateList.map(async (template) => {
        try {
          console.log(`🔢 Cargando contador para template: ${template.name} (${template.id})`);
          const sumResult = await templatesService.getTemplateSum(template.id);
          console.log(`✅ Contador cargado para ${template.name}:`, sumResult.total_cantidad);
          return { templateId: template.id, count: sumResult.total_cantidad };
        } catch (error) {
          console.error(`❌ Error cargando contador para template ${template.name}:`, error);
          // Si hay error, usar 0 como valor por defecto
          return { templateId: template.id, count: 0 };
        }
      });
      
      const results = await Promise.all(counterPromises);
      
      // Construir el objeto de contadores
      results.forEach(({ templateId, count }) => {
        counters[templateId] = count;
      });
      
      console.log('✅ Todos los contadores cargados:', counters);
      setTemplateCounters(counters);
      
    } catch (error) {
      console.error('❌ Error general cargando contadores:', error);
      // En caso de error general, mantener contadores vacíos
      setTemplateCounters({});
    }
  };

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Verificar si tenemos token antes de hacer la petición
      const { authStorage } = await import('../services/authStorage');
      const token = await authStorage.getAccessToken();
      console.log('🔍 Verificando token antes de cargar templates:', token ? 'Token presente' : 'Token ausente');
      
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
      
      const response = await templatesService.getTemplates();
      setTemplates(response.templates);
      
      // Cargar contadores para todos los templates
      await loadTemplateCounters(response.templates);
    } catch (error) {
      console.error('❌ Error cargando templates:', error);
      
      // Usar el manejador de errores de autenticación
      const wasAuthError = await handleAuthError(error, { logout });
      if (wasAuthError) {
        return; // Era un error de autenticación y ya se manejó
      }
      
      // Manejar otros tipos de errores
      if (error instanceof ApiException) {
        setError(`Error: ${error.detail}`);
      } else {
        setError('Error al cargar los templates. Inténtalo nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleHomePress = async () => {
    // Debug auth state y recargar templates
    await debugAuthState();
    loadTemplates();
  };

  const handleEditProfile = () => {
    router.push('/profile');
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleCreateTemplate = () => {
    router.push('/create-counter');
  };

  const handleTelegramBot = async () => {
    try {
      const telegramUrl = 'https://t.me/gdsi_conta_conmigo_bot';
      const canOpen = await Linking.canOpenURL(telegramUrl);
      
      if (canOpen) {
        await Linking.openURL(telegramUrl);
      } else {
        Alert.alert(
          'Error',
          'No se pudo abrir el enlace de Telegram. Asegúrate de tener Telegram instalado.'
        );
      }
    } catch (error) {
      console.error('Error abriendo enlace de Telegram:', error);
      Alert.alert('Error', 'No se pudo abrir el enlace de Telegram.');
    }
  };

  // Función removida - los contadores ya no se incrementan al tocar

  return (
    <ProtectedRoute>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleHomePress}
          >
            <Ionicons name="calculator" size={24} color="#4F46E5" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Mis Templates</Text>
            {user && (
              <Text style={styles.headerSubtitle}>¡Hola, {user.email}!</Text>
            )}
          </View>

          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

      {/* Body - Lista de Templates */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Cargando templates...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
            <Text style={styles.errorTitle}>Error al cargar</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadTemplates}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : templates.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>¡Crea tu primer template!</Text>
            <Text style={styles.emptySubtitle}>
              Los templates te ayudan a organizar y llevar registro de tus datos importantes
            </Text>
          </View>
        ) : (
          <View style={styles.templatesList}>
            {templates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={styles.templateCard}
                onPress={() => router.push(`/template-details?templateId=${template.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.templateInfo}>
                  <View style={styles.templateHeader}>
                    <Text style={styles.templateName}>{template.name}</Text>
                    <View style={styles.counterContainer}>
                      <Text style={styles.counterValue}>
                        {templateCounters[template.id] !== undefined 
                          ? templateCounters[template.id].toLocaleString() 
                          : '...'
                        }
                      </Text>
                      <Text style={styles.counterLabel}>Total</Text>
                    </View>
                  </View>
                  <Text style={styles.templateDescription}>
                    {template.fields.length} campo{template.fields.length !== 1 ? 's' : ''}
                  </Text>
                  <View style={styles.fieldsContainer}>
                    {template.fields.slice(0, 3).map((field, index) => (
                      <Text key={index} style={styles.fieldName}>
                        {field.name}
                        {field.display_unit && ` (${field.display_unit})`}
                      </Text>
                    ))}
                    {template.fields.length > 3 && (
                      <Text style={styles.moreFields}>
                        +{template.fields.length - 3} más
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.templateActions}>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer - Botones */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.telegramButton}
          onPress={handleTelegramBot}
          activeOpacity={0.8}
        >
          <Ionicons name="phone-portrait" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleCreateTemplate}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
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
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
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
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  templatesList: {
    paddingBottom: 100, // Espacio para el botón flotante
  },
  templateCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  templateInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  templateName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: 0.3,
    flex: 1,
  },
  counterContainer: {
    alignItems: 'flex-end',
    marginLeft: 16,
  },
  counterValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
  },
  counterLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  templateDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  fieldsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldName: {
    fontSize: 12,
    color: '#4F46E5',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  moreFields: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  templateActions: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 12,
  },

  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  telegramButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0088CC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0088CC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
}); 