/*
 * ADHD Flow Widget — Task Breakdown Module
 * Copyright © 2026 jmenichole (J Chapman). All rights reserved.
 * Author: jmenichole <j.chapman7@yahoo.com>
 * GitHub: https://github.com/jmenichole
 * 
 * Unauthorized copying, distribution, or modification of this software is prohibited.
 * This software is proprietary and confidential.
 */

/* js/breakdown.js — Local heuristic task breakdown (Goblin.tools style) */
'use strict';

const TaskBreakdown = (() => {
    const TEMPLATES = [
        {
            keywords: ['clean', 'tidy', 'room', 'house', 'dishes', 'laundry', 'declutter'],
            steps: [
                { name: 'Gather all supplies needed (trash bag, basket, cleaners)', duration: 5 },
                { name: 'Remove all obvious trash and throw it away', duration: 10 },
                { name: 'Put dishes in sink or dishwasher', duration: 10 },
                { name: 'Gather loose clothes and put in hamper or closet', duration: 10 },
                { name: 'Wipe down primary surfaces (desk, counters, tables)', duration: 10 },
                { name: 'Quick sweep or vacuum high-traffic area', duration: 10 }
            ]
        },
        {
            keywords: ['email', 'inbox', 'message', 'write', 'reply', 'respond', 'contact'],
            steps: [
                { name: 'Open email client and filter for unread/important', duration: 5 },
                { name: 'Draft main points in 2-3 quick bullet points', duration: 5 },
                { name: 'Write clear, concise draft without overthinking', duration: 10 },
                { name: 'Proofread for tone and attachments', duration: 5 },
                { name: 'Hit send & archive/file conversation', duration: 2 }
            ]
        },
        {
            keywords: ['study', 'read', 'chapter', 'homework', 'assignment', 'learn', 'research', 'article'],
            steps: [
                { name: 'Clear workspace of distractions & grab notebook/pen', duration: 5 },
                { name: 'Skim headings, bold text, and summary first', duration: 5 },
                { name: 'Read section 1 and write 2 key takeaways', duration: 15 },
                { name: 'Read section 2 and write key takeaways', duration: 15 },
                { name: 'Review notes and summarize in your own words', duration: 10 }
            ]
        },
        {
            keywords: ['code', 'build', 'bug', 'fix', 'develop', 'app', 'script', 'project', 'program'],
            steps: [
                { name: 'Write down exact goal/spec in 1 sentence', duration: 5 },
                { name: 'Identify exact file(s) or functions affected', duration: 5 },
                { name: 'Write pseudo-code or outline implementation', duration: 10 },
                { name: 'Build minimal testable slice of feature', duration: 20 },
                { name: 'Run tests / verify expected behavior', duration: 10 },
                { name: 'Refactor and commit clean code', duration: 10 }
            ]
        },
        {
            keywords: ['call', 'doctor', 'appointment', 'schedule', 'book', 'pay', 'bill', 'form', 'tax'],
            steps: [
                { name: 'Find required account/phone numbers & documents', duration: 5 },
                { name: 'Write down key information/questions to ask', duration: 5 },
                { name: 'Make call or open portal', duration: 10 },
                { name: 'Complete transaction or confirm appointment time', duration: 10 },
                { name: 'Note date/time in calendar and file receipt', duration: 5 }
            ]
        }
    ];

    function getLocalBreakdown(taskName, taskDuration = 30) {
        const lower = taskName.toLowerCase();
        for (let tmpl of TEMPLATES) {
            if (tmpl.keywords.some(kw => lower.includes(kw))) {
                return tmpl.steps;
            }
        }

        // Generic fallback breakdown if no keyword matches
        const stepDur = Math.max(5, Math.round(taskDuration / 4));
        return [
            { name: `Prepare materials and open tools for "${taskName}"`, duration: 5 },
            { name: `Execute first action step of "${taskName}"`, duration: stepDur },
            { name: `Continue core work and complete main body of task`, duration: stepDur },
            { name: `Review work, fix any small issues, and finalize`, duration: 5 }
        ];
    }

    return { getLocalBreakdown };
})();
