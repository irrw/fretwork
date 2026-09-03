#!/usr/bin/env node
// Minimal chromium-cli-style REPL driver for the fretwork dev app, built
// because chromium-cli itself isn't installed in this environment.
// Reads commands from stdin, one per line, and runs them against a single
// persistent page. Screenshots land in ./screenshots/ (relative to this file).
//
// Commands:
//   nav <url>                    navigate
//   viewport <width> <height>    resize the browser viewport
//   wait-for text=<substring>    wait for text to appear anywhere on the page
//   wait-for <css-selector>      wait for a selector to appear
//   screenshot [name.png]        screenshot full page (default: auto-numbered)
//   click <css-selector>         click the first match
//   fill <css-selector> <text>   fill an input (fires React's onChange)
//   press <key>                  press a key (e.g. Enter)
//   scroll <selector> <px>       scrollBy on an element (negative px = scroll up)
//   scroll-bounds <selector>     print scrollTop/scrollHeight/clientHeight + atTop/atBottom
//   sleep <ms>                   wait (e.g. after an action that triggers a CSS transition)
//   console --errors             print collected console.error / pageerror so far
//   quit                         close the browser and exit
//
// Example:
//   node driver.mjs <<'EOF'
//   viewport 1600 1200
//   nav http://localhost:5180/
//   wait-for text=Major
//   screenshot desktop.png
//   console --errors
//   quit
//   EOF

import { chromium } from 'playwright';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, 'screenshots');

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext();
const page = await context.newPage();

const consoleLog = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleLog.push(`[console.error] ${msg.text()}`);
});
page.on('pageerror', (err) => consoleLog.push(`[pageerror] ${err.message}`));

let shotCount = 0;

async function runCommand(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [cmd, ...rest] = trimmed.split(' ');
  const arg = rest.join(' ');

  try {
    switch (cmd) {
      case 'nav': {
        await page.goto(arg, { waitUntil: 'networkidle' });
        console.log(`ok: navigated to ${arg}`);
        break;
      }
      case 'viewport': {
        const [w, h] = rest.map(Number);
        await page.setViewportSize({ width: w, height: h });
        console.log(`ok: viewport ${w}x${h}`);
        break;
      }
      case 'wait-for': {
        if (arg.startsWith('text=')) {
          const text = arg.slice(5);
          await page.getByText(text).first().waitFor({ timeout: 15000 });
        } else {
          await page.waitForSelector(arg, { timeout: 15000 });
        }
        console.log(`ok: found ${arg}`);
        break;
      }
      case 'screenshot': {
        shotCount += 1;
        const name = arg || `shot-${shotCount}.png`;
        const outPath = path.join(screenshotsDir, name);
        await page.screenshot({ path: outPath });
        console.log(`ok: screenshot -> screenshots/${name}`);
        break;
      }
      case 'click': {
        await page.locator(arg).first().click();
        console.log(`ok: clicked ${arg}`);
        break;
      }
      case 'scroll': {
        const [selector, amountStr] = rest;
        const amount = Number(amountStr);
        await page.locator(selector).first().evaluate((el, amt) => {
          el.scrollBy({ top: amt, left: 0, behavior: 'instant' });
        }, amount);
        console.log(`ok: scrolled ${selector} by ${amount}px`);
        break;
      }
      case 'scroll-bounds': {
        const info = await page.locator(arg).first().evaluate((el) => ({
          scrollTop: el.scrollTop,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          atTop: el.scrollTop <= 0,
          atBottom: el.scrollTop + el.clientHeight >= el.scrollHeight - 1,
        }));
        console.log(`ok: ${JSON.stringify(info)}`);
        break;
      }
      case 'fill': {
        const [selector, ...textParts] = rest;
        await page.locator(selector).first().fill(textParts.join(' '));
        console.log(`ok: filled ${selector}`);
        break;
      }
      case 'sleep': {
        const ms = Number(arg);
        await page.waitForTimeout(ms);
        console.log(`ok: slept ${ms}ms`);
        break;
      }
      case 'press': {
        await page.keyboard.press(arg);
        console.log(`ok: pressed ${arg}`);
        break;
      }
      case 'console': {
        if (arg === '--errors') {
          console.log(consoleLog.length ? consoleLog.join('\n') : 'ok: no console errors');
        }
        break;
      }
      case 'quit': {
        await browser.close();
        process.exit(0);
      }
      default:
        console.log(`error: unknown command '${cmd}'`);
    }
  } catch (err) {
    console.log(`error: ${cmd} failed: ${err.message}`);
  }
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
const lines = [];
rl.on('line', (line) => lines.push(line));
await new Promise((resolve) => rl.on('close', resolve));

for (const line of lines) {
  await runCommand(line);
}
if (browser.isConnected()) await browser.close();
