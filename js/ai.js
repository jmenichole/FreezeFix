/*
 * ADHD Flow Widget — AI Integration Module
 * Copyright © 2026 jmenichole (J Chapman). All rights reserved.
 * Author: jmenichole <j.chapman7@yahoo.com>
 * GitHub: https://github.com/jmenichole
 * 
 * Unauthorized copying, distribution, or modification of this software is prohibited.
 * This software is proprietary and confidential.
 */

/* js/ai.js — Gemini API Integration & AI task helper */
'use strict';

const AIHelper = (() => {
    const GEMINI_PRIMARY_MODEL = 'gemini-3.8-flash';
    const GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite';

    function getKeys() {
        try {
            const s = JSON.parse(localStorage.getItem('adhd_settings') || '{}');
            return {
                gemini: s.geminiKey || '',
                groq: s.groqKey || ''
            };
        } catch { return { gemini: '', groq: '' }; }
    }

    async function callGroq(prompt) {
        const { groq } = getKeys();
        if (!groq) throw new Error('NO_GROQ_KEY');

        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groq}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.6
            })
        });

        if (!resp.ok) throw new Error(`GROQ_ERROR_${resp.status}`);
        const data = await resp.json();
        return data.choices?.[0]?.message?.content || '';
    }

    async function callGemini(prompt, options = {}) {
        const { gemini } = getKeys();
        if (!gemini) throw new Error('NO_GEMINI_KEY');

        const model = options.model || GEMINI_PRIMARY_MODEL;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gemini}`;

        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }]
        };

        if (options.systemInstruction) {
            payload.system_instruction = {
                parts: [{ text: options.systemInstruction }]
            };
        }

        const genConfig = {};
        if (options.jsonSchema) {
            genConfig.response_mime_type = 'application/json';
            genConfig.response_schema = options.jsonSchema;
        }
        if (typeof options.temperature === 'number') {
            genConfig.temperature = options.temperature;
        }

        if (Object.keys(genConfig).length > 0) {
            payload.generationConfig = genConfig;
        }

        let resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // If primary model hits rate limit or error, retry once with fast lite model
        if (!resp.ok && model === GEMINI_PRIMARY_MODEL && resp.status !== 400 && resp.status !== 401 && resp.status !== 403) {
            console.warn(`Gemini 3.8 Flash returned ${resp.status}, trying Gemini 3.5 Flash-Lite fallback...`);
            const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FALLBACK_MODEL}:generateContent?key=${gemini}`;
            resp = await fetch(fallbackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (!resp.ok) throw new Error(`GEMINI_ERROR_${resp.status}`);
        const data = await resp.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    async function callAI(prompt, options = {}) {
        const { groq, gemini } = getKeys();
        // Prefer Gemini for structured output requests when available
        if (options.jsonSchema && gemini) {
            try { return await callGemini(prompt, options); }
            catch (err) { console.warn('Gemini structured call failed, falling back to Groq...', err); }
        }

        if (groq) {
            try { return await callGroq(prompt); }
            catch (err) { console.warn('Groq failed, trying Gemini if available', err); }
        }
        if (gemini) {
            try { return await callGemini(prompt, options); }
            catch (err) { console.warn('Gemini failed', err); }
        }
        throw new Error('NO_WORKING_AI');
    }

    async function generateTaskBreakdown(taskName) {
        const systemInstruction = `You are an empathetic, practical ADHD executive dysfunction coach (similar to Goblin.tools Magic ToDo).
Break real-world tasks down into 3-5 concrete, physical, low-friction micro-steps that an overwhelmed person can actually do right now.
RULES:
1. Use real physical body verbs (e.g. "Grab cat treats", "Step to the door", "Crack the door open", "Put 2 mugs in the sink").
2. NEVER use generic or corporate phrases like "Prepare materials", "Execute first action", "Continue core work", or "Review and finalize".
3. Sequence for momentum: Step 1 must be a 30-sec to 2-min frictionless starting line. Step 2 a 3-5 min starter. Step 3 a core momentum action. Step 4 a "good enough" finish line.
4. Keep durations short (1-10 minutes per step).`;

        const userPrompt = `Break down this task: "${taskName}".`;

        const jsonSchema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    name: { type: "STRING" },
                    duration: { type: "INTEGER" }
                },
                required: ["name", "duration"]
            }
        };

        try {
            const resultText = await callAI(userPrompt, {
                systemInstruction,
                jsonSchema,
                temperature: 0.4
            });

            // If response is valid JSON (structured mode), parse directly
            try {
                const parsed = JSON.parse(resultText.trim());
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.map(step => ({
                        name: String(step.name || '').trim(),
                        duration: Math.max(1, parseInt(step.duration, 10) || 5)
                    }));
                }
            } catch {
                // If text output from Groq/unstructured fallback, extract array via regex
                const match = resultText.match(/\[\s*\{[\s\S]*\}\s*\]/);
                if (match) {
                    const steps = JSON.parse(match[0]);
                    if (Array.isArray(steps) && steps.length > 0) {
                        return steps.map(step => ({
                            name: String(step.name || '').trim(),
                            duration: Math.max(1, parseInt(step.duration, 10) || 5)
                        }));
                    }
                }
            }
        } catch (err) {
            console.warn('AI breakdown failed, fallback to local heuristics', err);
        }

        return TaskBreakdown.getLocalBreakdown(taskName);
    }

    async function suggestNextTask(pendingTasks, streak) {
        if (!pendingTasks.length) {
            return "🎉 All caught up! Enjoy your break, or type your next goal in the Brain Dump above! 👆";
        }

        const taskListStr = pendingTasks.map(t => `- ${t.name} (Duration: ${t.duration}m, Priority: ${t.priority})`).join('\n');
        const prompt = `You are an encouraging ADHD coach. Here are my current tasks:\n${taskListStr}\n\nCurrent streak: ${streak} days.\nPick ONE task for me to focus on right now. Explain why in 2 short, warm, low-pressure sentences. Focus on low friction to overcome executive dysfunction.`;

        try {
            return await callAI(prompt, { temperature: 0.6 });
        } catch {
            const topTask = pendingTasks.sort((a,b) => (a.priority || 3) - (b.priority || 3))[0];
            return `👉 **Recommended:** "${topTask.name}" (${topTask.duration}m). Give it 5 minutes!`;
        }
    }

    async function analyzeScreenImage(b64Image) {
        const { gemini } = getKeys();
        if (!gemini) {
            throw new Error('NO_GEMINI_KEY');
        }

        const model = GEMINI_PRIMARY_MODEL;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gemini}`;
        const promptText = `You are an ADHD executive dysfunction coach. Analyze this screenshot.
