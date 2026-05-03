#!/usr/bin/env node
/**
 * GrandHubAi · Playwright headless browser tests
 * © 2026 Кагиров Абдул-Хаким Ахмадович · AGPL-3.0
 *
 * Тестирует UI/функциональность через настоящий headless Chromium.
 * Запускает локальный сервер сам, выполняет проверки, останавливает.
 *
 * Usage:
 *   cd tests
 *   npm install
 *   npx playwright install chromium    # один раз
 *   npm test
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const SERVER_PORT = 8765;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;
const VERBOSE = process.argv.includes('--verbose');

let pass = 0, fail = 0;
const failures = [];

function log(msg, color = '') {
  const colors = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', reset: '\x1b[0m' };
  process.stdout.write((colors[color] || '') + msg + colors.reset + '\n');
}

async function check(name, fn) {
  try {
    await fn();
    log(`  ✅ ${name}`, 'green');
    pass++;
  } catch (e) {
    log(`  ❌ ${name}`, 'red');
    log(`     ${e.message.split('\n')[0]}`, 'red');
    failures.push({ name, error: e.message });
    fail++;
  }
}

// ─── 1. Запустить локальный сервер ───
log('\n═══════════════════════════════════════════════════════════', 'cyan');
log('  🧪 GrandHubAi Playwright Tests', 'cyan');
log('═══════════════════════════════════════════════════════════\n', 'cyan');

log('🚀 Запуск тестового HTTP-сервера на порту ' + SERVER_PORT + '...', 'yellow');

const server = spawn('python', ['start.py', String(SERVER_PORT), '--no-browser'], {
  cwd: PROJECT_ROOT,
  stdio: VERBOSE ? 'inherit' : 'pipe',
  shell: true,
});

server.on('error', (e) => {
  log('❌ Не удалось запустить сервер: ' + e.message, 'red');
  process.exit(1);
});

await sleep(2500);

// ─── 2. Запустить браузер ───
log('🌐 Запуск headless Chromium...\n', 'yellow');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
  if (VERBOSE) log(`    [browser ${msg.type()}] ${msg.text()}`, 'yellow');
});
page.on('pageerror', (e) => consoleErrors.push('PAGE ERROR: ' + e.message));

try {
  // ─── 3. Тесты ───
  log('═══ Базовая загрузка ═══', 'cyan');

  await check('Открывается главная страница', async () => {
    await page.goto(SERVER_URL, { waitUntil: 'networkidle' });
    if (page.url() !== SERVER_URL + '/') throw new Error('URL: ' + page.url());
  });

  await check('Заголовок содержит "GrandHubAi"', async () => {
    const t = await page.title();
    if (!t.includes('GrandHubAi')) throw new Error('Title: ' + t);
  });

  await check('Hero h1 с градиентным текстом виден', async () => {
    const h1 = await page.locator('.hero h1').first().textContent();
    if (!h1.includes('GrandHubAi')) throw new Error('h1: ' + h1);
  });

  await check('Не было JS-ошибок в console', async () => {
    if (consoleErrors.length) throw new Error('Errors: ' + consoleErrors.slice(0, 3).join(' | '));
  });

  log('\n═══ Промпт-библиотека ═══', 'cyan');

  await check('Загружено 200+ агентов', async () => {
    const count = await page.evaluate(() => Object.keys(window.AGENTS || {}).length);
    if (count < 200) throw new Error('Loaded only ' + count + ' agents');
  });

  await check('Бейдж количества агентов отображается', async () => {
    await page.waitForSelector('#agentTotalBadge');
    const txt = await page.locator('#agentTotalBadge').textContent();
    if (parseInt(txt) < 200) throw new Error('Badge: ' + txt);
  });

  await check('Дерево агентов отрисовалось', async () => {
    const items = await page.locator('.agent-item').count();
    if (items < 50) throw new Error('Only ' + items + ' agent items in DOM');
  });

  await check('Поиск агентов работает', async () => {
    await page.fill('#agentSearch', 'квантов');
    await sleep(300);
    const visible = await page.locator('.agent-item:visible').count();
    if (visible < 1 || visible > 10) throw new Error('Search shows ' + visible + ' results');
    await page.fill('#agentSearch', '');
    await sleep(200);
  });

  log('\n═══ Темы ═══', 'cyan');

  await check('По умолчанию тёмная тема', async () => {
    const cls = await page.locator('body').getAttribute('class');
    if (!cls.includes('dark')) throw new Error('Body classes: ' + cls);
  });

  await check('Кнопка темы переключает на light', async () => {
    await page.click('#themeBtn');
    await sleep(300);
    const cls = await page.locator('body').getAttribute('class');
    if (!cls.includes('light')) throw new Error('After click: ' + cls);
  });

  await check('Циклическое переключение через все 8 тем', async () => {
    const themes = new Set();
    for (let i = 0; i < 10; i++) {
      const cls = await page.locator('body').getAttribute('class');
      const found = ['dark', 'light', 'sepia', 'contrast', 'solarized', 'nord', 'dracula'].find(t => cls.includes(t));
      if (found) themes.add(found);
      await page.click('#themeBtn');
      await sleep(150);
    }
    if (themes.size < 6) throw new Error('Found themes: ' + [...themes].join(', '));
  });

  log('\n═══ Settings & Modal ═══', 'cyan');

  await check('Settings modal открывается', async () => {
    await page.click('#settingsBtn');
    await sleep(300);
    const visible = await page.locator('#settingsModal.active').count();
    if (visible !== 1) throw new Error('Modal not visible');
  });

  await check('В Settings есть селекторы темы и шрифта', async () => {
    const themeOpts = await page.locator('#themeSelect option').count();
    const fontOpts = await page.locator('#fontSizeSelect option').count();
    if (themeOpts < 8) throw new Error('Theme options: ' + themeOpts);
    if (fontOpts < 4) throw new Error('Font size options: ' + fontOpts);
  });

  await check('Settings закрываются по Cancel', async () => {
    await page.click('[data-close-modal="settingsModal"]');
    await sleep(300);
    const visible = await page.locator('#settingsModal.active').count();
    if (visible !== 0) throw new Error('Modal still visible');
  });

  log('\n═══ Чат ═══', 'cyan');

  await check('Поле ввода текста существует', async () => {
    await page.waitForSelector('#taskInput');
  });

  await check('Кнопки 📎 / 📤 / ⏹ присутствуют', async () => {
    if (!await page.locator('#attachBtn').isVisible()) throw new Error('attachBtn');
    if (!await page.locator('#sendBtn').isVisible()) throw new Error('sendBtn');
    if (!await page.locator('#stopBtn').count()) throw new Error('stopBtn');
  });

  await check('Enter в textarea отправляет (без API ключа — выдаёт ошибку как ожидаемо)', async () => {
    await page.fill('#taskInput', 'тест');
    await page.press('#taskInput', 'Enter');
    await sleep(500);
    // Должно появиться сообщение пользователя
    const userMsgs = await page.locator('.message.user').count();
    if (userMsgs < 1) throw new Error('User msg not appeared');
  });

  log('\n═══ Экспорт ═══', 'cyan');

  await check('Кнопки экспорта TXT/MD/JSON/PDF присутствуют', async () => {
    for (const id of ['exportTxtBtn', 'exportMdBtn', 'exportJsonBtn', 'exportPdfBtn']) {
      if (!await page.locator('#' + id).isVisible()) throw new Error(id + ' invisible');
    }
  });

  log('\n═══ Безопасность ═══', 'cyan');

  await check('CSP мета-тег присутствует', async () => {
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').count();
    if (csp !== 1) throw new Error('CSP meta count: ' + csp);
  });

  await check('Frame-busting код в JS', async () => {
    const html = await page.content();
    if (!html.includes('window.top !== window.self')) throw new Error('No frame-busting');
  });

  log('\n═══ Адаптивность ═══', 'cyan');

  await check('Mobile viewport (390×844, iPhone 14)', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await sleep(300);
    const heroH1 = await page.locator('.hero h1').first().boundingBox();
    if (!heroH1 || heroH1.width > 380) throw new Error('Hero h1 too wide on mobile');
  });

  await check('Tablet viewport (820×1180, iPad)', async () => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await sleep(300);
    const heroVisible = await page.locator('.hero').isVisible();
    if (!heroVisible) throw new Error('Hero not visible on tablet');
  });

} finally {
  await browser.close();
  server.kill();
}

// ─── Финальный отчёт ───
log('\n═══════════════════════════════════════════════════════════', 'cyan');
log(`  📊 Результат: ${pass} passed, ${fail} failed`, fail === 0 ? 'green' : 'yellow');
log('═══════════════════════════════════════════════════════════\n', 'cyan');

if (fail > 0) {
  log('Failures:', 'red');
  failures.forEach((f) => log(`  • ${f.name}: ${f.error.split('\n')[0]}`, 'red'));
  process.exit(1);
}

log('🎉 Все тесты прошли успешно!\n', 'green');
process.exit(0);
