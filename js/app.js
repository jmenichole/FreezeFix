/*
 * ADHD Flow Widget — Main Application Controller & UI Engine
 * Copyright © 2026 jmenichole (J Chapman). All rights reserved.
 * Author: jmenichole <j.chapman7@yahoo.com>
 * GitHub: https://github.com/jmenichole
 * 
 * Unauthorized copying, distribution, or modification of this software is prohibited.
 * This software is proprietary and confidential.
 */

/* js/app.js — Core Controller & UI Binder */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // ── Elements ──
    const elClock         = document.getElementById('clock');
    const elClockDate     = document.getElementById('clock-date');
    const elGreeting      = document.getElementById('greeting');
    const elTodayLabel    = document.getElementById('today-label');
    const elTimeline      = document.getElementById('timeline');
    const elTaskList      = document.getElementById('task-list');
    const elWeekGrid      = document.getElementById('week-grid');

    const elNextName      = document.getElementById('next-task-name');
    const elNextMeta      = document.getElementById('next-task-meta');
    const elBtnStartFocus = document.getElementById('btn-start-focus');
    const elBtnBodyDouble = document.getElementById('btn-body-double');
    const elBtnMarkDone   = document.getElementById('btn-mark-done');
    const elBtnGoodEnough = document.getElementById('btn-good-enough');
    const elBtnSkipTask   = document.getElementById('btn-skip-task');

    const elTimerDisplay  = document.getElementById('timer-display');
    const elTimerLabel    = document.getElementById('timer-label');
    const elTimerProgress = document.getElementById('timer-ring-progress');
    const elBtnTimerToggle= document.getElementById('btn-timer-toggle');
    const elBtnTimerReset = document.getElementById('btn-timer-reset');

    const elBrainInput    = document.getElementById('brain-dump-input');
    const elBtnBrainAdd   = document.getElementById('btn-brain-add');
    const elBtnWhatsNext  = document.getElementById('btn-whats-next');
    const elAiResponse    = document.getElementById('ai-response');

    const elStreakNum     = document.getElementById('streak-num');
    const elDoneToday     = document.getElementById('done-today');
    const elTasksLeft     = document.getElementById('tasks-left');

    const elModalTask     = document.getElementById('modal-task');
    const elTaskForm      = document.getElementById('task-form');
    const elModalBreakdown= document.getElementById('modal-breakdown');
    const elModalSettings = document.getElementById('modal-settings');
    const elModalHistory  = document.getElementById('modal-history');

    // ── State ──
    let activeFilter = 'pending';
    let activeEnergyFilter = 'all';
    let currentFocusTask = null;
    let timerMins = 25;
    let timerSecsLeft = 25 * 60;
    let timerTotalSecs = 25 * 60;
    let timerInterval = null;
    let isTimerRunning = false;
    let currentBreakdownSteps = [];
    let currentBreakdownTaskName = '';
    // Tasks the user "skipped" this session so getCurrentTask advances past them.
    const skippedIds = new Set();

    // ── Initialization ──
    initClock();
    renderAll();
    setInterval(updateClock, 1000);
    setInterval(renderTimelineNowLine, 60000);

    // Enhance settings checkbox visuals: toggle parent label.checked when inputs change
    document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach(inp => {
        const parent = inp.parentElement;
        if (inp.checked) parent.classList.add('checked');
        inp.addEventListener('change', () => {
            if (inp.checked) parent.classList.add('checked'); else parent.classList.remove('checked');
        });
    });

    // Estimate task duration heuristics
    function estimateDuration(taskName) {
        if (!taskName) return 20;
        const n = taskName.toLowerCase();
        const quick = ['email','reply','buy','call','pay','open','file','note','read headline','read'];
        const medium = ['write','draft','study','research','plan','organize','review','test'];
        const long = ['code','implement','build','project','design','refactor','debug'];
        if (quick.some(k => n.includes(k))) return 10;
        if (medium.some(k => n.includes(k))) return 25;
        if (long.some(k => n.includes(k))) return 60;
        return 20;
    }

    // Header used to authenticate requests to the local tracker sidecar.
    // The token is injected into the renderer's env by main.js (nodeIntegration).
    function trackerHeaders() {
        try {
            const token = (typeof process !== 'undefined' && process.env)
                ? process.env.FREEZEFIX_TRACKER_TOKEN : '';
            return token ? { 'X-FreezeFix-Token': token } : {};
        } catch (e) {
            return {};
        }
    }

    // Open add-task modal prefilled (used by Brain Dump)
    function openAddTaskModal(prefillName, prefillDuration) {
        openEditTaskModal(null);
        document.getElementById('tf-name').value = prefillName || '';
        document.getElementById('tf-duration').value = prefillDuration || 20;
        elModalTask.classList.remove('hidden');
    }

    // ── Clock & Greetings ──
    function initClock() {
        updateClock();
        const now = new Date();
        elTodayLabel.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }

    function updateClock() {
        const now = new Date();
        let hours = now.getHours();
        const mins = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // convert 0 to 12
        const hrsStr = String(hours).padStart(2, '0');
        
        elClock.textContent = `${hrsStr}:${mins} ${ampm}`;
        elClockDate.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

        const hour = now.getHours();
        let greeting = '🌙 Rest up & unwind';
        if (hour >= 5 && hour < 12) greeting = '🌅 Good morning! Ready for a fresh start?';
        else if (hour >= 12 && hour < 17) greeting = '☀️ Good afternoon! Stay in your flow';
        else if (hour >= 17 && hour < 22) greeting = '🌆 Evening session — wrap up strong';
        elGreeting.textContent = greeting;
    }

    // ── Render Controller ──
    function renderAll() {
        const allTasks = TaskManager.getAll();

        renderTimeline(allTasks);
        renderTaskList();
        renderWeekGrid();
        renderNextTaskCard();
        renderStats();
    }

    // ── Timeline Rendering ──
    function renderTimeline(tasks) {
        elTimeline.innerHTML = '';
        const startHour = 7;
        const endHour = 22;
        const totalHours = endHour - startHour;
        const hourHeight = 44;
        elTimeline.style.height = `${totalHours * hourHeight}px`;

        // Render Hour lines & labels
        for (let i = 0; i <= totalHours; i++) {
            const h = startHour + i;
            const y = i * hourHeight;

            const lbl = document.createElement('div');
            lbl.className = 'time-label';
            lbl.style.top = `${y - 6}px`;
            lbl.textContent = `${h % 12 || 12}${h >= 12 ? 'p' : 'a'}`;
            elTimeline.appendChild(lbl);

            const line = document.createElement('div');
            line.className = 'hour-line';
            line.style.top = `${y}px`;
            elTimeline.appendChild(line);
        }

        renderTimelineNowLine();

        // Render Scheduled Tasks — only those scheduled for *today* (this timeline
        // shows a single day, positioned by time-of-day).
        const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
        const scheduled = tasks.filter(t => {
            if (!t.scheduledStart || !t.scheduledEnd) return false;
            const s = new Date(t.scheduledStart);
            return s >= dayStart && s < dayEnd;
        });
        scheduled.forEach(task => {
            const s = new Date(task.scheduledStart);
            const e = new Date(task.scheduledEnd);

            const startMins = s.getHours() * 60 + s.getMinutes();
            const endMins = e.getHours() * 60 + e.getMinutes();

            const topY = ((startMins - startHour * 60) / 60) * hourHeight;
            const height = Math.max(22, ((endMins - startMins) / 60) * hourHeight);

            if (topY >= 0 && topY <= totalHours * hourHeight) {
                const block = document.createElement('div');
                block.className = `task-block ${task.overdue ? 'overdue' : ''}`;
                block.dataset.cat = task.category;
                block.style.top = `${topY}px`;
                block.style.height = `${height}px`;

                block.innerHTML = `
                    <div class="task-block-name">${escapeHtml(task.name)}</div>
                    <div class="task-block-dur">${escapeHtml(task.duration)}m</div>
                `;
                block.title = `${task.name} (${s.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - ${e.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})})`;
                block.onclick = () => openEditTaskModal(task);
                elTimeline.appendChild(block);
            }
        });
    }

    function renderTimelineNowLine() {
        const existing = elTimeline.querySelector('.time-now-line');
        if (existing) existing.remove();

        const now = new Date();
        const startHour = 7;
        const hourHeight = 44;
        const mins = now.getHours() * 60 + now.getMinutes();
        const y = ((mins - startHour * 60) / 60) * hourHeight;

        if (y >= 0 && y <= (22 - startHour) * hourHeight) {
            const line = document.createElement('div');
            line.className = 'time-now-line';
            line.style.top = `${y}px`;
            elTimeline.appendChild(line);
        }
    }

    // ── Task List Rendering ──
    function renderTaskList() {
        elTaskList.innerHTML = '';
        let list = [];
        if (activeFilter === 'pending') list = TaskManager.getPending();
        else if (activeFilter === 'today') list = TaskManager.getTodayScheduled();
        else list = TaskManager.getAll();

        if (activeEnergyFilter !== 'all') {
            list = list.filter(task => task.energy === activeEnergyFilter);
        }

        if (list.length === 0) {
            elTaskList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">✨</div>
                    <div>No tasks here right now!</div>
                </div>`;
            return;
        }

        list.forEach(task => {
            const item = document.createElement('div');
            item.className = `task-item ${task.completed ? 'completed' : ''} ${task.overdue ? 'overdue' : ''}`;
            item.dataset.cat = task.category;
            item.dataset.id = task.id;

            const catInfo = TaskManager.CATEGORIES[task.category] || TaskManager.CATEGORIES.other;
            const priInfo = TaskManager.PRIORITIES[task.priority] || TaskManager.PRIORITIES[3];

            item.innerHTML = `
                <div class="task-check ${task.completed ? 'checked' : ''}" data-action="toggle">
                    ${task.completed ? '✓' : ''}
                </div>
                <div class="task-content">
                    <div class="task-name">${escapeHtml(task.name)}</div>
                    <div class="task-meta">
                        <span class="task-cat cat-${task.category}">${catInfo.icon} ${catInfo.label}</span>
                        <span class="task-pri">${priInfo.icon}</span>
                        <span class="task-energy">${task.energy === 'high' ? '⚡ High' : task.energy === 'low' ? '🍃 Low' : '🌤 Medium'}</span>
                        <span class="task-plan ${task.actionPlan}">${task.actionPlan === 'delegate' ? '🤝 Delegate' : task.actionPlan === 'delete' ? '🗑 Delete' : '✅ Do'}</span>
                        <span class="task-dur">⏱ ${escapeHtml(task.duration)}m</span>
                        ${task.bodyDouble ? '<span class="task-bodydouble" title="Marked for accountability or coworking support">👥 Body-double</span>' : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="icon-btn" title="Magic Breakdown" data-action="breakdown">🪄</button>
                    <button class="icon-btn" title="Mark for body doubling" data-action="bodydouble">👥</button>
                    <button class="icon-btn" title="Edit" data-action="edit">✏️</button>
                    <button class="icon-btn" title="Delete" data-action="delete">🗑</button>
                </div>
            `;
            elTaskList.appendChild(item);
        });
    }

    // ── Week Grid Rendering ──
    function renderWeekGrid() {
        if (!elWeekGrid) return;
        elWeekGrid.innerHTML = '';
        const summary = HistoryManager.getWeeklySummary();
        summary.forEach(day => {
            const cell = document.createElement('div');
            cell.className = `week-day ${day.isToday ? 'today' : ''}`;
            cell.innerHTML = `
                <div class="week-day-label">${day.label}</div>
                <div class="week-day-num">${day.date.getDate()}</div>
                <div class="week-dots">
                    ${Array.from({ length: Math.min(5, day.count) }).map(() => `<span class="dot dot-done">●</span>`).join('')}
                </div>
            `;
            elWeekGrid.appendChild(cell);
        });
    }

    // ── Next Task Card ──
    function renderNextTaskCard() {
        const pending = TaskManager.getPending().filter(t => !skippedIds.has(t.id));
        currentFocusTask = Scheduler.getCurrentTask(pending);

        if (!currentFocusTask) {
            elNextName.textContent = "🎉 All done! Ready for a break or a new task.";
            elNextMeta.textContent = "";
            const elBtnNowBreakdown = document.getElementById('btn-now-breakdown');
            if (elBtnStartFocus) elBtnStartFocus.style.display = "none";
            if (elBtnNowBreakdown) elBtnNowBreakdown.style.display = "none";
            if (elBtnMarkDone) elBtnMarkDone.style.display = "none";
            if (elBtnGoodEnough) elBtnGoodEnough.style.display = "none";
            if (elBtnSkipTask) elBtnSkipTask.style.display = "none";
            return;
        }

        elNextName.textContent = currentFocusTask.name;
        const catInfo = TaskManager.CATEGORIES[currentFocusTask.category] || TaskManager.CATEGORIES.other;
        elNextMeta.textContent = `${catInfo.icon} ${catInfo.label} • ⏱ ${currentFocusTask.duration} minutes`;

        const elBtnNowBreakdown = document.getElementById('btn-now-breakdown');
        if (elBtnStartFocus) elBtnStartFocus.style.display = "inline-flex";
        if (elBtnNowBreakdown) elBtnNowBreakdown.style.display = "inline-flex";
        if (elBtnBodyDouble) elBtnBodyDouble.style.display = "inline-flex";
        if (elBtnMarkDone) elBtnMarkDone.style.display = "inline-flex";
        if (elBtnGoodEnough) elBtnGoodEnough.style.display = "inline-flex";
        if (elBtnSkipTask) elBtnSkipTask.style.display = "inline-flex";

        // Update NEXT UP peek card (PMC8733412 / OT schedule visual sequencing)
        const elUpcomingName = document.getElementById('upcoming-task-name');
        const elUpcomingMeta = document.getElementById('upcoming-task-meta');
        const remaining = pending.filter(t => t.id !== currentFocusTask.id);
        if (remaining.length > 0) {
            const nextT = remaining[0];
            const nextCat = TaskManager.CATEGORIES[nextT.category] || TaskManager.CATEGORIES.other;
            if (elUpcomingName) elUpcomingName.textContent = nextT.name;
            if (elUpcomingMeta) elUpcomingMeta.textContent = `${nextCat.icon} • ⏱ ${nextT.duration}m`;
        } else {
            if (elUpcomingName) elUpcomingName.textContent = "No upcoming tasks — enjoy your break! ☕";
            if (elUpcomingMeta) elUpcomingMeta.textContent = "";
        }
    }

    // ── Stats Bar ──
    function renderStats() {
        if (elStreakNum) elStreakNum.textContent = HistoryManager.getStreak();
        if (elDoneToday) elDoneToday.textContent = HistoryManager.getCompletedToday();
        if (elTasksLeft) elTasksLeft.textContent = TaskManager.getPending().length;
    }

    // ── Global Actions ──
    window.toggleComplete = function(id) {
        const task = TaskManager.getById(id);
        if (!task) return;
        if (!task.completed) {
            TaskManager.complete(id);
            HistoryManager.logCompletion(task);
            triggerCelebration(task.name);
            // A completed task means real progress — resurface any skipped tasks.
            skippedIds.clear();
        } else {
            TaskManager.update(id, { completed: false, completedAt: null });
        }
        renderAll();
    };

    window.toggleBodyDouble = function(id) {
        const task = TaskManager.getById(id);
        if (!task) return;
        TaskManager.update(id, { bodyDouble: !task.bodyDouble });
        showToast(task.bodyDouble ? 'Body double removed' : 'Marked for body doubling');
        renderAll();
    };

    window.deleteTask = function(id) {
        TaskManager.remove(id);
        showToast('Task removed');
        renderAll();
    };

    window.openEditTaskModalById = function(id) {
        const t = TaskManager.getById(id);
        if (t) openEditTaskModal(t);
    };

    function openEditTaskModal(task = null) {
        document.getElementById('task-modal-title').textContent = task ? 'Edit Task' : 'Add Task';
        elTaskForm.reset();
        elTaskForm.dataset.editId = task ? task.id : '';

        if (task) {
            document.getElementById('tf-name').value = task.name;
            document.getElementById('tf-duration').value = task.duration;
            document.getElementById('tf-priority').value = task.priority;
            document.getElementById('tf-category').value = task.category;
            document.getElementById('tf-energy').value = task.energy || 'medium';
            document.getElementById('tf-decision').value = task.actionPlan || 'do';
            document.getElementById('tf-deadline').value = task.deadline || '';
            document.getElementById('tf-scheduled').value = task.scheduledStart || '';
            document.getElementById('tf-notes').value = task.notes || '';
        } else {
            document.getElementById('tf-energy').value = 'medium';
            document.getElementById('tf-decision').value = 'do';
        }
        elModalTask.classList.remove('hidden');
    }

    // ── Form Submissions ──
    elTaskForm.onsubmit = (e) => {
        e.preventDefault();
        const editId = elTaskForm.dataset.editId;
        const data = {
            name: document.getElementById('tf-name').value,
            duration: parseInt(document.getElementById('tf-duration').value || 30),
            priority: parseInt(document.getElementById('tf-priority').value || 3),
            category: document.getElementById('tf-category').value,
            energy: document.getElementById('tf-energy').value || 'medium',
            actionPlan: document.getElementById('tf-decision').value || 'do',
            deadline: document.getElementById('tf-deadline').value || null,
            scheduledStart: document.getElementById('tf-scheduled').value || null,
            notes: document.getElementById('tf-notes').value,
        };

        if (editId) {
            TaskManager.update(parseInt(editId), data);
            showToast('Task updated');
        } else {
            TaskManager.create(data);
            showToast('Task added! 🎯');
        }

        elModalTask.classList.add('hidden');
        renderAll();
    };

    // ── Brain Dump (Instant Frictionless Capture) ──
    function handleBrainDump() {
        const text = elBrainInput.value.trim();
        if (!text) {
            elBrainInput.focus();
            return;
        }
        const est = estimateDuration(text) || 15;
        
        // Directly create the task for instant unfreezing (PMC12289795)
        TaskManager.create({
            name: text,
            duration: est,
            priority: 3,
            category: 'other',
            energy: 'medium',
            decision: 'do',
            scheduledStart: new Date().toISOString()
        });

        elBrainInput.value = '';
        showToast(`⚡ Captured: "${text}" (${est}m)`);
        renderAll();
    }
    elBtnBrainAdd.onclick = handleBrainDump;
    elBrainInput.onkeydown = (e) => { if (e.key === 'Enter') handleBrainDump(); };

    // ── Auto Scheduler ──
    document.getElementById('btn-auto-schedule').onclick = () => {
        const pending = TaskManager.getPending();
        const scheduled = Scheduler.autoSchedule(pending);
        scheduled.forEach(t => TaskManager.update(t.id, { scheduledStart: t.scheduledStart, scheduledEnd: t.scheduledEnd }));
        showToast('Auto-scheduled all tasks! ⚡');
        renderAll();
    };

    document.getElementById('btn-reschedule').onclick = () => {
        const pending = TaskManager.getPending();
        const checked = Scheduler.checkOverdue(pending);
        const overdueTasks = checked.filter(t => t.overdue);
        if (!overdueTasks.length) {
            showToast('No overdue tasks to reschedule! ✨');
            return;
        }
        const rescheduled = Scheduler.autoSchedule(overdueTasks);
        rescheduled.forEach(t => TaskManager.update(t.id, { scheduledStart: t.scheduledStart, scheduledEnd: t.scheduledEnd, overdue: false }));
        showToast('Overdue tasks rescheduled forward 🔄');
        renderAll();
    };

    // ── Focus & Timer Controls ──
    elBtnStartFocus.onclick = () => {
        if (!currentFocusTask) return;
        setTimerMinutes(currentFocusTask.duration);
        startTimer();
        showToast(`Focus mode started for "${currentFocusTask.name}" 🎯`);
    };

    if (elBtnBodyDouble) {
        elBtnBodyDouble.onclick = () => {
            if (!currentFocusTask) return;
            TaskManager.update(currentFocusTask.id, { bodyDouble: !currentFocusTask.bodyDouble });
            showToast(currentFocusTask.bodyDouble ? 'Body double removed for current task' : 'Marked current task for body doubling');
            renderAll();
        };
    }

    elBtnMarkDone.onclick = () => {
        if (!currentFocusTask) return;
        toggleComplete(currentFocusTask.id);
    };

    elBtnGoodEnough.onclick = () => {
        if (!currentFocusTask) return;
        showToast('👍 "Good Enough" is finished! Progress logged.');
        toggleComplete(currentFocusTask.id);
    };

    elBtnSkipTask.onclick = () => {
        if (currentFocusTask) skippedIds.add(currentFocusTask.id);
        showToast('Skipped to next task →');
        renderAll();
    };

    // ── Timer Logic ──
    function setTimerMinutes(mins) {
        timerMins = mins;
        timerTotalSecs = mins * 60;
        timerSecsLeft = timerTotalSecs;
        updateTimerDisplay();
    }

    function updateTimerDisplay() {
        const m = String(Math.floor(timerSecsLeft / 60)).padStart(2, '0');
        const s = String(timerSecsLeft % 60).padStart(2, '0');
        elTimerDisplay.textContent = `${m}:${s}`;

        const circumference = 2 * Math.PI * 52;
        const offset = circumference - (timerSecsLeft / timerTotalSecs) * circumference;
        elTimerProgress.style.strokeDasharray = circumference;
        elTimerProgress.style.strokeDashoffset = offset;
    }

    function startTimer() {
        if (isTimerRunning) return;
        isTimerRunning = true;
        elBtnTimerToggle.textContent = '⏸';
        timerInterval = setInterval(() => {
            if (timerSecsLeft > 0) {
                timerSecsLeft--;
                updateTimerDisplay();
            } else {
                pauseTimer();
                showToast('🔔 Time is up! Great work!');
            }
        }, 1000);
    }

    function pauseTimer() {
        isTimerRunning = false;
        elBtnTimerToggle.textContent = '▶';
        clearInterval(timerInterval);
    }

    elBtnTimerToggle.onclick = () => {
        if (isTimerRunning) pauseTimer();
        else startTimer();
    };

    elBtnTimerReset.onclick = () => {
        pauseTimer();
        timerSecsLeft = timerTotalSecs;
        updateTimerDisplay();
    };

    document.querySelectorAll('.mode-chip').forEach(chip => {
        chip.onclick = () => {
            document.querySelectorAll('.mode-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const mins = parseInt(chip.dataset.min);
            elTimerLabel.textContent = chip.dataset.label;
            pauseTimer();
            setTimerMinutes(mins);
        };
    });

    // ── Breakdown Modal & AI ──
    async function showTaskBreakdown(taskName) {
        if (!taskName) {
            showToast('Enter a task name first to break it down.');
            return;
        }
        currentBreakdownTaskName = taskName;
        document.getElementById('breakdown-task-title').textContent = `Task: ${taskName}`;
        const elList = document.getElementById('breakdown-steps');
        const elLoading = document.getElementById('breakdown-loading');

        elList.innerHTML = '';
        elLoading.classList.remove('hidden');
        elModalBreakdown.classList.remove('hidden');

        currentBreakdownSteps = await AIHelper.generateTaskBreakdown(taskName);
        elLoading.classList.add('hidden');

        if (!currentBreakdownSteps || !currentBreakdownSteps.length) {
            elList.innerHTML = '<div class="empty-state">No breakdown available yet. Try a simpler task description or add your task first.</div>';
            return;
        }
        renderBreakdownSteps();
    }

    window.startBreakdown = async function(id) {
        const task = TaskManager.getById(id);
        if (!task) return;
        await showTaskBreakdown(task.name);
    };

    const elBtnNowBreakdown = document.getElementById('btn-now-breakdown');
    if (elBtnNowBreakdown) {
        elBtnNowBreakdown.onclick = async () => {
            if (!currentFocusTask) return;
            await showTaskBreakdown(currentFocusTask.name);
        };
    }
    const elBtnBreakdownFromModal = document.getElementById('btn-breakdown-from-modal');
    if (elBtnBreakdownFromModal) {
        elBtnBreakdownFromModal.onclick = async () => {
            const editId = elTaskForm.dataset.editId;
            const taskName = document.getElementById('tf-name').value.trim();
            if (!taskName) {
                showToast('Enter a task name first to break it down.');
                return;
            }
            if (editId) {
                const task = TaskManager.getById(parseInt(editId, 10));
                if (task) {
                    await showTaskBreakdown(task.name);
                    return;
                }
            }
            await showTaskBreakdown(taskName);
        };
    }

    const elBtnBreakdownRetry = document.getElementById('btn-breakdown-retry');
    if (elBtnBreakdownRetry) {
        elBtnBreakdownRetry.onclick = async () => {
            if (!currentBreakdownTaskName) {
                showToast('No task selected for breakdown yet.');
                return;
            }
            await showTaskBreakdown(currentBreakdownTaskName);
        };
    }

    function renderBreakdownSteps() {
        const elList = document.getElementById('breakdown-steps');
        elList.innerHTML = '';
        currentBreakdownSteps.forEach((step, idx) => {
            const item = document.createElement('div');
            item.className = 'breakdown-step';
            item.innerHTML = `
                <div class="step-num">${idx + 1}</div>
                <div style="flex:1">
                    <div class="step-name">${escapeHtml(step.name)}</div>
                    <div class="step-duration">⏱ ${escapeHtml(step.duration)} mins</div>
                </div>
            `;
            elList.appendChild(item);
        });
    }

    document.getElementById('btn-breakdown-add-all').onclick = () => {
        currentBreakdownSteps.forEach(step => {
            TaskManager.create({ name: step.name, duration: step.duration, category: 'work', priority: 3 });
        });
        elModalBreakdown.classList.add('hidden');
        showToast(`Added ${currentBreakdownSteps.length} micro-steps! 🪄`);
        renderAll();
    };

    elBtnWhatsNext.onclick = async () => {
        elAiResponse.classList.remove('hidden');
        elAiResponse.textContent = "Thinking...";
        const pending = TaskManager.getPending();
        const advice = await AIHelper.suggestNextTask(pending, HistoryManager.getStreak());
        elAiResponse.innerHTML = escapeHtml(advice).replace(/\n/g, '<br>');
        if (!pending.length && elBrainInput) {
            elBrainInput.focus();
        }
    };

    const elBtnScanScreen = document.getElementById('btn-scan-screen');
    if (elBtnScanScreen) {
        elBtnScanScreen.onclick = async () => {
            elAiResponse.classList.remove('hidden');
            elAiResponse.textContent = "📸 Snapping screen & analyzing with Vision AI...";

            // Chrome Extension native tab capture (zero-install, zero-python)
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({ action: 'capture_active_tab' }, async (response) => {
                    if (chrome.runtime && chrome.runtime.lastError) {
                        elAiResponse.textContent = "⚠️ Tab capture note: " + chrome.runtime.lastError.message;
                        return;
                    }
                    if (response && response.success && response.dataUrl) {
                        const b64 = response.dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
                        const analysis = await AIHelper.analyzeScreenImage(b64);
                        elAiResponse.innerHTML = `<strong>📸 Active Tab Analysis:</strong><br>` + escapeHtml(analysis).replace(/\n/g, '<br>');
                    } else if (response && response.error) {
                        elAiResponse.textContent = "⚠️ Tab capture: " + response.error;
                    }
                });
                return;
            }

            try {
                const resp = await fetch('http://localhost:8999/capture', { headers: trackerHeaders() });
                const data = await resp.json();
                if (data.status === 'ok' && data.image) {
                    const analysis = await AIHelper.analyzeScreenImage(data.image);
                    elAiResponse.innerHTML = `<strong>📸 Screen Analysis:</strong><br>` + escapeHtml(analysis).replace(/\n/g, '<br>');
                } else {
                    elAiResponse.textContent = "⚠️ Tracker script not running. Start tracker.py on your machine to use Screen Vision!";
                }
            } catch (err) {
                elAiResponse.innerHTML = "💡 <em>To enable Screen Vision:</em> run <code>python tracker.py</code> on your computer!";
            }
        };
    }

    // GitHub import removed — button and connector were removed by user request.
    // If desired later, re-add a lightweight public-activity importer that only runs on user action.

    // ── Task list interactions (delegated; CSP-safe, no inline handlers) ──
    elTaskList.addEventListener('click', (e) => {
        const itemEl = e.target.closest('.task-item');
        if (!itemEl) return;
        const id = parseInt(itemEl.dataset.id, 10);
        const actionEl = e.target.closest('[data-action]');
        if (actionEl) {
            e.stopPropagation();
            switch (actionEl.dataset.action) {
                case 'toggle':     window.toggleComplete(id); break;
                case 'breakdown':  window.startBreakdown(id); break;
                case 'bodydouble': window.toggleBodyDouble(id); break;
                case 'edit':       window.openEditTaskModalById(id); break;
                case 'delete':     window.deleteTask(id); break;
            }
            return;
        }
        openEditTaskModal(TaskManager.getById(id));
    });

    // ── Filters & Modals ──
    document.querySelectorAll('#task-filters .chip').forEach(chip => {
        chip.onclick = () => {
            document.querySelectorAll('#task-filters .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.dataset.filter;
            renderTaskList();
        };
    });

    document.querySelectorAll('#energy-filters .chip').forEach(chip => {
        chip.onclick = () => {
            document.querySelectorAll('#energy-filters .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeEnergyFilter = chip.dataset.energy;
            renderTaskList();
        };
    });

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.onclick = () => {
            document.getElementById(btn.dataset.close).classList.add('hidden');
        };
    });

    document.getElementById('btn-add-task').onclick = () => openEditTaskModal();
    document.getElementById('btn-add-block').onclick = () => openEditTaskModal();

    // ── Toast & Celebration ──
    function showToast(msg) {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.classList.remove('hidden');
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 300);
        }, 3000);
    }

    // Electron helper: show toast from main process events (tray/global hotkey)
    try {
        const { ipcRenderer } = require('electron');
        ipcRenderer.on('show-toast', (event, message) => {
            if (message) showToast(message);
        });
    } catch (e) {
        // Not running in Electron
    }

    function triggerCelebration(taskName) {
        const overlay = document.getElementById('celebration-overlay');
        const msg = document.getElementById('celebration-message');
        const container = document.getElementById('confetti-container');

        const phrases = ['BOOM! Task Crushed! 🔥', 'Dopamine Unlocked! ✨', 'You Are Unstoppable! 🚀', 'Awesome Work! 🌟'];
        msg.textContent = `${phrases[Math.floor(Math.random() * phrases.length)]}\n"${taskName}"`;

        container.innerHTML = '';
        for (let i = 0; i < 40; i++) {
            const p = document.createElement('div');
            p.className = 'confetti-piece';
            p.style.left = `${Math.random() * 100}%`;
            p.style.backgroundColor = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e'][Math.floor(Math.random() * 5)];
            p.style.width = `${Math.random() * 8 + 6}px`;
            p.style.height = `${Math.random() * 14 + 8}px`;
            p.style.animationDuration = `${Math.random() * 2 + 1.5}s`;
            p.style.setProperty('--drift', `${(Math.random() - 0.5) * 200}px`);
            container.appendChild(p);
        }

        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('hidden'), 2500);
    }

    // ── Google Calendar .ics Import ──
    const fileInput = document.getElementById('ics-input');
    const elBtnImportCal = document.getElementById('btn-import-cal');
    if (elBtnImportCal && fileInput) {
        elBtnImportCal.onclick = () => fileInput.click();
    }
    if (fileInput) {
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                const parsed = ICSParser.parseICS(evt.target.result);
                parsed.forEach(t => TaskManager.create(t));
                showToast(`Imported ${parsed.length} events from Calendar! 📅`);
                renderAll();
            };
            reader.readAsText(file);
        };
    }

    // ── Settings & Backup ──
    function loadSettings() {
        return JSON.parse(localStorage.getItem('adhd_settings') || '{}');
    }

    function saveSettings(settings) {
        localStorage.setItem('adhd_settings', JSON.stringify(settings));
    }

    const Connectors = [
        {
            id: 'calendar',
            name: 'Google Calendar',
            description: 'Sync Google Calendar events via iCal URL. Only fetches when you press sync.',
            getStatus: (settings) => settings.gcalUrl ? 'Configured' : 'Not configured',
            getActionLabel: (settings) => settings.gcalUrl ? 'Update' : 'Configure',
            action: async () => {
                // In-app UX: focus the iCal URL field in Settings (no prompt()).
                const elGcal = document.getElementById('sf-gcal-url');
                if (elGcal) {
                    const settings = loadSettings();
                    elGcal.value = settings.gcalUrl || '';
                    elGcal.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    elGcal.focus();
                    showToast('Paste your iCal URL below, then press Save Settings.');
                } else {
                    showToast('Open Settings to configure Google Calendar.');
                }
            }
        },
        {
            id: 'backup',
            name: 'Local Backup',
            description: 'Export and restore tasks/settings from a local JSON file. No external service required.',
            getStatus: () => 'Local backup available',
            // Two explicit buttons instead of a typed BACKUP/RESTORE prompt().
            actions: [
                {
                    id: 'backup',
                    label: 'Backup',
                    handler: async () => {
                        const data = {
                            version: 1,
                            exportedAt: new Date().toISOString(),
                            settings: loadSettings(),
                            tasks: TaskManager.getAll()
                        };
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `adhd-flow-backup-${new Date().toISOString().slice(0,10)}.json`;
                        a.click();
                        showToast('Backup downloaded! 💾');
                    }
                },
                {
                    id: 'restore',
                    label: 'Restore',
                    handler: async () => {
                        const fileInput = document.getElementById('json-load-input');
                        if (fileInput) {
                            fileInput.click();
                            showToast('Select a backup file to restore.');
                        }
                    }
                }
            ]
        },
        {
            id: 'tracker',
            name: 'Local Tracker',
            description: 'Local Python tracker sidecar for screen capture, GitHub proxy, and Vision. Only runs when you press the button.',
            getStatus: () => 'Tap to check local tracker.',
            getActionLabel: () => 'Check / Start',
            action: async () => {
                const status = await checkTrackerStatus();
                if (status === 'running') {
                    showToast('Tracker is already running.');
                    return;
                }
                const started = startPythonTracker();
                if (started) {
                    showToast('Starting tracker process...');
                    setTimeout(async () => {
                        await checkTrackerStatus();
                        renderIntegrationList();
                    }, 1200);
                } else {
                    showToast('Could not start tracker automatically. Run python tracker.py from the app folder.');
                }
            }
        }
    ];

    function renderIntegrationList() {
        const settings = loadSettings();
        const container = document.getElementById('integration-list');
        if (!container) return;

        container.innerHTML = Connectors.map(connector => {
            const status = connector.getStatus(settings);
            const buttons = connector.actions
                ? connector.actions.map(a =>
                    `<button type="button" id="integration-btn-${connector.id}-${a.id}" class="btn btn-ghost btn-xs integration-action-btn">${escapeHtml(a.label)}</button>`
                  ).join('')
                : `<button type="button" id="integration-btn-${connector.id}" class="btn btn-ghost btn-xs integration-action-btn">${escapeHtml(connector.getActionLabel(settings))}</button>`;
            return `
                <div class="integration-card" id="integration-card-${connector.id}">
                    <div class="integration-card-header">
                        <div>
                            <div class="integration-card-title">${escapeHtml(connector.name)}</div>
                            <div class="integration-status">${escapeHtml(status)}</div>
                        </div>
                        <div class="integration-action-group" style="display:flex;gap:6px">${buttons}</div>
                    </div>
                    <div class="integration-description">${escapeHtml(connector.description)}</div>
                </div>
            `;
        }).join('');

        Connectors.forEach(connector => {
            if (connector.actions) {
                connector.actions.forEach(a => {
                    const btn = document.getElementById(`integration-btn-${connector.id}-${a.id}`);
                    if (!btn) return;
                    btn.onclick = async () => {
                        await a.handler();
                        renderIntegrationList();
                    };
                });
                return;
            }
            const btn = document.getElementById(`integration-btn-${connector.id}`);
            if (!btn) return;
            btn.onclick = async () => {
                await connector.action();
                renderIntegrationList();
            };
        });

        if (Connectors.some(connector => connector.id === 'tracker')) {
            checkTrackerStatus().then(status => {
                const trackerCard = document.querySelector('#integration-card-tracker .integration-status');
                if (trackerCard) {
                    if (status === 'running') trackerCard.textContent = 'Running locally';
                    else if (status === 'idle') trackerCard.textContent = 'Idle - tracker available';
                    else trackerCard.textContent = 'Stopped (run python tracker.py)';
                }
            });
        }
    }

    async function checkTrackerStatus() {
        const elStatus = document.getElementById('tracker-status');
        if (!elStatus) return 'stopped';
        try {
            const resp = await fetch('http://localhost:8999/', { headers: trackerHeaders() });
            const data = await resp.json();
            if (data.status === 'ok') {
                elStatus.innerHTML = '<span style="color:var(--green)">● Running (Ready for Vision AI)</span>';
                return 'running';
            }
            elStatus.innerHTML = '<span style="color:var(--yellow)">● Idle</span>';
            return 'idle';
        } catch {
            elStatus.innerHTML = '<span style="color:var(--t4)">○ Stopped (Run python tracker.py)</span>';
            return 'stopped';
        }
    }

    function startPythonTracker() {
        if (typeof require !== 'function') return false;
        try {
            const path = require('path');
            const child = require('child_process');
            const trackerPath = path.join(__dirname, '..', 'tracker.py');
            // Try common python executables (mirrors main.js): env override, python, python3.
            const bins = [(typeof process !== 'undefined' && process.env && process.env.PYTHON), 'python', 'python3'].filter(Boolean);
            for (const bin of bins) {
                try {
                    const trackerProcess = child.spawn(bin, [trackerPath], {
                        stdio: ['ignore', 'pipe', 'pipe'],
                        detached: true
                    });
                    trackerProcess.stdout.on('data', data => console.log(`[Tracker ${bin}]: ${data}`));
                    trackerProcess.stderr.on('data', data => console.error(`[Tracker ${bin} Error]: ${data}`));
                    trackerProcess.unref();
                    return true;
                } catch (e) {
                    console.warn('Failed starting tracker with', bin, e);
                }
            }
            return false;
        } catch (err) {
            console.error('Unable to start tracker.py from renderer:', err);
            return false;
        }
    }

    const elBtnToggleTracker = document.getElementById('btn-toggle-tracker');
    if (elBtnToggleTracker) {
        elBtnToggleTracker.onclick = async () => {
            const status = await checkTrackerStatus();
            if (status === 'running') {
                showToast('Tracker is already running.');
                return;
            }

            const started = startPythonTracker();
            if (started) {
                showToast('Starting tracker process...');
                setTimeout(checkTrackerStatus, 1200);
            } else {
                showToast('Could not start tracker automatically. Run python tracker.py from the app folder.');
            }
        };
    }

    function applyCustomizationSettings() {
        const s = JSON.parse(localStorage.getItem('adhd_settings') || '{}');
        const app = document.getElementById('app');
        
        // In narrow viewports (e.g. Chrome Side Panel) or mobile, force full width
        if (window.innerWidth <= 850 && app) {
            app.style.marginLeft = '0';
            app.style.width = '100%';
        } else if (s.widgetWidth && app) {
            const w = s.widgetWidth;
            if (w === '100vw') {
                app.style.marginLeft = '0';
                app.style.width = '100vw';
            } else {
                const pct = parseInt(w);
                app.style.marginLeft = `${100 - pct}vw`;
                app.style.width = w;
            }
        }
        
        // Apply UI scale (zoom)
        try {
            const scale = parseFloat(s.uiScale || '1');
            if (!isNaN(scale) && scale > 0) {
                document.body.style.zoom = String(scale);
            }
        } catch (e) { /* ignore */ }
        
        // Apply widget opacity (slight transparency)
        try {
            const opacity = parseFloat(s.widgetOpacity || '0.96');
            if (!isNaN(opacity) && opacity > 0 && app) {
                app.style.opacity = String(opacity);
            }
        } catch (e) { /* ignore */ }

        // Apply frost/glow styles
        try {
            const frost = s.frostStyle || 'soft';
            // remove existing frost classes
            app.classList.remove('frost-soft','frost-glow','frost-none');
            if (frost === 'soft') app.classList.add('frost-soft');
            else if (frost === 'glow') app.classList.add('frost-glow');
            else app.classList.add('frost-none');
        } catch (e) { /* ignore */ }
        
        // Apply Section Visibility
        const sections = {
            'sf-sec-clock': 'clock-section',
            'sf-sec-next': 'next-task-card',
            'sf-sec-timer': 'timer-section',
            'sf-sec-dump': 'brain-dump-section',
            'sf-sec-ai': 'whats-next-section',
            'sf-sec-timeline': 'panel-left',
            'sf-sec-tasks': 'task-list-section'
        };
        
        for (let [key, elemId] of Object.entries(sections)) {
            const elem = document.getElementById(elemId);
            if (elem) {
                const isVisible = s[key] !== false; // default true
                elem.style.display = isVisible ? '' : 'none';
            }
        }
    }

    const elBtnHistory = document.getElementById('btn-history');
    if (elBtnHistory) {
        elBtnHistory.onclick = () => {
            renderHistoryModal();
            elModalHistory.classList.remove('hidden');
        };
    }

    function renderHistoryModal() {
        const container = document.getElementById('history-content');
        if (!container) return;

        const summary = HistoryManager.getWeeklySummary();
        const historyList = HistoryManager.getAll();
        const maxCount = Math.max(1, ...summary.map(s => s.count));

        let html = `
            <div class="history-section-title">Last 7 Days Activity</div>
            <div class="bar-chart">
                ${summary.map(s => {
                    const pct = Math.round((s.count / maxCount) * 100);
                    return `
                        <div class="bar-col">
                            <div class="bar-wrap">
                                <div class="bar" style="height:${Math.max(8, pct)}%">
                                    <span class="bar-count">${s.count > 0 ? s.count : ''}</span>
                                </div>
                            </div>
                            <div class="bar-lbl ${s.isToday ? 'today' : ''}">${s.label}</div>
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="history-section-title" style="margin-top:20px">Completed Task Log (${historyList.length})</div>
            <div style="max-height:250px;overflow-y:auto">
                ${historyList.length === 0 ? '<div class="empty-state">No completed tasks recorded yet. Complete a task to build your history!</div>' : 
                    historyList.map(h => `
                        <div class="history-item">
                            <span class="history-icon">✅</span>
                            <div style="flex:1">
                                <div class="history-name">${escapeHtml(h.taskName)}</div>
                                <div class="history-date">${escapeHtml(new Date(h.completedAt).toLocaleString())} • ${escapeHtml(h.plannedDuration)}m</div>
                            </div>
                        </div>
                    `).join('')}
            </div>
        `;
        container.innerHTML = html;
    }

    const elBtnSettings = document.getElementById('btn-settings');
    if (elBtnSettings) {
        elBtnSettings.onclick = () => {
            const s = loadSettings();
            const elGemini = document.getElementById('sf-gemini-key');
            const elGroq = document.getElementById('sf-groq-key');
            const elGcal = document.getElementById('sf-gcal-url');
            const elStart = document.getElementById('sf-work-start');
            const elEnd = document.getElementById('sf-work-end');
            const elBreak = document.getElementById('sf-break-mins');

            if (elGemini) elGemini.value = s.geminiKey || '';
            if (elGroq) elGroq.value = s.groqKey || '';
            if (elGcal) elGcal.value = s.gcalUrl || '';

            if (elStart) elStart.value = s.workStart || '09:00';
            if (elEnd) elEnd.value = s.workEnd || '18:00';
            if (elBreak) elBreak.value = s.breakMins || '15';
            
            const elWidth = document.getElementById('sf-widget-width');
            if (elWidth && s.widgetWidth) elWidth.value = s.widgetWidth;
            const elScale = document.getElementById('sf-ui-scale');
            if (elScale) elScale.value = s.uiScale || '1';
            const elOpacity = document.getElementById('sf-widget-opacity');
            if (elOpacity) elOpacity.value = s.widgetOpacity || '0.96';
            const elFrost = document.getElementById('sf-frost-style');
            if (elFrost) elFrost.value = s.frostStyle || 'soft';

            ['sf-sec-clock', 'sf-sec-next', 'sf-sec-timer', 'sf-sec-dump', 'sf-sec-ai', 'sf-sec-timeline', 'sf-sec-tasks'].forEach(id => {
                const input = document.getElementById(id);
                if (input) input.checked = s[id] !== false;
                if (input && input.checked) input.parentElement.classList.add('checked'); else if (input) input.parentElement.classList.remove('checked');
            });

            renderIntegrationList();
            checkTrackerStatus();
            elModalSettings.classList.remove('hidden');
        };
    }

    // Help button — opens How-to modal
    const elBtnHelp = document.getElementById('btn-help');
    if (elBtnHelp) {
        elBtnHelp.onclick = () => {
            const modal = document.getElementById('modal-help');
            if (modal) modal.classList.remove('hidden');
        };
    }
    document.getElementById('btn-save-settings').onclick = () => {
        const s = {
            geminiKey: document.getElementById('sf-gemini-key').value.trim(),
            groqKey: document.getElementById('sf-groq-key').value.trim(),
            gcalUrl: document.getElementById('sf-gcal-url').value.trim(),
            githubUser: loadSettings().githubUser || '',
            workStart: document.getElementById('sf-work-start').value,
            workEnd: document.getElementById('sf-work-end').value,
            breakMins: document.getElementById('sf-break-mins').value,
            widgetWidth: document.getElementById('sf-widget-width').value,
            uiScale: document.getElementById('sf-ui-scale') ? document.getElementById('sf-ui-scale').value : '1',
            widgetOpacity: document.getElementById('sf-widget-opacity') ? document.getElementById('sf-widget-opacity').value : '0.96',
            frostStyle: document.getElementById('sf-frost-style') ? document.getElementById('sf-frost-style').value : 'soft'
        };

        ['sf-sec-clock', 'sf-sec-next', 'sf-sec-timer', 'sf-sec-dump', 'sf-sec-ai', 'sf-sec-timeline', 'sf-sec-tasks'].forEach(id => {
            const input = document.getElementById(id);
            if (input) s[id] = input.checked;
        });

        saveSettings(s);
        elModalSettings.classList.add('hidden');
        showToast('Settings & Layout updated!');
        applyCustomizationSettings();
        renderAll();
    };

    // Apply layout on load
    applyCustomizationSettings();

    // Close / hide widget button (tries IPC in Electron, falls back to hiding DOM for browser preview)
    const elBtnCloseWidget = document.getElementById('btn-close-widget');
    const elShowWidgetToggle = document.getElementById('show-widget-toggle');
    if (elBtnCloseWidget) {
        elBtnCloseWidget.onclick = () => {
            // Try Electron IPC first
            try {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('hide-window');
                showToast('Hiding widget...');
                return;
            } catch (e) {
                // Not running in Electron; fallback to DOM hide/show
                const appEl = document.getElementById('app');
                if (appEl) {
                    appEl.style.display = 'none';
                    if (elShowWidgetToggle) elShowWidgetToggle.style.display = 'inline-block';
                    showToast('Widget hidden (preview mode). Click "Show FreezeFix" to restore.');
                }
            }
        };
    }
    if (elShowWidgetToggle) {
        elShowWidgetToggle.onclick = () => {
            const appEl = document.getElementById('app');
            if (appEl) appEl.style.display = '';
            elShowWidgetToggle.style.display = 'none';
            showToast('Widget restored');
        };
    }

    document.getElementById('btn-save-sync').onclick = () => {
        const jsonStr = TaskManager.exportJSON();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `adhd-flow-backup-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        showToast('Backup downloaded! 💾');
    };

    const jsonLoadInput = document.getElementById('json-load-input');
    document.getElementById('btn-load-sync').onclick = () => jsonLoadInput.click();
    jsonLoadInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            if (TaskManager.importJSON(evt.target.result)) {
                showToast('Backup restored successfully! 📂');
                renderAll();
            } else {
                showToast('Failed to parse backup file');
            }
        };
        reader.readAsText(file);
    };
// ── Distractor-Free View Tabs (Clinical OT Redesign) ──
    function initViewTabs() {
        const tabBtns = document.querySelectorAll('.tab-pill');
        const views = {
            focus: document.getElementById('view-focus'),
            timeline: document.getElementById('view-timeline'),
            tasks: document.getElementById('view-tasks')
        };

        function setView(viewName) {
            tabBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === viewName);
            });
            Object.keys(views).forEach(key => {
                if (views[key]) {
                    views[key].classList.toggle('active-view', key === viewName);
                }
            });
            try { localStorage.setItem('freezefix_active_view', viewName); } catch (e) {}
        }

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => setView(btn.dataset.view));
        });

        const savedView = localStorage.getItem('freezefix_active_view') || 'focus';
        setView(savedView);
    }
    initViewTabs();

    // ── Header Quick Tools ──
    const btnHeaderSettings = document.getElementById('btn-header-settings');
    if (btnHeaderSettings) {
        btnHeaderSettings.onclick = () => {
            if (elModalSettings) {
                renderIntegrationList();
                elModalSettings.classList.remove('hidden');
            }
        };
    }

    const btnHeaderHistory = document.getElementById('btn-header-history');
    if (btnHeaderHistory) {
        btnHeaderHistory.onclick = () => {
            if (elModalHistory) {
                renderHistoryModal();
                elModalHistory.classList.remove('hidden');
            }
        };
    }

    const btnHeaderHelp = document.getElementById('btn-header-help');
    if (btnHeaderHelp) {
        btnHeaderHelp.onclick = () => {
            if (elModalHelp) elModalHelp.classList.remove('hidden');
        };
    }

    // ── Quick Duration Chips in Add Task Modal ──
    const durationChips = document.querySelectorAll('.duration-preset');
    const elTfDurationInput = document.getElementById('tf-duration');
    durationChips.forEach(chip => {
        chip.addEventListener('click', () => {
            durationChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            if (elTfDurationInput) elTfDurationInput.value = chip.dataset.min;
        });
    });
});

