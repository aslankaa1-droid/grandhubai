// Telegram update dispatcher: messages and callback queries.

import { log } from '../lib/log';
import { sendMessage, sendChatAction, answerCallback, escapeHtml } from '../lib/tg';
import { callGroq, groqCostUsdE4, type GroqMessage } from '../lib/groq';
import { createInvoice } from './payments';
import { handleAdmin } from './admin';
import { enqueueRetry } from './retry';
import {
  type Env,
  type Plan,
  type PaidPlan,
  type TgMessage,
  type TgCallbackQuery,
  type TgUpdate,
  type TgUser,
  PLAN_CONFIG,
  WEDGE_AGENTS,
  AGENT_LABELS,
} from '../types';

interface QuotaResult {
  allowed: boolean;
  remaining: number;
  reason?: 'no_active_plan' | 'daily_quota' | 'flood';
}

export async function handleTelegramUpdate(env: Env, ctx: ExecutionContext, update: TgUpdate): Promise<void> {
  if (update.message?.text) return handleMessage(env, ctx, update.message);
  if (update.callback_query) return handleCallback(env, ctx, update.callback_query);
}

async function handleMessage(env: Env, ctx: ExecutionContext, msg: TgMessage): Promise<void> {
  if (!msg.from || !msg.text) return;
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const text = msg.text.trim();

  await upsertUser(env, msg.from);

  // Проверяем не забанен ли юзер (silent drop)
  const user = await env.DB.prepare(`SELECT is_banned FROM users WHERE tg_user_id = ?`)
    .bind(userId)
    .first<{ is_banned: number }>();
  if (user?.is_banned === 1) return;

  if (text.startsWith('/start')) {
    await ensureFreeTrial(env, userId);
    await sendMessage(
      env,
      chatId,
      `Здравствуйте, ${escapeHtml(msg.from.first_name)}.\n\n` +
        `<b>SINTEM</b> — 5 AI-сотрудников для селлеров WB и Ozon.\n` +
        `Активирован пробный период: 5 запросов на агента в день, 7 дней.\n\n` +
        `Выбрать агента: /agents\n` +
        `Тарифы: /pay\n` +
        `Помощь: /help`,
    );
    return;
  }

  if (text.startsWith('/help')) {
    await sendMessage(env, chatId, helpText());
    return;
  }

  if (text.startsWith('/agents')) {
    await sendMessage(env, chatId, 'Выберите агента:', { reply_markup: agentsKeyboard() });
    return;
  }

  if (text.startsWith('/pay')) {
    await sendMessage(env, chatId, 'Выберите тариф:', { reply_markup: plansKeyboard() });
    return;
  }

  if (text.startsWith('/me')) {
    await sendMessage(env, chatId, await renderMe(env, userId));
    return;
  }

  if (text.startsWith('/cancel')) {
    const upd = await env.DB.prepare(
      `UPDATE subscriptions SET auto_renew = 0
         WHERE tg_user_id = ? AND is_active = 1 AND auto_renew = 1
        RETURNING id`,
    )
      .bind(userId)
      .first<{ id: number }>();
    if (upd) {
      await sendMessage(env, chatId, '✅ Авто-продление отключено. Подписка остаётся активной до конца оплаченного периода.');
    } else {
      await sendMessage(env, chatId, 'Авто-продление и так не было включено.');
    }
    return;
  }

  if (text.startsWith('/admin')) {
    return handleAdmin(env, msg);
  }

  // Обычное сообщение — нужен выбранный агент
  const session = await env.DB.prepare(
    `SELECT active_agent_id, context_window FROM sessions WHERE tg_user_id = ?`,
  )
    .bind(userId)
    .first<{ active_agent_id: string | null; context_window: string }>();

  if (!session?.active_agent_id) {
    await sendMessage(env, chatId, 'Сначала выберите агента: /agents');
    return;
  }

  const agentId = session.active_agent_id;
  const quota = await checkAndIncrementQuota(env, userId, agentId);
  if (!quota.allowed) {
    if (quota.reason === 'no_active_plan') {
      await sendMessage(env, chatId, 'Подписка не активна. Оплатите тариф: /pay');
    } else if (quota.reason === 'daily_quota') {
      await sendMessage(env, chatId, 'Квота на сегодня исчерпана. Повышение тарифа: /pay');
    }
    // flood — silent
    return;
  }

  ctx.waitUntil(sendChatAction(env, chatId, 'typing'));

  const systemPrompt = (await env.PROMPTS.get(`prompt:${agentId}`)) ??
    'You are a helpful WB/Ozon seller assistant. Answer concisely in Russian.';
  const history: GroqMessage[] = JSON.parse(session.context_window || '[]');
  const messages: GroqMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-8), // sliding window 4 пары
    { role: 'user', content: text },
  ];

  let groqResult;
  try {
    groqResult = await callGroq(env, messages);
  } catch (e) {
    log({ event: 'groq_failed_enqueue', level: 'error', user_id: userId, agent_id: agentId, error: (e as Error).message });
    await enqueueRetry(env, {
      user_id: userId,
      chat_id: chatId,
      agent_id: agentId,
      messages,
      attempts: 1,
      enqueued_at: Math.floor(Date.now() / 1000),
      original_msg_id: msg.message_id,
    });
    await sendMessage(env, chatId, '⏳ Сервис AI временно перегружен. Ответ придёт автоматически в течение 5 минут.');
    return;
  }

  // Persist invocation + messages
  const invStmt = env.DB.prepare(
    `INSERT INTO agent_invocations
     (tg_user_id, agent_id, model, provider, input_tokens, output_tokens, latency_ms, status, cost_usd_e4)
     VALUES (?,?,?,?,?,?,?,?,?)`,
  ).bind(
    userId, agentId, env.GROQ_MODEL, 'groq',
    groqResult.input_tokens, groqResult.output_tokens, groqResult.latency_ms,
    'success',
    groqCostUsdE4(groqResult.input_tokens, groqResult.output_tokens),
  );
  const userMsgStmt = env.DB.prepare(
    `INSERT INTO messages (tg_user_id, agent_id, role, content, tg_message_id)
     VALUES (?,?,?,?,?)`,
  ).bind(userId, agentId, 'user', text, msg.message_id);
  const asstMsgStmt = env.DB.prepare(
    `INSERT INTO messages (tg_user_id, agent_id, role, content) VALUES (?,?,?,?)`,
  ).bind(userId, agentId, 'assistant', groqResult.content);

  ctx.waitUntil(env.DB.batch([invStmt, userMsgStmt, asstMsgStmt]).then(() => undefined));

  // Update session context window
  const newHistory = [
    ...history.slice(-6),
    { role: 'user' as const, content: text },
    { role: 'assistant' as const, content: groqResult.content },
  ];
  ctx.waitUntil(
    env.DB.prepare(
      `UPDATE sessions SET context_window = ?, state = 'idle', updated_at = strftime('%s','now')
       WHERE tg_user_id = ?`,
    )
      .bind(JSON.stringify(newHistory), userId)
      .run()
      .then(() => undefined),
  );

  await sendMessage(env, chatId, groqResult.content);
  log({
    event: 'msg_handled',
    user_id: userId,
    agent_id: agentId,
    latency_ms: groqResult.latency_ms,
    in_tokens: groqResult.input_tokens,
    out_tokens: groqResult.output_tokens,
  });
}

