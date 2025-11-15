// ==========================================
// CETELE ADMIN DASHBOARD - MAIN JAVASCRIPT
// ==========================================

// Global State
let currentPage = 'overview';
let currentUser = null;
let currentWeekOffset = 0;
let allGroups = [];
let allStudents = [];
let allActivities = [];
let allSubmissions = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const session = checkAuth('admin');
    if (!session) return;

    // Load user data
    currentUser = JSON.parse(localStorage.getItem('cetele_user'));
    updateUserInfo();

    // Set up navigation
    setupNavigation();

    // Load initial data
    await loadAllData();

    // Show default page
    showPage('overview');
});

// ==========================================
// AUTHENTICATION & USER
// ==========================================

function updateUserInfo() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.email || 'Admin';
        document.getElementById('userRole').textContent = currentUser.role || 'Administrator';
    }
}

function logout() {
    if (confirm('Are you sure you want to sign out?')) {
        localStorage.removeItem('cetele_session');
        localStorage.removeItem('cetele_user');
        window.location.href = 'login.html';
    }
}

// ==========================================
// NAVIGATION
// ==========================================

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            if (page) {
                navigateTo(page);
            }
        });
    });
}

function navigateTo(pageName) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === pageName) {
            item.classList.add('active');
        }
    });

    // Show page
    showPage(pageName);
}

function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });

    // Show selected page
    const pageElement = document.getElementById(pageName + 'Page');
    if (pageElement) {
        pageElement.style.display = 'block';
        setTimeout(() => pageElement.classList.add('active'), 10);
        currentPage = pageName;

        // Load page-specific data
        loadPageData(pageName);
    }
}

// ==========================================
// DATA LOADING
// ==========================================

