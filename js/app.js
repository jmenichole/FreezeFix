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
    let currentFocusTask = null;
    let timerMins = 25;
    let timerSecsLeft = 25 * 60;
    let timerTotalSecs = 25 * 60;
    let timerInterval = null;
    let isTimerRunning = false;
    let currentBreakdownSteps = [];
    let currentBreakdownTaskName = '';

    // ── Initialization ──
    initClock();
    renderAll();
    setInterval(updateClock, 1000);
    setInterval(renderTimelineNowLine, 60000);

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
        const pending = TaskManager.getPending();
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

        // Render Scheduled Tasks
        const scheduled = tasks.filter(t => t.scheduledStart && t.scheduledEnd);
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
                    <div class="task-block-name">${task.name}</div>
                    <div class="task-block-dur">${task.duration}m</div>
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

            const catInfo = TaskManager.CATEGORIES[task.category] || TaskManager.CATEGORIES.other;
            const priInfo = TaskManager.PRIORITIES[task.priority] || TaskManager.PRIORITIES[3];

            item.innerHTML = `
                <div class="task-check ${task.completed ? 'checked' : ''}" onclick="event.stopPropagation(); toggleComplete(${task.id})">
                    ${task.completed ? '✓' : ''}
                </div>
                <div class="task-content">
                    <div class="task-name">${task.name}</div>
                    <div class="task-meta">
                        <span class="task-cat cat-${task.category}">${catInfo.icon} ${catInfo.label}</span>
                        <span class="task-pri">${priInfo.icon}</span>
                        <span class="task-dur">⏱ ${task.duration}m</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="icon-btn" title="Magic Breakdown" onclick="event.stopPropagation(); startBreakdown(${task.id})">🪄</button>
                    <button class="icon-btn" title="Edit" onclick="event.stopPropagation(); openEditTaskModalById(${task.id})">✏️</button>
                    <button class="icon-btn" title="Delete" onclick="event.stopPropagation(); deleteTask(${task.id})">🗑</button>
                </div>
            `;
            item.onclick = () => openEditTaskModal(task);
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
        const pending = TaskManager.getPending();
        currentFocusTask = Scheduler.getCurrentTask(pending);

        if (!currentFocusTask) {
            elNextName.textContent = "🎉 All done! Ready for a break or a new task.";
            elNextMeta.textContent = "";
            if (elBtnStartFocus) elBtnStartFocus.style.display = "none";
            if (elBtnMarkDone) elBtnMarkDone.style.display = "none";
            if (elBtnGoodEnough) elBtnGoodEnough.style.display = "none";
            if (elBtnSkipTask) elBtnSkipTask.style.display = "none";
            return;
        }

        elNextName.textContent = currentFocusTask.name;
        const catInfo = TaskManager.CATEGORIES[currentFocusTask.category] || TaskManager.CATEGORIES.other;
        elNextMeta.textContent = `${catInfo.icon} ${catInfo.label} • ⏱ ${currentFocusTask.duration} minutes`;

        if (elBtnStartFocus) elBtnStartFocus.style.display = "inline-flex";
        if (elBtnMarkDone) elBtnMarkDone.style.display = "inline-flex";
        if (elBtnGoodEnough) elBtnGoodEnough.style.display = "inline-flex";
        if (elBtnSkipTask) elBtnSkipTask.style.display = "inline-flex";
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
        } else {
            TaskManager.update(id, { completed: false, completedAt: null });
        }
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
            document.getElementById('tf-deadline').value = task.deadline || '';
            document.getElementById('tf-scheduled').value = task.scheduledStart || '';
            document.getElementById('tf-notes').value = task.notes || '';
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

    // ── Brain Dump ──
    function handleBrainDump() {
        const text = elBrainInput.value.trim();
        if (!text) return;
        TaskManager.create({ name: text, duration: 20, priority: 3 });
        elBrainInput.value = '';
        showToast('Dumped into tasks! ⚡');
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
    window.startBreakdown = async function(id) {
        const task = TaskManager.getById(id);
        if (!task) return;
        currentBreakdownTaskName = task.name;
        document.getElementById('breakdown-task-title').textContent = `Task: ${task.name}`;
        const elList = document.getElementById('breakdown-steps');
        const elLoading = document.getElementById('breakdown-loading');

        elList.innerHTML = '';
        elLoading.classList.remove('hidden');
        elModalBreakdown.classList.remove('hidden');

        currentBreakdownSteps = await AIHelper.generateTaskBreakdown(task.name);
        elLoading.classList.add('hidden');

        renderBreakdownSteps();
    };

    function renderBreakdownSteps() {
        const elList = document.getElementById('breakdown-steps');
        elList.innerHTML = '';
        currentBreakdownSteps.forEach((step, idx) => {
            const item = document.createElement('div');
            item.className = 'breakdown-step';
            item.innerHTML = `
                <div class="step-num">${idx + 1}</div>
                <div style="flex:1">
                    <div class="step-name">${step.name}</div>
                    <div class="step-duration">⏱ ${step.duration} mins</div>
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
        const advice = await AIHelper.suggestNextTask(TaskManager.getPending(), HistoryManager.getStreak());
        elAiResponse.innerHTML = advice.replace(/\n/g, '<br>');
    };

    const elBtnScanScreen = document.getElementById('btn-scan-screen');
    if (elBtnScanScreen) {
        elBtnScanScreen.onclick = async () => {
            elAiResponse.classList.remove('hidden');
            elAiResponse.textContent = "📸 Snapping screen & analyzing with Vision AI...";
            try {
                const resp = await fetch('http://localhost:8999/capture');
                const data = await resp.json();
                if (data.status === 'ok' && data.image) {
                    const analysis = await AIHelper.analyzeScreenImage(data.image);
                    elAiResponse.innerHTML = `<strong>📸 Screen Analysis:</strong><br>` + analysis.replace(/\n/g, '<br>');
                } else {
                    elAiResponse.textContent = "⚠️ Tracker script not running. Start tracker.py on your machine to use Screen Vision!";
                }
            } catch (err) {
                elAiResponse.innerHTML = "💡 <em>To enable Screen Vision:</em> run <code>python tracker.py</code> on your computer!";
            }
        };
    }

    function importTasksFromGitHubEvents(events) {
        let count = 0;
        events.forEach(ev => {
            if (ev.type === 'PushEvent' && ev.payload && ev.payload.commits) {
                ev.payload.commits.forEach(c => {
                    TaskManager.create({ name: `GitHub: ${c.message}`, duration: 30, category: 'work', priority: 2 });
                    count++;
                });
            }
        });
        if (count > 0) {
            showToast(`Imported ${count} GitHub commit tasks! 🐙`);
            renderAll();
        } else {
            showToast("No recent public commits found.");
        }
    }

    const elBtnSyncGithub = document.getElementById('btn-sync-github');
    if (elBtnSyncGithub) {
        elBtnSyncGithub.onclick = async () => {
            const user = prompt("Enter your GitHub username:");
            if (!user) return;
            showToast(`Syncing GitHub activity for @${user}...`);

            try {
                const resp = await fetch(`https://api.github.com/users/${user}/events/public`);
                if (resp.ok) {
                    const events = await resp.json();
                    if (Array.isArray(events)) {
                        importTasksFromGitHubEvents(events);
                        return;
                    }
                }
            } catch (err) {
                console.warn('Direct GitHub API request failed:', err);
            }

            try {
                const resp = await fetch(`http://localhost:8999/github?user=${user}`);
                const data = await resp.json();
                if (data.status === 'ok' && Array.isArray(data.events)) {
                    importTasksFromGitHubEvents(data.events);
                    return;
                }
            } catch (err) {
                console.warn('Tracker proxy GitHub request failed:', err);
            }

            showToast("Could not connect to GitHub API or tracker proxy.");
        };
    }

    // ── Filters & Modals ──
    document.querySelectorAll('#task-filters .chip').forEach(chip => {
        chip.onclick = () => {
            document.querySelectorAll('#task-filters .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.dataset.filter;
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
            id: 'github',
            name: 'GitHub',
            description: 'Import GitHub commits as tasks on demand. No background sync unless you press this connector.',
            getStatus: (settings) => settings.githubUser ? `Connected as @${settings.githubUser}` : 'Disconnected',
            getActionLabel: (settings) => settings.githubUser ? 'Reconnect' : 'Connect',
            action: async () => {
                const settings = loadSettings();
                const currentUser = settings.githubUser || '';
                const user = prompt('Enter your GitHub username:', currentUser);
                if (user === null) return;
                settings.githubUser = user.trim();
                saveSettings(settings);
                renderIntegrationList();
                showToast(settings.githubUser ? `GitHub connected as @${settings.githubUser}` : 'GitHub disconnected');
            }
        },
        {
            id: 'calendar',
            name: 'Google Calendar',
            description: 'Sync Google Calendar events via iCal URL. Only fetches when you press sync.',
            getStatus: (settings) => settings.gcalUrl ? 'Configured' : 'Not configured',
            getActionLabel: (settings) => settings.gcalUrl ? 'Update' : 'Configure',
            action: async () => {
                const settings = loadSettings();
                const url = prompt('Paste your Google Calendar iCal URL:', settings.gcalUrl || '');
                if (url === null) return;
                settings.gcalUrl = url.trim();
                saveSettings(settings);
                const elGcal = document.getElementById('sf-gcal-url');
                if (elGcal) elGcal.value = settings.gcalUrl;
                renderIntegrationList();
                showToast(settings.gcalUrl ? 'Google Calendar URL saved.' : 'Google Calendar disconnected.');
            }
        },
        {
            id: 'backup',
            name: 'Local Backup',
            description: 'Export and restore tasks/settings from a local JSON file. No external service required.',
            getStatus: () => 'Local backup available',
            getActionLabel: () => 'Backup / Restore',
            action: async () => {
                const choice = prompt('Type BACKUP to save a file, or RESTORE to load a backup:', 'BACKUP');
                if (!choice) return;
                const mode = choice.trim().toUpperCase();
                if (mode === 'BACKUP') {
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
                    return;
                }
                if (mode === 'RESTORE') {
                    const fileInput = document.getElementById('json-load-input');
                    if (fileInput) {
                        fileInput.click();
                        showToast('Select a backup file to restore.');
                    }
                    return;
                }
                showToast('Canceled. Type BACKUP or RESTORE.');
            }
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
            const actionLabel = connector.getActionLabel(settings);
            return `
                <div class="integration-card" id="integration-card-${connector.id}">
                    <div class="integration-card-header">
                        <div>
                            <div class="integration-card-title">${connector.name}</div>
                            <div class="integration-status">${status}</div>
                        </div>
                        <button type="button" id="integration-btn-${connector.id}" class="btn btn-ghost btn-xs integration-action-btn">${actionLabel}</button>
                    </div>
                    <div class="integration-description">${connector.description}</div>
                </div>
            `;
        }).join('');

        Connectors.forEach(connector => {
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
            const resp = await fetch('http://localhost:8999/');
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
            const trackerProcess = child.spawn('python', [trackerPath], {
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: true
            });

            trackerProcess.stdout.on('data', data => console.log(`[Tracker]: ${data}`));
            trackerProcess.stderr.on('data', data => console.error(`[Tracker Error]: ${data}`));
            trackerProcess.unref();
            return true;
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
        
        // Apply width
        if (s.widgetWidth && app) {
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
                                <div class="history-name">${h.taskName}</div>
                                <div class="history-date">${new Date(h.completedAt).toLocaleString()} • ${h.plannedDuration}m</div>
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

            ['sf-sec-clock', 'sf-sec-next', 'sf-sec-timer', 'sf-sec-dump', 'sf-sec-ai', 'sf-sec-timeline', 'sf-sec-tasks'].forEach(id => {
                const input = document.getElementById(id);
                if (input) input.checked = s[id] !== false;
            });

            renderIntegrationList();
            checkTrackerStatus();
            elModalSettings.classList.remove('hidden');
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
});
