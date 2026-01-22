/* ========================================
   DAILY STACK - Task Management Engine
   Minimalist To-Do PWA with Advanced Features
======================================== */

// ========================================
// DOM ELEMENTS
// ========================================
const taskInput = document.getElementById('task-input');
const addBtn = document.getElementById('add-btn');
const taskStack = document.getElementById('task-stack');
const emptyState = document.getElementById('empty-state');
const progressPercent = document.getElementById('progress-percent');
const completedCount = document.getElementById('completed-count');
const totalCount = document.getElementById('total-count');
const progressRingFill = document.querySelector('.progress-ring-fill');
const installBanner = document.getElementById('install-banner');
const installBtn = document.getElementById('install-btn');
const dismissInstall = document.getElementById('dismiss-install');

// New Elements
const historyBtn = document.getElementById('history-btn');
const historySidebar = document.getElementById('history-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const closeSidebar = document.getElementById('close-sidebar');
const historyList = document.getElementById('history-list');
const historyEmpty = document.getElementById('history-empty');
const heatmapGrid = document.getElementById('heatmap-grid');
const clearDayBtn = document.getElementById('clear-day-btn');
const confettiContainer = document.getElementById('confetti-container');

// ========================================
// STATE
// ========================================
let tasks = [];
let historyData = {};
let deferredPrompt = null;
let wasComplete = false; // Track if we were at 100%
const STORAGE_KEY = 'daily-stack-tasks';
const HISTORY_KEY = 'daily-stack-history';
const HEATMAP_KEY = 'daily-stack-heatmap';

// Energy levels and their icons
const ENERGY_LEVELS = {
    medium: { icon: '⚡', next: 'high' },
    high: { icon: '🔥', next: 'low' },
    low: { icon: '🌙', next: 'medium' }
};

// ========================================
// INITIALIZATION
// ========================================
function init() {
    console.log('📋 Daily Stack initializing...');

    loadTasks();
    loadHistory();
    renderTasks();
    updateProgress();
    initEventListeners();
    registerServiceWorker();
    checkInstallPrompt();
    updateAmbientGlow();
    renderHeatmap();
    renderHistoryList();

    // Update ambient glow every minute
    setInterval(updateAmbientGlow, 60000);

    console.log('✅ Daily Stack ready!');
}

// ========================================
// LOCAL STORAGE
// ========================================
function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            tasks = JSON.parse(stored);
            // Migrate old tasks without energy level
            tasks = tasks.map(t => ({
                ...t,
                energyLevel: t.energyLevel || 'medium'
            }));
        } catch (e) {
            console.error('Failed to load tasks:', e);
            tasks = [];
        }
    }
}

function saveHistory() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(historyData));
}

function loadHistory() {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
        try {
            historyData = JSON.parse(stored);
        } catch (e) {
            console.error('Failed to load history:', e);
            historyData = {};
        }
    }
}

// ========================================
// TASK OPERATIONS
// ========================================
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function addTask(text) {
    if (!text.trim()) return;

    const task = {
        id: generateId(),
        text: text.trim(),
        completed: false,
        createdAt: Date.now(),
        completedAt: null,
        completedHour: null,
        energyLevel: 'medium'
    };

    tasks.unshift(task);
    saveTasks();
    renderTasks();
    updateProgress();

    // Clear input
    taskInput.value = '';
    taskInput.focus();
}

function toggleComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        
        if (task.completed) {
            task.completedAt = Date.now();
            task.completedHour = new Date().getHours();
            
            // Haptic feedback
            hapticFeedback();
        } else {
            task.completedAt = null;
            task.completedHour = null;
        }
        
        saveTasks();

        // Update UI with animation
        const card = document.querySelector(`[data-id="${id}"]`);
        if (card) {
            card.classList.toggle('completed', task.completed);
        }

        updateProgress();
        updateHeatmapFromTasks();
    }
}

function deleteTask(id) {
    const card = document.querySelector(`[data-id="${id}"]`);
    if (card) {
        card.classList.add('exiting');

        setTimeout(() => {
            tasks = tasks.filter(t => t.id !== id);
            saveTasks();
            renderTasks();
            updateProgress();
        }, 300);
    }
}

