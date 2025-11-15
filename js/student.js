// Student Portal JavaScript

let currentStudentId = null;
let currentStudent = null;
let currentWeek = null;
let activities = [];
let isEditing = false;
let groupStudents = [];
let allSubmissions = [];
let charts = {};

// Initialize
async function init() {
    // Check for demo mode
    const urlParams = new URLSearchParams(window.location.search);
    const isDemo = urlParams.get('demo') === 'true';

    if (isDemo) {
        // Auto-login with demo student (Emma Thompson - student id 1)
        currentStudentId = '1';
        sessionStorage.setItem('studentId', '1');
    } else {
        // Verify user session
        const user = DatabaseHelper.getCurrentUser();
        currentStudentId = DatabaseHelper.getSessionStudentId();

        // If no session or not a student, redirect to login
        if (!currentStudentId || !user || user.role !== 'student') {
            window.location.href = 'student-login.html';
            return;
        }

        // Verify student_id matches user's student_id
        if (user.student_id && currentStudentId !== user.student_id.toString()) {
            console.error('Session mismatch - student_id does not match user');
            localStorage.removeItem('cetele_user');
            sessionStorage.removeItem('studentId');
            window.location.href = 'student-login.html';
            return;
        }
    }

    try {
        // Load student data
        currentStudent = await DatabaseHelper.getStudentById(currentStudentId);
        activities = await DatabaseHelper.getActivities();
        currentWeek = DatabaseHelper.getWeekStartDate();

        // Update header
        updateHeader();

        // Load data
        await loadAllData();
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Error loading student portal. Please try again.');
    }
}

async function loadAllData() {
    await Promise.all([
        loadCeteleTable(),
        loadPersonalStats(),
        loadLeaderboard(),
        loadTopPerformers(),
        renderProgressChart(),
        renderConsistencyChart(),
        renderGroupComparisonChart()
    ]);

    // Load new visualizations if functions exist
    if (typeof renderActivityHeatmap !== 'undefined') await renderActivityHeatmap();
    if (typeof renderBadges !== 'undefined') await renderBadges();
    if (typeof renderActivityBalanceChart !== 'undefined') await renderActivityBalanceChart();

    // Update week navigation buttons
    updateWeekNavigationState();
}

function updateHeader() {
    // Update group title
    const groupName = currentStudent.groups?.name || 'No Group';
    const grade = currentStudent.groups?.grade || currentStudent.grade;
    document.getElementById('groupTitle').textContent = `${groupName} - ${grade}`;

    // Update student name (First name + Last initial)
    const nameParts = currentStudent.name.split(' ');
    const firstName = nameParts[0];
    const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1].charAt(0) + '.' : '';
    document.getElementById('studentName').textContent = `${firstName} ${lastInitial}`;

    // Update week display
    updateWeekDisplay();
}

function updateWeekDisplay() {
    const weekDate = new Date(currentWeek);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const formattedDate = weekDate.toLocaleDateString('en-US', options);

    document.getElementById('currentWeekDisplay').textContent = formattedDate;

    // Calculate due date (Sunday)
    const dueDate = new Date(weekDate);
    dueDate.setDate(dueDate.getDate() + 6);
    const dueDateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    document.getElementById('dueDate').textContent = dueDateStr;
}

