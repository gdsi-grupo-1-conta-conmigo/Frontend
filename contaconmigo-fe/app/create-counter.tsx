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
  name?: string;
  description?: string;
}

export default function CreateCounterScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [initialValue, setInitialValue] = useState('0');
  const [selectedIcon, setSelectedIcon] = useState('calculator');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Iconos disponibles para los contadores
  const availableIcons = [
    { name: 'calculator', label: 'Calculadora' },
    { name: 'water', label: 'Agua' },
    { name: 'fitness', label: 'Ejercicio' },
    { name: 'book', label: 'Libros' },
    { name: 'time', label: 'Tiempo' },
    { name: 'restaurant', label: 'Comida' },
    { name: 'car', label: 'Transporte' },
    { name: 'heart', label: 'Salud' },
    { name: 'school', label: 'Estudio' },
    { name: 'game-controller', label: 'Juegos' },
    { name: 'musical-notes', label: 'Música' },
    { name: 'camera', label: 'Fotos' },
  ];

  const handleCreateCounter = async () => {
    const newErrors: FormErrors = {};

    // Validar nombre
    if (!name.trim()) {
      newErrors.name = 'El nombre del contador es requerido';
    } else if (name.trim().length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    }

    setErrors(newErrors);

    // Si no hay errores, crear el contador
    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      try {
        // Aquí iría la lógica para crear el contador
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const counterData = {
          name: name.trim(),
          description: description.trim(),
          initialValue: parseInt(initialValue) || 0,
          icon: selectedIcon,
        };
        
        console.log('Nuevo contador:', counterData);
        
        Alert.alert(
          'Contador Creado',
          '¡Tu nuevo contador ha sido creado exitosamente!',
          [{ 
            text: 'OK', 
            onPress: () => router.back() 
          }]
        );
      } catch (error) {
        Alert.alert('Error', 'Hubo un problema al crear el contador. Inténtalo nuevamente.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleInitialValueChange = (text: string) => {
    // Solo permitir números
    const numericValue = text.replace(/[^0-9]/g, '');
    setInitialValue(numericValue);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Información del Contador */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Contador</Text>
          
          <FormInput
            label="Nombre del Contador"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) {
                setErrors(prev => ({ ...prev, name: undefined }));
              }
            }}
            error={errors.name}
            icon="text-outline"
            placeholder="Ej: Vasos de agua, Ejercicios, etc."
          />

          <FormInput
            label="Descripción (Opcional)"
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (errors.description) {
                setErrors(prev => ({ ...prev, description: undefined }));
              }
            }}
            error={errors.description}
            icon="document-text-outline"
            placeholder="Una breve descripción de qué vas a contar"
            containerStyle={{ marginBottom: 0 }}
          />

          <FormInput
            label="Valor Inicial"
            value={initialValue}
            onChangeText={handleInitialValueChange}
            icon="calculator-outline"
            placeholder="0"
            keyboardType="numeric"
            containerStyle={{ marginBottom: 0 }}
          />
        </View>

        {/* Selección de Icono */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecciona un Icono</Text>
          <View style={styles.iconGrid}>
            {availableIcons.map((icon) => (
              <TouchableOpacity
                key={icon.name}
                style={[
                  styles.iconOption,
                  selectedIcon === icon.name && styles.selectedIconOption
                ]}
                onPress={() => setSelectedIcon(icon.name)}
              >
                <Ionicons 
                  name={icon.name as any} 
                  size={24} 
                  color={selectedIcon === icon.name ? '#FFFFFF' : '#4F46E5'} 
                />
                <Text style={[
                  styles.iconLabel,
                  selectedIcon === icon.name && styles.selectedIconLabel
                ]}>
                  {icon.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Vista Previa */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vista Previa</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewInfo}>
              <Text style={styles.previewName}>
                {name.trim() || 'Nombre del contador'}
              </Text>
              <Text style={styles.previewDescription}>
                {description.trim() || 'Contador personal'}
              </Text>
            </View>
            <View style={styles.previewValue}>
              <Ionicons 
                name={selectedIcon as any} 
                size={20} 
                color="#FFFFFF" 
                style={styles.previewIcon}
              />
              <Text style={styles.previewNumber}>
                {initialValue || '0'}
              </Text>
            </View>
          </View>
        </View>

        {/* Botón Crear */}
        <TouchableOpacity 
          style={[styles.createButton, isLoading && styles.disabledButton]}
          onPress={handleCreateCounter}
          disabled={isLoading}
        >
          <Text style={styles.createButtonText}>
            {isLoading ? 'Creando...' : 'Crear Contador'}
          </Text>
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
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconOption: {
    width: '22%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  selectedIconOption: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  iconLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  selectedIconLabel: {
    color: '#FFFFFF',
  },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  previewInfo: {
    flex: 1,
    justifyContent: 'center',
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
  },
  previewValue: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    minWidth: 60,
    height: 60,
    paddingHorizontal: 8,
  },
  previewIcon: {
    marginRight: 4,
  },
  previewNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
}); 