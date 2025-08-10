# Script profesional para iniciar el backend y frontend
Write-Host "WorldLore - Iniciando servidores..." -ForegroundColor Green
Write-Host ""

# Funcion para verificar si un puerto esta en uso
function Test-Port {
    param($Port)
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        return $connection -ne $null
    } catch {
        return $false
    }
}

# Funcion para verificar si npm esta instalado
function Test-Npm {
    try {
        $null = npm --version
        return $true
    } catch {
        return $false
    }
}

# Verificar npm
if (-not (Test-Npm)) {
    Write-Host "Error: npm no esta instalado o no esta en el PATH" -ForegroundColor Red
    Write-Host "   Por favor, instala Node.js desde https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Verificar que existan los directorios
if (-not (Test-Path "backend")) {
    Write-Host "Error: Directorio 'backend' no encontrado" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "frontend")) {
    Write-Host "Error: Directorio 'frontend' no encontrado" -ForegroundColor Red
    exit 1
}

# Verificar dependencias del backend
if (-not (Test-Path "backend/node_modules")) {
    Write-Host "Instalando dependencias del backend..." -ForegroundColor Cyan
    Set-Location backend
    npm install
    Set-Location ..
}

# Verificar dependencias del frontend
if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "Instalando dependencias del frontend..." -ForegroundColor Cyan
    Set-Location frontend
    npm install
    Set-Location ..
}

# Verificar puertos y iniciar backend
if (Test-Port 3001) {
    Write-Host "Puerto 3001 ya esta en uso. El backend puede estar ejecutandose." -ForegroundColor Yellow
} else {
    Write-Host "Iniciando backend en puerto 3001..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev" -WindowStyle Normal
    Start-Sleep -Seconds 5
}

# Verificar puertos y iniciar frontend
if (Test-Port 5173) {
    Write-Host "Puerto 5173 ya esta en uso. El frontend puede estar ejecutandose." -ForegroundColor Yellow
} else {
    Write-Host "Iniciando frontend en puerto 5173..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -WindowStyle Normal
    Start-Sleep -Seconds 3
}

Write-Host ""
Write-Host "Servidores iniciados correctamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend API: http://localhost:3001" -ForegroundColor White
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Para probar que todo funciona:" -ForegroundColor Yellow
Write-Host "   1. Abre http://localhost:5173 en tu navegador" -ForegroundColor Gray
Write-Host "   2. Prueba la API: http://localhost:3001/api/countries/Spain/basic-info" -ForegroundColor Gray
Write-Host ""
Write-Host "Para detener los servidores, cierra las ventanas de PowerShell" -ForegroundColor Cyan 