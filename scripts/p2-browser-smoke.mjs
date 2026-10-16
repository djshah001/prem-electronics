import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const edgePath = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const baseUrl = process.env.P2_BROWSER_BASE_URL || 'http://localhost:5173';
const debugPort = Number(process.env.P2_BROWSER_DEBUG_PORT || 9333);
const homeOnly = process.env.P2_HOME_ONLY === '1';
const variantsOnly = process.env.P2_VARIANTS_ONLY === '1';
const profile = join(process.cwd(), 'tmp', `prem-electronics-p2-edge-${process.pid}`);
const desktopScreenshot = join(tmpdir(), 'prem-electronics-p2-desktop.png');
const mobileScreenshot = join(tmpdir(), 'prem-electronics-p2-mobile.png');
const bentoDesktopScreenshot = join(tmpdir(), 'prem-electronics-bento-desktop.png');
const bentoMobileScreenshot = join(tmpdir(), 'prem-electronics-bento-mobile.png');
const variantOptionsScreenshot = join(tmpdir(), 'prem-electronics-variant-options.png');
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
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (await evaluate(expression)) return;
      await sleep(200);
    }
    throw new Error(`Timed out waiting for ${description}.`);
  };
  const screenshot = async (path) => {
    const result = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(path, result.data, 'base64');
  };

  if (variantsOnly) {
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await navigate(`${baseUrl}/`);
    await waitUntil(`document.querySelectorAll('[data-product-card]').length > 0`, 'homepage product cards');
    await waitUntil(`document.querySelectorAll('[data-product-action="configure"]').length > 0`, 'configurable product action');
    await waitUntil(`document.querySelectorAll('[data-product-action="add-to-cart"]').length > 0`, 'simple product action');
    const productActions = await evaluate(`(() => ({
      configure: document.querySelectorAll('[data-product-action="configure"]').length,
      addToCart: document.querySelectorAll('[data-product-action="add-to-cart"]').length,
      configurableTitles: Array.from(document.querySelectorAll('[data-product-action="configure"]')).map((button) => button.closest('[data-product-card]')?.querySelector('h3')?.textContent.trim()),
      simpleTitles: Array.from(document.querySelectorAll('[data-product-action="add-to-cart"]')).map((button) => button.closest('[data-product-card]')?.querySelector('h3')?.textContent.trim())
    }))()`);
    await evaluate(`document.querySelector('[data-product-action="configure"]').click()`);
    await waitUntil(`location.pathname.startsWith('/products/') && location.hash === '#product-options'`, 'configuration route and anchor');
    await waitUntil(`document.querySelectorAll('#product-options button').length > 0`, 'color, size, or storage controls');
    await sleep(700);
    const optionPanel = await evaluate(`(() => ({
      path: location.pathname,
      hash: location.hash,
      optionGroups: document.querySelectorAll('#product-options > div').length,
      optionControls: document.querySelectorAll('#product-options button').length,
      visible: (() => { const rect = document.querySelector('#product-options').getBoundingClientRect(); return rect.bottom > 0 && rect.top < innerHeight; })()
    }))()`);
    assert.ok(optionPanel.optionControls > 0, JSON.stringify(optionPanel));
    assert.equal(optionPanel.visible, true, JSON.stringify(optionPanel));
    await screenshot(variantOptionsScreenshot);
    assert.deepEqual(exceptions, []);
    assert.deepEqual(failedRequests, []);
    console.log(JSON.stringify({ productActions, optionPanel, variantOptionsScreenshot, browserExceptions: exceptions.length, serverErrors: failedRequests.length }, null, 2));
  } else if (homeOnly) {
    const heroSelector = 'section[aria-label="Featured promotions"], section[aria-label="Featured promotion"], section[aria-label="Prem Electronics welcome"]';
    const verifyHome = async ({ mobile }) => {
      await navigate(`${baseUrl}/`);
      await waitUntil(`Boolean(document.querySelector(${JSON.stringify(heroSelector)}))`, `${mobile ? 'mobile' : 'desktop'} storefront hero`);
      await waitUntil(`document.querySelectorAll('[data-bento-tile]').length > 0`, `${mobile ? 'mobile' : 'desktop'} category bento grid`);
      await evaluate(`document.querySelector('[data-home-bento]').scrollIntoView({ block: 'center', behavior: 'instant' })`);
      await waitUntil(`Array.from(document.querySelectorAll('[data-home-bento] img')).every((image) => image.complete && image.naturalWidth > 0)`, `${mobile ? 'mobile' : 'desktop'} bento images`);
      await evaluate(`Array.from(document.querySelectorAll('button')).find((button) => button.textContent.includes('No thanks'))?.click()`);
      await evaluate(`window.scrollTo({ top: 0, behavior: 'instant' })`);
      await sleep(100);
      const layout = await evaluate(`(() => {
        const hero = document.querySelector(${JSON.stringify(heroSelector)});
        const header = document.querySelector('header');
        const bento = document.querySelector('[data-home-bento]');
        const tiles = document.querySelectorAll('[data-bento-tile]');
        return {
          headerPosition: getComputedStyle(header).position,
          heroTop: hero.getBoundingClientRect().top,
          heroWidth: hero.getBoundingClientRect().width,
          heroHeight: hero.getBoundingClientRect().height,
          viewportWidth: document.documentElement.clientWidth,
          viewportHeight: innerHeight,
          bentoWidth: bento.getBoundingClientRect().width,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          tileCount: tiles.length,
          firstTileWidth: tiles[0]?.getBoundingClientRect().width,
          secondTileWidth: tiles[1]?.getBoundingClientRect().width,
          firstTileHeight: tiles[0]?.getBoundingClientRect().height,
          secondTileHeight: tiles[1]?.getBoundingClientRect().height,
        };
      })()`);
      assert.equal(layout.headerPosition, 'absolute', JSON.stringify(layout));
      assert.ok(Math.abs(layout.heroTop) <= 1, JSON.stringify(layout));
      assert.ok(Math.abs(layout.heroWidth - layout.viewportWidth) <= 1, JSON.stringify(layout));
      assert.ok(Math.abs(layout.heroHeight - layout.viewportHeight) <= 1, JSON.stringify(layout));
      assert.ok(Math.abs(layout.bentoWidth - layout.viewportWidth) <= 1, JSON.stringify(layout));
      assert.equal(layout.overflow, false, JSON.stringify(layout));
      if (layout.tileCount > 1) {
        if (mobile) assert.ok(Math.abs(layout.firstTileWidth - layout.secondTileWidth) <= 1, JSON.stringify(layout));
        else assert.ok(layout.firstTileHeight > layout.secondTileHeight * 1.8, JSON.stringify(layout));
      }
      await evaluate(`window.scrollTo({ top: innerHeight, behavior: 'instant' })`);
      await sleep(100);
      assert.equal(await evaluate(`document.querySelector('header').getBoundingClientRect().bottom < 0`), true);
      await evaluate(`document.querySelector('[data-home-bento]').scrollIntoView({ block: ${mobile ? "'start'" : "'center'"}, behavior: 'instant' })`);
      await sleep(700);
      await screenshot(mobile ? bentoMobileScreenshot : bentoDesktopScreenshot);
      await waitUntil(`document.querySelectorAll('[data-product-card]').length > 0`, `${mobile ? 'mobile' : 'desktop'} product cards`);
      const productActions = await evaluate(`(() => ({
        configure: document.querySelectorAll('[data-product-action="configure"]').length,
        addToCart: document.querySelectorAll('[data-product-action="add-to-cart"]').length
      }))()`);
      assert.ok(productActions.configure > 0, JSON.stringify(productActions));
      assert.ok(productActions.addToCart > 0, JSON.stringify(productActions));
      if (!mobile) {
        await evaluate(`document.querySelector('[data-product-action="configure"]').click()`);
        await waitUntil(`location.pathname.startsWith('/products/') && location.hash === '#product-options'`, 'variant product configuration navigation');
        await waitUntil(`document.querySelectorAll('#product-options button').length > 0`, 'variant option controls');
      }
      return { ...layout, productActions };
    };

    await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    const desktopHome = await verifyHome({ mobile: false });
    await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
    const mobileHome = await verifyHome({ mobile: true });
    assert.deepEqual(exceptions, []);
    assert.deepEqual(failedRequests, []);
    console.log(JSON.stringify({ desktopHome, mobileHome, bentoDesktopScreenshot, bentoMobileScreenshot, browserExceptions: exceptions.length, serverErrors: failedRequests.length }, null, 2));
  } else {

  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate(`${baseUrl}/unsubscribe?token=invalid-token-for-browser-smoke`);
  await waitUntil(`document.querySelector('h1')?.textContent.includes('Marketing email preference')`, 'unsubscribe confirmation route');
  await waitUntil(`document.body.textContent.includes('invalid or expired')`, 'safe invalid unsubscribe state');
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
  for (const label of ['Dashboard', 'Analytics', 'Products', 'Categories', 'Inventory', 'Orders', 'Transactions', 'Coupons', 'Customers', 'Reviews', 'Blogs', 'Banner Master', 'Email Master', 'Campaigns', 'Email Logs', 'Invoice Master']) {
    assert.equal(desktop.links.includes(label), true, `Missing desktop navigation link: ${label}`);
  }
  await screenshot(desktopScreenshot);

  for (const [path, title] of [
    ['/admin/analytics', 'Analytics'], ['/admin/products', 'Products'], ['/admin/categories', 'Categories'],
    ['/admin/inventory', 'Inventory'], ['/admin/orders', 'Orders'], ['/admin/transactions', 'Transactions'],
    ['/admin/coupons', 'Coupons'], ['/admin/customers', 'Customers'], ['/admin/reviews', 'Reviews'], ['/admin/blogs', 'Blogs'],
    ['/admin/invoice-master', 'Invoice Master'], ['/admin/banners', 'Banner Master'], ['/admin/email-master', 'Email Master'], ['/admin/campaigns', 'Campaigns'], ['/admin/email-logs', 'Email Logs'],
  ]) {
    await navigate(`${baseUrl}${path}`);
    await waitUntil(`location.pathname === ${JSON.stringify(path)} && document.querySelector('header h1')?.textContent.trim() === ${JSON.stringify(title)}`, `${title} route`);
    assert.equal(await evaluate(`document.body.textContent.includes('Admin page not found')`), false);
  }

  await navigate(`${baseUrl}/admin/banners`);
  await waitUntil(`Array.from(document.querySelectorAll('button')).some((button) => button.textContent.includes('Add banner'))`, 'Banner Master add action');
  await evaluate(`Array.from(document.querySelectorAll('button')).find((button) => button.textContent.includes('Add banner')).click()`);
  await waitUntil(`Boolean(document.querySelector('[role="dialog"]')) && document.body.textContent.includes('Live preview')`, 'Banner Master create form');
  assert.equal(await evaluate(`document.querySelectorAll('[role="dialog"] input[type="file"]').length`), 2);
  await evaluate(`Array.from(document.querySelectorAll('[role="dialog"] button')).find((button) => button.textContent.trim() === 'Cancel').click()`);
  await waitUntil(`!document.querySelector('[role="dialog"]')`, 'Banner Master form close');

  await navigate(`${baseUrl}/`);
  await waitUntil(`Boolean(document.querySelector('section[aria-label="Featured promotions"], section[aria-label="Featured promotion"], section[aria-label="Prem Electronics welcome"]'))`, 'Banner Master storefront hero');
  await waitUntil(`document.querySelectorAll('[data-bento-tile]').length > 0`, 'homepage category bento grid');
  await evaluate(`window.scrollTo({ top: 0, behavior: 'instant' })`);
  await sleep(100);
  assert.equal(await evaluate(`(() => { const tiles = document.querySelectorAll('[data-bento-tile]'); return tiles.length < 2 || tiles[0].getBoundingClientRect().height > tiles[1].getBoundingClientRect().height * 1.8; })()`), true);
  assert.equal(await evaluate(`Math.round(document.querySelector('section[aria-label="Featured promotions"], section[aria-label="Featured promotion"], section[aria-label="Prem Electronics welcome"]').getBoundingClientRect().width) === document.documentElement.clientWidth`), true);
  assert.equal(await evaluate(`Math.abs(document.querySelector('section[aria-label="Featured promotions"], section[aria-label="Featured promotion"], section[aria-label="Prem Electronics welcome"]').getBoundingClientRect().height - innerHeight) <= 1`), true);
  const homeOverlay = await evaluate(`(() => ({ headerPosition: getComputedStyle(document.querySelector('header')).position, heroTop: document.querySelector('section[aria-label="Featured promotions"], section[aria-label="Featured promotion"], section[aria-label="Prem Electronics welcome"]').getBoundingClientRect().top }))()`);
  assert.equal(homeOverlay.headerPosition, 'absolute', JSON.stringify(homeOverlay));
  assert.ok(Math.abs(homeOverlay.heroTop) <= 1, JSON.stringify(homeOverlay));
  await evaluate(`document.querySelector('[data-home-bento]').scrollIntoView({ block: 'center', behavior: 'instant' })`);
  await sleep(700);
  await screenshot(bentoDesktopScreenshot);
  await evaluate(`window.scrollTo({ top: 0, behavior: 'instant' })`);
  await evaluate(`window.scrollTo({ top: innerHeight, behavior: 'instant' })`);
  await sleep(100);
  assert.equal(await evaluate(`document.querySelector('header').getBoundingClientRect().bottom < 0`), true);
  await evaluate(`window.scrollTo({ top: 0, behavior: 'instant' })`);
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), true);

  await navigate(`${baseUrl}/admin/email-master`);
  await waitUntil(`document.querySelectorAll('main aside button').length > 1 && Boolean(document.querySelector('[contenteditable="true"]'))`, 'email template visual editor');
  const emailTemplateBefore = await evaluate(`(() => ({
    name: document.querySelector('main main input')?.value,
    content: document.querySelector('[contenteditable="true"]')?.textContent.trim()
  }))()`);
  await evaluate(`document.querySelectorAll('main aside button')[1].click()`);
  await waitUntil(`Boolean(document.querySelector('main main input')?.value) && document.querySelector('main main input').value !== ${JSON.stringify(emailTemplateBefore.name)}`, 'second email template details');
  await waitUntil(`Boolean(document.querySelector('[contenteditable="true"]')?.textContent.trim()) && document.querySelector('[contenteditable="true"]').textContent.trim() !== ${JSON.stringify(emailTemplateBefore.content)}`, 'second email template visual content');
  const emailTemplateAfter = await evaluate(`(() => ({
    name: document.querySelector('main main input')?.value,
    content: document.querySelector('[contenteditable="true"]')?.textContent.trim()
  }))()`);
  assert.notEqual(emailTemplateAfter.name, emailTemplateBefore.name);
  assert.notEqual(emailTemplateAfter.content, emailTemplateBefore.content);

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

  await navigate(`${baseUrl}/`);
  await waitUntil(`Boolean(document.querySelector('section[aria-label="Featured promotions"], section[aria-label="Featured promotion"], section[aria-label="Prem Electronics welcome"]'))`, 'mobile Banner Master storefront hero');
  await waitUntil(`document.querySelectorAll('[data-bento-tile]').length > 0`, 'mobile homepage category bento grid');
  await evaluate(`window.scrollTo({ top: 0, behavior: 'instant' })`);
  await sleep(100);
  assert.equal(await evaluate(`(() => { const tiles = document.querySelectorAll('[data-bento-tile]'); return tiles.length < 2 || Math.abs(tiles[0].getBoundingClientRect().width - tiles[1].getBoundingClientRect().width) <= 1; })()`), true);
  assert.equal(await evaluate(`Math.round(document.querySelector('section[aria-label="Featured promotions"], section[aria-label="Featured promotion"], section[aria-label="Prem Electronics welcome"]').getBoundingClientRect().width) === document.documentElement.clientWidth`), true);
  assert.equal(await evaluate(`Math.abs(document.querySelector('section[aria-label="Featured promotions"], section[aria-label="Featured promotion"], section[aria-label="Prem Electronics welcome"]').getBoundingClientRect().height - innerHeight) <= 1`), true);
  const mobileHomeOverlay = await evaluate(`(() => ({ headerPosition: getComputedStyle(document.querySelector('header')).position, heroTop: document.querySelector('section[aria-label="Featured promotions"], section[aria-label="Featured promotion"], section[aria-label="Prem Electronics welcome"]').getBoundingClientRect().top }))()`);
  assert.equal(mobileHomeOverlay.headerPosition, 'absolute', JSON.stringify(mobileHomeOverlay));
  assert.ok(Math.abs(mobileHomeOverlay.heroTop) <= 1, JSON.stringify(mobileHomeOverlay));
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), true);
  await evaluate(`document.querySelector('[data-home-bento]').scrollIntoView({ block: 'start', behavior: 'instant' })`);
  await sleep(700);
  await screenshot(bentoMobileScreenshot);
  await navigate(`${baseUrl}/admin/analytics`);
  await waitUntil(`document.querySelector('h1')?.textContent.includes('Analytics')`, 'return to admin analytics');

  await evaluate(`document.querySelector('[aria-label="Open administrator profile menu"]').click()`);
  await waitUntil(`Array.from(document.querySelectorAll('[role="menuitem"]')).some((item) => item.textContent.includes('Log out'))`, 'logout menu item');
  await evaluate(`Array.from(document.querySelectorAll('[role="menuitem"]')).find((item) => item.textContent.includes('Log out')).click()`);
  await waitUntil(`location.pathname === '/login'`, 'logout redirect');
  await evaluate(`history.back()`);
  await waitUntil(`location.pathname === '/login'`, 'protected history navigation after logout');
  await client.send('Page.navigate', { url: `${baseUrl}/admin/dashboard` });
  await waitUntil(`location.pathname === '/login'`, 'protected direct URL after logout');
  assert.deepEqual(exceptions, []);
  assert.deepEqual(failedRequests, []);

  console.log(JSON.stringify({ desktop, toggledTheme, emailTemplateSwitch: { before: emailTemplateBefore.name, after: emailTemplateAfter.name }, desktopScreenshot, mobileScreenshot, bentoDesktopScreenshot, bentoMobileScreenshot, browserExceptions: exceptions.length, serverErrors: failedRequests.length }, null, 2));
  }
} finally {
  client?.close();
  edge.kill();
  if (edge.exitCode === null) {
    await Promise.race([
      new Promise((resolve) => edge.once('exit', resolve)),
      sleep(2_000),
    ]);
  }
  await rm(profile, { recursive: true, force: true, maxRetries: 6, retryDelay: 250 });
}
