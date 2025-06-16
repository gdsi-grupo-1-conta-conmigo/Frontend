import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface Counter {
  id: string;
  name: string;
  count: number;
}

export default function HomeScreen() {
  // Estado simulado de contadores del usuario
  const [counters, setCounters] = useState<Counter[]>([
    { id: '1', name: 'Vasos de agua', count: 5 },
    { id: '2', name: 'Ejercicios completados', count: 12 },
    { id: '3', name: 'Libros leídos', count: 3 },
    { id: '4', name: 'Horas de estudio', count: 25 },
  ]);

  const handleHomePress = () => {
    // Ya estamos en Home, pero podríamos hacer scroll to top
    console.log('Navegando a Home');
  };

  const handleEditProfile = () => {
    router.push('/profile');
  };

  const handleCreateCounter = () => {
    router.push('/create-counter');
  };

  // Función removida - los contadores ya no se incrementan al tocar

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleHomePress}
        >
          <Ionicons name="calculator" size={24} color="#4F46E5" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Mis Contadores</Text>

        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleEditProfile}
        >
          <Ionicons name="settings" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {/* Body - Lista de Contadores */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {counters.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calculator-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>¡Comienza a contar!</Text>
            <Text style={styles.emptySubtitle}>
              Crea tu primer contador para empezar a llevar registro de lo que más te importa
            </Text>
          </View>
        ) : (
          <View style={styles.countersList}>
            {counters.map((counter) => (
              <View
                key={counter.id}
                style={styles.counterCard}
              >
                <View style={styles.counterInfo}>
                  <Text style={styles.counterName}>{counter.name}</Text>
                  <Text style={styles.counterDescription}>Contador personal</Text>
                </View>
                <View style={styles.counterValue}>
                  <Text style={styles.counterNumber}>{counter.count}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer - Botón Agregar */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleCreateCounter}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
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
  countersList: {
    paddingBottom: 100, // Espacio para el botón flotante
  },
  counterCard: {
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
  counterInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  counterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  counterDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  counterValue: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    minWidth: 60,
    height: 60,
  },
  counterNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
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
}); 