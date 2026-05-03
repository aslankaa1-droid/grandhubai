@echo off
REM ============================================================
REM GrandHubAi — Launcher для Windows
REM Copyright (c) 2026 Кагиров Абдул-Хаким Ахмадович
REM ============================================================
REM Запускает локальный HTTP-сервер и открывает GrandHubAi в браузере.
REM Это включает PWA-функции (Service Worker, установка как app, оффлайн-кэш).
REM ============================================================

cd /d "%~dp0src"
chcp 65001 >nul
title GrandHubAi · http://localhost:8080

echo.
echo ============================================================
echo   GrandHubAi  Multi-Agent AI Platform
echo   (c) 2026 Kagirov A-Kh A.
echo ============================================================
echo.
echo   Запускаю локальный сервер...
echo   После запуска откройте http://localhost:8080
echo   Закрытие этого окна остановит сервер.
echo.
echo ============================================================
echo.

REM Открываем браузер с задержкой (чтобы сервер успел стартовать)
start "" "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8080"

REM Пробуем разные варианты Python (py — Python launcher Windows; python — обычный)
where py >nul 2>&1
if %errorlevel%==0 (
    py -3 -m http.server 8080
    goto :end
)

where python >nul 2>&1
if %errorlevel%==0 (
    python -m http.server 8080
    goto :end
)

REM Если Python не найден — пробуем Node.js
where node >nul 2>&1
if %errorlevel%==0 (
    where npx >nul 2>&1
    if %errorlevel%==0 (
        npx --yes http-server -p 8080 -c-1
        goto :end
    )
)

REM Ничего не найдено
echo.
echo ============================================================
echo   ОШИБКА: Не найден Python или Node.js
echo ============================================================
echo.
echo   Установите один из вариантов:
echo.
echo   1) Python (рекомендуется, бесплатно):
echo      https://www.python.org/downloads/
echo      При установке отметьте "Add Python to PATH"
echo.
echo   2) Node.js (альтернатива):
echo      https://nodejs.org/
echo.
echo   После установки запустите этот скрипт снова.
echo.
echo ============================================================
pause

:end
