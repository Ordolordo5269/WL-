# Script de instalación automática para Worldlore (Windows PowerShell)
# Ejecutar: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# Luego: .\setup.ps1

Write-Host "Configurando WorldLore" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green

# Verificar Node.js
try {
    $nodeVersion = node --version
    Write-Host "Node.js $nodeVersion detectado" -ForegroundColor Green
} catch {
    Write-Host "Error: Node.js no esta instalado. Por favor instala Node.js 18+" -ForegroundColor Red
    exit 1
}

# Verificar versión de Node.js
$nodeMajorVersion = (node --version) -replace 'v', '' -split '\.' | Select-Object -First 1
if ([int]$nodeMajorVersion -lt 18) {
    Write-Host "Error: Node.js version $nodeMajorVersion detectada. Se requiere version 18+" -ForegroundColor Red
    exit 1
}

# Verificar npm
try {
    $npmVersion = npm --version
    Write-Host "npm $npmVersion detectado" -ForegroundColor Green
} catch {
    Write-Host "Error: npm no esta instalado" -ForegroundColor Red
    exit 1
}

# Solicitar token de Mapbox
Write-Host ""
Write-Host "Configuracion de Mapbox" -ForegroundColor Yellow
Write-Host "Para obtener tu token de Mapbox:" -ForegroundColor White
Write-Host "1. Ve a https://www.mapbox.com/" -ForegroundColor White
Write-Host "2. Crea una cuenta gratuita" -ForegroundColor White
Write-Host "3. Copia tu Access Token del dashboard" -ForegroundColor White
Write-Host ""

$MAPBOX_TOKEN = Read-Host "Ingresa tu token de Mapbox"

if ([string]::IsNullOrEmpty($MAPBOX_TOKEN)) {
    Write-Host "Error: Token de Mapbox es requerido" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Instalando dependencias..." -ForegroundColor Yellow

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

# Instalar dependencias del landing
if (Test-Path "landing") {
    Write-Host "Instalando dependencias del landing..." -ForegroundColor White
    Set-Location landing
    npm install
    Set-Location ..
}

Write-Host ""
Write-Host "Configurando variables de entorno..." -ForegroundColor Yellow

# Crear archivo .env del backend
$backendEnvContent = @"
# Variables de entorno para el backend

# Token de Mapbox
MAPBOX_TOKEN=$MAPBOX_TOKEN

# Puerto del servidor backend
PORT=3001

# Entorno de desarrollo
NODE_ENV=development

# Configuracion de CORS
CORS_ORIGIN=http://localhost:5173

# Base de datos (PostgreSQL + Prisma)
DATABASE_URL=postgresql://worldlore:worldlore@localhost:5432/worldlore?schema=public
"@
$backendEnvContent | Out-File -FilePath "backend\.env" -Encoding UTF8
Write-Host "   backend/.env creado (puerto 3001)" -ForegroundColor Gray

# Crear archivo .env del frontend
$frontendEnvContent = @"
VITE_MAPBOX_TOKEN=$MAPBOX_TOKEN
VITE_API_URL=http://localhost:3001
NODE_ENV=development
"@
$frontendEnvContent | Out-File -FilePath "frontend\.env" -Encoding UTF8
Write-Host "   frontend/.env creado" -ForegroundColor Gray

# Crear archivo .env raíz
$rootEnvContent = @"
MAPBOX_TOKEN=$MAPBOX_TOKEN
PORT=3001
NODE_ENV=development
"@
$rootEnvContent | Out-File -FilePath ".env" -Encoding UTF8
Write-Host "   .env raiz creado" -ForegroundColor Gray

# Configurar archivo .env para la landing
if (Test-Path "landing") {
    $landingEnvExamplePath = "landing/.env.example"
    $landingEnvPath = "landing/.env"

    if (Test-Path $landingEnvExamplePath) {
        Write-Host "Creando .env de la landing desde .env.example..." -ForegroundColor White
        Copy-Item $landingEnvExamplePath $landingEnvPath
    } else {
        $landingEnvContent = @"
# Variables de entorno para la Landing Page
# URL de la aplicacion principal (WorldLore Map)
VITE_WL_APP_URL=http://localhost:5173
"@
        $landingEnvContent | Out-File -FilePath $landingEnvPath -Encoding UTF8
    }
    Write-Host "   landing/.env creado" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Configuracion completada exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Pasos siguientes:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Iniciar la base de datos:" -ForegroundColor White
Write-Host "   .\start-database.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Iniciar todos los servidores:" -ForegroundColor White
Write-Host "   .\start-servers.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "URLs:" -ForegroundColor Yellow
Write-Host "  Landing:  http://localhost:5174" -ForegroundColor White
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:  http://localhost:3001" -ForegroundColor White
