# 🏗️ GrandHubAi — Архитектура

**Версия:** 1.0.0
**Автор:** Кагиров Абдул-Хаким Ахмадович
**Дата:** 29 апреля 2026

---

## 1. Высокоуровневая архитектура

```
┌──────────────────────────────────────────────────────────┐
│  ВАША СОБСТВЕННОСТЬ (100% IP Кагирова А-Х. А.)           │
├──────────────────────────────────────────────────────────┤
│  Frontend (Single-file PWA, Vanilla JS, no frameworks)    │
│  ├── UI Layer (HTML/CSS, темы dark/light, responsive)     │
│  ├── Tier/Billing Layer (TIERS, checkQuota, allowedAgentCount) │
│  ├── Concierge Аида (модератор первой линии — БЕЗ права   │
│  │   подключать агентов сама; см. TIERS.md)               │
│  ├── Orchestrator (Oracle: декомпозиция → распределение → │
│  │   агрегация; команда обрезается до tier.maxAgents)     │
│  ├── Prompt Registry (244 агента в 31 файле)              │
│  ├── Provider Abstraction (Groq/OR/Anthropic/Ollama)      │
│  ├── Storage (IndexedDB: сессии, ключ, settings, usage)   │
│  └── Security (escapeHtml, XSS-защита, AES-256-GCM)       │
└──────────────────┬───────────────────────────────────────┘
                   │ выбор провайдера + тариф
       ┌───────────┼───────────┬──────────────┐
       ▼           ▼           ▼              ▼
   ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────────┐
   │ Groq   │ │OpenRouter│ │Anthropic│ │  Ollama    │
   │ (free) │ │ (proxy)  │ │ (Claude)│ │  (local)   │
   └────────┘ └────────┘ └──────────┘ └────────────┘
   ⚠️ Не ваше IP — модели принадлежат провайдерам

┌──────────────────────────────────────────────────────────┐
│  Public-Facing                                            │
│  ├── src/index.html  — приложение                         │
│  └── src/pricing.html — публичная страница тарифов        │
│                        (grandhubai.com/pricing.html)      │
└──────────────────────────────────────────────────────────┘
```

### 1.1. Tier/Billing Layer (с v1.6.0)

Между UI и Orchestrator стоит обязательный слой проверок:

```
User input ──► Аида (модератор) ──► orchestration_brief
                                          │
                                          ▼
                            ┌────────────────────────┐
                            │ TIER GUARD             │
                            │ ├── checkQuota()       │
                            │ │   (соответствует     │
                            │ │   tier.monthlyTokens?)│
                            │ └── allowedAgentCount()│
                            │     (Math.min(N, max)) │
                            └──────────┬─────────────┘
                                       │ tier OK
                                       ▼
                                  orchestrate()
                                       │
                                       ▼
                                  callLLM() ──► chargeTokens()
                                                    │
                                                    ▼
                                            state.usage += tokens
```

**Правило:** Аида **не имеет** права обходить TIER GUARD. Полная спецификация — [TIERS.md](TIERS.md).

---

## 2. Стек технологий

| Слой | Технология | Версия | Зачем |
|---|---|---|---|
| Runtime | Browser (Chromium-based рекомендуется) | Chrome 90+ | Современные API |
| Frontend | Vanilla HTML + CSS + JS | ES2020+ | Без зависимостей, легко аудировать |
| Storage | IndexedDB | Native API | Хранение до 50 МБ vs 5 МБ у localStorage |
| PWA | Service Worker + Web Manifest | W3C | Установка как app, оффлайн UI |
| Speech | Web Speech API | W3C | Голосовой ввод |
| Печать | window.print() + `@media print` | Native | PDF без CDN-зависимостей |
| Шрифт | Системный (Segoe UI / Roboto / SF) | — | Без CDN-google fonts |

**Принцип:** zero внешних зависимостей в production. Никаких CDN, никаких npm-пакетов. Всё inline.

---

## 3. Поток обработки запроса (Orchestrator)

