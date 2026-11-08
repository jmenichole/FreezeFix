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
        const payload = {
            contents: [{
                parts: [
                    { text: "Analyze this screen screenshot. What specific task, application, or project is the user currently viewing? Extract 1-3 immediate, low-friction, concrete physical micro-tasks for them to do right now to overcome initiation paralysis. Format as 2-3 warm, actionable bullet points." },
                    { inline_data: { mime_type: "image/jpeg", data: b64Image } }
                ]
            }],
            generationConfig: {
                temperature: 0.4
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
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No task identified from screen.';
    }

    return { getKeys, generateTaskBreakdown, suggestNextTask, analyzeScreenImage };
})();
