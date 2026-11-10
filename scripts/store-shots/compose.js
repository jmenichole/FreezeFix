/*
 * Regenerates the Chrome Web Store screenshots (1280x800) and promo tile (440x280) into store-assets/.
 * Usage (from repo root):  npm i --no-save playwright@1.49 && npx playwright install chromium && node scripts/store-shots/compose.js
 * Loads the real index.html with stubbed chrome.* APIs (stub.js) and demo state (seed.js).
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const ICON = 'file://' + path.join(ROOT, 'icons', 'icon128.png');
const PANEL = 'file://' + path.join(ROOT, 'index.html');
const gemBody = fs.readFileSync(__dirname + '/gemini-body.html', 'utf8');
const OUT = path.join(ROOT, 'store-assets');
fs.mkdirSync(OUT, { recursive: true });

const base = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1280px;height:800px;overflow:hidden}
body{font-family:Inter,system-ui,sans-serif;color:#fff;
 background:radial-gradient(900px 600px at 85% 20%, rgba(6,182,212,.28), transparent 60%),
            radial-gradient(800px 600px at 10% 90%, rgba(139,92,246,.35), transparent 60%),
            linear-gradient(135deg,#0a0f2c 0%,#160f3d 55%,#1d0f45 100%);}
.brand{position:absolute;left:56px;bottom:40px;display:flex;align-items:center;gap:12px;font-weight:800;font-size:22px;letter-spacing:.2px;color:#e9e5ff}
.brand img{width:40px;height:40px;border-radius:10px}
.panel{position:absolute;border-radius:18px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.12)}
.panel iframe{border:0;display:block}
.h1{font-weight:800;letter-spacing:-.5px;line-height:1.08}
.sub{color:#c9c6e8;font-size:24px;line-height:1.4;font-weight:500}
.chip{display:inline-block;font-size:14px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;padding:6px 12px;border-radius:999px}
`;

const shots = {
  'screenshot-1-before-after': `
<style>${base}
.banner{position:absolute;left:0;right:0;top:0;height:112px;display:flex;align-items:center;justify-content:center;gap:16px}
.banner .h1{font-size:44px}
.arrow{color:#67e8f9}
.win{position:absolute;left:48px;top:128px;width:700px;height:640px;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 30px 80px rgba(0,0,0,.5)}
.bar{height:38px;background:#e8eaf0;display:flex;align-items:center;gap:8px;padding:0 14px}
.dot{width:12px;height:12px;border-radius:50%}
.url{margin-left:14px;flex:1;height:24px;border-radius:12px;background:#fff;color:#5f6368;font-size:13px;display:flex;align-items:center;padding-left:12px}
.gem{padding:18px 30px;color:#1f1f1f;font-family:'Google Sans',Inter,system-ui,sans-serif;font-size:14.5px;line-height:1.6}
.gem .q{background:#f0f4f9;border-radius:18px;padding:10px 16px;margin:0 0 14px auto;width:max-content;max-width:70%;font-size:14px}
.gem .tag{font-size:12px;color:#5f6368;margin-bottom:6px;display:flex;align-items:center;gap:6px}
.gem .tag i{display:inline-block;width:16px;height:16px;border-radius:50%;background:conic-gradient(#4285f4,#9b72cb,#d96570,#4285f4)}
.gem h3{font-size:15.5px;margin:10px 0 2px}
.gem p{margin:0 0 8px}
.gem ul{margin:0 0 8px 20px}
.selblock{background:#c7defd;box-shadow:0 0 0 6px #c7defd;border-radius:2px;margin-bottom:12px}
.fade{position:absolute;left:0;right:0;bottom:0;height:90px;background:linear-gradient(transparent,#fff)}
.menu{position:absolute;left:410px;top:420px;background:#fff;border-radius:8px;box-shadow:0 8px 28px rgba(0,0,0,.28);padding:6px 0;font-size:14px;color:#202124;width:270px;font-family:Inter,sans-serif}
.menu div{padding:7px 16px}
.menu .hi{background:#e8f0fe;font-weight:700;display:flex;gap:8px;align-items:center}
.menu .hi img{width:18px;height:18px}
.menu .mut{color:#80868b}
.lab{position:absolute;top:142px}
.panel{left:800px;top:128px}
</style>
<div class="banner"><span class="h1">Highlight anything overwhelming <span class="arrow">→</span> one clear step</span></div>
<div class="win"><div class="bar"><span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span><span class="dot" style="background:#28c840"></span><span class="url">gemini.google.com/app · Guided Learning</span></div>
 <div class="gem"><div class="q">Teach me Python. I'm a total beginner.</div><div class="tag"><i></i> Gemini · Guided Learning</div>
 <div class="sel-wrap">${(() => { const i = gemBody.indexOf('<h3>Step 2'); return '<div class="selblock">' + gemBody.slice(0, i) + '</div>' + gemBody.slice(i); })()}</div></div>
 <div class="fade"></div>
 <div class="menu"><div class="mut">Copy</div><div class="mut">Search Google for "That's a…"</div><div class="hi"><img src="${ICON}">Unfreeze this</div><div class="mut">Inspect</div></div>
</div>
<span class="chip lab" style="left:64px;background:#fde68a;color:#3b2a00;top:576px;display:none">Before</span>
<div class="panel"><iframe src="${PANEL}#after" width="420" height="640"></iframe></div>
`,
  'screenshot-2-one-step': `
<style>${base}
.copy{position:absolute;left:72px;top:150px;width:600px}
.copy .h1{font-size:64px;margin-bottom:26px}
.copy .h1 em{font-style:normal;color:#67e8f9}
.pill{display:flex;gap:12px;margin-top:34px;flex-wrap:wrap}
.pill span{font-size:20px;font-weight:700;padding:10px 18px;border-radius:14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18)}
.pill .g{background:#10b981;color:#04261b;border-color:#10b981}
.panel{left:770px;top:60px}
</style>
<div class="copy"><div class="h1">One step.<br><em>Big, calm, doable.</em></div>
<div class="sub">Only the step you're on. Progress shows as dots, never "3 of 7". Too big? It splits that one step smaller, in place.</div>
<div class="pill"><span class="g">Done ✓</span><span>Too big</span><span>Skip</span></div></div>
<div class="panel"><iframe src="${PANEL}#step" width="420" height="680"></iframe></div>
<div class="brand"><img src="${ICON}">FreezeFix</div>
`,
  'screenshot-3-calm-home': `
<style>${base}
.copy{position:absolute;left:72px;top:170px;width:600px}
.copy .h1{font-size:62px;margin-bottom:26px}
.copy .h1 em{font-style:normal;color:#67e8f9}
.list{margin-top:30px;display:flex;flex-direction:column;gap:12px;font-size:22px;font-weight:600;color:#ece9ff}
.list div::before{content:'';display:inline-block;width:10px;height:10px;border-radius:50%;background:#67e8f9;margin-right:14px;vertical-align:middle}
.panel{left:800px;top:16px;width:384px;height:768px}
.panel iframe{transform:scale(.78);transform-origin:0 0}
</style>
<div class="copy"><div class="h1">A calm<br><em>home base.</em></div>
<div class="sub">Opens on just what you need. Everything else waits in "More".</div>
<div class="list"><div>Unfreeze box</div><div>Up next + focus timer</div><div>Brain dump</div></div></div>
<div class="panel"><iframe src="${PANEL}#home" width="492" height="985"></iframe></div>
<div class="brand"><img src="${ICON}">FreezeFix</div>
`
};

(async () => {
  const b = await chromium.launch();
  for (const [name, htmlBody] of Object.entries(shots)) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, bypassCSP: true, deviceScaleFactor: 1 });
    await ctx.addInitScript({ path: __dirname + '/stub.js' });
    await ctx.addInitScript({ path: __dirname + '/seed.js' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const p = await ctx.newPage();
    const file = path.join(require('os').tmpdir(), `ff-${name}.html`);
    fs.writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8"></head><body>${htmlBody}</body></html>`);
    await p.goto('file://' + file); await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/${name}.png` });
    await ctx.close();
  }
  // promo tile 440x280
  const ctx = await b.newContext({ viewport: { width: 440, height: 280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const promo = `<!doctype html><html><head><meta charset="utf-8"><style>${base}
  html,body{width:440px;height:280px}
  .wrap{position:absolute;inset:0;padding:30px 30px;display:flex;flex-direction:column;justify-content:center}
  .top{display:flex;align-items:center;gap:12px;margin-bottom:18px}
  .top img{width:52px;height:52px;border-radius:12px}
  .top span{font-size:30px;font-weight:800}
  .h1{font-size:27px}
  .h1 em{font-style:normal;color:#67e8f9}
  .dots{display:flex;gap:7px;margin-top:18px}
  .dots i{width:11px;height:11px;border-radius:50%;border:2px solid #8b8fb8}
  .dots i.d{background:#10b981;border-color:#10b981}.dots i.c{width:24px;border-radius:6px;background:#06b6d4;border-color:#06b6d4}
  </style></head><body><div class="wrap"><div class="top"><img src="${ICON}"><span>FreezeFix</span></div>
  <div class="h1">Highlight anything overwhelming <em>→ one clear step at a time.</em></div>
  <div class="dots"><i class="d"></i><i class="c"></i><i></i><i></i><i></i></div></div></body></html>`;
  const promoFile = path.join(require('os').tmpdir(), 'ff-promo.html');
  fs.writeFileSync(promoFile, promo);
  await p.goto('file://' + promoFile); await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/promo-440x280.png` });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
