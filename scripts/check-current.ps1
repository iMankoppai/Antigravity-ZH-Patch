<#
.SYNOPSIS
    Antigravity 汉化项目统一检查入口。

.DESCRIPTION
    仅针对当前源码运行必需检查，不依赖历史 work/adapt-* 目录。
    任一项必需检查失败即以非零退出码结束，供本地与 CI 复用。

    检查顺序：
      1. 依赖检查（Node.js、.NET 8 SDK、Chrome）
      2. 词库质量门禁
      3. 运行时语法检查
      4. 内核生成同步检查（重建汉化内核.js --check）
      5. 浏览器渲染回归（可用 -SkipBrowser 跳过）
      6. 打包一致性门禁（源码 <-> bundle <-> 已安装 ASAR）
      7. 版本一致性门禁（内核版本、词条数、运行时期望值互相对齐）

.PARAMETER SkipBrowser
    跳过需要 Chrome 的渲染回归，并把该项记为“未运行”。

.PARAMETER AsarPath
    用于打包一致性比较的 app.asar 路径。默认使用本机 Antigravity 安装路径；
    传空字符串可跳过安装层比较。

.PARAMETER ReportPath
    结果 JSON 落盘路径，默认 work/check-current-result.json。
#>
[CmdletBinding()]
param(
    [switch]$SkipBrowser,
    [string]$AsarPath,
    [string]$ReportPath
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot
if (-not $ReportPath) { $ReportPath = Join-Path $repoRoot 'work\check-current-result.json' }

$results = New-Object System.Collections.Generic.List[object]
function Add-Result([string]$Name, [string]$Status, [string]$Detail) {
    $results.Add([pscustomobject]@{ name = $Name; status = $Status; detail = $Detail })
    $color = switch ($Status) { 'PASS' { 'Green' } 'FAIL' { 'Red' } default { 'Yellow' } }
    Write-Host ("[{0}] {1} - {2}" -f $Status, $Name, $Detail) -ForegroundColor $color
}

# ---- 1. dependencies ----
$depsOk = $true
$nodeExe = $null
try { $nodeExe = (Get-Command node -ErrorAction Stop).Source } catch { }
if (-not $nodeExe) { Add-Result 'node' 'FAIL' '未找到 Node.js'; $depsOk = $false }
else { Add-Result 'node' 'PASS' (& $nodeExe --version) }

# Prefer a dotnet host that actually reports an 8.x SDK; PATH may point at a
# runtime-only host. Candidates are tried in order and the first with 8.x wins.
$sdkCandidates = New-Object System.Collections.Generic.List[string]
$thisSdk = 'C:\Users\24844\AppData\Local\dotnet\dotnet.exe'
if (Test-Path -LiteralPath $thisSdk) { $sdkCandidates.Add($thisSdk) }
$sdkCmd = Get-Command dotnet -ErrorAction SilentlyContinue
if ($sdkCmd -and (Test-Path -LiteralPath $sdkCmd.Source)) { $sdkCandidates.Add($sdkCmd.Source) }
$sdkExe = $null
foreach ($cand in $sdkCandidates) {
    $listed = (& $cand --list-sdks) 2>$null
    if ($LASTEXITCODE -eq 0 -and ($listed -match '^8\.')) { $sdkExe = $cand; $sdkLine = ($listed | Select-Object -First 1); break }
}
if ($sdkExe) { Add-Result 'dotnet-sdk' 'PASS' "$sdkLine ($sdkExe)" }
else { Add-Result 'dotnet-sdk' 'FAIL' ("未找到 .NET 8 SDK。候选：{0}" -f (($sdkCandidates -join '; '))); $depsOk = $false }

$chromeExe = if ($env:ZH_CHROME_PATH) { $env:ZH_CHROME_PATH } else { 'C:\Program Files\Google\Chrome\Application\chrome.exe' }
$chromeOk = Test-Path -LiteralPath $chromeExe
if ($SkipBrowser) { Add-Result 'chrome' 'SKIP' '调用方要求跳过浏览器回归' }
elseif ($chromeOk) { Add-Result 'chrome' 'PASS' $chromeExe }
else { Add-Result 'chrome' 'FAIL' "未找到 Chrome：$chromeExe（可设置 ZH_CHROME_PATH）" }

if (-not $depsOk) { $results | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $ReportPath -Encoding UTF8; exit 1 }

function Invoke-CheckFile([string]$Name, [string]$ScriptPath, [bool]$Required) {
    Write-Host ("--- {0}" -f $Name) -ForegroundColor Cyan
    & $ScriptPath 2>&1 | ForEach-Object { Write-Host $_ }
    $code = $LASTEXITCODE
    if ($code -eq 0) { Add-Result $Name 'PASS' 'exit 0' }
    elseif ($Required) { Add-Result $Name 'FAIL' "exit $code" }
    else { Add-Result $Name 'SKIP' "exit $code（非必需）" }
    return $code
}

function Invoke-Check([string]$Name, [string[]]$CommandArgs, [bool]$Required) {
    Write-Host ("--- {0}" -f $Name) -ForegroundColor Cyan
    & $nodeExe @CommandArgs 2>&1 | ForEach-Object { Write-Host $_ }
    $code = $LASTEXITCODE
    if ($code -eq 0) { Add-Result $Name 'PASS' 'exit 0' }
    elseif ($Required) { Add-Result $Name 'FAIL' "exit $code" }
    else { Add-Result $Name 'SKIP' "exit $code（非必需）" }
    return $code
}

# ---- 2..4, 6: source-level gates ----
$null = Invoke-Check 'dictionary-quality' @('tests/localization/dictionary-quality.cjs') $true
$null = Invoke-Check 'runtime-syntax' @('--check', 'src/AntigravityZhManager/Assets/translate.js') $true
$null = Invoke-Check 'regex-safety' @('tests/localization/regex-safety.cjs') $true
$null = Invoke-Check 'deep-interface-coverage' @('tests/localization/deep-interface-coverage.cjs') $true
$null = Invoke-Check 'kernel-sync' @('维护工具/重建汉化内核.js', '--check') $true
$null = Invoke-Check 'generator-consistency' @('tests/packaging/generator-consistency.cjs') $true

if (-not $SkipBrowser -and $chromeOk) {
    $old = $env:ZH_CHROME_PATH
    try {
        $env:ZH_CHROME_PATH = $chromeExe
        $null = Invoke-Check 'renderer-regression' @('tests/renderer/status-label-regression.cjs') $true
$null = Invoke-Check 'wrapper-guard' @('tests/renderer/wrapper-guard.cjs') $true
    } finally { $env:ZH_CHROME_PATH = $old }
} else {
    Add-Result 'renderer-regression' 'SKIP' '未运行浏览器回归（缺少 Chrome 或显式跳过）'
}

if ($null -eq $AsarPath) {
    $AsarPath = ''
    foreach ($candidate in @($env:ZH_ASAR, 'D:\Antigravity\resources\app.asar', 'C:\Users\24844\AppData\Local\Programs\antigravity\resources\app.asar')) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) { $AsarPath = $candidate; break }
    }
}
$asarArgs = @('tests/packaging/bundle-consistency.cjs')
if ($AsarPath) { $asarArgs += @('--asar', $AsarPath) }
$null = Invoke-Check 'bundle-consistency' $asarArgs $true
$null = Invoke-Check 'version-consistency' @('tests/packaging/version-consistency.cjs') $true
$null = Invoke-Check 'release-consistency' @('tests/packaging/release-consistency.cjs') $true
$null = Invoke-Check 'baseline-manifest' @('tests/packaging/baseline-manifest.cjs') $true
$null = Invoke-Check 'anchor-coverage' @('tests/packaging/anchor-coverage.cjs') $true
$null = Invoke-CheckFile 'engine-baseline' 'tests/packaging/run-engine-tests.ps1' $true

$failed = @($results | Where-Object { $_.status -eq 'FAIL' }).Count
$skipped = @($results | Where-Object { $_.status -eq 'SKIP' }).Count
$summary = [pscustomobject]@{
    generatedAt = (Get-Date).ToString('s')
    repoRoot    = $repoRoot
    failed      = $failed
    skipped     = $skipped
    results     = $results
}
New-Item -ItemType Directory -Path (Split-Path -Parent $ReportPath) -Force | Out-Null
$summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
Write-Host ''
Write-Host ("检查完成：失败 {0} 项，跳过/未运行 {1} 项。结果：{2}" -f $failed, $skipped, $ReportPath)
if ($failed -gt 0) { exit 1 }
exit 0
