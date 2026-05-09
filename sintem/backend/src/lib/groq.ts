// Groq client: timeout 30s + 1 retry with 1.5s backoff.

import { log } from './log';
import type { Env } from '../types';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqResult {
  content: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
}

export async function callGroq(env: Env, messages: GroqMessage[]): Promise<GroqResult> {
  const t0 = Date.now();
  const doCall = async (): Promise<GroqResult> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30_000);
    try {
      const res = await fetch(`${env.GROQ_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${env.GROQ_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: env.GROQ_MODEL,
          messages,
          temperature: 0.4,
          max_tokens: 1500,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`groq ${res.status}: ${txt.slice(0, 200)}`);
      }
      const json = (await res.json()) as {
        choices: { message: { content: string } }[];
        usage: { prompt_tokens: number; completion_tokens: number };
      };
      return {
        content: json.choices[0]?.message?.content ?? '',
        input_tokens: json.usage.prompt_tokens,
        output_tokens: json.usage.completion_tokens,
        latency_ms: Date.now() - t0,
      };
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await doCall();
  } catch (e) {
    log({ event: 'groq_retry', level: 'warn', error: (e as Error).message });
    await new Promise((r) => setTimeout(r, 1500));
    return doCall();
  }
}

/** Cost in cents-of-cent (USD * 10000) for atomic SQL storage. */
export function groqCostUsdE4(input_tokens: number, output_tokens: number): number {
  // llama-3.3-70b-versatile pricing as of 2026-01: $0.59/1M input, $0.79/1M output.
  // Source: https://groq.com/pricing — bump if Groq changes pricing.
  const usd = (input_tokens * 0.59 + output_tokens * 0.79) / 1_000_000;
  return Math.round(usd * 10_000);
}
