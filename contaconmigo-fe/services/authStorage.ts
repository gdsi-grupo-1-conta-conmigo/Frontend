import AsyncStorage from '@react-native-async-storage/async-storage';

// Claves para el almacenamiento
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  LOGIN_STATUS: 'login_status',
};

export interface UserData {
  id: string;
  email: string;
  user_metadata?: any;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
}

// Servicio para manejar el almacenamiento de autenticación
export const authStorage = {
  // Guardar tokens de autenticación
  async saveTokens(tokens: AuthTokens): Promise<void> {
    try {
      console.log('💾 Guardando access token en storage...');
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
      if (tokens.refresh_token) {
        console.log('💾 Guardando refresh token en storage...');
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
      }
      console.log('✅ Tokens guardados exitosamente');
    } catch (error) {
      console.error('❌ Error guardando tokens:', error);
      throw new Error('No se pudieron guardar los tokens de autenticación');
    }
  },

  // Obtener token de acceso
  async getAccessToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      console.log('🔑 Token recuperado del storage:', token ? 'Token encontrado' : 'Token no encontrado');
      return token;
    } catch (error) {
      console.error('❌ Error obteniendo access token:', error);
      return null;
    }
  },

  // Obtener token de refresh
  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error obteniendo refresh token:', error);
      return null;
    }
  },

  // Guardar datos del usuario
  async saveUserData(userData: UserData): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    } catch (error) {
      console.error('Error guardando datos del usuario:', error);
      throw new Error('No se pudieron guardar los datos del usuario');
    }
  },

  // Obtener datos del usuario
  async getUserData(): Promise<UserData | null> {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error obteniendo datos del usuario:', error);
      return null;
    }
  },

  // Marcar como logueado
  async setLoginStatus(isLoggedIn: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LOGIN_STATUS, isLoggedIn.toString());
    } catch (error) {
      console.error('Error guardando estado de login:', error);
    }
  },

  // Verificar si está logueado
  async isLoggedIn(): Promise<boolean> {
    try {
      const status = await AsyncStorage.getItem(STORAGE_KEYS.LOGIN_STATUS);
      const hasToken = await this.getAccessToken();
      return status === 'true' && hasToken !== null;
    } catch (error) {
      console.error('Error verificando estado de login:', error);
      return false;
    }
  },

  // Guardar sesión completa después del login
  async saveLoginSession(tokens: AuthTokens, userData: UserData): Promise<void> {
    try {
      await Promise.all([
        this.saveTokens(tokens),
        this.saveUserData(userData),
        this.setLoginStatus(true)
      ]);
    } catch (error) {
      console.error('Error guardando sesión de login:', error);
      throw new Error('No se pudo guardar la sesión de usuario');
    }
  },

  // Limpiar toda la sesión (logout)
  async clearSession(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.LOGIN_STATUS,
      ]);
    } catch (error) {
      console.error('Error limpiando sesión:', error);
      throw new Error('No se pudo limpiar la sesión');
    }
  },

  // Obtener todos los datos de la sesión
  async getSession(): Promise<{
    tokens: AuthTokens | null;
    userData: UserData | null;
    isLoggedIn: boolean;
  }> {
    try {
      const [accessToken, refreshToken, userData, isLoggedIn] = await Promise.all([
        this.getAccessToken(),
        this.getRefreshToken(),
        this.getUserData(),
        this.isLoggedIn()
      ]);

      const tokens = accessToken ? {
        access_token: accessToken,
        refresh_token: refreshToken || undefined
      } : null;

      return {
        tokens,
        userData,
        isLoggedIn
      };
    } catch (error) {
      console.error('Error obteniendo sesión:', error);
      return {
        tokens: null,
        userData: null,
        isLoggedIn: false
      };
    }
  }
}; 