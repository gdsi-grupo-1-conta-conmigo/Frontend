// Utilidades para manejar JWT tokens
export interface JWTPayload {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  email: string;
  phone?: string;
}

// Función para decodificar un JWT sin verificar la firma
export function decodeJWT(token: string): JWTPayload | null {
  try {
    // Un JWT tiene 3 partes separadas por puntos: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Token JWT inválido: no tiene 3 partes');
      return null;
    }

    // Decodificar la parte del payload (segunda parte)
    const payload = parts[1];
    
    // Agregar padding si es necesario para base64
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    
    // Decodificar de base64
    const decodedPayload = atob(paddedPayload);
    
    // Parsear JSON
    const parsedPayload: JWTPayload = JSON.parse(decodedPayload);
    
    return parsedPayload;
  } catch (error) {
    console.error('Error decodificando JWT:', error);
    return null;
  }
}

// Función para verificar si un token está expirado
export function isTokenExpired(token: string): boolean {
  try {
    const payload = decodeJWT(token);
    if (!payload) {
      return true; // Si no se puede decodificar, consideramos que está expirado
    }

    // exp está en segundos, Date.now() está en milisegundos
    const currentTime = Math.floor(Date.now() / 1000);
    const expirationTime = payload.exp;

    console.log('🕒 Verificando expiración del token:');
    console.log('   Tiempo actual:', currentTime);
    console.log('   Tiempo de expiración:', expirationTime);
    console.log('   Diferencia (segundos):', expirationTime - currentTime);

    return currentTime >= expirationTime;
  } catch (error) {
    console.error('Error verificando expiración del token:', error);
    return true; // En caso de error, consideramos que está expirado
  }
}

// Función para obtener el tiempo restante hasta la expiración (en segundos)
export function getTokenTimeToExpiry(token: string): number {
  try {
    const payload = decodeJWT(token);
    if (!payload) {
      return 0;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const expirationTime = payload.exp;
    const timeToExpiry = expirationTime - currentTime;

    return Math.max(0, timeToExpiry);
  } catch (error) {
    console.error('Error obteniendo tiempo de expiración:', error);
    return 0;
  }
}

// Función para verificar si un token expirará pronto (dentro de los próximos 5 minutos)
export function willTokenExpireSoon(token: string, thresholdMinutes: number = 5): boolean {
  const timeToExpiry = getTokenTimeToExpiry(token);
  const thresholdSeconds = thresholdMinutes * 60;
  
  return timeToExpiry <= thresholdSeconds;
}

// Función para obtener información del token
export function getTokenInfo(token: string): {
  payload: JWTPayload | null;
  isExpired: boolean;
  timeToExpiry: number;
  willExpireSoon: boolean;
} {
  const payload = decodeJWT(token);
  const isExpired = isTokenExpired(token);
  const timeToExpiry = getTokenTimeToExpiry(token);
  const willExpireSoon = willTokenExpireSoon(token);

  return {
    payload,
    isExpired,
    timeToExpiry,
    willExpireSoon
  };
} 