# Script de instalación automática para Worldlore (Windows PowerShell)
# Ejecutar: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# Luego: .\setup.ps1

Write-Host "🚀 Configurando Worldlore - Conflict Tracker" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green

# Verificar Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion detectado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js no está instalado. Por favor instala Node.js 18+" -ForegroundColor Red
    exit 1
}

# Verificar versión de Node.js
$nodeMajorVersion = (node --version) -replace 'v', '' -split '.' | Select-Object -First 1
if ([int]$nodeMajorVersion -lt 18) {
    Write-Host "❌ Error: Node.js versión $nodeMajorVersion detectada. Se requiere versión 18+" -ForegroundColor Red
    exit 1
}

# Verificar npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm $npmVersion detectado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: npm no está instalado" -ForegroundColor Red
    exit 1
}

# Solicitar token de Mapbox
Write-Host ""
Write-Host "📋 Configuración de Mapbox" -ForegroundColor Yellow
Write-Host "Para obtener tu token de Mapbox:" -ForegroundColor White
Write-Host "1. Ve a https://www.mapbox.com/" -ForegroundColor White
Write-Host "2. Crea una cuenta gratuita" -ForegroundColor White
Write-Host "3. Copia tu Access Token del dashboard" -ForegroundColor White
Write-Host ""

$MAPBOX_TOKEN = Read-Host "Ingresa tu token de Mapbox"

if ([string]::IsNullOrEmpty($MAPBOX_TOKEN)) {
    Write-Host "❌ Error: Token de Mapbox es requerido" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow

# Instalar dependencias del proyecto principal
Write-Host "Instalando dependencias principales..." -ForegroundColor White
npm install

# Instalar dependencias del backend
Write-Host "Instalando dependencias del backend..." -ForegroundColor White
Set-Location backend
npm install
Set-Location ..

# Instalar dependencias del frontend
Write-Host "Instalando dependencias del frontend..." -ForegroundColor White
Set-Location frontend
npm install
Set-Location ..

Write-Host "" 
Write-Host "🔧 Configurando variables de entorno..." -ForegroundColor Yellow

# Crear archivos .env
"MAPBOX_TOKEN=$MAPBOX_TOKEN" | Out-File -FilePath ".env" -Encoding UTF8
"PORT=3001" | Out-File -FilePath ".env" -Append -Encoding UTF8
"NODE_ENV=development" | Out-File -FilePath ".env" -Append -Encoding UTF8

"VITE_MAPBOX_TOKEN=$MAPBOX_TOKEN" | Out-File -FilePath "frontend\.env" -Encoding UTF8
"VITE_API_URL=http://localhost:3001" | Out-File -FilePath "frontend\.env" -Append -Encoding UTF8
"NODE_ENV=development" | Out-File -FilePath "frontend\.env" -Append -Encoding UTF8

"MAPBOX_TOKEN=$MAPBOX_TOKEN" | Out-File -FilePath "backend\.env" -Encoding UTF8
"PORT=3001" | Out-File -FilePath "backend\.env" -Append -Encoding UTF8
"NODE_ENV=development" | Out-File -FilePath "backend\.env" -Append -Encoding UTF8
"CORS_ORIGIN=http://localhost:5173" | Out-File -FilePath "backend\.env" -Append -Encoding UTF8

Write-Host ""
Write-Host "✅ Configuración completada exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Para ejecutar el proyecto:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Terminal 1 (Backend):" -ForegroundColor White
Write-Host "  npm run backend:dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Terminal 2 (Frontend):" -ForegroundColor White
Write-Host "  npm run frontend:dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "O usa: npm run dev para correr ambos a la vez" -ForegroundColor Yellow
Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:  http://localhost:3001" -ForegroundColor White
Write-Host "" 
Write-Host "📚 Para más información, consulta el README.md" -ForegroundColor White 