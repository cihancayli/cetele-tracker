// Admin Dashboard JavaScript

let currentWeek = null; // Will be initialized when page loads
let selectedGroupFilter = null;
let charts = {};
let currentUser = null;
let userRegion = null;

// Initialize currentWeek properly
function initCurrentWeek() {
    if (!currentWeek && typeof DatabaseHelper !== 'undefined') {
        currentWeek = DatabaseHelper.getWeekStartDate();
        console.log('🗓️ initCurrentWeek: Initialized to', currentWeek);
    }
    return currentWeek;
}

// ==================== TOAST NOTIFICATION SYSTEM ====================

function showToast(message, type = 'success', position = 'top-right') {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;

    // Position below week navigation if specified
    if (position === 'below-week-nav') {
        const weekNav = document.querySelector('.week-navigation');
        if (weekNav) {
            const rect = weekNav.getBoundingClientRect();
            toast.style.position = 'fixed';
            toast.style.top = (rect.bottom + 10) + 'px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%) scale(0.9)';
            toast.style.right = 'auto';
            toast.classList.add('toast-centered');
        }
    }

    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
        if (position === 'below-week-nav') {
            toast.style.transform = 'translateX(-50%) scale(1)';
            toast.style.opacity = '1';
        }
        toast.classList.add('show');
    }, 10);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        if (position === 'below-week-nav') {
            toast.style.transform = 'translateX(-50%) scale(0.9)';
            toast.style.opacity = '0';
        }
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
        // Initialize currentWeek first
        initCurrentWeek();

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
    }
}

// Load Group Filters
async function loadGroupFilters() {
    try {
        // Filter groups by user's region and division
        let groups = await DatabaseHelper.getGroups();

        // In demo mode, check for role-based filtering
        if (window.DEMO_MODE || window.__DEMO_MODE__) {
            if (window.DEMO_ROLE === 'mentor' && window.DEMO_GROUP_IDS) {
                // Mentor sees only their assigned groups
                groups = groups.filter(g => window.DEMO_GROUP_IDS.includes(String(g.id)));
            }
            // Coordinator sees all groups (no filter)
        } else {
            // Production mode filtering
            if (currentUser.role === 'ed') {
                // ED sees all groups in their region
                groups = await DatabaseHelper.getGroups(userRegion?.id);
            } else if (currentUser.role === 'coordinator' && currentUser.is_mentor) {
                // Coordinator with mentor group sees their division
                groups = await DatabaseHelper.getGroups(userRegion?.id, currentUser.division);
            } else if (currentUser.role === 'coordinator') {
                // Coordinator-only sees their division
                groups = await DatabaseHelper.getGroups(userRegion?.id, currentUser.division);
            } else if (currentUser.role === 'mentor') {
                // Mentor sees only their own group
                groups = await DatabaseHelper.getGroups(userRegion?.id);
                groups = groups.filter(g => g.mentor_id === currentUser.id);
            }
        }

        const filterSelects = [
            'overviewGroupFilter',
            'studentGroupFilter',
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

                // For mentors in demo mode, auto-select their group
                if ((window.DEMO_MODE || window.__DEMO_MODE__) && window.DEMO_ROLE === 'mentor' && groups.length === 1) {
                    select.value = groups[0].id;
                }
            }
        });
    } catch (error) {
        console.error('Error loading group filters:', error);
    }
}

// ==================== HELPER: GET EFFECTIVE GROUP FILTER ====================

// For mentors, always filter by their assigned group(s)
// For coordinators, use the selected filter (or all if none selected)
function getEffectiveGroupFilter(selectedFilter) {
    // In demo mode, check role
    if (window.DEMO_MODE || window.__DEMO_MODE__) {
        if (window.DEMO_ROLE === 'mentor' && window.DEMO_GROUP_IDS && window.DEMO_GROUP_IDS.length > 0) {
            // Mentor always sees only their group - ignore selected filter
            return window.DEMO_GROUP_IDS[0];
        }
    }
    // Coordinator or no demo mode - use selected filter
    return selectedFilter || null;
}

// ==================== OVERVIEW SECTION ====================