function cycleEnergy(id, event) {
    event.stopPropagation();
    
    const task = tasks.find(t => t.id === id);
    if (task) {
        const currentLevel = task.energyLevel || 'medium';
        task.energyLevel = ENERGY_LEVELS[currentLevel].next;
        saveTasks();
        
        // Update button
        const btn = event.currentTarget;
        btn.textContent = ENERGY_LEVELS[task.energyLevel].icon;
        btn.className = `energy-btn ${task.energyLevel}`;
    }
}

function editTask(id) {
    const card = document.querySelector(`[data-id="${id}"]`);
    const textSpan = card.querySelector('.task-text');
    const task = tasks.find(t => t.id === id);
    
    if (!task || !textSpan) return;
    
    // Create input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-edit-input';
    input.value = task.text;
    input.maxLength = 100;
    
    // Replace text with input
    textSpan.replaceWith(input);
    input.focus();
    input.select();
    
    // Save on blur or Enter
    const saveEdit = () => {
        const newText = input.value.trim();
        if (newText && newText !== task.text) {
            task.text = newText;
            saveTasks();
        }
        renderTasks();
    };
    
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            renderTasks();
        }
    });
}

// ========================================
// CLEAR DAY & HISTORY
// ========================================
function clearDay() {
    if (tasks.length === 0) return;
    
    const completedTasks = tasks.filter(t => t.completed);
    const totalTasks = tasks.length;
    
    // Create date key
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];
    const dateFormatted = now.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
    });
    
    // Calculate hourly completions
    const hourlyCompletions = {};
    completedTasks.forEach(task => {
        if (task.completedHour !== null) {
            hourlyCompletions[task.completedHour] = (hourlyCompletions[task.completedHour] || 0) + 1;
        }
    });
    
    // Save to history
    historyData[dateKey] = {
        date: dateFormatted,
        completed: completedTasks.length,
        total: totalTasks,
        tasks: tasks.map(t => ({
            text: t.text,
            completed: t.completed,
            energyLevel: t.energyLevel,
            completedHour: t.completedHour
        })),
        hourlyCompletions
    };
    
    saveHistory();
    
    // Merge hourly completions into global heatmap
    updateGlobalHeatmap(hourlyCompletions);
    
    // Clear tasks
    tasks = [];
    saveTasks();
    wasComplete = false;
    
    renderTasks();
    updateProgress();
    renderHistoryList();
    renderHeatmap();
    
    // Show confirmation
    showClearConfirmation();
}

function showClearConfirmation() {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = '✨ Day saved to history!';
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--accent);
        color: var(--bg-primary);
        padding: 12px 24px;
        border-radius: 50px;
        font-size: 0.9rem;
        font-weight: 600;
        z-index: 1000;
        animation: toastIn 0.3s ease, toastOut 0.3s ease 2s forwards;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 2500);
}

// ========================================
// RENDERING
// ========================================
function renderTasks() {
    taskStack.innerHTML = '';

    if (tasks.length === 0) {
        emptyState.classList.remove('hidden');
        taskStack.classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    taskStack.classList.remove('hidden');

    tasks.forEach((task, index) => {
        const card = createTaskCard(task);
        card.style.animationDelay = `${index * 0.05}s`;
        card.classList.add('entering');
        taskStack.appendChild(card);
    });
}

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card ${task.completed ? 'completed' : ''}`;
    card.dataset.id = task.id;

    const energyLevel = task.energyLevel || 'medium';
    const energyIcon = ENERGY_LEVELS[energyLevel].icon;

    card.innerHTML = `
        <button class="energy-btn ${energyLevel}" aria-label="Set energy level">
            ${energyIcon}
        </button>
        <div class="task-checkbox">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>
        <span class="task-text">${escapeHtml(task.text)}</span>
        <button class="delete-btn" aria-label="Delete task">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;

    // Energy button
    const energyBtn = card.querySelector('.energy-btn');
    energyBtn.addEventListener('click', (e) => cycleEnergy(task.id, e));

    // Checkbox click to toggle
    const checkbox = card.querySelector('.task-checkbox');
    checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleComplete(task.id);
    });
    
    // Double click on text to edit
    const textSpan = card.querySelector('.task-text');
    textSpan.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        editTask(task.id);
    });
    
    // Tap on text to edit (mobile)
    let textTapTimeout = null;
    textSpan.addEventListener('touchend', (e) => {
        if (textTapTimeout) {
            clearTimeout(textTapTimeout);
            textTapTimeout = null;
            e.preventDefault();
            editTask(task.id);
        } else {
            textTapTimeout = setTimeout(() => {
                textTapTimeout = null;
            }, 300);
        }
    });

    // Delete button
    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(task.id);
    });

    // Swipe to delete
    setupSwipeToDelete(card, task.id);

    return card;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// SWIPE TO DELETE
