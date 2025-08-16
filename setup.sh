#!/bin/bash

# Script de instalación automática para Worldlore
# Ejecutar: chmod +x setup.sh && ./setup.sh

echo "🚀 Configurando Worldlore - Conflict Tracker"
echo "=============================================="

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js no está instalado. Por favor instala Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js versión $NODE_VERSION detectada. Se requiere versión 18+"
    exit 1
fi

echo "✅ Node.js $(node --version) detectado"

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm no está instalado"
    exit 1
fi

echo "✅ npm $(npm --version) detectado"

# Solicitar token de Mapbox
echo ""
echo "📋 Configuración de Mapbox"
echo "Para obtener tu token de Mapbox:"
echo "1. Ve a https://www.mapbox.com/"
echo "2. Crea una cuenta gratuita"
echo "3. Copia tu Access Token del dashboard"
echo ""

read -p "Ingresa tu token de Mapbox: " MAPBOX_TOKEN

if [ -z "$MAPBOX_TOKEN" ]; then
    echo "❌ Error: Token de Mapbox es requerido"
    exit 1
fi

echo ""
echo "📦 Instalando dependencias..."

# Instalar dependencias del proyecto principal
echo "Instalando dependencias principales..."
npm install

# Instalar dependencias del backend
echo "Instalando dependencias del backend..."
cd backend
npm install
cd ..

# Instalar dependencias del frontend
echo "Instalando dependencias del frontend..."
cd frontend
npm install
cd ..

echo ""
echo "🔧 Configurando variables de entorno..."

# Crear archivos .env
echo "MAPBOX_TOKEN=$MAPBOX_TOKEN" > .env
echo "PORT=3001" >> .env
echo "NODE_ENV=development" >> .env

echo "VITE_MAPBOX_TOKEN=$MAPBOX_TOKEN" > frontend/.env
echo "VITE_API_URL=http://localhost:3001" >> frontend/.env
echo "NODE_ENV=development" >> frontend/.env

echo "MAPBOX_TOKEN=$MAPBOX_TOKEN" > backend/.env
echo "PORT=3001" >> backend/.env
echo "NODE_ENV=development" >> backend/.env
echo "CORS_ORIGIN=http://localhost:5173" >> backend/.env

echo ""
echo "✅ Configuración completada exitosamente!"
echo ""
echo "🚀 Para ejecutar el proyecto:"
echo ""
echo "Terminal 1 (Backend):"
echo "  npm run backend:dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  npm run frontend:dev"
echo ""
echo "O usa: npm run dev para correr ambos a la vez"
echo ""
echo "🌐 URLs:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3001"
echo ""
echo "📚 Para más información, consulta el README.md" 