async function loadAllData() {
    try {
        // Load groups
        const { data: groups } = await supabase
            .from('groups')
            .select('*')
            .order('created_at', { ascending: false });
        allGroups = groups || [];

        // Load students
        const { data: students } = await supabase
            .from('students')
            .select('*, groups(name)')
            .order('name');
        allStudents = students || [];

        // Load activities
        const { data: activities } = await supabase
            .from('activities')
            .select('*')
            .order('order_index');
        allActivities = activities || [];

        // Load recent submissions
        const { data: submissions } = await supabase
            .from('weekly_submissions')
            .select('*, students(name, groups(name))')
            .order('created_at', { ascending: false })
            .limit(100);
        allSubmissions = submissions || [];

        console.log('Data loaded:', { groups: allGroups.length, students: allStudents.length, activities: allActivities.length, submissions: allSubmissions.length });
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

async function loadPageData(pageName) {
    switch(pageName) {
        case 'overview':
            await loadOverviewData();
            break;
        case 'analytics':
            await loadAnalyticsData();
            break;
        case 'hierarchy':
            await loadHierarchyData();
            break;
        case 'groups':
            await loadGroupsData();
            break;
        case 'students':
            await loadStudentsData();
            break;
        case 'cetele':
            await loadCeteleData();
            break;
        case 'mentor-code':
            await loadMentorCode();
            break;
        case 'activities':
            await loadActivitiesData();
            break;
    }
}

// ==========================================
// OVERVIEW PAGE
// ==========================================

async function loadOverviewData() {
    // Update stats
    document.getElementById('totalStudents').textContent = allStudents.length;

    // Calculate completion rate for this week
    const thisWeekSubmissions = allSubmissions.filter(sub => {
        const weekStart = getWeekStart(new Date());
        return new Date(sub.week_start_date).getTime() === weekStart.getTime();
    });

    if (thisWeekSubmissions.length > 0 && allActivities.length > 0) {
        const totalPossible = thisWeekSubmissions.length * allActivities.length;
        let totalCompleted = 0;
        thisWeekSubmissions.forEach(sub => {
            const completions = sub.activity_completions || {};
            totalCompleted += Object.values(completions).filter(v => v === true).length;
        });
        const completionRate = Math.round((totalCompleted / totalPossible) * 100);
        document.getElementById('weekCompletion').textContent = completionRate + '%';
    }

    // Calculate streaks
    const activeStreaks = calculateActiveStreaks();
    document.getElementById('activeStreaks').textContent = activeStreaks;

    // Calculate average score
    const avgScore = calculateAverageScore();
    document.getElementById('avgScore').textContent = avgScore;

    // Load charts
    loadTrendsChart();
    loadActivityChart();

    // Load recent submissions table
    loadRecentSubmissions();
}

function calculateActiveStreaks() {
    // Simple streak calculation - count students with submissions in last 2 weeks
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const activeStudents = new Set();
    allSubmissions.forEach(sub => {
        if (new Date(sub.created_at) >= twoWeeksAgo) {
            activeStudents.add(sub.student_id);
        }
    });

    return activeStudents.size;
}

function calculateAverageScore() {
    if (allSubmissions.length === 0 || allActivities.length === 0) return 0;

    let totalScore = 0;
    allSubmissions.forEach(sub => {
        const completions = sub.activity_completions || {};
        const completed = Object.values(completions).filter(v => v === true).length;
        totalScore += (completed / allActivities.length) * 100;
    });

    return Math.round(totalScore / allSubmissions.length);
}

function loadRecentSubmissions() {
    const tbody = document.getElementById('recentSubmissionsBody');
    if (allSubmissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">No submissions yet</div></td></tr>';
        return;
    }

    const recent = allSubmissions.slice(0, 10);
    tbody.innerHTML = recent.map(sub => {
        const studentName = sub.students?.name || 'Unknown';
        const groupName = sub.students?.groups?.name || 'N/A';
        const weekDate = new Date(sub.week_start_date).toLocaleDateString();
        const completions = sub.activity_completions || {};
        const completed = Object.values(completions).filter(v => v === true).length;
        const total = allActivities.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        const submittedDate = new Date(sub.created_at).toLocaleDateString();

        return `
            <tr>
                <td>${studentName}</td>
                <td>${groupName}</td>
                <td>${weekDate}</td>
                <td>
                    <span class="badge ${percentage >= 80 ? 'badge-green' : percentage >= 50 ? 'badge-blue' : 'badge-red'}">
                        ${percentage}%
                    </span>
                </td>
                <td style="font-size: 0.85rem; color: var(--text-muted);">${submittedDate}</td>
            </tr>
        `;
    }).join('');
}

function loadTrendsChart() {
    const canvas = document.getElementById('trendsChart');
    if (!canvas) return;

    // Get last 8 weeks of data
    const weeks = [];
    const completionRates = [];

    for (let i = 7; i >= 0; i--) {
        const weekStart = getWeekStart(new Date());
        weekStart.setDate(weekStart.getDate() - (i * 7));
        weeks.push(weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

        const weekSubmissions = allSubmissions.filter(sub => {
            return new Date(sub.week_start_date).getTime() === weekStart.getTime();
        });

        if (weekSubmissions.length > 0 && allActivities.length > 0) {
            const totalPossible = weekSubmissions.length * allActivities.length;
            let totalCompleted = 0;
            weekSubmissions.forEach(sub => {
                const completions = sub.activity_completions || {};
                totalCompleted += Object.values(completions).filter(v => v === true).length;
            });
            completionRates.push(Math.round((totalCompleted / totalPossible) * 100));
        } else {
            completionRates.push(0);
        }
    }

    new Chart(canvas, {
        type: 'line',
        data: {
            labels: weeks,
            datasets: [{
                label: 'Completion Rate',
                data: completionRates,
                borderColor: 'rgb(139, 92, 246)',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                tension: 0.4,
                fill: true
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
                    ticks: { color: 'rgba(248, 250, 252, 0.5)' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { color: 'rgba(248, 250, 252, 0.5)' },
                    grid: { display: false }
                }
            }
        }
    });
}

function loadActivityChart() {
    const canvas = document.getElementById('activityChart');
    if (!canvas || allActivities.length === 0) return;

    // Calculate completion rate for each activity
    const activityNames = allActivities.map(a => a.name);
    const activityRates = allActivities.map(activity => {
        let total = 0;
        let completed = 0;

        allSubmissions.forEach(sub => {
            const completions = sub.activity_completions || {};
            total++;
            if (completions[activity.name] === true) completed++;
        });

        return total > 0 ? Math.round((completed / total) * 100) : 0;
    });

    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: activityNames,
            datasets: [{
                label: 'Completion %',
                data: activityRates,
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1
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
                    ticks: { color: 'rgba(248, 250, 252, 0.5)' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { color: 'rgba(248, 250, 252, 0.5)' },
                    grid: { display: false }
                }
            }
        }
    });
}

// ==========================================
// ANALYTICS PAGE
// ==========================================

async function loadAnalyticsData() {
    loadWeeklyProgressChart();
    loadGroupComparisonChart();
    loadTopPerformers();
}

function loadWeeklyProgressChart() {
    const canvas = document.getElementById('weeklyProgressChart');
    if (!canvas) return;

    // Similar to trends chart but with more detail
    loadTrendsChart(); // Reuse for now
}

function loadGroupComparisonChart() {
    const canvas = document.getElementById('groupComparisonChart');
    if (!canvas || allGroups.length === 0) return;

    const groupNames = allGroups.map(g => g.name);
    const groupScores = allGroups.map(group => {
        const groupStudents = allStudents.filter(s => s.group_id === group.id);
        if (groupStudents.length === 0) return 0;

        let totalScore = 0;
        groupStudents.forEach(student => {
            const studentSubmissions = allSubmissions.filter(s => s.student_id === student.id);
            studentSubmissions.forEach(sub => {
                const completions = sub.activity_completions || {};
                const completed = Object.values(completions).filter(v => v === true).length;
                totalScore += (completed / allActivities.length) * 100;
            });
        });

        return Math.round(totalScore / (groupStudents.length || 1));
    });

    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: groupNames,
            datasets: [{
                label: 'Avg Score',
                data: groupScores,
                backgroundColor: 'rgba(139, 92, 246, 0.6)',
                borderColor: 'rgb(139, 92, 246)',
                borderWidth: 1
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
                    ticks: { color: 'rgba(248, 250, 252, 0.5)' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { color: 'rgba(248, 250, 252, 0.5)' },
                    grid: { display: false }
                }
            }
        }
    });
}

