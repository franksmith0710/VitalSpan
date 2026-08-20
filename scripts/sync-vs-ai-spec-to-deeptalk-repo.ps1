param(
  [string]$DeepTalkRoot = (Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) "deeptalk"),
  [string]$IntegrationDir = "integrations\vitalspan"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Source = Join-Path $RepoRoot "docs\api\vs-ai-spec"
$TargetRoot = Join-Path $DeepTalkRoot $IntegrationDir
$TargetSpec = Join-Path $TargetRoot "vs-ai-spec"
$TargetExecutor = Join-Path $TargetRoot "executor"
$SourceExecutor = Join-Path $Source "deeptalk-product\executor"

if (-not (Test-Path -LiteralPath $Source)) {
  throw "Source spec pack not found: $Source"
}

foreach ($dir in @($TargetRoot, $TargetSpec, $TargetExecutor)) {
  if (-not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir | Out-Null
  }
}

Write-Host "Sync spec $Source -> $TargetSpec"
robocopy $Source $TargetSpec /E /XD __pycache__ .pytest_cache examples\_work _work deeptalk-product /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) {
  throw "robocopy spec failed with exit code $LASTEXITCODE"
}

Write-Host "Sync executor $SourceExecutor -> $TargetExecutor"
robocopy $SourceExecutor $TargetExecutor /E /XD __pycache__ /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) {
  throw "robocopy executor failed with exit code $LASTEXITCODE"
}

$examplesWork = Join-Path $TargetSpec "examples\_work"
if (Test-Path -LiteralPath $examplesWork) {
  Remove-Item -LiteralPath $examplesWork -Recurse -Force
}

$productFiles = @(
  "README.md",
  "config.yaml.example",
  "config.example.json",
  "AGENT-SYSTEM-PROMPT.md",
  "agent-tools.schema.json",
  "E2E-CHECKLIST.md"
)
$ProductSrc = Join-Path $Source "deeptalk-product"
foreach ($name in $productFiles) {
  $src = Join-Path $ProductSrc $name
  if (Test-Path -LiteralPath $src) {
    Copy-Item -LiteralPath $src -Destination (Join-Path $TargetRoot $name) -Force
  }
}

$configExample = Join-Path $TargetRoot "config.yaml.example"
$configLive = Join-Path $TargetRoot "config.yaml"
if (-not (Test-Path -LiteralPath $configLive) -and (Test-Path -LiteralPath $configExample)) {
  Copy-Item -LiteralPath $configExample -Destination $configLive
  Write-Host "created $configLive from example (edit vitalspan_root)"
}

Write-Host "done. DeepTalk integration at $TargetRoot"
Write-Host "Set vitalspan_root in $configLive and paste AGENT-SYSTEM-PROMPT.md into DeepTalk agent config."
