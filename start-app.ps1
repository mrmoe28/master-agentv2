# Start Master Agent: run dev server, open browser, show tray. Close this window to stop the server.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
$projectDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$url = "http://localhost:6001"
$maxWait = 60

# Start dev server hidden via cmd.exe so npm is found in PATH
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "cmd.exe"
$psi.Arguments = "/c `"cd /d `"$projectDir`" && npm run dev`""
$psi.WorkingDirectory = $projectDir
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
try {
  $proc = [System.Diagnostics.Process]::Start($psi)
} catch {
  [System.Windows.Forms.MessageBox]::Show("Could not start server: $($_.Exception.Message). Check that Node and npm are installed and in PATH.", "Master Agent", "OK", "Error")
  exit 1
}

function Stop-Server {
  param([System.Diagnostics.Process]$process)
  if (-not $process -or $process.HasExited) { return }
  # Kill process tree (npm and its child node)
  & taskkill /PID $process.Id /T /F 2>$null
}

# Wait for server to respond
$waited = 0
while ($waited -lt $maxWait) {
  Start-Sleep -Seconds 1
  $waited++
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    if ($r.StatusCode -eq 200) { break }
  } catch {}
}

# Open browser
Start-Process $url

# Show small window: close it to stop the server
$form = New-Object System.Windows.Forms.Form
$form.Text = "Master Agent"
$form.Size = New-Object System.Drawing.Size(320, 120)
$form.FormBorderStyle = "FixedDialog"
$form.StartPosition = "CenterScreen"
$form.Topmost = $false
$label = New-Object System.Windows.Forms.Label
$label.Text = "Server is running. Close this window to stop the server."
$label.AutoSize = $true
$label.Location = New-Object System.Drawing.Point(20, 20)
$form.Controls.Add($label)
$form.Add_FormClosing({
  param($sender, $e)
  Stop-Server -process $proc
})
[void]$form.ShowDialog()
