#!/usr/bin/env bash
# ============================================================
# GrandHubAi — Launcher для macOS / Linux
# Copyright (c) 2026 Кагиров Абдул-Хаким Ахмадович
# ============================================================

set -e

# Переходим в директорию проекта
cd "$(dirname "$0")/src"

PORT=8080
URL="http://localhost:$PORT"

echo ""
echo "============================================================"
echo "   GrandHubAi · Multi-Agent AI Platform"
echo "   (c) 2026 Kagirov A-Kh A."
echo "============================================================"
echo ""
echo "   Запускаю локальный сервер на $URL"
echo "   Нажмите Ctrl+C для остановки"
echo ""
echo "============================================================"
echo ""

# Открываем браузер в фоне с небольшой задержкой
(sleep 2 && (
    if command -v xdg-open >/dev/null; then
        xdg-open "$URL"
    elif command -v open >/dev/null; then
        open "$URL"
    elif command -v sensible-browser >/dev/null; then
        sensible-browser "$URL"
    fi
)) &

# Пробуем разные варианты HTTP-серверов в порядке приоритета
if command -v python3 >/dev/null; then
    exec python3 -m http.server $PORT
elif command -v python >/dev/null; then
    exec python -m http.server $PORT
elif command -v bun >/dev/null; then
    exec bunx serve -p $PORT .
elif command -v npx >/dev/null; then
    exec npx --yes http-server -p $PORT -c-1
else
    echo ""
    echo "============================================================"
    echo "  ОШИБКА: Не найден Python или Node.js"
    echo "============================================================"
    echo ""
    echo "  Установите один из вариантов:"
    echo ""
    echo "  macOS:    brew install python3"
    echo "  Ubuntu:   sudo apt install python3"
    echo "  Fedora:   sudo dnf install python3"
    echo ""
    echo "============================================================"
    exit 1
fi
