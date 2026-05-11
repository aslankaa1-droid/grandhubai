# 💳 GrandHubAi — Настройка приёма платежей

**Версия:** 1.0 (для v1.6.1)
**Дата:** 2026-05-04
**Связано:** [BILLING.md](BILLING.md), [PRICING.md](PRICING.md), `src/pricing.html`

---

## Что подключаем

**Две платёжные системы — мульти-валюта на входе, USDT на выходе:**

| # | Сервис | Для кого | Что принимает | Куда зачисляет |
|---|---|---|---|---|
| 1 | **NowPayments** | Международные клиенты | 300+ криптовалют + карты USD/EUR (через Mercuryo/Simplex) | USDT TRC-20 / TON / ERC-20 на ваш кошелёк |
| 2 | **CryptoCloud** | Российские клиенты | МИР · Visa · MasterCard · СБП · крипто | USDT TRC-20 на ваш кошелёк |

Обе работают БЕЗ юр.лица. Подключение — 30–60 минут на каждую.

---

## Шаг 0. Подготовьте USDT-кошелёк

Если ещё нет — заведите. Рекомендую **TRC-20 (Tron)** — низкая комиссия и принимают все:

| Кошелёк | Платформа | Где взять |
|---|---|---|
| **Trust Wallet** | iOS / Android | trustwallet.com |
| **Tonkeeper** | iOS / Android (для TON) | tonkeeper.com |
| **MetaMask** | Браузер / mobile (для ERC-20) | metamask.io |
| **Bybit / OKX** | Биржа — встроенный кошелёк | bybit.com / okx.com |

**Запишите свой USDT-адрес TRC-20** — он понадобится при настройке обеих платёжек.

---

## Шаг 1. Регистрация в NowPayments

