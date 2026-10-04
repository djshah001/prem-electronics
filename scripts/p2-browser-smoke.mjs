import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const edgePath = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const baseUrl = process.env.P2_BROWSER_BASE_URL || 'http://localhost:5173';
const debugPort = Number(process.env.P2_BROWSER_DEBUG_PORT || 9333);
const profile = join(process.cwd(), 'tmp', `prem-electronics-p2-edge-${process.pid}`);
const desktopScreenshot = join(tmpdir(), 'prem-electronics-p2-desktop.png');
const mobileScreenshot = join(tmpdir(), 'prem-electronics-p2-mobile.png');
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

class CdpClient {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.waiters = new Map();
    this.socket = new WebSocket(url.replace('ws://localhost:', 'ws://127.0.0.1:'));
    const opening = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.ready = Promise.race([
      opening,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out connecting to Edge DevTools.')), 10_000)),
    ]);
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      const waiter = this.waiters.get(message.method)?.shift();
      waiter?.(message.params);
    });
    this.socket.addEventListener('close', () => {
      for (const pending of this.pending.values()) pending.reject(new Error(`Edge DevTools connection closed while awaiting ${pending.method}.`));
      this.pending.clear();
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = this.nextId++;
    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for Edge DevTools response to ${method}.`));
      }, 10_000);
      this.pending.set(id, {
        method,
        resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (error) => { clearTimeout(timer); reject(error); },
      });
    });
    this.socket.send(JSON.stringify({ id, method, params }));
    return promise;
  }

  waitFor(method, timeout = 10_000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeout);
      const wrapped = (value) => { clearTimeout(timer); resolve(value); };
      const waiters = this.waiters.get(method) ?? [];
      waiters.push(wrapped);
      this.waiters.set(method, waiters);
    });
  }

  close() { this.socket.close(); }
}

const waitForDebugger = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${debugPort}/json`).then((response) => response.json());
      const page = targets.find((target) => target.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* Edge is still starting. */ }
    await sleep(200);
  }
  throw new Error('Edge debugging endpoint did not start.');
};

