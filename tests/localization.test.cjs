const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {chromium} = require('playwright');
const {createServer} = require('./server.cjs');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sandbox = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'js/locales/zh-CN.js'), 'utf8'), sandbox);
const locale = sandbox.window.DS3Locales['zh-CN'];
let server, browser, base;
const cache = new Map();

before(async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    base = 'http://127.0.0.1:' + server.address().port;
    const proxy = process.env.PLAYWRIGHT_PROXY;
    browser = await chromium.launch({
        headless:true,
        channel:process.env.PLAYWRIGHT_CHANNEL || undefined,
        proxy:proxy ? {server:proxy, bypass:'127.0.0.1'} : undefined
    });
});

after(async () => {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
});

async function open(t, {lang='', browserLocale='en-US', seed, storageBlocked=false, viewport, localeStub} = {}) {
    const context = await browser.newContext({locale:browserLocale, viewport:viewport || {width:1440,height:1000}});
    context.setDefaultTimeout(15000);
    t.after(() => context.close());
    await context.route(/https?:\/\//, async route => {
        const url = route.request().url();
        if (url.startsWith(base)) return route.continue();
        // Do not send analytics from tests; cache the app's pinned CDN dependencies.
        if (/google-analytics|googletagmanager/.test(url)) return route.fulfill({status:204,body:''});
        if (!cache.has(url)) cache.set(url, (async () => {
            const response = await route.fetch({timeout:30000});
            assert.equal(response.ok(), true, 'CDN dependency failed: ' + url);
            return {status:response.status(), headers:response.headers(), body:await response.body()};
        })());
        await route.fulfill(await cache.get(url));
    });
    if (seed) await context.addInitScript(value => localStorage.setItem('darksouls3_language', value), seed);
    if (localeStub) await context.route('**/js/locales/zh-CN.js', route => route.fulfill({contentType:'application/javascript',body:localeStub}));
    if (storageBlocked) await context.addInitScript(() => Object.defineProperty(window, 'localStorage', {get(){throw new DOMException('Blocked','SecurityError');}}));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/' + (lang ? '?lang=' + encodeURIComponent(lang) : ''), {waitUntil:'load'});
    await ready(page);
    return {page,context,errors};
}

async function ready(page) {
    await page.waitForFunction(() => document.querySelectorAll('.checkbox input').length === 1953 && document.querySelector('#playthrough_overall_total').textContent !== '');
}

async function profile(page) {
    return page.evaluate(() => $.jStorage.get('darksouls3_profiles'));
}

async function switchTo(page, language) {
    await Promise.all([
        page.waitForURL(url => url.searchParams.get('lang') === language),
        page.selectOption('#language', language)
    ]);
    await ready(page);
}

test('all 1,953 checklist IDs have Chinese text and retain original links and safe markup', async t => {
    assert.equal(Object.keys(locale.entries).length, 1953);
    const {page,errors} = await open(t, {lang:'zh-CN'});
    const problems = await page.evaluate(({html,entries}) => {
        const original = new DOMParser().parseFromString(html, 'text/html');
        const problems = [];
        const hrefs = element => [...element.querySelectorAll('a')].map(a=>a.getAttribute('href')).sort();
        for (const item of original.querySelectorAll('[data-id]')) {
            const id = item.dataset.id;
            const content = entries[id];
            if (!content || !/[\u4e00-\u9fff]/.test(content)) {problems.push(id + ': no Chinese text');continue;}
            const translated = new DOMParser().parseFromString(content, 'text/html').body;
            item.querySelectorAll('ul').forEach(ul => ul.remove());
            if (JSON.stringify(hrefs(item)) !== JSON.stringify(hrefs(translated))) problems.push(id + ': changed links');
            for (const el of translated.querySelectorAll('*')) {
                if (!['A','STRONG','EM','BR'].includes(el.tagName)) problems.push(id + ': unexpected markup');
                for (const attr of el.attributes) {
                    if (attr.name === 'onclick') {
                        if (![...item.querySelectorAll('a')].some(a=>a.getAttribute('onclick')===attr.value)) problems.push(id + ': changed inline handler');
                    } else if (!['href','class','data-toggle'].includes(attr.name)) problems.push(id + ': unexpected attribute');
                }
            }
            if (!document.querySelector('input[id="' + id + '"]')) problems.push(id + ': missing checkbox');
        }
        return problems;
    }, {html,entries:locale.entries});
    assert.deepEqual(problems, []);
    assert.deepEqual(errors, []);
});

