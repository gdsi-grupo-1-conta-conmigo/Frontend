import { authStorage } from '../services/authStorage';
import { getTokenInfo } from './jwtUtils';

export async function debugAuthState() {
  console.log('🔍 === DEBUG AUTH STATE ===');
  
  try {
    // Verificar tokens
    const accessToken = await authStorage.getAccessToken();
    const refreshToken = await authStorage.getRefreshToken();
    
    console.log('🔑 Access Token:', accessToken ? 'Presente' : 'Ausente');
    console.log('🔄 Refresh Token:', refreshToken ? 'Presente' : 'Ausente');
    
    // Analizar token JWT si existe
    if (accessToken) {
      const tokenInfo = getTokenInfo(accessToken);
      console.log('🕒 Análisis del token JWT:');
      console.log('   isExpired:', tokenInfo.isExpired);
      console.log('   timeToExpiry (segundos):', tokenInfo.timeToExpiry);
      console.log('   willExpireSoon:', tokenInfo.willExpireSoon);
      
      if (tokenInfo.payload) {
        console.log('📋 Payload del token:');
        console.log('   sub (user_id):', tokenInfo.payload.sub);
        console.log('   email:', tokenInfo.payload.email);
        console.log('   iat (issued at):', new Date(tokenInfo.payload.iat * 1000).toLocaleString());
        console.log('   exp (expires at):', new Date(tokenInfo.payload.exp * 1000).toLocaleString());
        console.log('   aud (audience):', tokenInfo.payload.aud);
      }
    }
    
    // Verificar datos del usuario
    const userData = await authStorage.getUserData();
    console.log('👤 User Data:', userData ? `Usuario: ${userData.email}` : 'Ausente');
    
    // Verificar estado de login
    const isLoggedIn = await authStorage.isLoggedIn();
    console.log('✅ Is Logged In:', isLoggedIn);
    
    // Verificar sesión completa
    const session = await authStorage.getSession();
    console.log('📋 Session Summary:', {
      hasTokens: !!session.tokens,
      hasUser: !!session.userData,
      isLoggedIn: session.isLoggedIn
    });
    
    return {
      accessToken: !!accessToken,
      refreshToken: !!refreshToken,
      userData: !!userData,
      isLoggedIn,
      session
    };
  } catch (error) {
    console.error('❌ Error debugging auth state:', error);
    return null;
  }
}

// Función para limpiar y resetear el estado de autenticación
export async function resetAuthState() {
  console.log('🔄 Reseteando estado de autenticación...');
  try {
    await authStorage.clearSession();
    console.log('✅ Estado de autenticación limpiado');
  } catch (error) {
    console.error('❌ Error limpiando estado:', error);
  }
} 