$body = '{"messages":[{"role":"user","content":"List my skills"}]}'
try {
  $response = Invoke-RestMethod -Uri "http://localhost:6001/api/chat" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 90
  Write-Host "OK - got response"
  Write-Host "Content length:" $response.content.Length
  if ($response.toolResults) { Write-Host "Tool results:" $response.toolResults.Count }
  Write-Host "Content preview:" $response.content.Substring(0, [Math]::Min(200, $response.content.Length))
} catch {
  Write-Host "Error:" $_.Exception.Message
  exit 1
}