// ========================================
function setupSwipeToDelete(card, taskId) {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    card.addEventListener('touchstart', (e) => {
        if (e.target.closest('.energy-btn') || e.target.closest('.delete-btn')) return;
        startX = e.touches[0].clientX;
        isDragging = true;
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
        if (!isDragging) return;

        currentX = e.touches[0].clientX;
        const diff = startX - currentX;

        if (diff > 20) {
            card.classList.add('swiping');
            card.style.transform = `translateX(${-Math.min(diff, 100)}px)`;
        }
    }, { passive: true });

    card.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;

        const diff = startX - currentX;

        if (diff > 80) {
            deleteTask(taskId);
        } else {
            card.classList.remove('swiping');
            card.style.transform = '';
        }
    });
}

// ========================================
// PROGRESS UPDATE
// ========================================
function updateProgress() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    // Update text
    progressPercent.textContent = percent;
    completedCount.textContent = completed;
    totalCount.textContent = total;

    // Update ring
    const circumference = 2 * Math.PI * 42; // radius = 42
    const offset = circumference - (percent / 100) * circumference;
    progressRingFill.style.strokeDashoffset = offset;
    
    // Confetti celebration at 100%
    if (percent === 100 && !wasComplete && total > 0) {
        wasComplete = true;
        setTimeout(triggerConfetti, 300);
    } else if (percent < 100) {
        wasComplete = false;
    }
}

// ========================================
// CONFETTI CELEBRATION
// ========================================
function triggerConfetti() {
    const colors = ['#00D9A5', '#ff6b6b', '#ffd93d', '#6bcb77', '#4ecdc4', '#ff9ff3', '#54a0ff'];
    const particleCount = 80;
    
    for (let i = 0; i < particleCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        const color = colors[Math.floor(Math.random() * colors.length)];
        const left = Math.random() * 100;
        const delay = Math.random() * 0.5;
        const size = Math.random() * 8 + 6;
        const duration = Math.random() * 1.5 + 2;
        
        confetti.style.cssText = `
            left: ${left}%;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
            animation-delay: ${delay}s;
            animation-duration: ${duration}s;
        `;
        
        confettiContainer.appendChild(confetti);
    }
    
    // Cleanup after animation
    setTimeout(() => {
        confettiContainer.innerHTML = '';
    }, 4000);
    
    // Extra haptic burst
    if ('vibrate' in navigator) {
        navigator.vibrate([50, 30, 50, 30, 100]);
    }
}

// ========================================
// HAPTIC FEEDBACK
// ========================================
function hapticFeedback() {
    if ('vibrate' in navigator) {
        navigator.vibrate(10);
    }
}

