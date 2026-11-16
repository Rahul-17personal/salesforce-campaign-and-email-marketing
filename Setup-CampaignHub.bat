@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Setup-CampaignHub.ps1"
if errorlevel 1 (
  echo.
  echo CampaignHub setup did not complete. Review the error above.
  pause
)
endlocal
