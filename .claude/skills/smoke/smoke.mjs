// Headless Chromium smoke test against the local CRA dev server.
// Run from project root: `node .claude/skills/smoke/smoke.mjs [route1] [route2] ...`
// Default routes: /, /account, /signup.

import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3000';
const routes = process.argv.slice(2);
if (routes.length === 0) routes.push('/', '/account', '/signup');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];

page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => pageErrors.push(err.message));
page.on('requestfailed', (req) => {
  if (req.url().startsWith('data:')) return;
  failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
});

const navigations = [];
for (const route of routes) {
  const start = Date.now();
  let landedAt = null;
  let title = null;
  let httpStatus = null;
  let err = null;
  try {
    const resp = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 });
    httpStatus = resp?.status() ?? null;
    await page.waitForLoadState('load', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const url = new URL(page.url());
    landedAt = url.pathname + url.search;
    title = await page.title();
  } catch (e) {
    err = e.message;
  }
  navigations.push({ route, landedAt, httpStatus, title, ms: Date.now() - start, err });
}

await browser.close();

console.log(JSON.stringify({
  navigations,
  consoleErrors: consoleErrors.slice(0, 20),
  pageErrors: pageErrors.slice(0, 20),
  failedRequests: failedRequests.slice(0, 20)
}, null, 2));
