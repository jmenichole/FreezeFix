/*
 * ADHD Flow Widget — History & Streak Manager
 * Copyright © 2026 jmenichole (J Chapman). All rights reserved.
 * Author: jmenichole <j.chapman7@yahoo.com>
 * GitHub: https://github.com/jmenichole
 * 
 * Unauthorized copying, distribution, or modification of this software is prohibited.
 * This software is proprietary and confidential.
 */

/* js/history.js — Completion history & streaks */
'use strict';

const HistoryManager = (() => {
    const KEY = 'adhd_history';
    let log = [];

    function _load() {
        try { log = JSON.parse(localStorage.getItem(KEY) || '[]'); }
        catch { log = []; }
    }

    function _save() { localStorage.setItem(KEY, JSON.stringify(log)); }

    function logCompletion(task) {
        const now = new Date();
        log.push({
            taskId:          task.id,
            taskName:        task.name,
            category:        task.category,
            plannedDuration: task.duration,
            completedAt:     now.toISOString(),
            dateStr:         now.toDateString(),
        });
        _save();
    }

    function getStreak() {
        if (!log.length) return 0;
        const dates = new Set(log.map(e => e.dateStr));
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            if (dates.has(d.toDateString())) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }
        return streak;
    }

    function getCompletedToday() {
        const t = new Date().toDateString();
        return log.filter(e => e.dateStr === t).length;
    }

    function getWeeklySummary() {
        const today = new Date();
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() - (6 - i));
            const ds = d.toDateString();
            const entries = log.filter(e => e.dateStr === ds);
            return {
                date:    d,
                label:   d.toLocaleDateString('en-US', { weekday: 'short' }),
                count:   entries.length,
                tasks:   entries.map(e => e.taskName),
                isToday: ds === today.toDateString(),
            };
        });
    }

    function getAll() { return log.slice().reverse(); }

    _load();
    return { logCompletion, getStreak, getCompletedToday, getWeeklySummary, getAll };
})();