await mkdir(profile, { recursive: true });
const edge = spawn(edgePath, [
  '--headless', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`,
  '--remote-allow-origins=*', '--no-first-run', '--disable-default-apps', '--disable-gpu',
  '--disable-gpu-sandbox', '--disable-gpu-shader-disk-cache', '--no-sandbox', '--disable-dev-shm-usage',
  'about:blank',
], { stdio: 'ignore', windowsHide: true });

let client;
try {
  client = new CdpClient(await waitForDebugger());
  await Promise.all([client.send('Page.enable'), client.send('Runtime.enable'), client.send('Network.enable')]);
  const exceptions = [];
  const failedRequests = [];
  client.socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails?.text ?? 'Browser exception');
    if (message.method === 'Network.responseReceived' && message.params.response.status >= 500) {
      failedRequests.push(`${message.params.response.status} ${message.params.response.url}`);
    }
  });

  const evaluate = async (expression) => {
    const result = await client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const navigate = async (url) => {
    await client.send('Page.navigate', { url });
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const state = await evaluate(`({ href: location.href, ready: document.readyState })`);
      if (state.href.startsWith(url) && state.ready === 'complete') break;
      await sleep(200);
    }
    await sleep(500);
  };
  const waitUntil = async (expression, description) => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (await evaluate(expression)) return;
      await sleep(200);
    }
    throw new Error(`Timed out waiting for ${description}.`);
  };
  const screenshot = async (path) => {
    const result = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(path, result.data, 'base64');
  };

  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate(`${baseUrl}/login`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find((button) => button.textContent.includes('Admin Login')).click()`);
  await sleep(100);
  await evaluate(`document.querySelector('#login-form').requestSubmit()`);
  await waitUntil(`document.body.textContent.includes('Prem Electronics') && !location.pathname.includes('login')`, 'admin login');
  await navigate(`${baseUrl}/admin/dashboard`);
  await waitUntil(`document.querySelector('h1')?.textContent.includes('Dashboard')`, 'dashboard heading');

  const desktop = await evaluate(`(() => ({
    path: location.pathname,
    heading: document.querySelector('h1')?.textContent.trim(),
    links: Array.from(document.querySelectorAll('nav[aria-label="Admin navigation"] a')).map((link) => link.textContent.trim()),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  }))()`);
  assert.equal(desktop.path, '/admin/dashboard');
  assert.equal(desktop.heading, 'Dashboard');
  assert.equal(desktop.overflow, false);
  for (const label of ['Dashboard', 'Analytics', 'Products', 'Categories', 'Inventory', 'Orders', 'Transactions', 'Coupons', 'Customers', 'Reviews', 'Blogs']) {
    assert.equal(desktop.links.includes(label), true, `Missing desktop navigation link: ${label}`);
  }
  await screenshot(desktopScreenshot);

  for (const [path, title] of [
    ['/admin/analytics', 'Analytics'], ['/admin/products', 'Products'], ['/admin/categories', 'Categories'],
    ['/admin/inventory', 'Inventory'], ['/admin/orders', 'Orders'], ['/admin/transactions', 'Transactions'],
    ['/admin/coupons', 'Coupons'], ['/admin/customers', 'Customers'], ['/admin/reviews', 'Reviews'], ['/admin/blogs', 'Blogs'],
  ]) {
    await navigate(`${baseUrl}${path}`);
    await waitUntil(`location.pathname === ${JSON.stringify(path)} && document.querySelector('header h1')?.textContent.trim() === ${JSON.stringify(title)}`, `${title} route`);
    assert.equal(await evaluate(`document.body.textContent.includes('Admin page not found')`), false);
  }

  const initialTheme = desktop.theme;
  await evaluate(`document.querySelector('[aria-label="Toggle theme"]').click()`);
  await sleep(150);
  const toggledTheme = await evaluate(`document.documentElement.classList.contains('dark') ? 'dark' : 'light'`);
  assert.notEqual(toggledTheme, initialTheme);

  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
  await navigate(`${baseUrl}/admin/dashboard`);
  await waitUntil(`Boolean(document.querySelector('[aria-label="Open admin menu"]'))`, 'mobile menu trigger');
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), true);
  await evaluate(`document.querySelector('[aria-label="Open admin menu"]').click()`);
  await waitUntil(`Boolean(document.querySelector('[role="dialog"]'))`, 'mobile navigation dialog');
  assert.equal(await evaluate(`document.querySelector('[role="dialog"]').contains(document.activeElement)`), true);
  await screenshot(mobileScreenshot);

  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
  await waitUntil(`!document.querySelector('[role="dialog"]')`, 'drawer close on Escape');
  assert.equal(await evaluate(`document.activeElement?.getAttribute('aria-label') === 'Open admin menu'`), true);

  await evaluate(`document.querySelector('[aria-label="Open admin menu"]').click()`);
  await waitUntil(`Boolean(document.querySelector('[role="dialog"]'))`, 'reopened mobile drawer');
  await evaluate(`Array.from(document.querySelectorAll('[role="dialog"] a')).find((link) => link.textContent.includes('Analytics')).click()`);
  await waitUntil(`location.pathname === '/admin/analytics' && !document.querySelector('[role="dialog"]')`, 'analytics navigation and drawer close');
  await navigate(`${baseUrl}/admin/analytics`);
  await waitUntil(`document.querySelector('h1')?.textContent.includes('Analytics')`, 'analytics after direct refresh');
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), true);

  await evaluate(`document.querySelector('[aria-label="Open administrator profile menu"]').click()`);
  await waitUntil(`Array.from(document.querySelectorAll('[role="menuitem"]')).some((item) => item.textContent.includes('Log out'))`, 'logout menu item');
  await evaluate(`Array.from(document.querySelectorAll('[role="menuitem"]')).find((item) => item.textContent.includes('Log out')).click()`);
  await waitUntil(`location.pathname === '/login'`, 'logout redirect');
  await evaluate(`history.back()`);
  await sleep(500);
  assert.equal(await evaluate(`location.pathname === '/login'`), true);
  await client.send('Page.navigate', { url: `${baseUrl}/admin/dashboard` });
  await waitUntil(`location.pathname === '/login'`, 'protected direct URL after logout');
  assert.deepEqual(exceptions, []);
  assert.deepEqual(failedRequests, []);

  console.log(JSON.stringify({ desktop, toggledTheme, desktopScreenshot, mobileScreenshot, browserExceptions: exceptions.length, serverErrors: failedRequests.length }, null, 2));
} finally {
  client?.close();
  edge.kill();
  await sleep(250);
  await rm(profile, { recursive: true, force: true });
}
