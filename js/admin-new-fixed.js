// ==========================================
// CETELE ADMIN DASHBOARD - FIXED VERSION
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

    console.log('Current user:', currentUser);

    if (!currentUser) {
        alert('User data not found. Please login again.');
        window.location.href = 'login.html';
        return;
    }

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
        const displayName = currentUser.username || currentUser.email || 'Admin';
        const displayRole = getRoleDisplayName(currentUser.role);

        document.getElementById('userName').textContent = displayName;
        document.getElementById('userRole').textContent = displayRole;
    }
}

function getRoleDisplayName(role) {
    const roleMap = {
        'ed': 'Educational Director',
        'coordinator': 'Coordinator',
        'mentor': 'Mentor',
        'student': 'Student'
    };
    return roleMap[role] || role;
}

function hasPermission(permission) {
    if (!currentUser) {
        console.log('hasPermission: No current user');
        return false;
    }

    const role = currentUser.role;
    console.log('hasPermission check:', permission, 'for role:', role);

    // ED has all permissions
    if (role === 'ed') {
        console.log('ED has all permissions');
        return true;
    }

    // Coordinator has all permissions
    if (role === 'coordinator' || currentUser.is_coordinator) {
        console.log('Coordinator has all permissions');
        return true;
    }

    // Mentor has limited permissions
    if (role === 'mentor' || currentUser.is_mentor) {
        const mentorPermissions = [
            'view_own_group',
            'edit_own_cetele',
            'view_mentor_code',
            'view_own_students'
        ];
        const hasIt = mentorPermissions.includes(permission);
        console.log('Mentor permission check:', permission, '=', hasIt);
        return hasIt;
    }

    console.log('No permission granted for:', permission);
    return false;
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
        console.log('Loading all data...');

        // Determine which groups to load based on role
        let groupsQuery = supabase.from('groups').select('*');

        // Mentors only see their own group
        if (currentUser.role === 'mentor' && !currentUser.is_coordinator && currentUser.group_id) {
            groupsQuery = groupsQuery.eq('id', currentUser.group_id);
        }

        const { data: groups } = await groupsQuery.order('created_at', { ascending: false });
        allGroups = groups || [];
        console.log('Loaded groups:', allGroups.length);

        // Load students (filtered by groups if mentor)
        let studentsQuery = supabase.from('students').select('*, groups(name)');

        if (currentUser.role === 'mentor' && !currentUser.is_coordinator && currentUser.group_id) {
            studentsQuery = studentsQuery.eq('group_id', currentUser.group_id);
        }

        const { data: students } = await studentsQuery.order('name');
        allStudents = students || [];
        console.log('Loaded students:', allStudents.length);

        // Load activities
        const { data: activities } = await supabase
            .from('activities')
            .select('*')
            .order('order_index');
        allActivities = activities || [];
        console.log('Loaded activities:', allActivities.length);

        // Load submissions (filtered by students if mentor)
        let submissionsQuery = supabase
            .from('weekly_submissions')
            .select('*, students(name, groups(name))')
            .order('created_at', { ascending: false });

        if (currentUser.role === 'mentor' && !currentUser.is_coordinator) {
            const studentIds = allStudents.map(s => s.id);
            if (studentIds.length > 0) {
                submissionsQuery = submissionsQuery.in('student_id', studentIds);
            }
        }

        const { data: submissions } = await submissionsQuery.limit(200);
        allSubmissions = submissions || [];
        console.log('Loaded submissions:', allSubmissions.length);

    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data. Please check console for details.');
    }
}

async function loadPageData(pageName) {
    console.log('Loading page data for:', pageName);

    try {
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
                await loadActivitiesSummary();
                break;
        }
    } catch (error) {
        console.error('Error loading page data:', error);
        alert('Error loading page. Check console for details.');
    }
}

// ==========================================
// OVERVIEW PAGE
// ==========================================