function loadTopPerformers() {
    const tbody = document.getElementById('topPerformersBody');
    if (!tbody) return;

    // Calculate student scores
    const studentScores = allStudents.map(student => {
        const submissions = allSubmissions.filter(s => s.student_id === student.id);
        let totalScore = 0;
        submissions.forEach(sub => {
            const completions = sub.activity_completions || {};
            const completed = Object.values(completions).filter(v => v === true).length;
            totalScore += (completed / allActivities.length) * 100;
        });
        const avgScore = submissions.length > 0 ? Math.round(totalScore / submissions.length) : 0;

        return {
            ...student,
            avgScore,
            submissionCount: submissions.length
        };
    });

    // Sort by score
    studentScores.sort((a, b) => b.avgScore - a.avgScore);
    const top10 = studentScores.slice(0, 10);

    if (top10.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-icon">🏆</div><div class="empty-title">No data yet</div></td></tr>';
        return;
    }

    tbody.innerHTML = top10.map((student, index) => `
        <tr>
            <td><span class="badge ${index < 3 ? 'badge-green' : 'badge-blue'}">#${index + 1}</span></td>
            <td>${student.name}</td>
            <td>${student.groups?.name || 'N/A'}</td>
            <td>${student.avgScore}%</td>
            <td>${student.submissionCount} weeks</td>
        </tr>
    `).join('');
}

// ==========================================
// HIERARCHY PAGE
// ==========================================

