$ErrorActionPreference = 'Stop'
$base = $PSScriptRoot
try {
  if (Test-Path "$base\worker.pid") {
    $workerId = [int](Get-Content "$base\worker.pid")
    $existing = Get-CimInstance Win32_Process -Filter "ProcessId=$workerId"
    if ($existing -and $existing.CommandLine -like '*EduTrack-AI*worker.mjs*') {
      Write-Host 'A IA do EduTrack ja esta ligada.'
      Start-Sleep -Seconds 3
      exit
    }
  }
  Remove-Item -LiteralPath "$base\stop.flag" -ErrorAction SilentlyContinue
  $env:OLLAMA_MODELS = "$base\models"
  $env:OLLAMA_HOST = '127.0.0.1:11435'
  $env:OLLAMA_VULKAN = '1'
  $env:OLLAMA_NUM_PARALLEL = '1'
  $env:OLLAMA_MAX_LOADED_MODELS = '1'
  $env:OLLAMA_CONTEXT_LENGTH = '8192'
  $env:OLLAMA_KEEP_ALIVE = '60s'
  $env:TEMP = "$base\temp"
  $env:TMP = $env:TEMP
  $available = $false
  try { $null = Invoke-RestMethod 'http://127.0.0.1:11435/api/version' -TimeoutSec 2; $available = $true } catch {}
  if (-not $available) {
    $server = Start-Process "$base\runtime\ollama.exe" -ArgumentList 'serve' -WindowStyle Hidden -PassThru -RedirectStandardOutput "$base\logs\ollama.out.log" -RedirectStandardError "$base\logs\ollama.err.log"
    $server.Id | Set-Content "$base\ollama.pid"
    for ($i=0; $i -lt 30; $i++) {
      try { $null = Invoke-RestMethod 'http://127.0.0.1:11435/api/version' -TimeoutSec 2; $available = $true; break } catch { Start-Sleep 1 }
    }
  }
  if (-not $available) { throw 'O motor da IA nao iniciou. Consulte a pasta logs.' }
  $worker = Start-Process "$base\runtime\node.exe" -ArgumentList "`"$base\worker.mjs`"" -WorkingDirectory $base -WindowStyle Hidden -PassThru -RedirectStandardOutput "$base\logs\worker.out.log" -RedirectStandardError "$base\logs\worker.err.log"
  $worker.Id | Set-Content "$base\worker.pid"
  Write-Host 'IA ligada. O EduTrack na internet pode gerar material enquanto este PC estiver ligado.'
  Write-Host 'Para jogar, use o atalho Desligar IA.'
  Start-Sleep 4
} catch { Write-Host $_.Exception.Message; Read-Host 'Pressione Enter para fechar' }
