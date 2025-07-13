import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function IndexScreen() {
  const { isLoggedIn, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isLoggedIn) {
        router.replace('/home');
      } else {
        router.replace('/login');
      }
    }
  }, [isLoggedIn, isLoading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4F46E5" />
      <Text style={styles.loadingText}>Cargando Conta conmigo...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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