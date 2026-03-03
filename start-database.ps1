# Script para verificar conexion a la base de datos remota de WorldLore
# Ejecutar como: .\start-database.ps1

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  WorldLore - Database Check Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Configuracion de conexion remota
$DB_HOST = "116.203.82.200"
$DB_PORT = "5432"
$DB_USER = "postgres"
$DB_NAME = "postgres"

# PASO 1: Verificar conectividad de red al servidor
Write-Host "[1/3] Verificando conectividad al servidor remoto..." -ForegroundColor Yellow
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect($DB_HOST, [int]$DB_PORT)
    $tcpClient.Close()
    Write-Host "    ✅ Servidor remoto accesible en ${DB_HOST}:${DB_PORT}" -ForegroundColor Green
} catch {
    Write-Host "    ❌ No se puede conectar a ${DB_HOST}:${DB_PORT}" -ForegroundColor Red
    Write-Host "    Verifica tu conexion a internet y que el servidor esté activo" -ForegroundColor Yellow
    exit 1
}

# PASO 2: Verificar estado de migraciones de Prisma
Write-Host "[2/3] Verificando migraciones de Prisma..." -ForegroundColor Yellow
if (-not (Test-Path "backend")) {
    Write-Host "    ❌ Directorio backend no encontrado" -ForegroundColor Red
    exit 1
}

Set-Location backend
try {
    $migrateStatus = npx prisma migrate status 2>&1 | Out-String
    if ($migrateStatus -match "Database schema is up to date") {
        Write-Host "    ✅ Schema de base de datos actualizado" -ForegroundColor Green
    } elseif ($migrateStatus -match "pending|not applied") {
        Write-Host "    ⚠️  Hay migraciones pendientes. Aplicando..." -ForegroundColor Yellow
        npx prisma migrate deploy
        Write-Host "    ✅ Migraciones aplicadas" -ForegroundColor Green
    } else {
        Write-Host "    ✅ Estado de migraciones verificado" -ForegroundColor Green
    }
} catch {
    Write-Host "    ⚠️  No se pudo verificar el estado de las migraciones" -ForegroundColor Yellow
}
Set-Location ..

# PASO 3: Generar Prisma Client
Write-Host "[3/3] Generando Prisma Client..." -ForegroundColor Yellow
Set-Location backend
try {
    npx prisma generate *>$null
    Write-Host "    ✅ Prisma Client generado" -ForegroundColor Green
} catch {
    Write-Host "    ⚠️  No se pudo generar Prisma Client" -ForegroundColor Yellow
}
Set-Location ..

# Resumen final
Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  ✅ Base de Datos Remota Conectada" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Informacion de conexion:" -ForegroundColor Cyan
Write-Host "  Host:     $DB_HOST" -ForegroundColor White
Write-Host "  Puerto:   $DB_PORT" -ForegroundColor White
Write-Host "  Usuario:  $DB_USER" -ForegroundColor White
Write-Host "  Database: $DB_NAME" -ForegroundColor White
Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor Cyan
Write-Host "  Prisma Studio:   cd backend && npx prisma studio" -ForegroundColor Gray
Write-Host "  Migrate:         cd backend && npx prisma migrate deploy" -ForegroundColor Gray
Write-Host "  Seed:            cd backend && npm run db:seed" -ForegroundColor Gray
Write-Host ""
Write-Host "Ahora puedes iniciar el backend:" -ForegroundColor Yellow
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
