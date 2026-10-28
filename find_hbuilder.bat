@echo off
for /f "tokens=2*" %%a in ('powershell -NoProfile -Command "(New-Object -COM WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop') + '\HBuilderX.lnk').TargetPath"') do set TARGET=%%a
echo %TARGET%