async function loadOverview() {
    try {
        const selectedFilter = document.getElementById('overviewGroupFilter')?.value || null;
        const groupFilter = getEffectiveGroupFilter(selectedFilter);
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

        // Render Activity Trends chart (for everyone)
        await renderActivityTrendsChart(groupFilter);
        await renderActivityChart(groupFilter);

        // Render Group Trends chart (coordinator-only)
        const groupTrendsSection = document.getElementById('groupTrendsSection');
        const isMentor = (window.DEMO_MODE || window.__DEMO_MODE__) && window.DEMO_ROLE === 'mentor';

        if (groupTrendsSection) {
            if (isMentor) {
                groupTrendsSection.style.display = 'none';
            } else {
                groupTrendsSection.style.display = 'block';
                await renderTrendsChart(groupFilter);
            }
        }

        // Render student ranks with Clash Royale badges
        await renderStudentRanks(groupFilter);

        // Render analytics charts (consolidated from Analytics section)
        await renderProgressChart(groupFilter);
        await renderActivityBreakdownChart(groupFilter);
        await renderPerformanceCards(groupFilter);

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

        // Color code percentage: green >= 80%, yellow >= 50%, red < 50%
        const pct = Math.round(item.percentage);
        let scoreColor = '#ef4444'; // red
        if (pct >= 80) {
            scoreColor = '#10b981'; // green
        } else if (pct >= 50) {
            scoreColor = '#fbbf24'; // yellow
        }

        const element = document.createElement('div');
        element.className = 'leaderboard-item';
        element.innerHTML = `
            <div class="rank-badge ${rankClass}">${rankIcon}</div>
            <div class="leaderboard-name">${item.student.name}</div>
            <div class="leaderboard-score" style="color: ${scoreColor}; font-weight: 600;">${pct}%</div>
        `;
        container.appendChild(element);
    });
}

// ==================== STUDENT RANKS WITH CLASH ROYALE BADGES ====================

// Rank definitions (same as in visualizations.js for student portal)
const ADMIN_RANKS = [
    { name: 'Iskelet Talebe', image: 'IskeletMuridleri.png', requirement: 0 },
    { name: 'Iskelet Muridi', image: 'IskeletBeyi.png', requirement: 10 },
    { name: 'Goblin Saliki', image: 'GoblinSaliki.webp', requirement: 25 },
    { name: 'Minion Dervisleri', image: 'MinionDervisleri.png', requirement: 40 },
    { name: 'Talebe-i Ceryan', image: 'Talebe-iCeryan.png', requirement: 55 },
    { name: 'Electro Talebe', image: 'Electro.png', requirement: 70 },
    { name: 'Sovalye Agasi', image: 'SovalyeAgasi.png', requirement: 90 },
    { name: 'Hisar Padisahi', image: 'HisarPadisahi.png', requirement: 110 },
    { name: 'Talebe-i Nur', image: 'Talebe-iNur.png', requirement: 130 },
    { name: 'Ustat Hog', image: 'UstatHog.png', requirement: 145 },
    { name: 'Pirlanta Talebe', image: 'PirlantaTalebe.png', requirement: 160 }
];

function getAdminRank(trophies) {
    let currentRank = ADMIN_RANKS[0];
    for (let i = ADMIN_RANKS.length - 1; i >= 0; i--) {
        if (trophies >= ADMIN_RANKS[i].requirement) {
            currentRank = ADMIN_RANKS[i];
            break;
        }
    }
    return currentRank;
}

// Trophy calculation: 100% = 10, 90% = 8, 80% = 6, 70% = 4, <70% = 2, no submission = -5
function calculateTrophiesForSubmission(submission, activities) {
    if (!submission || !submission.activity_completions) return -5;

    let completed = 0;
    activities.forEach(activity => {
        const value = submission.activity_completions[activity.id];
        if (value === true || (typeof value === 'number' && value >= activity.target)) {
            completed++;
        }
    });

    const percentage = (completed / activities.length) * 100;

    if (percentage >= 100) return 10;
    if (percentage >= 90) return 8;
    if (percentage >= 80) return 6;
    if (percentage >= 70) return 4;
    return 2;
}