async function loadCeteleTable() {
    try {
        // Get group students
        if (currentStudent.group_id) {
            groupStudents = await DatabaseHelper.getStudents(currentStudent.group_id);
        } else {
            groupStudents = [currentStudent];
        }

        // Get all submissions for this week
        allSubmissions = await DatabaseHelper.getAllSubmissionsForWeek(currentWeek, currentStudent.group_id);

        console.log('📋 Loading table:', {
            week: currentWeek,
            groupStudents: groupStudents.length,
            submissions: allSubmissions.length,
            allSubmissions: allSubmissions
        });

        // Build table headers
        const headerRow = document.querySelector('#ceteleTable thead tr');
        let headersHTML = '<th class="student-col">Student</th>';
        activities.forEach(activity => {
            headersHTML += `<th class="activity-col" title="${activity.description}">${activity.name}<br><small>${activity.description}</small></th>`;
        });
        headerRow.innerHTML = headersHTML;

        // Build table body
        const tbody = document.getElementById('ceteleTableBody');
        tbody.innerHTML = '';

        // Check if current student has submitted
        const mySubmission = allSubmissions.find(s => s.student_id == currentStudentId);
        const hasSubmitted = !!mySubmission;

        console.log('👤 My submission:', mySubmission);

        groupStudents.forEach(student => {
            const submission = allSubmissions.find(s => s.student_id === student.id);
            const isCurrentStudent = student.id == currentStudentId;

            const row = document.createElement('tr');
            row.className = isCurrentStudent ? 'current-student-row' : '';
            row.dataset.studentId = student.id;

            // Student name cell
            let nameCell = `<td class="student-name-cell">`;
            if (isCurrentStudent) {
                nameCell += `<strong>${student.name} (You)</strong>`;
            } else {
                nameCell += student.name;
            }
            nameCell += `</td>`;

            // Activity cells
            let activityCells = '';
            activities.forEach(activity => {
                const value = submission?.activity_completions?.[activity.id];

                if (isCurrentStudent) {
                    console.log(`🔍 Activity ${activity.id} (${activity.name}):`, value);

                    // Calculate color coding for numbers
                    let cellClass = '';
                    if (activity.input_type === 'number' && value !== null && value !== undefined) {
                        const percentage = (value / activity.target) * 100;
                        if (percentage >= 100) cellClass = 'cell-full';
                        else if (percentage >= 50) cellClass = 'cell-partial';
                        else if (percentage > 0) cellClass = 'cell-low';
                        else cellClass = 'cell-empty';
                    } else if (activity.input_type === 'checkbox') {
                        if (value === true) cellClass = 'cell-yes';
                        else if (value === false) cellClass = 'cell-no';
                    }

                    // Render as select dropdown for all activities
                    let selectedValue = '';
                    if (activity.input_type === 'number') {
                        // For number activities, convert to yes/no based on target
                        if (value !== null && value !== undefined) {
                            const percentage = (value / activity.target) * 100;
                            selectedValue = percentage >= 50 ? 'yes' : 'no';
                        }
                    } else {
                        // For checkbox activities
                        if (value === true) selectedValue = 'yes';
                        else if (value === false) selectedValue = 'no';
                    }

                    activityCells += `
                        <td class="activity-cell ${cellClass}">
                            <select
                                class="activity-select"
                                data-activity-id="${activity.id}"
                                data-target="${activity.target}"
                                data-input-type="${activity.input_type}"
                                ${!isEditing ? 'disabled' : ''}
                            >
                                <option value="">-</option>
                                <option value="yes" ${selectedValue === 'yes' ? 'selected' : ''}>Yes</option>
                                <option value="no" ${selectedValue === 'no' ? 'selected' : ''}>No</option>
                            </select>
                        </td>
                    `;
                } else {
                    // Read-only for other students
                    let displayValue = '-';
                    let cellClass = '';

                    if (activity.input_type === 'number') {
                        if (value !== null && value !== undefined) {
                            const percentage = (value / activity.target) * 100;
                            displayValue = `${value}/${activity.target}`;

                            if (percentage >= 100) cellClass = 'cell-full';
                            else if (percentage >= 50) cellClass = 'cell-partial';
                            else if (percentage > 0) cellClass = 'cell-low';
                            else cellClass = 'cell-empty';
                        } else {
                            cellClass = 'cell-empty';
                        }
                    } else {
                        if (value === true) {
                            displayValue = 'Yes';
                            cellClass = 'cell-yes';
                        } else if (value === false) {
                            displayValue = 'No';
                            cellClass = 'cell-no';
                        } else {
                            cellClass = 'cell-empty';
                        }
                    }

                    activityCells += `<td class="activity-cell ${cellClass}"><span class="cell-badge">${displayValue}</span></td>`;
                }
            });

            row.innerHTML = nameCell + activityCells;
            tbody.appendChild(row);
        });

        // Update edit/save button visibility
        updateButtonState(hasSubmitted);

        // Add event listeners to dropdowns for color updates
        document.querySelectorAll('.current-student-row .activity-select').forEach(select => {
            select.addEventListener('change', function() {
                const cell = this.closest('td');
                cell.classList.remove('cell-yes', 'cell-no', 'cell-empty', 'cell-full', 'cell-partial', 'cell-low');

                if (this.value === 'yes') {
                    cell.classList.add('cell-yes');
                } else if (this.value === 'no') {
                    cell.classList.add('cell-no');
                } else {
                    cell.classList.add('cell-empty');
                }
            });
        });

    } catch (error) {
        console.error('Error loading cetele table:', error);
    }
}

