/* ========================================
   DAILY STACK - Task Management Engine
   Minimalist To-Do PWA
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

// ========================================
// STATE
// ========================================
let tasks = [];
let deferredPrompt = null;
const STORAGE_KEY = 'daily-stack-tasks';

// ========================================
// INITIALIZATION
// ========================================
function init() {
    console.log('📋 Daily Stack initializing...');

    loadTasks();
    renderTasks();
    updateProgress();
    initEventListeners();
    registerServiceWorker();
    checkInstallPrompt();

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
        } catch (e) {
            console.error('Failed to load tasks:', e);
            tasks = [];
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
        createdAt: Date.now()
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
        saveTasks();

        // Update UI with animation
        const card = document.querySelector(`[data-id="${id}"]`);
        if (card) {
            card.classList.toggle('completed', task.completed);
        }

        updateProgress();
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

    card.innerHTML = `
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

    // Tap to toggle complete
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.delete-btn')) {
            toggleComplete(task.id);
        }
    });

    // Delete button
    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(task.id);
    });

    // Double tap to delete (mobile)
    let lastTap = 0;
    card.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;

        if (tapLength < 300 && tapLength > 0) {
            e.preventDefault();
            deleteTask(task.id);
        }
        lastTap = currentTime;
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
// START THE APP
// ========================================
document.addEventListener('DOMContentLoaded', init);
