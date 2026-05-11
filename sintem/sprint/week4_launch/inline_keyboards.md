# SINTEM Bot. Inline-клавиатуры

JSON-структуры всех inline-клавиатур, используемых ботом. Формат — стандартный `InlineKeyboardMarkup` Telegram Bot API. Каждый `callback_data` строго ≤64 байт. Конвенция: `<scope>:<action>[:<arg>]`.

Ключи клавиатур упомянуты в `bot_spec.md` и `bot_dialogues.md` под именем вида `kb_*`.

---

## 1. `kb_main_menu` — главное меню

Показывается при `/start`, `/agents`, `/cancel`, после первого ответа агента (если включён режим возврата). 6 кнопок в 3 рядах по 2.

```json
{
  "inline_keyboard": [
    [
      {"text": "Карточка-доктор", "callback_data": "agent:card_doctor"},
      {"text": "Ответ на отзыв", "callback_data": "agent:review_reply"}
    ],
    [
      {"text": "Скаут конкурентов", "callback_data": "agent:competitor_scout"},
      {"text": "ABC/XYZ", "callback_data": "agent:abc_xyz"}
    ],
    [
      {"text": "Юнит-экономика", "callback_data": "agent:unit_econ"},
      {"text": "Aida (координатор)", "callback_data": "agent:aida"}
    ]
  ]
}
```

Комментарии callback_data:
- `agent:card_doctor` — переключить активного агента на «Карточка-доктор», прислать `agent_intro_card_doctor`.
- `agent:review_reply` — то же для «Ответ на отзыв».
- `agent:competitor_scout` — для «Скаут конкурентов».
- `agent:abc_xyz` — для «ABC/XYZ».
- `agent:unit_econ` — для «Юнит-экономика».
- `agent:aida` — для координатора Aida.

---

## 2. `kb_tariffs` — выбор тарифа

Показывается после `/pay`, `pay:start`, `pay:renew_other`. 3 тарифа плюс «Назад».

```json
{
  "inline_keyboard": [
    [
      {"text": "Старт — 1500 ₽", "callback_data": "pay:plan:start"}
    ],
    [
      {"text": "Рост — 3900 ₽", "callback_data": "pay:plan:growth"}
    ],
    [
      {"text": "Бизнес — 7900 ₽", "callback_data": "pay:plan:business"}
    ],
    [
      {"text": "Назад в меню", "callback_data": "nav:main_menu"}
    ]
  ]
}
```

Комментарии:
- `pay:plan:start` — выбрать тариф «Старт», следующий шаг — `kb_currency` с `plan=start`.
- `pay:plan:growth` — тариф «Рост».
- `pay:plan:business` — тариф «Бизнес».
- `nav:main_menu` — выйти из биллинга, показать `kb_main_menu`.

---

## 3. `kb_currency` — выбор криптовалюты

Показывается после выбора тарифа. Передаваемый план хранится в state, не в callback_data.

```json
{
  "inline_keyboard": [
    [
      {"text": "USDT (TRC20)", "callback_data": "pay:cur:usdt_trc20"},
      {"text": "USDT (TON)", "callback_data": "pay:cur:usdt_ton"}
    ],
    [
      {"text": "BTC", "callback_data": "pay:cur:btc"},
      {"text": "ETH", "callback_data": "pay:cur:eth"}
    ],
    [
      {"text": "Назад к тарифам", "callback_data": "pay:back_to_plans"}
    ]
  ]
}
```

Комментарии:
- `pay:cur:usdt_trc20` — создать инвойс NowPayments в USDT TRC20, низкая комиссия.
- `pay:cur:usdt_ton` — USDT в сети TON, минимальные комиссии.
- `pay:cur:btc` — BTC, для крупных сумм.
- `pay:cur:eth` — ETH.
- `pay:back_to_plans` — вернуться к `kb_tariffs`.

---

## 4. `kb_pay_invoice` — открыть инвойс

Прикрепляется к сообщению `pay_invoice`. Содержит URL-кнопку (а не callback) на NowPayments, плюс «Отмена».

