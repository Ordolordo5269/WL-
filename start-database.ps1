# Script automatizado para iniciar PostgreSQL en WorldLore
# Ejecutar como: .\start-database.ps1

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  WorldLore - Database Startup Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Función para verificar si Docker está instalado
function Test-Docker {
    try {
        $null = docker --version
        return $true
    } catch {
        return $false
    }
}

# Función para verificar si Docker está corriendo
function Test-DockerRunning {
    try {
        docker info *>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

# Función para verificar si un contenedor está corriendo
function Test-ContainerRunning {
    param($ContainerName)
    try {
        $container = docker ps --filter "name=$ContainerName" --format "{{.Names}}"
        return $container -eq $ContainerName
    } catch {
        return $false
    }
}

# PASO 1: Verificar Docker instalado
Write-Host "[1/7] Verificando Docker..." -ForegroundColor Yellow
if (-not (Test-Docker)) {
    Write-Host "    ❌ Docker no está instalado" -ForegroundColor Red
    Write-Host "    Por favor, instala Docker Desktop desde:" -ForegroundColor Yellow
    Write-Host "    https://www.docker.com/products/docker-desktop/" -ForegroundColor Cyan
    exit 1
}
$dockerVersion = docker --version
Write-Host "    ✅ Docker instalado: $dockerVersion" -ForegroundColor Green

# PASO 2: Verificar Docker Desktop está corriendo
Write-Host "[2/7] Verificando Docker Desktop..." -ForegroundColor Yellow
if (-not (Test-DockerRunning)) {
    Write-Host "    ⚠️  Docker Desktop no está corriendo. Iniciando..." -ForegroundColor Yellow
    try {
        Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -ErrorAction Stop
        Write-Host "    Esperando a que Docker Desktop inicie..." -ForegroundColor Cyan
        
        # Esperar hasta 60 segundos
        $maxWait = 60
        $waited = 0
        while ($waited -lt $maxWait) {
            Start-Sleep -Seconds 3
            $waited += 3
            if (Test-DockerRunning) {
                break
            }
            Write-Host "    Esperando... ($waited segundos)" -ForegroundColor Gray
        }
        
        if (Test-DockerRunning) {
            Write-Host "    ✅ Docker Desktop iniciado correctamente" -ForegroundColor Green
        } else {
            Write-Host "    ❌ Docker Desktop no respondió después de $maxWait segundos" -ForegroundColor Red
            Write-Host "    Por favor, inicia Docker Desktop manualmente y vuelve a ejecutar este script" -ForegroundColor Yellow
            exit 1
        }
    } catch {
        Write-Host "    ❌ No se pudo iniciar Docker Desktop automáticamente" -ForegroundColor Red
        Write-Host "    Por favor, inicia Docker Desktop manualmente y vuelve a ejecutar este script" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "    ✅ Docker Desktop está corriendo" -ForegroundColor Green
}

# PASO 3: Verificar archivo docker-compose.yml
Write-Host "[3/7] Verificando docker-compose.yml..." -ForegroundColor Yellow
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "    ❌ No se encuentra docker-compose.yml en el directorio actual" -ForegroundColor Red
    Write-Host "    Asegúrate de ejecutar este script desde la raíz del proyecto" -ForegroundColor Yellow
    exit 1
}
Write-Host "    ✅ docker-compose.yml encontrado" -ForegroundColor Green

# PASO 4: Iniciar PostgreSQL con Docker Compose
Write-Host "[4/7] Iniciando contenedor PostgreSQL..." -ForegroundColor Yellow
try {
    docker-compose up -d postgres *>$null
    Start-Sleep -Seconds 5
    
    if (Test-ContainerRunning "wl_postgres") {
        Write-Host "    ✅ PostgreSQL iniciado (contenedor: wl_postgres)" -ForegroundColor Green
        $containerStatus = docker ps --filter "name=wl_postgres" --format "{{.Status}}"
        Write-Host "    Estado: $containerStatus" -ForegroundColor Gray
    } else {
        Write-Host "    ❌ El contenedor wl_postgres no está corriendo" -ForegroundColor Red
        Write-Host "    Verificando logs..." -ForegroundColor Yellow
        docker logs wl_postgres --tail 20
        exit 1
    }
} catch {
    Write-Host "    ❌ Error al iniciar PostgreSQL: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# PASO 5: Verificar estado de migraciones
Write-Host "[5/7] Verificando migraciones de Prisma..." -ForegroundColor Yellow
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

# PASO 6: Verificar si hay datos en la base de datos
Write-Host "[6/7] Verificando datos en la base de datos..." -ForegroundColor Yellow
Set-Location backend
try {
    $entityCount = docker exec wl_postgres psql -U worldlore -d worldlore -t -c "SELECT COUNT(*) FROM \"Entity\";" 2>$null
    $entityCount = $entityCount.Trim()
    
    if ([int]$entityCount -gt 0) {
        Write-Host "    ✅ Base de datos contiene $entityCount entidades" -ForegroundColor Green
        Write-Host "    (No es necesario ejecutar seed)" -ForegroundColor Gray
    } else {
        Write-Host "    ⚠️  Base de datos vacía. Ejecutando seed..." -ForegroundColor Yellow
        npm run db:seed
        Write-Host "    ✅ Datos base cargados correctamente" -ForegroundColor Green
    }
} catch {
    Write-Host "    ⚠️  No se pudo verificar el contenido de la base de datos" -ForegroundColor Yellow
    Write-Host "    Si es la primera vez, ejecuta manualmente: cd backend && npm run db:seed" -ForegroundColor Cyan
}
Set-Location ..

# PASO 7: Verificar conectividad
Write-Host "[7/7] Verificando conectividad..." -ForegroundColor Yellow
try {
    $testConnection = docker exec wl_postgres pg_isready -U worldlore 2>&1
    if ($testConnection -match "accepting connections") {
        Write-Host "    ✅ PostgreSQL aceptando conexiones" -ForegroundColor Green
    } else {
        Write-Host "    ⚠️  PostgreSQL puede no estar listo todavía" -ForegroundColor Yellow
    }
} catch {
    Write-Host "    ⚠️  No se pudo verificar la conectividad" -ForegroundColor Yellow
}

# Resumen final
Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  ✅ Base de Datos Iniciada" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Información de conexión:" -ForegroundColor Cyan
Write-Host "  Host:     localhost" -ForegroundColor White
Write-Host "  Puerto:   5432" -ForegroundColor White
Write-Host "  Usuario:  worldlore" -ForegroundColor White
Write-Host "  Password: worldlore" -ForegroundColor White
Write-Host "  Database: worldlore" -ForegroundColor White
Write-Host ""
Write-Host "Contenedor Docker:" -ForegroundColor Cyan
Write-Host "  Nombre:   wl_postgres" -ForegroundColor White
Write-Host "  Estado:   $(docker ps --filter 'name=wl_postgres' --format '{{.Status}}')" -ForegroundColor White
Write-Host ""
Write-Host "Comandos útiles:" -ForegroundColor Cyan
Write-Host "  Ver logs:        docker logs wl_postgres" -ForegroundColor Gray
Write-Host "  Acceder a DB:    docker exec -it wl_postgres psql -U worldlore -d worldlore" -ForegroundColor Gray
Write-Host "  Detener DB:      docker-compose stop postgres" -ForegroundColor Gray
Write-Host "  Reiniciar DB:    docker-compose restart postgres" -ForegroundColor Gray
Write-Host ""
Write-Host "Ahora puedes iniciar el backend:" -ForegroundColor Yellow
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""