// ========================================
// HISTORY SIDEBAR
// ========================================
function openHistorySidebar() {
    historySidebar.classList.add('active');
    sidebarOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeHistorySidebar() {
    historySidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function renderHistoryList() {
    const entries = Object.entries(historyData).sort((a, b) => b[0].localeCompare(a[0]));
    
    if (entries.length === 0) {
        historyList.classList.add('hidden');
        historyEmpty.classList.remove('hidden');
        return;
    }
    
    historyEmpty.classList.add('hidden');
    historyList.classList.remove('hidden');
    historyList.innerHTML = '';
    
    entries.forEach(([dateKey, data]) => {
        const entry = document.createElement('div');
        entry.className = 'history-entry';
        
        entry.innerHTML = `
            <div class="history-entry-header">
                <span class="history-date">${data.date}</span>
                <span class="history-stats">${data.completed}/${data.total} done</span>
            </div>
            <div class="history-tasks">
                ${data.tasks.map(t => `
                    <div class="history-task-item">
                        <span class="history-task-check">${t.completed ? '✓' : '○'}</span>
                        <span>${escapeHtml(t.text)}</span>
                    </div>
                `).join('')}
            </div>
        `;
        
        entry.querySelector('.history-entry-header').addEventListener('click', () => {
            entry.classList.toggle('expanded');
        });
        
        historyList.appendChild(entry);
    });
}

// ========================================
// FOCUS HEATMAP
// ========================================
function renderHeatmap() {
    heatmapGrid.innerHTML = '';
    
    // Load heatmap data
    const heatmapData = JSON.parse(localStorage.getItem(HEATMAP_KEY) || '{}');
    
    // Find max for normalization
    const maxVal = Math.max(1, ...Object.values(heatmapData));
    
    for (let hour = 0; hour < 24; hour++) {
        const block = document.createElement('div');
        block.className = 'heatmap-hour';
        
        const count = heatmapData[hour] || 0;
        const intensity = count / maxVal;
        
        block.style.opacity = 0.1 + (intensity * 0.9);
        
        if (intensity > 0.3) {
            block.classList.add('active');
        }
        
        // Format hour for tooltip
        const hourFormatted = hour === 0 ? '12 AM' : 
                             hour < 12 ? `${hour} AM` : 
                             hour === 12 ? '12 PM' : 
                             `${hour - 12} PM`;
        
        block.setAttribute('data-hour', `${hourFormatted}: ${count} tasks`);
        
        heatmapGrid.appendChild(block);
    }
}

function updateHeatmapFromTasks() {
    // Get current heatmap data
    const heatmapData = JSON.parse(localStorage.getItem(HEATMAP_KEY) || '{}');
    
    // Count completed tasks by hour from current tasks
    tasks.forEach(task => {
        if (task.completed && task.completedHour !== null) {
            // We track this per-save, so we need to be careful not to double-count
            // Only update on new completions
        }
    });
    
    // Re-render with existing data
    renderHeatmap();
}

function updateGlobalHeatmap(hourlyCompletions) {
    const heatmapData = JSON.parse(localStorage.getItem(HEATMAP_KEY) || '{}');
    
    Object.entries(hourlyCompletions).forEach(([hour, count]) => {
        heatmapData[hour] = (heatmapData[hour] || 0) + count;
    });
    
    localStorage.setItem(HEATMAP_KEY, JSON.stringify(heatmapData));
}

// ========================================
// AMBIENT GLOW
// ========================================
function updateAmbientGlow() {
    const hour = new Date().getHours();
    
    // Remove all ambient classes
    document.body.classList.remove('ambient-morning', 'ambient-afternoon', 'ambient-evening', 'ambient-night');
    
    // Add appropriate class based on time
    if (hour >= 6 && hour < 12) {
        document.body.classList.add('ambient-morning');
    } else if (hour >= 12 && hour < 18) {
        document.body.classList.add('ambient-afternoon');
    } else if (hour >= 18 && hour < 22) {
        document.body.classList.add('ambient-evening');
    } else {
        document.body.classList.add('ambient-night');
    }
}

// ========================================
// EVENT LISTENERS
// ========================================
function initEventListeners() {
    // Add task
    addBtn.addEventListener('click', () => {
        addTask(taskInput.value);
    });

    // Enter key
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask(taskInput.value);
        }
    });

    // History sidebar
    historyBtn.addEventListener('click', openHistorySidebar);
    closeSidebar.addEventListener('click', closeHistorySidebar);
    sidebarOverlay.addEventListener('click', closeHistorySidebar);
    
    // Clear day
    clearDayBtn.addEventListener('click', clearDay);

    // Install banner
    if (dismissInstall) {
        dismissInstall.addEventListener('click', () => {
            installBanner.classList.add('hidden');
            localStorage.setItem('install-dismissed', 'true');
        });
    }

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`Install prompt outcome: ${outcome}`);
                deferredPrompt = null;
                installBanner.classList.add('hidden');
            }
        });
    }
    
    // Keyboard shortcut to open sidebar
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && historySidebar.classList.contains('active')) {
            closeHistorySidebar();
        }
        if (e.key === 'h' && e.ctrlKey) {
            e.preventDefault();
            openHistorySidebar();
        }
    });
}

// ========================================
// PWA SETUP
// ========================================
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker registered:', registration.scope);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
}

function checkInstallPrompt() {
    // Check if already dismissed
    if (localStorage.getItem('install-dismissed')) {
        return;
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return;
    }

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;

        // Show install banner after short delay
        setTimeout(() => {
            if (installBanner) {
                installBanner.classList.remove('hidden');
            }
        }, 3000);
    });
}

// ========================================
// TOAST ANIMATION STYLES (injected)
// ========================================
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    @keyframes toastIn {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes toastOut {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
`;
document.head.appendChild(toastStyles);

// ========================================
// START THE APP
// ========================================
document.addEventListener('DOMContentLoaded', init);