```
1. Пользователь вводит запрос: "Спроектируй 3D-модель насоса"
   │
   ▼
2. Oracle получает запрос + список доступных агентов
   │
   ▼
3. Oracle вызывает LLM с DECOMPOSE_PROMPT:
   {
     "analysis": "Задача комплексная: насос + 3D-модель + расчёт",
     "subtasks": [
       {"agent_id": "mech_pumps", "subtask": "Подбери параметры центробежного насоса для Q=50 м³/ч H=40 м"},
       {"agent_id": "cad_3d_modeling", "subtask": "Опиши пошаговое построение 3D-модели в SolidWorks"},
       {"agent_id": "cad_drafting", "subtask": "Расскажи как оформить чертёж по ЕСКД"}
     ]
   }
   │
   ▼
4. Параллельные вызовы (Promise.all):
   ├─ mech_pumps   → "Подбираю Grundfos NB 50-160..."
   ├─ cad_3d_modeling → "1. Создайте эскиз... 2. Extrude..."
   └─ cad_drafting → "Согласно ЕСКД ГОСТ 2.305..."
   │
   ▼
5. Oracle вызывает LLM с AGGREGATE_PROMPT + результаты
   │
   ▼
6. Стриминг финального ответа в чат (по словам)
   │
   ▼
7. Сохранение в IndexedDB (conversation, activityLogs)
```

---

## 4. Provider Abstraction Layer

Все провайдеры приводятся к единому интерфейсу:

```javascript
async function callLLM({ messages, model, temperature, signal, onToken })
```

Внутри — диспетчеризация по `state.settings.provider`:

| Провайдер | Стиль API | Endpoint | Аутентификация |
|---|---|---|---|
| Groq | OpenAI-compatible | `/openai/v1/chat/completions` | `Bearer gsk_...` |
| OpenRouter | OpenAI-compatible | `/api/v1/chat/completions` | `Bearer sk-or-...` |
| Anthropic | Anthropic Messages | `/v1/messages` | `x-api-key: sk-ant-...` |
| Ollama | OpenAI-compatible | `/v1/chat/completions` | (без ключа) |

OpenAI-compat path и Anthropic path реализованы отдельно из-за различий в формате запросов.

**Streaming:** Server-Sent Events (SSE) — `stream: true` в теле запроса. Парсинг чанков `data: {...}\n\n`, накопление дельт `delta.content` → callback `onToken(delta, accumulated)`.

---

## 5. Структура агента

Каждый из 201 агента — JavaScript-объект:

```javascript
{
  name: "Название агента (отображается в UI)",
  domain: "Домен (для группировки)",
  description: "Краткое описание (для поиска)",
  system_prompt: "Полный профессиональный системный промпт...",
  temperature: 0.3,            // 0.0 (строго) — 1.0 (креативно)
  model_preference: "",        // если "" — используется default
  examples: ["Пример 1", "Пример 2"]
}
```

**Загрузка:** при старте `<script src="prompts/*.js">` приcobeyaет к `window.AGENTS`. Это позволяет:
- Работать с `file://` (без сервера)
- Лениво расширять — добавил файл, появился агент
- Раздельно держать домены

---

## 6. Безопасность

### XSS-защита

Все пользовательские данные проходят через `escapeHtml()`:
```javascript
function escapeHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
```

`renderMd()` экранирует HTML, ПОТОМ применяет markdown — невозможно инжектировать через `**`/```` ``` ````.

### Хранение секретов

- API-ключи — в IndexedDB браузера (origin-isolated)
- Никаких куки, никаких серверных сессий
- При экспорте JSON ключ заменяется на `[REDACTED]`

### CSP / SRI

В версии 1.0 используются inline-скрипты и стили (single-file). Если разворачивается на сервере — рекомендуется добавить заголовок:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
```

В версии 2.0 — внешние скрипты будут с SRI-хэшами.

### Network