function updateButtonState(hasSubmitted) {
    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');

    if (hasSubmitted) {
        editBtn.style.display = 'block';
        saveBtn.style.display = 'none';
        isEditing = false;
    } else {
        editBtn.style.display = 'none';
        saveBtn.style.display = 'block';
        isEditing = true;
        enableEditing();
    }
}

function toggleEdit() {
    isEditing = !isEditing;
    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');

    if (isEditing) {
        editBtn.style.display = 'none';
        saveBtn.style.display = 'block';
        enableEditing();
    } else {
        editBtn.style.display = 'block';
        saveBtn.style.display = 'none';
        disableEditing();
    }
}

function enableEditing() {
    const selects = document.querySelectorAll('.current-student-row .activity-select');
    selects.forEach(select => select.disabled = false);
}

function disableEditing() {
    const selects = document.querySelectorAll('.current-student-row .activity-select');
    selects.forEach(select => select.disabled = true);
}

async function saveCetele() {
    try {
        // Collect activity completions
        const activityCompletions = {};

        // Collect from selects
        const selects = document.querySelectorAll('.current-student-row .activity-select');
        selects.forEach(select => {
            const activityId = parseInt(select.dataset.activityId);
            const inputType = select.dataset.inputType;
            const target = parseInt(select.dataset.target);
            const value = select.value;

            if (inputType === 'number') {
                // Convert yes/no back to number based on target
                if (value === 'yes') {
                    activityCompletions[activityId] = target; // Full completion
                } else if (value === 'no') {
                    activityCompletions[activityId] = 0; // No completion
                } else {
                    activityCompletions[activityId] = 0;
                }
            } else {
                // For checkbox activities, store boolean
                if (value === 'yes') {
                    activityCompletions[activityId] = true;
                } else if (value === 'no') {
                    activityCompletions[activityId] = false;
                } else {
                    activityCompletions[activityId] = null;
                }
            }
        });

        console.log('💾 Saving cetele:', {
            studentId: currentStudentId,
            week: currentWeek,
            completions: activityCompletions
        });

        // Submit to database
        const result = await DatabaseHelper.submitWeeklyData(
            currentStudentId,
            currentWeek,
            activityCompletions
        );

        console.log('✅ Save result:', result);

        // Show success modal
        showSuccessModal();

        // Reload all data
        await loadAllData();

        console.log('📊 Data reloaded, submissions:', allSubmissions);

        // Disable editing
        isEditing = false;
        disableEditing();
        document.getElementById('editBtn').style.display = 'block';
        document.getElementById('saveBtn').style.display = 'none';

    } catch (error) {
        console.error('Error saving cetele:', error);
        alert('Error saving your cetele. Please try again.');
    }
}

