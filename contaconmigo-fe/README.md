# Conta conmigo - Frontend

**Conta conmigo** es una aplicación móvil de gestión financiera personal que te ayuda a llevar el control de tus gastos, ingresos y presupuestos de manera sencilla y segura.

## 📱 Características

- **Control Total**: Visualiza tus gastos e ingresos en tiempo real
- **Seguridad**: Datos protegidos con encriptación de nivel bancario
- **Reportes**: Insights detallados de tus hábitos financieros
- **Recordatorios**: Nunca olvides un pago importante

## 🚀 Pantallas Implementadas

### ✅ Pantalla de Inicio
- Landing page con información de la aplicación
- Navegación hacia registro de usuario
- Diseño moderno y atractivo

### ✅ Pantalla de Registro de Usuario
- Validación de correo electrónico
- Validación robusta de contraseña que requiere:
  - Al menos 8 caracteres
  - Una letra mayúscula
  - Una letra minúscula
  - Un número
  - Un carácter especial
- Indicador visual de fortaleza de contraseña
- Mensajes de error claros y específicos
- Interfaz de usuario intuitiva

## 🛠 Tecnologías

- **React Native** - Framework móvil
- **Expo Router** - Navegación
- **TypeScript** - Tipado estático
- **Expo** - Plataforma de desarrollo
- **Ionicons** - Iconografía

## 📦 Instalación

1. Clona el repositorio
```bash
git clone [tu-repo]
cd contaconmigo-fe
```

2. Instala las dependencias
```bash
npm install
```

3. Inicia el servidor de desarrollo
```bash
npm start
```

4. Ejecuta en tu dispositivo
```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## 📂 Estructura del Proyecto

```
contaconmigo-fe/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # Pantalla de inicio
│   │   ├── explore.tsx        # Pantalla de finanzas
│   │   └── _layout.tsx        # Layout de tabs
│   ├── register.tsx           # Pantalla de registro
│   └── _layout.tsx            # Layout principal
├── components/
│   ├── ui/
│   │   └── FormInput.tsx      # Componente de input reutilizable
│   └── ...
├── constants/
├── hooks/
└── assets/
```

## 🎨 Diseño

La aplicación utiliza un esquema de colores moderno:
- **Color primario**: `#4F46E5` (Indigo)
- **Color secundario**: `#6B7280` (Gray)
- **Fondo**: `#F9FAFB` (Light Gray)
- **Texto principal**: `#111827` (Dark Gray)

## 📝 Validaciones Implementadas

### Email
- Formato válido de correo electrónico
- Campo requerido

### Contraseña
- Mínimo 8 caracteres
- Al menos una letra mayúscula (A-Z)
- Al menos una letra minúscula (a-z)
- Al menos un número (0-9)
- Al menos un carácter especial (!@#$%^&*(),.?":{}|<>)
- Indicador visual de fortaleza
- Opción para mostrar/ocultar contraseña

## 🔮 Próximas Funcionalidades

- [ ] Pantalla de inicio de sesión
- [ ] Dashboard principal
- [ ] Gestión de gastos
- [ ] Gestión de ingresos
- [ ] Categorización de transacciones
- [ ] Reportes y gráficos
- [ ] Configuración de presupuestos
- [ ] Notificaciones push
- [ ] Sincronización en la nube

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

---

**Conta conmigo** - Tu compañero financiero personal 💰
