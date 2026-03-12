param(
  [switch]$Run
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Test-CommandExists {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Host ''
Write-Host 'Next Training Environment Check' -ForegroundColor Cyan
Write-Host ''

$nodeOk = Test-CommandExists 'node'
$npmOk = Test-CommandExists 'npm'
$dockerOk = Test-CommandExists 'docker'

Write-Host ('node:   ' + ($(if ($nodeOk) { 'OK' } else { 'MISSING' })))
Write-Host ('npm:    ' + ($(if ($npmOk) { 'OK' } else { 'MISSING' })))
Write-Host ('docker: ' + ($(if ($dockerOk) { 'OK' } else { 'MISSING' })))
Write-Host ''

if (-not (Test-Path '.env')) {
  Copy-Item '.env.example' '.env'
  Write-Host 'Created .env from .env.example' -ForegroundColor Yellow
}

if (-not $nodeOk -or -not $npmOk) {
  Write-Host 'Install Node.js 22 LTS before continuing.' -ForegroundColor Red
  exit 1
}

if ($dockerOk) {
  Write-Host 'To start PostgreSQL in Docker:' -ForegroundColor Green
  Write-Host '  docker compose up -d'
} else {
  Write-Host 'Docker is optional. You can also use a local/cloud PostgreSQL and update .env.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Next commands:' -ForegroundColor Green
Write-Host '  npm install'
Write-Host '  npm run prisma:generate'
Write-Host '  npm run prisma:migrate -- --name init_leaderboard'
Write-Host '  npm run dev'
Write-Host ''

if ($Run) {
  npm install
  npm run prisma:generate
  npm run prisma:migrate -- --name init_leaderboard
  npm run dev
}
