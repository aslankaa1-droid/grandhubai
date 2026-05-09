#!/usr/bin/env node
// Seed KV PROMPTS namespace with the 5 wedge-agent system prompts.
// Sources expected in: ../../sprint/week3_agents/01..05_*.md (when sprint/week3_agents
// is finalized and merged into the repo).
//
// Usage:
//   node scripts/seed-prompts.mjs            # uses --remote
//   node scripts/seed-prompts.mjs --local    # uses --local

import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = resolve(__dirname, '../prompts');
const LOCAL = process.argv.includes('--local');
const FLAG = LOCAL ? '--local' : '--remote';

const AGENT_FILES = {
  wb_pricer: '01_mp_unit_economics.md',
  wb_reviews: '02_mp_review_responder.md',
  oz_listings: '03_mp_card_doctor.md',
  wb_ads: '04_mp_competitor_scout.md',
  oz_unit_economics: '05_mp_abc_xyz_analyst.md',
};

function readAgentPrompt(filename) {
  // Try repo-local prompts/ first, then external sprint kit.
  const local = join(PROMPTS_DIR, filename);
  const sprint = join(__dirname, '../../../../E:/Проекты Аслана/SINTEM/sprint/week3_agents/', filename);
  for (const path of [local, sprint]) {
    try {
      return readFileSync(path, 'utf-8');
    } catch {
      // try next
    }
  }
  console.warn(`⚠ prompt not found: ${filename} — using placeholder`);
  return `# Placeholder for ${filename}\n\nReplace with the real system prompt before going live.`;
}

console.log(`Seeding KV PROMPTS (${LOCAL ? 'local' : 'remote'})...`);
for (const [agentId, filename] of Object.entries(AGENT_FILES)) {
  const text = readAgentPrompt(filename);
  const key = `prompt:${agentId}`;
  try {
    // Use stdin to avoid shell-escaping issues.
    execSync(`wrangler kv:key put --binding=PROMPTS ${FLAG} ${JSON.stringify(key)}`, {
      input: text,
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    console.log(`  ✓ ${key}`);
  } catch (e) {
    console.error(`  ✗ ${key}: ${e.message}`);
  }
}

console.log('\nVerify:');
console.log(`  wrangler kv:key list --binding=PROMPTS ${FLAG}`);
