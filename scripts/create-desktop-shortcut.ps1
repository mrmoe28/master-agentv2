# Create a desktop shortcut for Master Agent OS with the app icon.
# Run: powershell -ExecutionPolicy Bypass -File scripts\create-desktop-shortcut.ps1

$ErrorActionPreference = "Stop"
$projectDir = if ($PSScriptRoot) { (Resolve-Path (Join-Path $PSScriptRoot "..")).Path } else { (Get-Location).Path }
$vbsPath = Join-Path $projectDir "start-app.vbs"
$icoPath = Join-Path $projectDir "master-agent-icon.ico"
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Master Agent OS.lnk"

if (-not (Test-Path $vbsPath)) {
  Write-Error "start-app.vbs not found at: $vbsPath"
  exit 1
}
if (-not (Test-Path $icoPath)) {
  Write-Error "master-agent-icon.ico not found at: $icoPath. Run: node scripts/make-icon-ico.mjs"
  exit 1
}

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = (Join-Path $env:SystemRoot "System32\wscript.exe")
$shortcut.Arguments = "`"$vbsPath`""
$shortcut.WorkingDirectory = $projectDir
$shortcut.IconLocation = "$icoPath,0"
$shortcut.Description = "Master Agent OS - AI control dashboard"
$shortcut.Save()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($wsh) | Out-Null

Write-Host "Desktop shortcut created: $shortcutPath"
Write-Host "Double-click 'Master Agent OS' on your desktop to start the app."
