// Admin Dashboard JavaScript

let currentWeek = DatabaseHelper.getWeekStartDate();
let selectedGroupFilter = null;
let charts = {};
let currentUser = null;
let userRegion = null;

// ==================== TOAST NOTIFICATION SYSTEM ====================

function showToast(message, type = 'success') {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;

    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== CONFIRMATION MODAL ====================

function showConfirmModal(title, message, onConfirm) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('confirmModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirmModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h2 id="confirmModalTitle">Confirm</h2>
                    <span class="close" onclick="closeModal('confirmModal')">&times;</span>
                </div>
                <div class="modal-body">
                    <p id="confirmModalMessage" style="color: rgba(255,255,255,0.8); line-height: 1.6;"></p>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('confirmModal')">Cancel</button>
                    <button class="btn-danger" id="confirmModalBtn">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalMessage').textContent = message;

    const confirmBtn = document.getElementById('confirmModalBtn');
    confirmBtn.onclick = () => {
        closeModal('confirmModal');
        onConfirm();
    };

    modal.style.display = 'flex';
}

// Initialize Dashboard
async function init() {
    try {
        // Verify user authentication and authorization
        currentUser = DatabaseHelper.getCurrentUser();

        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        // Only allow ed, coordinator, or mentor roles
        if (!['ed', 'coordinator', 'mentor'].includes(currentUser.role)) {
            alert('Access denied. Admin portal is for administrators and mentors only.');
            window.location.href = 'index.html';
            return;
        }

        // Get user's region
        userRegion = await DatabaseHelper.getUserRegion();

        // Load initial data
        await loadGroupFilters();
        await showSection('overview');

        // Hide loading state
        document.getElementById('loadingState').style.display = 'none';
    } catch (error) {
        alert('Error loading dashboard. Please refresh the page.');
    }
}

// Section Navigation
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const section = document.getElementById(`${sectionName}Section`);
    if (section) {
        section.style.display = 'block';
    }

    // Load section data
    switch (sectionName) {
        case 'overview':
            loadOverview();
            break;
        case 'groups':
            loadGroups();
            break;
        case 'students':
            loadStudents();
            break;
        case 'cetele':
            loadCeteleManagement();
            break;
        case 'weekly':
            loadWeeklyView();
            break;
        case 'analytics':
            loadAnalytics();
            break;
    }
}

// Load Group Filters
async function loadGroupFilters() {
    try {
        // Filter groups by user's region and division
        let groups;

        if (currentUser.role === 'ed') {
            // ED sees all groups in their region
            groups = await DatabaseHelper.getGroups(userRegion.id);
        } else if (currentUser.role === 'coordinator' && currentUser.is_mentor) {
            // Coordinator with mentor group sees their division
            groups = await DatabaseHelper.getGroups(userRegion.id, currentUser.division);
        } else if (currentUser.role === 'coordinator') {
            // Coordinator-only sees their division
            groups = await DatabaseHelper.getGroups(userRegion.id, currentUser.division);
        } else if (currentUser.role === 'mentor') {
            // Mentor sees only their own group
            groups = await DatabaseHelper.getGroups(userRegion.id);
            groups = groups.filter(g => g.mentor_id === currentUser.id);
        }

        const filterSelects = [
            'overviewGroupFilter',
            'studentGroupFilter',
            'analyticsGroupFilter',
            'studentGroup'
        ];

        filterSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                // Keep the first option (All Groups or No Group)
                const firstOption = select.options[0].cloneNode(true);
                select.innerHTML = '';
                select.appendChild(firstOption);

                groups.forEach(group => {
                    const option = document.createElement('option');
                    option.value = group.id;
                    option.textContent = `${group.name} - ${group.grade}`;
                    select.appendChild(option);
                });
            }
        });
    } catch (error) {
    }
}

// ==================== OVERVIEW SECTION ====================

