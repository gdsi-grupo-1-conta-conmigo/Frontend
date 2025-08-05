// Configuración de la API
export const API_CONFIG = {
  // URL base del backend
  BASE_URL: __DEV__ 
    ? 'http://localhost:8000'  // Desarrollo
    : process.env.EXPO_PUBLIC_API_URL || 'https://tu-backend-produccion.com', // Producción
  
  // Timeouts
  TIMEOUT: 10000, // 10 segundos
  
  // Endpoints
  ENDPOINTS: {
    AUTH: {
      SIGNUP: '/auth/signup',
      LOGIN: '/auth/login',
      LOGOUT: '/auth/logout',
      FORGOT_PASSWORD: '/auth/forgot-password',
      RESET_PASSWORD: '/auth/reset-password',
    },
    HEALTH: '/health',
  },
};

// Función para obtener la URL completa de un endpoint
export function getApiUrl(endpoint: string): string {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}

// Función para verificar si estamos en desarrollo
export function isDevelopment(): boolean {
  return __DEV__;
} 