// ==========================================
// CETELE ADMIN DASHBOARD - FIXED VERSION
// ==========================================

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

function showConfirmModal(title, message, onConfirm, confirmText = 'Confirm', isDanger = true) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('confirmModalOverlay');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirmModalOverlay';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-card" style="max-width: 420px;">
                <div class="modal-header">
                    <h2 id="confirmModalTitle">Confirm</h2>
                    <button class="modal-close" onclick="closeConfirmModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p id="confirmModalMessage" style="color: rgba(255,255,255,0.8); line-height: 1.6; margin: 0;"></p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeConfirmModal()">Cancel</button>
                    <button class="btn" id="confirmModalBtn">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalMessage').textContent = message;

    const confirmBtn = document.getElementById('confirmModalBtn');
    confirmBtn.textContent = confirmText;
    confirmBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';
    confirmBtn.onclick = () => {
        closeConfirmModal();
        onConfirm();
    };

    modal.classList.add('active');
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModalOverlay');
    if (modal) {
        modal.classList.remove('active');
    }
}

// ==================== LOADING OVERLAY ====================

function showLoading(message = 'Loading...') {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p id="loadingMessage">${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    } else {
        document.getElementById('loadingMessage').textContent = message;
    }
    overlay.classList.add('active');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

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
    // Check authentication - allow any admin-level role
    const session = localStorage.getItem('cetele_session');
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    const sessionData = JSON.parse(session);

    // Check if session is expired (24 hours)
    const sessionAge = Date.now() - sessionData.timestamp;
    if (sessionAge > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('cetele_session');
        localStorage.removeItem('cetele_user');
        window.location.href = 'login.html';
        return;
    }

    // Load user data
    currentUser = JSON.parse(localStorage.getItem('cetele_user'));

    console.log('Current user:', currentUser);

    if (!currentUser) {
        showToast('User data not found. Please login again.', 'error');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    updateUserInfo();

    // For mentors, fetch their group_id from mentor_codes if not already set
    if (currentUser.role === 'mentor' && !currentUser.group_id) {
        const { data: mentorCode } = await supabase
            .from('mentor_codes')
            .select('group_id')
            .eq('mentor_id', currentUser.id)
            .single();

        if (mentorCode && mentorCode.group_id) {
            currentUser.group_id = mentorCode.group_id;
            // Update localStorage with group_id
            localStorage.setItem('cetele_user', JSON.stringify(currentUser));
        }
    }

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
    showConfirmModal('Sign Out', 'Are you sure you want to sign out?', () => {
        localStorage.removeItem('cetele_session');
        localStorage.removeItem('cetele_user');
        window.location.href = 'login.html';
    }, 'Sign Out', false);
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

    // Hide tabs for mentors
    if (currentUser && currentUser.role === 'mentor' && !currentUser.is_coordinator) {
        // Hide Organization tab
        const hierarchyTab = document.querySelector('[data-page="hierarchy"]');
        if (hierarchyTab) hierarchyTab.style.display = 'none';

        // Hide Groups tab
        const groupsTab = document.querySelector('[data-page="groups"]');
        if (groupsTab) groupsTab.style.display = 'none';

        // Hide Analytics tab
        const analyticsTab = document.querySelector('[data-page="analytics"]');
        if (analyticsTab) analyticsTab.style.display = 'none';

        // Replace Activities Summary with Manage Cetele
        const activitiesTab = document.querySelector('[data-page="activities"]');
        if (activitiesTab) {
            activitiesTab.setAttribute('data-page', 'manageCetele');
            const tabText = activitiesTab.querySelector('span:last-child');
            if (tabText) tabText.textContent = 'Manage Cetele';
        }

        console.log('🔒 Mentor view: Hidden Organization, Groups, Analytics tabs; Changed Activities to Manage Cetele');
    }
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

        // Update page titles for mentors
        if (currentUser && currentUser.role === 'mentor' && !currentUser.is_coordinator) {
            const groupName = allGroups.length > 0 ? allGroups[0].name : 'Your Group';

            const pageSubtitles = {
                'overview': `Welcome back! Here's what's happening with ${groupName}.`,
                'students': `Manage students in ${groupName}.`,
                'cetele': `View and manage weekly submissions for ${groupName}.`,
                'activities': `View activity totals for ${groupName}.`,
                'mentor-code': `Your mentor code for ${groupName}.`
            };

            const subtitle = pageElement.querySelector('.page-subtitle');
            if (subtitle && pageSubtitles[pageName]) {
                subtitle.textContent = pageSubtitles[pageName];
            }
        }

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
        let activitiesQuery = supabase
            .from('activities')
            .select('*');

        // For the Manage Cetele page, mentors need to see both global (suggestions) and their group's activities
        // For all other purposes (charts, cetele display), they only see their group's activities
        // We'll load ALL activities here and filter in the Manage Cetele page specifically

        if (currentUser.role === 'mentor' && !currentUser.is_coordinator && currentUser.group_id) {
            // Load global activities + this group's activities
            activitiesQuery = activitiesQuery.or(`group_id.is.null,group_id.eq.${currentUser.group_id}`);
        } else {
            // Coordinators and ED see all activities
        }

        const { data: activities } = await activitiesQuery.order('order_index');
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
        if (allSubmissions.length > 0) {
            console.log('Sample submission:', allSubmissions[0]);
        }

    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Error loading data. Please check console for details.', 'error');
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
            case 'manageCetele':
                await loadManageCetelePage();
                break;
        }
    } catch (error) {
        console.error('Error loading page data:', error);
        showToast('Error loading page. Check console for details.', 'error');
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
    const weekStart = getWeekStart(new Date());
    const thisWeekSubmissions = allSubmissions.filter(sub => {
        const subWeekStart = getWeekStart(new Date(sub.week_start_date));
        const match = subWeekStart.getTime() === weekStart.getTime();
        return match;
    });

    console.log('This week submissions:', thisWeekSubmissions.length);
    if (allSubmissions.length > 0) {
        const today = new Date();
        console.log('Today:', today.toLocaleDateString(), 'Week start:', weekStart.toLocaleDateString());
        console.log('Sample submission date:', allSubmissions[0].week_start_date);
        const sampleSubWeek = getWeekStart(new Date(allSubmissions[0].week_start_date));
        console.log('Sample submission week start:', sampleSubWeek.toLocaleDateString());
        console.log('Week starts match?', sampleSubWeek.getTime() === weekStart.getTime());
    }

    if (thisWeekSubmissions.length > 0 && allActivities.length > 0) {
        const totalPossible = thisWeekSubmissions.length * allActivities.length;
        let totalCompleted = 0;
        thisWeekSubmissions.forEach(sub => {
            const completions = sub.activity_completions || {};
            // Count both boolean true and numeric values > 0
            totalCompleted += Object.values(completions).filter(v => v === true || (typeof v === 'number' && v > 0)).length;
        });
        const completionRate = Math.round((totalCompleted / totalPossible) * 100);
        console.log('This week completion:', totalCompleted, '/', totalPossible, '=', completionRate + '%');
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
    loadTopGroupChart();
    loadBottomGroupChart();
    loadTopStudentsChart();

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
        // Count both boolean true AND numeric values > 0, but cap at total activities
        const completed = Object.values(completions).filter(v => v === true || (typeof v === 'number' && v > 0)).length;
        // Cap individual score at 100%
        const score = Math.min(100, (completed / allActivities.length) * 100);
        totalScore += score;
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
        // Count both boolean true AND numeric values > 0
        const completed = Object.values(completions).filter(v => v === true || (typeof v === 'number' && v > 0)).length;
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

    logOperation('Trends Chart', `Total submissions: ${allSubmissions.length}`);

    // DEBUG: Log all submission dates
    if (allSubmissions.length > 0) {
        const uniqueDates = [...new Set(allSubmissions.map(s => s.week_start_date))];
        logOperation('📅 Trends Chart - Submission Dates', uniqueDates);
    }

    // Get last 8 weeks of data
    const weeks = [];
    const completionRates = [];

    for (let i = 7; i >= 0; i--) {
        const weekStart = getWeekStart(new Date());
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const checkDate = weekStart.toISOString().split('T')[0];
        weeks.push(weekLabel);

        const weekSubmissions = allSubmissions.filter(sub => {
            const subWeekStart = new Date(sub.week_start_date);
            const subDate = subWeekStart.toISOString().split('T')[0];
            return subDate === checkDate;
        });

        logOperation(`Trends ${weekLabel}`, `${checkDate} -> ${weekSubmissions.length} submissions`);

        if (weekSubmissions.length > 0 && allActivities.length > 0) {
            const totalPossible = weekSubmissions.length * allActivities.length;
            let totalCompleted = 0;
            weekSubmissions.forEach(sub => {
                const completions = sub.activity_completions || {};
                // Count both boolean true AND numeric values > 0, but cap at total activities
                const completed = Object.values(completions).filter(v => v === true || (typeof v === 'number' && v > 0)).length;
                totalCompleted += Math.min(completed, allActivities.length);
            });
            const rate = Math.min(100, Math.round((totalCompleted / totalPossible) * 100));
            completionRates.push(rate);
            logSuccess(`Trends ${weekLabel}`, `Rate: ${rate}%`);
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
    if (!canvas || allActivities.length === 0 || allSubmissions.length === 0) {
        console.log('🔄 Activity Chart - Missing data:', {
            canvas: !!canvas,
            activities: allActivities.length,
            submissions: allSubmissions.length
        });
        return;
    }

    // Destroy existing chart
    if (canvas.chart) {
        canvas.chart.destroy();
    }

    console.log('🔄 Activity Breakdown Chart - Processing', allActivities.length, 'activities');

    // Calculate completion rate for each activity
    const activityNames = allActivities.map(a => a.name);
    const activityRates = allActivities.map(activity => {
        let completed = 0;

        allSubmissions.forEach(sub => {
            const completions = sub.activity_completions || {};
            // Try both ID and name as key
            const value = completions[activity.id] !== undefined ? completions[activity.id] : completions[activity.name];
            // Check if completed (could be true for checkbox or > 0 for number input)
            if (value === true || (typeof value === 'number' && value > 0)) {
                completed++;
            }
        });

        // Total possible is number of submissions (each submission should have this activity)
        const total = allSubmissions.length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        console.log(`  Activity "${activity.name}" (ID: ${activity.id}): ${completed}/${total} = ${rate}%`);
        return rate;
    });

    console.log('✅ Activity Chart Data:', activityNames, activityRates);

    // Color-code each activity based on completion rate
    const backgroundColors = getPerformanceColors(activityRates, 0.7);
    const borderColors = getPerformanceColors(activityRates, 1);

    canvas.chart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: activityNames,
            datasets: [{
                label: 'Completion %',
                data: activityRates,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 2
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
    logOperation('Load Analytics', `Submissions: ${allSubmissions.length}, Activities: ${allActivities.length}, Students: ${allStudents.length}`);
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

    // DEBUG: Log all submission dates
    if (allSubmissions.length > 0) {
        const uniqueDates = [...new Set(allSubmissions.map(s => s.week_start_date))];
        logOperation('📅 Submission Dates in DB', uniqueDates);
    }

    // Similar to trends chart
    const weeks = [];
    const completionRates = [];

    for (let i = 11; i >= 0; i--) {
        const weekStart = getWeekStart(new Date());
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const checkDate = weekStart.toISOString().split('T')[0];
        weeks.push(weekLabel);

        const weekSubmissions = allSubmissions.filter(sub => {
            const subWeekStart = new Date(sub.week_start_date);
            const subDate = subWeekStart.toISOString().split('T')[0];
            return subDate === checkDate;
        });

        logOperation(`Week ${weekLabel}`, `Checking ${checkDate}, Found ${weekSubmissions.length} submissions`);

        if (weekSubmissions.length > 0 && allActivities.length > 0) {
            const totalPossible = weekSubmissions.length * allActivities.length;
            let totalCompleted = 0;
            weekSubmissions.forEach(sub => {
                const completions = sub.activity_completions || {};
                // Count both boolean true AND numeric values > 0, but cap at total activities
                const completed = Object.values(completions).filter(v => v === true || (typeof v === 'number' && v > 0)).length;
                totalCompleted += Math.min(completed, allActivities.length);
            });
            const rate = Math.min(100, Math.round((totalCompleted / totalPossible) * 100));
            completionRates.push(rate);
            logSuccess(`Week ${weekLabel}`, `Completion rate: ${rate}%`);
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
    if (!canvas || allGroups.length === 0) {
        logError('Group Comparison Chart', 'Canvas or groups not found');
        return;
    }

    // Destroy existing chart
    if (canvas.chart) {
        canvas.chart.destroy();
    }

    logOperation('Group Comparison Chart', `Processing ${allGroups.length} groups`);

    const groupNames = allGroups.map(g => g.name);
    const groupScores = allGroups.map(group => {
        const groupStudents = allStudents.filter(s => s.group_id === group.id);
        if (groupStudents.length === 0) {
            logOperation(`Group ${group.name}`, 'No students');
            return 0;
        }

        let totalScore = 0;
        let submissionCount = 0;

        groupStudents.forEach(student => {
            const studentSubmissions = allSubmissions.filter(s => s.student_id === student.id);
            studentSubmissions.forEach(sub => {
                const completions = sub.activity_completions || {};
                const completed = Object.values(completions).filter(v => v === true || (typeof v === 'number' && v > 0)).length;
                if (allActivities.length > 0) {
                    totalScore += (completed / allActivities.length) * 100;
                    submissionCount++;
                }
            });
        });

        return submissionCount > 0 ? Math.round(totalScore / submissionCount) : 0;
    });

    // Get color-coded backgrounds based on performance
    const backgroundColors = getPerformanceColors(groupScores, 0.7);
    const borderColors = getPerformanceColors(groupScores, 1);

    canvas.chart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: groupNames,
            datasets: [{
                label: 'Avg Score',
                data: groupScores,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const score = context.parsed.y;
                            let rating = '';
                            if (score >= 80) rating = ' (Excellent)';
                            else if (score >= 70) rating = ' (Good)';
                            else if (score >= 60) rating = ' (Average)';
                            else if (score >= 50) rating = ' (Below Average)';
                            else rating = ' (Needs Improvement)';
                            return 'Avg Score: ' + score + '%' + rating;
                        }
                    }
                }
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
            const completed = Object.values(completions).filter(v => v === true || (typeof v === 'number' && v > 0)).length;
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

        // DEBUG: Check what mentors look like
        if (mentors.length > 0) {
            logOperation('MENTORS FOUND', mentors.map(m => m.username || m.email));
        } else {
            logError('NO MENTORS FOUND', 'Filtering returned 0 mentors!');
        }

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
            logOperation('🚨 MENTOR SECTION RENDERING', 'About to render mentor section');

            // Sort mentors: those with students first, then by student count descending
            const sortedMentors = [...mentors].sort((a, b) => {
                const aGroupInfo = mentorGroupMap[a.id];
                const bGroupInfo = mentorGroupMap[b.id];
                const aStudents = aGroupInfo ? groupStudentsMap[aGroupInfo.groupId] || [] : [];
                const bStudents = bGroupInfo ? groupStudentsMap[bGroupInfo.groupId] || [] : [];

                // Sort by student count descending
                return bStudents.length - aStudents.length;
            });

            const mentorNodes = sortedMentors.map(mentor => {
                const groupInfo = mentorGroupMap[mentor.id];
                const groupStudents = groupInfo ? groupStudentsMap[groupInfo.groupId] || [] : [];
                logOperation('Mentor Node', { mentor: mentor.email, groupInfo, studentCount: groupStudents.length });
                const nodeHtml = renderFamilyTreeNode(mentor, 'mentor', groupInfo, groupStudents);
                logOperation('Node HTML Length', nodeHtml.length);

                // DEBUG: Log first 200 chars of HTML
                if (nodeHtml.length > 0) {
                    logOperation('Node HTML Preview', nodeHtml.substring(0, 200));
                }

                return nodeHtml;
            });

            const joinedNodes = mentorNodes.join('');
            logOperation('All Mentor Nodes HTML Length', joinedNodes.length);
            logOperation('🚨 JOINED NODES PREVIEW', joinedNodes.substring(0, 500));

            const mentorSectionHtml = `
                <div class="tree-level">
                    <div class="tree-level-label">👨‍🏫 Mentors & Their Students</div>
                    <div class="tree-nodes-row">
                        ${joinedNodes}
                    </div>
                </div>
            `;

            logOperation('🚨 MENTOR SECTION HTML LENGTH', mentorSectionHtml.length);
            html += mentorSectionHtml;
            logOperation('🚨 MENTOR SECTION ADDED', 'Mentor section added to HTML');
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

            // Check container width
            const treeNodesRow = container.querySelector('.tree-nodes-row');
            if (treeNodesRow) {
                const rowStyles = window.getComputedStyle(treeNodesRow);
                logOperation('🔍 TREE NODES ROW', {
                    width: treeNodesRow.offsetWidth + 'px',
                    maxWidth: rowStyles.maxWidth,
                    gap: rowStyles.gap,
                    flexWrap: rowStyles.flexWrap
                });
            }

            mentorCards.forEach((card, i) => {
                const isVisible = card.offsetParent !== null;
                const styles = window.getComputedStyle(card);
                const rect = card.getBoundingClientRect();
                logOperation(`Card ${i + 1} Details`, {
                    visible: isVisible,
                    width: styles.width,
                    actualWidth: rect.width + 'px',
                    minWidth: styles.minWidth,
                    maxWidth: styles.maxWidth,
                    flexShrink: styles.flexShrink,
                    position: `left: ${Math.round(rect.left)}px, top: ${Math.round(rect.top)}px`
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
    showToast('Create group modal coming soon! For now, use Supabase dashboard to create groups.', 'info');
}

async function deleteGroup(groupId) {
    console.log('=== DELETE GROUP ===');
    console.log('Group ID:', groupId);
    console.log('Current user:', currentUser);

    // Coordinators and EDs can delete groups
    if (!hasPermission('delete_group') && currentUser.role !== 'coordinator' && currentUser.role !== 'ed' && !currentUser.is_coordinator) {
        console.log('Permission denied for deleting group');
        showToast('You do not have permission to delete groups.', 'error');
        return;
    }

    showConfirmModal('Delete Group', 'Are you sure you want to delete this group? This will remove all students from the group.', async () => {
        try {
            showLoading('Deleting group...');
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

            hideLoading();
            showToast('Group deleted successfully!', 'success');
        } catch (error) {
            hideLoading();
            console.error('Error deleting group:', error);
            console.error('Error details:', error.message, error.code, error.hint);
            showToast('Failed to delete group: ' + error.message, 'error');
        }
    }, 'Delete Group');
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
            const completed = Object.values(completions).filter(v => v === true || (typeof v === 'number' && v > 0)).length;
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
    showToast('Add student modal coming soon! For now, students can sign up using the student portal.', 'info');
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
        showToast('You do not have permission to delete students.', 'error');
        return;
    }

    logPermission('Delete Student', true);

    showConfirmModal('Delete Student', `Are you sure you want to delete ${studentName}? This will also delete all their submissions.`, async () => {
        try {
            showLoading('Deleting student...');
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
            hideLoading();
            logWarning('Delete Student', 'No rows deleted - student may not exist or RLS policy blocking delete');
            showToast('Failed to delete student. The student may not exist, or you may not have permission.', 'error');
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

        hideLoading();
        logSuccess('DELETE COMPLETE', `${studentName} has been permanently deleted`);
        showToast(`Student "${studentName}" deleted successfully!`, 'success');

        } catch (error) {
            hideLoading();
            logError('Delete Student Failed', error.message);
            logDatabase('Error Details', 'FULL ERROR', {
                message: error.message,
                code: error.code,
                hint: error.hint,
                details: error.details
            });

            let errorMessage = 'Failed to delete student: ' + error.message;

            if (error.message.includes('row-level security')) {
                errorMessage = 'Database permission error. Please check RLS policies.';
                logError('RLS Policy Error', 'Run FIX-RLS-POLICIES.sql in Supabase to fix this');
            }

            showToast(errorMessage, 'error');
        }
    }, 'Delete Student');
}

// ==========================================
// WEEKLY CETELE PAGE - FIXED
// ==========================================

async function loadCeteleData() {
    console.log('📋 Loading cetele data for week offset:', currentWeekOffset);

    // Update week display
    const weekStart = getWeekStart(new Date());
    weekStart.setDate(weekStart.getDate() + (currentWeekOffset * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekDisplay = document.getElementById('ceteleWeekDisplay');
    if (weekDisplay) {
        const weekText = weekStart.toLocaleDateString() + ' - ' + weekEnd.toLocaleDateString();

        // Add deadline status for current week
        if (currentWeekOffset === 0) {
            const deadline = getWeekDeadline(weekStart);
            const now = new Date();
            const timeUntilDeadline = deadline - now;
            const hoursUntil = Math.ceil(timeUntilDeadline / (1000 * 60 * 60));
            const daysUntil = Math.ceil(timeUntilDeadline / (1000 * 60 * 60 * 24));

            let statusText = '';
            if (timeUntilDeadline > 0) {
                // Before deadline
                if (daysUntil > 1) {
                    statusText = ` · Deadline in ${daysUntil} days (Fri 6PM)`;
                } else if (hoursUntil > 1) {
                    statusText = ` · Deadline in ${hoursUntil} hours`;
                } else {
                    statusText = ` · Deadline today at 6:00 PM`;
                }
                weekDisplay.innerHTML = `${weekText}<span style="color: rgba(251, 191, 36, 0.9); font-size: 0.9rem; margin-left: 0.5rem;">${statusText}</span>`;
            } else {
                // Past deadline
                statusText = ` · Deadline passed`;
                weekDisplay.innerHTML = `${weekText}<span style="color: rgba(239, 68, 68, 0.9); font-size: 0.9rem; margin-left: 0.5rem;">${statusText}</span>`;
            }
        } else {
            weekDisplay.textContent = weekText;
        }
    }

    // Update button states - disable Next Week if we're at current week or future
    const nextBtn = document.querySelector('button[onclick="changeCeteleWeek(1)"]');
    if (nextBtn) {
        if (currentWeekOffset >= 0) {
            nextBtn.disabled = true;
            nextBtn.style.opacity = '0.5';
            nextBtn.style.cursor = 'not-allowed';
        } else {
            nextBtn.disabled = false;
            nextBtn.style.opacity = '1';
            nextBtn.style.cursor = 'pointer';
        }
    }

    // Debug week matching
    console.log('Looking for week:', weekStart.toISOString().split('T')[0]);
    console.log('All submission dates:', [...new Set(allSubmissions.map(s => s.week_start_date))]);

    const weekSubmissions = allSubmissions.filter(sub => {
        const subWeekStart = getWeekStart(new Date(sub.week_start_date));
        const match = subWeekStart.getTime() === weekStart.getTime();
        if (allSubmissions.indexOf(sub) < 3) { // Debug first 3
            console.log('Checking submission:', {
                date: sub.week_start_date,
                normalized: subWeekStart.toISOString().split('T')[0],
                target: weekStart.toISOString().split('T')[0],
                match: match
            });
        }
        return match;
    });

    console.log(`📅 Week ${weekStart.toLocaleDateString()}: ${weekSubmissions.length} submissions`);

    // Debug first submission structure
    if (weekSubmissions.length > 0) {
        const sample = weekSubmissions[0];
        console.log('✅ Found submission! Structure:', {
            student_id: sample.student_id,
            week_start_date: sample.week_start_date,
            activity_completions: sample.activity_completions,
            completions_keys: Object.keys(sample.activity_completions || {})
        });
        console.log('First activity ID:', allActivities[0]?.id);
        console.log('First activity name:', allActivities[0]?.name);
    } else if (allSubmissions.length > 0) {
        console.log('❌ No submissions found for this week. Sample submission:', {
            date: allSubmissions[0].week_start_date,
            normalized: getWeekStart(new Date(allSubmissions[0].week_start_date)).toISOString().split('T')[0]
        });
    }

    // Build table grouped by groups
    const container = document.getElementById('ceteleTableContainer');
    if (!container) {
        console.error('Container not found!');
        return;
    }

    // Get active activities (for mentors, only their group's activities, not global suggestions)
    const activeActivities = getActiveActivities();

    if (activeActivities.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚙️</div><div class="empty-title">No activities configured</div><div class="empty-text">Please add activities in "Manage Cetele"</div></div>';
        return;
    }

    if (allGroups.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">No groups found</div><div class="empty-text">Create groups first</div></div>';
        return;
    }

    const canEdit = hasPermission('edit_own_cetele');

    // Group students by group
    const groupsWithStudents = allGroups.map(group => {
        const groupStudents = allStudents.filter(s => s.group_id === group.id);
        const groupSubmissions = weekSubmissions.filter(sub => {
            const student = allStudents.find(st => st.id === sub.student_id);
            return student && student.group_id === group.id;
        });

        return {
            group: group,
            students: groupStudents,
            submissions: groupSubmissions
        };
    }).filter(g => g.students.length > 0); // Only show groups with students

    // Render groups
    container.innerHTML = groupsWithStudents.map((groupData, groupIndex) => {
        const { group, students, submissions } = groupData;

        // Calculate group completion stats
        let totalCompleted = 0;
        let totalPossible = students.length * activeActivities.length;

        students.forEach(student => {
            const submission = submissions.find(s => s.student_id === student.id);
            if (submission) {
                const completions = submission.activity_completions || {};
                totalCompleted += Object.values(completions).filter(v => v === true || (typeof v === 'number' && v > 0)).length;
            }
        });

        const groupCompletion = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
        const submissionCount = submissions.length;

        return `
            <div class="card" style="margin-bottom: 1.5rem;">
                <div class="card-header" style="cursor: pointer;" onclick="toggleGroupCetele('group-${group.id}')">
                    <div class="card-title">
                        <span>👥</span>
                        <span>${group.name}</span>
                        <span class="badge ${groupCompletion >= 80 ? 'badge-green' : groupCompletion >= 50 ? 'badge-blue' : 'badge-red'}" style="margin-left: 1rem;">
                            ${submissionCount}/${students.length} submitted (${groupCompletion}%)
                        </span>
                    </div>
                    <span id="toggle-icon-group-${group.id}" style="font-size: 1.5rem;">▼</span>
                </div>
                <div id="group-${group.id}" class="group-cetele-content" style="display: ${groupIndex === 0 ? 'block' : 'none'};">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th style="min-width: 150px;">Student</th>
                                    ${activeActivities.map(a => `<th style="text-align: center; min-width: 100px;">${a.name}</th>`).join('')}
                                    <th style="text-align: center; min-width: 100px;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${students.map((student, studentIndex) => {
                        const submission = weekSubmissions.find(s => s.student_id === student.id);
                        const completions = submission?.activity_completions || {};

                        // Debug first student
                        if (studentIndex === 0 && submission) {
                            console.log('First student submission check:', {
                                student: student.name,
                                hasSubmission: !!submission,
                                completions: completions,
                                completionsType: typeof completions
                            });
                        }

                        // Count both boolean true and numeric values > 0
                        const completed = Object.values(completions).filter(v => v === true || (typeof v === 'number' && v > 0)).length;
                        const total = activeActivities.length;
                        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

                        return `
                            <tr>
                                <td><strong>${student.name}</strong></td>
                                ${activeActivities.map((activity, actIndex) => {
                                    // Check by ID first, then name
                                    const valueById = completions[activity.id];
                                    const valueByName = completions[activity.name];
                                    const value = valueById !== undefined ? valueById : valueByName;
                                    const isCompleted = value === true || (typeof value === 'number' && value > 0);

                                    // Debug first student, first activity
                                    if (studentIndex === 0 && actIndex === 0 && submission) {
                                        console.log('Activity check for first student:', {
                                            activity: activity.name,
                                            activityId: activity.id,
                                            valueById: valueById,
                                            valueByName: valueByName,
                                            finalValue: value,
                                            isCompleted: isCompleted
                                        });
                                    }

                                    // Determine what to display
                                    let display = '';
                                    const deadlinePassed = isDeadlinePassed(weekStart);

                                    if (submission) {
                                        // Has submission - show completed or not
                                        display = isCompleted ? '✅' : (deadlinePassed ? '❌' : '—');
                                    } else {
                                        // No submission
                                        display = deadlinePassed ? '❌' : '—';
                                    }

                                    return `
                                        <td style="text-align: center;">
                                            <span style="font-size: 1.5rem; color: ${display === '—' ? 'var(--text-muted)' : 'inherit'};">${display}</span>
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
                    ${submissions.length === 0 ? `
                        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                            No submissions for this week yet from ${group.name}.
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Add message if no groups have students
    if (groupsWithStudents.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No students in any group</div><div class="empty-text">Add students to groups to see their cetele here</div></div>';
    }
}

function toggleGroupCetele(groupId) {
    const content = document.getElementById(groupId);
    const icon = document.getElementById(`toggle-icon-${groupId}`);

    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▼';
    } else {
        content.style.display = 'none';
        icon.textContent = '▶';
    }
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
                <div style="max-width: 600px; margin: 2rem auto;">
                    <div class="mentor-code-card">
                        <div class="mentor-code-header">
                            <div class="mentor-code-icon">🔑</div>
                            <h3 class="mentor-code-title">Your Mentor Code</h3>
                            <p class="mentor-code-group">Group: ${groupName}</p>
                        </div>

                        <div class="mentor-code-display">
                            <div class="mentor-code-value">${code.code}</div>
                        </div>

                        <button class="btn btn-primary" onclick="copyToClipboard('${code.code}', this)" style="width: 100%; padding: 1rem; font-size: 1rem;">
                            <span>📋</span>
                            <span>Copy to Clipboard</span>
                        </button>

                        <div class="mentor-code-stats">
                            <div class="mentor-code-stat-label">Students enrolled with this code</div>
                            <div class="mentor-code-stat-value">${studentCount}</div>
                        </div>

                        <div class="mentor-code-info">
                            <strong>💡 How to use:</strong> Share this code with students so they can join your group.
                            They'll enter it during signup at the student portal.
                        </div>
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
            showToast('Mentor code copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Failed to copy:', err);
            showToast('Failed to copy code. Please copy manually: ' + code, 'error');
        });
    } else {
        showToast('No valid code to copy', 'error');
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
            const completed = Object.values(completions).filter(v => v === true || (typeof v === 'number' && v > 0)).length;
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
            const completed = Object.values(completions).filter(v => v === true || (typeof v === 'number' && v > 0)).length;
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
// PERFORMANCE CHARTS
// ==========================================

function loadTopGroupChart() {
    const canvas = document.getElementById('topGroupChart');
    if (!canvas || allGroups.length === 0 || allSubmissions.length === 0) {
        console.log('🔄 Top Group Chart - Missing data:', {
            canvas: !!canvas,
            groups: allGroups.length,
            submissions: allSubmissions.length
        });
        return;
    }

    // Destroy existing chart
    if (canvas.chart) {
        canvas.chart.destroy();
    }

    // Get time filter
    const timeFilter = document.getElementById('topGroupTimeFilter')?.value || 'all';

    // Filter submissions by time period
    let filteredSubmissions = allSubmissions;
    if (timeFilter === 'week') {
        const weekStart = getWeekStart(new Date());
        filteredSubmissions = allSubmissions.filter(sub => {
            const subWeekStart = getWeekStart(new Date(sub.week_start_date));
            return subWeekStart.getTime() === weekStart.getTime();
        });
        console.log('Week filter - Current week start:', weekStart.toLocaleDateString());
        if (filteredSubmissions.length > 0) {
            console.log('First matching submission week:', getWeekStart(new Date(filteredSubmissions[0].week_start_date)).toLocaleDateString());
        }
    } else if (timeFilter === 'month') {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        filteredSubmissions = allSubmissions.filter(sub => {
            const subDate = new Date(sub.week_start_date);
            return subDate >= monthStart;
        });
    }

    console.log(`🔄 Top Group Chart (${timeFilter}): ${filteredSubmissions.length} submissions`);

    if (filteredSubmissions.length === 0) {
        console.log('⚠️ No submissions for selected time period');
        // Show empty state message in chart
        const container = canvas.parentElement;
        let emptyMsg = container.querySelector('.empty-state-msg');
        if (!emptyMsg) {
            emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-state-msg';
            emptyMsg.style.cssText = 'text-align: center; padding: 3rem 1rem; color: rgba(248, 250, 252, 0.5);';
            container.appendChild(emptyMsg);
        }
        emptyMsg.textContent = timeFilter === 'week' ? 'No submissions this week yet' : timeFilter === 'month' ? 'No submissions this month yet' : 'No data available';
        return;
    } else {
        // Remove empty state message if it exists
        const container = canvas.parentElement;
        const emptyMsg = container.querySelector('.empty-state-msg');
        if (emptyMsg) emptyMsg.remove();
    }

    // Calculate average completion rate per group
    const groupStats = allGroups.map(group => {
        // Get submissions by matching student's group through the joined data
        const groupSubmissions = filteredSubmissions.filter(s => {
            // Check if submission has student data with group
            return s.students?.groups?.name === group.name;
        });
        console.log(`  "${group.name}" (ID: ${group.id}): ${groupSubmissions.length} submissions found`);
        if (groupSubmissions.length === 0) return { name: group.name, rate: 0 };

        let totalCompletion = 0;
        groupSubmissions.forEach((sub, idx) => {
            const completions = sub.activity_completions || {};
            // Count completed activities (checking both by ID and name, both true and number > 0)
            const completed = Object.keys(completions).filter(key => {
                const value = completions[key];
                return value === true || (typeof value === 'number' && value > 0);
            }).length;
            // Cap at 100% - don't exceed total activities
            const rate = allActivities.length > 0 ? Math.min(100, (completed / allActivities.length) * 100) : 0;

            // Debug first submission of each group
            if (idx === 0) {
                console.log(`    Sample submission for "${group.name}":`, {
                    completions: completions,
                    completedCount: completed,
                    totalActivities: allActivities.length,
                    rate: rate
                });
            }

            totalCompletion += rate;
        });

        const avgRate = Math.round(totalCompletion / groupSubmissions.length);
        console.log(`  Group "${group.name}": ${groupSubmissions.length} submissions, total=${totalCompletion}, avg=${avgRate}%`);

        return {
            name: group.name,
            rate: avgRate
        };
    });

    // Sort and get top group
    groupStats.sort((a, b) => b.rate - a.rate);
    const topGroup = groupStats[0];
    console.log('✅ Top Group:', topGroup.name, topGroup.rate + '%');

    canvas.chart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Remaining'],
            datasets: [{
                data: [topGroup.rate, 100 - topGroup.rate],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(100, 116, 139, 0.3)'
                ],
                borderColor: [
                    'rgb(34, 197, 94)',
                    'rgb(100, 116, 139)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            }
        }
    });

    // Add group name as text overlay
    const container = canvas.parentElement;
    let groupLabel = container.querySelector('.chart-center-label');
    if (!groupLabel) {
        groupLabel = document.createElement('div');
        groupLabel.className = 'chart-center-label';
        groupLabel.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none;';
        container.style.position = 'relative';
        container.appendChild(groupLabel);
    }
    groupLabel.innerHTML = `<div style="font-size: 1.5rem; font-weight: 700; color: rgba(34, 197, 94, 1);">${topGroup.rate}%</div><div style="font-size: 0.9rem; color: rgba(248, 250, 252, 0.7); margin-top: 0.25rem;">${topGroup.name}</div>`;
}

function loadBottomGroupChart() {
    const canvas = document.getElementById('bottomGroupChart');
    if (!canvas || allGroups.length === 0 || allSubmissions.length === 0) return;

    // Destroy existing chart
    if (canvas.chart) {
        canvas.chart.destroy();
    }

    // Get time filter
    const timeFilter = document.getElementById('bottomGroupTimeFilter')?.value || 'all';

    // Filter submissions by time period
    let filteredSubmissions = allSubmissions;
    if (timeFilter === 'week') {
        const weekStart = getWeekStart(new Date());
        filteredSubmissions = allSubmissions.filter(sub => {
            const subWeekStart = getWeekStart(new Date(sub.week_start_date));
            return subWeekStart.getTime() === weekStart.getTime();
        });
    } else if (timeFilter === 'month') {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        filteredSubmissions = allSubmissions.filter(sub => {
            const subDate = new Date(sub.week_start_date);
            return subDate >= monthStart;
        });
    }

    if (filteredSubmissions.length === 0) {
        console.log('⚠️ Bottom Group Chart - No submissions for selected time period');
        // Show empty state message in chart
        const container = canvas.parentElement;
        let emptyMsg = container.querySelector('.empty-state-msg');
        if (!emptyMsg) {
            emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-state-msg';
            emptyMsg.style.cssText = 'text-align: center; padding: 3rem 1rem; color: rgba(248, 250, 252, 0.5);';
            container.appendChild(emptyMsg);
        }
        emptyMsg.textContent = timeFilter === 'week' ? 'No submissions this week yet' : timeFilter === 'month' ? 'No submissions this month yet' : 'No data available';
        return;
    } else {
        // Remove empty state message if it exists
        const container = canvas.parentElement;
        const emptyMsg = container.querySelector('.empty-state-msg');
        if (emptyMsg) emptyMsg.remove();
    }

    // Calculate average completion rate per group
    const groupStats = allGroups.map(group => {
        // Get submissions by matching student's group through the joined data
        const groupSubmissions = filteredSubmissions.filter(s => {
            return s.students?.groups?.name === group.name;
        });
        if (groupSubmissions.length === 0) return { name: group.name, rate: 0 };

        let totalCompletion = 0;
        groupSubmissions.forEach(sub => {
            const completions = sub.activity_completions || {};
            // Count completed activities (checking both by ID and name, both true and number > 0)
            const completed = Object.keys(completions).filter(key => {
                const value = completions[key];
                return value === true || (typeof value === 'number' && value > 0);
            }).length;
            totalCompletion += allActivities.length > 0 ? (completed / allActivities.length) * 100 : 0;
        });

        return {
            name: group.name,
            rate: Math.round(totalCompletion / groupSubmissions.length)
        };
    });

    // Sort and get bottom group
    groupStats.sort((a, b) => a.rate - b.rate);
    const bottomGroup = groupStats[0];

    canvas.chart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Remaining'],
            datasets: [{
                data: [bottomGroup.rate, 100 - bottomGroup.rate],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(100, 116, 139, 0.3)'
                ],
                borderColor: [
                    'rgb(239, 68, 68)',
                    'rgb(100, 116, 139)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            }
        }
    });

    // Add group name as text overlay
    const container = canvas.parentElement;
    let groupLabel = container.querySelector('.chart-center-label');
    if (!groupLabel) {
        groupLabel = document.createElement('div');
        groupLabel.className = 'chart-center-label';
        groupLabel.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none;';
        container.style.position = 'relative';
        container.appendChild(groupLabel);
    }
    groupLabel.innerHTML = `<div style="font-size: 1.5rem; font-weight: 700; color: rgba(239, 68, 68, 1);">${bottomGroup.rate}%</div><div style="font-size: 0.9rem; color: rgba(248, 250, 252, 0.7); margin-top: 0.25rem;">${bottomGroup.name}</div>`;
}

function loadTopStudentsChart() {
    const canvas = document.getElementById('topStudentsChart');
    if (!canvas || allStudents.length === 0 || allSubmissions.length === 0) return;

    // Destroy existing chart
    if (canvas.chart) {
        canvas.chart.destroy();
    }

    // Calculate average completion rate per student
    const studentStats = allStudents.map(student => {
        const studentSubmissions = allSubmissions.filter(s => s.student_id === student.id);
        if (studentSubmissions.length === 0) return { name: student.name, rate: 0, group: '' };

        let totalCompletion = 0;
        studentSubmissions.forEach(sub => {
            const completions = sub.activity_completions || {};
            // Count completed activities (checking both by ID and name, both true and number > 0)
            const completed = Object.keys(completions).filter(key => {
                const value = completions[key];
                return value === true || (typeof value === 'number' && value > 0);
            }).length;
            totalCompletion += allActivities.length > 0 ? (completed / allActivities.length) * 100 : 0;
        });

        // Get group name from student's joined data or lookup
        const groupName = student.groups?.name || allGroups.find(g => g.id === student.group_id)?.name || 'No Group';
        return {
            name: student.name,
            rate: Math.round(totalCompletion / studentSubmissions.length),
            group: groupName
        };
    });

    // Sort and get top 3
    studentStats.sort((a, b) => b.rate - a.rate);
    const top3 = studentStats.slice(0, 3);

    // Sleek medal colors with performance-based fallback
    const getMedalColor = (index, score) => {
        if (index === 0) {
            // Gold - but use performance color if score is low
            return score >= 70 ? 'rgba(251, 191, 36, 0.8)' : getPerformanceColor(score, 0.8);
        } else if (index === 1) {
            // Silver
            return score >= 70 ? 'rgba(203, 213, 225, 0.8)' : getPerformanceColor(score, 0.8);
        } else {
            // Bronze
            return score >= 70 ? 'rgba(217, 119, 6, 0.8)' : getPerformanceColor(score, 0.8);
        }
    };

    const backgroundColors = top3.map((s, i) => getMedalColor(i, s.rate));
    const borderColors = top3.map((s, i) => getMedalColor(i, s.rate).replace('0.8', '1'));

    canvas.chart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: top3.map(s => s.name),
            datasets: [{
                label: 'Completion %',
                data: top3.map(s => s.rate),
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 2
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            return 'Group: ' + top3[context.dataIndex].group;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: 'rgba(248, 250, 252, 0.5)',
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                y: {
                    ticks: { color: 'rgba(248, 250, 252, 0.7)' },
                    grid: { display: false }
                }
            }
        }
    });
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

// Get the week that is currently unlocked for submission
// Cetele unlocks every Friday at 11:59 PM for the NEXT week
function getCurrentUnlockedWeek() {
    const now = new Date();
    const today = now.getDay(); // 0 = Sunday, 5 = Friday
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Find this Friday or next Friday
    let daysUntilFriday = (5 - today + 7) % 7;
    if (daysUntilFriday === 0) daysUntilFriday = 7; // If today is Friday, next Friday

    const thisFriday = new Date(now);
    thisFriday.setDate(now.getDate() - (today - 5 >= 0 ? today - 5 : 7 - (5 - today)));
    thisFriday.setHours(23, 59, 0, 0);

    // If we're past this Friday 11:59 PM, the unlocked week is NEXT week
    // Otherwise, it's THIS week
    if (now >= thisFriday) {
        // Past Friday 11:59 PM - next week is unlocked
        const nextMonday = new Date(thisFriday);
        nextMonday.setDate(thisFriday.getDate() + 3); // Friday + 3 = Monday
        return getWeekStart(nextMonday);
    } else {
        // Before Friday 11:59 PM - this week is still unlocked
        return getWeekStart(now);
    }
}

// Get deadline for a given week (Friday 6:00 PM of that week)
function getWeekDeadline(weekStart) {
    const deadline = new Date(weekStart);
    deadline.setDate(weekStart.getDate() + 4); // Monday + 4 = Friday
    deadline.setHours(18, 0, 0, 0); // 6:00 PM
    return deadline;
}

// Check if deadline has passed for a given week
function isDeadlinePassed(weekStart) {
    const now = new Date();
    const deadline = getWeekDeadline(weekStart);
    return now > deadline;
}

// Get color based on performance score (0-100)
// Returns sleek, muted colors that match the frosted glass aesthetic
function getPerformanceColor(score, opacity = 0.8) {
    if (score >= 80) {
        // Excellent: Soft green
        return `rgba(34, 197, 94, ${opacity})`;
    } else if (score >= 70) {
        // Good: Muted teal
        return `rgba(45, 212, 191, ${opacity})`;
    } else if (score >= 60) {
        // Average: Soft yellow
        return `rgba(251, 191, 36, ${opacity})`;
    } else if (score >= 50) {
        // Below average: Muted orange
        return `rgba(251, 146, 60, ${opacity})`;
    } else {
        // Poor: Soft red
        return `rgba(239, 68, 68, ${opacity})`;
    }
}

// Get an array of colors for multiple values
function getPerformanceColors(values, opacity = 0.8) {
    return values.map(v => getPerformanceColor(v, opacity));
}

// ==========================================
// ACTIVITY FILTERING HELPERS
// ==========================================

// Get only the ACTIVE activities for display (excludes global suggestions for mentors)
function getActiveActivities() {
    if (currentUser && currentUser.role === 'mentor' && !currentUser.is_coordinator && currentUser.group_id) {
        // Mentors: Only their group-specific activities (NOT global suggestions)
        return allActivities.filter(a => a.group_id === currentUser.group_id);
    } else {
        // Coordinators/ED: All activities (including global and group-specific)
        return allActivities;
    }
}

// ==========================================
// MANAGE CETELE (MENTORS ONLY)
// ==========================================

async function loadManageCetelePage() {
    if (!hasPermission('edit_own_cetele')) {
        console.error('No permission to manage cetele');
        return;
    }

    const container = document.getElementById('activitiesListContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
        // Activities are already loaded in allActivities with proper filtering
        renderActivitiesList(allActivities);
    } catch (error) {
        console.error('Error loading manage cetele page:', error);
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error loading activities</div></div>';
    }
}

function renderActivitiesList(activities) {
    const container = document.getElementById('activitiesListContainer');
    if (!container) return;

    // Separate global and group-specific activities
    const globalActivities = activities.filter(a => !a.group_id);
    const groupActivities = activities.filter(a => a.group_id === currentUser.group_id);

    let html = '';

    // Show group-specific activities first (these are the ACTIVE cetele)
    html += `
        <div style="padding: 1rem; background: rgba(139, 92, 246, 0.05); border-bottom: 1px solid var(--glass-border);">
            <h3 style="font-size: 0.9rem; font-weight: 600; color: var(--accent-purple); margin-bottom: 0.5rem;">
                📋 My Group's Cetele Activities
            </h3>
            <p style="font-size: 0.8rem; color: var(--text-muted);">
                These are the activities your students will see and complete on their weekly cetele
            </p>
        </div>
    `;

    if (groupActivities.length > 0) {
        groupActivities.forEach((activity, index) => {
            html += renderActivityItem(activity, index, true);
        });
    } else {
        html += `
            <div style="padding: 2rem; text-align: center; color: var(--text-muted);">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">📝</div>
                <div style="font-weight: 500; margin-bottom: 0.5rem;">No activities yet</div>
                <p style="font-size: 0.85rem;">Click "Add Activity" to create your first activity, or adopt suggestions below</p>
            </div>
        `;
    }

    // Show global activities as suggestions (can be adopted)
    if (globalActivities.length > 0) {
        html += `
            <div style="padding: 1rem; background: rgba(251, 191, 36, 0.05); border-bottom: 1px solid var(--glass-border); margin-top: 1.5rem;">
                <h3 style="font-size: 0.9rem; font-weight: 600; color: rgba(251, 191, 36, 0.9); margin-bottom: 0.5rem;">
                    💡 Suggested Activities
                </h3>
                <p style="font-size: 0.8rem; color: var(--text-muted);">
                    Default activity suggestions from coordinators. Click "Adopt" to add any of these to your cetele.
                </p>
            </div>
        `;

        globalActivities.forEach((activity, index) => {
            html += renderSuggestedActivityItem(activity, index);
        });
    }

    container.innerHTML = html;
}

function renderActivityItem(activity, index, isEditable) {
    return `
        <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border-bottom: 1px solid var(--glass-border); background: rgba(255, 255, 255, 0.02);">
            <span style="font-size: 1.5rem;">✅</span>
            <div style="flex: 1;">
                <div style="font-weight: 500; margin-bottom: 0.25rem;">${activity.name}</div>
                ${activity.description ? `<div style="font-size: 0.85rem; color: var(--text-muted);">${activity.description}</div>` : ''}
            </div>
            <button class="btn btn-secondary" onclick="editActivity('${activity.id}')" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                ✏️ Edit
            </button>
            <button class="btn" onclick="deleteActivity('${activity.id}')" style="padding: 0.5rem 1rem; font-size: 0.85rem; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3);">
                🗑️ Delete
            </button>
        </div>
    `;
}

function renderSuggestedActivityItem(activity, index) {
    return `
        <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border-bottom: 1px solid var(--glass-border);">
            <span style="font-size: 1.5rem;">💡</span>
            <div style="flex: 1;">
                <div style="font-weight: 500; margin-bottom: 0.25rem; color: rgba(255, 255, 255, 0.7);">${activity.name}</div>
                ${activity.description ? `<div style="font-size: 0.85rem; color: var(--text-muted);">${activity.description}</div>` : ''}
            </div>
            <button class="btn" onclick="adoptActivity('${activity.id}')" style="padding: 0.5rem 1rem; font-size: 0.85rem; background: rgba(251, 191, 36, 0.15); border-color: rgba(251, 191, 36, 0.3); color: rgba(251, 191, 36, 0.9);">
                ➕ Adopt This
            </button>
        </div>
    `;
}

async function adoptActivity(activityId) {
    const activity = allActivities.find(a => a.id === activityId);
    if (!activity) return;

    showConfirmModal('Adopt Activity', `Add "${activity.name}" to your group's cetele?`, async () => {
        await performAdoptActivity(activity);
    }, 'Adopt', false);
}

async function performAdoptActivity(activity) {
    try {
        showLoading('Adding activity...');

        // Get the highest order_index for group activities
        const groupActivities = allActivities.filter(a => a.group_id === currentUser.group_id);
        const maxOrder = groupActivities.reduce((max, a) => Math.max(max, a.order_index || 0), 0);

        // Create a copy of the global activity for this group with ALL fields
        const newActivity = {
            name: activity.name,
            description: activity.description,
            type: activity.type,
            input_type: activity.input_type || 'checkbox',
            target: activity.target,
            unit: activity.unit,
            response_type: activity.response_type,
            group_id: currentUser.group_id,
            order_index: maxOrder + 1
        };

        console.log('📋 Adopting activity with data:', newActivity);

        const { data, error } = await supabase
            .from('activities')
            .insert([newActivity])
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Activity adopted:', data);

        // Reload data
        await loadAllData();
        loadManageCetelePage();

        hideLoading();
        showToast(`"${activity.name}" has been added to your cetele!`, 'success');
    } catch (error) {
        hideLoading();
        console.error('Error adopting activity:', error);
        showToast('Failed to adopt activity: ' + error.message, 'error');
    }
}

// Modal state
let currentEditingActivityId = null;

function addNewActivity() {
    currentEditingActivityId = null;
    const modal = document.getElementById('activityModalOverlay');
    const title = document.getElementById('activityModalTitle');
    const subtitle = document.querySelector('.modal-subtitle');
    const submitBtn = document.getElementById('activitySubmitBtn');
    const form = document.getElementById('activityForm');

    title.textContent = 'Add New Activity';
    subtitle.textContent = 'Create a custom activity for your group\'s cetele';
    submitBtn.innerHTML = '✓ Create Activity';

    // Reset form
    form.reset();
    document.getElementById('charCount').textContent = '0';

    // Show modal
    modal.classList.add('active');
    setTimeout(() => document.getElementById('activityName').focus(), 100);
}

function editActivity(activityId) {
    const activity = allActivities.find(a => a.id === activityId);
    if (!activity) return;

    currentEditingActivityId = activityId;
    const modal = document.getElementById('activityModalOverlay');
    const title = document.getElementById('activityModalTitle');
    const subtitle = document.querySelector('.modal-subtitle');
    const submitBtn = document.getElementById('activitySubmitBtn');

    title.textContent = 'Edit Activity';
    subtitle.textContent = 'Update your activity details';
    submitBtn.innerHTML = '✓ Save Changes';

    // Fill form with activity data
    document.getElementById('activityName').value = activity.name;
    document.getElementById('activityDescription').value = activity.description || '';
    document.getElementById('activityResponseType').value = activity.response_type || 'boolean';
    document.getElementById('charCount').textContent = (activity.description || '').length;

    // Show modal
    modal.classList.add('active');
    setTimeout(() => document.getElementById('activityName').focus(), 100);
}

async function submitActivityForm(event) {
    event.preventDefault();

    const name = document.getElementById('activityName').value.trim();
    const description = document.getElementById('activityDescription').value.trim();
    const responseType = document.getElementById('activityResponseType').value;
    const submitBtn = document.getElementById('activitySubmitBtn');

    if (!name) return;

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span> Saving...';

    try {
        if (currentEditingActivityId) {
            // Update existing activity
            const { error } = await supabase
                .from('activities')
                .update({
                    name: name,
                    description: description || null,
                    response_type: responseType
                })
                .eq('id', currentEditingActivityId);

            if (error) throw error;
            console.log('✅ Activity updated');
        } else {
            // Create new activity
            const groupActivities = allActivities.filter(a => a.group_id === currentUser.group_id);
            const maxOrder = groupActivities.reduce((max, a) => Math.max(max, a.order_index || 0), 0);

            const { data, error} = await supabase
                .from('activities')
                .insert([{
                    name: name,
                    description: description || null,
                    response_type: responseType,
                    group_id: currentUser.group_id,
                    order_index: maxOrder + 1
                }])
                .select()
                .single();

            if (error) throw error;
            console.log('✅ Activity created:', data);
        }

        // Reload data
        await loadAllData();
        loadManageCetelePage();

        // Close modal
        closeActivityModal();

        showToast(currentEditingActivityId ? 'Activity updated successfully!' : 'Activity created successfully!', 'success');
    } catch (error) {
        console.error('Error saving activity:', error);
        showToast('Failed to save activity: ' + error.message, 'error');

        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.innerHTML = currentEditingActivityId ? '✓ Save Changes' : '✓ Create Activity';
    }
}

async function deleteActivity(activityId) {
    showConfirmModal('Delete Activity', 'Are you sure you want to delete this activity? This action cannot be undone.', async () => {
        try {
            showLoading('Deleting activity...');

            const { error } = await supabase
                .from('activities')
                .delete()
                .eq('id', activityId);

            if (error) throw error;

            console.log('✅ Activity deleted');

            // Reload data
            await loadAllData();
            loadManageCetelePage();

            hideLoading();
            showToast('Activity deleted successfully!', 'success');
        } catch (error) {
            hideLoading();
            console.error('Error deleting activity:', error);
            showToast('Failed to delete activity: ' + error.message, 'error');
        }
    }, 'Delete');
}


// ==========================================
// MODAL CONTROLS
// ==========================================

function closeActivityModal() {
    const modal = document.getElementById("activityModalOverlay");
    modal.classList.remove("active");
    currentEditingActivityId = null;
}

function closeActivityModalOnOverlay(event) {
    if (event.target.id === "activityModalOverlay") {
        closeActivityModal();
    }
}

// Character counter for description
document.addEventListener("DOMContentLoaded", () => {
    const textarea = document.getElementById("activityDescription");
    const charCount = document.getElementById("charCount");

    if (textarea && charCount) {
        textarea.addEventListener("input", () => {
            charCount.textContent = textarea.value.length;
        });
    }
});
