import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

// Small DOM fixture for the site's behavior tests; browser layout is checked separately.
class Element {
  constructor(tag = 'div') {
    this.tagName = tag; this.children = []; this.attributes = {}; this.dataset = {};
    this.listeners = {}; this.style = { setProperty() {}, removeProperty() {} };
    const classes = new Set();
    this.classList = { add: (...names) => names.forEach(n => classes.add(n)), remove: (...names) => names.forEach(n => classes.delete(n)), contains: n => classes.has(n), toggle: (n, enabled = !classes.has(n)) => { enabled ? classes.add(n) : classes.delete(n); return enabled; } };
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] ?? null; }
  removeAttribute(k) { delete this.attributes[k]; }
  set href(v) { this.attributes.href = v; }
  get href() { return this.attributes.href; }
  append(...items) { this.children.push(...items); }
  prepend(...items) { this.children.unshift(...items); }
  replaceChildren(...items) { this.children = items.flatMap(i => i.tagName === 'fragment' ? i.children : [i]); }
  get childNodes() { return this.children; }
  matches(selector) { return selector.split(',').map(s => s.trim()).includes(this.tagName); }
  querySelectorAll(selector) { return this.children.flatMap(c => [...(c.matches(selector) ? [c] : []), ...c.querySelectorAll(selector)]); }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  contains(el) { return el === this || this.children.some(c => c.contains(el)); }
  focus() { this.focused = true; }
}

function setup({ href = 'https://example.com/portfolio/index.html?lang=zh_hant', base = href, reduced = false, links = [] } = {}) {
  const body = new Element('body'), header = new Element('header'), nav = new Element('nav'), toggle = new Element('button');
  header.append(nav, toggle);
  const main = new Element('main'), panel = new Element(), skip = new Element('a');
  const nodes = { '[data-header]': header, '[data-nav]': nav, '[data-nav-toggle]': toggle, '[data-contact-panel]': panel, '.skip-link': skip, main };
  const events = {}, windowEvents = {}, mediaEvents = {}, timers = [];
  const document = {
    body, baseURI: base, documentElement: { lang: 'en', scrollHeight: 2000 }, hidden: false,
    querySelector: s => nodes[s] || null,
    querySelectorAll: s => s === 'a[href]' ? links : [],
    createElement: tag => new Element(tag), createDocumentFragment: () => new Element('fragment'),
    addEventListener: (name, fn) => { events[name] = fn; }
  };
  const window = { location: new URL(href), innerHeight: 800, scrollY: 0,
    matchMedia: query => ({ matches: query.includes('reduced-motion') && reduced, addEventListener: (n, fn) => { mediaEvents[query] = fn; } }),
    setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout() {}, setInterval: fn => { timers.push(fn); return timers.length; }, clearInterval() {},
    addEventListener: (name, fn) => { windowEvents[name] = fn; }, dispatchEvent() {}, history: { replaceState() {} }
  };
  const context = vm.createContext({ document, window, URL, URLSearchParams, console, localStorage: { getItem: () => 'en', setItem() {} }, fetch: () => new Promise(() => {}), CustomEvent: class {}, Event: class {}, FormData: class { get(k) { return {first_name:'Test',last_name:'Visitor',email:'visitor@example.com',message:'Hello & thank you'}[k]; } } });
  vm.runInContext(readFileSync(new URL('../script.js', import.meta.url), 'utf8'), context);
  vm.runInContext(readFileSync(new URL('../media.js', import.meta.url), 'utf8'), context);
  return { context, document, window, nodes, toggle, body, panel, events, mediaEvents, timers, run: source => vm.runInContext(source, context) };
}

test('language follows hydrated CTA links while preserving external URLs and fragments', () => {
  const links = ['bio.html', 'https://example.com/portfolio/media.html', 'https://youtube.com/watch?v=test', '#contact'].map(href => { const a = new Element('a'); a.href = href; return a; });
  const f = setup({ links }); f.run('updateLanguageLinks("zh_hant")');
  assert.equal(links[0].href, 'https://example.com/portfolio/bio.html?lang=zh_hant');
  assert.equal(links[1].href, 'https://example.com/portfolio/media.html?lang=zh_hant');
  assert.equal(links[2].href, 'https://youtube.com/watch?v=test');
  assert.equal(links[3].href, '#contact');
});

test('legacy pages resolve navigation against their base element', () => {
  const a = new Element('a'); a.href = 'bio.html';
  const f = setup({ href: 'https://example.com/portfolio/projects/ring-ring.html', base: 'https://example.com/portfolio/', links: [a] });
  f.run('updateLanguageLinks("en")');
  assert.equal(a.href, 'https://example.com/portfolio/bio.html?lang=en');
  assert.equal(f.nodes['.skip-link'].href, '/portfolio/projects/ring-ring.html#main-content');
});

test('language switch preserves current project; other project links retain their own slug', () => {
  const language = new Element('a'); language.href = 'project.html?lang=en'; language.dataset.language = 'en';
  const other = new Element('a'); other.href = 'project.html?slug=another';
  const f = setup({ href:'https://example.com/portfolio/project.html?slug=ring-ring&lang=zh_hant', links:[language,other] });
  f.run('updateLanguageLinks("zh_hant")');
  assert.equal(new URL(language.href).searchParams.get('slug'), 'ring-ring');
  assert.equal(new URL(language.href).searchParams.get('lang'), 'en');
  assert.equal(new URL(other.href).searchParams.get('slug'), 'another');
});

