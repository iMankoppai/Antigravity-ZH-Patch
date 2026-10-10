<#
.SYNOPSIS
    运行引擎侧基线判定回归（编译生产 BaselineManifest.cs）。
#>
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location -LiteralPath $repoRoot
$dotnet = 'C:\Users\24844\AppData\Local\dotnet\dotnet.exe'
if (-not (Test-Path -LiteralPath $dotnet)) {
    $cmd = Get-Command dotnet -ErrorAction SilentlyContinue
    if ($cmd) { $dotnet = $cmd.Source } else { Write-Error '.NET SDK 未定位'; exit 2 }
}
& $dotnet run --project 'tests/packaging/engine-tests/EngineTests.csproj' -c Release --nologo
exit $LASTEXITCODE
