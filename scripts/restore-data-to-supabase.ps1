# Restaura los datos de worldlore.dump en Supabase
# Requiere: connection string exacto de Supabase Dashboard (Connect > Session pooler)

# Añade PostgreSQL al PATH para esta sesión
$pgPath = "C:\Program Files\PostgreSQL\18\bin"
if (Test-Path $pgPath) {
    $env:PATH = "$pgPath;$env:PATH"
} else {
    Write-Host "PostgreSQL no encontrado en $pgPath" -ForegroundColor Red
    exit 1
}

# IMPORTANTE: Copia el connection string desde Supabase Dashboard:
# Project Settings > Database > Connection string > Session pooler (port 5432)
# Formato: postgresql://postgres.SHEMYFITTBKQMVFRAXDD:[PASSWORD]@aws-0-eu-central-2.pooler.supabase.com:5432/postgres?sslmode=require

$connString = Read-Host "Pega aquí tu connection string del Session pooler de Supabase"
if ([string]::IsNullOrWhiteSpace($connString)) {
    Write-Host "Se necesita el connection string." -ForegroundColor Red
    exit 1
}

$dumpFile = Join-Path $PSScriptRoot "..\worldlore.dump"
if (-not (Test-Path $dumpFile)) {
    Write-Host "No encontrado: $dumpFile" -ForegroundColor Red
    exit 1
}

Write-Host "Restaurando datos en Supabase..." -ForegroundColor Cyan
& pg_restore --no-owner --no-privileges --data-only -d $connString $dumpFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nRestauración completada." -ForegroundColor Green
    Write-Host "Verifica en Supabase SQL Editor: SELECT count(*) FROM `"Entity`";"
} else {
    Write-Host "`nError en la restauración. Si ves 'Tenant or user not found':" -ForegroundColor Yellow
    Write-Host "1. Ve a Supabase Dashboard > Project Settings > Database"
    Write-Host "2. Haz clic en 'Connect'"
    Write-Host "3. Selecciona 'Session pooler' y copia el string EXACTO (incluye la contraseña)"
}
