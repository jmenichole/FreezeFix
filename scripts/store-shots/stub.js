// chrome.* stub for loading index.html outside the extension
window.__DEMO_TEXT__ = window.__DEMO_TEXT__ || '';
window.__msgs = [];
window.chrome = {
  runtime: {
    lastError: null,
    sendMessage(msg, cb) { window.__msgs.push(msg); const r = msg.action==='get_pending_unfreeze' ? {pending: window.__PENDING__||null} : {success:false}; if (cb) { setTimeout(()=>cb(r),0); return; } return Promise.resolve(r); },
    onMessage: { _l: [], addListener(f){ this._l.push(f); } }
  },
  tabs: {
    query(q, cb){ cb([{id: 7, windowId: 1, url: 'https://gemini.google.com/app/abc', title: 'Gemini'}]); },
    captureVisibleTab(w, o, cb){ cb(null); }
  },
  scripting: {
    async executeScript(opts){ return [{ result: { kind: 'main', text: window.__DEMO_TEXT__, title: 'Gemini' } }]; }
  },
  permissions: { contains(o, cb){ cb(true); } }
};