### 1.1. Создать аккаунт
1. Откройте [nowpayments.io](https://nowpayments.io) → **Sign Up**
2. Email + пароль (можно через Google)
3. Подтвердите почту
4. KYC на старте **не требуется** — лимит до ~$20K/мес

### 1.2. Указать USDT-кошелёк для выплат
1. **Dashboard → Settings → Payment Settings**
2. **Outcome wallet:** выберите `USDTTRC20` → вставьте свой адрес TRC-20
3. **Auto Conversion:** включите (всё что приходит — конвертируется в USDT)
4. Сохранить

### 1.3. Получить API-ключ
1. **Dashboard → Settings → API Keys → Create new key**
2. Скопируйте ключ (понадобится только если будете делать бэкенд; для статических инвойсов не нужен)

### 1.4. Создать статические инвойсы для тарифов

Нам нужны 2 инвойса — один для Платины ($49), один для Бриллианта ($199).

1. **Dashboard → Invoices → Create Invoice**
2. Заполните:
   - **Amount:** `49`
   - **Currency:** `USD`
   - **Pay currency:** оставьте пустым (клиент выберет сам)
   - **Order ID:** `GRANDHUBAI-PLATINUM-MONTHLY`
   - **Description:** `GrandHubAi Платиновый тариф (1 месяц)`
   - **Success URL:** `https://grandhubai.com/index.html?paid=platinum`
   - **Cancel URL:** `https://grandhubai.com/pricing.html?cancelled=1`
3. **Create** → скопируйте URL вида `https://nowpayments.io/payment/?iid=XXXXXXX`
4. Повторите для Бриллианта (`amount: 199`, `Order ID: GRANDHUBAI-DIAMOND-MONTHLY`)

### 1.5. Вставить ссылки в код
Откройте `src/pricing.html`, найдите блок `const PAY_LINKS = {...}` (примерно строка 380) и замените пустые `intl: ''` на ваши URL:

```js
const PAY_LINKS = {
  platinum: {
    intl: 'https://nowpayments.io/payment/?iid=ВАШ_ID_ПЛАТИНЫ',
    ru:   '', // заполним на шаге 2
    label: 'Платиновый — $49 / €46 / 49 ₮ в месяц',
  },
  diamond: {
    intl: 'https://nowpayments.io/payment/?iid=ВАШ_ID_БРИЛЛИАНТА',
    ru:   '',
    label: 'Бриллиантовый — $199 / €185 / 199 ₮ в месяц',
  },
};
```

Сохраните файл, задеплойте на сайт. Готово — международные клиенты могут платить.

---

## Шаг 2. Регистрация в CryptoCloud

### 2.1. Создать аккаунт
1. Откройте [cryptocloud.plus](https://cryptocloud.plus) → **Регистрация**
2. Email + пароль (Telegram-привязка по желанию)
3. Подтвердите почту
4. KYC при стандартных оборотах не нужен

### 2.2. Создать «магазин» (project)
1. **Кабинет → Магазины → Создать магазин**
2. Название: `GrandHubAi`
3. Сайт: `https://grandhubai.com`
4. Валюта расчёта (то, в чём вы видите оборот): `USD` или `RUB` — на ваш выбор
5. **Получать в:** `USDT TRC-20`
6. **Адрес USDT TRC-20:** ваш адрес из Шага 0
7. Сохранить → получите Shop ID + Secret Key

### 2.3. Создать ссылки на оплату

CryptoCloud даёт два варианта: **статические ссылки** (проще) или **API-инвойсы** (для бэкенда).

#### Вариант A — Статические ссылки (рекомендую сейчас)
1. **Магазин → Создать ссылку оплаты**
2. Сумма: `49 USD`, описание: `GrandHubAi Платиновый`
3. Получите URL вида `https://pay.cryptocloud.plus/XXXXXXXX`
4. Повторите для `199 USD` (Бриллиант)

#### Вариант B — Через API (для будущего бэкенда)
- Документация: docs.cryptocloud.plus
- POST `/api/v1/invoice/create` с Shop ID + Secret Key
- Возвращает invoice URL динамически

### 2.4. Вставить ссылки в код
В том же `PAY_LINKS` (см. шаг 1.5) заполните `ru:`:

```js
const PAY_LINKS = {
  platinum: {
    intl: 'https://nowpayments.io/payment/?iid=...',
    ru:   'https://pay.cryptocloud.plus/ВАШ_ID_ПЛАТИНЫ',
    label: 'Платиновый — $49 / €46 / 49 ₮ в месяц',
  },
  diamond: {
    intl: 'https://nowpayments.io/payment/?iid=...',
    ru:   'https://pay.cryptocloud.plus/ВАШ_ID_БРИЛЛИАНТА',
    label: 'Бриллиантовый — $199 / €185 / 199 ₮ в месяц',
  },
};
```

---

## Шаг 3. Тестовая оплата

### 3.1. NowPayments
- В **Dashboard → Sandbox** включите тестовый режим
- Откройте свой инвойс → выберите `Test BTC` → оплатите тестовыми монетами
- Проверьте: пришло ли уведомление в **Dashboard → Payments**

### 3.2. CryptoCloud
- В тестовом режиме доступна оплата через **TestNet USDT**
- Пройдите по ссылке оплаты → выберите тестовую сеть → оплатите
- Проверьте: появился ли платёж в **Кабинет → Платежи**

### 3.3. Реальная проверка (после теста)
- Сделайте оплату сами на минимальную сумму ($5–10)
- Убедитесь, что USDT пришли на ваш TRC-20 кошелёк
- После успеха — отключите тестовый режим, активируйте production

---

## Шаг 4. Что происходит сейчас (без бэкенда)

В версии 1.6.1 (frontend-only) после успешной оплаты клиента:
1. Платёжная система отправляет уведомление **на ваш email**.
2. Вы вручную проверяете оплату в Dashboard NowPayments / CryptoCloud.
3. Связываетесь с клиентом и активируете тариф (вручную).

**Это нормально для первых 10–50 клиентов.** Когда поток вырастет — подключаем серверный webhook (см. шаг 5).

---

## Шаг 5. Roadmap: автоматическая активация тарифа (v2.0)

После первых платных клиентов запускаем серверный слой:

```
Клиент оплатил
   │
   ▼
NowPayments / CryptoCloud
   │ webhook на /api/payment-webhook
   ▼
Backend (Cloudflare Workers / Vercel Functions)
   │ проверяет подпись
   │ обновляет user.tier в БД
   ▼
Клиент перезагружает страницу
   │ /api/me возвращает новый тариф
   ▼
В UI автоматически: 💎 Платиновый · 4 агента
```

**Стек для бэкенда (рекомендую):**
- **Cloudflare Workers** — бесплатно до 100К запросов/день, latency <50ms
- **Cloudflare D1** (SQLite) — бесплатная БД до 5 ГБ
- **Webhook secret verification** — оба провайдера подписывают payload HMAC

Время реализации: 4–8 часов разработки. Делаем после первых 3–5 платящих.

---

## Шаг 6. Что делать дальше

**Сегодня:**
1. ☐ Завести USDT TRC-20 кошелёк (Trust Wallet / Bybit)
2. ☐ Зарегистрироваться в NowPayments → создать 2 инвойса → вставить URL в `pricing.html`
3. ☐ Зарегистрироваться в CryptoCloud → создать магазин + 2 ссылки → вставить URL в `pricing.html`
4. ☐ Сделать тестовый платёж через каждую систему
5. ☐ Залить обновлённый `pricing.html` на сайт (`git push` → GitHub Pages)

**В первую неделю после запуска:**
- Следить за Dashboard обеих платёжек ежедневно
- Активировать тариф клиента в течение 1 часа после оплаты (важно для NPS)
- Собирать обратную связь о процессе оплаты (что работает, что нет)

**Когда станет 5+ платящих клиентов:**
- Подключить серверный webhook (см. шаг 5)
- Автоматизировать активацию тарифа

---

## Полезные ссылки

- **NowPayments docs:** https://documenter.getpostman.com/view/7907941/S1a32n38
- **CryptoCloud docs:** https://docs.cryptocloud.plus
- **TRC-20 explorer:** https://tronscan.org (проверка прихода USDT)
- **Калькулятор комиссий:** https://nowpayments.io/calculator

## Контакты поддержки

- NowPayments: support@nowpayments.io · Telegram @nowpayments_support
- CryptoCloud: support@cryptocloud.plus · Telegram @CryptoCloud_Support
