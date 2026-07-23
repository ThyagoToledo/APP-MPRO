@echo off
setlocal EnableExtensions

title M-PRO - Teste do prototipo

set "APP_DIR=%~dp0"
set "PORT=4173"
set "ENTRY=in_cio_dashboard_refinado\code.html"

echo.
echo ========================================
echo   M-PRO - Inicializador do prototipo
echo ========================================
echo.

where py >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON=py"
) else (
    where python >nul 2>&1
    if %errorlevel% equ 0 (
        set "PYTHON=python"
    ) else (
        echo ERRO: Python nao foi encontrado no PATH.
        echo Instale o Python 3 e marque a opcao "Add Python to PATH".
        pause
        exit /b 1
    )
)

if not exist "%APP_DIR%%ENTRY%" (
    echo ERRO: tela inicial nao encontrada:
    echo %APP_DIR%%ENTRY%
    pause
    exit /b 1
)

echo Pasta do app: %APP_DIR%
echo Porta local: %PORT%
echo.
echo O servidor sera aberto em outra janela.
echo Para encerrar o teste, feche a janela do servidor.
echo.

start "M-PRO - servidor local" cmd /k "cd /d ""%APP_DIR%"" && %PYTHON% -m http.server %PORT%"
timeout /t 2 /nobreak >nul
start "" "http://localhost:%PORT%/%ENTRY%"

echo App aberto no navegador.
echo Outras telas podem ser testadas usando os arquivos code.html dentro das pastas do prototipo.
pause

endlocal
