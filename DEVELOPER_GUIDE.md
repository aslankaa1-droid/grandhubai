# 🛠️ GrandHubAi — Руководство разработчика

**Для тех, кто хочет расширить, развить или адаптировать проект.**
**Версия:** 1.0.0

---

## 1. Стек

- **Язык:** Vanilla JavaScript ES2020+
- **Зависимости:** **никаких** (намеренно)
- **Build-шаг:** **отсутствует**
- **Тестирование:** ручное в браузере; unit-тесты — через `node --test` (опционально)
- **Стиль кода:** Stroustrup, 2 пробела, ES module syntax не используется (single-file)

---

## 2. Структура исходников

```
src/
├── index.html              ~50 КБ — UI + main app logic
├── manifest.json           PWA-манифест
├── service-worker.js       Cache-first для статики
└── prompts/                27 файлов с 201 агентом
    ├── coordination.js     window.AGENTS["oracle"], ["qa_critic"]
    ├── engineering.js
    ├── ...
    └── special.js
```

Все скрипты подключаются через `<script src="...">` в `index.html`. Нет module bundler'а — браузер сам обрабатывает.

---

## 3. Добавление нового агента

### Шаг 1. Выбрать домен

Откройте подходящий файл в `src/prompts/`. Если ни один не подходит — создайте новый (см. шаг 5).

### Шаг 2. Добавить агента

```javascript
window.AGENTS = window.AGENTS || {};
Object.assign(window.AGENTS, {
  "your_unique_id": {
    name: "Имя агента (отображается в UI)",
    domain: "Название домена",          // должно совпадать с доменом других агентов файла
    description: "Краткое описание для поиска",
    system_prompt: `Полный системный промпт.

Структура промпта:
1. Кто ты (роль, опыт, уровень)
2. Специализация
3. Стандарты, методы, инструменты
4. Формат ответа
5. Что делать при недостатке данных`,
    temperature: 0.3,                    // 0.0 строго / 1.0 креативно
    model_preference: "",                // "" = default, или e.g. "llama-3.3-70b-versatile"
    examples: [
      "Пример запроса 1",
      "Пример запроса 2"
    ]
  }
});
```

### Шаг 3. Перезагрузить

В браузере: F5 (или Ctrl+Shift+R для жёсткой перезагрузки PWA).

---

## 4. Качество промптов — чек-лист

Перед коммитом нового агента проверьте:

- [ ] **Уникальность ID** — не дублирует существующего
- [ ] **Уровень специалиста** — указан профессиональный опыт (не «эксперт», а «25 лет опыта в Сатурн / РКБМ Лыткарино»)
- [ ] **Стандарты** — упомянуты конкретные ГОСТ/ISO/ASME/IEEE — не «по нормам»
- [ ] **Конкретные инструменты** — название ПО, оборудования, моделей
- [ ] **Формат ответа** — что должно быть в выводе (расчёт + ссылки + рекомендации)
- [ ] **Дисклеймер** — для медицины/права/финансов: «образовательная информация, не заменяет специалиста»
- [ ] **Длина** — 200-500 слов (короче = поверхностно; длиннее = модель теряет фокус)
- [ ] **Температура** — 0.2-0.4 для технических, 0.5-0.7 для креативных, 0.8+ для художественных

---

## 5. Создание нового домена

```bash
# 1. Создать файл
touch src/prompts/my_new_domain.js
```

```javascript
// 2. Заполнить агентами (минимум 3-5 для домена)
window.AGENTS = window.AGENTS || {};
Object.assign(window.AGENTS, {
  "myd_agent1": { name: "...", domain: "Мой новый домен", ... },
  "myd_agent2": { name: "...", domain: "Мой новый домен", ... },
});
```

```html
<!-- 3. В index.html добавить script -->
<script src="prompts/my_new_domain.js"></script>
```

```javascript
// 4. В service-worker.js добавить в STATIC_ASSETS
'./prompts/my_new_domain.js',
```

```javascript
// 5. Поднять CACHE_NAME в service-worker.js (для инвалидации старого кэша)
const CACHE_NAME = 'grandhubai-v1.0.1';
```

---

## 6. Добавление нового LLM-провайдера

### Если провайдер OpenAI-совместим

В `index.html`:
```javascript
const PROVIDERS = {
  // ...existing...
  myprovider: {
    name: "My Provider",
    endpointDefault: "https://api.myprovider.com/v1",
    keyFormat: "mp_...",
    keyPrefix: "mp_",
    keyHelp: "Регистрация на myprovider.com",
    defaultModels: ["myprovider/best-model", "myprovider/fast-model"],
    requestStyle: "openai",
  },
};
```

В select'е провайдеров (HTML):
```html
<option value="myprovider">My Provider</option>
```

Готово. Никаких других изменений не нужно — `callOpenAICompat()` сделает работу.

### Если провайдер не OpenAI-совместим

1. Добавьте в `PROVIDERS` с `requestStyle: "myproviderstyle"`
2. Создайте функцию `callMyProvider(...)` по образцу `callAnthropic(...)`
3. В `callLLM()` диспетчеризации добавьте ветку:
   ```javascript
   if (prov.requestStyle === 'myproviderstyle') {
     return callMyProvider({ ... });
   }
   ```