test('Chinese language detection translates UI, metadata, placeholders and accessible labels', async t => {
    const {page,errors} = await open(t, {browserLocale:'zh-CN'});
    assert.equal(await page.getAttribute('html','lang'), 'zh-CN');
    assert.equal(await page.title(), '黑暗之魂 3 全收集清单');
    assert.equal(await page.locator('label[for="language"]').textContent(), '语言');
    assert.equal(await page.getAttribute('#language','aria-label'), '选择语言');
    assert.equal(await page.getAttribute('#playthrough_search','placeholder'), '输入关键词筛选清单……');
    assert.match(await page.locator('meta[name="description"]').getAttribute('content'), /中文全收集清单/);
    assert.deepEqual(errors, []);
});

test('explicit language overrides saved preference and unsupported preferences fall back', async t => {
    const {page} = await open(t, {lang:'en', seed:'zh-CN', browserLocale:'zh-CN'});
    assert.equal(await page.getAttribute('html','lang'), 'en-US');
    assert.equal(await page.title(), 'Dark Souls 3 Cheat Sheet');
    assert.match(await page.locator('[data-id="playthrough_17_1"]').textContent(), /From the start/);
    const other = await open(t, {lang:'invalid', seed:'invalid', browserLocale:'fr-FR'});
    assert.equal(await other.page.getAttribute('html','lang'), 'en-US');
});

test('saved preference works on a fresh URL and storage denial does not break localization', async t => {
    const saved = await open(t, {seed:'zh-CN'});
    assert.equal(await saved.page.getAttribute('html','lang'), 'zh-CN');
    const blocked = await open(t, {lang:'zh-CN', storageBlocked:true});
    assert.equal(await blocked.page.title(), '黑暗之魂 3 全收集清单');
    assert.deepEqual(blocked.errors, []);
});

test('missing dictionary keys fall back to working English content', async t => {
    const {page,errors} = await open(t, {lang:'zh-CN',localeStub:'window.DS3Locales = {"zh-CN": {text:{}, entries:{}}};'});
    assert.equal(await page.title(), 'Dark Souls 3 Cheat Sheet');
    assert.match(await page.locator('[data-id="playthrough_17_1"]').textContent(), /From the start/);
    await page.check('#playthrough_17_1');
    assert.equal(await page.locator('#playthrough_17_1').isChecked(), true);
    assert.deepEqual(errors, []);
});

test('Chinese search indexes translated checklist content', async t => {
    const {page} = await open(t, {lang:'zh-CN'});
    await page.fill('#playthrough_search', '螺旋剑');
    await page.press('#playthrough_search', 'ArrowRight');
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-id="playthrough_17_1"]')).display === 'none');
    assert.equal(await page.locator('[data-id="playthrough_17_7"]').isVisible(), true);
    assert.equal(await page.locator('[data-id="playthrough_17_1"]').isVisible(), false);
    await page.fill('#playthrough_search', '');
    await page.press('#playthrough_search', 'ArrowRight');
    assert.equal(await page.locator('[data-id="playthrough_17_1"]').isVisible(), true);
});

test('language changes preserve profiles, checked items, filters, collapsed sections, current tab and theme', async t => {
    const {page} = await open(t, {lang:'zh-CN'});
    await page.check('#playthrough_17_1');
    await page.locator('a[href="#Cemetery_of_Ash_col"]').click();
    await page.evaluate(() => $('[data-item-toggle="f_boss"]').click());
    await page.locator('.navbar-nav a[href="#tabOptions"]').click();
    await page.selectOption('#themes','Darkly');
    const before = await profile(page);
    const style = await page.evaluate(() => $.jStorage.get('style'));
    await switchTo(page,'en');
    assert.deepEqual(await profile(page), before);
    assert.equal(await page.evaluate(() => $.jStorage.get('style')), style);
    assert.equal(await page.locator('#playthrough_17_1').isChecked(), true);
    assert.equal(await page.locator('#tabOptions').isVisible(), true);
    assert.equal(await page.evaluate(() => localStorage.getItem('darksouls3_language')), 'en');
    await switchTo(page,'zh-CN');
    assert.deepEqual(await profile(page), before);
    assert.equal(await page.locator('#Cemetery_of_Ash_col').getAttribute('class'), 'collapse');
});

