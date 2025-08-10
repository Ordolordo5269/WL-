# 🌍 WorldLore - Plataforma Global de Análisis Geopolítico

Una aplicación web moderna para explorar y analizar información geopolítica global, conflictos internacionales y datos económicos de países.

## 🚀 Inicio Rápido

### Prerrequisitos
- **Node.js** (versión 18 o superior) - [Descargar aquí](https://nodejs.org/)
- **npm** (incluido con Node.js)

### Instalación y Ejecución

#### Opción 1: Script Automático (Recomendado)

**Windows:**
```powershell
.\start-servers.ps1
```

**Linux/macOS:**
```bash
./start-servers.sh
```

#### Opción 2: Instalación Manual

1. **Instalar dependencias del backend:**
   ```bash
   cd backend
   npm install
   ```

2. **Instalar dependencias del frontend:**
   ```bash
   cd frontend
   npm install
   ```

3. **Iniciar el backend:**
   ```bash
   cd backend
   npm run dev
   ```

4. **Iniciar el frontend (en otra terminal):**
   ```bash
   cd frontend
   npm run dev
   ```

### Acceso a la Aplicación

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

### Verificar que Todo Funciona

1. Abre http://localhost:5173 en tu navegador
2. Prueba la API: http://localhost:3001/api/countries/Spain/basic-info

## 🛠️ Solución de Problemas

### Error: "Failed to fetch" o "ERR_CONNECTION_REFUSED"

Si ves este error, significa que el backend no está ejecutándose. Soluciones:

1. **Verifica que el backend esté iniciado:**
   - Deberías ver "Server listening on port 3001" en la consola del backend

2. **Reinicia los servidores:**
   - Cierra todas las ventanas de terminal
   - Ejecuta el script de inicio nuevamente

3. **Verifica los puertos:**
   - Puerto 3001: Backend API
   - Puerto 5173: Frontend

### Dependencias No Instaladas

Los scripts automáticos verifican e instalan automáticamente las dependencias. Si hay problemas:

```bash
# Backend
cd backend
npm install

# Frontend  
cd frontend
npm install
```

## 📁 Estructura del Proyecto

```
WL-/
├── backend/                 # API REST con Express + TypeScript
│   ├── src/
│   │   ├── app.ts          # Configuración de Express
│   │   ├── index.ts        # Punto de entrada del servidor
│   │   ├── controllers/    # Controladores de la API
│   │   ├── routes/         # Rutas de la API
│   │   └── services/       # Lógica de negocio
│   └── package.json
├── frontend/               # Aplicación React + Vite
│   ├── src/
│   │   ├── App.tsx         # Componente principal
│   │   ├── components/     # Componentes React
│   │   ├── services/       # Servicios de API
│   │   └── types/          # Tipos TypeScript
│   └── package.json
├── start-servers.ps1       # Script de inicio para Windows
├── start-servers.sh        # Script de inicio para Unix/Linux/macOS
└── README.md
```

## 🔧 Scripts Disponibles

### Backend
- `npm run dev` - Ejecuta en modo desarrollo con hot reload
- `npm run build` - Compila TypeScript a JavaScript
- `npm start` - Ejecuta la versión compilada

### Frontend
- `npm run dev` - Ejecuta en modo desarrollo con Vite
- `npm run build` - Construye para producción
- `npm run preview` - Previsualiza la build de producción

## 🌟 Características

- **Mapa Interactivo:** Visualización de países y conflictos
- **Información de Países:** Datos demográficos, económicos y políticos
- **Seguimiento de Conflictos:** Análisis de conflictos internacionales
- **API REST:** Backend robusto con TypeScript
- **UI Moderna:** Interfaz responsive con React y Tailwind CSS

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.
