Param(
  [string]$CloudflaredPath = "C:\Program Files\Cloudflare\Cloudflare Tunnel\cloudflared.exe",
  [string]$Host = "127.0.0.1",
  [int]$Port = 8000,
  [string]$AppDir = "tradia-backend"
)

$ErrorActionPreference = 'Stop'

function Ensure-Cloudflared {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    $alt = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
    if (Test-Path $alt) { return $alt }
    throw "cloudflared not found at '$Path'. Install it or pass -CloudflaredPath."
  }
  return $Path
}

function Start-Uvicorn {
  param([string]$Host, [int]$Port, [string]$AppDir)
  $cmd = "python -m uvicorn app:app --app-dir `"$AppDir`" --host $Host --port $Port"
  Write-Host "Starting FastAPI: $cmd" -ForegroundColor Cyan
  Start-Process -WindowStyle Minimized -FilePath "powershell.exe" -ArgumentList "-NoLogo","-NoExit","-Command", $cmd
}

function Start-Cloudflared {
  param([string]$CfPath, [string]$TargetUrl)
  Write-Host "Starting Cloudflare Tunnel to $TargetUrl" -ForegroundColor Cyan
  Start-Process -WindowStyle Minimized -FilePath $CfPath -ArgumentList @("tunnel","--url",$TargetUrl)
}

$cf = Ensure-Cloudflared -Path $CloudflaredPath
$target = "http://$Host:$Port"

Start-Uvicorn -Host $Host -Port $Port -AppDir $AppDir
Start-Sleep -Seconds 2
Start-Cloudflared -CfPath $cf -TargetUrl $target

Write-Host "Launched bridge and tunnel. Check the cloudflared window for the public URL." -ForegroundColor Green