async function handleCallback(env: Env, ctx: ExecutionContext, q: TgCallbackQuery): Promise<void> {
  await answerCallback(env, q.id);
  if (!q.data || !q.message) return;
  const userId = q.from.id;
  const chatId = q.message.chat.id;

  if (q.data.startsWith('agent:')) {
    const agentId = q.data.slice('agent:'.length);
    if (!WEDGE_AGENTS.includes(agentId as (typeof WEDGE_AGENTS)[number])) return;
    await env.DB.prepare(
      `INSERT INTO sessions (tg_user_id, active_agent_id, state, context_window)
       VALUES (?, ?, 'awaiting_input', '[]')
       ON CONFLICT(tg_user_id) DO UPDATE SET
         active_agent_id = excluded.active_agent_id,
         state = 'awaiting_input',
         context_window = '[]',
         updated_at = strftime('%s','now')`,
    )
      .bind(userId, agentId)
      .run();
    await sendMessage(
      env,
      chatId,
      `Агент <b>${escapeHtml(AGENT_LABELS[agentId as (typeof WEDGE_AGENTS)[number]] ?? agentId)}</b> выбран. Задайте вопрос текстом.`,
    );
    return;
  }

  if (q.data.startsWith('plan:')) {
    const plan = q.data.slice('plan:'.length) as Plan;
    if (!(plan in PLAN_CONFIG) || plan === 'free_trial') return;
    try {
      const { url, payment_id, provider } = await createInvoice(env, userId, plan as PaidPlan);
      await sendMessage(
        env,
        chatId,
        `Счёт <b>${PLAN_CONFIG[plan].price_rub} ₽</b> на тариф <b>${escapeHtml(plan)}</b> создан через ${provider}.\n` +
          `Подписка активируется автоматически после оплаты.`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: '💳 Оплатить', url }]],
          },
        },
      );
      log({ event: 'invoice_sent', user_id: userId, plan, payment_id, provider });
    } catch (e) {
      log({ event: 'invoice_failed', level: 'error', user_id: userId, plan, error: (e as Error).message });
      await sendMessage(env, chatId, '❌ Не удалось создать счёт. Попробуйте позже или напишите в поддержку.');
    }
    void ctx;
  }
}

// ============================================================
// Helpers
// ============================================================

