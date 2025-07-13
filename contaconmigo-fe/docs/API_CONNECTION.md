# Conexión con la API Backend

Este documento explica cómo está configurada la conexión entre el frontend (React Native) y el backend (FastAPI).

## Configuración

### 1. Configuración de la API

La configuración de la API se encuentra en `config/api.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: __DEV__ 
    ? 'http://localhost:8000'  // Desarrollo
    : 'https://tu-backend-produccion.com', // Producción
  TIMEOUT: 10000,
  ENDPOINTS: { ... }
};
```

### 2. Servicios de API

Los servicios de API están en `services/api.ts` y proporcionan:

- **authService.signUp()**: Registro de usuarios
- **authService.login()**: Inicio de sesión
- **authService.logout()**: Cerrar sesión
- **authService.forgotPassword()**: Solicitar restablecimiento de contraseña
- **authService.resetPassword()**: Restablecer contraseña

## Uso en Componentes

### Registro de Usuario

```typescript
import { authService, ApiException } from '../services/api';

const handleRegister = async () => {
  try {
    const response = await authService.signUp({
      email: email.trim(),
      password: password
    });
    
    // Manejar respuesta exitosa
    Alert.alert('Registro exitoso', response.message);
    
  } catch (error) {
    if (error instanceof ApiException) {
      // Manejar errores específicos del backend
      Alert.alert('Error', error.detail);
    }
  }
};
```

## Manejo de Errores

La clase `ApiException` proporciona información detallada sobre errores:

- **status**: Código de estado HTTP
- **detail**: Mensaje de error del backend

### Códigos de Error Comunes

- **400**: Datos inválidos
- **401**: No autorizado
- **409**: Conflicto (ej: usuario ya existe)
- **500**: Error del servidor
- **0**: Error de conexión

## Configuración del Backend

Asegúrate de que tu backend esté configurado correctamente:

### 1. CORS

El backend debe tener CORS habilitado para permitir conexiones desde el frontend:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. Endpoints Disponibles

- `POST /auth/signup`: Registro de usuario
- `POST /auth/login`: Inicio de sesión
- `POST /auth/logout`: Cerrar sesión
- `POST /auth/forgot-password`: Solicitar restablecimiento
- `POST /auth/reset-password`: Restablecer contraseña
- `GET /health`: Verificar estado del servidor

## Desarrollo Local

### 1. Iniciar el Backend

```bash
cd core
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Configurar el Frontend

El frontend automáticamente usará `http://localhost:8000` en desarrollo.

### 3. Verificar Conexión

Puedes usar la función `checkServerHealth()` para verificar si el backend está disponible:

```typescript
import { checkServerHealth } from '../services/api';

const isServerUp = await checkServerHealth();
```

## Producción

Para producción, actualiza la URL en `config/api.ts`:

```typescript
BASE_URL: 'https://tu-backend-produccion.com'
```

## Troubleshooting

### Error de Conexión

1. Verifica que el backend esté ejecutándose
2. Confirma que la URL sea correcta
3. Revisa la configuración de CORS
4. Verifica la conectividad de red

### Errores de Autenticación

1. Confirma que los datos enviados sean correctos
2. Verifica que el endpoint del backend esté funcionando
3. Revisa los logs del backend para más detalles

## Próximos Pasos

- [ ] Implementar almacenamiento de tokens de autenticación
- [ ] Agregar interceptores para manejar tokens expirados
- [ ] Implementar retry automático para requests fallidos
- [ ] Agregar logging de requests para debugging 