async function loadHierarchyData() {
    const container = document.getElementById('hierarchyContainer');
    if (!container) return;

    try {
        // Load all users
        const { data: users } = await supabase
            .from('users')
            .select('*, groups(name)')
            .order('role');

        if (!users || users.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">🌳</div><div class="empty-title">No users found</div></div>';
            return;
        }

        // Group by role
        const ed = users.filter(u => u.role === 'ed');
        const coordinators = users.filter(u => u.role === 'coordinator');
        const mentors = users.filter(u => u.role === 'mentor');
        const students = users.filter(u => u.role === 'student');

        let html = '';

        // ED Level
        if (ed.length > 0) {
            html += renderHierarchyLevel('👑 Educational Directors', ed, 'ed');
        }

        // Coordinators
        if (coordinators.length > 0) {
            html += renderHierarchyLevel('🎯 Coordinators', coordinators, 'coordinator');
        }

        // Mentors
        if (mentors.length > 0) {
            html += renderHierarchyLevel('👨‍🏫 Mentors', mentors, 'mentor');
        }

        // Students
        if (students.length > 0) {
            html += renderHierarchyLevel('🎓 Students', students.slice(0, 20), 'student');
            if (students.length > 20) {
                html += `<div style="text-align: center; padding: 1rem; color: var(--text-muted);">Showing 20 of ${students.length} students</div>`;
            }
        }

        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading hierarchy:', error);
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error loading hierarchy</div></div>';
    }
}

