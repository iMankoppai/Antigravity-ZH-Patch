Option Explicit
Dim fso, shell, root, host, cmd
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
root = fso.GetParentFolderName(WScript.ScriptFullName)
host = shell.ExpandEnvironmentStrings("%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe")
cmd = """" & host & """ -NoProfile -NonInteractive -ExecutionPolicy Bypass -File """ & fso.BuildPath(root, "launch.ps1") & """"
shell.Run cmd, 0, False