```json
{
  "inline_keyboard": [
    [
      {"text": "Открыть оплату", "url": "{{invoice_url}}"}
    ],
    [
      {"text": "Отменить счёт", "callback_data": "pay:cancel:{{invoice_id}}"}
    ]
  ]
}
```

Комментарии:
- `url` — ссылка на платёжную страницу NowPayments, подставляется бекендом из ответа API.
- `pay:cancel:<invoice_id>` — пометить инвойс отменённым в KV, удалить кнопку.

---

## 5. `kb_continue_or_switch` — после ответа агента

Показывается после успешного ответа любого агента.

```json
{
  "inline_keyboard": [
    [
      {"text": "Продолжить с этим помощником", "callback_data": "flow:continue"}
    ],
    [
      {"text": "Сменить помощника", "callback_data": "flow:switch"}
    ],
    [
      {"text": "Главное меню", "callback_data": "nav:main_menu"}
    ]
  ]
}
```

Комментарии:
- `flow:continue` — оставить `active_agent` без изменений, прислать короткое «Жду следующий запрос».
- `flow:switch` — показать `kb_main_menu` для выбора другого агента.
- `nav:main_menu` — то же, что `flow:switch`, дублирующая формулировка для понятности.

---

## 6. `kb_rating` — выбор рейтинга отзыва

Показывается, если в сценарии «Ответ на отзыв» рейтинг не распознан в тексте.

```json
{
  "inline_keyboard": [
    [
      {"text": "1", "callback_data": "review:rating:1"},
      {"text": "2", "callback_data": "review:rating:2"},
      {"text": "3", "callback_data": "review:rating:3"},
      {"text": "4", "callback_data": "review:rating:4"},
      {"text": "5", "callback_data": "review:rating:5"}
    ],
    [
      {"text": "Отмена", "callback_data": "flow:cancel"}
    ]
  ]
}
```

Комментарии:
- `review:rating:N` — сохранить рейтинг в state и запустить генерацию ответов.
- `flow:cancel` — сбросить текущий диалог, эквивалент `/cancel`.

---

## 7. `kb_review_actions` — действия после ответа на отзыв

Показывается после того, как агент выдал три варианта ответа.

```json
{
  "inline_keyboard": [
    [
      {"text": "Пересоздать варианты", "callback_data": "review:regenerate"}
    ],
    [
      {"text": "Изменить тон", "callback_data": "review:change_tone"}
    ],
    [
      {"text": "Главное меню", "callback_data": "nav:main_menu"}
    ]
  ]
}
```

Комментарии:
- `review:regenerate` — запросить у агента новые три варианта на тех же входных данных.
- `review:change_tone` — перейти в подрежим уточнения тона: бот спрашивает «Что поменять? Сделать жёстче, мягче, короче?» текстом.
- `nav:main_menu` — выйти в главное меню.

---

## 8. `kb_upgrade_or_wait` — триал исчерпан

Показывается, когда у пользователя `trial_counters[<agent>] == 0` и нет активного тарифа.

```json
{
  "inline_keyboard": [
    [
      {"text": "Купить тариф", "callback_data": "pay:start"}
    ],
    [
      {"text": "Подождать до завтра", "callback_data": "flow:cancel"}
    ],
    [
      {"text": "Главное меню", "callback_data": "nav:main_menu"}
    ]
  ]
}
```

Комментарии:
- `pay:start` — точка входа в платёжный флоу, эквивалент `/pay`.
- `flow:cancel` — сбросить активного агента, выйти.

---

## 9. `kb_renew` — тариф закончился

Показывается, когда `subscription.expires_at < now()` и пользователь делает запрос.

```json
{
  "inline_keyboard": [
    [
      {"text": "Продлить тариф {{plan}}", "callback_data": "pay:renew:{{plan}}"}
    ],
    [
      {"text": "Сменить тариф", "callback_data": "pay:start"}
    ],
    [
      {"text": "Главное меню", "callback_data": "nav:main_menu"}
    ]
  ]
}
```

Комментарии:
- `pay:renew:<plan>` — создать инвойс на тот же план без перевыбора, минус один шаг.
- `pay:start` — обычный флоу выбора тарифа.

---

## 10. `kb_profile` — личный кабинет

Прикрепляется к сообщению `profile`.

