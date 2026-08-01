/*
 * ADHD Flow Widget — Scheduler & Time-Blocking Engine
 * Copyright © 2026 jmenichole (J Chapman). All rights reserved.
 * Author: jmenichole <j.chapman7@yahoo.com>
 * GitHub: https://github.com/jmenichole
 * 
 * Unauthorized copying, distribution, or modification of this software is prohibited.
 * This software is proprietary and confidential.
 */

/* js/scheduler.js — Auto time-blocking algorithm */
'use strict';

const Scheduler = (() => {
    function _settings() {
        try { return JSON.parse(localStorage.getItem('adhd_settings') || '{}'); }
        catch { return {}; }
    }

    function _parseHHMM(str, refDate) {
        const [h, m] = (str || '09:00').split(':').map(Number);
        const d = new Date(refDate);
        d.setHours(h, m, 0, 0);
        return d;
    }

    function _roundUp15(date) {
        const ms = 15 * 60 * 1000;
        return new Date(Math.ceil(date.getTime() / ms) * ms);
    }

    function _nextWorkDayStart(date, workStart) {
        const next = new Date(date);
        next.setDate(next.getDate() + 1);
        const [h, m] = (workStart || '09:00').split(':').map(Number);
        next.setHours(h, m, 0, 0);
        return next;
    }

    /**
     * Given a list of pending tasks (with duration set), assign
     * scheduledStart / scheduledEnd to each, filling from now forward.
     */
    function autoSchedule(pendingTasks) {
        const s = _settings();
        const wStart  = s.workStart  || '09:00';
        const wEnd    = s.workEnd    || '18:00';
        const breakM  = parseInt(s.breakMins || 15);

        // Sort: tasks with deadlines first (soonest deadline first),
        // then priority ascending (1=urgent), then creation order.
        const sorted = pendingTasks
            .filter(t => t.duration > 0)
            .sort((a, b) => {
                if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
                if (a.deadline) return -1;
                if (b.deadline) return 1;
                return (a.priority || 3) - (b.priority || 3);
            });

        const now = new Date();
        let slot = _roundUp15(now);

        // Snap to work start if before it
        const todayStart = _parseHHMM(wStart, now);
        if (slot < todayStart) slot = new Date(todayStart);

        return sorted.map(task => {
            const dayEnd = _parseHHMM(wEnd, slot);

            // If we're past today's work end, move to next work day
            if (slot >= dayEnd) {
                slot = _nextWorkDayStart(slot, wStart);
            }

            const start  = new Date(slot);
            const end    = new Date(slot.getTime() + task.duration * 60000);
            const dayEnd2 = _parseHHMM(wEnd, start);

            // If task would overflow the day, push to next day
            if (end > dayEnd2) {
                slot = _nextWorkDayStart(slot, wStart);
                const s2 = new Date(slot);
                const e2 = new Date(slot.getTime() + task.duration * 60000);
                slot = new Date(e2.getTime() + breakM * 60000);
                return { ...task, scheduledStart: s2.toISOString(), scheduledEnd: e2.toISOString(), overdue: false };
            }

            slot = new Date(end.getTime() + breakM * 60000);
            return { ...task, scheduledStart: start.toISOString(), scheduledEnd: end.toISOString(), overdue: false };
        });
    }

    /** Mark tasks whose scheduledEnd has passed as overdue. */
    function checkOverdue(tasks) {
        const now = new Date();
        return tasks.map(t => ({
            ...t,
            overdue: !t.completed && !!t.scheduledEnd && new Date(t.scheduledEnd) < now,
        }));
    }

    /** Return the task that should be in focus right now. */
    function getCurrentTask(tasks) {
        const now = new Date();
        const active = tasks.find(t =>
            !t.completed && t.scheduledStart && t.scheduledEnd &&
            new Date(t.scheduledStart) <= now && new Date(t.scheduledEnd) >= now
        );
        if (active) return active;

        // Next upcoming
        return tasks
            .filter(t => !t.completed && t.scheduledStart && new Date(t.scheduledStart) > now)
            .sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart))[0]
            || tasks.filter(t => !t.completed)[0]
            || null;
    }

    return { autoSchedule, checkOverdue, getCurrentTask };
})();