Service Worker **не кэширует** запросы к API провайдеров (`*.groq.com`, `*.anthropic.com`, etc.) — только статика приложения.

---

## 7. Хранение данных (IndexedDB)

База: `grandhubai`, объект-стор: `kv` (ключ-значение).

| Ключ | Значение | Когда обновляется |
|---|---|---|
| `settings` | объект (provider, apiKey, defaultModel, …) | при сохранении настроек |
| `conversation` | массив сообщений (последние 200) | каждое сообщение |
| `activityLogs` | массив логов оркестратора (последние 100) | каждый лог |

**Усечение:** при сохранении применяется `slice(-200)` / `slice(-100)` — защита от переполнения.

---

## 8. PWA-функциональность

### Manifest (`manifest.json`)

- `display: "standalone"` — без браузерной обвязки при установке
- `start_url: "./index.html"` — точка входа
- Иконки 192×192 и 512×512 (SVG inline через data URI — без отдельных файлов)

### Service Worker (`service-worker.js`)

- **Cache-first** для статики (HTML, JS промптов, manifest)
- **Network-only** для API провайдеров (никогда не кэшируется)
- Версионирование `CACHE_NAME = 'grandhubai-v1.0.0'` — при обновлении старый кэш чистится

### Offline-режим

UI и промпты доступны без сети. LLM-вызов требует интернет (если только не Ollama на localhost).

---

## 9. Расширяемость

### Добавление нового агента

1. Открыть `src/prompts/<domain>.js`
2. Добавить объект в `Object.assign(window.AGENTS, { ... })`
3. Перезагрузить страницу (или обновить SW)

### Добавление нового домена

1. Создать `src/prompts/<new_domain>.js`
2. Добавить `<script src="prompts/<new_domain>.js"></script>` в `index.html`
3. Добавить путь в `STATIC_ASSETS` массив `service-worker.js`

### Добавление нового провайдера

1. В `index.html` добавить запись в `PROVIDERS = { ... }`:
   ```javascript
   newprov: {
     name: "Имя",
     endpointDefault: "https://api.example.com/v1",
     keyFormat: "...",
     defaultModels: ["model-1", "model-2"],
     requestStyle: "openai",  // или "anthropic"
   }
   ```
2. Если `requestStyle: "openai"` — работает автоматически. Иначе добавить функцию `callXxx()`.

---

## 10. Производительность

| Метрика | Целевая | Достигаемая |
|---|---|---|
| Time to interactive | < 1 сек | ~ 400 мс (на быстром ПК) |
| Размер ассетов | < 500 КБ | ~ 250 КБ (с 201 промптом) |
| Параллельных агентов | до 10 | через Promise.all (limited by провайдером) |
| Streaming-латентность | < 100 мс/токен | ~50-80 мс на Groq |

**Оптимизация:** нет фреймворка, нет билд-шага, прямой DOM-манипуляции. Любой инженер с опытом 2 года может разобраться в коде за час.

---

## 11. Что вне scope v1.0

- Серверный backend (его нет — клиент идёт прямо к API)
- User accounts, auth, синхронизация между устройствами
- Real-time collaboration (multi-user)
- File uploads (PDF/DOCX как input)
- Vision API (image inputs)

Эти фичи планируются на v2.0+ через опциональный backend (Cloudflare Workers / Vercel Edge).

---

## 12. Принципы дизайна (architectural philosophy)

1. **Zero install.** Скачал HTML → открыл → работает.
2. **Zero dependencies.** Никаких npm, никаких CDN. Аудит — за 1 час.
3. **Zero servers.** Прямой клиент-провайдер. Нет нашего сервера = нет нашей утечки данных.
4. **Provider agnostic.** Любой провайдер за 2 строки кода.
5. **Explicit > magic.** Никаких автомагий — каждое действие видно в Activity Log.
6. **Owner > Code.** Этот проект — собственность Кагирова А-Х. А., и архитектура построена так, чтобы он сохранял контроль.

---

*Архитектурный документ обновляется при каждом minor релизе.*
