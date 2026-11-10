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
        if (!elClock) return;
        const now = new Date();
        let hours = now.getHours();
        const mins = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // convert 0 to 12
        const hrsStr = String(hours);
        
        elClock.innerHTML = `<span class="clock-digits">${hrsStr}:${mins}</span> <span class="clock-ampm">${ampm}</span>`;
        if (elClockDate) {
            elClockDate.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        }

        if (elGreeting) {
            const hour = now.getHours();
            let greeting = '🌙 Rest up & unwind';
            if (hour >= 5 && hour < 12) greeting = '🌅 Good morning! Fresh start';
            else if (hour >= 12 && hour < 17) greeting = '☀️ Good afternoon! Stay in your flow';
            else if (hour >= 17 && hour < 22) greeting = '🌆 Evening session — wrap up strong';
            elGreeting.textContent = greeting;
        }
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

        const elSubCont = document.getElementById('now-substep-container');
        const elSubBadge = document.getElementById('now-substep-badge');
        const elSubTime = document.getElementById('now-substep-time');
        const elSubText = document.getElementById('now-substep-text');
        const elSubFill = document.getElementById('now-substep-fill');

        if (!currentFocusTask) {
            elNextName.textContent = "🎉 All done! Ready for a break or a new task.";
            elNextMeta.textContent = "";
            if (elSubCont) elSubCont.classList.add('hidden');
            const elBtnNowBreakdown = document.getElementById('btn-now-breakdown');
            const elBtnNowStuck = document.getElementById('btn-now-stuck');
            if (elBtnStartFocus) elBtnStartFocus.style.display = "none";
            if (elBtnNowBreakdown) elBtnNowBreakdown.style.display = "none";
            if (elBtnNowStuck) elBtnNowStuck.style.display = "none";
            if (elBtnMarkDone) elBtnMarkDone.style.display = "none";
            if (elBtnGoodEnough) elBtnGoodEnough.style.display = "none";
            if (elBtnSkipTask) elBtnSkipTask.style.display = "none";
            return;
        }

        elNextName.textContent = currentFocusTask.name;

        // Render micro-step gamified progress
        if (currentFocusTask.subtasks && currentFocusTask.subtasks.length > 0) {
            const subs = currentFocusTask.subtasks;
            const activeIdx = subs.findIndex(s => !s.done);
            const currentSub = activeIdx >= 0 ? subs[activeIdx] : subs[0];
            const currentNum = (activeIdx >= 0 ? activeIdx : 0) + 1;
            const pct = Math.round((currentNum / subs.length) * 100);

            if (elSubBadge) elSubBadge.textContent = `🧩 Step ${currentNum} of ${subs.length}`;
            if (elSubTime) elSubTime.textContent = `⏱ ${currentSub.duration || 5}m`;
            if (elSubText) elSubText.textContent = currentSub.name || '';
            if (elSubFill) elSubFill.style.width = `${pct}%`;
            if (elSubCont) elSubCont.classList.remove('hidden');
        } else {
            if (elSubCont) elSubCont.classList.add('hidden');
        }
        const catInfo = TaskManager.CATEGORIES[currentFocusTask.category] || TaskManager.CATEGORIES.other;
        elNextMeta.textContent = `${catInfo.icon} ${catInfo.label} • ⏱ ${currentFocusTask.duration} minutes`;

        const elBtnNowBreakdown = document.getElementById('btn-now-breakdown');
        const elBtnNowStuck = document.getElementById('btn-now-stuck');
        if (elBtnStartFocus) elBtnStartFocus.style.display = "inline-flex";
        if (elBtnNowBreakdown) elBtnNowBreakdown.style.display = "inline-flex";
        if (elBtnNowStuck) elBtnNowStuck.style.display = "inline-flex";
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
        const streak = HistoryManager.getStreak();
        const doneToday = HistoryManager.getCompletedToday();
        const pendingCount = TaskManager.getPending().length;

        if (elStreakNum) elStreakNum.textContent = streak;
        if (elDoneToday) elDoneToday.textContent = doneToday;
        if (elTasksLeft) elTasksLeft.textContent = pendingCount;

        const elFocusStreak = document.getElementById('focus-streak-count');
        const elFocusDone = document.getElementById('focus-done-count');
        const elFocusLeft = document.getElementById('focus-left-count');
        if (elFocusStreak) elFocusStreak.textContent = streak;
        if (elFocusDone) elFocusDone.textContent = doneToday;
        if (elFocusLeft) elFocusLeft.textContent = pendingCount;
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

    // ── Brain Dump (Instant Frictionless Capture & Invisible Scaffolding) ──
    const elBrainScaffold = document.getElementById('brain-scaffold-container');
    let brainScaffoldTimeout = null;

    function handleBrainDump() {
        const text = elBrainInput.value.trim();
        if (!text) {
            elBrainInput.focus();
            return;
        }
        const est = estimateDuration(text) || 15;
        
        // Directly create the task for instant unfreezing (PMC12289795)
        const newTask = TaskManager.create({
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

        // The "Invisible Guardrail" Pattern:
        // Offer non-intrusive floating bridge for any task with 2+ words or key verbs
        if (elBrainScaffold && (text.split(/\s+/).length >= 2 || text.length > 5)) {
            showBrainScaffold(newTask);
        } else if (elBrainScaffold) {
            elBrainScaffold.classList.add('hidden');
        }
    }

    function showBrainScaffold(task) {
        if (!elBrainScaffold || !task) return;
        if (brainScaffoldTimeout) clearTimeout(brainScaffoldTimeout);

        elBrainScaffold.innerHTML = `
            <div class="brain-scaffold-pill">
                <span class="scaffold-spark">🪄</span>
                <span class="scaffold-msg">Big task?</span>
                <button class="btn-scaffold-break" data-id="${task.id}" title="Break into 3 starter steps">Break into 3 steps</button>
                <button class="btn-scaffold-dismiss" title="Dismiss (Esc)">✕</button>
            </div>
        `;
        elBrainScaffold.classList.remove('hidden');

        // Dismiss button (Frictionless Exit)
        const btnDismiss = elBrainScaffold.querySelector('.btn-scaffold-dismiss');
        if (btnDismiss) {
            btnDismiss.onclick = () => {
                elBrainScaffold.classList.add('hidden');
            };
        }

        // Break button: converts bulky task into 3 clean, low-friction micro-steps
        const btnBreak = elBrainScaffold.querySelector('.btn-scaffold-break');
        if (btnBreak) {
            btnBreak.onclick = async () => {
                btnBreak.textContent = 'Breaking down...';
                btnBreak.disabled = true;
                const steps = await AIHelper.generateTaskBreakdown(task.name);
                if (steps && steps.length > 0) {
                    // Remove the bulky task and replace with the 3 micro-steps
                    TaskManager.remove(task.id);
                    steps.forEach(st => {
                        TaskManager.create({
                            name: st.name,
                            duration: st.duration,
                            category: task.category || 'work',
                            priority: task.priority || 3
                        });
                    });
                    playDopamineChime();
                    showToast(`Replaced with ${steps.length} starter steps! 🧩`);
                    elBrainScaffold.classList.add('hidden');
                    renderAll();
                } else {
                    elBrainScaffold.classList.add('hidden');
                }
            };
        }

        // Auto-fade after 8 seconds of inactivity so it never clutters screen
        brainScaffoldTimeout = setTimeout(() => {
            if (elBrainScaffold) elBrainScaffold.classList.add('hidden');
        }, 8000);
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
        elBtnTimerToggle.textContent = '⏸ Pause';
        const ringCont = document.getElementById('timer-ring-container');
        if (ringCont) ringCont.classList.add('timer-running');
        timerInterval = setInterval(() => {
            if (timerSecsLeft > 0) {
                timerSecsLeft--;
                updateTimerDisplay();
            } else {
                pauseTimer();
                playDopamineChime();
                showToast('🔔 Focus block complete! Need a boost? Click 🆘 Stuck?');
                const btnStuck = document.getElementById('btn-now-stuck');
                if (btnStuck) {
                    btnStuck.classList.add('pulse-rescue');
                    setTimeout(() => btnStuck.classList.remove('pulse-rescue'), 10000);
                }
            }
        }, 1000);
    }

    function pauseTimer() {
        isTimerRunning = false;
        elBtnTimerToggle.textContent = '▶ Start Timer';
        const ringCont = document.getElementById('timer-ring-container');
        if (ringCont) ringCont.classList.remove('timer-running');
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

    // ── Breakdown Modal & AI (0ms Optimistic Scaffolding + Background AI Refine) ──
    let breakdownSessionCounter = 0;
    let breakdownUserInteracted = false;

    async function showTaskBreakdown(taskName) {
        if (!taskName) {
            showToast('Enter a task name first to break it down.');
            return;
        }
        currentBreakdownTaskName = taskName;
        breakdownUserInteracted = false;
        const sessionId = ++breakdownSessionCounter;

        const titleEl = document.getElementById('breakdown-task-title');
        const { gemini, groq } = AIHelper.getKeys();
        const hasAI = Boolean(gemini || groq);

        // Instant optimistic steps from local heuristics (0ms latency!)
        currentBreakdownSteps = TaskBreakdown.getLocalBreakdown(taskName);

        const badgeHtml = `<span id="breakdown-badge" style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:6px;margin-left:8px;${hasAI ? 'background:rgba(139,92,246,0.22);color:#c4b5fd' : 'background:rgba(6,182,212,0.18);color:#67e8f9'}">${hasAI ? '✨ AI Breakdown' : '⚡ Smart Heuristic'}</span><span id="breakdown-ai-status" style="font-size:11px;color:var(--purple-l);margin-left:6px;font-weight:500;${hasAI ? '' : 'display:none'}"></span>`;
        titleEl.innerHTML = `<strong>Task:</strong> ${escapeHtml(taskName)} ${badgeHtml}`;

        const elList = document.getElementById('breakdown-steps');
        const elLoading = document.getElementById('breakdown-loading');

        // Immediately show modal with optimistic steps rendered!
        elLoading.classList.add('hidden');
        elModalBreakdown.classList.remove('hidden');
        renderBreakdownSteps();

        // If no AI keys configured, we're done immediately!
        if (!hasAI) return;

        // If AI keys configured, asynchronously refine in background with zero UI freeze
        const statusEl = document.getElementById('breakdown-ai-status');
        if (statusEl) {
            statusEl.textContent = '• refining...';
            statusEl.style.display = 'inline';
        }

        try {
            const aiSteps = await AIHelper.generateTaskBreakdown(taskName);
            // Verify user hasn't closed modal, navigated away, or started editing steps
            if (sessionId === breakdownSessionCounter && elModalBreakdown && !elModalBreakdown.classList.contains('hidden')) {
                if (aiSteps && aiSteps.length && !breakdownUserInteracted) {
                    currentBreakdownSteps = aiSteps;
                    renderBreakdownSteps();
                    const statusElAfter = document.getElementById('breakdown-ai-status');
                    if (statusElAfter) {
                        statusElAfter.textContent = '• refined ✨';
                        statusElAfter.style.color = '#34d399';
                        setTimeout(() => {
                            if (statusElAfter) statusElAfter.textContent = '';
                        }, 4000);
                    }
                } else {
                    const statusElAfter = document.getElementById('breakdown-ai-status');
                    if (statusElAfter) statusElAfter.textContent = '';
                }
            }
        } catch (err) {
            console.warn('Background AI refinement caught error:', err);
            const statusElAfter = document.getElementById('breakdown-ai-status');
            if (statusElAfter) statusElAfter.textContent = '';
        }
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
            const elLoading = document.getElementById('breakdown-loading');
            if (elLoading) elLoading.classList.remove('hidden');
            breakdownUserInteracted = false;
            try {
                const freshSteps = await AIHelper.generateTaskBreakdown(currentBreakdownTaskName);
                if (freshSteps && freshSteps.length) {
                    currentBreakdownSteps = freshSteps;
                    renderBreakdownSteps();
                    showToast('Refreshed breakdown steps! 🪄');
                }
            } finally {
                if (elLoading) elLoading.classList.add('hidden');
            }
        };
    }

    function renderBreakdownSteps() {
        const elList = document.getElementById('breakdown-steps');
        elList.innerHTML = '';
        currentBreakdownSteps.forEach((step, idx) => {
            const item = document.createElement('div');
            item.className = 'breakdown-step';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '8px';
            item.innerHTML = `
                <div class="step-num">${idx + 1}</div>
                <div style="flex:1;min-width:0">
                    <input class="step-name-edit" data-idx="${idx}" value="${escapeHtml(step.name)}" style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.08);color:var(--t1);font-size:13px;padding:2px 0;outline:none" title="Click to edit step description">
                    <div class="step-duration" style="display:flex;align-items:center;gap:4px;margin-top:3px">
                        <span>⏱</span>
                        <input class="step-dur-edit" data-idx="${idx}" type="number" min="1" max="120" value="${escapeHtml(step.duration)}" style="width:44px;background:rgba(255,255,255,0.06);border:1px solid var(--glass-b);border-radius:4px;color:var(--t2);font-size:11px;padding:1px 4px;text-align:center" title="Step duration in minutes">
                        <span>mins</span>
                    </div>
                </div>
                <button type="button" class="btn-step-delete" data-idx="${idx}" title="Remove this step" style="background:transparent;border:none;color:var(--t4);cursor:pointer;font-size:14px;padding:4px 6px">✕</button>
            `;
            elList.appendChild(item);
        });

        // Edit handlers
        elList.querySelectorAll('.step-name-edit').forEach(inp => {
            inp.oninput = (e) => {
                breakdownUserInteracted = true;
                const i = parseInt(e.target.dataset.idx, 10);
                if (currentBreakdownSteps[i]) currentBreakdownSteps[i].name = e.target.value;
            };
        });
        elList.querySelectorAll('.step-dur-edit').forEach(inp => {
            inp.onchange = (e) => {
                breakdownUserInteracted = true;
                const i = parseInt(e.target.dataset.idx, 10);
                if (currentBreakdownSteps[i]) currentBreakdownSteps[i].duration = parseInt(e.target.value, 10) || 5;
            };
        });
        elList.querySelectorAll('.btn-step-delete').forEach(btn => {
            btn.onclick = (e) => {
                breakdownUserInteracted = true;
                const i = parseInt(e.target.dataset.idx, 10);
                currentBreakdownSteps.splice(i, 1);
                renderBreakdownSteps();
            };
        });
    }

    const elBtnAddBreakdownStep = document.getElementById('btn-breakdown-add-step');
    if (elBtnAddBreakdownStep) {
        elBtnAddBreakdownStep.onclick = () => {
            breakdownUserInteracted = true;
            currentBreakdownSteps.push({ name: 'Next small action step', duration: 5 });
            renderBreakdownSteps();
        };
    }

    document.getElementById('btn-breakdown-add-all').onclick = () => {
        currentBreakdownSteps.forEach(step => {
            TaskManager.create({ name: step.name, duration: step.duration, category: 'work', priority: 3 });
        });
        elModalBreakdown.classList.add('hidden');
        showToast(`Added ${currentBreakdownSteps.length} micro-steps! 🪄`);
        renderAll();
    };

    // ── 🆘 I'm Stuck Rescue System (The Invisible Guardrail Pattern) ──
    const elBtnNowStuck = document.getElementById('btn-now-stuck');
    const elStuckPanel = document.getElementById('stuck-rescue-panel');
    let stuckRescueSessionCounter = 0;
    let stuckRescueUserInteracted = false;

    async function triggerStuckRescue() {
        if (!elStuckPanel) return;
        if (!currentFocusTask) {
            showToast('Start or pick a focus task first! 🎯');
            return;
        }

        if (!elStuckPanel.classList.contains('hidden') && elStuckPanel.innerHTML) {
            elStuckPanel.classList.add('hidden');
            return;
        }

        stuckRescueUserInteracted = false;
        const sessionId = ++stuckRescueSessionCounter;

        // Instant local freeze-breaker response in 0ms!
        const localRescue = AIHelper.getLocalStuckRescue(currentFocusTask.name);
        elStuckPanel.classList.remove('hidden');
        renderStuckRescuePanel(localRescue);

        const { gemini } = AIHelper.getKeys();
        if (!gemini) return;

        // Asynchronously refine in background if Gemini key is present
        try {
            const aiRescue = await AIHelper.generateStuckRescue(currentFocusTask.name);
            if (sessionId === stuckRescueSessionCounter && !stuckRescueUserInteracted && !elStuckPanel.classList.contains('hidden')) {
                if (aiRescue && aiRescue.starter && aiRescue.good_enough) {
                    renderStuckRescuePanel(aiRescue);
                }
            }
        } catch (err) {
            console.warn('AI stuck rescue background error:', err);
        }
    }

    if (elBtnNowStuck) {
        elBtnNowStuck.onclick = triggerStuckRescue;
    }

    function renderStuckRescuePanel(rescue) {
        if (!elStuckPanel || !rescue) return;
        const starter = rescue.starter || { title: 'Take 1 slow breath & open the window', detail: 'Zero obligation to do real work for 60 seconds.', duration: 1 };
        const goodEnough = rescue.good_enough || { title: 'Do 3 minutes of minimum effort', detail: 'Stop as soon as the timer rings.', duration: 3 };

        elStuckPanel.innerHTML = `
            <div class="stuck-rescue-container">
                <div class="stuck-rescue-header">
                    <span class="stuck-rescue-badge">🆘 FREEZE BREAKER (Pick 1)</span>
                    <button id="btn-close-rescue" class="icon-close-sm" title="Dismiss (Esc)">✕</button>
                </div>
                <div class="stuck-rescue-cards">
                    <!-- Starter Move -->
                    <div class="stuck-card starter-card">
                        <div class="stuck-card-main">
                            <div class="stuck-card-tag">🚀 30-Sec Frictionless Starter</div>
                            <div class="stuck-card-title">${escapeHtml(starter.title)}</div>
                            ${starter.detail ? `<div class="stuck-card-detail">${escapeHtml(starter.detail)}</div>` : ''}
                        </div>
                        <button class="btn btn-primary btn-xs btn-adopt-rescue" data-title="${encodeURIComponent(starter.title)}" data-dur="${starter.duration || 2}">
                            ⚡ Do This (${starter.duration || 2}m)
                        </button>
                    </div>

                    <!-- Good Enough Finish Line -->
                    <div class="stuck-card exit-card">
                        <div class="stuck-card-main">
                            <div class="stuck-card-tag">👍 "Good Enough" Exit</div>
                            <div class="stuck-card-title">${escapeHtml(goodEnough.title)}</div>
                            ${goodEnough.detail ? `<div class="stuck-card-detail">${escapeHtml(goodEnough.detail)}</div>` : ''}
                        </div>
                        <button class="btn btn-ghost btn-xs btn-adopt-rescue" data-title="${encodeURIComponent(goodEnough.title)}" data-dur="${goodEnough.duration || 5}">
                            ⚡ Do This (${goodEnough.duration || 5}m)
                        </button>
                    </div>
                </div>
            </div>
        `;

        const btnClose = document.getElementById('btn-close-rescue');
        if (btnClose) {
            btnClose.onclick = () => {
                elStuckPanel.classList.add('hidden');
                elStuckPanel.innerHTML = '';
            };
        }

        elStuckPanel.querySelectorAll('.btn-adopt-rescue').forEach(btn => {
            btn.onclick = () => {
                stuckRescueUserInteracted = true;
                const stepTitle = decodeURIComponent(btn.dataset.title);
                const stepDur = parseInt(btn.dataset.dur, 10) || 3;
                
                // Update focus task to this micro-step to remove mental freeze
                if (currentFocusTask) {
                    currentFocusTask.name = stepTitle;
                    currentFocusTask.duration = stepDur;
                    TaskManager.update(currentFocusTask.id, { name: stepTitle, duration: stepDur });
                }
                setTimerMinutes(stepDur);
                startTimer();
                playDopamineChime();
                showToast(`Started: "${stepTitle}" 🎯`);
                elStuckPanel.classList.add('hidden');
                renderAll();
            };
        });
    }

    // ── Frictionless Exits: Global Escape Key Listener ──
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (elStuckPanel && !elStuckPanel.classList.contains('hidden')) {
                elStuckPanel.classList.add('hidden');
            }
            if (elBrainScaffold && !elBrainScaffold.classList.contains('hidden')) {
                elBrainScaffold.classList.add('hidden');
            }
            if (elAiResponse && !elAiResponse.classList.contains('hidden')) {
                elAiResponse.classList.add('hidden');
            }
            const elActContent = document.getElementById('activity-suggestions-content');
            if (elActContent && !elActContent.classList.contains('hidden')) {
                elActContent.classList.add('hidden');
            }
            [elModalTask, elModalSettings, elModalHistory, elModalBreakdown, elModalChangelog, document.getElementById('modal-help')].forEach(m => {
                if (m && !m.classList.contains('hidden')) {
                    m.classList.add('hidden');
                }
            });
        }
    });

    function renderActivitySuggestions(result, targetContainer) {
        if (!targetContainer || !result) return;
        const contextText = escapeHtml(result.context || 'Suggested for your day flow:');
        let suggestionsHtml = '';

        (result.suggestions || []).forEach((sug) => {
            const title = escapeHtml(sug.title || 'Micro-step');
            const reason = escapeHtml(sug.reason || '');
            const dur = parseInt(sug.duration, 10) || 5;
            const cat = escapeHtml(sug.category || 'work');

            suggestionsHtml += `
                <div class="activity-suggest-card">
                    <div class="activity-suggest-main">
                        <div class="activity-suggest-title">👉 ${title}</div>
                        ${reason ? `<div class="activity-suggest-detail">${reason}</div>` : ''}
                        <div class="activity-suggest-meta">
                            <span class="activity-suggest-dur">⏱ ${dur}m</span>
                        </div>
                    </div>
                    <div class="activity-suggest-actions">
                        <button class="btn btn-ghost btn-xs btn-suggest-add" data-title="${encodeURIComponent(sug.title)}" data-dur="${dur}" data-cat="${cat}" title="Add to task backlog">
                            + Add
                        </button>
                        <button class="btn btn-primary btn-xs btn-suggest-start" data-title="${encodeURIComponent(sug.title)}" data-dur="${dur}" data-cat="${cat}" title="Start focus timer now">
                            ⚡ Do Now
                        </button>
                    </div>
                </div>
            `;
        });

        targetContainer.innerHTML = `
            <div class="activity-suggest-container">
                <div class="activity-suggest-header">
                    <span class="activity-suggest-badge">✨ Smart Flow Suggestions</span>
                    <button class="icon-close-sm btn-close-suggest" title="Dismiss">✕</button>
                </div>
                <div class="activity-suggest-context">${contextText}</div>
                <div class="activity-suggest-list">
                    ${suggestionsHtml}
                </div>
            </div>
        `;

        // Wire close button
        const btnClose = targetContainer.querySelector('.btn-close-suggest');
        if (btnClose) {
            btnClose.onclick = () => {
                targetContainer.classList.add('hidden');
                targetContainer.innerHTML = '';
            };
        }

        // Wire "+ Add" buttons
        targetContainer.querySelectorAll('.btn-suggest-add').forEach(btn => {
            btn.onclick = () => {
                const taskTitle = decodeURIComponent(btn.dataset.title);
                const dur = parseInt(btn.dataset.dur, 10) || 15;
                const cat = btn.dataset.cat || 'work';
                TaskManager.create({
                    name: taskTitle,
                    duration: dur,
                    category: cat,
                    priority: 3
                });
                showToast(`Added "${taskTitle}" to tasks! 📋`);
                playDopamineChime();
                renderAll();
                btn.textContent = '✓ Added';
                btn.disabled = true;
                btn.style.opacity = '0.6';
            };
        });

        // Wire "⚡ Do Now" buttons
        targetContainer.querySelectorAll('.btn-suggest-start').forEach(btn => {
            btn.onclick = () => {
                const taskTitle = decodeURIComponent(btn.dataset.title);
                const dur = parseInt(btn.dataset.dur, 10) || 5;
                const cat = btn.dataset.cat || 'work';
                const newTask = TaskManager.create({
                    name: taskTitle,
                    duration: dur,
                    category: cat,
                    priority: 1
                });
                currentFocusTask = newTask;
                setTimerMinutes(dur);
                startTimer();
                playDopamineChime();
                showToast(`Started: "${taskTitle}" 🎯`);
                targetContainer.classList.add('hidden');
                renderAll();
            };
        });
    }

    async function showActivitySuggestionsInEl(targetContainer) {
        if (!targetContainer) return;
        targetContainer.classList.remove('hidden');

        const pending = TaskManager.getPending();
        const allHistory = HistoryManager.getAll();
        const todayStr = new Date().toDateString();
        const completedToday = allHistory.filter(h => h.dateStr === todayStr);

        const now = new Date();
        const hour = now.getHours();
        let timeOfDay = 'afternoon';
        if (hour >= 5 && hour < 11) timeOfDay = 'morning';
        else if (hour >= 11 && hour < 14) timeOfDay = 'midday';
        else if (hour >= 14 && hour < 18) timeOfDay = 'afternoon';
        else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
        else timeOfDay = 'night';

        // Render instant local suggestions in 0ms!
        const localResult = AIHelper.getLocalActivitySuggestions(hour, timeOfDay, completedToday, allHistory);
        renderActivitySuggestions(localResult, targetContainer);

        const { gemini } = AIHelper.getKeys();
        if (!gemini) return;

        // In background, refine with AI if Gemini is available
        try {
            const aiResult = await AIHelper.suggestTasksFromActivity(allHistory, completedToday, pending);
            if (aiResult && Array.isArray(aiResult.suggestions) && aiResult.suggestions.length && !targetContainer.classList.contains('hidden')) {
                renderActivitySuggestions(aiResult, targetContainer);
            }
        } catch (err) {
            console.warn('Activity suggestions AI error:', err);
        }
    }

    elBtnWhatsNext.onclick = async () => {
        await showActivitySuggestionsInEl(elAiResponse);
        const pending = TaskManager.getPending();
        if (!pending.length && elBrainInput) {
            elBrainInput.focus();
        }
    };

    const elBtnTriggerActivity = document.getElementById('btn-trigger-activity-suggestions');
    const elActivityContent = document.getElementById('activity-suggestions-content');

    if (elBtnTriggerActivity && elActivityContent) {
        elBtnTriggerActivity.onclick = async () => {
            if (!elActivityContent.classList.contains('hidden') && elActivityContent.innerHTML) {
                elActivityContent.classList.add('hidden');
                return;
            }
            await showActivitySuggestionsInEl(elActivityContent);
        };
    }

    function extractActionsFromText(text) {
        if (!text || typeof text !== 'string') return null;
        const lines = text.split('\n');
        const actions = [];
        let contextParts = [];

        for (let rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;

            // Check if bullet point or numbered item: *, -, •, or 1., 2., etc.
            if (/^[\*\-\•\d+\.]\s+/.test(line)) {
                const cleanLine = line.replace(/^[\*\-\•\d+\.]+\s*/, '').trim();

                let title = '';
                let detail = '';

                // Try **Title:** Detail or **Title** - Detail
                const boldMatch = cleanLine.match(/^\*\*(.+?)\*\*[:\s–—\-]*(.*)$/);
                if (boldMatch) {
                    title = boldMatch[1].trim();
                    detail = boldMatch[2].trim();
                } else {
                    const colonIdx = cleanLine.indexOf(':');
                    if (colonIdx > 2 && colonIdx < 60) {
                        title = cleanLine.substring(0, colonIdx).replace(/\*\*/g, '').trim();
                        detail = cleanLine.substring(colonIdx + 1).replace(/\*\*/g, '').trim();
                    } else {
                        title = cleanLine.replace(/\*\*/g, '').trim();
                    }
                }

                if (title && title.length > 2) {
                    actions.push({
                        title: title,
                        detail: detail,
                        duration: 5
                    });
                    continue;
                }
            }

            // Non-bullet line: accumulate into context overview
            if (actions.length === 0 && !line.toLowerCase().includes('here are a few') && !line.toLowerCase().includes('quick, low-friction') && !line.startsWith('#')) {
                contextParts.push(line.replace(/\*\*/g, ''));
            }
        }

        if (actions.length > 0) {
            return {
                context: contextParts.join(' ').trim() || 'Active webpage context:',
                actions: actions
            };
        }
        return null;
    }

    function renderVisionResult(result) {
        if (!elAiResponse) return;

        // If string or markdown, try converting to structured actions first
        if (typeof result === 'string') {
            const parsed = extractActionsFromText(result);
            if (parsed && parsed.actions && parsed.actions.length > 0) {
                result = parsed;
            }
        }

        // If result is structured object with actions
        if (result && typeof result === 'object' && Array.isArray(result.actions)) {
            const contextText = escapeHtml(result.context || 'Active webpage analyzed:');
            let actionsHtml = '';

            result.actions.forEach((act) => {
                const title = escapeHtml(act.title || 'Next micro-step');
                const detail = escapeHtml(act.detail || '');
                const dur = parseInt(act.duration, 10) || 5;
                actionsHtml += `
                    <div class="vision-action-card">
                        <div class="vision-action-main">
                            <div class="vision-action-title">👉 ${title}</div>
                            ${detail ? `<div class="vision-action-detail">${detail}</div>` : ''}
                            <span class="vision-action-dur">⏱ ${dur} mins</span>
                        </div>
                        <button class="btn btn-primary btn-sm btn-vision-adopt" data-name="${encodeURIComponent(act.title)}" data-dur="${dur}" title="Focus on this micro-step now">
                            ⚡ Do This
                        </button>
                    </div>
                `;
            });

            elAiResponse.innerHTML = `
                <div class="vision-result-container">
                    <div class="vision-result-header">
                        <span class="vision-result-badge">📸 Page Context</span>
                        <div style="display:flex;gap:6px;align-items:center">
                            <button id="btn-vision-add-all" class="btn btn-ghost btn-xs btn-vision-add-all" title="Add all steps to Day Flow timeline">📥 Add All to Day Flow</button>
                            <button id="btn-close-vision" class="icon-close-sm" title="Dismiss advice (Esc)">✕</button>
                        </div>
                    </div>
                    <div class="vision-result-context">${contextText}</div>
                    <div class="vision-actions-label">RECOMMENDED NEXT STEPS:</div>
                    <div class="vision-actions-group">
                        ${actionsHtml}
                    </div>
                </div>
            `;

            // Wire close button
            const btnClose = document.getElementById('btn-close-vision');
            if (btnClose) {
                btnClose.onclick = () => {
                    elAiResponse.classList.add('hidden');
                    elAiResponse.innerHTML = '';
                };
            }

            // Wire "📥 Add All to Day Flow" button
            const btnAddAll = document.getElementById('btn-vision-add-all');
            if (btnAddAll) {
                btnAddAll.onclick = () => {
                    let lastEndTime = new Date();
                    result.actions.forEach((act, i) => {
                        const title = act.title || 'Micro-step';
                        const dur = parseInt(act.duration, 10) || 5;
                        const startTime = new Date(lastEndTime.getTime() + (i === 0 ? 0 : 2 * 60000));
                        const endTime = new Date(startTime.getTime() + dur * 60000);
                        lastEndTime = endTime;

                        TaskManager.create({
                            name: title,
                            duration: dur,
                            category: 'work',
                            priority: 2,
                            scheduledStart: startTime.toISOString(),
                            scheduledEnd: endTime.toISOString(),
                            notes: act.detail || ''
                        });
                    });
                    playDopamineChime();
                    showToast(`Scheduled ${result.actions.length} micro-steps to Day Flow! 📅`);
                    elAiResponse.classList.add('hidden');
                    renderAll();
                };
            }

            // Wire "⚡ Do This" buttons
            elAiResponse.querySelectorAll('.btn-vision-adopt').forEach(btn => {
                btn.onclick = () => {
                    const taskName = decodeURIComponent(btn.dataset.name);
                    const dur = parseInt(btn.dataset.dur, 10) || 5;
                    const newTask = TaskManager.create({
                        name: taskName,
                        duration: dur,
                        priority: 1,
                        category: 'work',
                        energy: 'medium'
                    });
                    currentFocusTask = newTask;
                    setTimerMinutes(dur);
                    startTimer();
                    playDopamineChime();
                    showToast(`Started: "${taskName}" 🎯`);
                    elAiResponse.classList.add('hidden');
                    renderAll();
                };
            });
            return;
        }

        // Fallback for string / markdown output
        const raw = typeof result === 'string' ? result : JSON.stringify(result);
        const formatted = escapeHtml(raw)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\s*\*\s*(.*)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
            .replace(/\n\n+/g, '<br><br>');

        elAiResponse.innerHTML = `
            <div class="vision-result-container">
                <div class="vision-result-header">
                    <span class="vision-result-badge">📸 Analysis</span>
                    <button id="btn-close-vision" class="icon-close-sm" title="Dismiss">✕</button>
                </div>
                <div class="vision-raw-text">${formatted}</div>
            </div>
        `;
        const btnClose = document.getElementById('btn-close-vision');
        if (btnClose) btnClose.onclick = () => elAiResponse.classList.add('hidden');
    }

    function downscaleImageForVision(dataUrl, maxDimension = 1024, quality = 0.6) {
        return new Promise((resolve) => {
            try {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = Math.round((height * maxDimension) / width);
                            width = maxDimension;
                        } else {
                            width = Math.round((width * maxDimension) / height);
                            height = maxDimension;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const downscaledUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(downscaledUrl.replace(/^data:image\/[a-z]+;base64,/, ''));
                };
                img.onerror = () => {
                    resolve(dataUrl.replace(/^data:image\/[a-z]+;base64,/, ''));
                };
                img.src = dataUrl;
            } catch (_) {
                resolve(dataUrl.replace(/^data:image\/[a-z]+;base64,/, ''));
            }
        });
    }

    // v1.3.0: the "Scan this page" button now reads page TEXT (see js/unfreeze.js).
    // The original screenshot-vision scan is kept here as a callable legacy path.
    const elBtnScanScreen = true;
    if (elBtnScanScreen) {
        window.FreezeFixLegacyVisionScan = async () => {
            elAiResponse.classList.remove('hidden');
            elAiResponse.innerHTML = `
                <div class="vision-loading">
                    <span class="vision-loading-spinner">📸</span>
                    <span>Capturing active tab & analyzing with Vision AI...</span>
                </div>
            `;

            // Chrome Extension native tab capture (zero-install, zero-python)
            if (typeof chrome !== 'undefined' && (chrome.tabs || chrome.runtime)) {
                // Step 1: Detect the active tab to check if it's an internal or restricted browser page
                let activeTab = null;
                if (chrome.tabs && chrome.tabs.query) {
                    try {
                        const tabs = await new Promise((resolve) => {
                            chrome.tabs.query({ active: true, lastFocusedWindow: true }, (t) => {
                                if (t && t.length > 0) resolve(t);
                                else chrome.tabs.query({ active: true, currentWindow: true }, resolve);
                            });
                        });
                        activeTab = tabs && tabs[0];
                    } catch (e) {
                        console.warn('Could not query active tab:', e);
                    }
                }

                // If on an internal browser page, inform the user cleanly (prevents false permission alerts)
                if (activeTab && activeTab.url) {
                    const u = activeTab.url.toLowerCase();
                    const isInternal = u.startsWith('chrome://') ||
                                       u.startsWith('chrome-extension://') ||
                                       u.startsWith('edge://') ||
                                       u.startsWith('about:') ||
                                       u.startsWith('view-source:') ||
                                       u.startsWith('devtools://') ||
                                       u.includes('chromewebstore.google.com') ||
                                       u.includes('chrome.google.com/webstore');

                    if (isInternal) {
                        const targetName = u.startsWith('chrome://extensions') ? 'chrome://extensions'
                                         : u.startsWith('chrome://newtab') ? 'New Tab'
                                         : (activeTab.title || 'Internal browser page');

                        elAiResponse.innerHTML = `
                            <div class="vision-notice-card">
                                <div class="vision-notice-header">
                                    <span class="vision-notice-badge">🔒 Chrome Restricted Page</span>
                                    <button id="btn-close-vision" class="icon-close-sm" title="Dismiss">✕</button>
                                </div>
                                <div class="vision-notice-title">Cannot scan <code>${escapeHtml(targetName)}</code></div>
                                <p class="vision-notice-text">
                                    Chrome's security sandbox strictly blocks extensions from taking screenshots or reading data on browser settings, extension managers, and Web Store pages.
                                </p>
                                <div class="vision-notice-action">
                                    <span class="vision-notice-arrow">👉</span>
                                    <div>
                                        <strong>Ready to scan:</strong> Switch to any website tab (e.g. news, documentation, YouTube, Wikipedia, or <a href="https://tiltcheck.me" target="_blank" style="color:var(--teal-l);text-decoration:underline">TiltCheck</a>), then click <strong>📸 Scan Webpage</strong>!
                                    </div>
                                </div>
                            </div>
                        `;
                        const btnClose = document.getElementById('btn-close-vision');
                        if (btnClose) btnClose.onclick = () => elAiResponse.classList.add('hidden');
                        return;
                    }
                }

                // Step 2: Attempt capture (direct call in side panel context first, then background worker fallback)
                let captureResult = null;
                const winId = activeTab ? activeTab.windowId : null;

                if (chrome.tabs && chrome.tabs.captureVisibleTab) {
                    try {
                        const directUrl = await new Promise((resolve, reject) => {
                            chrome.tabs.captureVisibleTab(winId, { format: 'jpeg', quality: 50 }, (dataUrl) => {
                                if (chrome.runtime.lastError || !dataUrl) {
                                    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 50 }, (dataUrl2) => {
                                        if (chrome.runtime.lastError || !dataUrl2) {
                                            reject(new Error(chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Direct capture failed'));
                                        } else {
                                            resolve(dataUrl2);
                                        }
                                    });
                                } else {
                                    resolve(dataUrl);
                                }
                            });
                        });
                        captureResult = { success: true, dataUrl: directUrl };
                    } catch (directErr) {
                        console.warn('Direct capture failed, trying background worker:', directErr);
                    }
                }

                if (!captureResult && chrome.runtime && chrome.runtime.sendMessage) {
                    captureResult = await new Promise((resolve) => {
                        chrome.runtime.sendMessage({ action: 'capture_active_tab' }, (res) => {
                            if (chrome.runtime.lastError) {
                                resolve({ success: false, error: chrome.runtime.lastError.message });
                            } else if (res) {
                                resolve(res);
                            } else {
                                resolve({ success: false, error: 'No response from background script' });
                            }
                        });
                    });
                }

                // Step 3: Handle capture success
                if (captureResult && captureResult.success && captureResult.dataUrl) {
                    try {
                        const b64 = await downscaleImageForVision(captureResult.dataUrl, 1024, 0.6);
                        const analysis = await AIHelper.analyzeScreenImage(b64);
                        renderVisionResult(analysis);
                    } catch (err) {
                        if (err && err.message === 'NO_GEMINI_KEY') {
                            elAiResponse.innerHTML = `
                                <div class="vision-notice-card">
                                    <div class="vision-notice-header">
                                        <span class="vision-notice-badge">📸 Tab Captured</span>
                                        <button id="btn-close-vision" class="icon-close-sm" title="Dismiss">✕</button>
                                    </div>
                                    <div class="vision-notice-title">Gemini API Key Required</div>
                                    <p class="vision-notice-text">
                                        Webpage screenshot captured successfully! To analyze it with Vision AI, add your free Gemini key in <a href="#" id="link-open-settings" style="color:var(--purple-l);text-decoration:underline;font-weight:600">⚙️ Settings</a> (free at <a href="https://aistudio.google.com" target="_blank" style="color:var(--teal-l)">aistudio.google.com</a>).
                                    </p>
                                </div>
                            `;
                            const link = document.getElementById('link-open-settings');
                            if (link) {
                                link.onclick = (e) => {
                                    e.preventDefault();
                                    document.getElementById('modal-settings').classList.remove('hidden');
                                    const keyInput = document.getElementById('sf-gemini-key');
                                    if (keyInput) keyInput.focus();
                                };
                            }
                            const btnClose = document.getElementById('btn-close-vision');
                            if (btnClose) btnClose.onclick = () => elAiResponse.classList.add('hidden');
                        } else {
                            let userFriendlyMsg = escapeHtml(err.message || 'Error communicating with AI service');
                            if (err.message && (err.message.includes('AUTH') || err.message.includes('401') || err.message.includes('403'))) {
                                userFriendlyMsg = 'Your Gemini API key appears invalid or expired. Please check your key in ⚙️ Settings.';
                            } else if (err.message && err.message.includes('TIMEOUT')) {
                                userFriendlyMsg = 'Webpage scan timed out. Please click "📸 Scan Webpage" to try again!';
                            } else if (err.message && err.message.includes('404')) {
                                userFriendlyMsg = 'Gemini Vision model returned 404. Models have been automatically updated to gemini-3.5-flash-lite / gemini-3.8-flash.';
                            }

                            elAiResponse.innerHTML = `
                                <div class="vision-notice-card">
                                    <div class="vision-notice-header">
                                        <span class="vision-notice-badge" style="color:#ef4444; border-color:rgba(239,68,68,0.3); background:rgba(239,68,68,0.1)">⚠️ Tab Scan Note</span>
                                        <button id="btn-close-vision" class="icon-close-sm" title="Dismiss">✕</button>
                                    </div>
                                    <p class="vision-notice-text">${userFriendlyMsg}</p>
                                </div>
                            `;
                            const btnClose = document.getElementById('btn-close-vision');
                            if (btnClose) btnClose.onclick = () => elAiResponse.classList.add('hidden');
                        }
                    }
                    return;
                }

                // Step 4: Diagnostic for capture failures
                const errMsg = String(captureResult?.error || 'Capture failed');

                // Check if background reported internal page
                if (captureResult?.isInternalPage) {
                    elAiResponse.innerHTML = `
                        <div class="vision-notice-card">
                            <div class="vision-notice-header">
                                <span class="vision-notice-badge">🔒 Chrome Restricted Page</span>
                                <button id="btn-close-vision" class="icon-close-sm" title="Dismiss">✕</button>
                            </div>
                            <div class="vision-notice-title">Cannot scan internal browser page</div>
                            <p class="vision-notice-text">
                                Chrome does not permit screenshot capture of internal browser settings or extension pages.
                            </p>
                            <div class="vision-notice-action">
                                <span class="vision-notice-arrow">👉</span>
                                <div>
                                    Switch to any regular website tab (e.g. articles, docs, YouTube, news, or work) and click <strong>📸 Scan Webpage</strong>!
                                </div>
                            </div>
                        </div>
                    `;
                    const btnClose = document.getElementById('btn-close-vision');
                    if (btnClose) btnClose.onclick = () => elAiResponse.classList.add('hidden');
                    return;
                }

                // Check actual manifest permissions
                let hasAllUrls = false;
                if (chrome.permissions && chrome.permissions.contains) {
                    try {
                        hasAllUrls = await new Promise((r) => chrome.permissions.contains({ origins: ['<all_urls>'] }, r));
                    } catch (_) {}
                }

                if (!hasAllUrls && (errMsg.includes('activeTab') || errMsg.includes('all_urls'))) {
                    elAiResponse.innerHTML = `
                        <div class="vision-notice-card">
                            <div class="vision-notice-header">
                                <span class="vision-notice-badge" style="color:#f59e0b; border-color:rgba(245,158,11,0.3); background:rgba(245,158,11,0.1)">💡 Permission Setup</span>
                                <button id="btn-close-vision" class="icon-close-sm" title="Dismiss">✕</button>
                            </div>
                            <div class="vision-notice-title">Reload Extension in Chrome</div>
                            <p class="vision-notice-text">
                                Updated tab capture permissions are ready. Go to <code>chrome://extensions</code> and click the ↻ reload icon on FreezeFix.
                            </p>
                            <div class="vision-notice-action">
                                <span class="vision-notice-arrow">👉</span>
                                <div>
                                    After clicking ↻ reload, <strong>switch to any website tab</strong> (not chrome://extensions) and click <strong>📸 Scan Webpage</strong>!
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    elAiResponse.innerHTML = `
                        <div class="vision-notice-card">
                            <div class="vision-notice-header">
                                <span class="vision-notice-badge">⚠️ Tab Scanner Note</span>
                                <button id="btn-close-vision" class="icon-close-sm" title="Dismiss">✕</button>
                            </div>
                            <div class="vision-notice-title">Could not capture active tab</div>
                            <p class="vision-notice-text">${escapeHtml(errMsg)}</p>
                            <div class="vision-notice-action">
                                <span class="vision-notice-arrow">👉</span>
                                <div>
                                    Make sure your active tab is on a normal website (e.g. Wikipedia, YouTube, news, docs) and try again.
                                </div>
                            </div>
                        </div>
                    `;
                }
                const btnClose = document.getElementById('btn-close-vision');
                if (btnClose) btnClose.onclick = () => elAiResponse.classList.add('hidden');
                return;
            }

            try {
                const resp = await fetch('http://localhost:8999/capture', { headers: trackerHeaders() });
                const data = await resp.json();
                if (data.status === 'ok' && data.image) {
                    const analysis = await AIHelper.analyzeScreenImage(data.image);
                    elAiResponse.innerHTML = `<strong>📸 Screen Analysis:</strong><br>` + escapeHtml(analysis).replace(/\n/g, '<br>');
                } else {
                    elAiResponse.textContent = "Webpage scanner ready. Add your Gemini key in Settings to analyze!";
                }
            } catch (err) {
                elAiResponse.innerHTML = "💡 <em>Webpage Vision:</em> Add your free Gemini key in ⚙️ Settings to analyze pages!";
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

    function playDopamineChime() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.38);
        } catch { /* Web Audio unavailable or muted */ }
    }

    function triggerCelebration(taskName) {
        playDopamineChime();
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
            id: 'vision',
            name: 'Webpage Vision Scanner',
            description: 'Direct browser tab capture for AI task analysis. Built directly into FreezeFix with zero external software.',
            getStatus: () => 'Built-in (Zero-install)',
            getActionLabel: () => 'Test',
            action: async () => {
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.runtime.sendMessage) {
                    chrome.runtime.sendMessage({ action: 'capture_active_tab' }, (response) => {
                        if (response && response.success) {
                            showToast('✅ Webpage Vision capture working perfectly!');
                        } else {
                            showToast('Webpage scanner is built-in and ready.');
                        }
                    });
                } else {
                    showToast('Webpage scanner is built-in and ready.');
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
        const badge = document.getElementById('vision-badge');
        if (!elStatus) return 'ready';
        
        // In Chrome extension context, active tab capture is 100% native
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
            elStatus.innerHTML = '<span style="color:var(--green)">● Built-in & ready (Zero Python required)</span>';
            if (badge) {
                badge.textContent = 'Ready';
                badge.style.background = '#10b981';
            }
            return 'ready';
        }

        // Desktop fallback
        try {
            const resp = await fetch('http://localhost:8999/', { headers: trackerHeaders() });
            const data = await resp.json();
            if (data.status === 'ok') {
                elStatus.innerHTML = '<span style="color:var(--green)">● Running</span>';
                return 'running';
            }
            elStatus.innerHTML = '<span style="color:var(--yellow)">● Idle</span>';
            return 'idle';
        } catch {
            elStatus.innerHTML = '<span style="color:var(--t3)">● Browser Tab Vision Ready</span>';
            return 'ready';
        }
    }

    const elBtnToggleTracker = document.getElementById('btn-toggle-tracker');
    if (elBtnToggleTracker) {
        elBtnToggleTracker.onclick = async () => {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.runtime.sendMessage) {
                const { gemini } = AIHelper.getKeys();
                chrome.runtime.sendMessage({ action: 'capture_active_tab' }, (response) => {
                    if (response && response.success) {
                        if (!gemini) {
                            showToast('Webpage captured! Add your free Gemini API key above for AI analysis.');
                            const keyInput = document.getElementById('sf-gemini-key');
                            if (keyInput) keyInput.focus();
                        } else {
                            showToast('✅ Webpage scanner is working perfectly!');
                        }
                    } else {
                        showToast(response && response.error ? response.error : 'Webpage scanner ready.');
                    }
                });
                return;
            }
            showToast('Webpage Vision is built-in. No Python required!');
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
        
        // Apply theme (auto follows the OS via prefers-color-scheme) & legible font
        try {
            const mode = s.themeMode || 'auto';
            if (mode === 'light' || mode === 'dark') document.documentElement.setAttribute('data-theme', mode);
            else document.documentElement.removeAttribute('data-theme');
            document.body.classList.toggle('font-legible', !!s.fontLegible);
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
            const elTheme = document.getElementById('sf-theme-mode');
            if (elTheme) elTheme.value = s.themeMode || 'auto';
            const elFontLegible = document.getElementById('sf-font-legible');
            if (elFontLegible) elFontLegible.checked = !!s.fontLegible;

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
        const s = Object.assign(loadSettings(), {
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
            frostStyle: document.getElementById('sf-frost-style') ? document.getElementById('sf-frost-style').value : 'soft',
            themeMode: document.getElementById('sf-theme-mode') ? document.getElementById('sf-theme-mode').value : 'auto',
            fontLegible: document.getElementById('sf-font-legible') ? document.getElementById('sf-font-legible').checked : false
        });

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

        // v1.3.0: always open on the calm Focus view (Unfreeze box + Up Next + timer + brain dump)
        setView('focus');
        return setView;
    }
    const setView = initViewTabs();
    const btnMoreDayflow = document.getElementById('btn-more-dayflow');
    if (btnMoreDayflow) btnMoreDayflow.onclick = () => setView('timeline');
    const btnTimelineBack = document.getElementById('btn-timeline-back');
    if (btnTimelineBack) btnTimelineBack.onclick = () => setView('focus');

    // ── Header Quick Tools ──
    const btnHeaderSettings = document.getElementById('btn-header-settings');
    if (btnHeaderSettings) {
        btnHeaderSettings.onclick = () => {
            if (elBtnSettings && elBtnSettings.onclick) {
                elBtnSettings.onclick();
            } else if (elModalSettings) {
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

    const elModalHelp = document.getElementById('modal-help');
    const btnHeaderHelp = document.getElementById('btn-header-help');
    if (btnHeaderHelp) {
        btnHeaderHelp.onclick = () => {
            if (elModalHelp) elModalHelp.classList.remove('hidden');
        };
    }

    const btnHeaderChangelog = document.getElementById('btn-header-changelog');
    const elModalChangelog = document.getElementById('modal-changelog');
    if (btnHeaderChangelog) {
        btnHeaderChangelog.onclick = () => {
            if (elModalChangelog) elModalChangelog.classList.remove('hidden');
        };
    }

    const btnOpenChangelogHelp = document.getElementById('btn-open-changelog-from-help');
    if (btnOpenChangelogHelp) {
        btnOpenChangelogHelp.onclick = () => {
            if (elModalHelp) elModalHelp.classList.add('hidden');
            if (elModalChangelog) elModalChangelog.classList.remove('hidden');
        };
    }

    // ── Shared hooks for js/unfreeze.js ──
    window.FreezeFixApp = {
        renderAll,
        showToast,
        playDopamineChime,
        setView,
        startTimerFor(mins) { setTimerMinutes(mins); startTimer(); },
        openSettings() {
            if (btnHeaderSettings && btnHeaderSettings.onclick) btnHeaderSettings.onclick();
            const keyInput = document.getElementById('sf-groq-key');
            if (keyInput) setTimeout(() => keyInput.focus(), 50);
        }
    };

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