async function loadPersonalStats() {
    try {
        // Get all student submissions
        const allMySubmissions = await DatabaseHelper.getAllSubmissionsForStudent(currentStudentId);

        // Calculate stats
        const totalWeeks = allMySubmissions.length;
        let totalCompletions = 0;
        let bestScore = 0;

        allMySubmissions.forEach(sub => {
            const score = Object.values(sub.activity_completions).filter(v => v === true).length;
            totalCompletions += score;
            if (score > bestScore) bestScore = score;
        });

        const avgCompletion = totalWeeks > 0
            ? Math.round((totalCompletions / (totalWeeks * activities.length)) * 100)
            : 0;

        // Calculate streak
        const streak = calculateStreak(allMySubmissions);

        // Calculate rank
        const leaderboard = await DatabaseHelper.getLeaderboard(currentStudent.group_id);
        const myRank = leaderboard.findIndex(item => item.id === currentStudentId) + 1;

        // Update UI
        document.getElementById('totalWeeks').textContent = totalWeeks;
        document.getElementById('completionRate').textContent = avgCompletion + '%';
        document.getElementById('bestScore').textContent = bestScore + '/' + activities.length;
        document.getElementById('currentStreak').textContent = streak;
        document.getElementById('streakCount').textContent = streak;
        document.getElementById('rankPosition').textContent = myRank > 0 ? '#' + myRank : '#-';

    } catch (error) {
        console.error('Error loading personal stats:', error);
    }
}

function calculateStreak(submissions) {
    if (submissions.length === 0) return 0;

    // Sort submissions by date descending
    const sorted = submissions.sort((a, b) =>
        new Date(b.week_start_date) - new Date(a.week_start_date)
    );

    let streak = 0;
    let expectedWeek = DatabaseHelper.getWeekStartDate();

    for (const sub of sorted) {
        const subWeek = new Date(sub.week_start_date).toISOString().split('T')[0];

        if (subWeek === expectedWeek) {
            streak++;
            // Move to previous week
            const prevWeek = new Date(expectedWeek);
            prevWeek.setDate(prevWeek.getDate() - 7);
            expectedWeek = DatabaseHelper.getWeekStartDate(prevWeek);
        } else {
            break;
        }
    }

    return streak;
}

