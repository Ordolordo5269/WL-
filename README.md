# 🌍 WorldLore - Plataforma Global de Análisis Geopolítico

Una aplicación web para explorar y analizar información geopolítica global, conflictos internacionales y datos económicos de países.

---

## 👋 ¿Primera vez? Cómo encender WorldLore (sin saber programar)

Sigue estos pasos en orden. Solo necesitas instalar una cosa y ejecutar un comando.

### Paso 1: Instalar Node.js (solo una vez)

Node.js es el programa que permite ejecutar esta aplicación en tu ordenador.

1. Entra en **https://nodejs.org/**
2. Descarga la versión que diga **LTS** (recomendada).
3. Instala: haz doble clic en el instalador y acepta las opciones por defecto (siguiente, siguiente…).
4. Cuando termine, **reinicia el ordenador** (o al menos cierra y vuelve a abrir cualquier ventana que vayas a usar).

### Paso 2: Abrir la carpeta del proyecto

1. Abre **Explorador de archivos** y ve a la carpeta donde está WorldLore (por ejemplo: `Escritorio\WL-`).
2. En la barra de arriba donde sale la ruta, haz clic una vez y escribe: **powershell**
3. Pulsa **Enter**. Se abrirá una ventana azul/negra (es la "terminal" o "consola").

### Paso 3: Encender la aplicación

En esa ventana azul, escribe exactamente esto y pulsa **Enter**:

**Windows (PowerShell):**

```powershell
.\start-servers.ps1
```

**Linux/macOS:**

```bash
./start-servers.sh
```

- La primera vez puede tardar un poco (instala dependencias).
- Se abrirán **dos ventanas nuevas** (backend y frontend). **No las cierres**; tienen que quedarse abiertas para que la app funcione.

### Paso 4: Abrir WorldLore en el navegador

1. Abre tu navegador (Chrome, Edge, Firefox…).
2. En la barra de direcciones escribe: **http://localhost:5173**
3. Pulsa **Enter**.

Si todo va bien, verás la aplicación (mapa, países, etc.). **Eso es tener WorldLore encendido.**

### Cómo apagarlo

- Cierra las **dos ventanas** que se abrieron al ejecutar el script (las de fondo negro/azul).
- Así se "apagan" los servidores y la aplicación deja de funcionar hasta que vuelvas a ejecutar el script.

---

## 🚀 Inicio Rápido (resumen técnico)

### Prerrequisitos

- **Node.js** (versión 18 o superior) - [Descargar aquí](https://nodejs.org/)
- **npm** (viene con Node.js)

### Instalación y ejecución

```bash
# Instalar todas las dependencias (workspaces)
npm install

# Iniciar backend + frontend
npm run dev

# O por separado:
npm run dev:api      # Solo backend (puerto 3001)
npm run dev:web      # Solo frontend (puerto 5173)
npm run dev:landing  # Solo landing (puerto 5174)
```

### Dónde acceder

- **Aplicación (mapa y UI):** http://localhost:5173
- **API del backend:** http://localhost:3001
- **Landing page:** http://localhost:5174

### Comprobar que funciona

1. Abre http://localhost:5173 en el navegador.
2. Opcional: http://localhost:3001/api/countries/Spain/basic-info (deberías ver datos en JSON).

---

## 📁 Estructura del Proyecto (Monorepo)

```
worldlore/
├── apps/
│   ├── api/                 # API REST (Express + TypeScript)
│   └── web/                 # Aplicación web (React + Vite + Mapbox)
├── packages/
│   └── contracts/           # Tipos TypeScript compartidos (FE/BE)
├── landing/                 # Landing page (React + Three.js)
├── docker-compose.yml       # Postgres + Redis para desarrollo local
├── package.json             # npm workspaces root
├── tsconfig.base.json       # Configuración TypeScript compartida
└── README.md
```

---

## 🛠️ Solución de Problemas

### "Failed to fetch" o "ERR_CONNECTION_REFUSED"

El frontend no puede hablar con el backend. Comprueba:

1. Que el backend esté en marcha (en una ventana debería verse algo como "Server listening on port 3001").
2. Que no hayas cerrado las ventanas que abrió el script.
3. Reinicia: cierra esas ventanas y vuelve a ejecutar el script.

### Dependencias no instaladas

```bash
npm install   # Instala todo via workspaces
```

### Puertos en uso

- **3001** → Backend
- **5173** → Frontend
- **5174** → Landing

Si otro programa usa esos puertos, ciérralo o cambia la configuración del proyecto.

---

## 🔧 Scripts útiles

**Desde la raíz:**
- `npm run dev` – Inicia backend + frontend
- `npm run build` – Compila todos los workspaces
- `npm run lint` – Lint en todos los workspaces

**Backend** (`cd apps/api`):
- `npm run dev` – desarrollo con recarga automática
- `npm run build` / `npm start` – compilar y ejecutar
- `npm run prisma:studio` – interfaz visual de la base de datos

**Frontend** (`cd apps/web`):
- `npm run dev` – desarrollo
- `npm run build` – build para producción
- `npm run preview` – previsualizar la build

---

## 🌟 Características

- **Mapa interactivo** de países y conflictos
- **Datos de países:** demografía, economía, política
- **Seguimiento de conflictos** internacionales
- **API REST** en el backend
- **Interfaz moderna** (React, Tailwind CSS)
- **Landing page** con globo 3D interactivo

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.
