# Start Chrome with remote debugging so the agent can attach to it (CHROME_CDP_URL=http://localhost:9222).
# Run: .\scripts\start-chrome-debug.ps1   or  npm run chrome:debug

$port = 9222
$paths = @(
  "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$chrome = $paths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) {
  Write-Error "Chrome not found. Install Chrome or set CHROME_PATH."
  exit 1
}
Write-Host "Starting Chrome with remote debugging on port $port..."
Write-Host "In .env set: CHROME_CDP_URL=http://localhost:$port"
& $chrome --remote-debugging-port=$port
