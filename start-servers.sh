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

echo ""
echo "✅ Servidores iniciados correctamente!"
echo ""
echo "📊 Backend API: http://localhost:3001"
echo "🌍 Frontend: http://localhost:5173"
echo ""
echo "💡 Para probar que todo funciona:"
echo "   1. Abre http://localhost:5173 en tu navegador"
echo "   2. Prueba la API: http://localhost:3001/api/countries/Spain/basic-info"
echo ""
echo "🔧 Para detener los servidores, presiona Ctrl+C"
echo ""

# Mantener el script ejecutándose para mostrar los logs
wait 