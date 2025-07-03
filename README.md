# Worldlore - Conflict Tracker

Una aplicación web interactiva para visualizar y rastrear conflictos globales en tiempo real, construida con React, TypeScript, Node.js y Mapbox GL JS.

## 🚀 Características

- **Globo 3D Interactivo**: Visualización inmersiva del mundo usando Mapbox GL JS
- **Rastreador de Conflictos**: Datos actualizados de conflictos globales con filtros por región y estado
- **Búsqueda de Países**: Geocoder integrado para buscar y navegar a países específicos
- **Interfaz Moderna**: Diseño responsive con Tailwind CSS y animaciones suaves
- **API REST**: Backend Express con endpoints para datos de países y conflictos

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (versión 18 o superior)
- **npm** (incluido con Node.js)
- **Git** (para clonar el repositorio)

### Verificar instalaciones:
```bash
node --version  # Debe ser >= 18.0.0
npm --version   # Debe ser >= 8.0.0
git --version   # Cualquier versión reciente
```

## 🛠️ Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd WL-
```

### 2. Configurar Variables de Entorno

El proyecto requiere un token de Mapbox para funcionar. Tienes dos opciones:

#### Opción A: Instalación Automática (Recomendada)

**Para Linux/macOS:**
```bash
chmod +x setup.sh
./setup.sh
```

**Para Windows:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\setup.ps1
```

#### Opción B: Configuración Manual

**Obtener Token de Mapbox:**
1. Ve a [Mapbox](https://www.mapbox.com/) y crea una cuenta gratuita
2. En tu dashboard, copia tu **Access Token**
3. Crea los siguientes archivos `.env`:

**En la raíz del proyecto:**
```bash
# Crear archivo .env en la raíz
echo "MAPBOX_TOKEN=tu_token_de_mapbox_aqui" > .env
echo "PORT=3000" >> .env
```

**En el directorio frontend:**
```bash
# Crear archivo .env en frontend/
echo "VITE_MAPBOX_TOKEN=tu_token_de_mapbox_aqui" > frontend/.env
```

**En el directorio backend:**
```bash
# Crear archivo .env en backend/
echo "MAPBOX_TOKEN=tu_token_de_mapbox_aqui" > backend/.env
echo "PORT=3000" >> backend/.env
```

**Archivos de ejemplo disponibles:**
- `env.example` - Para la raíz del proyecto
- `backend/env.example` - Para el backend
- `frontend/env.example` - Para el frontend

### 3. Instalar Dependencias

El proyecto tiene múltiples directorios con sus propias dependencias. Ejecuta estos comandos en orden:

```bash
# Instalar dependencias del proyecto principal
npm install

# Instalar dependencias del backend
cd backend
npm install
cd ..

# Instalar dependencias del frontend
cd frontend
npm install
cd ..
```

### 4. Verificar la Instalación

Para asegurarte de que todo está configurado correctamente:

```bash
# Verificar que las dependencias están instaladas
ls node_modules
ls backend/node_modules
ls frontend/node_modules

# Verificar que los archivos .env existen
ls .env
ls backend/.env
ls frontend/.env
```

## 🚀 Ejecutar el Proyecto

### Opción 1: Ejecutar Todo Junto (Recomendado)

```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
npm run client
```

### Opción 2: Ejecutar por Separado

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Puertos por Defecto:
- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:5173

## 📁 Estructura del Proyecto

```
WL-/
├── backend/                 # Servidor Express
│   ├── src/
│   │   ├── controllers/     # Controladores de la API
│   │   ├── routes/         # Rutas de la API
│   │   ├── services/       # Lógica de negocio
│   │   └── middleware/     # Middleware personalizado
│   └── package.json
├── frontend/               # Aplicación React
│   ├── components/         # Componentes React
│   ├── services/          # Servicios y lógica
│   ├── data/              # Datos estáticos
│   ├── src/               # Código fuente principal
│   └── package.json
├── .env                   # Variables de entorno (crear)
├── .gitignore            # Archivos ignorados por Git
└── README.md             # Este archivo
```

## 🔧 Scripts Disponibles

### Scripts Principales:
```bash
npm run dev          # Ejecutar backend en modo desarrollo
npm run client       # Ejecutar frontend en modo desarrollo
npm run build        # Compilar backend para producción
```

### Scripts del Backend:
```bash
cd backend
npm run dev          # Ejecutar con ts-node-dev (hot reload)
npm run start        # Ejecutar versión compilada
npm run build        # Compilar TypeScript
npm run clean        # Limpiar archivos compilados
```

### Scripts del Frontend:
```bash
cd frontend
npm run dev          # Ejecutar servidor de desarrollo Vite
npm run build        # Compilar para producción
npm run preview      # Previsualizar build de producción
npm run lint         # Ejecutar ESLint
```

## 🌐 Configuración de Red

### Si necesitas cambiar los puertos:

**Backend** (backend/.env):
```env
PORT=3000
MAPBOX_TOKEN=tu_token_aqui
```

**Frontend** (frontend/.env):
```env
VITE_MAPBOX_TOKEN=tu_token_aqui
VITE_API_URL=http://localhost:3000
```

## 🐛 Solución de Problemas

### Error: "Cannot find module"
```bash
# Eliminar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Error: "Mapbox token not found"
- Verifica que los archivos `.env` existen en las ubicaciones correctas
- Asegúrate de que el token de Mapbox sea válido
- Reinicia los servidores después de crear los archivos `.env`

### Error: "Port already in use"
```bash
# Cambiar puerto en el archivo .env correspondiente
# O matar el proceso que usa el puerto
lsof -ti:3000 | xargs kill -9  # Para puerto 3000
```

### Error: "TypeScript compilation failed"
```bash
# Limpiar caché de TypeScript
rm -rf **/*.tsbuildinfo
rm -rf **/dist
npm run build
```

## 📦 Despliegue

### Para Producción:

1. **Compilar el proyecto:**
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

2. **Configurar variables de entorno de producción**
3. **Usar un servidor web como Nginx o Apache**
4. **Configurar un proceso manager como PM2**

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Si encuentras algún problema:

1. Revisa la sección de "Solución de Problemas" arriba
2. Verifica que todas las dependencias están instaladas correctamente
3. Asegúrate de que los archivos `.env` están configurados
4. Abre un issue en el repositorio con detalles del error

---

**Nota**: Este proyecto requiere un token de Mapbox válido para funcionar. El token gratuito de Mapbox incluye 50,000 cargas de mapa por mes, lo cual es suficiente para desarrollo y uso personal.
