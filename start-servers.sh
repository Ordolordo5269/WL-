#!/bin/bash

# Script profesional para iniciar el backend y frontend
echo "🚀 WorldLore - Iniciando servidores..."
echo ""

# Función para verificar si un puerto está en uso
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Función para verificar si npm está instalado
check_npm() {
    if command -v npm &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Verificar npm
if ! check_npm; then
    echo "❌ Error: npm no está instalado o no está en el PATH"
    echo "   Por favor, instala Node.js desde https://nodejs.org/"
    exit 1
fi

# Verificar que existan los directorios
if [ ! -d "backend" ]; then
    echo "❌ Error: Directorio 'backend' no encontrado"
    exit 1
fi

if [ ! -d "frontend" ]; then
    echo "❌ Error: Directorio 'frontend' no encontrado"
    exit 1
fi

# Verificar dependencias del backend
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Instalando dependencias del backend..."
    cd backend
    npm install
    cd ..
fi

# Verificar dependencias del frontend
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Instalando dependencias del frontend..."
    cd frontend
    npm install
    cd ..
fi

# Verificar dependencias del landing
if [ -d "landing" ] && [ ! -d "landing/node_modules" ]; then
    echo "📦 Instalando dependencias del landing..."
    cd landing
    npm install
    cd ..
fi

# Configurar archivo .env para la landing si no existe
if [ -d "landing" ]; then
    LANDING_ENV="landing/.env"
    LANDING_ENV_EXAMPLE="landing/.env.example"

    if [ ! -f "$LANDING_ENV" ]; then
        if [ -f "$LANDING_ENV_EXAMPLE" ]; then
            echo "📝 Creando archivo .env para la landing desde .env.example..."
            cp "$LANDING_ENV_EXAMPLE" "$LANDING_ENV"
            echo "   Archivo .env creado en landing/"
            echo "   Configurado con: VITE_WL_APP_URL=http://localhost:5173"
        else
            echo "📝 Creando archivo .env para la landing..."
            echo "# Variables de entorno para la Landing Page" > "$LANDING_ENV"
            echo "# URL de la aplicación principal (WorldLore Map)" >> "$LANDING_ENV"
            echo "VITE_WL_APP_URL=http://localhost:5173" >> "$LANDING_ENV"
            echo "   Archivo .env creado con configuración por defecto"
        fi
    else
        echo "ℹ️  Archivo .env de la landing ya existe, usando configuración existente"
    fi
fi

# Verificar puertos y iniciar backend
if check_port 3001; then
    echo "⚠️  Puerto 3001 ya está en uso. El backend puede estar ejecutándose."
else
    echo "📡 Iniciando backend en puerto 3001..."
    cd backend
    npm run dev &
    cd ..
    sleep 5  # Dar más tiempo para que el backend se inicie
fi

# Verificar puertos y iniciar frontend
if check_port 5173; then
    echo "⚠️  Puerto 5173 ya está en uso. El frontend puede estar ejecutándose."
else
    echo "🌐 Iniciando frontend en puerto 5173..."
    cd frontend
    npm run dev &
    cd ..
    sleep 3
fi

# Verificar puertos y iniciar landing
if [ -d "landing" ]; then
    if check_port 5174; then
        echo "⚠️  Puerto 5174 ya está en uso. El landing puede estar ejecutándose."
    else
        echo "🌐 Iniciando landing en puerto 5174..."
        cd landing
        npm run dev &
        cd ..
        sleep 3
    fi
fi

echo ""
echo "✅ Servidores iniciados correctamente!"
echo ""
echo "📊 Backend API: http://localhost:3001"
echo "🌍 Frontend: http://localhost:5173"
echo "🌐 Frontend Landing: http://localhost:5174"
echo ""
echo "💡 Para probar que todo funciona:"
echo "   1. Abre http://localhost:5173 en tu navegador (app principal)"
echo "   2. Abre http://localhost:5174 en tu navegador (landing)"
echo "   3. Prueba la API: http://localhost:3001/api/countries/Spain/basic-info"
echo ""
echo "🔧 Para detener los servidores, presiona Ctrl+C"
echo ""

# Mantener el script ejecutándose para mostrar los logs
wait 