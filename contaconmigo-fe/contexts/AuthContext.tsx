import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authStorage, UserData, AuthTokens } from '../services/authStorage';

interface AuthContextType {
  // Estado de autenticación
  isLoggedIn: boolean;
  isLoading: boolean;
  user: UserData | null;
  tokens: AuthTokens | null;
  
  // Métodos
  login: (tokens: AuthTokens, userData: UserData) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);

  // Inicializar el estado de autenticación al cargar la app
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Verificar el estado de autenticación
  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const session = await authStorage.getSession();
      
      if (session.isLoggedIn && session.tokens && session.userData) {
        // Verificar si el token está expirado
        const { isTokenExpired } = await import('../utils/jwtUtils');
        const tokenExpired = isTokenExpired(session.tokens.access_token);
        
        if (tokenExpired) {
          console.log('⚠️ Token expirado durante checkAuthStatus, cerrando sesión...');
          await logout();
        } else {
          setIsLoggedIn(true);
          setUser(session.userData);
          setTokens(session.tokens);
        }
      } else {
        setIsLoggedIn(false);
        setUser(null);
        setTokens(null);
      }
    } catch (error) {
      console.error('Error verificando estado de autenticación:', error);
      setIsLoggedIn(false);
      setUser(null);
      setTokens(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Iniciar sesión
  const login = async (newTokens: AuthTokens, userData: UserData) => {
    try {
      console.log('🔄 Guardando sesión en storage...');
      await authStorage.saveLoginSession(newTokens, userData);
      console.log('✅ Sesión guardada exitosamente');
      setIsLoggedIn(true);
      setUser(userData);
      setTokens(newTokens);
    } catch (error) {
      console.error('❌ Error en login:', error);
      throw error;
    }
  };

  // Cerrar sesión
  const logout = async () => {
    try {
      await authStorage.clearSession();
      setIsLoggedIn(false);
      setUser(null);
      setTokens(null);
    } catch (error) {
      console.error('Error en logout:', error);
      throw error;
    }
  };

  // Refrescar sesión (útil para cuando se actualiza un token)
  const refreshSession = async () => {
    await checkAuthStatus();
  };

  const value: AuthContextType = {
    isLoggedIn,
    isLoading,
    user,
    tokens,
    login,
    logout,
    refreshSession,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usar el contexto de autenticación
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

// Hook para verificar si el usuario está autenticado
export function useIsAuthenticated(): boolean {
  const { isLoggedIn } = useAuth();
  return isLoggedIn;
}

// Hook para obtener los datos del usuario
export function useUser(): UserData | null {
  const { user } = useAuth();
  return user;
}

// Hook para obtener los tokens
export function useTokens(): AuthTokens | null {
  const { tokens } = useAuth();
  return tokens;
} 