async function loadOverview() {
    try {
        const groupFilter = document.getElementById('overviewGroupFilter').value || null;
        const leaderboard = await DatabaseHelper.getLeaderboard(groupFilter);
        const students = await DatabaseHelper.getStudents(groupFilter);
        const activities = await DatabaseHelper.getActivities();

        // Update stats
        document.getElementById('totalStudents').textContent = students.length;

        // Get this week's submissions
        const thisWeekSubmissions = await DatabaseHelper.getAllSubmissionsForWeek(currentWeek, groupFilter);
        document.getElementById('activeStudents').textContent = thisWeekSubmissions.length;

        // Calculate average completion
        if (leaderboard.length > 0) {
            const avgCompletion = leaderboard.reduce((sum, item) => sum + item.percentage, 0) / leaderboard.length;
            document.getElementById('avgCompletion').textContent = Math.round(avgCompletion) + '%';
        } else {
            document.getElementById('avgCompletion').textContent = '0%';
        }

        // Top performer
        if (leaderboard.length > 0) {
            document.getElementById('topPerformer').textContent = leaderboard[0].student.name.split(' ')[0];
        } else {
            document.getElementById('topPerformer').textContent = '-';
        }

        // Render leaderboard
        renderLeaderboard(leaderboard);

        // Render charts
        await renderTrendsChart(groupFilter);
        await renderActivityChart(groupFilter);

    } catch (error) {
    }
}

function renderLeaderboard(leaderboard) {
    const container = document.getElementById('leaderboardContent');
    container.innerHTML = '';

    if (leaderboard.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-dim);">No data available</p>';
        return;
    }

    leaderboard.forEach((item, index) => {
        const rank = index + 1;
        const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
        const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

        const element = document.createElement('div');
        element.className = 'leaderboard-item';
        element.innerHTML = `
            <div class="rank-badge ${rankClass}">${rankIcon}</div>
            <div class="leaderboard-name">${item.student.name}</div>
            <div class="leaderboard-score">${Math.round(item.percentage)}%</div>
        `;
        container.appendChild(element);
    });
}

