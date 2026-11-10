/*
 * FreezeFix — Unfreeze UI (one step at a time)
 * Copyright © 2026 jmenichole (J Chapman). All rights reserved.
 * Author: jmenichole <j.chapman7@yahoo.com>
 *
 * Paste / highlight / scan a wall of text → gist + ONE current step.
 * Text is sent only to the user's own AI provider, only when they click.
 * The plan (not the source text) is kept in localStorage so the panel reopens where they left off.
 */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const SESSION_KEY = 'freezefix_unfreeze_session';
    const MAX_CHARS = UnfreezeCore.MAX_INPUT_CHARS;

    const elCard   = document.getElementById('unfreeze-card');
    const elWrap   = document.getElementById('unfreeze-input-wrap');
    const elInput  = document.getElementById('unfreeze-input');
    const elGo     = document.getElementById('btn-unfreeze-go');
    const elScan   = document.getElementById('btn-scan-screen');
    const elResult = document.getElementById('unfreeze-result');
    if (!elCard || !elInput || !elResult) return;

    const App = () => window.FreezeFixApp || {};
    const esc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(String(s ?? '')) : String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
    const toast = (m) => { if (App().showToast) App().showToast(m); };
    const hasKey = () => { const k = AIHelper.getKeys(); return !!(k.gemini || k.groq); };

    let session = null;     // { gist, skip, steps:[{id,text,minutes,status}], currentId, mode, showAll, source }
    let busy = false;
    let lastIncomingTs = 0;
    let idSeq = Date.now();
    const newId = () => 's' + (idSeq++).toString(36);

    // ── Session persistence (plan only, local only) ───────────────
    function save() {
        try {
            if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            else localStorage.removeItem(SESSION_KEY);
        } catch (_) { /* ignore quota */ }
    }
    function load() {
        try {
            const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
            if (s && Array.isArray(s.steps) && s.steps.length) return s;
        } catch (_) { /* ignore */ }
        return null;
    }

    function makeSession(plan, mode, source) {
        const steps = plan.steps.map(st => ({ id: newId(), text: st.text, minutes: st.minutes, status: 'todo' }));
        return { gist: plan.gist, skip: plan.skip || '', steps, currentId: steps[0].id, mode, showAll: false, source: source || 'paste' };
    }

    function currentStep() {
        if (!session) return null;
        const byId = session.steps.find(s => s.id === session.currentId && s.status === 'todo');
        return byId || session.steps.find(s => s.status === 'todo') || null;
    }

    // ── Views ─────────────────────────────────────────────────────
    function showInput(focus) {
        elWrap.classList.remove('hidden');
        elResult.classList.add('hidden');
        elResult.innerHTML = '';
        if (focus) elInput.focus();
    }

    function showLoading(msg) {
        elWrap.classList.add('hidden');
        elResult.classList.remove('hidden');
        elResult.innerHTML = `
            <div class="uf-loading" role="status">
                <span class="uf-loading-dot" aria-hidden="true"></span>
                <span>${esc(msg || 'Reading it… making it smaller.')}</span>
            </div>`;
    }

    function showError(message, retryFn) {
        elWrap.classList.add('hidden');
        elResult.classList.remove('hidden');
        elResult.innerHTML = `
            <div class="uf-error" role="alert">
                <p class="uf-error-title">That didn't come through this time.</p>
                <p class="uf-error-text">${esc(message)}</p>
                <div class="uf-error-actions">
                    ${retryFn ? '<button type="button" class="btn btn-primary btn-sm" data-uf="retry">Try again</button>' : ''}
                    <button type="button" class="btn btn-ghost btn-sm" data-uf="offline">Use quick offline steps</button>
                    <button type="button" class="btn btn-ghost btn-sm" data-uf="back">Back</button>
                </div>
            </div>`;
        const btnRetry = elResult.querySelector('[data-uf="retry"]');
        if (btnRetry) { btnRetry.onclick = retryFn; btnRetry.focus(); }
        elResult.querySelector('[data-uf="offline"]').onclick = () => {
            const text = elInput.value;
            if (!text.trim()) { showInput(true); return; }
            session = makeSession(UnfreezeCore.offlineUnfreeze(text), 'offline', 'paste');
            save(); render(true);
        };
        elResult.querySelector('[data-uf="back"]').onclick = () => showInput(true);
    }

    function friendlyError(err) {
        const m = (err && err.message) || '';
        if (/AUTH|401|403/.test(m)) return 'Your AI key was turned down. It may be mistyped or expired. You can check it in ⚙️ Settings.';
        if (/TIMEOUT/.test(m)) return 'The AI took too long to answer. It usually works on a second try.';
        if (/429/.test(m)) return 'The AI provider is busy or the free limit was reached. Give it a minute.';
        if (/BAD_JSON/.test(m)) return 'The AI answered in a jumbled way twice.';
        if (/EMPTY_TEXT/.test(m)) return 'There was no text to work with.';
        return 'Something got in the way while talking to the AI.';
    }

    function dotsHtml() {
        const cur = currentStep();
        return session.steps.map(s => {
            const state = s.status === 'done' ? 'done' : s.status === 'skipped' ? 'skipped' : (cur && s.id === cur.id ? 'current' : 'todo');
            const label = { done: 'done', skipped: 'skipped', current: 'current step', todo: 'not yet' }[state];
            return `<span class="uf-dot uf-dot-${state}" role="listitem" aria-label="${label}"></span>`;
        }).join('');
    }

    function allStepsHtml() {
        const cur = currentStep();
        return session.steps.map(s => {
            const isCur = cur && s.id === cur.id;
            const mark = s.status === 'done' ? '✓' : s.status === 'skipped' ? '↷' : (isCur ? '▸' : '·');
            const cls = `uf-all-item uf-all-${s.status}${isCur ? ' uf-all-current' : ''}`;
            const inner = `<span class="uf-all-mark" aria-hidden="true">${mark}</span><span class="uf-all-text">${esc(s.text)}</span><span class="uf-all-min">${s.minutes}m</span>`;
            return s.status === 'todo' && !isCur
                ? `<li class="${cls}"><button type="button" class="uf-all-jump" data-jump="${s.id}" title="Do this one now">${inner}</button></li>`
                : `<li class="${cls}"${isCur ? ' aria-current="step"' : ''}>${inner}</li>`;
        }).join('');
    }

    function render(focusStep) {
        if (!session) { showInput(false); return; }
        elWrap.classList.add('hidden');
        elResult.classList.remove('hidden');
        const cur = currentStep();
        const remaining = session.steps.filter(s => s.status === 'todo');
        const skipped = session.steps.filter(s => s.status === 'skipped');

        const offlineBanner = session.mode === 'offline' && !hasKey() ? `
            <div class="uf-offline">
                <span>Quick offline steps. A free Groq or Gemini key gives much smarter ones.</span>
                <button type="button" class="btn btn-ghost btn-xs" data-uf="addkey">Add a free key</button>
            </div>` : '';

        const head = `
            <div class="uf-head">
                <span class="uf-badge">🧊 Unfrozen${session.mode === 'offline' ? ' · offline' : ''}</span>
                <button type="button" class="uf-new" data-uf="new" title="Start over with new text">✕ New</button>
            </div>
            <p class="uf-gist">${esc(session.gist)}</p>
            <div class="uf-dots" role="list" aria-label="Progress">${dotsHtml()}</div>`;

        let body;
        if (cur) {
            body = `
                <div class="uf-step-card">
                    <p class="uf-step-label">Just this:</p>
                    <p id="uf-step-text" class="uf-step-text" tabindex="-1">${esc(cur.text)}</p>
                    <p class="uf-step-meta">
                        <span>about ${cur.minutes} min</span>
                        <button type="button" class="uf-link" data-uf="timer" title="Start a ${cur.minutes}-minute focus timer">⏱ start timer</button>
                    </p>
                    <div class="uf-actions">
                        <button type="button" class="btn uf-done" data-uf="done" title="Done (D)">Done ✓</button>
                        <button type="button" class="btn uf-big" data-uf="big" title="Split this step smaller (B)">Too big</button>
                        <button type="button" class="btn uf-skipbtn" data-uf="skip" title="Skip for now (S)">Skip</button>
                    </div>
                </div>`;
        } else {
            body = `
                <div class="uf-step-card uf-finished">
                    <p id="uf-step-text" class="uf-step-text" tabindex="-1">That's all of it. Nice work.</p>
                    <div class="uf-actions">
                        ${skipped.length ? '<button type="button" class="btn uf-big" data-uf="revisit">Back to skipped steps</button>' : ''}
                        <button type="button" class="btn uf-done" data-uf="new">Unfreeze something else</button>
                    </div>
                </div>`;
        }

        const foot = `
            <div class="uf-foot">
                <button type="button" class="uf-toggle" data-uf="toggle" aria-expanded="${session.showAll ? 'true' : 'false'}" aria-controls="uf-all-list">${session.showAll ? 'Hide steps' : 'See all steps'}</button>
                ${remaining.length ? '<button type="button" class="uf-link" data-uf="addtasks" title="Save the steps left to your task list">+ Add to my tasks</button>' : ''}
            </div>
            <ol id="uf-all-list" class="uf-all${session.showAll ? '' : ' hidden'}">${allStepsHtml()}</ol>
            ${session.skip ? `<p class="uf-skip"><strong>Safe to ignore for now:</strong> ${esc(session.skip)}</p>` : ''}
            ${offlineBanner}`;

        elResult.innerHTML = head + body + foot;
        wire();
        if (focusStep) {
            const t = document.getElementById('uf-step-text');
            if (t) t.focus({ preventScroll: false });
        }
        save();
    }

    function wire() {
        const on = (key, fn) => elResult.querySelectorAll(`[data-uf="${key}"]`).forEach(b => { b.onclick = fn; });
        on('new', () => { session = null; save(); elInput.value = ''; showInput(true); });
        on('done', () => markCurrent('done'));
        on('skip', () => markCurrent('skipped'));
        on('big', splitCurrent);
        on('toggle', () => { session.showAll = !session.showAll; render(false); const t = elResult.querySelector('[data-uf="toggle"]'); if (t) t.focus(); });
        on('timer', () => { const c = currentStep(); if (c && App().startTimerFor) { App().startTimerFor(c.minutes); toast(`⏱ ${c.minutes}-minute timer started`); } });
        on('addtasks', addToTasks);
        on('addkey', () => { if (App().openSettings) App().openSettings(); });
        on('revisit', () => {
            session.steps.forEach(s => { if (s.status === 'skipped') s.status = 'todo'; });
            const first = session.steps.find(s => s.status === 'todo');
            session.currentId = first ? first.id : null;
            render(true);
        });
        elResult.querySelectorAll('[data-jump]').forEach(b => {
            b.onclick = () => { session.currentId = b.dataset.jump; render(true); };
        });
    }

    function markCurrent(status) {
        const cur = currentStep();
        if (!cur) return;
        cur.status = status;
        const next = session.steps.find(s => s.status === 'todo');
        session.currentId = next ? next.id : null;
        if (status === 'done' && App().playDopamineChime) App().playDopamineChime();
        render(true);
    }

    async function splitCurrent() {
        const cur = currentStep();
        if (!cur || busy) return;
        busy = true;
        const btn = elResult.querySelector('[data-uf="big"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Splitting…'; }
        let parts;
        try {
            parts = await AIHelper.splitStep(cur.text, session.gist);
        } catch (_) {
            parts = UnfreezeCore.offlineSplit(cur.text);
        }
        busy = false;
        const idx = session.steps.findIndex(s => s.id === cur.id);
        const fresh = parts.map(p => ({ id: newId(), text: p.text, minutes: p.minutes, status: 'todo' }));
        session.steps.splice(idx, 1, ...fresh);
        session.currentId = fresh[0].id;
        render(true);
    }

    function addToTasks() {
        if (!session || typeof TaskManager === 'undefined') return;
        const remaining = session.steps.filter(s => s.status === 'todo');
        remaining.forEach(s => TaskManager.create({
            name: s.text,
            duration: s.minutes,
            category: 'work',
            priority: 2,
            energy: 'low',
            notes: session.gist
        }));
        if (App().renderAll) App().renderAll();
        toast(remaining.length === 1 ? 'Added the last step to your tasks 📋' : `Added ${remaining.length} steps to your tasks 📋`);
    }

    // ── Running an unfreeze ───────────────────────────────────────
    async function runUnfreeze(rawText, source) {
        const text = UnfreezeCore.cleanInput(rawText);
        if (!text) {
            showInput(true);
            elInput.setAttribute('placeholder', 'Paste something here first, or highlight text on a page and right-click → Unfreeze this');
            return;
        }
        if (busy) return;
        if (!hasKey()) {
            session = makeSession(UnfreezeCore.offlineUnfreeze(text), 'offline', source);
            render(true);
            return;
        }
        busy = true;
        showLoading();
        try {
            const plan = await AIHelper.unfreezeText(text);
            session = makeSession(plan, 'ai', source);
            busy = false;
            render(true);
        } catch (err) {
            busy = false;
            console.warn('Unfreeze failed:', err && err.message);
            showError(friendlyError(err), () => runUnfreeze(text, source));
        }
    }

    // ── Scan this page: read TEXT first, screenshot only as fallback ──
    const RESTRICTED = /^(chrome|chrome-extension|edge|about|view-source|devtools|chrome-search):/i;

    function pageTextExtractor(maxChars) {
        // Runs inside the page. Must stay self-contained.
        const clean = (t) => String(t || '').replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        const sel = clean(window.getSelection ? window.getSelection().toString() : '');
        if (sel.length >= 20) return { kind: 'selection', text: sel.slice(0, maxChars), title: document.title };
        const host = location.hostname;
        const last = (q) => { const n = document.querySelectorAll(q); return n.length ? n[n.length - 1] : null; };
        let el = null;
        if (/gemini\.google\.com$/.test(host)) el = last('model-response message-content') || last('message-content') || last('.model-response-text');
        else if (/(chatgpt\.com|chat\.openai\.com)$/.test(host)) el = last('[data-message-author-role="assistant"]');
        else if (/claude\.ai$/.test(host)) el = last('.font-claude-message') || last('[data-is-streaming]');
        if (!el) el = document.querySelector('article') || document.querySelector('main, [role="main"]');
        if (!el || clean(el.innerText).length < 200) el = document.body;
        return { kind: el === document.body ? 'page' : 'main', text: clean(el && el.innerText).slice(0, maxChars), title: document.title };
    }

    function getActiveTab() {
        return new Promise((resolve) => {
            if (!(window.chrome && chrome.tabs && chrome.tabs.query)) return resolve(null);
            chrome.tabs.query({ active: true, lastFocusedWindow: true }, (t) => {
                if (t && t.length) return resolve(t[0]);
                chrome.tabs.query({ active: true, currentWindow: true }, (t2) => resolve(t2 && t2[0] || null));
            });
        });
    }

    async function readPageText(tab) {
        if (!(window.chrome && chrome.scripting && tab && typeof tab.id === 'number')) return null;
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: pageTextExtractor,
                args: [MAX_CHARS]
            });
            return results && results[0] && results[0].result || null;
        } catch (err) {
            console.warn('Could not read page text:', err && err.message);
            return null;
        }
    }

    function captureTab(tab) {
        return new Promise((resolve) => {
            if (!(window.chrome && chrome.tabs && chrome.tabs.captureVisibleTab)) return resolve(null);
            chrome.tabs.captureVisibleTab(tab ? tab.windowId : null, { format: 'jpeg', quality: 60 }, (dataUrl) => {
                if (chrome.runtime.lastError || !dataUrl) {
                    chrome.runtime.sendMessage({ action: 'capture_active_tab' }, (res) => {
                        resolve(!chrome.runtime.lastError && res && res.success ? res.dataUrl : null);
                    });
                } else resolve(dataUrl);
            });
        });
    }

    function downscale(dataUrl, max = 1280, quality = 0.7) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                let { width: w, height: h } = img;
                if (w > max || h > max) { const r = Math.min(max / w, max / h); w = Math.round(w * r); h = Math.round(h * r); }
                const c = document.createElement('canvas'); c.width = w; c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(c.toDataURL('image/jpeg', quality).split(',')[1]);
            };
            img.onerror = () => resolve(dataUrl.split(',')[1]);
            img.src = dataUrl;
        });
    }

    async function scanPage() {
        if (busy) return;
        const tab = await getActiveTab();
        if (!tab) {
            showError('Scanning works inside the Chrome side panel. You can paste the text above instead.', null);
            return;
        }
        if (tab.url && (RESTRICTED.test(tab.url) || /chromewebstore\.google\.com|chrome\.google\.com\/webstore/.test(tab.url)) && !/\.pdf($|\?)/i.test(tab.url)) {
            showError("Chrome doesn't let extensions read this kind of page. Switch to a normal website tab, or paste the text above.", null);
            return;
        }
        showLoading('Reading this page…');
        const res = await readPageText(tab);
        if (res && res.text && res.text.length >= 80) {
            elInput.value = res.text;
            busy = false;
            runUnfreeze(res.text, res.kind === 'selection' ? 'selection' : 'page');
            return;
        }

        // No readable text (image, canvas, PDF viewer) → screenshot fallback, Gemini only
        const { gemini } = AIHelper.getKeys();
        if (!gemini) {
            showError("This page doesn't have text I can read (it may be an image or a PDF). Copy the part you need and paste it above, or add a free Gemini key so it can be read from a screenshot.", null);
            return;
        }
        showLoading('No text here, so reading a screenshot instead…');
        busy = true;
        try {
            const dataUrl = await captureTab(tab);
            if (!dataUrl) throw new Error('CAPTURE_FAILED');
            const b64 = await downscale(dataUrl);
            const plan = await AIHelper.unfreezeImage(b64);
            session = makeSession(plan, 'ai', 'screenshot');
            busy = false;
            render(true);
        } catch (err) {
            busy = false;
            const msg = err && err.message === 'CAPTURE_FAILED'
                ? "Couldn't take a screenshot of this tab. Copy the part you need and paste it above."
                : friendlyError(err);
            showError(msg, err && err.message === 'CAPTURE_FAILED' ? null : scanPage);
        }
    }

    // ── Incoming "Unfreeze this" from the right-click menu ───────
    function acceptIncoming(payload) {
        if (!payload || !payload.text || payload.ts <= lastIncomingTs) return;
        lastIncomingTs = payload.ts;
        if (App().setView) App().setView('focus');
        elInput.value = payload.text;
        runUnfreeze(payload.text, 'selection');
    }

    if (window.chrome && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((msg) => {
            if (msg && msg.action === 'unfreeze_text') {
                acceptIncoming(msg);
                try { chrome.runtime.sendMessage({ action: 'clear_pending_unfreeze' }).catch(() => {}); } catch (_) { /* ignore */ }
            }
        });
        try {
            chrome.runtime.sendMessage({ action: 'get_pending_unfreeze' }, (res) => {
                if (chrome.runtime.lastError) return;
                if (res && res.pending) acceptIncoming(res.pending);
            });
        } catch (_) { /* not in extension context */ }
    }

    // ── Wiring ────────────────────────────────────────────────────
    elGo.onclick = () => runUnfreeze(elInput.value, 'paste');
    if (elScan) elScan.onclick = scanPage;
    elInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runUnfreeze(elInput.value, 'paste'); }
    });
    // Single-key shortcuts while focus is inside the step card (never while typing)
    elResult.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        const k = e.key.toLowerCase();
        if (k === 'd') { e.preventDefault(); markCurrent('done'); }
        else if (k === 's') { e.preventDefault(); markCurrent('skipped'); }
        else if (k === 'b') { e.preventDefault(); splitCurrent(); }
    });

    // Restore an in-progress plan
    session = load();
    if (session) render(false); else showInput(false);

    window.FreezeFixUnfreeze = { run: runUnfreeze, scan: scanPage, render: () => render(false), extractor: pageTextExtractor };
});
