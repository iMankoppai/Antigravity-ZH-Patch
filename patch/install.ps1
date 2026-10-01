param([string]$AppPath)
. (Join-Path $PSScriptRoot 'common.ps1')
Test-PackageIntegrity
$sourceRoot = $PSScriptRoot
$nodePath = Join-Path $sourceRoot 'runtime\node.exe'
$runtime = & $nodePath -p 'JSON.stringify({arch:process.arch,fetch:typeof fetch,webSocket:typeof WebSocket})'
if ($LASTEXITCODE -ne 0) { throw '随包运行环境无法启动。' }
$runtime = $runtime | ConvertFrom-Json
if ($runtime.arch -ne 'x64' -or $runtime.fetch -ne 'function' -or $runtime.webSocket -ne 'function') { throw '本包适用于 Windows x64，请重新解压完整压缩包。' }
if (-not $AppPath) {
    Add-Type -AssemblyName System.Windows.Forms
    $picker = New-Object System.Windows.Forms.OpenFileDialog
    $picker.Title = '请选择已安装的 Antigravity.exe'
    $picker.Filter = 'Antigravity.exe|Antigravity.exe'
    if ($picker.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { Write-Host '安装已取消。'; exit 0 }
    $AppPath = $picker.FileName
}
$AppPath = [IO.Path]::GetFullPath($AppPath)
if (-not (Test-Path -LiteralPath $AppPath) -or [IO.Path]::GetFileName($AppPath) -ne 'Antigravity.exe') { throw '请选择已安装软件的 Antigravity.exe。' }
Assert-AppClosed $AppPath
$appDirectory = [IO.Path]::GetDirectoryName($AppPath)
$archive = Join-Path $appDirectory 'resources\app.asar'
$deploymentRoot = [IO.Path]::GetFullPath((Join-Path $appDirectory '中文补丁'))
$backupRoot = Join-Path $deploymentRoot 'backups'
$inspection = Invoke-PatchNative 'inspect' $archive
if ($inspection.code -ne 0) { throw $inspection.error }
$info = $inspection.text | ConvertFrom-Json
if ($info.version -ne '2.18.1' -or -not $info.nativeSupported) { throw '本包只适配已验证的 Antigravity 2.18.1 资源；请先用旧补丁恢复英文，其他版本需重新适配。' }
$preflight = Invoke-PatchNative 'preflight' $archive $backupRoot $AppPath
if ($preflight.code -ne 0) { throw $preflight.error }
if ($sourceRoot -ne $deploymentRoot -and (Test-Path -LiteralPath $deploymentRoot)) {
    $existingConfig = Join-Path $deploymentRoot 'config.json'
    if (-not (Test-Path -LiteralPath $existingConfig)) { throw '软件目录下的“中文补丁”已有其他内容，请先换名或移开，再安装。' }
    $existing = [IO.File]::ReadAllText($existingConfig) | ConvertFrom-Json
    if ($existing.appPath -ne $AppPath) { throw '现有“中文补丁”属于另一份应用，停止安装。' }
}
Stop-OwnInjector
$manifest = [IO.File]::ReadAllText((Join-Path $sourceRoot 'manifest.json')) | ConvertFrom-Json
$names = @($manifest.files | ForEach-Object {$_.path}) + @('manifest.json','config.json')
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
$transaction = Join-Path $backupRoot ('install-1.0.2-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $transaction | Out-Null
Copy-Item -LiteralPath $archive -Destination (Join-Path $transaction 'app-before.asar')
$oldFiles = @()
$createdFiles = @()
try {
    foreach ($name in $names) {
        $destination = [IO.Path]::GetFullPath((Join-Path $deploymentRoot $name))
        if (-not $destination.StartsWith($deploymentRoot.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)) { throw '发布文件路径无效。' }
        if (Test-Path -LiteralPath $destination) {
            $saved = Join-Path $transaction $name
            New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($saved)) -Force | Out-Null
            Copy-Item -LiteralPath $destination -Destination $saved
            $oldFiles += $name
        } else { $createdFiles += $destination }
        if ($name -eq 'config.json') { continue }
        if ($sourceRoot -ne $deploymentRoot) {
            New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($destination)) -Force | Out-Null
            Copy-Item -LiteralPath (Join-Path $sourceRoot $name) -Destination $destination -Force
        }
    }
    $call = Invoke-PatchNative 'apply' $archive $backupRoot $AppPath
    if ($call.code -ne 0) { throw $call.error }
    $config = [ordered]@{appPath=$AppPath;version='2.18.1';enabled=$true;nativeOwned=$true;nativeStatus='autoload';desktopShortcut=$null;releaseVersion='1.0.2';installedAt=(Get-Date -Format o)}
    [IO.File]::WriteAllText((Join-Path $deploymentRoot 'config.json'),($config|ConvertTo-Json -Depth 5),(New-Object System.Text.UTF8Encoding($false)))
    foreach ($item in $manifest.files) { if ((Get-PackageFileHash (Join-Path $deploymentRoot $item.path)).ToLower() -ne $item.sha256) { throw ('安装后文件校验失败：'+$item.path) } }
    if ($sourceRoot -ne $deploymentRoot) {
        $config.nativeOwned = $false
        $config.installationRoot = $deploymentRoot
        Save-PatchConfig $config
    }
} catch {
    foreach ($name in $oldFiles) { Copy-Item -LiteralPath (Join-Path $transaction $name) -Destination (Join-Path $deploymentRoot $name) -Force }
    foreach ($created in $createdFiles) { if (Test-Path -LiteralPath $created -PathType Leaf) { Remove-Item -LiteralPath $created } }
    Copy-Item -LiteralPath (Join-Path $transaction 'app-before.asar') -Destination $archive -Force
    throw
}
Write-Host ('安装完成：'+$deploymentRoot)
Write-Host '现在从开始菜单、任务栏或程序本体打开，都会自动加载汉化。'
Write-Host '未创建桌面快捷方式；请保留软件目录下的“中文补丁”文件夹。'
