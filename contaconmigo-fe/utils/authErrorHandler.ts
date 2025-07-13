import { router } from 'expo-router';
import { ApiException } from '../services/api';
import { isTokenExpired } from './jwtUtils';

export interface AuthErrorHandlerOptions {
  logout: () => Promise<void>;
  redirectTo?: string;
  showModal?: boolean;
}

// Función para manejar errores de autenticación de manera consistente
export async function handleAuthError(
  error: any,
  options: AuthErrorHandlerOptions
): Promise<boolean> {
  const { logout, redirectTo = '/login', showModal = false } = options;

  // Si es un error de API con código 401
  if (error instanceof ApiException && error.status === 401) {
    console.log('🔐 Error 401 detectado: Token inválido o expirado');
    
    try {
      await logout();
      console.log('✅ Sesión cerrada exitosamente');
      
      if (showModal) {
        // Aquí podrías mostrar un modal si fuera necesario
        console.log('📱 Mostrando modal de sesión expirada');
      }
      
      router.replace(redirectTo);
      return true; // Indica que se manejó el error de autenticación
    } catch (logoutError) {
      console.error('❌ Error cerrando sesión:', logoutError);
      router.replace(redirectTo);
      return true;
    }
  }

  return false; // No era un error de autenticación
}

// Función para verificar y manejar tokens expirados proactivamente
export async function checkAndHandleExpiredToken(
  token: string,
  options: AuthErrorHandlerOptions
): Promise<boolean> {
  if (isTokenExpired(token)) {
    console.log('⚠️ Token expirado detectado proactivamente');
    
    try {
      await options.logout();
      console.log('✅ Sesión cerrada por token expirado');
      
      router.replace(options.redirectTo || '/login');
      return true; // Token estaba expirado y se manejó
    } catch (error) {
      console.error('❌ Error cerrando sesión por token expirado:', error);
      router.replace(options.redirectTo || '/login');
      return true;
    }
  }

  return false; // Token no estaba expirado
}

// Función para obtener un mensaje de error amigable
export function getAuthErrorMessage(error: any): string {
  if (error instanceof ApiException) {
    switch (error.status) {
      case 401:
        return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
      case 403:
        return 'No tienes permisos para realizar esta acción.';
      case 404:
        return 'El recurso solicitado no fue encontrado.';
      case 500:
        return 'Error interno del servidor. Inténtalo más tarde.';
      default:
        return error.detail || 'Error desconocido del servidor.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Error desconocido. Inténtalo nuevamente.';
}

// Función para crear un manejador de errores reutilizable
export function createAuthErrorHandler(options: AuthErrorHandlerOptions) {
  return async (error: any): Promise<boolean> => {
    return handleAuthError(error, options);
  };
} 