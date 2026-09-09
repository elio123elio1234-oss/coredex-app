@echo off
rem ===========================================================
rem  CYPHIX HW_PLAYGROUND - XIAO nRF52840 GUI launcher
rem
rem  Double-click this. It starts a local web server and opens
rem  the GUI in Chrome (or Edge). No terminal work required.
rem
rem  Why a server and not just double-clicking index.html:
rem  Chrome refuses Web Bluetooth on file:// origins, so the
rem  page would load but Connect could never work.
rem ===========================================================
setlocal
set PORT=8000
set GUIDIR=%~dp0gui
set URL=http://127.0.0.1:%PORT%/index.html

if not exist "%GUIDIR%\index.html" (
  echo ERROR: cannot find "%GUIDIR%\index.html"
  echo This .bat must stay next to the gui\ folder.
  pause
  exit /b 1
)

rem --- resolve python OUTSIDE any if-block: %VAR% set and read inside the
rem     same parenthesised block expands at parse time and comes back empty ---
set PY=C:\Users\elio1\AppData\Local\Programs\Python\Python312\python.exe
if not exist "%PY%" set PY=python

rem --- reuse the server if one is already listening on PORT ---
set RUNNING=
for /f %%A in ('netstat -ano ^| findstr /c:"127.0.0.1:%PORT%" ^| findstr /c:"LISTENING"') do set RUNNING=1

if defined RUNNING echo Local server already running on port %PORT%.
if not defined RUNNING echo Starting local server on port %PORT% ...
if not defined RUNNING cd /d "%GUIDIR%"
if not defined RUNNING start "CYPHIX XIAO GUI server (close this window to stop)" /min cmd /c %PY% -m http.server %PORT% --bind 127.0.0.1
if not defined RUNNING ping -n 3 127.0.0.1 >nul

rem --- Web Bluetooth needs Chrome or Edge, so do not rely on the default browser ---
set BROWSER=
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set BROWSER=C:\Program Files\Google\Chrome\Application\chrome.exe
if not defined BROWSER if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set BROWSER=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
if not defined BROWSER if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" set BROWSER=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
if not defined BROWSER if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" set BROWSER=C:\Program Files\Microsoft\Edge\Application\msedge.exe

if defined BROWSER start "" "%BROWSER%" "%URL%"
if not defined BROWSER echo Chrome/Edge not found - opening the default browser instead.
if not defined BROWSER start "" "%URL%"

echo.
echo   GUI  : %URL%
echo   Device to pick in the Bluetooth dialog: CYPHIX-XIAO
echo.
echo   This window closes by itself. The minimised "GUI server" window
echo   keeps the page alive - close that one when you are done.
rem  ping, not timeout: "timeout" aborts with "Input redirection is not
rem  supported" whenever this runs with stdin redirected (scripts, CI, agents)
ping -n 9 127.0.0.1 >nul
endlocal

rem v0.1.0 - one-click GUI launcher: reuses a running server, forces Chrome/Edge for Web Bluetooth