async function renderStudentRanks(groupFilter) {
    const container = document.getElementById('studentRanksGrid');
    if (!container) return;

    try {
        const students = await DatabaseHelper.getStudents(groupFilter);
        const activities = await DatabaseHelper.getActivities();

        // Calculate trophies for each student
        const studentRanks = await Promise.all(students.map(async student => {
            const allSubmissions = await DatabaseHelper.getAllSubmissionsForStudent(student.id);

            let totalTrophies = 0;
            allSubmissions.forEach(sub => {
                totalTrophies += calculateTrophiesForSubmission(sub, activities);
            });

            const rank = getAdminRank(totalTrophies);
            return {
                student,
                trophies: totalTrophies,
                rank
            };
        }));

        // Sort by trophies descending
        studentRanks.sort((a, b) => b.trophies - a.trophies);

        if (studentRanks.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-dim);">No students found</p>';
            return;
        }

        // Group students by rank
        const rankGroups = {};
        studentRanks.forEach(item => {
            const rankName = item.rank.name;
            if (!rankGroups[rankName]) {
                rankGroups[rankName] = {
                    rank: item.rank,
                    students: []
                };
            }
            rankGroups[rankName].students.push(item);
        });

        // Sort rank groups by requirement (highest first)
        const sortedRankGroups = Object.values(rankGroups).sort((a, b) =>
            b.rank.requirement - a.rank.requirement
        );

        // Render grouped by rank
        container.innerHTML = sortedRankGroups.map(group => {
            const { rank, students: rankStudents } = group;
            const studentCount = rankStudents.length;

            // Determine grid columns based on student count
            let gridClass = 'rank-students-grid';
            if (studentCount === 1) gridClass += ' single';
            else if (studentCount === 2) gridClass += ' double';
            else if (studentCount <= 4) gridClass += ' few';

            return `
                <div class="rank-group-card">
                    <div class="rank-group-header">
                        <div class="rank-group-badge">
                            <img src="assets/${rank.image}" alt="${rank.name}" class="rank-group-img" onerror="this.style.display='none'">
                        </div>
                        <div class="rank-group-info">
                            <div class="rank-group-name">${rank.name}</div>
                            <div class="rank-group-req">
                                <img src="assets/trophycrown.png" alt="trophy" class="trophy-icon-tiny">
                                ${rank.requirement}+ trophies
                            </div>
                        </div>
                        <div class="rank-group-count">${studentCount} student${studentCount !== 1 ? 's' : ''}</div>
                    </div>
                    <div class="${gridClass}">
                        ${rankStudents.map(item => {
                            const { student, trophies } = item;
                            return `
                                <div class="rank-student-chip">
                                    <span class="rank-student-name">${student.name}</span>
                                    <span class="rank-student-trophies">
                                        <img src="assets/trophycrown.png" alt="" class="trophy-icon-micro">
                                        ${trophies}
                                    </span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error rendering student ranks:', error);
        container.innerHTML = '<p style="text-align: center; color: var(--text-dim);">Error loading ranks</p>';
    }
}

// ==================== ACTIVITY TRENDS CHART (For Both Mentors & Coordinators) ====================

async function renderActivityTrendsChart(groupFilter) {
    const ctx = document.getElementById('activityTrendsChart');
    if (!ctx) return;

    const weeks = DatabaseHelper.getLastNWeeks(8).reverse();
    const activities = await DatabaseHelper.getActivities();

    // Colors for each activity
    const activityColors = [
        { border: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },   // Green
        { border: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },   // Indigo
        { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },   // Amber
        { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },    // Red
        { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },   // Purple
        { border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },    // Cyan
        { border: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },   // Pink
    ];

    // Build datasets - one line per activity
    const datasets = await Promise.all(activities.map(async (activity, index) => {
        const color = activityColors[index % activityColors.length];

        const weeklyData = await Promise.all(weeks.map(async week => {
            const submissions = await DatabaseHelper.getAllSubmissionsForWeek(week, groupFilter);
            if (submissions.length === 0) return null;

            let completedCount = 0;
            submissions.forEach(sub => {
                const value = sub.activity_completions[activity.id];
                if (value === true || (typeof value === 'number' && value >= activity.target)) {
                    completedCount++;
                }
            });

            return Math.round((completedCount / submissions.length) * 100);
        }));

        return {
            label: activity.name,
            data: weeklyData,
            borderColor: color.border,
            backgroundColor: color.bg,
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            pointBackgroundColor: color.border,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            spanGaps: true
        };
    }));

    // Format week labels
    const weekLabels = weeks.map(week => {
        const date = new Date(week);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    if (charts.activityTrends) {
        charts.activityTrends.destroy();
    }

    charts.activityTrends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weekLabels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 11, 14, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: context => `${context.dataset.label}: ${context.parsed.y}% completion`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#64748b', font: { size: 11 } }
                },
                y: {
                    beginAtZero: true,
                    max: 110,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#64748b',
                        font: { size: 11 },
                        stepSize: 20,
                        callback: value => value <= 100 ? value + '%' : ''
                    }
                }
            }
        }
    });
}

