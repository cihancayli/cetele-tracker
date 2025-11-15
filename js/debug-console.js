// ==========================================
// DEBUG CONSOLE - On-Screen Logging System
// ==========================================

let debugLogs = [];
let debugConsoleVisible = false;
let logCount = 0;

// Override console.log, console.error, console.warn
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Initialize debug console
function initDebugConsole() {
    debugLog('info', 'Debug Console Active', 'All operations will be logged here in real-time.');

    // Override console methods
    console.log = function(...args) {
        originalConsoleLog.apply(console, args);
        debugLog('info', args[0], args.slice(1).join(' '));
    };

    console.error = function(...args) {
        originalConsoleError.apply(console, args);
        debugLog('error', args[0], args.slice(1).join(' '));
    };

    console.warn = function(...args) {
        originalConsoleWarn.apply(console, args);
        debugLog('warning', args[0], args.slice(1).join(' '));
    };
}

// Add a log to the debug console
function debugLog(type, message, data = null) {
    const time = new Date().toLocaleTimeString();
    const log = {
        type,
        message,
        data,
        time,
        timestamp: Date.now()
    };

    debugLogs.push(log);
    logCount++;

    // Update badge
    const badge = document.getElementById('debugBadge');
    if (badge) {
        badge.textContent = logCount;
    }

    // Add to DOM
    const logsContainer = document.getElementById('debugLogs');
    if (logsContainer) {
        const logEl = createLogElement(log);
        logsContainer.appendChild(logEl);

        // Auto-scroll to bottom
        logsContainer.scrollTop = logsContainer.scrollHeight;

        // Limit to last 100 logs
        if (logsContainer.children.length > 100) {
            logsContainer.removeChild(logsContainer.firstChild);
        }
    }
}

// Create log HTML element
function createLogElement(log) {
    const div = document.createElement('div');
    div.className = `debug-log ${log.type}`;

    let html = `
        <span class="debug-log-time">${log.time}</span>
        <span class="debug-log-type">${log.type}</span>
        <span class="debug-log-message">${escapeHtml(String(log.message))}</span>
    `;

    if (log.data) {
        let dataStr = log.data;
        if (typeof log.data === 'object') {
            try {
                dataStr = JSON.stringify(log.data, null, 2);
            } catch (e) {
                dataStr = String(log.data);
            }
        }
        html += `<div class="debug-log-data">${escapeHtml(String(dataStr))}</div>`;
    }

    div.innerHTML = html;
    return div;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Toggle debug console visibility
function toggleDebugConsole() {
    const console = document.getElementById('debugConsole');
    if (console) {
        debugConsoleVisible = !debugConsoleVisible;
        if (debugConsoleVisible) {
            console.classList.remove('hidden');
        } else {
            console.classList.add('hidden');
        }
    }
}

// Clear debug logs
function clearDebugLogs() {
    debugLogs = [];
    logCount = 0;

    const badge = document.getElementById('debugBadge');
    if (badge) {
        badge.textContent = '0';
    }

    const logsContainer = document.getElementById('debugLogs');
    if (logsContainer) {
        logsContainer.innerHTML = `
            <div class="debug-log info">
                <span class="debug-log-time">${new Date().toLocaleTimeString()}</span>
                <span class="debug-log-type">info</span>
                <span class="debug-log-message">Logs cleared.</span>
            </div>
        `;
    }
}

// Download debug logs as JSON
function downloadDebugLogs() {
    const dataStr = JSON.stringify(debugLogs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    debugLog('success', 'Logs Downloaded', `Saved ${debugLogs.length} logs to JSON file`);
}

// Enhanced logging functions
window.debugLog = debugLog;

window.logOperation = function(operation, details) {
    debugLog('info', `🔄 ${operation}`, details);
};

window.logSuccess = function(operation, details) {
    debugLog('success', `✅ ${operation}`, details);
};

window.logError = function(operation, error) {
    debugLog('error', `❌ ${operation}`, error);
};

window.logWarning = function(operation, warning) {
    debugLog('warning', `⚠️ ${operation}`, warning);
};

window.logDatabase = function(table, action, data) {
    debugLog('info', `💾 Database: ${table}`, `${action} - ${JSON.stringify(data)}`);
};

window.logAuth = function(action, user) {
    debugLog('info', `🔐 Auth: ${action}`, user);
};

window.logPermission = function(permission, granted) {
    const type = granted ? 'success' : 'warning';
    debugLog(type, `🔑 Permission: ${permission}`, granted ? 'GRANTED' : 'DENIED');
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    initDebugConsole();
    debugLog('success', 'Debug Console Ready', 'Click header to minimize/maximize');

    // Auto-show console for 3 seconds on load
    setTimeout(() => {
        const console = document.getElementById('debugConsole');
        if (console) {
            console.classList.remove('hidden');
            debugConsoleVisible = true;

            // Auto-hide after 5 seconds
            setTimeout(() => {
                console.classList.add('hidden');
                debugConsoleVisible = false;
            }, 5000);
        }
    }, 500);
});

// Add keyboard shortcut: Ctrl/Cmd + D to toggle console
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        toggleDebugConsole();
    }
});