test('mobile menu closes on Escape, restores focus, and resets at desktop breakpoint', () => {
  const f = setup(); f.toggle.listeners.click();
  assert.equal(f.toggle.getAttribute('aria-expanded'), 'true');
  f.events.keydown({key:'Escape'});
  assert.equal(f.toggle.getAttribute('aria-expanded'), 'false'); assert.equal(f.toggle.focused,true);
  f.toggle.listeners.click(); f.mediaEvents['(min-width: 861px)']();
  assert.equal(f.body.classList.contains('nav-open'),false);
});

test('mobile menu closes when keyboard focus leaves the header', () => {
  const f=setup(); f.toggle.listeners.click(); f.events.focusin({target:new Element('input')});
  assert.equal(f.toggle.getAttribute('aria-expanded'),'false');
});

test('media language honors URL even when site fetch has not finished', () => {
  assert.equal(setup().run('getMediaLanguage()'),'zh_hant');
});

test('YouTube watch, short, embed and live links produce thumbnails; lookalike hosts do not', () => {
  const f=setup();
  for(const url of ['https://youtu.be/EyD8WC0Vf08','https://www.youtube.com/watch?v=EyD8WC0Vf08','https://youtube.com/shorts/EyD8WC0Vf08','https://youtube.com/embed/EyD8WC0Vf08','https://youtube.com/live/EyD8WC0Vf08']) {
    assert.equal(f.run(`getYoutubeThumbnail(${JSON.stringify(url)})`),'https://img.youtube.com/vi/EyD8WC0Vf08/hqdefault.jpg');
  }
  assert.equal(f.run('getYoutubeThumbnail("https://notyoutube.com/watch?v=EyD8WC0Vf08")'),'');
  assert.equal(f.run('getYoutubeThumbnail("invalid")'),'');
});

test('unsafe link protocols are rejected and invalid project slugs never become links', () => {
  const f=setup();
  assert.equal(f.run('safeUrl("javascript:alert(1)")'),'#');
  assert.equal(f.run('mediaSafeUrl("data:text/html,bad")'),'#');
  assert.equal(f.run('getProjectUrl("../secret")'),'#');
});

test('contact form keeps all fields, labels, validation and encoded email delivery', () => {
  const f=setup();
  f.run('renderContact({email:"booking@example.com",form_note:"Opens your email app"})');
  const form=f.panel.children.find(c=>c.tagName==='form');
  assert.equal(form.querySelectorAll('input, textarea').length,4);
  assert.equal(form.children[0].className,'contact-form-note');
  form.reportValidity=()=>false; let prevented=false;
  form.listeners.submit({preventDefault(){prevented=true;}});
  assert.equal(prevented,true); assert.equal(typeof f.window.location,'object');
  form.reportValidity=()=>true; form.listeners.submit({preventDefault(){}});
  assert.match(f.window.location.href,/^mailto:booking@example.com\?subject=/);
  assert.match(decodeURIComponent(f.window.location.href),/Hello & thank you/);
});

test('unconfigured contact form disables inputs and shows visitor-facing help', () => {
  const f=setup(); f.run('renderContact({notice:"Add email in CMS"})');
  const form=f.panel.children.find(c=>c.tagName==='form');
  assert.ok(form.querySelectorAll('input, textarea').every(c=>c.disabled));
  assert.ok(form.children.find(c=>c.tagName==='button').disabled);
  assert.match(form.children[0].textContent,/temporarily unavailable/);
});

test('portrait focal points remain clamped', () => {
  const f=setup(); assert.equal(f.run('getImageFocus(-15)'),0); assert.equal(f.run('getImageFocus(150)'),100); assert.equal(f.run('getImageFocus("bad")'),50);
});

test('alternate CMS project addresses resolve to the shared bilingual slugs', () => {
  const f=setup();
  assert.equal(f.run('getCanonicalProjectSlug("hss")'),'pas-ensemble');
  assert.equal(f.run('getCanonicalProjectSlug("treaal")'),'treeal');
  assert.equal(f.run('getCanonicalProjectSlug("ring-ring")'),'ring-ring');
});

test('failed content offers a visible recovery action', () => {
  const f=setup(); f.run('showContentError()');
  const notice=f.nodes.main.children[0];
  assert.equal(notice.getAttribute('role'),'status');
  assert.equal(notice.children[1].tagName,'button');
  assert.ok(notice.children[1].listeners.click);
});

test('reduced motion does not load or play hero clips', () => {
  const f=setup({reduced:true});
  const video=new Element('video'); video.pause=()=>{}; video.load=()=>{throw Error('video loaded');};
  const query=f.document.querySelectorAll;
  f.document.querySelectorAll=s=>s==='[data-hero-video]'?[video]:query(s);
  f.run('hydrateSiteContent({hero:{video_clips:["assets/test.mp4"]}},"en")');
  assert.equal(video.hidden,true);
});

test('pause before delayed autoplay prevents playback; resume restores it', async () => {
  const f=setup(); const video=new Element('video'), button=new Element('button');
  video.pause=()=>{video.paused=true;}; video.load=()=>{};
  video.play=()=>{video.paused=false; return Promise.resolve();};
  f.nodes['[data-motion-toggle]']=button;
  const query=f.document.querySelectorAll;
  f.document.querySelectorAll=s=>s==='[data-hero-video]'?[video]:query(s);
  f.run('hydrateSiteContent({hero:{video_clips:["assets/test.mp4"]}},"en")');
  button.onclick(); f.timers[0]();
  assert.equal(video.paused,true);
  button.onclick(); await Promise.resolve();
  assert.equal(video.paused,false);
  assert.equal(button.textContent,'Pause background video');
  f.document.hidden=true; f.document.onvisibilitychange();
  assert.equal(video.paused,true);
});
