/*
 * ADHD Flow Widget — Task Manager Module
 * Copyright © 2026 jmenichole (J Chapman). All rights reserved.
 * Author: jmenichole <j.chapman7@yahoo.com>
 * GitHub: https://github.com/jmenichole
 * 
 * Unauthorized copying, distribution, or modification of this software is prohibited.
 * This software is proprietary and confidential.
 */

/* js/tasks.js — Task data layer */
'use strict';

const TaskManager = (() => {
    const KEY = 'adhd_tasks';
    const ID_KEY = 'adhd_next_id';

    const CATEGORIES = {
        work:     { label: 'Work',     icon: '💼', color: '#8b5cf6' },
        personal: { label: 'Personal', icon: '🏠', color: '#06b6d4' },
        health:   { label: 'Health',   icon: '💪', color: '#10b981' },
        learning: { label: 'Learning', icon: '📚', color: '#f59e0b' },
        social:   { label: 'Social',   icon: '👥', color: '#f43f5e' },
        other:    { label: 'Other',    icon: '📌', color: '#94a3b8' },
    };

    const PRIORITIES = {
        1: { label: 'Urgent', icon: '🔴', color: '#f43f5e' },
        2: { label: 'High',   icon: '🟠', color: '#f97316' },
        3: { label: 'Medium', icon: '🟡', color: '#f59e0b' },
        4: { label: 'Low',    icon: '🟢', color: '#10b981' },
    };

    let tasks = [];
    let nextId = 1;

    function _load() {
        try {
            tasks  = JSON.parse(localStorage.getItem(KEY) || '[]');
            nextId = parseInt(localStorage.getItem(ID_KEY) || '1', 10);
        } catch {
            tasks = []; nextId = 1;
        }
    }

    function _save() {
        localStorage.setItem(KEY, JSON.stringify(tasks));
        localStorage.setItem(ID_KEY, String(nextId));
    }

    function create(data) {
        const task = {
            id:            nextId++,
            name:          data.name          || 'Untitled Task',
            category:      data.category      || 'other',
            priority:      parseInt(data.priority || 3),
            duration:      parseInt(data.duration || 30),
            deadline:      data.deadline      || null,
            scheduledStart:data.scheduledStart|| null,
            scheduledEnd:  data.scheduledEnd  || null,
            notes:         data.notes         || '',
            subtasks:      data.subtasks      || [],
            energy:        data.energy        || 'medium',
            actionPlan:    data.actionPlan    || 'do',
            bodyDouble:    data.bodyDouble    || false,
            completed:     false,
            completedAt:   null,
            overdue:       false,
            fromCalendar:  data.fromCalendar  || false,
            createdAt:     new Date().toISOString(),
        };
        tasks.push(task);
        _save();
        return task;
    }

    function update(id, changes) {
        const i = tasks.findIndex(t => t.id === id);
        if (i < 0) return null;
        tasks[i] = Object.assign({}, tasks[i], changes);
        _save();
        return tasks[i];
    }

    function remove(id) {
        tasks = tasks.filter(t => t.id !== id);
        _save();
    }

    function complete(id) {
        return update(id, { completed: true, completedAt: new Date().toISOString() });
    }

    function getAll()       { return tasks.slice(); }
    function getPending()   { return tasks.filter(t => !t.completed); }
    function getCompleted() { return tasks.filter(t =>  t.completed); }
    function getById(id)    { return tasks.find(t => t.id === id) || null; }

    function getTodayScheduled() {
        const d0 = new Date(); d0.setHours(0,0,0,0);
        const d1 = new Date(d0); d1.setDate(d1.getDate()+1);
        return tasks.filter(t => {
            if (!t.scheduledStart) return false;
            const s = new Date(t.scheduledStart);
            return s >= d0 && s < d1;
        });
    }

    function exportJSON() {
        return JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), tasks }, null, 2);
    }

    function importJSON(str) {
        try {
            const d = JSON.parse(str);
            if (Array.isArray(d.tasks)) {
                tasks  = d.tasks;
                nextId = Math.max(0, ...tasks.map(t => t.id)) + 1;
                _save(); return true;
            }
        } catch { /* ignore */ }
        return false;
    }

    _load();

    return { create, update, remove, complete, getAll, getPending, getCompleted,
             getById, getTodayScheduled, exportJSON, importJSON, CATEGORIES, PRIORITIES };
})();
