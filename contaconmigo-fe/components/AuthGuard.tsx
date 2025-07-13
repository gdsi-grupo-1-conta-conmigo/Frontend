import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean; // Si true, requiere estar logueado
  redirectTo?: string; // A dónde redirigir si no cumple la condición
}

export default function AuthGuard({ 
  children, 
  requireAuth = false, 
  redirectTo 
}: AuthGuardProps) {
  const { isLoggedIn, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !isLoggedIn) {
        // Requiere autenticación pero no está logueado
        router.replace(redirectTo || '/login');
      } else if (!requireAuth && isLoggedIn) {
        // No requiere autenticación pero está logueado
        router.replace(redirectTo || '/home');
      }
    }
  }, [isLoggedIn, isLoading, requireAuth, redirectTo]);

  // Mostrar loading mientras se verifica el estado
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Verificando sesión...</Text>
      </View>
    );
  }

  // Si requiere auth y no está logueado, no mostrar nada (se redirige)
  if (requireAuth && !isLoggedIn) {
    return null;
  }

  // Si no requiere auth y está logueado, no mostrar nada (se redirige)
  if (!requireAuth && isLoggedIn) {
    return null;
  }

  return <>{children}</>;
}

// Componente específico para rutas protegidas
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth={true} redirectTo="/login">
      {children}
    </AuthGuard>
  );
}

// Componente específico para rutas públicas (login, register)
export function PublicRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth={false} redirectTo="/home">
      {children}
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
}); 