---

## 7. Изменение оркестратора

Логика декомпозиции и агрегации — в функциях `orchestrate()`, `directOracle()`, константах `ORACLE_DECOMPOSE_PROMPT` и `ORACLE_AGGREGATE_PROMPT`.

**Идеи для улучшений:**
- **Двух-фазная агрегация:** сначала каждый специалист критикует ответ другого, потом Oracle собирает
- **QA-Critic в pipeline:** после агрегации `qa_critic` агент перепроверяет ответ
- **Дерево решений:** Oracle создаёт DAG задач, не плоский список
- **Saga-шаблон:** при ошибке одного специалиста — fallback на ближайшего по домену

---

## 8. Локальная разработка

### Простейший workflow

```bash
# Вариант 1: Python
cd src && python -m http.server 8080

# Вариант 2: Node
cd src && npx http-server -p 8080 -c-1   # -c-1 disables caching

# Вариант 3: Bun
cd src && bunx serve . -p 8080
```

Откройте `http://localhost:8080`.

### При разработке: отключение Service Worker

В DevTools → Application → Service Workers → **Bypass for network** ✅
Иначе SW будет отдавать кэшированные старые версии при каждом сохранении.

### При финальной проверке

Снимите Bypass, обновите CACHE_NAME, перезагрузите. Проверьте установку как PWA.

---

## 9. Деплой

### GitHub Pages (бесплатно)

```bash
# 1. Создайте репозиторий на GitHub: grandhubai
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<youruser>/grandhubai.git
git push -u origin main

# 2. На GitHub: Settings → Pages → Source: main / docs (или /src)
# Доступен будет по https://<youruser>.github.io/grandhubai/
```

### Vercel (бесплатно, свой домен)

```bash
npm i -g vercel
cd src
vercel --prod
# Подключите домен grandhubai.com в Vercel dashboard
```

### Netlify

```bash
npm i -g netlify-cli
netlify deploy --dir=src --prod
```

### Свой VPS / хостинг

Просто загрузите содержимое `src/` на любой статический хостинг. Должно поддерживать HTTPS (для PWA SW).

---

## 10. Тестирование

### Ручное

Чек-лист перед релизом:
- [ ] Каждый провайдер: введение API-ключа, отправка запроса, получение ответа
- [ ] Streaming работает (текст печатается по словам)
- [ ] Stop-кнопка прерывает запрос
- [ ] IndexedDB сохраняет диалог между сессиями
- [ ] Тёмная/светлая темы переключаются и сохраняются
- [ ] Голосовой ввод (Chrome/Edge)
- [ ] Экспорт JSON/MD/PDF
- [ ] Оркестратор: 1 / 3 / 7 / 10 агентов
- [ ] Прямой вызов агента
- [ ] Поиск по агентам
- [ ] Адаптив на смартфоне (Chrome DevTools Device Toolbar)
- [ ] PWA устанавливается (через локальный HTTPS или ngrok)

### Автотесты (опционально)

Можно добавить unit-тесты на чистые функции:
- `escapeHtml()` — корректность экранирования
- `renderMd()` — простые case markdown
- `listAgentsForOracle()` — фильтрация по домену

```bash
node --test tests/*.test.mjs
```

---

## 11. Версионирование

**SemVer 2.0:** `MAJOR.MINOR.PATCH`

- **MAJOR** — breaking changes (например, изменение формата Agent-объекта)
- **MINOR** — новые фичи без поломок (новый провайдер, новый домен агентов)
- **PATCH** — баги, мелкие улучшения

Обновление версии:
1. `index.html` → `APP.version = '1.x.y'`
2. `service-worker.js` → `CACHE_NAME = 'grandhubai-vX.Y.Z'`
3. `CHANGELOG.md` → новая секция
4. Git tag: `git tag v1.x.y && git push --tags`

---

## 12. Стиль кода

- **Глобальный namespace:** только `window.AGENTS`, `window.AGENTS_BY_DOMAIN`, и приватные `state` / `APP`. Не загрязнять `window`.
- **Имена функций:** глагольные (`callLLM`, `renderAgentsTree`)
- **Имена переменных:** существительные (`message`, `agentList`)
- **`const` по умолчанию,** `let` если переприсваивается, `var` — никогда
- **Async/await,** не `.then()`
- **Без `eval`, без `new Function`, без inline-handlers** в HTML

---

## 13. Roadmap

- **v1.1:** export/import всей сессии в одном JSON, импорт промптов из файла
- **v1.2:** мульти-чат (несколько одновременных диалогов в табах)
- **v2.0:** опциональный backend-прокси (Cloudflare Workers) — пользователю не нужно вводить ключ
- **v2.1:** RAG: загрузка PDF/DOCX как контекста в диалог
- **v2.2:** Vision API: загрузка изображений в Claude/GPT-4o
- **v3.0:** мульти-агент graph (DAG-задачи вместо плоского списка)

---

*Если у вас вопросы или PR — пишите на aslankaa@yandex.ru*
