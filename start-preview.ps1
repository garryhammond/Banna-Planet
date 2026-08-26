$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $projectRoot
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
  $bundledPython = 'C:\Users\hammo\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
  if (Test-Path -LiteralPath $bundledPython) { $python = Get-Item -LiteralPath $bundledPython }
}
if (-not $python) { throw 'Python is required to serve the local preview.' }
Start-Process 'http://localhost:4173'
& $python.Source -m http.server 4173 --bind 127.0.0.1
