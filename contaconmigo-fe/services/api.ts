import { API_CONFIG, getApiUrl } from '../config/api';

// Configuración base de la API
const API_BASE_URL = API_CONFIG.BASE_URL;

// Tipos para las respuestas de la API
export interface SignUpRequest {
  email: string;
  password: string;
}

export interface SignUpResponse {
  message: string;
  user_id?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  access_token: string;
  refresh_token?: string;
  user: {
    id: string;
    email: string;
    user_metadata: any;
  };
}

export interface ApiError {
  detail: string;
}

// Clase para manejar errores de la API
export class ApiException extends Error {
  constructor(public status: number, public detail: string) {
    super(detail);
    this.name = 'ApiException';
  }
}

// Función helper para hacer peticiones HTTP
async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    console.log('🌐 Realizando petición a:', url);
    console.log('🌐 Config:', { ...config, headers: { ...config.headers, Authorization: config.headers?.Authorization ? '[HIDDEN]' : undefined } });
    
    console.log('🌐 Iniciando fetch...');
    const response = await fetch(url, config);
    
    console.log('📡 Respuesta del servidor:', response.status, response.statusText);
    console.log('📡 Response ok:', response.ok);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.log('❌ Response no ok, intentando leer error...');
      try {
        const errorData: ApiError = await response.json();
        console.log('❌ Error del servidor:', errorData);
        throw new ApiException(response.status, errorData.detail);
      } catch (jsonError) {
        console.log('❌ Error parseando JSON de error:', jsonError);
        const errorText = await response.text();
        console.log('❌ Error como texto:', errorText);
        throw new ApiException(response.status, errorText || 'Error del servidor');
      }
    }
    
    console.log('✅ Response ok, parseando JSON...');
    const responseData = await response.json();
    console.log('✅ Respuesta exitosa:', responseData);
    return responseData;
  } catch (error) {
    console.error('❌ Error en makeRequest:', error);
    
    if (error instanceof ApiException) {
      throw error;
    }
    
    // Error de red o conexión
    console.error('❌ Error de conexión/red:', error);
    throw new ApiException(0, 'Error de conexión. Verifica tu conexión a internet.');
  }
}

// Tipos para templates
export interface Template {
  id: string;
  name: string;
  user_id: string;
  fields: Array<{
    name: string;
    type: string;
    display_unit?: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

export interface TemplatesResponse {
  templates: Template[];
}

// Servicios de autenticación
export const authService = {
  // Registro de usuario
  async signUp(data: SignUpRequest): Promise<SignUpResponse> {
    return makeRequest<SignUpResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Inicio de sesión
  async login(data: LoginRequest): Promise<LoginResponse> {
    return makeRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Cerrar sesión
  async logout(): Promise<{ message: string }> {
    return makeRequest<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  },

  // Solicitar restablecimiento de contraseña
  async forgotPassword(email: string): Promise<{ message: string }> {
    return makeRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Restablecer contraseña
  async resetPassword(accessToken: string, newPassword: string): Promise<{ message: string }> {
    return makeRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ 
        access_token: accessToken, 
        new_password: newPassword 
      }),
    });
  },
};

// Función helper para hacer peticiones autenticadas
async function makeAuthenticatedRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { authStorage } = await import('./authStorage');
  const { isTokenExpired, getTokenInfo } = await import('../utils/jwtUtils');
  
  let token = await authStorage.getAccessToken();
  
  console.log('🔑 Token obtenido:', token ? 'Token presente' : 'Token no encontrado');
  console.log('🌐 Endpoint:', endpoint);
  
  if (!token) {
    throw new ApiException(401, 'No hay token de autenticación disponible');
  }

  // Verificar si el token está expirado
  const tokenInfo = getTokenInfo(token);
  console.log('🕒 Información del token:', {
    isExpired: tokenInfo.isExpired,
    timeToExpiry: tokenInfo.timeToExpiry,
    willExpireSoon: tokenInfo.willExpireSoon
  });

  if (tokenInfo.isExpired) {
    console.log('⚠️ Token expirado, intentando renovar...');
    
    // Intentar renovar el token
    try {
      const newToken = await refreshAccessToken();
      if (newToken) {
        token = newToken;
        console.log('✅ Token renovado exitosamente');
      } else {
        console.log('❌ No se pudo renovar el token');
        throw new ApiException(401, 'Token expirado y no se pudo renovar');
      }
    } catch (error) {
      console.error('❌ Error renovando token:', error);
      throw new ApiException(401, 'Token expirado y no se pudo renovar');
    }
  }
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  };

  try {
    console.log('🌐 makeAuthenticatedRequest - Realizando petición...');
    const result = await makeRequest<T>(endpoint, config);
    console.log('✅ makeAuthenticatedRequest - Petición exitosa:', result);
    return result;
  } catch (error) {
    console.error('❌ makeAuthenticatedRequest - Error en petición:', error);
    
    // Si recibimos un 401, podría ser que el token se haya invalidado
    if (error instanceof ApiException && error.status === 401) {
      console.log('🔄 Recibido 401, intentando renovar token...');
      
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          // Reintentar la petición con el nuevo token
          const retryConfig: RequestInit = {
            ...options,
            headers: {
              ...options.headers,
              'Authorization': `Bearer ${newToken}`,
            },
          };
          console.log('🔄 Reintentando petición con token renovado...');
          const retryResult = await makeRequest<T>(endpoint, retryConfig);
          console.log('✅ Petición exitosa después de renovar token:', retryResult);
          return retryResult;
        }
      } catch (refreshError) {
        console.error('❌ Error renovando token después de 401:', refreshError);
      }
    }
    
    throw error;
  }
}

