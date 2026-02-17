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
3. Pulsa **Enter**. Se abrirá una ventana azul/negra (es la “terminal” o “consola”).

### Paso 3: Encender la aplicación

En esa ventana azul, escribe exactamente esto y pulsa **Enter**:

```powershell
.\start-servers.ps1
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
- Así se “apagan” los servidores y la aplicación deja de funcionar hasta que vuelvas a ejecutar `.\start-servers.ps1`.

### Si algo falla

- **“No se reconoce como comando” o error con `.\start-servers.ps1`**  
  Asegúrate de estar **dentro de la carpeta del proyecto** (donde está el archivo `start-servers.ps1`). En PowerShell puedes escribir `cd` y arrastrar la carpeta del proyecto para pegar la ruta, luego Enter.

- **“npm no está instalado”**  
  Node.js no está instalado o no se detecta. Reinstala Node.js desde https://nodejs.org/ y reinicia el ordenador.

- **La página no carga en http://localhost:5173**  
  Espera 10–15 segundos después de ejecutar el script. Si sigue sin cargar, revisa que las dos ventanas del script sigan abiertas.

Más opciones y solución de problemas detallada están más abajo en este mismo documento.

---

## 🚀 Inicio Rápido (resumen técnico)

### Prerrequisitos

- **Node.js** (versión 18 o superior) - [Descargar aquí](https://nodejs.org/)
- **npm** (viene con Node.js)

### Clonar con la landing (submodule)

Si clonas el repo por primera vez, inicializa el submodule de la landing:

```bash
git clone --recurse-submodules <url-del-repo>
# o si ya clonaste sin submodules:
git submodule update --init --recursive
```

### Instalación y ejecución

#### Opción recomendada: script automático

**Windows (PowerShell):**

```powershell
.\start-servers.ps1
```

**Linux/macOS:**

```bash
./start-servers.sh
```

El script instala dependencias si faltan y abre backend y frontend en ventanas separadas.

#### Opción manual

1. **Backend:** `cd backend` → `npm install` → `npm run dev`
2. **Frontend:** en otra terminal, `cd frontend` → `npm install` → `npm run dev`

### Dónde acceder

- **Aplicación (mapa y UI):** http://localhost:5173  
- **API del backend:** http://localhost:3001  

### Comprobar que funciona

1. Abre http://localhost:5173 en el navegador.
2. Opcional: http://localhost:3001/api/countries/Spain/basic-info (deberías ver datos en JSON).

---

## 🛠️ Solución de Problemas

### "Failed to fetch" o "ERR_CONNECTION_REFUSED"

El frontend no puede hablar con el backend. Comprueba:

1. Que el backend esté en marcha (en una ventana debería verse algo como “Server listening on port 3001”).
2. Que no hayas cerrado las ventanas que abrió el script.
3. Reinicia: cierra esas ventanas y vuelve a ejecutar `.\start-servers.ps1`.

### Dependencias no instaladas

Si el script no instaló todo o hay errores:

```bash
cd backend
npm install

cd ..\frontend
npm install
```

Luego ejecuta de nuevo `.\start-servers.ps1` (Windows) o `./start-servers.sh` (Linux/macOS).

### Puertos en uso

- **3001** → Backend  
- **5173** → Frontend  

Si otro programa usa esos puertos, ciérralo o cambia la configuración del proyecto.

---

## 📁 Estructura del Proyecto

```
WL-/
├── backend/                 # API REST (Express + TypeScript)
├── frontend/                # Aplicación web (React + Vite)
├── frontend/landing/        # Landing page (submodule)
├── start-servers.ps1        # Encender todo en Windows
├── start-servers.sh         # Encender todo en Linux/macOS
└── README.md
```

---

## 🔧 Scripts útiles

**Backend** (`cd backend`):  
- `npm run dev` – desarrollo con recarga automática  
- `npm run build` / `npm start` – compilar y ejecutar  

**Frontend** (`cd frontend`):  
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
- **Landing page** en `frontend/landing/` (submodule)

---

## 📝 Landing Page

La landing está en `frontend/landing/` como **submodule** (repo [WLInterace](https://github.com/Ordolordo5269/WLInterace)). En la app principal se muestra en `/` y el mapa en `/map`. Para ejecutar solo la landing en otro puerto (5174): `cd frontend/landing`, `npm install`, `npm run dev`.

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.
