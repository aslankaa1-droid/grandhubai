// Shared types for SINTEM bot.

export interface Env {
  // D1
  DB: D1Database;
  // KV
  PROMPTS: KVNamespace;
  RATE_LIMITS: KVNamespace;
  BILLING_CACHE: KVNamespace;
  RETRY_QUEUE: KVNamespace;
  // Secrets
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  GROQ_API_KEY: string;
  NOWPAYMENTS_API_KEY: string;
  NOWPAYMENTS_IPN_SECRET: string;
  CRYPTOCLOUD_API_KEY: string;
  CRYPTOCLOUD_SECRET: string;
  CRYPTOCLOUD_SHOP_ID: string;
  ADMIN_TG_USER_IDS: string;
  // Vars
  ENVIRONMENT: 'development' | 'staging' | 'production';
  PUBLIC_BASE_URL: string;
  NOWPAYMENTS_API_BASE: string;
  CRYPTOCLOUD_API_BASE: string;
  GROQ_API_BASE: string;
  GROQ_MODEL: string;
}

export interface TgUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TgChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
}

export interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  date: number;
  text?: string;
}

export interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

export type Plan = 'free_trial' | 'starter' | 'pro' | 'business';
export type PaidPlan = Exclude<Plan, 'free_trial'>;

export interface PlanConfig {
  daily_quota_per_agent: number;
  price_rub: number;
  duration_days: number;
}

export const PLAN_CONFIG: Record<Plan, PlanConfig> = {
  free_trial: { daily_quota_per_agent: 5, price_rub: 0, duration_days: 7 },
  starter: { daily_quota_per_agent: 50, price_rub: 1500, duration_days: 30 },
  pro: { daily_quota_per_agent: 200, price_rub: 3500, duration_days: 30 },
  business: { daily_quota_per_agent: 1000, price_rub: 7900, duration_days: 30 },
};

// Реальные id и system-prompts из sprint/week3_agents/ — сидируются в KV PROMPTS при деплое.
export const WEDGE_AGENTS = ['wb_pricer', 'wb_reviews', 'oz_listings', 'wb_ads', 'oz_unit_economics'] as const;
export type WedgeAgentId = (typeof WEDGE_AGENTS)[number];

export const AGENT_LABELS: Record<WedgeAgentId, string> = {
  wb_pricer: 'WB · Цены и юнит-экономика',
  wb_reviews: 'WB · Отзывы и Q&A',
  oz_listings: 'Ozon · Карточки и SEO',
  wb_ads: 'WB · Рекламные кампании',
  oz_unit_economics: 'Ozon · Юнит-экономика',
};

export interface RetryQueueItem {
  user_id: number;
  chat_id: number;
  agent_id: string;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  attempts: number;
  enqueued_at: number;
  original_msg_id?: number;
}