test('dynamic profile dialogs are translated while user profile names retain their original text', async t => {
    const {page} = await open(t, {lang:'zh-CN'});
    await page.locator('.navbar-nav a[href="#tabOptions"]').click();
    await page.click('#profileAdd');
    assert.equal(await page.locator('#profileModalTitle').textContent(), '添加档案');
    await page.fill('#profileModalName','Playthrough');
    await page.click('#profileModalAdd');
    assert.equal(await page.locator('#profiles option:checked').textContent(), 'Playthrough');
    await switchTo(page,'en');
    assert.equal(await page.locator('#profiles option:checked').textContent(), 'Playthrough');
    await page.locator('.navbar-nav a[href="#tabOptions"]').click();
    await page.click('#profileEdit');
    assert.equal(await page.locator('#profileModalTitle').textContent(), 'Edit Profile');
});

test('completion labels and section controls use the selected language', async t => {
    const {page} = await open(t, {lang:'zh-CN'});
    await page.locator('.navbar-nav a[href="#tabMisc"]').click();
    await page.evaluate(() => $('#Pickle_Pee_Pump-a-Rum_Crow_col input[type="checkbox"]').each(function(){this.click();}));
    assert.equal(await page.locator('#crow_overall_total').textContent(), '已完成');
    assert.equal(await page.locator('#Pickle_Pee_Pump-a-Rum_Crow .section_btn-group button').first().textContent(), '反选');
    await switchTo(page,'en');
    assert.equal(await page.locator('#crow_overall_total').textContent(), 'DONE');
});

test('profile backups import and export across languages without changing checklist IDs', async t => {
    const {page} = await open(t, {lang:'zh-CN'});
    await page.check('#playthrough_17_1');
    await page.locator('.navbar-nav a[href="#tabOptions"]').click();
    await page.click('#profileExportText');
    const backup = await page.inputValue('#profileText');
    assert.equal(JSON.parse(backup).darksouls3_profiles['Default Profile'].checklistData.playthrough_17_1, true);
    await switchTo(page,'en');
    const loaded = page.waitForEvent('domcontentloaded');
    await page.setInputFiles('#fileInput',{name:'profiles.json',mimeType:'application/json',buffer:Buffer.from(backup)});
    await loaded;
    await ready(page);
    assert.equal(await page.getAttribute('html','lang'), 'en-US');
    assert.equal(await page.locator('#playthrough_17_1').isChecked(), true);
    assert.equal((await profile(page)).current, 'Default Profile');
});

test('confirmation and import error messages are translated', async t => {
    const {page} = await open(t, {lang:'zh-CN'});
    await page.locator('.navbar-nav a[href="#tabOptions"]').click();
    const next = page.waitForEvent('dialog');
    await page.locator('[id="profileNG+"]').click();
    const click = page.locator('[id="NG+ModalYes"]').click();
    const dialog = await next;
    assert.match(dialog.message(), /确定要开始下一周目/);
    await dialog.dismiss();
    await click;
    await page.locator('[id="NG+Modal"] [data-dismiss="modal"]').last().click();
    const invalid = page.waitForEvent('dialog');
    await page.setInputFiles('#fileInput',{name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{broken')});
    const error = await invalid;
    assert.equal(error.message(), '无法导入档案数据，请检查 JSON 文件内容。');
    await error.dismiss();
});

test('mobile navigation exposes the language selector without horizontal overflow', async t => {
    const {page} = await open(t, {lang:'zh-CN',viewport:{width:390,height:844}});
    await page.click('.navbar-toggle');
    await page.waitForFunction(() => !document.querySelector('#nav-collapse').classList.contains('collapsing'));
    assert.equal(await page.locator('#language').isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
});
