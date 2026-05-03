#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GrandHubAi — Универсальный кросс-платформенный launcher
Copyright (c) 2026 Кагиров Абдул-Хаким Ахмадович

Запускает локальный HTTP-сервер на порту 8080 и открывает браузер.
Работает на любой ОС с Python 3.6+.

Использование:
    python start.py            # порт 8080 (по умолчанию)
    python start.py 8000       # кастомный порт
    python start.py 8080 --no-browser  # без автозапуска браузера
"""
import http.server
import socketserver
import webbrowser
import threading
import sys
import os
import time

# Принудительно UTF-8 для stdout/stderr на Windows (иначе ошибка с эмодзи и кириллицей)
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except (AttributeError, Exception):
    # Python < 3.7 или закрытый stdout — fallback на простую перекодировку
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def find_free_port(start=8080, end=8100):
    """Находим свободный порт в диапазоне."""
    import socket
    for p in range(start, end):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('', p))
                return p
            except OSError:
                continue
    raise RuntimeError(f"Нет свободных портов в диапазоне {start}-{end}")


def main():
    # Парсим аргументы
    args = sys.argv[1:]
    no_browser = '--no-browser' in args
    args = [a for a in args if a != '--no-browser']

    port = int(args[0]) if args else 8080

    # Меняем рабочую директорию на src/
    script_dir = os.path.dirname(os.path.abspath(__file__))
    src_dir = os.path.join(script_dir, 'src')
    if not os.path.isdir(src_dir):
        print(f"❌ Не найдена директория: {src_dir}")
        print("   Запустите этот скрипт из корня проекта GrandHubAi.")
        sys.exit(1)
    os.chdir(src_dir)

    # Проверяем что порт свободен
    try:
        port = find_free_port(port, port + 20)
    except RuntimeError as e:
        print(f"❌ {e}")
        sys.exit(1)

    url = f"http://localhost:{port}"

    # Заголовок
    bar = "═" * 60
    print()
    print(bar)
    print("   GrandHubAi · Multi-Agent AI Platform")
    print("   © 2026 Кагиров Абдул-Хаким Ахмадович")
    print(bar)
    print()
    print(f"   ✅ Сервер запущен:  {url}")
    print(f"   📁 Корень:         {src_dir}")
    print(f"   ⏹  Остановить:     Ctrl+C")
    print()
    print(bar)
    print()

    # Открываем браузер с небольшой задержкой
    if not no_browser:
        threading.Timer(1.5, lambda: webbrowser.open(url)).start()

    # HTTP сервер с поддержкой PWA (правильные MIME-типы для .json и .js)
    class Handler(http.server.SimpleHTTPRequestHandler):
        def end_headers(self):
            # CORS не нужен (one-origin), но добавим заголовки безопасности
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('X-Frame-Options', 'DENY')
            self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
            super().end_headers()

        def log_message(self, format, *args):
            # Краткий лог: только запрошенный URL без timestamp
            method = args[0] if len(args) > 0 else '?'
            status = args[1] if len(args) > 1 else '?'
            print(f"   {method.split()[0] if ' ' in str(method) else method} {status}")

    Handler.extensions_map.update({
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.webmanifest': 'application/manifest+json',
    })

    try:
        with socketserver.TCPServer(("", port), Handler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print()
        print(bar)
        print("   👋 Сервер остановлен.")
        print(bar)
        print()


if __name__ == "__main__":
    main()
