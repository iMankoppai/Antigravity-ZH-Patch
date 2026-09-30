. (Join-Path $PSScriptRoot 'common.ps1')
$config = Get-PatchConfig
Assert-AppClosed $config.appPath
Stop-OwnInjector
$config.enabled = $false
Save-PatchConfig $config
$nativeError = $null
if ($config.nativeOwned) {
    $asar = Join-Path ([System.IO.Path]::GetDirectoryName($config.appPath)) 'resources\app.asar'
    $restoration = Invoke-PatchNative 'restore' $asar (Join-Path $PSScriptRoot 'backups')
    if ($restoration.code -ne 0) { $nativeError = $restoration.error }
    else { $config.nativeOwned = $false; $config.nativeStatus = 'restored'; Save-PatchConfig $config }
}
$shortcutPath = $config.desktopShortcut
if ($shortcutPath -and (Test-Path -LiteralPath $shortcutPath)) {
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($shortcutPath)
    if ($shortcut.TargetPath -eq (Join-Path $env:SystemRoot 'System32\wscript.exe') -and $shortcut.Arguments -eq ('"' + (Join-Path $PSScriptRoot 'launch.vbs') + '"')) { Remove-Item -LiteralPath $shortcutPath }
}
Write-Host '页面补丁已停用。以后从软件原来的快捷方式启动。'
Write-Host '本文件夹和备份已保留，确认恢复成功后可手动删除。'
if ($nativeError) { Write-Host '原生资源未恢复，避免旧备份覆盖软件更新：'; throw $nativeError }