```json
{
  "inline_keyboard": [
    [
      {"text": "Продлить тариф", "callback_data": "pay:renew:{{plan}}"}
    ],
    [
      {"text": "Сменить тариф", "callback_data": "pay:start"}
    ],
    [
      {"text": "Поддержка", "url": "https://t.me/sintem_support"}
    ]
  ]
}
```

Комментарии:
- Кнопка «Поддержка» — URL-кнопка прямо в чат поддержки.
- Если у юзера `plan == "trial"` — кнопка «Продлить тариф» скрывается, остаются «Сменить тариф» и «Поддержка».

---

## 11. `kb_about` — о сервисе

Прикрепляется к сообщению `about`.

```json
{
  "inline_keyboard": [
    [
      {"text": "Оферта", "url": "https://sintem.ru/offer"}
    ],
    [
      {"text": "Политика данных", "url": "https://sintem.ru/privacy"}
    ],
    [
      {"text": "Поддержка", "url": "https://t.me/sintem_support"}
    ]
  ]
}
```

Комментарии: все три — URL-кнопки. Домены подставляются из конфига при сборке клавиатуры.

---

## 12. `kb_confirm` — универсальное «Да / Нет / Отмена»

Используется для подтверждений: отмена счёта, сброс настроек, повторная отправка.

```json
{
  "inline_keyboard": [
    [
      {"text": "Да", "callback_data": "confirm:yes:{{action_id}}"},
      {"text": "Нет", "callback_data": "confirm:no:{{action_id}}"}
    ],
    [
      {"text": "Отмена", "callback_data": "confirm:cancel:{{action_id}}"}
    ]
  ]
}
```

Комментарии:
- `action_id` — идентификатор подтверждаемого действия, бекенд хранит в KV соответствие `action_id → действие` со сроком жизни 5 минут.
- `confirm:yes` — выполнить действие.
- `confirm:no` — отказаться, продолжить флоу без выполнения.
- `confirm:cancel` — то же, что `no`, но дополнительно сбрасывает текущий диалог.

---

## 13. `kb_retry` — повтор после ошибки

Показывается после `err_timeout`, `err_bad_output`, `err_generic`.

```json
{
  "inline_keyboard": [
    [
      {"text": "Повторить", "callback_data": "retry:{{request_id}}"}
    ],
    [
      {"text": "Главное меню", "callback_data": "nav:main_menu"}
    ]
  ]
}
```

Комментарии:
- `retry:<request_id>` — бекенд подтягивает сохранённый prompt по `request_id` (ttl 10 минут) и повторяет вызов агента. Триальный счётчик не списывается.

---

## 14. `kb_support` — кнопка в поддержку

Показывается после `err_quota` и других системных ошибок.

```json
{
  "inline_keyboard": [
    [
      {"text": "Написать в поддержку", "url": "https://t.me/sintem_support"}
    ],
    [
      {"text": "Главное меню", "callback_data": "nav:main_menu"}
    ]
  ]
}
```

Комментарии: URL ведёт в личку оператору поддержки. В будущей версии заменится на чат с Aida в режиме «эскалация».

---

## Сводная таблица callback_data namespaces

| Namespace | Назначение | Примеры |
|---|---|---|
| `agent:` | Переключение активного агента | `agent:card_doctor`, `agent:aida` |
| `pay:` | Биллинг и платежи | `pay:start`, `pay:plan:growth`, `pay:cur:btc`, `pay:cancel:<id>`, `pay:renew:<plan>` |
| `flow:` | Управление текущим диалогом | `flow:continue`, `flow:switch`, `flow:cancel` |
| `nav:` | Навигация по меню | `nav:main_menu` |
| `review:` | Сценарий «Ответ на отзыв» | `review:rating:N`, `review:regenerate`, `review:change_tone` |
| `confirm:` | Подтверждения | `confirm:yes:<id>`, `confirm:no:<id>`, `confirm:cancel:<id>` |
| `retry:` | Повтор после ошибки | `retry:<request_id>` |

Все callback_data укладываются в 64 байта Telegram-лимита: самый длинный — `confirm:cancel:<uuid>` около 50 байт.
