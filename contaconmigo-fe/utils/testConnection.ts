import { checkServerHealth, authService, ApiException } from '../services/api';

// Función para probar la conexión con el backend
export async function testBackendConnection(): Promise<{
  isHealthy: boolean;
  message: string;
  details?: any;
}> {
  try {
    // Probar endpoint de health
    const isHealthy = await checkServerHealth();
    
    if (isHealthy) {
      return {
        isHealthy: true,
        message: 'Conexión exitosa con el backend',
        details: {
          url: 'http://localhost:8000',
          timestamp: new Date().toISOString()
        }
      };
    } else {
      return {
        isHealthy: false,
        message: 'El servidor no está respondiendo correctamente'
      };
    }
  } catch (error) {
    return {
      isHealthy: false,
      message: 'Error al conectar con el backend',
      details: {
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    };
  }
}

// Función para probar el endpoint de registro con datos de prueba
export async function testSignupEndpoint(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    // Usar un email de prueba único
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    const response = await authService.signUp({
      email: testEmail,
      password: testPassword
    });
    
    return {
      success: true,
      message: 'Endpoint de registro funcionando correctamente',
      details: {
        response: response,
        testEmail: testEmail
      }
    };
  } catch (error) {
    if (error instanceof ApiException) {
      return {
        success: false,
        message: `Error en endpoint de registro: ${error.detail}`,
        details: {
          status: error.status,
          detail: error.detail
        }
      };
    }
    
    return {
      success: false,
      message: 'Error desconocido en endpoint de registro',
      details: {
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    };
  }
}

// Función para ejecutar todas las pruebas
export async function runAllTests(): Promise<{
  healthCheck: any;
  signupTest: any;
  summary: {
    passed: number;
    failed: number;
    total: number;
  };
}> {
  console.log('🧪 Iniciando pruebas de conexión con el backend...');
  
  // Probar health check
  console.log('1. Probando health check...');
  const healthCheck = await testBackendConnection();
  console.log(healthCheck.isHealthy ? '✅ Health check pasó' : '❌ Health check falló');
  
  // Probar endpoint de registro
  console.log('2. Probando endpoint de registro...');
  const signupTest = await testSignupEndpoint();
  console.log(signupTest.success ? '✅ Signup test pasó' : '❌ Signup test falló');
  
  // Resumen
  const passed = (healthCheck.isHealthy ? 1 : 0) + (signupTest.success ? 1 : 0);
  const total = 2;
  const failed = total - passed;
  
  console.log(`\n📊 Resumen: ${passed}/${total} pruebas pasaron`);
  
  return {
    healthCheck,
    signupTest,
    summary: {
      passed,
      failed,
      total
    }
  };
} 