async function loadLeaderboard() {
    try {
        const leaderboard = await DatabaseHelper.getLeaderboard(currentStudent.group_id, 10);
        const container = document.getElementById('leaderboardList');
        container.innerHTML = '';

        leaderboard.forEach((item, index) => {
            const isCurrentStudent = item.id === currentStudentId;
            const percentage = Math.round(item.percentage || 0);

            const div = document.createElement('div');
            div.className = `leaderboard-item ${isCurrentStudent ? 'current-student' : ''}`;

            let medal = '';
            if (index === 0) medal = '🥇';
            else if (index === 1) medal = '🥈';
            else if (index === 2) medal = '🥉';
            else medal = `<span class="rank-number">#${index + 1}</span>`;

            div.innerHTML = `
                <div class="leaderboard-rank">${medal}</div>
                <div class="leaderboard-name">${item.name}${isCurrentStudent ? ' (You)' : ''}</div>
                <div class="leaderboard-score">${item.score} pts</div>
                <div class="leaderboard-bar">
                    <div class="leaderboard-fill" style="width: ${percentage}%"></div>
                </div>
            `;

            container.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

async function loadTopPerformers() {
    try {
        const submissions = await DatabaseHelper.getAllSubmissionsForWeek(currentWeek);

        // Calculate scores for this week
        const performers = submissions.map(sub => {
            const score = Object.values(sub.activity_completions).filter(v => v === true).length;
            return {
                student: sub.students,
                score: score,
                percentage: Math.round((score / activities.length) * 100)
            };
        });

        // Sort by score and get top 5
        performers.sort((a, b) => b.score - a.score);
        const topPerformers = performers.slice(0, 5);

        const container = document.getElementById('topPerformers');
        container.innerHTML = '';

        if (topPerformers.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #94a3b8;">No submissions yet this week</p>';
            return;
        }

        topPerformers.forEach((performer, index) => {
            const isCurrentStudent = performer.student?.id === currentStudentId;

            const div = document.createElement('div');
            div.className = `top-performer-item ${isCurrentStudent ? 'current-student' : ''}`;

            div.innerHTML = `
                <div class="performer-rank">${index + 1}</div>
                <div class="performer-info">
                    <div class="performer-name">${performer.student?.name || 'Unknown'}${isCurrentStudent ? ' (You)' : ''}</div>
                    <div class="performer-score">${performer.score}/${activities.length} completed (${performer.percentage}%)</div>
                </div>
            `;

            container.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading top performers:', error);
    }
}

function changeWeek(direction) {
    const date = new Date(currentWeek);
    date.setDate(date.getDate() + (direction * 7));
    const newWeek = DatabaseHelper.getWeekStartDate(date);

    // Check if week is allowed
    if (!isWeekAllowed(newWeek)) {
        return; // Don't change week
    }

    currentWeek = newWeek;
    updateWeekDisplay();
    loadAllData();
}

function goToCurrentWeek() {
    currentWeek = DatabaseHelper.getWeekStartDate();
    updateWeekDisplay();
    loadAllData();
}

function isWeekAllowed(weekString) {
    const weekDate = new Date(weekString);
    const today = new Date();

    // Calculate the Saturday of the week at midnight
    const saturdayOfWeek = new Date(weekDate);
    saturdayOfWeek.setDate(saturdayOfWeek.getDate() + 5); // Monday + 5 = Saturday
    saturdayOfWeek.setHours(0, 0, 0, 0);

    // Week is accessible if today is >= Saturday of that week
    return today >= saturdayOfWeek;
}

function updateWeekNavigationState() {
    const prevBtn = document.querySelector('.week-nav-btn:first-child');
    const nextBtn = document.querySelector('.week-nav-btn:last-child');

    // Check previous week
    const prevWeekDate = new Date(currentWeek);
    prevWeekDate.setDate(prevWeekDate.getDate() - 7);
    const prevWeek = DatabaseHelper.getWeekStartDate(prevWeekDate);

    if (!isWeekAllowed(prevWeek)) {
        prevBtn.disabled = true;
        prevBtn.style.opacity = '0.4';
        prevBtn.style.cursor = 'not-allowed';
    } else {
        prevBtn.disabled = false;
        prevBtn.style.opacity = '1';
        prevBtn.style.cursor = 'pointer';
    }

    // Check next week
    const nextWeekDate = new Date(currentWeek);
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeek = DatabaseHelper.getWeekStartDate(nextWeekDate);

    if (!isWeekAllowed(nextWeek)) {
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.4';
        nextBtn.style.cursor = 'not-allowed';
    } else {
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
        nextBtn.style.cursor = 'pointer';
    }
}

// ==================== CHARTS ====================

async function renderProgressChart() {
    try {
        const allMySubmissions = await DatabaseHelper.getAllSubmissionsForStudent(currentStudentId);

        // Get last 8 weeks
        const weeks = DatabaseHelper.getLastNWeeks(8).reverse();
        const weeklyScores = weeks.map(week => {
            const submission = allMySubmissions.find(sub => {
                const subWeek = new Date(sub.week_start_date).toISOString().split('T')[0];
                return subWeek === week;
            });

            if (!submission) return 0;

            const completions = Object.values(submission.activity_completions).filter(v => v === true).length;
            return Math.round((completions / activities.length) * 100);
        });

        const ctx = document.getElementById('progressChart');
        if (!ctx) return;

        if (charts.progress) {
            charts.progress.destroy();
        }

        charts.progress = new Chart(ctx, {
            type: 'line',
            data: {
                labels: weeks.map(w => DatabaseHelper.formatDate(w)),
                datasets: [{
                    label: 'Completion %',
                    data: weeklyScores,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#8b5cf6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(10, 11, 14, 0.9)',
                        titleColor: '#f8fafc',
                        bodyColor: '#cbd5e1',
                        borderColor: 'rgba(139, 92, 246, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false
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
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering progress chart:', error);
    }
}

async function renderConsistencyChart() {
    try {
        const allMySubmissions = await DatabaseHelper.getAllSubmissionsForStudent(currentStudentId);

        // Get last 8 weeks
        const weeks = DatabaseHelper.getLastNWeeks(8).reverse();

        // Calculate completion rate for each week
        const completionRates = weeks.map(week => {
            const submission = allMySubmissions.find(sub => {
                const subWeek = new Date(sub.week_start_date).toISOString().split('T')[0];
                return subWeek === week;
            });

            if (!submission) return 0;

            const completions = Object.values(submission.activity_completions).filter(v => v === true).length;
            return completions;
        });

        const ctx = document.getElementById('consistencyChart');
        if (!ctx) return;

        if (charts.consistency) {
            charts.consistency.destroy();
        }

        // Create gradient colors based on completion
        const backgroundColors = completionRates.map(count => {
            const percentage = (count / activities.length) * 100;
            if (percentage >= 80) return '#10b981';
            if (percentage >= 60) return '#f59e0b';
            if (percentage >= 40) return '#ef4444';
            return '#64748b';
        });

        charts.consistency = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: weeks.map(w => DatabaseHelper.formatDate(w).split(',')[0]), // Short date
                datasets: [{
                    label: 'Activities Completed',
                    data: completionRates,
                    backgroundColor: backgroundColors,
                    borderRadius: 8,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(10, 11, 14, 0.9)',
                        titleColor: '#f8fafc',
                        bodyColor: '#cbd5e1',
                        borderColor: 'rgba(139, 92, 246, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                const percentage = Math.round((context.parsed.y / activities.length) * 100);
                                return `${context.parsed.y}/${activities.length} (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: activities.length,
                        ticks: {
                            color: '#94a3b8',
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                size: 10
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering consistency chart:', error);
    }
}

async function renderGroupComparisonChart() {
    try {
        if (!currentStudent.group_id) return;

        const students = await DatabaseHelper.getStudents(currentStudent.group_id);
        const submissions = await DatabaseHelper.getAllSubmissionsForWeek(currentWeek, currentStudent.group_id);

        const studentNames = students.map(s => s.name);
        const scores = students.map(student => {
            const submission = submissions.find(sub => sub.student_id === student.id);
            if (!submission) return 0;
            return Object.values(submission.activity_completions).filter(v => v === true).length;
        });

        const ctx = document.getElementById('groupComparisonChart');
        if (!ctx) return;

        if (charts.comparison) {
            charts.comparison.destroy();
        }

        // Highlight current student's bar
        const backgroundColors = students.map(student =>
            student.id == currentStudentId ? '#8b5cf6' : 'rgba(139, 92, 246, 0.3)'
        );

        charts.comparison = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: studentNames,
                datasets: [{
                    label: 'Activities Completed',
                    data: scores,
                    backgroundColor: backgroundColors,
                    borderColor: students.map(student =>
                        student.id == currentStudentId ? '#8b5cf6' : 'rgba(139, 92, 246, 0.5)'
                    ),
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(10, 11, 14, 0.9)',
                        titleColor: '#f8fafc',
                        bodyColor: '#cbd5e1',
                        borderColor: 'rgba(139, 92, 246, 0.3)',
                        borderWidth: 1,
                        padding: 12
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: activities.length,
                        ticks: {
                            color: '#94a3b8',
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                size: 10
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering group comparison chart:', error);
    }
}

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.add('show');
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.remove('show');
}

function logout() {
    sessionStorage.removeItem('studentId');
    window.location.href = 'student-login.html';
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);
