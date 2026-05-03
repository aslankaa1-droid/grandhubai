/**
 * Тестирует приложение через Cloudflare Tunnel URL.
 * Ловит console errors, network failures, CSP violations.
 */
import { chromium } from 'playwright';

const URL = process.argv[2] || 'https://differ-keys-advancement-situated.trycloudflare.com';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

const allLogs = [];
const networkErrors = [];

page.on('console', (msg) => {
  allLogs.push({ type: msg.type(), text: msg.text() });
});
page.on('pageerror', (e) => {
  allLogs.push({ type: 'pageerror', text: e.message });
});
page.on('requestfailed', (req) => {
  networkErrors.push({ url: req.url(), failure: req.failure()?.errorText });
});
page.on('response', async (resp) => {
  if (resp.status() >= 400) {
    networkErrors.push({ url: resp.url(), status: resp.status() });
  }
});

console.log(`\n🌐 Открываю: ${URL}`);
console.log(`⏳ Жду полную загрузку...\n`);

try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
} catch (e) {
  console.log(`❌ Goto failed: ${e.message}`);
}

const stats = await page.evaluate(() => {
  return {
    agentsLoaded: Object.keys(window.AGENTS || {}).length,
    title: document.title,
    bodyClass: document.body.className,
    treeChildren: document.querySelectorAll('.agent-item').length,
    badgeText: document.getElementById('agentTotalBadge')?.textContent,
    countLabel: document.getElementById('agentCountLabel')?.textContent,
    swActive: navigator.serviceWorker?.controller ? true : false,
  };
});

console.log('═══ DOM состояние ═══');
console.log('  title:           ', stats.title);
console.log('  body class:      ', stats.bodyClass);
console.log('  agents в window: ', stats.agentsLoaded);
console.log('  agent items DOM: ', stats.treeChildren);
console.log('  badge текст:     ', stats.badgeText);
console.log('  count label:     ', stats.countLabel);
console.log('  Service Worker:  ', stats.swActive ? 'активен' : 'не активен');

if (allLogs.length) {
  console.log('\n═══ Console сообщения ═══');
  for (const l of allLogs) {
    const icon = l.type === 'error' || l.type === 'pageerror' ? '❌' : (l.type === 'warning' ? '⚠️' : 'ℹ️');
    console.log(`  ${icon} [${l.type}] ${l.text.substring(0, 200)}`);
  }
} else {
  console.log('\n✅ Нет console сообщений');
}

if (networkErrors.length) {
  console.log('\n═══ Network errors ═══');
  for (const e of networkErrors) {
    console.log(`  ❌ ${e.status || e.failure} ${e.url}`);
  }
} else {
  console.log('\n✅ Нет network errors');
}

await browser.close();
process.exit(0);
