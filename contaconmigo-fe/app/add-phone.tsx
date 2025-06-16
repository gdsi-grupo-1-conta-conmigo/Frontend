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
} from 'react-native';

interface FormErrors {
  phone?: string;
}

export default function AddPhoneScreen() {
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validatePhone = (phone: string): boolean => {
    // Validar formato de teléfono (permitir números, espacios, guiones y paréntesis)
    const phoneRegex = /^[\d\s\-\(\)\+]{8,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const formatPhone = (text: string) => {
    // Remover todos los caracteres que no sean números
    const cleaned = text.replace(/\D/g, '');
    
    // Limitar a 15 dígitos (estándar internacional)
    const limited = cleaned.slice(0, 15);
    
    // Formatear el número con espacios cada 3-4 dígitos
    if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 6) {
      return `${limited.slice(0, 3)} ${limited.slice(3)}`;
    } else if (limited.length <= 10) {
      return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6)}`;
    } else {
      return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6, 10)} ${limited.slice(10)}`;
    }
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhone(text);
    setPhone(formatted);
    
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: undefined }));
    }
  };

  const handleSavePhone = async () => {
    const newErrors: FormErrors = {};

    // Validar teléfono
    if (!phone.trim()) {
      newErrors.phone = 'El número de teléfono es requerido';
    } else if (!validatePhone(phone)) {
      newErrors.phone = 'Por favor ingresa un número de teléfono válido';
    } else if (phone.replace(/\D/g, '').length < 8) {
      newErrors.phone = 'El número debe tener al menos 8 dígitos';
    }

    setErrors(newErrors);

    // Si no hay errores, guardar
    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      try {
        // Aquí iría la lógica para guardar el número de teléfono
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const cleanPhone = phone.replace(/\D/g, '');
        console.log('Número telefónico guardado:', cleanPhone);
        
        Alert.alert(
          'Número Agregado',
          'Tu número de teléfono ha sido guardado exitosamente',
          [{ 
            text: 'OK', 
            onPress: () => router.back() 
          }]
        );
      } catch (error) {
        Alert.alert('Error', 'Hubo un problema al guardar el número. Inténtalo nuevamente.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Información */}
        <View style={styles.infoSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="call" size={32} color="#4F46E5" />
          </View>
          <Text style={styles.infoTitle}>Agregar Número Telefónico</Text>
          <Text style={styles.infoDescription}>
            Agrega tu número de teléfono para actualizar tus contadores mediante el bot de whatsapp.
          </Text>
        </View>

        {/* Formulario */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Teléfono</Text>
          
          <FormInput
            label="Número de Teléfono"
            value={phone}
            onChangeText={handlePhoneChange}
            error={errors.phone}
            icon="call-outline"
            placeholder="Ej: 123 456 7890"
            keyboardType="phone-pad"
          />

          

          <TouchableOpacity 
            style={[styles.saveButton, isLoading && styles.disabledButton]}
            onPress={handleSavePhone}
            disabled={isLoading}
          >
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Guardando...' : 'Guardar Número'}
            </Text>
          </TouchableOpacity>
        </View>

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
  infoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
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
  noteContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  noteText: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
}); 