1. Provide a one-sentence summary of the webpage/task the user is currently viewing.
2. Extract 2-3 concrete, low-friction physical micro-actions they can take right now to make progress.
Return JSON with this schema:
{
  "context": "Short summary of what is on screen",
  "actions": [
    { "title": "Specific action verb title", "detail": "One short sentence why or how", "duration": 3 }
  ]
}`;

        const payload = {
            contents: [{
                parts: [
                    { text: promptText },
                    { inline_data: { mime_type: "image/jpeg", data: b64Image } }
                ]
            }],
            generationConfig: {
                response_mime_type: "application/json",
                response_schema: {
                    type: "OBJECT",
                    properties: {
                        context: { type: "STRING" },
                        actions: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    title: { type: "STRING" },
                                    detail: { type: "STRING" },
                                    duration: { type: "INTEGER" }
                                },
                                required: ["title", "duration"]
                            }
                        }
                    },
                    required: ["context", "actions"]
                },
                temperature: 0.3
            }
        };

        let resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!resp.ok && resp.status !== 400 && resp.status !== 401 && resp.status !== 403) {
            console.warn(`Gemini 3.8 Flash vision returned ${resp.status}, trying fallback model...`);
            const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FALLBACK_MODEL}:generateContent?key=${gemini}`;
            resp = await fetch(fallbackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (!resp.ok) throw new Error(`GEMINI_VISION_ERROR_${resp.status}`);
        const data = await resp.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        try {
            return JSON.parse(rawText.trim());
        } catch {
            return {
                context: rawText,
                actions: []
            };
        }
    }

    async function suggestTasksFromActivity(history = [], completedToday = [], pendingTasks = []) {
        const now = new Date();
        const hour = now.getHours();
        let timeOfDay = 'afternoon';
        if (hour >= 5 && hour < 11) timeOfDay = 'morning';
        else if (hour >= 11 && hour < 14) timeOfDay = 'midday';
        else if (hour >= 14 && hour < 18) timeOfDay = 'afternoon';
        else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
        else timeOfDay = 'night';

        const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

        // Check if Gemini API key is configured
        const { gemini } = getKeys();
        if (gemini) {
            try {
                const completedStr = completedToday.map(t => `- "${t.taskName || t.name}" (${t.plannedDuration || t.duration || 15}m, ${t.category || 'work'})`).join('\n');
                const pendingStr = pendingTasks.slice(0, 5).map(t => `- "${t.name}" (${t.duration}m)`).join('\n');
                const recentHistoryStr = history.slice(0, 8).map(t => `- "${t.taskName}" (${t.category})`).join('\n');

                const promptText = `You are a clinical ADHD executive dysfunction productivity coach.
Current local time: ${timeStr} (${timeOfDay}).
Tasks completed today (${completedToday.length}):
${completedStr || 'None logged yet today.'}

Recent completion history:
${recentHistoryStr || 'None.'}

Current pending tasks:
${pendingStr || 'None.'}

Based on what the user completed today, cognitive stamina, and the current time of day, suggest 2 to 3 practical next tasks to add to their list right now.
Rules:
- Actions must be concrete physical body movements (e.g. "Commit & push git branch", "Drink glass of water & 3-minute stretch", "Draft 2-sentence reply").
- Duration must be small (2 to 15 minutes) to break initiation inertia.
- Categorize as work, health, personal, learning, or chores.
Return JSON matching schema.`;

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_PRIMARY_MODEL}:generateContent?key=${gemini}`;
                const payload = {
                    contents: [{ parts: [{ text: promptText }] }],
                    generationConfig: {
                        response_mime_type: 'application/json',
                        response_schema: {
                            type: 'OBJECT',
                            properties: {
                                context: { type: 'STRING' },
                                suggestions: {
                                    type: 'ARRAY',
                                    items: {
                                        type: 'OBJECT',
                                        properties: {
                                            title: { type: 'STRING' },
                                            reason: { type: 'STRING' },
                                            duration: { type: 'INTEGER' },
                                            category: { type: 'STRING' }
                                        },
                                        required: ['title', 'reason', 'duration', 'category']
                                    }
                                }
                            },
                            required: ['context', 'suggestions']
                        },
                        temperature: 0.4
                    }
                };

                let resp = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (resp.ok) {
                    const data = await resp.json();
                    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (rawText) {
                        const parsed = JSON.parse(rawText.trim());
                        if (parsed && Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
                            return parsed;
                        }
                    }
                }
            } catch (err) {
                console.warn('AI activity suggestion failed, fallback to local heuristics:', err);
            }
        }

        // ── Local Rule-Based Heuristic Fallback ──
        return getLocalActivitySuggestions(hour, timeOfDay, completedToday, history);
    }

    function getLocalActivitySuggestions(hour, timeOfDay, completedToday = [], history = []) {
        const suggestions = [];
        let context = '';

        const doneCount = completedToday.length;
        const lastTask = completedToday[completedToday.length - 1] || history[0];
        const lastTitle = (lastTask?.taskName || lastTask?.name || '').toLowerCase();

        // 1. Follow-up heuristic from most recent completed task
        if (lastTitle.includes('code') || lastTitle.includes('bug') || lastTitle.includes('feature') || lastTitle.includes('dev') || lastTitle.includes('script')) {
            suggestions.push({
                title: 'Commit & push changes to Git',
                reason: `Save your progress from "${lastTask.taskName || 'coding'}" before context switching.`,
                duration: 5,
                category: 'work'
            });
        } else if (lastTitle.includes('email') || lastTitle.includes('message') || lastTitle.includes('slack')) {
            suggestions.push({
                title: 'Close communication tabs & return to deep work',
                reason: 'Prevent reactive tab-hopping after checking messages.',
                duration: 2,
                category: 'work'
            });
        } else if (lastTitle.includes('dish') || lastTitle.includes('clean') || lastTitle.includes('laundry')) {
            suggestions.push({
                title: 'Wipe kitchen counter or fold 3 shirts',
                reason: 'Ride physical momentum with one tiny follow-up.',
                duration: 5,
                category: 'personal'
            });
        }

        // 2. Cognitive balance / hydration check if working hard
        if (doneCount >= 2 && !suggestions.some(s => s.category === 'health')) {
            suggestions.push({
                title: 'Drink a glass of water & 2-minute stretch',
                reason: `You've crushed ${doneCount} tasks today — reset your mental battery.`,
                duration: 3,
                category: 'health'
            });
        }

        // 3. Time-of-day contextual slots
        if (timeOfDay === 'morning') {
            context = doneCount ? `Good morning! You already have ${doneCount} win${doneCount > 1 ? 's' : ''} logged.` : 'Good morning! Here are low-friction starters for your day:';
            if (suggestions.length < 3) {
                suggestions.push({
                    title: 'Review #1 main goal for today',
                    reason: 'Pick one priority before opening distracting browser tabs.',
                    duration: 5,
                    category: 'work'
                });
            }
            if (suggestions.length < 3) {
                suggestions.push({
                    title: 'Morning hydration & meds/vitamins check',
                    reason: 'Physical baseline check to support executive function.',
                    duration: 2,
                    category: 'health'
                });
            }
        } else if (timeOfDay === 'midday') {
            context = `Midday flow (${doneCount} task${doneCount === 1 ? '' : 's'} done):`;
            if (suggestions.length < 3) {
                suggestions.push({
                    title: 'Take a screen-free lunch or snack break',
                    reason: 'Midday glucose & sensory reset prevents afternoon crash.',
                    duration: 15,
                    category: 'health'
                });
            }
            if (suggestions.length < 3) {
                suggestions.push({
                    title: 'Quick 5-minute fresh air walk or stretch',
                    reason: 'Reset circulation and clear mental fog.',
                    duration: 5,
                    category: 'health'
                });
            }
        } else if (timeOfDay === 'afternoon') {
            context = `Afternoon session (${doneCount} completed today):`;
            if (suggestions.length < 3) {
                suggestions.push({
                    title: '10-minute low-friction inbox / admin sweep',
                    reason: 'Great low-energy task to maintain momentum during the 2-4 PM dip.',
                    duration: 10,
                    category: 'work'
                });
            }
            if (suggestions.length < 3) {
                suggestions.push({
                    title: '15-minute focused sprint on top priority',
                    reason: 'Set a short timer and make progress on your main goal.',
                    duration: 15,
                    category: 'work'
                });
            }
        } else if (timeOfDay === 'evening') {
            context = `Evening wrap-up (${doneCount} task${doneCount === 1 ? '' : 's'} crushed today):`;
            if (suggestions.length < 3) {
                suggestions.push({
                    title: 'End-of-day shutdown: Note tomorrow’s #1 priority',
                    reason: 'Clear mental clutter so you can relax this evening.',
                    duration: 5,
                    category: 'work'
                });
            }
            if (suggestions.length < 3) {
                suggestions.push({
                    title: '5-minute desk and room tidy reset',
                    reason: 'Visual declutter lowers morning cortisol.',
                    duration: 5,
                    category: 'personal'
                });
            }
        } else {
            // Night
            context = 'Night unwind:';
            if (suggestions.length < 3) {
                suggestions.push({
                    title: 'Close all work tabs & dim screen brightness',
                    reason: 'Signal to your brain that the workday is officially over.',
                    duration: 3,
                    category: 'health'
                });
            }
            if (suggestions.length < 3) {
                suggestions.push({
                    title: 'Set clothes or gear out for tomorrow',
                    reason: 'Frictionless prep for tomorrow morning.',
                    duration: 5,
                    category: 'personal'
                });
            }
        }

        return {
            context: context || 'Suggested tasks based on your flow today:',
            suggestions: suggestions.slice(0, 3)
        };
    }

    async function generateStuckRescue(taskName) {
        const { gemini } = getKeys();
        if (gemini) {
            try {
                const prompt = `You are a clinical ADHD paralysis rescue specialist.
The user is frozen/stuck on this task: "${taskName}".
Generate exactly 2 concrete, low-friction physical micro-moves to shatter executive paralysis:
1. "starter": a 30-sec to 2-min physical movement (e.g. "Crack the door open", "Put 2 dishes in sink", "Open file and type 1 comment").
2. "good_enough": a 2-5 min stopping line to escape the perfectionist trap (e.g. "Write down 3 bullet notes and close tab", "Send current draft as-is").
Return JSON matching schema.`;

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_PRIMARY_MODEL}:generateContent?key=${gemini}`;
                const payload = {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        response_mime_type: 'application/json',
                        response_schema: {
                            type: 'OBJECT',
                            properties: {
                                starter: {
                                    type: 'OBJECT',
                                    properties: {
                                        title: { type: 'STRING' },
                                        detail: { type: 'STRING' },
                                        duration: { type: 'INTEGER' }
                                    },
                                    required: ['title', 'duration']
                                },
                                good_enough: {
                                    type: 'OBJECT',
                                    properties: {
                                        title: { type: 'STRING' },
                                        detail: { type: 'STRING' },
                                        duration: { type: 'INTEGER' }
                                    },
                                    required: ['title', 'duration']
                                }
                            },
                            required: ['starter', 'good_enough']
                        },
                        temperature: 0.3
                    }
                };

                const resp = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (resp.ok) {
                    const data = await resp.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        const parsed = JSON.parse(text.trim());
                        if (parsed && parsed.starter && parsed.good_enough) {
                            return parsed;
                        }
                    }
                }
            } catch (err) {
                console.warn('AI stuck rescue fallback', err);
            }
        }

        // Local Rule-Based Freeze Breaker (Instant & Offline)
        const t = (taskName || '').toLowerCase();
        if (t.includes('code') || t.includes('bug') || t.includes('script') || t.includes('git') || t.includes('repo')) {
            return {
                starter: { title: 'Open editor & type 1 comment describing the goal', detail: 'Do not write any real logic yet; just 1 English comment line.', duration: 2 },
                good_enough: { title: 'Commit current work to a WIP branch', detail: 'Save whatever you have right now so your head is completely clear.', duration: 3 }
            };
        }
        if (t.includes('write') || t.includes('doc') || t.includes('email') || t.includes('reply') || t.includes('message')) {
            return {
                starter: { title: 'Type 1 messy sentence without editing', detail: 'Mute your internal critic; write the ugliest first draft.', duration: 2 },
                good_enough: { title: 'Send or save 3 key bullet points', detail: 'Bullet points are almost always good enough to move forward.', duration: 5 }
            };
        }
        if (t.includes('clean') || t.includes('tidy') || t.includes('chore') || t.includes('room') || t.includes('dish')) {
            return {
                starter: { title: 'Put away exactly 3 physical items', detail: 'Pick up 3 things and place them where they belong.', duration: 2 },
                good_enough: { title: 'Clear 1 small flat surface (e.g. desk corner)', detail: 'Stop as soon as that single corner is visible.', duration: 5 }
            };
        }
        return {
            starter: { title: 'Take 1 slow breath & open the relevant window', detail: 'Just look at the screen for 30 seconds with zero obligation to work.', duration: 1 },
            good_enough: { title: 'Do 3 minutes of minimum viable effort', detail: 'Stop as soon as the timer rings—you have 100% permission to quit.', duration: 3 }
        };
    }

    return { getKeys, generateTaskBreakdown, suggestNextTask, analyzeScreenImage, suggestTasksFromActivity, generateStuckRescue };
})();
