# 🧠 GrandHubAi

**Multi-Agent AI Platform на 244 профессиональном промпте.**
**Provider-agnostic. Single-file PWA. Работает на любом устройстве.**

---

## ⚖️ Правовая информация

**Copyright © 2026 Кагиров Абдул-Хаким Ахмадович. Все права защищены.**

- **Бренд:** GrandHubAi™
- **Домен:** [grandhubai.com](https://grandhubai.com)
- **Контакт автора:** aslankaa@yandex.ru · [aslankaa.com](https://www.aslankaa.com)
- **Телефон:** +7 (969) 795-55-55, +7 (925) 203-77-77

**Лицензия:**
- 🆓 **Community (AGPL-3.0)** — бесплатно для физлиц и не-коммерческого использования. См. [`LICENSE_COMMUNITY.md`](LICENSE_COMMUNITY.md)
- 💼 **Commercial** — для бизнеса (закрытые продукты, OEM, SaaS). См. [`LICENSE_COMMERCIAL.md`](LICENSE_COMMERCIAL.md)

---

## 🎯 Что это

GrandHubAi — это **тонкая клиентская оболочка** над любыми LLM-провайдерами (Groq, OpenRouter, Anthropic, Ollama), реализующая **multi-agent оркестрацию** через библиотеку из 244 специализированного профессионального системного промпта.

В отличие от обычного чат-бота, GrandHubAi:
1. **Понимает задачу** через главного координатора (Oracle)
2. **Декомпозирует** её на подзадачи
3. **Выбирает 3-7 узких специалистов** из 244-агентной библиотеки
4. **Запускает их параллельно** на ваш выбранный LLM
5. **Синтезирует результаты** в единый связный ответ

При этом весь интеллектуальный вклад — ваша **собственная промпт-библиотека**, которая защищена авторским правом и зарегистрирована.

---

## ⚡ Быстрый старт

### 🚀 Самый простой способ — двойной клик

| ОС | Файл |
|---|---|
| Windows | Двойной клик по `start.bat` |
| macOS | `chmod +x start.sh && ./start.sh` |
| Linux | `./start.sh` |
| Универсально | `python start.py` |

Скрипт сам запустит локальный сервер и откроет браузер. Полные инструкции — в [`INSTALL.md`](INSTALL.md).

### Альтернатива — открыть напрямую (без сервера)

1. Откройте `src/index.html` в браузере (Chrome / Edge / Firefox / Safari)
2. Появится баннер «⚠️ Вы открыли через file://» с инструкцией. **Нажмите 📖 Как запустить** — там пошаговый гид.
3. Нажмите ⚙️ → выберите провайдера (рекомендуется **Groq** — бесплатный) → впишите API-ключ
4. Готово. Опишите задачу в чате.

> ⚠️ В режиме `file://` отключены PWA-функции (Service Worker, установка как app). Базовый чат с ИИ работает.

### Хостинг на бесплатном CDN

Проект разворачивается как статический сайт. Бесплатно. Инструкции в [`INSTALL.md`](INSTALL.md) и [`DEVELOPER_GUIDE.md`](DEVELOPER_GUIDE.md).

---

## 🤖 Поддерживаемые LLM-провайдеры

| Провайдер | Цена | Модели | Где взять ключ |
|---|---|---|---|
| **Groq** ⭐ | 🆓 Бесплатно | Llama-3.3-70B, DeepSeek-R1-distill-70B | [console.groq.com](https://console.groq.com) |
| **OpenRouter** | 💰 От ~$0.10/1M токенов | Claude, GPT, Llama, Gemini, DeepSeek | [openrouter.ai](https://openrouter.ai) |
| **Anthropic** | 💰💰 $3/1M токенов (Sonnet) | Claude Sonnet 4.6, Opus 4.7, Haiku 4.5 | [console.anthropic.com](https://console.anthropic.com) |
| **Ollama** | 🆓 Бесплатно (локально) | Llama, Qwen, DeepSeek, Phi, Gemma | [ollama.com](https://ollama.com) — установка |

**Полная независимость:** если хочется, можно использовать **только Ollama** — без интернета, без API-ключей, на собственном железе.

---

## 📁 Структура проекта

```
GrandHubAi/
├── README.md                       — этот файл
├── ARCHITECTURE.md                 — техническая архитектура
├── USER_GUIDE.md                   — руководство пользователя
├── DEVELOPER_GUIDE.md              — для разработчиков
├── PROMPT_LIBRARY.md               — каталог 244 агента
├── LEGAL_BRIEF.md                  — юридический бриф владельца
├── INVESTOR_DECK.md                — pitch для инвесторов
├── CHANGELOG.md                    — история версий
├── LICENSE_COMMUNITY.md            — AGPL-3.0
├── LICENSE_COMMERCIAL.md           — коммерческая лицензия
│
├── src/                            — исходники приложения
│   ├── index.html                  — основное приложение (single-file PWA)
│   ├── manifest.json               — PWA-манифест
│   ├── service-worker.js           — оффлайн-кэш
│   └── prompts/                    — 31 файл с 244 агентами
│       ├── coordination.js         — Oracle, QA-Critic
│       ├── engineering.js          — Машиностроение (12)
│       ├── transport.js            — Транспортное (10)
│       ├── aerospace.js            — Аэрокосмос (6)
│       ├── marine.js               — Морское (5)
│       ├── energy.js               — Энергетика (10)
│       ├── oil_gas_chem.js         — Нефтегаз и химия (8)
│       ├── geology.js              — Геология (8)
│       ├── electronics.js          — Электроника (10)
│       ├── design_cad.js           — CAD/3D (10)
│       ├── medicine.js             — Медицина (15)
│       ├── biology.js              — Биология (8)
│       ├── nutrition.js            — Питание (4)
│       ├── culinary.js             — Кулинария (5)
│       ├── literature.js           — Литература (12)
│       ├── music.js                — Музыка (5)
│       ├── arts.js                 — Искусство (5)
│       ├── business_finance.js     — Бизнес (10)
│       ├── legal.js                — Право (6)
│       ├── linguistics.js          — Лингвистика (6)
│       ├── sciences.js             — Науки (10)
│       ├── education.js            — Образование (4)
│       ├── sports.js               — Спорт (3)
│       ├── agriculture.js          — Сельхоз (4)
│       ├── geo_climate.js          — География (4)
│       ├── history_culture.js      — История (4)
│       ├── construction.js         — Строительство (4)
│       ├── investments.js          — Инвестиции (3)
│       ├── it.js                   — ИТ (5)
│       └── special.js              — Спец. знания (3)
│
└── legal/                          — юридические шаблоны
    ├── rospatent_program_application.md
    ├── rospatent_trademark_application.md
    ├── rights_assignment_template.md
    └── investor_term_sheet_template.md
```

---

## 🌟 Особенности

- **244 профессиональный агент** в 31 домене — каждый со своим системным промптом 200-500 слов
- **4 LLM-провайдера** через единый интерфейс
- **Streaming-режим** — ответ печатается по словам в реальном времени
- **Memory** — бот помнит последние 6 сообщений диалога
- **PWA** — устанавливается как приложение на любое устройство
- **IndexedDB** — диалог сохраняется локально, до 200 сообщений
- **8 цветовых тем** — Auto (по системе), Dark, Light, Sepia, High Contrast (AAA), Solarized, Nord, Dracula
- **4 размера шрифта** — S/M/L/XL для удобства зрения
- **Reduced motion** — для эпилепсии и слабых ПК
- **Голосовой ввод** — Web Speech API (Chrome/Edge)
- **Экспорт** — JSON, Markdown, PDF (через нативную печать)
- **Безопасность уровня банка** — CSP, AES-256 шифрование ключа, frame-busting (см. SECURITY.md)
- **Адаптивный UI** — работает на смартфонах, планшетах, ПК
- **Поддержка ЕСКД, ГОСТ, ISO** в технических промптах

---

## 🛡️ Безопасность

- **CSP (Content Security Policy)** строгая — блокирует внешние скрипты, eval, формы на чужие домены
- **API-ключ хранится только в IndexedDB** вашего браузера и никуда не отправляется кроме самого провайдера
- **AES-256-GCM шифрование** API-ключа master-паролем (опционально, в Settings → Безопасность)
- **Frame-busting** — защита от clickjacking-атак
- Прямые запросы к LLM-провайдеру — **никаких посредников**
- Защита от XSS через `escapeHtml()` и safe markdown rendering
- Service Worker не кэширует API-запросы (network-only)
- Validation всего пользовательского ввода (темы, размеры, endpoint)

Подробная политика безопасности — в [`SECURITY.md`](SECURITY.md).

---

## 📊 Что отличает от конкурентов

| Фича | ChatGPT | Poe | GrandHubAi |
|---|---|---|---|
| Multi-provider | ❌ | ✅ | ✅ |
| Self-hosted/Open Source | ❌ | ❌ | ✅ |
| Профессиональные инженерные промпты | ❌ | ⚠️ | ✅ (244) |
| Полностью локальный режим | ❌ | ❌ | ✅ (Ollama) |
| Single-file (zero install) | ❌ | ❌ | ✅ |
| PWA на любое устройство | ⚠️ | ⚠️ | ✅ |
| Право собственности у пользователя | ❌ | ❌ | ✅ |

---

## 🤝 Контрибуция

Проект open-source (AGPL-3.0). Расширения и исправления приветствуются:
- Новые агенты — в `src/prompts/<domain>.js`
- Баги — issue tracker
- Фичи — обсудить через email/PR

---

## 📞 Контакты

**Владелец проекта:**
Кагиров Абдул-Хаким Ахмадович
- 📧 aslankaa@yandex.ru
- 🌐 [www.aslankaa.com](https://www.aslankaa.com)
- 📱 +7 (969) 795-55-55
- 📱 +7 (925) 203-77-77
- 🌐 Проект: [grandhubai.com](https://grandhubai.com)

---

*GrandHubAi v1.0.0 · 2026-04-29 · Made with ❤️ in Russia*
