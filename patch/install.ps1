param([string]$AppPath, [string]$DesktopDir)
. (Join-Path $PSScriptRoot 'common.ps1')
Test-PackageIntegrity
$nodePath = Join-Path $PSScriptRoot 'runtime\node.exe'
$runtime = & $nodePath -p 'JSON.stringify({arch:process.arch,fetch:typeof fetch,webSocket:typeof WebSocket})'
if ($LASTEXITCODE -ne 0) { throw '随包运行环境无法启动；本包适用于 Windows x64 电脑。' }
$runtime = $runtime | ConvertFrom-Json
if ($runtime.arch -ne 'x64' -or $runtime.fetch -ne 'function' -or $runtime.webSocket -ne 'function') { throw '随包运行环境不符合要求，请重新解压完整压缩包。' }
if (-not $AppPath) {
    Add-Type -AssemblyName System.Windows.Forms
    $picker = New-Object System.Windows.Forms.OpenFileDialog
    $picker.Title = '请选择另一台电脑上已安装的 Antigravity.exe'
    $picker.Filter = 'Antigravity.exe|Antigravity.exe'
    $picker.CheckFileExists = $true
    $candidates = @('D:\Antigravity', (Join-Path $env:LOCALAPPDATA 'Programs\Antigravity'), (Join-Path $env:ProgramFiles 'Antigravity'))
    foreach ($candidate in $candidates) { if (Test-Path -LiteralPath (Join-Path $candidate 'Antigravity.exe')) { $picker.InitialDirectory = $candidate; break } }
    if ($picker.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { Write-Host '安装已取消，应用没有改动。'; exit 0 }
    $AppPath = $picker.FileName
}
$AppPath = [System.IO.Path]::GetFullPath($AppPath)
if (-not (Test-Path -LiteralPath $AppPath) -or [System.IO.Path]::GetFileName($AppPath) -ne 'Antigravity.exe') { throw '请选择已安装软件的 Antigravity.exe。' }
Assert-AppClosed $AppPath
$asar = Join-Path ([System.IO.Path]::GetDirectoryName($AppPath)) 'resources\app.asar'
$inspection = Invoke-PatchNative 'inspect' $asar
if ($inspection.code -ne 0) { throw '无法读取 Antigravity 版本；请选择正确的安装位置。' }
$info = $inspection.text | ConvertFrom-Json
if ($info.version -ne '2.18.1') { throw "本包已验证 Antigravity 2.18.1；当前是 $($info.version)，安装已停止，未修改应用。" }
Stop-OwnInjector
if (-not $DesktopDir) { $DesktopDir = [Environment]::GetFolderPath('DesktopDirectory') }
$DesktopDir = [System.IO.Path]::GetFullPath($DesktopDir)
if (-not (Test-Path -LiteralPath $DesktopDir -PathType Container)) { throw '桌面目录不存在。' }
$shortcutPath = Join-Path $DesktopDir 'Antigravity 中文版 v26.lnk'
$shell = New-Object -ComObject WScript.Shell
if (Test-Path -LiteralPath $shortcutPath) {
    $existing = $shell.CreateShortcut($shortcutPath)
    if ($existing.Arguments -ne ('"' + (Join-Path $PSScriptRoot 'launch.vbs') + '"')) { throw '桌面上已有同名的其他快捷方式，请先换名或移开后重新安装。' }
}
$configPath = Join-Path $PSScriptRoot 'config.json'
$nativeOwned = $false
if (Test-Path -LiteralPath $configPath) {
    $old = Get-PatchConfig
    if ($old.nativeOwned -and $old.appPath -ne $AppPath) { throw '本文件夹已适配另一份安装，请先对旧位置执行“恢复英文.cmd”，再选择新位置。' }
    $nativeOwned = [bool]$old.nativeOwned
}
$backupDir = Join-Path $PSScriptRoot 'backups'
$config = [ordered]@{ appPath = $AppPath; version = $info.version; enabled = $true; nativeOwned = $nativeOwned; nativeStatus = 'pending'; desktopShortcut = $shortcutPath; installedAt = (Get-Date -Format o) }
Save-PatchConfig $config
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $env:SystemRoot 'System32\wscript.exe'
$shortcut.Arguments = '"' + (Join-Path $PSScriptRoot 'launch.vbs') + '"'
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.IconLocation = $AppPath + ',0'
$shortcut.Description = 'Antigravity 2.18.1 中文补丁 v26'
$shortcut.Save()
$nativeStatus = 'skipped'
if ($info.nativeSupported) {
    $nativeCall = Invoke-PatchNative 'apply' $asar $backupDir $AppPath
    if ($nativeCall.code -eq 0) {
        $nativeResult = $nativeCall.text | ConvertFrom-Json
        $nativeStatus = $nativeResult.status
        if ($nativeStatus -eq 'applied') { $config.nativeOwned = $true }
    } else { Write-Host '原生标题适配已跳过，页面汉化仍可使用。'; Write-Host $nativeCall.error }
} else { Write-Host '应用资源与已验证版本不同，已跳过原生标题；页面汉化仍可使用。' }
$config.nativeStatus = $nativeStatus
Save-PatchConfig $config
Write-Host ''
Write-Host '安装完成。以后双击桌面“Antigravity 中文版 v26”启动。'
Write-Host '请保留这个解压文件夹，不要只复制其中的快捷方式。'
Write-Host "原生标题状态：$nativeStatus"