async function renderTrendsChart(groupFilter) {
    const weeks = DatabaseHelper.getLastNWeeks(8).reverse();
    const activities = await DatabaseHelper.getActivities();
    const groups = await DatabaseHelper.getGroups();

    // Colors for each group
    const groupColors = [
        { border: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },   // Indigo
        { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },   // Purple
        { border: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },   // Green
        { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },   // Amber
        { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },    // Red
        { border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },    // Cyan
    ];

    // Helper function to calculate completion score
    const calculateScore = (submission) => {
        let score = 0;
        activities.forEach(activity => {
            const value = submission.activity_completions[activity.id];
            if (value === true || (typeof value === 'number' && value >= activity.target)) {
                score++;
            }
        });
        return score;
    };

    // Build datasets - one line per group
    const datasets = await Promise.all(groups.map(async (group, index) => {
        const color = groupColors[index % groupColors.length];

        const weeklyData = await Promise.all(weeks.map(async week => {
            const submissions = await DatabaseHelper.getAllSubmissionsForWeek(week, group.id);
            if (submissions.length === 0) return null; // null for no data

            const totalScore = submissions.reduce((sum, sub) => sum + calculateScore(sub), 0);
            return Math.round((totalScore / (submissions.length * activities.length)) * 100);
        }));

        return {
            label: group.name,
            data: weeklyData,
            borderColor: color.border,
            backgroundColor: color.bg,
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            pointBackgroundColor: color.border,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            spanGaps: true // Connect lines even with null values
        };
    }));

    // Also add an "Overall" line
    const overallData = await Promise.all(weeks.map(async week => {
        const submissions = await DatabaseHelper.getAllSubmissionsForWeek(week);
        if (submissions.length === 0) return null;

        const totalScore = submissions.reduce((sum, sub) => sum + calculateScore(sub), 0);
        return Math.round((totalScore / (submissions.length * activities.length)) * 100);
    }));

    datasets.unshift({
        label: 'Overall Average',
        data: overallData,
        borderColor: '#ffffff',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 3,
        borderDash: [5, 5],
        tension: 0.4,
        fill: false,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#1e1b4b',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        spanGaps: true
    });

    const ctx = document.getElementById('trendsChart');
    if (!ctx) return;

    if (charts.trends) {
        charts.trends.destroy();
    }

    charts.trends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeks.map(w => {
                const date = DatabaseHelper.formatDate(w);
                return date.split(',')[0]; // Shorter date format
            }),
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#e2e8f0',
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 15,
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 11, 14, 0.95)',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(139, 92, 246, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            if (context.parsed.y === null) return `${context.dataset.label}: No data`;
                            return `${context.dataset.label}: ${context.parsed.y}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 110,
                    ticks: {
                        color: '#94a3b8',
                        stepSize: 20,
                        callback: value => value <= 100 ? value + '%' : ''
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 10 }
                    },
                    grid: { display: false }
                }
            }
        }
    });
}

async function renderActivityChart(groupFilter) {
    const activities = await DatabaseHelper.getActivities();
    const allSubmissions = await DatabaseHelper.getAllSubmissions();
    console.log('📊 renderActivityChart: Got', allSubmissions.length, 'submissions');

    const filteredSubmissions = groupFilter
        ? allSubmissions.filter(sub => sub.students && String(sub.students.group_id) === String(groupFilter))
        : allSubmissions;

    const activityStats = activities.map(activity => {
        let completed = 0;
        let total = filteredSubmissions.length;

        filteredSubmissions.forEach(sub => {
            // Check by activity.id (how mock data stores it) or activity.name (fallback)
            const completion = sub.activity_completions[activity.id] ?? sub.activity_completions[activity.name];
            // Count as completed if true (boolean) or if numeric value meets/exceeds target
            if (completion === true || (typeof completion === 'number' && completion >= activity.target)) {
                completed++;
            }
        });

        return total > 0 ? Math.round((completed / total) * 100) : 0;
    });
    console.log('📊 renderActivityChart: Activity stats', activityStats);

    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    if (charts.activity) {
        charts.activity.destroy();
    }

    // Generate gradient colors based on completion rate
    const backgroundColors = activityStats.map(stat => {
        if (stat >= 80) return 'rgba(16, 185, 129, 0.85)';  // Green - excellent
        if (stat >= 60) return 'rgba(59, 130, 246, 0.85)';  // Blue - good
        if (stat >= 40) return 'rgba(245, 158, 11, 0.85)';  // Amber - average
        return 'rgba(239, 68, 68, 0.85)';                    // Red - needs attention
    });

    charts.activity = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: activities.map(a => a.name),
            datasets: [{
                label: 'Completion Rate %',
                data: activityStats,
                backgroundColor: backgroundColors,
                borderRadius: 8,
                borderWidth: 0,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10, 11, 14, 0.95)',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(139, 92, 246, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return `Completion: ${context.parsed.y}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 110,
                    ticks: {
                        color: '#94a3b8',
                        stepSize: 20,
                        callback: value => value <= 100 ? value + '%' : ''
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 11 }
                    },
                    grid: { display: false }
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
        const selectedFilter = document.getElementById('studentGroupFilter')?.value || null;
        const groupFilter = getEffectiveGroupFilter(selectedFilter);
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
            const avgCompletion = Math.round(stats.averageCompletion);

            // Determine color based on completion rate
            let completionColor, completionBg;
            if (avgCompletion >= 90) {
                completionColor = '#10b981'; // Green - excellent
                completionBg = 'rgba(16, 185, 129, 0.15)';
            } else if (avgCompletion >= 70) {
                completionColor = '#3b82f6'; // Blue - good
                completionBg = 'rgba(59, 130, 246, 0.15)';
            } else if (avgCompletion >= 50) {
                completionColor = '#f59e0b'; // Amber - average
                completionBg = 'rgba(245, 158, 11, 0.15)';
            } else {
                completionColor = '#ef4444'; // Red - needs attention
                completionBg = 'rgba(239, 68, 68, 0.15)';
            }

            tableHTML += `
                <tr>
                    <td>${student.name}</td>
                    <td>${student.grade}</td>
                    <td>${student.groups?.name || 'No Group'}</td>
                    <td>${stats.totalCompletions}</td>
                    <td>
                        <span class="completion-badge" style="
                            background: ${completionBg};
                            color: ${completionColor};
                            padding: 0.35rem 0.75rem;
                            border-radius: 20px;
                            font-weight: 600;
                            font-size: 0.875rem;
                            border: 1px solid ${completionColor}33;
                        ">${avgCompletion}%</span>
                    </td>
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
        // Ensure currentWeek is initialized
        if (!currentWeek) initCurrentWeek();

        // Get effective group filter for mentors
        const groupFilter = getEffectiveGroupFilter(null);

        document.getElementById('currentWeekDisplay').textContent = DatabaseHelper.formatDate(currentWeek);

        const submissions = await DatabaseHelper.getAllSubmissionsForWeek(currentWeek, groupFilter);
        console.log('📊 Got submissions:', submissions.length, 'records');

        const activities = await DatabaseHelper.getActivities();
        console.log('📋 Got activities:', activities.length, 'activities');

        const container = document.getElementById('weeklyDataGrid');

        if (submissions.length === 0) {
            console.warn('⚠️ No submissions found for this week');
            // Show available weeks for debugging
            if (DatabaseHelper.getValidWeekRange) {
                const range = DatabaseHelper.getValidWeekRange();
                console.log('📅 Valid week range:', range);
            }
            container.innerHTML = '<p style="text-align: center; color: var(--text-dim); grid-column: 1/-1;">No submissions for this week</p>';
            return;
        }

        console.log('✅ Rendering', submissions.length, 'submissions');

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

        // Show toast message below week navigation
        if (direction > 0) {
            showToast('Cannot navigate to future weeks', 'error', 'below-week-nav');
        } else {
            showToast('No more data available for previous weeks', 'error', 'below-week-nav');
        }
        return;
    }

    // Parse date correctly to avoid timezone issues
    // When parsing "YYYY-MM-DD" strings, use split to get local date
    const [year, month, day] = currentWeek.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    date.setDate(date.getDate() + (direction * 7));
    currentWeek = DatabaseHelper.getWeekStartDate(date);
    console.log('📆 changeWeek: New currentWeek after navigation:', currentWeek);
    loadWeeklyView();
}

// ==================== ANALYTICS (Now part of Overview) ====================

async function renderProgressChart(groupFilter) {
    const students = await DatabaseHelper.getStudents(groupFilter);
    const weeks = DatabaseHelper.getLastNWeeks(8).reverse();
    const activities = await DatabaseHelper.getActivities();

    // Helper to calculate completion score
    const calculateScore = (submission) => {
        let score = 0;
        activities.forEach(activity => {
            const value = submission.activity_completions[activity.id] ?? submission.activity_completions[activity.name];
            if (value === true || (typeof value === 'number' && value >= activity.target)) {
                score++;
            }
        });
        return score;
    };

    const datasets = await Promise.all(students.slice(0, 5).map(async (student, index) => {
        const weeklyData = await Promise.all(weeks.map(async week => {
            const submission = await DatabaseHelper.getWeeklySubmission(student.id, week);
            if (!submission) return 0;
            const score = calculateScore(submission);
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
                    max: 110,
                    ticks: {
                        color: '#94a3b8',
                        stepSize: 20,
                        callback: value => value <= 100 ? value + '%' : ''
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
    console.log('📊 renderActivityBreakdownChart called');
    const activities = await DatabaseHelper.getActivities();
    console.log('📊 Activities:', activities.length, activities.map(a => ({id: a.id, name: a.name, target: a.target})));

    const allSubmissions = await DatabaseHelper.getAllSubmissions();
    console.log('📊 All submissions:', allSubmissions.length);

    if (allSubmissions.length > 0) {
        console.log('📊 Sample submission activity_completions:', allSubmissions[0].activity_completions);
    }

    const filteredSubmissions = groupFilter
        ? allSubmissions.filter(sub => sub.students && String(sub.students.group_id) === String(groupFilter))
        : allSubmissions;
    console.log('📊 Filtered submissions:', filteredSubmissions.length);

    const activityData = activities.map(activity => {
        let completed = 0;
        filteredSubmissions.forEach(sub => {
            // Check by activity.id (how mock data stores it) or activity.name (fallback)
            const completion = sub.activity_completions[activity.id] ?? sub.activity_completions[activity.name];
            // Count as completed if true (boolean) or if numeric value meets/exceeds target
            if (completion === true || (typeof completion === 'number' && completion >= activity.target)) {
                completed++;
            }
        });
        return completed;
    });
    console.log('📊 Activity data (completions per activity):', activityData);

    const ctx = document.getElementById('activityBreakdownChart');
    console.log('📊 Canvas element found:', !!ctx);
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
                // Check by activity.id (how mock data stores it) or activity.name (fallback)
                const value = sub.activity_completions[activity.id] ?? sub.activity_completions[activity.name];
                // Count as completed if true (boolean) or if numeric value meets/exceeds target
                if (value === true || (typeof value === 'number' && value >= activity.target)) {
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
                    <button class="btn-small btn-edit" onclick="openEditActivityModal('${activity.id}')">
                        ✏️ Edit
                    </button>
                    <button class="btn-small btn-delete" onclick="deleteActivity('${activity.id}')">
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
