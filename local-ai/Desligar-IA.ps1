$ErrorActionPreference = 'Continue'
$base = $PSScriptRoot
Set-Content "$base\stop.flag" 'stop'
try {
  $config = Get-Content "$base\config.json" -Raw | ConvertFrom-Json
  $body = @{p_token=$config.token; p_action='offline'} | ConvertTo-Json -Compress
  $null = Invoke-RestMethod ($config.url + '/functions/v1/local-ai-worker') -Method Post -Headers @{apikey=$config.publishableKey} -ContentType 'application/json' -Body $body -TimeoutSec 8
} catch { Write-Host 'Sem rede: o site detectara o desligamento em ate 45 segundos.' }
Start-Sleep 2
# Stop only this installation's processes; never another Ollama or Node session.
$processes = Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith("$base\runtime\", [System.StringComparison]::OrdinalIgnoreCase) }
foreach ($process in $processes) { Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue }
Remove-Item -LiteralPath "$base\worker.pid","$base\ollama.pid" -ErrorAction SilentlyContinue
Write-Host 'IA desligada. Processos do EduTrack encerrados; memoria e GPU liberadas.'
Start-Sleep 4
