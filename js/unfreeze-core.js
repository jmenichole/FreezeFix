/*
 * FreezeFix — Unfreeze Core (pure logic, no DOM)
 * Copyright © 2026 jmenichole (J Chapman). All rights reserved.
 * Author: jmenichole <j.chapman7@yahoo.com>
 *
 * Turns a wall of text into a gist + 3-7 doable steps.
 * - Builds the strict JSON prompts used by AIHelper (Gemini / Groq)
 * - Validates & repairs model JSON
 * - Offline fallback splitter (no network, no key)
 */
'use strict';

const UnfreezeCore = (() => {
    const MAX_INPUT_CHARS = 12000;
    const MAX_STEPS = 7;
    const STEP_WORDS = 12;

    // ── Prompts ────────────────────────────────────────────────
    const SYSTEM_PROMPT = `You turn overwhelming text into a calm plan an overwhelmed ADHD brain will accept.
Return ONLY a JSON object, no prose, no markdown fences:
{"gist": string, "steps": [{"text": string, "minutes": integer}], "skip": string}

Rules:
- gist: ONE plain sentence, max 15 words, starting with "This is about".
- steps: 3 to 7 steps, in the order to do them.
  - Each step starts with a verb (Open, Write, Read, Try, Pick...). Max 12 words.
  - Concrete enough to start right now, in under 15 minutes where possible.
  - No jargon. If a term is unavoidable, explain it in 5 words or fewer inside the step, e.g. "Install Node (the JavaScript runner)".
  - minutes: honest whole-number estimate, 1 to 30.
- skip: optional. One short line naming what can be safely ignored for now. Use "" if nothing.
Tone: calm and plain. No lecturing, no motivation speeches, never "you should", "you must" or "make sure".`;

    function buildUnfreezePrompt(text) {
        return `Here is the overwhelming text (it may be cut off). Turn it into the JSON plan.\n\n"""\n${text}\n"""`;
    }

    const SPLIT_SYSTEM_PROMPT = `You split ONE step that feels too big into 2 to 4 smaller steps.
Return ONLY JSON: {"steps": [{"text": string, "minutes": integer}]}
Rules: each step starts with a verb, max 12 words, doable right now, minutes 1-15.
No jargon (explain any needed term in 5 words or fewer). Calm tone, never "you should".`;

    function buildSplitPrompt(stepText, gist) {
        return `Overall context: ${gist || 'n/a'}\nThe step that feels too big: "${stepText}"\nSplit it into 2-4 smaller steps as JSON.`;
    }

    // Gemini response schemas (REST v1beta, uppercase types)
    const UNFREEZE_SCHEMA = {
        type: 'OBJECT',
        properties: {
            gist: { type: 'STRING' },
            steps: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: { text: { type: 'STRING' }, minutes: { type: 'INTEGER' } },
                    required: ['text', 'minutes']
                }
            },
            skip: { type: 'STRING' }
        },
        required: ['gist', 'steps']
    };

    const SPLIT_SCHEMA = {
        type: 'OBJECT',
        properties: {
            steps: UNFREEZE_SCHEMA.properties.steps
        },
        required: ['steps']
    };

    // ── Input prep ─────────────────────────────────────────────
    function cleanInput(text) {
        if (!text) return '';
        let t = String(text).replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
        t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        if (t.length > MAX_INPUT_CHARS) {
            const cut = t.slice(0, MAX_INPUT_CHARS);
            const lastBreak = Math.max(cut.lastIndexOf('\n'), cut.lastIndexOf('. '));
            t = (lastBreak > MAX_INPUT_CHARS * 0.8 ? cut.slice(0, lastBreak + 1) : cut).trim();
        }
        return t;
    }

    // ── JSON repair & validation ───────────────────────────────
    function extractJsonText(raw) {
        if (raw && typeof raw === 'object') return raw;
        let s = String(raw || '').trim();
        s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
        const first = s.indexOf('{');
        const last = s.lastIndexOf('}');
        if (first !== -1 && last > first) s = s.slice(first, last + 1);
        return s;
    }

    function tryParse(raw) {
        const s = extractJsonText(raw);
        if (s && typeof s === 'object') return s;
        const attempts = [
            s,
            s.replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'"),
            s.replace(/[\u201c\u201d]/g, '"').replace(/,\s*([}\]])/g, '$1')
        ];
        for (const a of attempts) {
            try { return JSON.parse(a); } catch (_) { /* next */ }
        }
        // Model returned a bare array of steps
        const arr = String(raw || '').match(/\[[\s\S]*\]/);
        if (arr) {
            try { return { steps: JSON.parse(arr[0].replace(/,\s*([}\]])/g, '$1')) }; } catch (_) { /* ignore */ }
        }
        return null;
    }

    const PREACHY = /^(you\s+(should|must|need to|have to|ought to)|make sure (to|that you)?|remember to|be sure to|don't forget to|try to)\s+/i;

    function tidyStep(text) {
        let t = String(text || '').replace(/\s+/g, ' ').trim();
        t = t.replace(/^(\d+[\.\)]|[-*•]|step\s*\d+\s*[:.\-])\s*/i, '');
        t = t.replace(/^(first|next|then|finally|now|after that),?\s+/i, '');
        t = t.replace(PREACHY, '');
        t = t.replace(/\*\*/g, '');
        if (t) t = t.charAt(0).toUpperCase() + t.slice(1);
        return t;
    }

    function clampMinutes(m, fallback = 5, max = 30) {
        const n = parseInt(m, 10);
        if (!Number.isFinite(n) || n <= 0) return fallback;
        return Math.min(max, Math.max(1, n));
    }

    function normalizeSteps(list, maxSteps = MAX_STEPS, maxMinutes = 30) {
        if (!Array.isArray(list)) return [];
        return list.map(item => {
            if (typeof item === 'string') return { text: tidyStep(item), minutes: 5 };
            if (!item || typeof item !== 'object') return null;
            const text = item.text || item.step || item.action || item.title || item.name || '';
            const minutes = item.minutes ?? item.mins ?? item.duration ?? item.time;
            return { text: tidyStep(text), minutes: clampMinutes(minutes, 5, maxMinutes) };
        }).filter(s => s && s.text && s.text.length > 1).slice(0, maxSteps);
    }

    function tidyGist(g) {
        let t = String(g || '').replace(/\s+/g, ' ').trim().replace(/^gist:\s*/i, '');
        if (!t) return '';
        if (!/^this is about/i.test(t)) t = 'This is about ' + t.charAt(0).toLowerCase() + t.slice(1);
        const words = t.split(' ');
        if (words.length > 20) t = words.slice(0, 18).join(' ').replace(/[,;:]$/, '') + '…';
        if (!/[.!?…]$/.test(t)) t += '.';
        return t;
    }

    /** Returns {gist, steps, skip} or null when unusable. */
    function validateUnfreeze(raw) {
        const obj = tryParse(raw);
        if (!obj || typeof obj !== 'object') return null;
        const steps = normalizeSteps(obj.steps || obj.actions || obj.plan);
        if (steps.length < 2) return null;
        const gist = tidyGist(obj.gist || obj.summary || obj.context) || 'This is about the text you shared.';
        let skip = String(obj.skip || obj.ignore || '').replace(/\s+/g, ' ').trim();
        if (/^(none|n\/a|nothing|null)\.?$/i.test(skip)) skip = '';
        return { gist, steps, skip };
    }

    /** Returns array of 2-4 steps or null. */
    function validateSplit(raw) {
        const obj = tryParse(raw);
        if (!obj) return null;
        const steps = normalizeSteps(Array.isArray(obj) ? obj : obj.steps, 4, 15);
        return steps.length >= 2 ? steps : null;
    }

    // ── Offline fallback ───────────────────────────────────────
    const IMPERATIVE_VERBS = new Set(('open click tap write read try practice start make take create install run use add go find choose pick ' +
        'set review watch list note download learn focus break ask check compare draw say repeat test build sign save copy type spend ' +
        'schedule look grab put plan define identify memorize record explain summarize apply begin keep sketch outline collect gather ' +
        'prepare drink eat call email send reply visit search select enter fill upload submit print book move clean wash stop avoid ' +
        'imagine think consider label highlight underline circle mark skim jot jump focus quiz rewrite translate speak listen follow ' +
        'replace remove delete update edit fix configure enable disable connect press hold drag scroll copy paste turn get do verify confirm ' +
        'share show tell bring finish complete'
    ).split(/\s+/));

    // Cues only count at the start of a sentence ("...means you can build" is not an instruction)
    const INSTRUCTION_CUES = /^(?:(?:first|next|then|finally|now),?\s+)?(you can|you'll want to|you will want to|you should|you need to|make sure|try to|be sure to|start by|begin by|the first step|step \d+|to do this|aim to|set aside|to [a-z][^,]{2,40},\s*(you|make|start|open|try))\b/i;

    function splitSentences(paragraph) {
        return paragraph
            .replace(/([.!?])\s+(?=[A-Z0-9"“(])/g, '$1\n')
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean);
    }

    function trimWords(text, n = STEP_WORDS) {
        const words = text.replace(/[.;:,]+$/, '').split(/\s+/);
        if (words.length <= n) return words.join(' ');
        return words.slice(0, n).join(' ').replace(/[,;:]$/, '') + '…';
    }

    function guessMinutes(text) {
        const t = text.toLowerCase();
        if (/\b(practice|study|build|write|watch|exercise|project|review)\b/.test(t)) return 10;
        if (/\b(read|skim|research|outline|draft|plan)\b/.test(t)) return 5;
        if (/\b(open|click|tap|install|download|save|bookmark|copy|grab|pick|choose|set)\b/.test(t)) return 2;
        return 5;
    }

    function firstWord(s) {
        return (s.toLowerCase().match(/^[a-z']+/) || [''])[0];
    }

    function looksLikeInstruction(sentence) {
        const cleaned = tidyStep(sentence);
        if (cleaned.length < 6) return false;
        if (/\?$/.test(cleaned)) return false;
        return IMPERATIVE_VERBS.has(firstWord(cleaned)) || INSTRUCTION_CUES.test(sentence);
    }

    function toStepText(sentence) {
        let t = tidyStep(sentence);
        // "To get started, you can open X" -> "open X"
        t = t.replace(/^(to [^,]{3,40},\s*)/i, '');
        t = t.replace(/^(you can|you'll want to|you will want to|you need to|start by|begin by|aim to)\s+/i, '');
        t = t.replace(/^(the first step is( to)?)\s+/i, '');
        if (t) t = t.charAt(0).toUpperCase() + t.slice(1);
        return trimWords(t);
    }

    function offlineGist(text) {
        const lines = text.split('\n').map(l => l.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim()).filter(Boolean);
        let topic = '';
        const heading = lines.find(l => l.split(/\s+/).length <= 9 && !/[.!?]$/.test(l) && !/^[-*•\d]/.test(l));
        if (heading) topic = heading.replace(/[:]+$/, '');
        else if (lines[0]) topic = trimWords(splitSentences(lines[0])[0] || lines[0], 10);
        topic = topic.replace(/^(this is about|here'?s|here is|let'?s|okay,?|great question!?)\s*/i, '').trim();
        if (!topic) return 'This is about the text you shared.';
        return tidyGist(topic);
    }

    /** Offline: pull instruction-like lines into up to 7 steps. Always returns a usable plan. */
    function offlineUnfreeze(input) {
        const text = cleanInput(input);
        const blocks = text.split('\n').map(l => l.trim()).filter(Boolean);
        const candidates = [];
        const seen = new Set();

        const push = (s) => {
            const step = toStepText(s);
            const key = step.toLowerCase().slice(0, 40);
            if (step.length > 3 && !seen.has(key)) {
                seen.add(key);
                candidates.push({ text: step, minutes: guessMinutes(step) });
            }
        };

        // Pass 1: bullet / numbered lines that read as instructions
        const bulletLines = blocks.filter(l => /^([-*•]|\d+[.)])\s+/.test(l));
        for (const l of bulletLines) {
            const body = l.replace(/^([-*•]|\d+[.)])\s+/, '').replace(/^\*\*(.+?)\*\*[:\s–—-]*/, '$1: ');
            const head = body.split(/:\s/)[0];
            if (looksLikeInstruction(body)) push(body);
            else if (looksLikeInstruction(head)) push(head);
            if (candidates.length >= MAX_STEPS) break;
        }

        // Pass 2: imperative or instruction-like sentences anywhere
        if (candidates.length < MAX_STEPS) {
            for (const block of blocks) {
                const body = block.replace(/^([-*•]|\d+[.)])\s+/, '').replace(/^#+\s*/, '');
                for (const s of splitSentences(body)) {
                    if (looksLikeInstruction(s)) push(s);
                    if (candidates.length >= MAX_STEPS) break;
                }
                if (candidates.length >= MAX_STEPS) break;
            }
        }

        // Pass 3: no instructions found — fall back to section headings as "read" steps
        if (candidates.length < 3) {
            const headings = blocks
                .map(l => l.replace(/^#+\s*/, '').replace(/^([-*•]|\d+[.)])\s+/, '').replace(/\*\*/g, ''))
                .filter(l => l.split(/\s+/).length <= 8 && l.length > 3)
                .slice(0, 4);
            headings.forEach(h => push('Read only the part about ' + h.replace(/[:.]+$/, '')));
        }

        if (candidates.length < 3) {
            const generic = [
                { text: 'Read just the first three lines', minutes: 2 },
                { text: 'Write one sentence: what is this asking of me?', minutes: 2 },
                { text: 'Circle the first thing it tells you to do', minutes: 2 },
                { text: 'Do that one thing for five minutes', minutes: 5 }
            ];
            for (const g of generic) {
                if (candidates.length >= 3) break;
                if (!seen.has(g.text.toLowerCase().slice(0, 40))) candidates.push(g);
            }
        }

        let skip = '';
        if (text.length > 800) {
            if (/\b(history|background|fun fact|did you know|origin)\b/i.test(text)) skip = 'The history and background bits can wait.';
            else skip = 'Examples and extra detail can wait until step 1 is done.';
        }

        return { gist: offlineGist(text), steps: candidates.slice(0, MAX_STEPS), skip };
    }

    /** Offline split of one step: split on "and"/commas, else generic starter steps. */
    function offlineSplit(stepText) {
        const t = tidyStep(stepText).replace(/[.…]+$/, '');
        const parts = t.split(/,\s*(?:and\s+)?|\s+and\s+(?=[a-z]+\s)/i).map(s => s.trim()).filter(s => s.length > 2);
        if (parts.length >= 2) {
            return parts.slice(0, 4).map((p, i) => {
                const s = p.charAt(0).toUpperCase() + p.slice(1);
                return { text: trimWords(s), minutes: Math.max(1, Math.round(guessMinutes(s) / 2)) };
            });
        }
        return [
            { text: 'Open or find what this step needs', minutes: 1 },
            { text: 'Do only the very first part, for two minutes', minutes: 2 },
            { text: 'Pause and check: done, or one more bit?', minutes: 1 }
        ];
    }

    return {
        MAX_INPUT_CHARS,
        SYSTEM_PROMPT,
        SPLIT_SYSTEM_PROMPT,
        UNFREEZE_SCHEMA,
        SPLIT_SCHEMA,
        buildUnfreezePrompt,
        buildSplitPrompt,
        cleanInput,
        tryParse,
        validateUnfreeze,
        validateSplit,
        offlineUnfreeze,
        offlineSplit,
        tidyStep
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnfreezeCore;
}