function renderHierarchyLevel(title, users, roleType) {
    const icons = {
        ed: '👑',
        coordinator: '🎯',
        mentor: '👨‍🏫',
        student: '🎓'
    };

    return `
        <div class="hierarchy-level">
            <div class="hierarchy-level-title">
                <span>${title}</span>
                <span style="color: var(--text-muted);">(${users.length})</span>
            </div>
            <div class="hierarchy-items">
                ${users.map(user => `
                    <div class="hierarchy-card">
                        <div class="hierarchy-card-header">
                            <div class="hierarchy-avatar">${icons[roleType]}</div>
                            <div class="hierarchy-info">
                                <div class="hierarchy-name">${user.username || user.email || 'Unknown'}</div>
                                <div class="hierarchy-role">${user.role}${user.region ? ' • ' + user.region : ''}</div>
                            </div>
                        </div>
                        ${roleType === 'mentor' || roleType === 'student' ? `
                            <div class="hierarchy-stats">
                                ${roleType === 'mentor' ? `
                                    <div class="hierarchy-stat">
                                        <div class="hierarchy-stat-label">Group</div>
                                        <div class="hierarchy-stat-value">${user.groups?.name || 'None'}</div>
                                    </div>
                                ` : ''}
                                ${roleType === 'student' ? `
                                    <div class="hierarchy-stat">
                                        <div class="hierarchy-stat-label">Submissions</div>
                                        <div class="hierarchy-stat-value">${allSubmissions.filter(s => s.student_id === user.student_id).length}</div>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ==========================================
// GROUPS PAGE
// ==========================================

async function loadGroupsData() {
    const container = document.getElementById('groupsList');
    if (!container) return;

    if (allGroups.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">No groups yet</div><div class="empty-text">Create your first group to get started</div><button class="btn btn-primary" onclick="showCreateGroupModal()">Create Group</button></div>';
        return;
    }

    container.innerHTML = `
        <div class="stats-grid" style="margin-top: 1.5rem;">
            ${allGroups.map(group => {
                const groupStudents = allStudents.filter(s => s.group_id === group.id);
                return `
                    <div class="card">
                        <div style="font-size: 2rem; margin-bottom: 0.75rem;">👥</div>
                        <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;">${group.name}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">${group.grade || 'No grade'}</div>
                        <div style="display: flex; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--glass-border);">
                            <div style="flex: 1;">
                                <div style="font-size: 0.75rem; color: var(--text-muted);">STUDENTS</div>
                                <div style="font-size: 1.5rem; font-weight: 600;">${groupStudents.length}</div>
                            </div>
                            <div style="flex: 1;">
                                <div style="font-size: 0.75rem; color: var(--text-muted);">REGION</div>
                                <div style="font-size: 0.9rem; font-weight: 600;">${group.region || 'N/A'}</div>
                            </div>
                        </div>
                        <button class="btn btn-danger btn-sm" style="margin-top: 1rem; width: 100%;" onclick="deleteGroup('${group.id}')">
                            Delete Group
                        </button>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function showCreateGroupModal() {
    alert('Create group modal coming soon! For now, use Supabase dashboard to create groups.');
}

async function deleteGroup(groupId) {
    if (!confirm('Are you sure you want to delete this group? This will remove all students from the group.')) return;

    try {
        const { error } = await supabase
            .from('groups')
            .delete()
            .eq('id', groupId);

        if (error) throw error;

        await loadAllData();
        await loadGroupsData();
        alert('Group deleted successfully!');
    } catch (error) {
        console.error('Error deleting group:', error);
        alert('Failed to delete group: ' + error.message);
    }
}

// ==========================================
// STUDENTS PAGE
// ==========================================

async function loadStudentsData() {
    // Populate group filter
    const filterSelect = document.getElementById('filterGroup');
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">All Groups</option>' +
            allGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    }

    filterStudents();
}

function filterStudents() {
    const filterGroup = document.getElementById('filterGroup')?.value;
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;

    let filtered = allStudents;
    if (filterGroup) {
        filtered = allStudents.filter(s => s.group_id === filterGroup);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-icon">🎓</div><div class="empty-title">No students found</div></td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(student => {
        const submissions = allSubmissions.filter(s => s.student_id === student.id);
        let totalScore = 0;
        submissions.forEach(sub => {
            const completions = sub.activity_completions || {};
            const completed = Object.values(completions).filter(v => v === true).length;
            totalScore += (completed / allActivities.length) * 100;
        });
        const avgScore = submissions.length > 0 ? Math.round(totalScore / submissions.length) : 0;

        return `
            <tr>
                <td>${student.name}</td>
                <td>${student.groups?.name || 'No group'}</td>
                <td>${student.grade || 'N/A'}</td>
                <td>
                    <span class="badge ${avgScore >= 80 ? 'badge-green' : avgScore >= 50 ? 'badge-blue' : 'badge-red'}">
                        ${avgScore}%
                    </span>
                </td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteStudent('${student.id}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

function showAddStudentModal() {
    alert('Add student modal coming soon! For now, students can sign up using the student portal.');
}

async function deleteStudent(studentId) {
    if (!confirm('Are you sure you want to delete this student? This will also delete all their submissions.')) return;

    try {
        const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', studentId);

        if (error) throw error;

        await loadAllData();
        filterStudents();
        alert('Student deleted successfully!');
    } catch (error) {
        console.error('Error deleting student:', error);
        alert('Failed to delete student: ' + error.message);
    }
}

// ==========================================
// WEEKLY CETELE PAGE
// ==========================================

async function loadCeteleData() {
    // Populate group filter
    const filterSelect = document.getElementById('ceteleGroupFilter');
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">All Groups</option>' +
            allGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    }

    // Update week display
    const weekStart = getWeekStart(new Date());
    weekStart.setDate(weekStart.getDate() + (currentWeekOffset * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    document.getElementById('ceteleWeekDisplay').textContent =
        weekStart.toLocaleDateString() + ' - ' + weekEnd.toLocaleDateString();

    // Filter submissions for this week
    const filterGroup = filterSelect?.value;
    let studentsToShow = allStudents;
    if (filterGroup) {
        studentsToShow = allStudents.filter(s => s.group_id === filterGroup);
    }

    const weekSubmissions = allSubmissions.filter(sub => {
        return new Date(sub.week_start_date).getTime() === weekStart.getTime();
    });

    // Build table
    const container = document.getElementById('ceteleTableContainer');
    if (!container) return;

    if (studentsToShow.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No students in this group</div></div>';
        return;
    }

    container.innerHTML = `
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Student</th>
                        ${allActivities.map(a => `<th style="text-align: center;">${a.name}</th>`).join('')}
                        <th style="text-align: center;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${studentsToShow.map(student => {
                        const submission = weekSubmissions.find(s => s.student_id === student.id);
                        const completions = submission?.activity_completions || {};
                        const completed = Object.values(completions).filter(v => v === true).length;
                        const total = allActivities.length;
                        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

                        return `
                            <tr>
                                <td>${student.name}</td>
                                ${allActivities.map(activity => {
                                    const isCompleted = completions[activity.name] === true;
                                    return `<td style="text-align: center;">${isCompleted ? '✅' : '❌'}</td>`;
                                }).join('')}
                                <td style="text-align: center;">
                                    <span class="badge ${percentage >= 80 ? 'badge-green' : percentage >= 50 ? 'badge-blue' : 'badge-red'}">
                                        ${completed}/${total}
                                    </span>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function changeCeteleWeek(offset) {
    currentWeekOffset += offset;
    loadCeteleData();
}

// ==========================================
// MENTOR CODE PAGE
// ==========================================

async function loadMentorCode() {
    try {
        const { data: mentorCodes } = await supabase
            .from('mentor_codes')
            .select('*')
            .eq('mentor_id', currentUser.id)
            .eq('is_active', true)
            .limit(1);

        if (mentorCodes && mentorCodes.length > 0) {
            const code = mentorCodes[0];
            document.getElementById('mentorCodeDisplay').textContent = code.code;

            // Count students with this code
            const { data: students } = await supabase
                .from('users')
                .select('id')
                .eq('mentor_id', currentUser.id)
                .eq('role', 'student');

            document.getElementById('mentorCodeStudents').textContent = students?.length || 0;
        } else {
            document.getElementById('mentorCodeDisplay').textContent = 'No code assigned';
            document.getElementById('mentorCodeStudents').textContent = '0';
        }
    } catch (error) {
        console.error('Error loading mentor code:', error);
        document.getElementById('mentorCodeDisplay').textContent = 'Error loading code';
    }
}

function copyMentorCode() {
    const code = document.getElementById('mentorCodeDisplay').textContent;
    if (code && code !== 'Loading...' && code !== 'No code assigned') {
        navigator.clipboard.writeText(code);
        alert('Mentor code copied to clipboard!');
    }
}

// ==========================================
// ACTIVITIES PAGE
// ==========================================

async function loadActivitiesData() {
    const container = document.getElementById('activitiesList');
    if (!container) return;

    if (allActivities.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚙️</div><div class="empty-title">No activities yet</div><div class="empty-text">Create your first activity to get started</div></div>';
        return;
    }

    container.innerHTML = `
        <div class="table-container" style="margin-top: 1.5rem;">
            <table class="table">
                <thead>
                    <tr>
                        <th>Order</th>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Type</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${allActivities.map(activity => `
                        <tr>
                            <td>${activity.order_index}</td>
                            <td>${activity.name}</td>
                            <td>${activity.description || 'N/A'}</td>
                            <td><span class="badge badge-purple">${activity.type || 'general'}</span></td>
                            <td>
                                <button class="btn btn-danger btn-sm" onclick="deleteActivity('${activity.id}')">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function showAddActivityModal() {
    alert('Add activity modal coming soon! For now, use Supabase dashboard to add activities.');
}

async function deleteActivity(activityId) {
    if (!confirm('Are you sure you want to delete this activity?')) return;

    try {
        const { error } = await supabase
            .from('activities')
            .delete()
            .eq('id', activityId);

        if (error) throw error;

        await loadAllData();
        await loadActivitiesData();
        alert('Activity deleted successfully!');
    } catch (error) {
        console.error('Error deleting activity:', error);
        alert('Failed to delete activity: ' + error.message);
    }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}