async function upsertUser(env: Env, u: TgUser): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO users (tg_user_id, username, first_name, last_name, language_code, last_seen_at)
     VALUES (?, ?, ?, ?, ?, strftime('%s','now'))
     ON CONFLICT(tg_user_id) DO UPDATE SET
       username = excluded.username,
       first_name = excluded.first_name,
       last_name = excluded.last_name,
       language_code = excluded.language_code,
       last_seen_at = strftime('%s','now')`,
  )
    .bind(u.id, u.username ?? null, u.first_name, u.last_name ?? null, u.language_code ?? null)
    .run();
}

async function ensureFreeTrial(env: Env, userId: number): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1000) + 7 * 86400;
  await env.DB.prepare(
    `INSERT INTO subscriptions (tg_user_id, plan, is_active, expires_at, source)
     SELECT ?, 'free_trial', 1, ?, 'trial_auto'
     WHERE NOT EXISTS (SELECT 1 FROM subscriptions WHERE tg_user_id = ?)`,
  )
    .bind(userId, expiresAt, userId)
    .run();
}

async function checkAndIncrementQuota(env: Env, userId: number, agentId: string): Promise<QuotaResult> {
  // Flood protection (60s window): KV counter, drop if > 30/min
  const floodKey = `flood:${userId}`;
  const floodCount = parseInt((await env.RATE_LIMITS.get(floodKey)) ?? '0', 10) + 1;
  await env.RATE_LIMITS.put(floodKey, String(floodCount), { expirationTtl: 60 });
  if (floodCount > 30) return { allowed: false, remaining: 0, reason: 'flood' };

  // Read active subscription (cached in KV 5 min)
  const cacheKey = `sub:${userId}`;
  let sub = await env.BILLING_CACHE.get<{ plan: Plan; expires_at: number }>(cacheKey, 'json');
  if (!sub) {
    const row = await env.DB.prepare(
      `SELECT plan, expires_at FROM subscriptions
       WHERE tg_user_id = ? AND is_active = 1
       ORDER BY expires_at DESC LIMIT 1`,
    )
      .bind(userId)
      .first<{ plan: Plan; expires_at: number }>();
    if (!row) return { allowed: false, remaining: 0, reason: 'no_active_plan' };
    sub = row;
    await env.BILLING_CACHE.put(cacheKey, JSON.stringify(sub), { expirationTtl: 300 });
  }

  if (sub.expires_at < Math.floor(Date.now() / 1000)) {
    return { allowed: false, remaining: 0, reason: 'no_active_plan' };
  }

  const limit = PLAN_CONFIG[sub.plan].daily_quota_per_agent;
  const today = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''), 10);

  // Atomic increment via D1 upsert + RETURNING
  const inc = await env.DB.prepare(
    `INSERT INTO usage_quota (tg_user_id, agent_id, date, count, last_at)
     VALUES (?, ?, ?, 1, strftime('%s','now'))
     ON CONFLICT(tg_user_id, agent_id, date) DO UPDATE SET
       count = count + 1,
       last_at = strftime('%s','now')
     RETURNING count`,
  )
    .bind(userId, agentId, today)
    .first<{ count: number }>();

  const used = inc?.count ?? 0;
  if (used > limit) {
    // Откатываем инкремент
    await env.DB.prepare(
      `UPDATE usage_quota SET count = count - 1
       WHERE tg_user_id = ? AND agent_id = ? AND date = ?`,
    )
      .bind(userId, agentId, today)
      .run();
    return { allowed: false, remaining: 0, reason: 'daily_quota' };
  }
  return { allowed: true, remaining: limit - used };
}

function agentsKeyboard() {
  return {
    inline_keyboard: WEDGE_AGENTS.map((id) => [{ text: AGENT_LABELS[id], callback_data: `agent:${id}` }]),
  };
}

function plansKeyboard() {
  return {
    inline_keyboard: (['starter', 'pro', 'business'] as Plan[]).map((p) => [
      { text: `${p} — ${PLAN_CONFIG[p].price_rub} ₽/мес`, callback_data: `plan:${p}` },
    ]),
  };
}

function helpText(): string {
  return (
    '<b>SINTEM</b> — AI-сотрудники для селлеров WB и Ozon.\n\n' +
    '/agents — выбрать агента\n' +
    '/pay — тарифы и оплата\n' +
    '/me — мой план и квота\n' +
    '/cancel — отключить авто-продление\n\n' +
    'Поддержка: @sintem_support'
  );
}

async function renderMe(env: Env, userId: number): Promise<string> {
  const sub = await env.DB.prepare(
    `SELECT plan, expires_at, auto_renew FROM subscriptions
     WHERE tg_user_id = ? AND is_active = 1 LIMIT 1`,
  )
    .bind(userId)
    .first<{ plan: Plan; expires_at: number; auto_renew: number }>();
  if (!sub) return 'Подписка не активна. /pay';
  const days = Math.max(0, Math.floor((sub.expires_at - Date.now() / 1000) / 86400));
  return (
    `Тариф: <b>${escapeHtml(sub.plan)}</b>\n` +
    `Осталось дней: ${days}\n` +
    `Авто-продление: ${sub.auto_renew ? 'да' : 'нет'}\n` +
    `Квота на агента в сутки: ${PLAN_CONFIG[sub.plan].daily_quota_per_agent}`
  );
}