// Función para renovar el access token usando el refresh token
async function refreshAccessToken(): Promise<string | null> {
  try {
    const { authStorage } = await import('./authStorage');
    const refreshToken = await authStorage.getRefreshToken();
    
    if (!refreshToken) {
      console.log('❌ No hay refresh token disponible');
      return null;
    }

    console.log('🔄 Renovando token con refresh token...');
    
    // Hacer petición para renovar el token
    // Nota: Supabase maneja el refresh automáticamente, pero podemos implementar
    // una lógica personalizada aquí si es necesario
    
    // Por ahora, simplemente devolvemos null para forzar el re-login
    // En el futuro, podríamos implementar una llamada específica al backend
    return null;
    
  } catch (error) {
    console.error('❌ Error en refreshAccessToken:', error);
    return null;
  }
}

// Servicios de templates
export const templatesService = {
  // Obtener lista de templates del usuario
  async getTemplates(): Promise<TemplatesResponse> {
    return makeAuthenticatedRequest<TemplatesResponse>('/templates');
  },

  // Crear un nuevo template
  async createTemplate(templateData: {
    name: string;
    fields: Array<{
      name: string;
      type: string;
      display_unit?: string;
    }>;
  }): Promise<{ message: string; template_id: string }> {
    console.log('🚀 Enviando datos al backend:', templateData);
    console.log('🚀 Body serializado:', JSON.stringify(templateData));
    
    return makeAuthenticatedRequest<{ message: string; template_id: string }>('/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
  },

  // Obtener detalles de un template específico
  async getTemplate(templateId: string): Promise<Template> {
    const response = await makeAuthenticatedRequest<{
      template_id: string;
      name: string;
      fields: Array<{
        name: string;
        type: string;
        display_unit?: string;
      }>;
    }>(`/templates/${templateId}`);
    
    // Convertir la respuesta del backend al formato esperado por el frontend
    return {
      id: response.template_id,
      name: response.name,
      user_id: '', // No se devuelve desde el backend, pero no es necesario para la vista
      fields: response.fields,
      created_at: undefined,
      updated_at: undefined,
    };
  },

  // Eliminar un template
  async deleteTemplate(templateId: string, force: boolean = false): Promise<{ message: string }> {
    const endpoint = `/templates/${templateId}${force ? '?force=true' : ''}`;
    console.log('🗑️ deleteTemplate iniciado');
    console.log('🗑️ templateId:', templateId);
    console.log('🗑️ templateId tipo:', typeof templateId);
    console.log('🗑️ templateId length:', templateId?.length);
    console.log('🗑️ force:', force);
    console.log('🗑️ endpoint:', endpoint);
    console.log('🗑️ API_BASE_URL:', API_BASE_URL);
    console.log('🗑️ URL completa:', `${API_BASE_URL}${endpoint}`);
    
    try {
      console.log('🗑️ Llamando a makeAuthenticatedRequest...');
      const result = await makeAuthenticatedRequest<{ message: string }>(endpoint, {
        method: 'DELETE',
      });
      console.log('✅ deleteTemplate exitoso:', result);
      return result;
    } catch (error) {
      console.error('❌ Error en deleteTemplate:', error);
      console.error('❌ Error tipo:', typeof error);
      console.error('❌ Error instanceof ApiException:', error instanceof ApiException);
      if (error instanceof ApiException) {
        console.error('❌ ApiException status:', error.status);
        console.error('❌ ApiException detail:', error.detail);
      }
      throw error;
    }
  },

  async submitTemplateData(templateId: string, data: { values: { [key: string]: any } }): Promise<{ message: string }> {
    const endpoint = `/templates/${templateId}/data`;
    console.log('📝 submitTemplateData iniciado');
    console.log('📝 templateId:', templateId);
    console.log('📝 data:', data);
    console.log('📝 endpoint:', endpoint);
    
    try {
      console.log('📝 Llamando a makeAuthenticatedRequest...');
      const result = await makeAuthenticatedRequest<{ message: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      console.log('✅ submitTemplateData exitoso:', result);
      return result;
    } catch (error) {
      console.error('❌ Error en submitTemplateData:', error);
      console.error('❌ Error tipo:', typeof error);
      console.error('❌ Error instanceof ApiException:', error instanceof ApiException);
      if (error instanceof ApiException) {
        console.error('❌ ApiException status:', error.status);
        console.error('❌ ApiException detail:', error.detail);
      }
      throw error;
    }
  },
};

// Función para verificar si el servidor está disponible
export async function checkServerHealth(): Promise<boolean> {
  try {
    await makeRequest('/health');
    return true;
  } catch {
    return false;
  }
} 