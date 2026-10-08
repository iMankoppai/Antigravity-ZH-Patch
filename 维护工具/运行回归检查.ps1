param([switch]$IncludeRenderer)
$ErrorActionPreference = 'Stop'
$handoffRoot = Split-Path -Parent $PSScriptRoot
$sourceWork = Join-Path $handoffRoot 'work'
$targetVersion = if (Test-Path (Join-Path $sourceWork 'adapt-2-21-1')) { '2-21-1' } else { '2-19-1' }
$adaptDir = 'adapt-' + $targetVersion
$node = Join-Path $sourceWork "$adaptDir\patch\runtime\node.exe"
$runRoot = Join-Path ([IO.Path]::GetTempPath()) ('Antigravity-Handoff-Checks-' + [Guid]::NewGuid().ToString('N'))
$runWork = Join-Path $runRoot 'work'
New-Item -ItemType Directory -Path $runWork -Force | Out-Null
$sources = @("test-close-$targetVersion.js","test-tray-$targetVersion.js","test-autoload-$targetVersion.js","test-portable-$targetVersion.js")
if ($IncludeRenderer) { $sources += @('test-renderer-current.js','pending-branch-additions.json','onboarding-fix-additions.json','injector-runtime.js') }
foreach ($name in $sources) { Copy-Item -LiteralPath (Join-Path $sourceWork $name) -Destination (Join-Path $runWork $name) }
Copy-Item -LiteralPath (Join-Path $sourceWork $adaptDir) -Destination (Join-Path $runWork $adaptDir) -Recurse
$tests = @("test-close-$targetVersion.js","test-tray-$targetVersion.js","test-autoload-$targetVersion.js","test-portable-$targetVersion.js")
if ($IncludeRenderer) { $tests += 'test-renderer-current.js' }
foreach ($test in $tests) {
    $output = & $node (Join-Path $runWork $test) 2>&1
    $exitStatus = $LASTEXITCODE
    $output | Out-File -LiteralPath (Join-Path $runRoot ($test + '.log')) -Encoding utf8
    if ($exitStatus -ne 0) { throw ('检查失败：' + $test + '；日志目录：' + $runRoot) }
    Write-Host ('通过：' + $test)
}
$results = @($tests | ForEach-Object {
    $name = switch ($_) {
        "test-close-$targetVersion.js" { "close-$targetVersion-results.json" }
        "test-tray-$targetVersion.js" { "tray-$targetVersion-results.json" }
        "test-autoload-$targetVersion.js" { "autoload-$targetVersion-results.json" }
        "test-portable-$targetVersion.js" { "portable-$targetVersion-results.json" }
        'test-renderer-current.js' {'renderer-current-results.json'}
    }
    $result = [IO.File]::ReadAllText((Join-Path $runWork $name)) | ConvertFrom-Json
    [pscustomobject][ordered]@{script=$_;passed=$result.passed;resultFile=(Join-Path $runWork $name)}
})
$summary = [ordered]@{passed=($results | Measure-Object -Property passed -Sum).Sum;includeRenderer=[bool]$IncludeRenderer;productionUntouched=$true;results=$results;runDirectory=$runRoot}
[IO.File]::WriteAllText((Join-Path $runRoot 'summary.json'),($summary | ConvertTo-Json -Depth 8),(New-Object Text.UTF8Encoding($false)))
$summary | ConvertTo-Json -Depth 8
