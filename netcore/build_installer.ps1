<# 
  build_installer.ps1
  - Publica la app WinForms como self-contained (WinExe, single file)
  - Copia .env a la carpeta de publish
  - Compila el MSI con WiX v4 (CAB embebido + sin .wixpdb)
  - Valida artefactos (exe, .env, ico) y que solo quede un MSI
#>

$ErrorActionPreference = "Stop"

# --- Config ---
$ProjectRoot   = Split-Path -Parent $PSScriptRoot
$AppDir        = $PSScriptRoot
$InstallerDir  = Join-Path $AppDir "installer"
$ResourcesDir  = Join-Path $AppDir "Resources"
$DistDir       = Join-Path $AppDir "dist"
$PublishDir    = Join-Path $AppDir "bin\Release\net8.0-windows\win-x64\publish"
$ExeName       = "GrupoKFC_Communications.exe"
$WxsFile       = Join-Path $InstallerDir "Product.wxs"
$MsiOut        = Join-Path $DistDir "ComunicacionesGrupoKFC.msi"
$EnvSource     = Join-Path $AppDir ".env"
$EnvTarget     = Join-Path $PublishDir ".env"
$IcoRuntime    = Join-Path $ResourcesDir "main.ico"

Write-Host "=== Build Installer (Comunicaciones Grupo KFC) ===" -ForegroundColor Cyan

# --- Prechequeos ---
if (-not (Test-Path $WxsFile)) { throw "No se encontró el WXS: $WxsFile" }
if (-not (Test-Path $IcoRuntime)) { throw "No se encontró el ícono en runtime: $IcoRuntime" }

# Verifica MediaTemplate EmbedCab="yes"
$wxsText = Get-Content -Path $WxsFile -Raw
if ($wxsText -notmatch '<\s*MediaTemplate\b[^>]*EmbedCab\s*=\s*"(?:true|yes)"') {
  Write-Warning 'Tu Product.wxs no contiene <MediaTemplate EmbedCab="yes" /> dentro de <Package>. Agrega esa línea para un MSI "todo en uno".'
}

# --- Publish ---
Write-Host "`n==> Publicando app (Release, win-x64, self-contained, single file)..." -ForegroundColor Yellow
dotnet publish $AppDir `
  -c Release -r win-x64 `
  -p:OutputType=WinExe -p:UseWindowsForms=true `
  -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true `
  -p:AssemblyName=GrupoKFC_Communications `
  --self-contained true

if (-not (Test-Path (Join-Path $PublishDir $ExeName))) {
  throw "No se encontró el ejecutable publicado: $(Join-Path $PublishDir $ExeName)"
}

# --- Copiar .env al publish ---
Write-Host "==> Copiando .env a la carpeta de publish..." -ForegroundColor Yellow
if (Test-Path $EnvSource) {
  New-Item -ItemType Directory -Force -Path $PublishDir | Out-Null
  Copy-Item $EnvSource $EnvTarget -Force
} else {
  Write-Warning "No se encontró .env en $EnvSource (la app podría usar defaults o fallar si depende de este archivo)."
}

# --- WiX build ---
if (-not (Get-Command wix -ErrorAction SilentlyContinue)) {
  throw "No está instalado WiX v4 como dotnet tool. Instálalo con: dotnet tool install --global wix"
}

Write-Host "==> Compilando MSI con WiX (CAB embebido, sin .wixpdb)..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $DistDir | Out-Null

# Limpia artefactos previos (usar -Include requiere comodín en -Path)
Get-ChildItem -Path (Join-Path $DistDir '*') -Include *.msi,*.wixpdb,*.cab -File -ErrorAction SilentlyContinue | Remove-Item -Force

# Compilar desde $AppDir para que las rutas relativas del WXS funcionen
Push-Location $AppDir
try {
  wix build `
    -arch x64 `
    -o $MsiOut `
    -d PublishDir="$PublishDir" `
    -pdbtype none `
    $WxsFile
}
finally {
  Pop-Location
}

# --- Validaciones finales ---
if (-not (Test-Path $MsiOut)) {
  throw "No se generó el MSI en $MsiOut"
}

# Por si acaso, elimina wixpdb/cab si el build los dejara en dist (no debería)
Get-ChildItem -Path (Join-Path $DistDir '*') -Include *.wixpdb,*.cab -File -ErrorAction SilentlyContinue | Remove-Item -Force

Write-Host "`n=== LISTO ===" -ForegroundColor Green
Write-Host "MSI único: $MsiOut"
Write-Host "Publish:   $PublishDir"
Write-Host "Exe:       $(Join-Path $PublishDir $ExeName)"
Write-Host "ENV:       $EnvTarget"
