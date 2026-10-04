@echo off
rem Double-click to run the whole suite. All logic lives in run.sh; this just
rem forwards to bash. Writing the loop in cmd means fighting both the parens in
rem %ProgramFiles(x86)% and the console codepage, which is not worth it.
cd /d "%~dp0"

where bash >nul 2>&1
if errorlevel 1 (
  echo bash not found. Install Git for Windows, or run: bash tests/run.sh
  exit /b 2
)

bash run.sh %*
exit /b %errorlevel%
