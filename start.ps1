# ── OpenFrame AI — Start Both Backend + Frontend ──────────
# Usage: .\start.ps1
# Stop:  Ctrl+C (kills both processes)

Write-Host "`n  OpenFrame AI — Starting..." -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:8030" -ForegroundColor DarkGray
Write-Host "  Frontend: http://localhost:3030`n" -ForegroundColor DarkGray

# Start backend in background
$backend = Start-Process -NoNewWindow -PassThru -FilePath "python" `
    -ArgumentList "-m", "uvicorn", "api.server:app", "--host", "0.0.0.0", "--port", "8030", "--reload" `
    -WorkingDirectory $PSScriptRoot

# Start frontend in background
$frontend = Start-Process -NoNewWindow -PassThru -FilePath "npm" `
    -ArgumentList "run", "dev" `
    -WorkingDirectory (Join-Path $PSScriptRoot "ui")

Write-Host "  Backend PID:  $($backend.Id)" -ForegroundColor DarkGray
Write-Host "  Frontend PID: $($frontend.Id)" -ForegroundColor DarkGray
Write-Host "`n  Press Ctrl+C to stop both...`n" -ForegroundColor Yellow

# Wait and cleanup on exit
try {
    while (-not $backend.HasExited -and -not $frontend.HasExited) {
        Start-Sleep -Seconds 2
    }
} finally {
    Write-Host "`n  Stopping..." -ForegroundColor Yellow
    if (-not $backend.HasExited) { Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue }
    if (-not $frontend.HasExited) { Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue }
    Write-Host "  Done.`n" -ForegroundColor Green
}