async function renderTrendsChart(groupFilter) {
    const weeks = DatabaseHelper.getLastNWeeks(8).reverse();
    const activities = await DatabaseHelper.getActivities();

    const weeklyAverages = await Promise.all(weeks.map(async week => {
        const submissions = await DatabaseHelper.getAllSubmissionsForWeek(week, groupFilter);
        if (submissions.length === 0) return 0;

        const totalScore = submissions.reduce((sum, sub) => {
            const score = Object.values(sub.activity_completions).filter(v => v === true).length;
            return sum + score;
        }, 0);

        return Math.round((totalScore / (submissions.length * activities.length)) * 100);
    }));

    const ctx = document.getElementById('trendsChart');
    if (!ctx) return;

    if (charts.trends) {
        charts.trends.destroy();
    }

    charts.trends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeks.map(w => DatabaseHelper.formatDate(w)),
            datasets: [{
                label: 'Average Completion %',
                data: weeklyAverages,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#e2e8f0' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#94a3b8',
                        callback: value => value + '%'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

async function renderActivityChart(groupFilter) {
    const activities = await DatabaseHelper.getActivities();
    const allSubmissions = await DatabaseHelper.getAllSubmissions();

    const filteredSubmissions = groupFilter
        ? allSubmissions.filter(sub => sub.students.group_id === groupFilter)
        : allSubmissions;

    const activityStats = activities.map(activity => {
        let completed = 0;
        let total = 0;

        filteredSubmissions.forEach(sub => {
            if (sub.activity_completions[activity.name] !== undefined) {
                if (sub.activity_completions[activity.name] === true) {
                    completed++;
                }
                total++;
            }
        });

        return total > 0 ? Math.round((completed / total) * 100) : 0;
    });

    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    if (charts.activity) {
        charts.activity.destroy();
    }

    charts.activity = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: activities.map(a => a.name),
            datasets: [{
                label: 'Completion Rate %',
                data: activityStats,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 159, 64, 0.8)',
                    'rgba(102, 126, 234, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#94a3b8',
                        callback: value => value + '%'
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// ==================== GROUPS SECTION ====================

async function loadGroups() {
    try {
        const groups = await DatabaseHelper.getGroups();
        const container = document.getElementById('groupsGrid');
        container.innerHTML = '';

        if (groups.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-dim); grid-column: 1/-1;">No groups found. Add your first group!</p>';
            return;
        }

        for (const group of groups) {
            const students = await DatabaseHelper.getStudents(group.id);
            const stats = await DatabaseHelper.getGroupStats(group.id, currentWeek);

            const avgCompletion = stats.length > 0
                ? Math.round(stats.reduce((sum, s) => sum + s.percentage, 0) / stats.length)
                : 0;

            const card = document.createElement('div');
            card.className = 'group-card';
            card.innerHTML = `
                <div class="group-header">
                    <div>
                        <div class="group-name">${group.name}</div>
                        <div style="color: var(--text-dim); font-size: 0.9rem;">${group.grade}</div>
                    </div>
                    <div class="group-badge">${students.length} students</div>
                </div>
                <div class="group-stats">
                    <div class="group-stat">
                        <div class="group-stat-value">${avgCompletion}%</div>
                        <div class="group-stat-label">Avg Completion</div>
                    </div>
                    <div class="group-stat">
                        <div class="group-stat-value">${stats.filter(s => s.percentage > 0).length}</div>
                        <div class="group-stat-label">Active</div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        }
    } catch (error) {
    }
}

function showAddGroupModal() {
    document.getElementById('addGroupModal').style.display = 'flex';
}

async function addGroup() {
    try {
        const name = document.getElementById('groupName').value.trim();
        const grade = document.getElementById('groupGrade').value.trim();

        if (!name || !grade) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        await DatabaseHelper.createGroup(name, grade);
        showToast('Group added successfully!', 'success');

        closeModal('addGroupModal');
        document.getElementById('groupName').value = '';
        document.getElementById('groupGrade').value = '';

        await loadGroupFilters();
        await loadGroups();
    } catch (error) {
        showToast('Error adding group. Please try again.', 'error');
    }
}

// ==================== STUDENTS SECTION ====================

async function loadStudents() {
    try {
        const groupFilter = document.getElementById('studentGroupFilter').value || null;
        const students = await DatabaseHelper.getStudents(groupFilter);
        const container = document.getElementById('studentsTable');

        if (students.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-dim); padding: 2rem;">No students found. Add your first student!</p>';
            return;
        }

        let tableHTML = `
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Grade</th>
                            <th>Group</th>
                            <th>Total Score</th>
                            <th>Avg Completion</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const student of students) {
            const stats = await DatabaseHelper.getStudentStats(student.id);
            tableHTML += `
                <tr>
                    <td>${student.name}</td>
                    <td>${student.grade}</td>
                    <td>${student.groups?.name || 'No Group'}</td>
                    <td>${stats.totalCompletions}</td>
                    <td>${Math.round(stats.averageCompletion)}%</td>
                </tr>
            `;
        }

        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHTML;
    } catch (error) {
    }
}

function showAddStudentModal() {
    document.getElementById('addStudentModal').style.display = 'flex';
}

async function addStudent() {
    try {
        const name = document.getElementById('studentName').value.trim();
        const grade = document.getElementById('studentGrade').value.trim();
        const groupId = document.getElementById('studentGroup').value || null;

        if (!name || !grade) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        await DatabaseHelper.createStudent(name, grade, groupId);
        showToast('Student added successfully!', 'success');

        closeModal('addStudentModal');
        document.getElementById('studentName').value = '';
        document.getElementById('studentGrade').value = '';
        document.getElementById('studentGroup').value = '';

        await loadStudents();
    } catch (error) {
        showToast('Error adding student. Please try again.', 'error');
    }
}

// ==================== WEEKLY VIEW ====================

async function loadWeeklyView() {
    try {
        document.getElementById('currentWeekDisplay').textContent = DatabaseHelper.formatDate(currentWeek);

        const submissions = await DatabaseHelper.getAllSubmissionsForWeek(currentWeek);
        const activities = await DatabaseHelper.getActivities();
        const container = document.getElementById('weeklyDataGrid');

        if (submissions.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-dim); grid-column: 1/-1;">No submissions for this week</p>';
            return;
        }

        container.innerHTML = '';

        submissions.forEach(sub => {
            const score = Object.values(sub.activity_completions).filter(v => v === true).length;
            const percentage = Math.round((score / activities.length) * 100);

            const card = document.createElement('div');
            card.className = 'student-card';

            let activitiesHTML = '';
            activities.forEach(activity => {
                const completed = sub.activity_completions[activity.name];
                const iconClass = completed === true ? 'completed' : 'incomplete';
                const icon = completed === true ? '✓' : '✗';

                activitiesHTML += `
                    <div class="activity-badge">
                        <div class="activity-icon ${iconClass}">${icon}</div>
                        <span>${activity.name}</span>
                    </div>
                `;
            });

            card.innerHTML = `
                <div class="student-header">
                    <div>
                        <div class="student-name">${sub.students.name}</div>
                        <div class="student-group">${sub.students.groups?.name || 'No Group'}</div>
                    </div>
                </div>
                <div class="activities-grid">
                    ${activitiesHTML}
                </div>
                <div class="score-bar">
                    <div class="score-label">
                        <span>Week Score</span>
                        <span>${score}/${activities.length}</span>
                    </div>
                    <div class="score-progress">
                        <div class="score-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });
    } catch (error) {
    }
}

function changeWeek(direction) {
    // Check if navigation is allowed (for demo mode)
    if (DatabaseHelper.canNavigate && !DatabaseHelper.canNavigate(currentWeek, direction)) {
        // Shake the button that was clicked
        const btn = direction > 0
            ? document.querySelector('.week-nav-btn:last-child')
            : document.querySelector('.week-nav-btn:first-child');
        if (btn) {
            btn.classList.add('shake');
            setTimeout(() => btn.classList.remove('shake'), 500);
        }

        // Show toast message
        if (direction > 0) {
            showToast('Cannot navigate to future weeks', 'error');
        } else {
            showToast('No more data available for previous weeks', 'error');
        }
        return;
    }

    const date = new Date(currentWeek);
    date.setDate(date.getDate() + (direction * 7));
    currentWeek = DatabaseHelper.getWeekStartDate(date);
    loadWeeklyView();
}

// ==================== ANALYTICS ====================

async function loadAnalytics() {
    try {
        const groupFilter = document.getElementById('analyticsGroupFilter').value || null;
        await renderProgressChart(groupFilter);
        await renderActivityBreakdownChart(groupFilter);
        await renderPerformanceCards(groupFilter);
    } catch (error) {
    }
}

async function renderProgressChart(groupFilter) {
    const students = await DatabaseHelper.getStudents(groupFilter);
    const weeks = DatabaseHelper.getLastNWeeks(8).reverse();

    const datasets = await Promise.all(students.slice(0, 5).map(async (student, index) => {
        const weeklyData = await Promise.all(weeks.map(async week => {
            const submission = await DatabaseHelper.getWeeklySubmission(student.id, week);
            if (!submission) return 0;
            const activities = await DatabaseHelper.getActivities();
            const score = Object.values(submission.activity_completions).filter(v => v === true).length;
            return Math.round((score / activities.length) * 100);
        }));

        const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

        return {
            label: student.name,
            data: weeklyData,
            borderColor: colors[index],
            backgroundColor: colors[index] + '20',
            borderWidth: 2,
            tension: 0.4
        };
    }));

    const ctx = document.getElementById('progressChart');
    if (!ctx) return;

    if (charts.progress) {
        charts.progress.destroy();
    }

    charts.progress = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeks.map(w => DatabaseHelper.formatDate(w)),
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#e2e8f0' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#94a3b8',
                        callback: value => value + '%'
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

async function renderActivityBreakdownChart(groupFilter) {
    const activities = await DatabaseHelper.getActivities();
    const allSubmissions = await DatabaseHelper.getAllSubmissions();

    const filteredSubmissions = groupFilter
        ? allSubmissions.filter(sub => sub.students.group_id === groupFilter)
        : allSubmissions;

    const activityData = activities.map(activity => {
        let completed = 0;
        filteredSubmissions.forEach(sub => {
            if (sub.activity_completions[activity.name] === true) {
                completed++;
            }
        });
        return completed;
    });

    const ctx = document.getElementById('activityBreakdownChart');
    if (!ctx) return;

    if (charts.breakdown) {
        charts.breakdown.destroy();
    }

    charts.breakdown = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: activities.map(a => a.name),
            datasets: [{
                data: activityData,
                backgroundColor: [
                    '#6366f1',
                    '#8b5cf6',
                    '#10b981',
                    '#f59e0b',
                    '#ef4444',
                    '#06b6d4',
                    '#ec4899'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#e2e8f0' }
                }
            }
        }
    });
}

async function renderPerformanceCards(groupFilter) {
    const leaderboard = await DatabaseHelper.getLeaderboard(groupFilter);
    const activities = await DatabaseHelper.getActivities();
    const container = document.getElementById('performanceCards');

    container.innerHTML = '';

    for (const item of leaderboard.slice(0, 10)) {
        const submissions = await DatabaseHelper.getAllSubmissionsForStudent(item.student.id);

        let activitiesHTML = '';
        activities.forEach(activity => {
            let completedCount = 0;
            submissions.forEach(sub => {
                if (sub.activity_completions[activity.name] === true) {
                    completedCount++;
                }
            });

            activitiesHTML += `
                <div class="activity-badge">
                    <div class="activity-icon ${completedCount > 0 ? 'completed' : 'incomplete'}">
                        ${completedCount}
                    </div>
                    <span>${activity.name}</span>
                </div>
            `;
        });

        const card = document.createElement('div');
        card.className = 'student-card';
        card.innerHTML = `
            <div class="student-header">
                <div>
                    <div class="student-name">${item.student.name}</div>
                    <div class="student-group">${item.student.groups?.name || 'No Group'}</div>
                </div>
            </div>
            <div class="activities-grid">
                ${activitiesHTML}
            </div>
            <div class="score-bar">
                <div class="score-label">
                    <span>Overall Score</span>
                    <span>${Math.round(item.percentage)}%</span>
                </div>
                <div class="score-progress">
                    <div class="score-fill" style="width: ${item.percentage}%"></div>
                </div>
            </div>
        `;

        container.appendChild(card);
    }
}

// ==================== MODAL FUNCTIONS ====================

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal when clicking outside
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        });
    }
});

// ==================== LOGOUT ====================

function logout() {
    showConfirmModal('Logout', 'Are you sure you want to logout?', () => {
        localStorage.removeItem('cetele_user');
        window.location.href = 'index.html';
    });
}

// ==================== CETELE MANAGEMENT ====================

async function loadCeteleManagement() {
    try {
        // Load all activities (both default and custom)
        const activities = await DatabaseHelper.getActivities();

        // Populate activities table
        const tbody = document.getElementById('activitiesTableBody');
        tbody.innerHTML = '';

        activities.forEach(activity => {
            const row = document.createElement('tr');

            const scope = activity.group_id ? 'Custom (Your Group)' : 'Default (All Groups)';
            const scopeClass = activity.group_id ? 'badge-custom' : 'badge-default';

            row.innerHTML = `
                <td>${activity.order_index}</td>
                <td><strong>${activity.name}</strong></td>
                <td>${activity.description || '-'}</td>
                <td><span class="badge">${activity.input_type || 'checkbox'}</span></td>
                <td>${activity.target || '-'}</td>
                <td>${activity.unit || '-'}</td>
                <td><span class="badge ${scopeClass}">${scope}</span></td>
                <td>
                    <button class="btn-small btn-edit" onclick="openEditActivityModal(${activity.id})" ${!activity.group_id ? 'disabled title="Cannot edit default activities"' : ''}>
                        ✏️ Edit
                    </button>
                    <button class="btn-small btn-delete" onclick="deleteActivity(${activity.id})" ${!activity.group_id ? 'disabled title="Cannot delete default activities"' : ''}>
                        🗑️ Delete
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });

        // Generate preview
        generateCetelePreview(activities);

    } catch (error) {
        alert('Error loading activities. Please try again.');
    }
}

function generateCetelePreview(activities) {
    const previewContainer = document.getElementById('cetelePreview');

    let tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Student</th>
                    ${activities.map(a => `<th>${a.name}<br><small style="font-weight: normal;">${a.description}</small></th>`).join('')}
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Example Student</strong></td>
                    ${activities.map(() => '<td style="text-align: center;">-</td>').join('')}
                </tr>
            </tbody>
        </table>
    `;

    previewContainer.innerHTML = tableHTML;
}

function openAddActivityModal() {
    document.getElementById('addActivityModal').style.display = 'flex';
}

function toggleActivityTargetFields() {
    const inputType = document.getElementById('newActivityInputType').value;
    const container = document.getElementById('targetFieldsContainer');

    if (inputType === 'number') {
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

async function saveNewActivity() {
    try {
        const name = document.getElementById('newActivityName').value.trim();
        const description = document.getElementById('newActivityDescription').value.trim();
        const inputType = document.getElementById('newActivityInputType').value;
        const target = inputType === 'number' ? parseInt(document.getElementById('newActivityTarget').value) : null;
        const unit = inputType === 'number' ? document.getElementById('newActivityUnit').value.trim() : null;
        const orderIndex = parseInt(document.getElementById('newActivityOrder').value);

        if (!name) {
            showToast('Please enter an activity name', 'error');
            return;
        }

        if (inputType === 'number' && (!target || !unit)) {
            showToast('Please enter target amount and unit for number-based activities', 'error');
            return;
        }

        // Create activity with group_id to mark it as custom
        await DatabaseHelper.createActivity(name, description, inputType, orderIndex, target, unit, currentUser.group_id);

        // Reload the table
        await loadCeteleManagement();

        // Close modal and reset form
        closeModal('addActivityModal');
        document.getElementById('newActivityName').value = '';
        document.getElementById('newActivityDescription').value = '';
        document.getElementById('newActivityTarget').value = '';
        document.getElementById('newActivityUnit').value = '';
        document.getElementById('newActivityOrder').value = '8';

        showToast('Activity added successfully!', 'success');

    } catch (error) {
        showToast('Error saving activity. Please try again.', 'error');
    }
}

async function openEditActivityModal(activityId) {
    try {
        const activities = await DatabaseHelper.getActivities();
        const activity = activities.find(a => a.id === activityId);

        if (!activity) {
            showToast('Activity not found', 'error');
            return;
        }

        // Check if this is a custom activity
        if (!activity.group_id) {
            showToast('Cannot edit default activities. You can only edit custom activities you created.', 'error');
            return;
        }

        // Populate form
        document.getElementById('editActivityId').value = activity.id;
        document.getElementById('editActivityName').value = activity.name;
        document.getElementById('editActivityDescription').value = activity.description || '';
        document.getElementById('editActivityInputType').value = activity.input_type || 'checkbox';
        document.getElementById('editActivityTarget').value = activity.target || '';
        document.getElementById('editActivityUnit').value = activity.unit || '';
        document.getElementById('editActivityOrder').value = activity.order_index;

        // Show/hide target fields
        toggleEditTargetFields();

        // Open modal
        document.getElementById('editActivityModal').style.display = 'flex';

    } catch (error) {
        showToast('Error loading activity details.', 'error');
    }
}

function toggleEditTargetFields() {
    const inputType = document.getElementById('editActivityInputType').value;
    const container = document.getElementById('editTargetFieldsContainer');

    if (inputType === 'number') {
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

async function saveEditedActivity() {
    try {
        const id = parseInt(document.getElementById('editActivityId').value);
        const name = document.getElementById('editActivityName').value.trim();
        const description = document.getElementById('editActivityDescription').value.trim();
        const inputType = document.getElementById('editActivityInputType').value;
        const target = inputType === 'number' ? parseInt(document.getElementById('editActivityTarget').value) : null;
        const unit = inputType === 'number' ? document.getElementById('editActivityUnit').value.trim() : null;
        const orderIndex = parseInt(document.getElementById('editActivityOrder').value);

        if (!name) {
            showToast('Please enter an activity name', 'error');
            return;
        }

        if (inputType === 'number' && (!target || !unit)) {
            showToast('Please enter target amount and unit for number-based activities', 'error');
            return;
        }

        // Update activity
        await DatabaseHelper.updateActivity(id, name, description, inputType, orderIndex, target, unit);

        // Reload the table
        await loadCeteleManagement();

        // Close modal
        closeModal('editActivityModal');

        showToast('Activity updated successfully!', 'success');

    } catch (error) {
        showToast('Error updating activity. Please try again.', 'error');
    }
}

async function deleteActivity(activityId) {
    showConfirmModal(
        'Delete Activity',
        'Are you sure you want to delete this custom activity? This action cannot be undone.',
        async () => {
            try {
                await DatabaseHelper.deleteActivity(activityId);
                await loadCeteleManagement();
                showToast('Activity deleted successfully!', 'success');
            } catch (error) {
                showToast('Error deleting activity. Please try again.', 'error');
            }
        }
    );
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', init);
