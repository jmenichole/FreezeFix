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

    async function callGemini(prompt) {
        const { gemini } = getKeys();
        if (!gemini) throw new Error('NO_GEMINI_KEY');

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${gemini}`;
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!resp.ok) throw new Error(`GEMINI_ERROR_${resp.status}`);
        const data = await resp.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    async function callAI(prompt) {
        const { groq, gemini } = getKeys();
        if (groq) {
            try { return await callGroq(prompt); }
            catch (err) { console.warn('Groq failed, trying Gemini if available', err); }
        }
        if (gemini) {
            try { return await callGemini(prompt); }
            catch (err) { console.warn('Gemini failed', err); }
        }
        throw new Error('NO_WORKING_AI');
    }

    async function generateTaskBreakdown(taskName) {
        const prompt = `You are an empathetic, practical ADHD executive dysfunction coach (similar to Goblin.tools Magic ToDo).
Take this real-world task: "${taskName}".
Break it down into 3-5 concrete, physical, low-friction micro-steps that an overwhelmed person can actually do right now.
RULES:
1. Use real physical verbs (e.g. "Grab cat treats", "Step to the door", "Open the dishwasher").
2. NEVER use generic or corporate phrases like "Prepare materials", "Execute first action", "Continue core work", or "Review and finalize".
3. Keep durations short (1-10 minutes per step).
4. Return ONLY a valid JSON array of objects with keys "name" (string) and "duration" (number of minutes).
Example: [{"name": "Grab a favorite treat bag to shake", "duration": 2}]`;

        try {
            const text = await callAI(prompt);
            const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (match) {
                const steps = JSON.parse(match[0]);
                if (Array.isArray(steps) && steps.length > 0) {
                    return steps;
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
            return await callAI(prompt);
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

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${gemini}`;
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: "Analyze this screen screenshot. What task or project is the user working on? Extract 1-3 immediate low-friction micro-tasks for them to do next. Format as 2-3 warm, clear bullet points." },
                        { inline_data: { mime_type: "image/jpeg", data: b64Image } }
                    ]
                }]
            })
        });

        if (!resp.ok) throw new Error(`GEMINI_VISION_ERROR_${resp.status}`);
        const data = await resp.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No task identified from screen.';
    }

    return { getKeys, generateTaskBreakdown, suggestNextTask, analyzeScreenImage };
})();
