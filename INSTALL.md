# 🚀 GrandHubAi — Установка и запуск

**Самый простой способ запустить продукт за 30 секунд.**

---

## ⚡ Быстрый старт — выберите вашу ОС

### 🪟 Windows

**Способ 1 (рекомендуется):**
Двойной клик по файлу `start.bat` → автоматически откроется браузер.

**Способ 2 (через PowerShell):**
```powershell
cd "C:\путь\к\GrandHubAi"
.\start.bat
```

**Что делает скрипт:**
1. Проверяет наличие Python (или Node.js как резерв)
2. Запускает HTTP-сервер на `http://localhost:8080`
3. Открывает браузер автоматически
4. Пишет статус в окне терминала

---

### 🍎 macOS

**Способ 1 (через Terminal):**
```bash
cd /путь/к/GrandHubAi
chmod +x start.sh
./start.sh
```

**Способ 2 (двойной клик):**
1. Откройте Terminal → выполните `chmod +x /путь/start.sh` один раз
2. В Finder: ПКМ на `start.sh` → Open With → Terminal

---

### 🐧 Linux

```bash
cd /путь/к/GrandHubAi
chmod +x start.sh
./start.sh
```

---

### 🌍 Универсальный способ (все ОС)

Если у вас уже есть Python 3.6+:

```bash
python start.py
# или
python3 start.py
# или с кастомным портом:
python start.py 8000
# без автозапуска браузера:
python start.py 8080 --no-browser
```

---

## 🤔 Зачем вообще нужен сервер?

Современные браузеры отключают многие функции для файлов открытых через `file://` (двойной клик по `index.html`):

| Функция | `file://` | `http://localhost` |
|---|---|---|
| Базовый чат с ИИ | ✅ Работает | ✅ Работает |
| Установка как PWA-приложение | ❌ Заблокировано | ✅ Работает |
| Оффлайн-режим (Service Worker) | ❌ Заблокировано | ✅ Работает |
| Иконка на главном экране смартфона | ❌ Заблокировано | ✅ Работает |
| Фоновые уведомления | ❌ Заблокировано | ✅ Работает |
| Защищённое хранилище IndexedDB | ⚠️ Ограничено | ✅ Работает |

**Вывод:** для полного опыта используйте стартеры выше.

---

## 📥 Если Python и Node.js не установлены

### Установка Python (рекомендуется — самый простой вариант)

| ОС | Команда |
|---|---|
| **Windows** | Скачать установщик: [python.org/downloads](https://www.python.org/downloads/) → ⚠️ **отметить «Add Python to PATH»** при установке |
| **macOS** | `brew install python3` или скачать с [python.org](https://www.python.org/downloads/) |
| **Ubuntu/Debian** | `sudo apt install python3` |
| **Fedora** | `sudo dnf install python3` |
| **Arch** | `sudo pacman -S python` |

После установки запустите стартер ещё раз.

### Альтернатива — Node.js

| ОС | Команда |
|---|---|
| **Windows** | [nodejs.org](https://nodejs.org/) — установщик LTS |
| **macOS** | `brew install node` |
| **Linux** | См. `nodejs.org` или `nvm` |

---

## 📱 Установка как приложение на смартфон

После того как сервер запущен и страница открыта:

### Android (Chrome)
1. Меню (⋮) → **Установить приложение**
2. Иконка появится на главном экране

### iOS (Safari)
1. Кнопка «Поделиться» (⬆) → **На экран «Домой»**
2. Иконка появится на главном экране

### Windows / macOS (Chrome / Edge)
1. В адресной строке справа — иконка ⊕
2. Нажмите → **Установить GrandHubAi**
3. Появится в Start Menu / Dock как обычное приложение

---

## 🔄 Деплой на свой домен

Если хотите чтобы любой мог пользоваться (без скачивания):

### Бесплатно — Vercel

```bash
npm install -g vercel
cd GrandHubAi
vercel --prod
```

Деплой за 30 секунд, ваш домен `grandhubai.com` подключается через настройки Vercel.

### Бесплатно — GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/ваш_логин/grandhubai.git
git push -u origin main
```

Затем в настройках репозитория: Settings → Pages → Source: `main` / папка `/src`.

### Бесплатно — Cloudflare Pages

1. Войдите в [dash.cloudflare.com](https://dash.cloudflare.com)
2. Workers & Pages → Create → Pages → Connect to Git
3. Build directory: `src`
4. Готово.

### Свой VPS

```bash
scp -r GrandHubAi/* user@your-server.com:/var/www/grandhubai/
# на сервере настройте nginx с TLS (Let's Encrypt)
```

---

## 🛟 Решение проблем

### «Порт 8080 уже занят»
Запустите с другим портом:
```bash
python start.py 8000
```
Или закройте программу, занимающую 8080.

### «Python не найден» (Windows)
Откройте **«Параметры → Приложения → Установленные приложения»** → найдите Python → **Изменить → Modify → ✅ «Add Python to PATH»**.

Или установите свежую версию с [python.org](https://www.python.org/downloads/) **с галочкой PATH**.

### Браузер не открывается автоматически
Откройте вручную: [http://localhost:8080](http://localhost:8080)

### «start.bat не запускается»
Проверьте что Windows не блокирует:
1. ПКМ на `start.bat` → **Свойства**
2. Внизу — кнопка **«Разблокировать»**

### macOS блокирует start.sh
```bash
xattr -d com.apple.quarantine start.sh
chmod +x start.sh
```

### Хочу остановить сервер
В окне терминала: **Ctrl+C** (или просто закройте окно).

---

## 📞 Поддержка

- 📧 Email: aslankaa@yandex.ru
- 📱 +7 (969) 795-55-55
- 🌐 [www.aslankaa.com](https://www.aslankaa.com)

---

*© 2026 Кагиров Абдул-Хаким Ахмадович. GrandHubAi v1.0.0*