async function loadOverviewData() {
    console.log('Loading overview data...');

    // Update stats
    document.getElementById('totalStudents').textContent = allStudents.length;

    // Calculate completion rate for this week
    const thisWeekSubmissions = allSubmissions.filter(sub => {
        const weekStart = getWeekStart(new Date());
        const subWeekStart = new Date(sub.week_start_date);
        return subWeekStart.getTime() === weekStart.getTime();
    });

    console.log('This week submissions:', thisWeekSubmissions.length);

    if (thisWeekSubmissions.length > 0 && allActivities.length > 0) {
        const totalPossible = thisWeekSubmissions.length * allActivities.length;
        let totalCompleted = 0;
        thisWeekSubmissions.forEach(sub => {
            const completions = sub.activity_completions || {};
            totalCompleted += Object.values(completions).filter(v => v === true).length;
        });
        const completionRate = Math.round((totalCompleted / totalPossible) * 100);
        document.getElementById('weekCompletion').textContent = completionRate + '%';

        const changeEl = document.getElementById('weekCompletionChange');
        if (completionRate >= 70) {
            changeEl.className = 'stat-change positive';
            changeEl.innerHTML = '<span>↑</span><span>' + completionRate + '%</span>';
        } else {
            changeEl.className = 'stat-change';
            changeEl.innerHTML = '<span>→</span><span>' + completionRate + '%</span>';
        }
    } else {
        document.getElementById('weekCompletion').textContent = '0%';
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
    if (!tbody) return;

    if (allSubmissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">No submissions yet</div><div class="empty-text">Students will appear here after submitting their cetele</div></td></tr>';
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

    // Destroy existing chart
    if (canvas.chart) {
        canvas.chart.destroy();
    }

    // Get last 8 weeks of data
    const weeks = [];
    const completionRates = [];

    for (let i = 7; i >= 0; i--) {
        const weekStart = getWeekStart(new Date());
        weekStart.setDate(weekStart.getDate() - (i * 7));
        weeks.push(weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

        const weekSubmissions = allSubmissions.filter(sub => {
            const subWeekStart = new Date(sub.week_start_date);
            return subWeekStart.getTime() === weekStart.getTime();
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

    canvas.chart = new Chart(canvas, {
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

    // Destroy existing chart
    if (canvas.chart) {
        canvas.chart.destroy();
    }

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

    canvas.chart = new Chart(canvas, {
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

    // Destroy existing chart
    if (canvas.chart) {
        canvas.chart.destroy();
    }

    // Similar to trends chart
    const weeks = [];
    const completionRates = [];

    for (let i = 11; i >= 0; i--) {
        const weekStart = getWeekStart(new Date());
        weekStart.setDate(weekStart.getDate() - (i * 7));
        weeks.push(weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

        const weekSubmissions = allSubmissions.filter(sub => {
            const subWeekStart = new Date(sub.week_start_date);
            return subWeekStart.getTime() === weekStart.getTime();
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

    canvas.chart = new Chart(canvas, {
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

function loadGroupComparisonChart() {
    const canvas = document.getElementById('groupComparisonChart');
    if (!canvas || allGroups.length === 0) return;

    // Destroy existing chart
    if (canvas.chart) {
        canvas.chart.destroy();
    }

    const groupNames = allGroups.map(g => g.name);
    const groupScores = allGroups.map(group => {
        const groupStudents = allStudents.filter(s => s.group_id === group.id);
        if (groupStudents.length === 0) return 0;

        let totalScore = 0;
        let submissionCount = 0;

        groupStudents.forEach(student => {
            const studentSubmissions = allSubmissions.filter(s => s.student_id === student.id);
            studentSubmissions.forEach(sub => {
                const completions = sub.activity_completions || {};
                const completed = Object.values(completions).filter(v => v === true).length;
                if (allActivities.length > 0) {
                    totalScore += (completed / allActivities.length) * 100;
                    submissionCount++;
                }
            });
        });

        return submissionCount > 0 ? Math.round(totalScore / submissionCount) : 0;
    });

    canvas.chart = new Chart(canvas, {
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
            if (allActivities.length > 0) {
                totalScore += (completed / allActivities.length) * 100;
            }
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
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-icon">🏆</div><div class="empty-title">No data yet</div><div class="empty-text">Students will appear here once they start submitting</div></td></tr>';
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
        logOperation('Load Hierarchy', 'Starting...');
        container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        // Load all users (no join - users table doesn't have group_id)
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('role');

        if (error) {
            logError('Load Hierarchy - Users Query', error.message);
            throw error;
        }

        logSuccess('Load Hierarchy - Users Query', `Loaded ${users?.length || 0} users`);

        if (!users || users.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">🌳</div><div class="empty-title">No users found</div><div class="empty-text">Create users to build your hierarchy</div></div>';
            return;
        }

        // Load mentor codes to map mentors to groups
        const { data: mentorCodes } = await supabase
            .from('mentor_codes')
            .select('*, groups(name)');

        // Load students to show under each mentor
        const { data: students } = await supabase
            .from('students')
            .select('*, groups(name)');

        // Create mentor -> group mapping
        const mentorGroupMap = {};
        const groupStudentsMap = {};

        if (mentorCodes) {
            mentorCodes.forEach(mc => {
                mentorGroupMap[mc.mentor_id] = {
                    groupId: mc.group_id,
                    groupName: mc.groups?.name || 'Unknown Group',
                    code: mc.code
                };
            });
        }

        // Create group -> students mapping
        if (students) {
            students.forEach(student => {
                if (!groupStudentsMap[student.group_id]) {
                    groupStudentsMap[student.group_id] = [];
                }
                groupStudentsMap[student.group_id].push(student);
            });
        }

        // Group by role
        const ed = users.filter(u => u.role === 'ed');
        const coordinators = users.filter(u => u.role === 'coordinator' || u.is_coordinator);
        const mentors = users.filter(u => u.role === 'mentor' || u.is_mentor);

        logOperation('Load Hierarchy - Filter Users', `ED: ${ed.length}, Coordinators: ${coordinators.length}, Mentors: ${mentors.length}`);
        logOperation('All Users Data', users.map(u => ({ id: u.id, email: u.email, role: u.role, is_mentor: u.is_mentor })));

        let html = '<div class="hierarchy-tree">';

        // ED Level
        if (ed.length > 0) {
            html += `
                <div class="tree-level">
                    <div class="tree-level-label">👑 Educational Directors</div>
                    <div class="tree-nodes-row">
                        ${ed.map(user => renderFamilyTreeNode(user, 'ed', null, [])).join('')}
                    </div>
                </div>
            `;
        }

        // Coordinators
        if (coordinators.length > 0) {
            html += `
                <div class="tree-level">
                    <div class="tree-level-label">🎯 Coordinators</div>
                    <div class="tree-nodes-row">
                        ${coordinators.map(user => renderFamilyTreeNode(user, 'coordinator', null, [])).join('')}
                    </div>
                </div>
            `;
        }

        // Mentors with their students
        if (mentors.length > 0) {
            logOperation('Rendering Mentors', `Found ${mentors.length} mentors`);
            const mentorNodes = mentors.map(mentor => {
                const groupInfo = mentorGroupMap[mentor.id];
                const groupStudents = groupInfo ? groupStudentsMap[groupInfo.groupId] || [] : [];
                logOperation('Mentor Node', { mentor: mentor.email, groupInfo, studentCount: groupStudents.length });
                const nodeHtml = renderFamilyTreeNode(mentor, 'mentor', groupInfo, groupStudents);
                logOperation('Node HTML Length', nodeHtml.length);
                return nodeHtml;
            });

            const joinedNodes = mentorNodes.join('');
            logOperation('All Mentor Nodes HTML Length', joinedNodes.length);

            html += `
                <div class="tree-level">
                    <div class="tree-level-label">👨‍🏫 Mentors & Their Students</div>
                    <div class="tree-nodes-row">
                        ${joinedNodes}
                    </div>
                </div>
            `;
        } else {
            logError('Rendering Mentors', 'No mentors found after filtering');
        }

        html += '</div>';

        logOperation('Final HTML Length', html.length);
        logOperation('Final HTML Preview', html.substring(0, 500));

        container.innerHTML = html;

        // DEBUG: Check if mentors section exists in DOM
        const mentorsSection = container.querySelector('.tree-level:has(.tree-level-label)');
        const mentorsLabel = container.querySelectorAll('.tree-level-label');
        const mentorCards = container.querySelectorAll('.tree-node-card');

        logOperation('DOM Check - Sections Found', mentorsLabel.length);
        logOperation('DOM Check - Mentor Cards Found', mentorCards.length);

        mentorsLabel.forEach((label, i) => {
            logOperation(`Section ${i + 1} Label`, label.textContent.trim());
        });

        if (mentorCards.length === 0) {
            logError('DOM Check', 'NO MENTOR CARDS FOUND IN DOM!');
            logOperation('Container HTML Length', container.innerHTML.length);
            logOperation('Container First Child', container.firstElementChild?.className || 'NONE');
        } else {
            logSuccess('DOM Check', `${mentorCards.length} mentor cards successfully rendered`);
            mentorCards.forEach((card, i) => {
                const isVisible = card.offsetParent !== null;
                const styles = window.getComputedStyle(card);
                logOperation(`Card ${i + 1} Visibility`, {
                    visible: isVisible,
                    display: styles.display,
                    opacity: styles.opacity,
                    visibility: styles.visibility
                });
            });
        }

        // Add click handlers for expand buttons
        document.querySelectorAll('.tree-expand-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const node = this.closest('.tree-node');
                const children = node.querySelector('.tree-children');
                const connector = node.querySelector('.tree-connector-v');

                this.classList.toggle('expanded');
                if (children) {
                    children.classList.toggle('expanded');
                }
                if (connector) {
                    connector.classList.toggle('show');
                }
            });
        });

        logSuccess('Load Hierarchy', 'Family tree view rendered successfully');
    } catch (error) {
        console.error('Error loading hierarchy:', error);
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error loading hierarchy</div><div class="empty-text">' + error.message + '</div></div>';
    }
}

function renderFamilyTreeNode(user, role, groupInfo = null, students = []) {
    const icons = {
        ed: '👑',
        coordinator: '🎯',
        mentor: '👨‍🏫',
        student: '🎓'
    };

    const userName = user.username || user.email || 'Unknown';
    const hasChildren = students.length > 0;

    return `
        <div class="tree-node">
            <div class="tree-node-card ${hasChildren ? 'has-children' : ''}">
                <div class="tree-node-icon">${icons[role]}</div>
                <div class="tree-node-name">${userName}</div>
                <div class="tree-node-role">${user.role || role}</div>
                ${groupInfo || hasChildren ? `
                    <div class="tree-node-badges">
                        ${groupInfo ? `<span class="tree-node-badge">📂 ${groupInfo.groupName}</span>` : ''}
                        ${hasChildren ? `<span class="tree-node-badge">👥 ${students.length}</span>` : ''}
                    </div>
                ` : ''}
                ${hasChildren ? `
                    <div class="tree-expand-btn">
                        <span class="tree-expand-icon">▼</span>
                    </div>
                ` : ''}
            </div>
            ${hasChildren ? `
                <div class="tree-connector-v"></div>
                <div class="tree-children">
                    <div class="tree-connector-h"></div>
                    <div class="tree-nodes-row">
                        ${students.map(student => `
                            <div class="tree-child">
                                <div class="tree-child-card">
                                    <div class="tree-child-icon">🎓</div>
                                    <div class="tree-child-name">${student.name}</div>
                                    <div class="tree-child-meta">${student.grade || ''}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
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
                const canDelete = hasPermission('delete_group');

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
                        ${canDelete ? `
                            <button class="btn btn-danger btn-sm" style="margin-top: 1rem; width: 100%;" onclick="deleteGroup('${group.id}')">
                                Delete Group
                            </button>
                        ` : ''}
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
    console.log('=== DELETE GROUP ===');
    console.log('Group ID:', groupId);
    console.log('Current user:', currentUser);

    // Coordinators and EDs can delete groups
    if (!hasPermission('delete_group') && currentUser.role !== 'coordinator' && currentUser.role !== 'ed' && !currentUser.is_coordinator) {
        console.log('Permission denied for deleting group');
        alert('You do not have permission to delete groups.');
        return;
    }

    if (!confirm('Are you sure you want to delete this group? This will remove all students from the group.')) {
        console.log('User cancelled deletion');
        return;
    }

    try {
        console.log('Attempting to delete group from database...');

        const { error, data } = await supabase
            .from('groups')
            .delete()
            .eq('id', groupId)
            .select();

        console.log('Delete result:', { error, data });

        if (error) throw error;

        console.log('Group deleted from database, reloading data...');

        await loadAllData();
        console.log('Data reloaded, refreshing groups list...');

        await loadGroupsData();
        console.log('Groups list refreshed');

        alert('Group deleted successfully!');
    } catch (error) {
        console.error('Error deleting group:', error);
        console.error('Error details:', error.message, error.code, error.hint);
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
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-icon">🎓</div><div class="empty-title">No students found</div><div class="empty-text">Students will appear here after signing up</div></td></tr>';
        return;
    }

    const canDelete = hasPermission('delete_student');

    tbody.innerHTML = filtered.map(student => {
        const submissions = allSubmissions.filter(s => s.student_id === student.id);
        let totalScore = 0;
        submissions.forEach(sub => {
            const completions = sub.activity_completions || {};
            const completed = Object.values(completions).filter(v => v === true).length;
            if (allActivities.length > 0) {
                totalScore += (completed / allActivities.length) * 100;
            }
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
                    ${canDelete ? `<button class="btn btn-danger btn-sm" onclick="deleteStudent('${student.id}')">Delete</button>` : '-'}
                </td>
            </tr>
        `;
    }).join('');
}

function showAddStudentModal() {
    alert('Add student modal coming soon! For now, students can sign up using the student portal.');
}

async function deleteStudent(studentId) {
    logOperation('DELETE STUDENT', `ID: ${studentId}`);
    logAuth('Current User', currentUser);

    // Get student name for logging
    const student = allStudents.find(s => s.id === studentId);
    const studentName = student ? student.name : 'Unknown';

    // Coordinators and EDs can delete students
    const canDelete = currentUser.role === 'coordinator' || currentUser.role === 'ed' || currentUser.is_coordinator;

    if (!canDelete) {
        logPermission('Delete Student', false);
        logError('Delete Student', 'User does not have coordinator/ED role');
        alert('You do not have permission to delete students.');
        return;
    }

    logPermission('Delete Student', true);

    if (!confirm(`Are you sure you want to delete ${studentName}? This will also delete all their submissions.`)) {
        logWarning('Delete Student', 'User cancelled deletion');
        return;
    }

    try {
        logOperation('Database Delete', `Starting deletion for: ${studentName}`);

        // First delete submissions
        logDatabase('cetele_submissions', 'DELETE', `student_id = ${studentId}`);
        const { error: submissionsError } = await supabase
            .from('cetele_submissions')
            .delete()
            .eq('student_id', studentId);

        if (submissionsError) {
            logWarning('Delete Submissions', submissionsError.message);
        } else {
            logSuccess('Delete Submissions', 'Student submissions deleted');
        }

        // Then delete student
        logDatabase('students', 'DELETE', `id = ${studentId}`);
        const { error, data } = await supabase
            .from('students')
            .delete()
            .eq('id', studentId)
            .select();

        logDatabase('students', 'DELETE RESULT', { error, data, rowsDeleted: data?.length || 0 });

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            logWarning('Delete Student', 'No rows deleted - student may not exist or RLS policy blocking delete');
            alert('Failed to delete student. The student may not exist, or you may not have permission. Check the debug console for details.');
            return;
        }

        logSuccess('Delete Student', `${studentName} deleted from database`);

        // Reload all data
        logOperation('Reload Data', 'Refreshing all data from database...');
        await loadAllData();
        logSuccess('Reload Data', 'All data reloaded successfully');

        // Refresh the students table
        logOperation('Refresh UI', 'Updating students table...');
        filterStudents();
        logSuccess('Refresh UI', 'Students table updated');

        logSuccess('DELETE COMPLETE', `${studentName} has been permanently deleted`);
        alert(`Student "${studentName}" deleted successfully!`);

    } catch (error) {
        logError('Delete Student Failed', error.message);
        logDatabase('Error Details', 'FULL ERROR', {
            message: error.message,
            code: error.code,
            hint: error.hint,
            details: error.details
        });

        let errorMessage = 'Failed to delete student: ' + error.message;

        if (error.message.includes('row-level security')) {
            errorMessage += '\n\n🔒 This is a database permission error. You need to update the RLS policies in Supabase. See FIX-RLS-POLICIES.sql';
            logError('RLS Policy Error', 'Run FIX-RLS-POLICIES.sql in Supabase to fix this');
        }

        alert(errorMessage);
    }
}

// ==========================================
// WEEKLY CETELE PAGE - FIXED
// ==========================================

async function loadCeteleData() {
    console.log('Loading cetele data...');
    console.log('Current user:', currentUser);
    console.log('All students:', allStudents.length);
    console.log('All activities:', allActivities.length);
    console.log('All submissions:', allSubmissions.length);

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

    const weekDisplay = document.getElementById('ceteleWeekDisplay');
    if (weekDisplay) {
        weekDisplay.textContent = weekStart.toLocaleDateString() + ' - ' + weekEnd.toLocaleDateString();
    }

    // Filter submissions for this week
    const filterGroup = filterSelect?.value;
    let studentsToShow = allStudents;
    if (filterGroup) {
        studentsToShow = allStudents.filter(s => s.group_id === filterGroup);
    }

    console.log('Students to show:', studentsToShow.length);
    console.log('Week start:', weekStart);

    const weekSubmissions = allSubmissions.filter(sub => {
        const subWeekStart = new Date(sub.week_start_date);
        const match = subWeekStart.getTime() === weekStart.getTime();
        if (match) {
            console.log('Found matching submission for week:', sub);
        }
        return match;
    });

    console.log('Week submissions found:', weekSubmissions.length);

    // Build table
    const container = document.getElementById('ceteleTableContainer');
    if (!container) {
        console.error('Container not found!');
        return;
    }

    if (allActivities.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚙️</div><div class="empty-title">No activities configured</div><div class="empty-text">Please add activities first</div></div>';
        return;
    }

    if (studentsToShow.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No students in this group</div><div class="empty-text">Add students to see their cetele here</div></div>';
        return;
    }

    const canEdit = hasPermission('edit_own_cetele');

    container.innerHTML = `
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th style="min-width: 150px;">Student</th>
                        ${allActivities.map(a => `<th style="text-align: center; min-width: 100px;">${a.name}</th>`).join('')}
                        <th style="text-align: center; min-width: 100px;">Total</th>
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
                                <td><strong>${student.name}</strong></td>
                                ${allActivities.map(activity => {
                                    const isCompleted = completions[activity.name] === true;
                                    return `
                                        <td style="text-align: center;">
                                            <span style="font-size: 1.5rem;">${isCompleted ? '✅' : '❌'}</span>
                                        </td>
                                    `;
                                }).join('')}
                                <td style="text-align: center;">
                                    <span class="badge ${percentage >= 80 ? 'badge-green' : percentage >= 50 ? 'badge-blue' : 'badge-red'}">
                                        ${completed}/${total} (${percentage}%)
                                    </span>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        ${weekSubmissions.length === 0 ? `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                No submissions for this week yet. Students can submit their cetele through the student portal.
            </div>
        ` : ''}
    `;
}

function changeCeteleWeek(offset) {
    currentWeekOffset += offset;
    loadCeteleData();
}

// ==========================================
// MENTOR CODE PAGE - FIXED
// ==========================================

async function loadMentorCode() {
    logOperation('Load Mentor Codes', 'Starting...');
    const container = document.getElementById('mentorCodeContainer');
    const subtitle = document.getElementById('mentorCodeSubtitle');

    if (!container) return;

    try {
        container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        // Check user role
        const isED = currentUser.role === 'ed';
        const isCoordinator = currentUser.role === 'coordinator' || currentUser.is_coordinator;
        const isMentor = currentUser.role === 'mentor' || currentUser.is_mentor;

        logOperation('User Role Check', { isED, isCoordinator, isMentor });

        // ED and Coordinators see ALL mentor codes
        if (isED || isCoordinator) {
            subtitle.textContent = 'View all mentor codes in your organization.';

            const { data: mentorCodes, error } = await supabase
                .from('mentor_codes')
                .select(`
                    *,
                    users!mentor_codes_mentor_id_fkey (username, email),
                    groups (name, grade)
                `)
                .eq('is_active', true)
                .order('code');

            if (error) throw error;

            logSuccess('Load Mentor Codes', `Loaded ${mentorCodes?.length || 0} codes`);

            if (!mentorCodes || mentorCodes.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔑</div><div class="empty-title">No mentor codes</div><div class="empty-text">No active mentor codes found</div></div>';
                return;
            }

            // Get student counts for each group
            const { data: allStudents } = await supabase
                .from('students')
                .select('id, group_id');

            const studentCounts = {};
            if (allStudents) {
                allStudents.forEach(s => {
                    studentCounts[s.group_id] = (studentCounts[s.group_id] || 0) + 1;
                });
            }

            // Render all codes as cards
            container.innerHTML = `
                <div class="stats-grid">
                    ${mentorCodes.map(mc => {
                        const mentorName = mc.users?.username || mc.users?.email || 'Unknown';
                        const groupName = mc.groups?.name || 'Unknown Group';
                        const studentCount = studentCounts[mc.group_id] || 0;

                        return `
                            <div class="stat-card" style="position: relative;">
                                <div style="font-size: 3rem; margin-bottom: 1rem; filter: drop-shadow(0 0 20px rgba(139, 92, 246, 0.4));">🔑</div>
                                <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">Mentor: ${mentorName}</div>
                                <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Group: ${groupName}</div>
                                <div style="font-size: 1.8rem; font-weight: 700; letter-spacing: 0.1em; margin-bottom: 1.5rem; color: var(--accent-purple);">${mc.code}</div>
                                <button class="btn btn-primary" onclick="copyToClipboard('${mc.code}', this)" style="width: 100%;">
                                    <span>📋</span>
                                    <span>Copy Code</span>
                                </button>
                                <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--glass-border);">
                                    <div style="font-size: 0.85rem; color: var(--text-muted);">Students: <strong style="color: var(--text-primary);">${studentCount}</strong></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        // Mentors see only their own code
        else if (isMentor) {
            subtitle.textContent = 'Share this code with students to join your group.';

            const { data: mentorCodes, error } = await supabase
                .from('mentor_codes')
                .select(`
                    *,
                    groups (name, grade)
                `)
                .eq('mentor_id', currentUser.id)
                .eq('is_active', true);

            if (error) throw error;

            if (!mentorCodes || mentorCodes.length === 0) {
                container.innerHTML = `
                    <div class="card" style="text-align: center; padding: 3rem;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">🔑</div>
                        <div style="font-size: 1.5rem; color: var(--text-muted);">No code assigned</div>
                        <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; font-size: 0.9rem; color: var(--text-secondary);">
                            <strong>Note:</strong> A mentor code will be automatically generated when you are assigned as a mentor. Please contact your coordinator.
                        </div>
                    </div>
                `;
                return;
            }

            const code = mentorCodes[0];
            const groupName = code.groups?.name || 'Unknown Group';

            // Get student count
            const { data: students } = await supabase
                .from('students')
                .select('id')
                .eq('group_id', code.group_id);

            const studentCount = students?.length || 0;

            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 3rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem; filter: drop-shadow(0 0 20px rgba(139, 92, 246, 0.4));">🔑</div>
                    <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.5rem;">Your Group: ${groupName}</div>
                    <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">Your Mentor Code</div>
                    <div style="font-size: 2.5rem; font-weight: 700; letter-spacing: 0.1em; margin-bottom: 2rem; color: var(--accent-purple);">${code.code}</div>
                    <button class="btn btn-primary" onclick="copyToClipboard('${code.code}', this)">
                        <span>📋</span>
                        <span>Copy to Clipboard</span>
                    </button>
                    <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--glass-border);">
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">Students enrolled with this code:</div>
                        <div style="font-size: 2rem; font-weight: 700;">${studentCount}</div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Access Denied</div><div class="empty-text">You do not have permission to view mentor codes</div></div>';
        }

        logSuccess('Load Mentor Codes', 'Rendered successfully');
    } catch (error) {
        logError('Load Mentor Codes', error.message);
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error loading mentor codes</div><div class="empty-text">' + error.message + '</div></div>';
    }
}

function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = '<span>✅</span><span>Copied!</span>';
        button.style.background = 'var(--success-color)';

        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '';
        }, 2000);

        logSuccess('Copy to Clipboard', text);
    }).catch(err => {
        logError('Copy to Clipboard', err.message);
    });
}

function copyMentorCode() {
    const code = document.getElementById('mentorCodeDisplay').textContent;
    if (code && code !== 'Loading...' && code !== 'No code assigned' && code !== 'Not a mentor' && !code.includes('Error')) {
        navigator.clipboard.writeText(code).then(() => {
            alert('Mentor code copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy code. Please copy manually: ' + code);
        });
    } else {
        alert('No valid code to copy');
    }
}

// ==========================================
// ACTIVITIES SUMMARY PAGE
// ==========================================

async function loadActivitiesSummary() {
    logOperation('Load Activities Summary', 'Starting...');

    const timeFilter = document.getElementById('activitiesTimeFilter')?.value || 'all';
    const groupFilter = document.getElementById('activitiesGroupFilter')?.value || '';

    // Populate group filter dropdown
    const groupFilterEl = document.getElementById('activitiesGroupFilter');
    if (groupFilterEl) {
        groupFilterEl.innerHTML = '<option value="">All Groups</option>' +
            allGroups.map(g => `<option value="${g.id}" ${g.id === groupFilter ? 'selected' : ''}>${g.name}</option>`).join('');
    }

    // Filter submissions based on time
    let filteredSubmissions = [...allSubmissions];

    if (timeFilter !== 'all') {
        const now = new Date();
        let cutoffDate;

        if (timeFilter === 'this-week') {
            cutoffDate = getWeekStart(now);
        } else if (timeFilter === 'this-month') {
            cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (timeFilter === 'last-30-days') {
            cutoffDate = new Date(now);
            cutoffDate.setDate(cutoffDate.getDate() - 30);
        }

        if (cutoffDate) {
            filteredSubmissions = filteredSubmissions.filter(sub => {
                const subDate = new Date(sub.week_start_date);
                return subDate >= cutoffDate;
            });
        }
    }

    logOperation('Filtered Submissions', `${filteredSubmissions.length} submissions in time range`);

    // Calculate activity totals per group
    const groupActivityTotals = {};

    allGroups.forEach(group => {
        const groupStudents = allStudents.filter(s => s.group_id === group.id);
        const groupSubmissions = filteredSubmissions.filter(sub =>
            groupStudents.some(student => student.id === sub.student_id)
        );

        const activityCounts = {};
        let totalCompleted = 0;

        allActivities.forEach(activity => {
            activityCounts[activity.name] = 0;
        });

        groupSubmissions.forEach(sub => {
            const completions = sub.activity_completions || {};
            Object.entries(completions).forEach(([activityId, completed]) => {
                if (completed) {
                    const activity = allActivities.find(a => a.id === activityId);
                    if (activity) {
                        activityCounts[activity.name] = (activityCounts[activity.name] || 0) + 1;
                        totalCompleted++;
                    }
                }
            });
        });

        groupActivityTotals[group.id] = {
            group,
            activityCounts,
            totalCompleted,
            studentCount: groupStudents.length,
            submissionCount: groupSubmissions.length
        };
    });

    // Render group summaries
    renderGroupActivitySummaries(groupActivityTotals);

    // Calculate overall stats
    calculateActivityStats(filteredSubmissions, groupActivityTotals);

    // Render student details
    renderStudentActivityDetails(filteredSubmissions, groupFilter);

    logSuccess('Activities Summary Loaded', 'All data rendered');
}

function renderGroupActivitySummaries(groupActivityTotals) {
    const container = document.getElementById('groupActivitiesSummary');
    if (!container) return;

    const groups = Object.values(groupActivityTotals);

    if (groups.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">No groups found</div></div>';
        return;
    }

    container.innerHTML = groups.map(({ group, activityCounts, totalCompleted, studentCount, submissionCount }) => {
        const topActivities = Object.entries(activityCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .filter(([name, count]) => count > 0);

        return `
            <div style="padding: 1.5rem; border-bottom: 1px solid var(--glass-border);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;">
                            👥 ${group.name}
                        </h3>
                        <div style="display: flex; gap: 1.5rem; font-size: 0.85rem; color: var(--text-muted);">
                            <span>${studentCount} students</span>
                            <span>${submissionCount} submissions</span>
                            <span><strong>${totalCompleted}</strong> total activities completed</span>
                        </div>
                    </div>
                </div>

                ${topActivities.length > 0 ? `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
                        ${topActivities.map(([activityName, count]) => `
                            <div style="background: rgba(139, 92, 246, 0.1); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.2);">
                                <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">${activityName}</div>
                                <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent-purple);">${count}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.9rem;">
                        No activities completed yet
                    </div>
                `}
            </div>
        `;
    }).join('');
}

function calculateActivityStats(filteredSubmissions, groupActivityTotals) {
    // Total activities completed
    let totalCompleted = 0;
    Object.values(groupActivityTotals).forEach(g => {
        totalCompleted += g.totalCompleted;
    });

    document.getElementById('totalActivitiesCompleted').textContent = totalCompleted;

    // Most active group
    const mostActive = Object.values(groupActivityTotals)
        .sort((a, b) => b.totalCompleted - a.totalCompleted)[0];

    document.getElementById('mostActiveGroup').textContent =
        mostActive && mostActive.totalCompleted > 0 ? mostActive.group.name : 'N/A';

    // Average completion rate
    if (filteredSubmissions.length > 0 && allActivities.length > 0) {
        let totalPercentage = 0;
        filteredSubmissions.forEach(sub => {
            const completions = sub.activity_completions || {};
            const completed = Object.values(completions).filter(v => v === true).length;
            totalPercentage += (completed / allActivities.length) * 100;
        });
        const avgRate = Math.round(totalPercentage / filteredSubmissions.length);
        document.getElementById('avgCompletionRate').textContent = avgRate + '%';
    } else {
        document.getElementById('avgCompletionRate').textContent = '0%';
    }
}

function renderStudentActivityDetails(filteredSubmissions, groupFilter) {
    const tbody = document.getElementById('studentActivitiesBody');
    if (!tbody) return;

    let studentsToShow = [...allStudents];
    if (groupFilter) {
        studentsToShow = studentsToShow.filter(s => s.group_id === groupFilter);
    }

    if (studentsToShow.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-icon">🎓</div><div class="empty-title">No students found</div></td></tr>';
        return;
    }

    tbody.innerHTML = studentsToShow.map(student => {
        const group = allGroups.find(g => g.id === student.group_id);
        const studentSubmissions = filteredSubmissions.filter(sub => sub.student_id === student.id);

        // Calculate stats
        const totalSubmissions = studentSubmissions.length;
        let totalCompletionPercentage = 0;
        const activityCounts = {};

        studentSubmissions.forEach(sub => {
            const completions = sub.activity_completions || {};
            const completed = Object.values(completions).filter(v => v === true).length;
            if (allActivities.length > 0) {
                totalCompletionPercentage += (completed / allActivities.length) * 100;
            }

            Object.entries(completions).forEach(([activityId, completed]) => {
                if (completed) {
                    const activity = allActivities.find(a => a.id === activityId);
                    if (activity) {
                        activityCounts[activity.name] = (activityCounts[activity.name] || 0) + 1;
                    }
                }
            });
        });

        const avgCompletion = totalSubmissions > 0
            ? Math.round(totalCompletionPercentage / totalSubmissions)
            : 0;

        const topActivities = Object.entries(activityCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, count]) => `${name} (${count})`)
            .join(', ') || 'None';

        return `
            <tr>
                <td><strong>${student.name}</strong></td>
                <td>${group ? group.name : 'No Group'}</td>
                <td style="text-align: center;">${totalSubmissions}</td>
                <td style="text-align: center;">
                    <span class="badge ${avgCompletion >= 80 ? 'badge-success' : avgCompletion >= 50 ? 'badge-warning' : 'badge-danger'}">
                        ${avgCompletion}%
                    </span>
                </td>
                <td style="font-size: 0.85rem; color: var(--text-secondary);">${topActivities}</td>
            </tr>
        `;
    }).join('');
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
