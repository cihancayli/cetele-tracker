// Student Portal JavaScript

let currentStudentId = null;
let currentStudent = null;
let currentWeek = null;
let activities = [];
let isEditing = false;
let groupStudents = [];
let allSubmissions = [];
let charts = {};

// Mobile wizard state
let wizardCurrentIndex = 0;
let wizardData = {};

// Initialize
async function init() {
    // Check if this is a demo page (ends with -demo.html)
    const isDemo = window.location.pathname.includes('-demo.html');

    if (isDemo) {
        // Auto-login with demo student (Emma Thompson - student id 1)
        currentStudentId = '1';
        sessionStorage.setItem('studentId', '1');
        console.log('🎬 Demo mode active - no auth required');
    } else {
        // Verify user session
        const user = DatabaseHelper.getCurrentUser();
        currentStudentId = DatabaseHelper.getSessionStudentId();

        console.log('🔍 Session check:', { user, currentStudentId });

        // If no session or not a student, redirect to login
        if (!currentStudentId || !user || user.role !== 'student') {
            console.log('❌ No valid session, redirecting to login');
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
        console.log('📥 Loading student data for ID:', currentStudentId);

        // Load student data
        currentStudent = await DatabaseHelper.getStudentById(currentStudentId);
        console.log('✅ Student loaded:', currentStudent);

        if (!currentStudent) {
            throw new Error('Student not found. Please login again.');
        }

        // Load activities for this student's group only
        if (currentStudent.group_id) {
            activities = await DatabaseHelper.getActivitiesForGroup(currentStudent.group_id);
            console.log(`✅ Activities loaded for group ${currentStudent.group_id}:`, activities);
        } else {
            // Fallback: if no group, show no activities (mentor needs to set up cetele)
            activities = [];
            console.log('⚠️ No group assigned to student, no activities to show');
        }

        if (activities.length === 0) {
            console.log('⚠️ No activities found for this group. Mentor needs to create/adopt activities.');
        }

        currentWeek = DatabaseHelper.getWeekStartDate();
        console.log('✅ Current week:', currentWeek);

        // Update header
        updateHeader();

        // Load data
        await loadAllData();
    } catch (error) {
        console.error('❌ Initialization error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            studentId: currentStudentId,
            currentStudent: currentStudent
        });
        alert(`Error loading student portal: ${error.message}\n\nPlease check the console for details.`);
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
    if (!currentStudent) {
        document.getElementById('groupTitle').textContent = 'Loading...';
        document.getElementById('studentName').textContent = '';
        return;
    }

    // Update group title
    const groupName = currentStudent.groups?.name || 'No Group';
    const grade = currentStudent.groups?.grade || currentStudent.grade || '';
    document.getElementById('groupTitle').textContent = `${groupName}${grade ? ' - ' + grade : ''}`;

    // Update student name (First name + Last initial)
    const nameParts = (currentStudent.name || 'Student').split(' ');
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

        // Check if current student has submitted FIRST to set isEditing before rendering
        const mySubmission = allSubmissions.find(s => s.student_id == currentStudentId);
        // Only count as "submitted" if there's actual data in the submission
        const hasActualData = mySubmission && mySubmission.activity_completions &&
            Object.keys(mySubmission.activity_completions).length > 0 &&
            Object.values(mySubmission.activity_completions).some(v => v !== null && v !== undefined);
        const hasSubmitted = hasActualData;
        const currentWeekStart = DatabaseHelper.getWeekStartDate();
        const isCurrentWeek = currentWeek === currentWeekStart;

        console.log('🔍 Submission check:', {
            currentStudentId,
            mySubmission,
            hasActualData,
            hasSubmitted,
            currentWeek,
            currentWeekStart,
            isCurrentWeek
        });

        // Set isEditing state BEFORE rendering
        if (hasSubmitted) {
            isEditing = false;
        } else if (isCurrentWeek) {
            isEditing = true; // Auto-enable editing for current week with no submission
        } else {
            isEditing = false; // Can't edit past weeks
        }

        console.log('📝 Editing state:', { hasSubmitted, isCurrentWeek, isEditing });

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

                    // Calculate display value and color for current student
                    let displayValue = '-';
                    let cellClass = '';

                    if (activity.input_type === 'number') {
                        if (value !== null && value !== undefined) {
                            const percentage = (value / activity.target) * 100;
                            if (percentage >= 50) {
                                displayValue = 'Yes';
                                cellClass = 'cell-yes';
                            } else if (percentage > 0) {
                                displayValue = 'No';
                                cellClass = 'cell-no';
                            } else {
                                displayValue = '-';
                                cellClass = 'cell-empty';
                            }
                        } else {
                            cellClass = 'cell-empty';
                        }

                        // Show number input when editing, Yes/No badge when not
                        if (isEditing) {
                            activityCells += `
                                <td class="activity-cell ${cellClass}">
                                    <div class="number-input-wrapper editable-cell">
                                        <input
                                            type="number"
                                            class="activity-number-input"
                                            data-activity-id="${activity.id}"
                                            data-target="${activity.target}"
                                            data-input-type="number"
                                            value="${value || ''}"
                                            placeholder="0"
                                            min="0"
                                            max="${activity.target * 2}"
                                        />
                                        <span class="target-label">/ ${activity.target}</span>
                                    </div>
                                </td>
                            `;
                        } else {
                            activityCells += `
                                <td class="activity-cell ${cellClass}" data-value="${value || 0}" data-target="${activity.target}" data-activity-id="${activity.id}" data-input-type="number">
                                    <span class="cell-badge">${displayValue}</span>
                                </td>
                            `;
                        }
                    } else {
                        // For checkbox activities
                        let selectedValue = '';
                        if (value === true) {
                            selectedValue = 'yes';
                            displayValue = 'Yes';
                            cellClass = 'cell-yes';
                        } else if (value === false) {
                            selectedValue = 'no';
                            displayValue = 'No';
                            cellClass = 'cell-no';
                        } else {
                            cellClass = 'cell-empty';
                        }

                        if (isEditing) {
                            activityCells += `
                                <td class="activity-cell ${cellClass}">
                                    <select
                                        class="activity-select editable-cell"
                                        data-activity-id="${activity.id}"
                                        data-input-type="checkbox"
                                    >
                                        <option value="">-</option>
                                        <option value="yes" ${selectedValue === 'yes' ? 'selected' : ''}>Yes</option>
                                        <option value="no" ${selectedValue === 'no' ? 'selected' : ''}>No</option>
                                    </select>
                                </td>
                            `;
                        } else {
                            activityCells += `
                                <td class="activity-cell ${cellClass}" data-value="${selectedValue}" data-activity-id="${activity.id}" data-input-type="checkbox">
                                    <span class="cell-badge">${displayValue}</span>
                                </td>
                            `;
                        }
                    }
                } else {
                    // Read-only for other students - show Yes/No only
                    let displayValue = '-';
                    let cellClass = '';

                    if (activity.input_type === 'number') {
                        if (value !== null && value !== undefined) {
                            const percentage = (value / activity.target) * 100;

                            if (percentage >= 50) {
                                displayValue = 'Yes';
                                cellClass = 'cell-yes';
                            } else if (percentage > 0) {
                                displayValue = 'No';
                                cellClass = 'cell-no';
                            } else {
                                displayValue = '-';
                                cellClass = 'cell-empty';
                            }
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

        // Attach event listeners
        attachInputEventListeners();

    } catch (error) {
        console.error('Error loading cetele table:', error);
    }
}

function attachInputEventListeners() {
    // Add event listeners to dropdowns for color updates
    document.querySelectorAll('.current-student-row .activity-select').forEach(select => {
        select.addEventListener('change', function() {
            const cell = this.closest('td');
            cell.classList.remove('cell-yes', 'cell-no', 'cell-empty');

            if (this.value === 'yes') {
                cell.classList.add('cell-yes');
            } else if (this.value === 'no') {
                cell.classList.add('cell-no');
            } else {
                cell.classList.add('cell-empty');
            }
        });
    });

    // Add event listeners to number inputs for color updates
    document.querySelectorAll('.current-student-row .activity-number-input').forEach(input => {
        input.addEventListener('input', function() {
            const cell = this.closest('td');
            const target = parseInt(this.dataset.target);
            const value = parseInt(this.value) || 0;
            const percentage = (value / target) * 100;

            cell.classList.remove('cell-yes', 'cell-no', 'cell-empty');

            if (percentage >= 50) {
                cell.classList.add('cell-yes');
            } else if (percentage > 0) {
                cell.classList.add('cell-no');
            } else {
                cell.classList.add('cell-empty');
            }
        });
    });
}

function updateButtonState(hasSubmitted) {
    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');
    const currentWeekStart = DatabaseHelper.getWeekStartDate();
    const isCurrentWeek = currentWeek === currentWeekStart;

    console.log('🔘 updateButtonState:', { hasSubmitted, isCurrentWeek, currentWeek, currentWeekStart, isEditing });

    if (hasSubmitted) {
        // Already submitted - show Edit button (if current week, they can edit)
        if (isCurrentWeek) {
            editBtn.style.display = 'block';
            editBtn.textContent = 'Edit Changes';
        } else {
            editBtn.style.display = 'none'; // Can't edit past weeks
        }
        saveBtn.style.display = 'none';
        isEditing = false;
    } else {
        // Not submitted yet
        if (isCurrentWeek) {
            // Current week, no submission - auto-enable editing
            editBtn.style.display = 'none';
            saveBtn.style.display = 'block';
            saveBtn.textContent = 'Save Changes';
            isEditing = true;
        } else {
            // Past week, no submission - can't edit anymore
            editBtn.style.display = 'none';
            saveBtn.style.display = 'none';
            isEditing = false;
        }
    }
}

function toggleEdit() {
    isEditing = !isEditing;
    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');

    if (isEditing) {
        editBtn.style.display = 'none';
        saveBtn.style.display = 'block';

        // Convert badges to inputs with smooth transition
        const currentRow = document.querySelector('.current-student-row');
        const cells = currentRow.querySelectorAll('.activity-cell');

        cells.forEach((cell, index) => {
            const activityId = cell.dataset.activityId;
            const inputType = cell.dataset.inputType;
            const value = cell.dataset.value;
            const target = cell.dataset.target;

            if (!activityId) return; // Skip student name cell

            // Fade out badge
            cell.style.opacity = '0';

            setTimeout(() => {
                if (inputType === 'number') {
                    cell.innerHTML = `
                        <div class="number-input-wrapper editable-cell">
                            <input
                                type="number"
                                class="activity-number-input"
                                data-activity-id="${activityId}"
                                data-target="${target}"
                                data-input-type="number"
                                value="${value || ''}"
                                placeholder="0"
                                min="0"
                                max="${target * 2}"
                            />
                            <span class="target-label">/ ${target}</span>
                        </div>
                    `;
                } else {
                    cell.innerHTML = `
                        <select
                            class="activity-select editable-cell"
                            data-activity-id="${activityId}"
                            data-input-type="checkbox"
                        >
                            <option value="">-</option>
                            <option value="yes" ${value === 'yes' ? 'selected' : ''}>Yes</option>
                            <option value="no" ${value === 'no' ? 'selected' : ''}>No</option>
                        </select>
                    `;
                }

                // Fade in input
                cell.style.opacity = '1';

                // Reattach event listeners
                attachInputEventListeners();
            }, 150 * index); // Stagger the animations
        });
    } else {
        editBtn.style.display = 'block';
        saveBtn.style.display = 'none';

        // Reload table to show badges again
        loadCeteleTable();
    }
}

function enableEditing() {
    const selects = document.querySelectorAll('.current-student-row .activity-select');
    const inputs = document.querySelectorAll('.current-student-row .activity-number-input');
    selects.forEach(select => select.disabled = false);
    inputs.forEach(input => input.disabled = false);
}

function disableEditing() {
    const selects = document.querySelectorAll('.current-student-row .activity-select');
    const inputs = document.querySelectorAll('.current-student-row .activity-number-input');
    selects.forEach(select => select.disabled = true);
    inputs.forEach(input => input.disabled = true);
}

async function saveCetele() {
    try {
        // Collect activity completions
        const activityCompletions = {};

        // Collect from number inputs
        const inputs = document.querySelectorAll('.current-student-row .activity-number-input');
        inputs.forEach(input => {
            const activityId = input.dataset.activityId; // Keep as string (UUID)
            const value = parseInt(input.value);
            activityCompletions[activityId] = isNaN(value) ? 0 : value;
        });

        // Collect from selects (checkbox activities)
        const selects = document.querySelectorAll('.current-student-row .activity-select');
        selects.forEach(select => {
            const activityId = select.dataset.activityId; // Keep as string (UUID)
            const value = select.value;

            if (value === 'yes') {
                activityCompletions[activityId] = true;
            } else if (value === 'no') {
                activityCompletions[activityId] = false;
            } else {
                activityCompletions[activityId] = null;
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

        // Update button state BEFORE animation so table won't reload in edit mode
        isEditing = false;
        document.getElementById('editBtn').style.display = 'block';
        document.getElementById('saveBtn').style.display = 'none';

        // Animate back to badges
        await animateToBadges(activityCompletions);

        // Show success modal
        showSuccessModal();

        // Reload all data to update stats/charts (table already has badges from animation)
        await loadAllData();

        console.log('📊 Data reloaded, submissions:', allSubmissions);

    } catch (error) {
        console.error('Error saving cetele:', error);
        alert('Error saving your cetele. Please try again.');
    }
}

async function animateToBadges(activityCompletions) {
    return new Promise((resolve) => {
        const currentRow = document.querySelector('.current-student-row');
        if (!currentRow) {
            resolve();
            return;
        }

        const cells = currentRow.querySelectorAll('.activity-cell');

        let completed = 0;
        const total = cells.length;

        if (total === 0) {
            resolve();
            return;
        }

        cells.forEach((cell, index) => {
            const activityIdElement = cell.querySelector('[data-activity-id]');
            const activityId = activityIdElement?.dataset.activityId;

            if (!activityId) {
                completed++;
                if (completed === total) resolve();
                return;
            }

            const activity = activities.find(a => a.id === activityId);
            const value = activityCompletions[activityId];

            // Skip if activity not found
            if (!activity) {
                completed++;
                if (completed === total) resolve();
                return;
            }

            // Calculate display value
            let displayValue = '-';
            let cellClass = 'cell-empty';

            if (activity.input_type === 'number') {
                if (value !== null && value !== undefined && value !== 0) {
                    const percentage = (value / activity.target) * 100;
                    if (percentage >= 50) {
                        displayValue = 'Yes';
                        cellClass = 'cell-yes';
                    } else {
                        displayValue = 'No';
                        cellClass = 'cell-no';
                    }
                }
            } else {
                if (value === true) {
                    displayValue = 'Yes';
                    cellClass = 'cell-yes';
                } else if (value === false) {
                    displayValue = 'No';
                    cellClass = 'cell-no';
                }
            }

            // Fade out input
            setTimeout(() => {
                cell.style.opacity = '0';

                setTimeout(() => {
                    // Replace with badge
                    cell.className = `activity-cell ${cellClass}`;
                    cell.setAttribute('data-value', value || 0);
                    cell.setAttribute('data-target', activity.target);
                    cell.setAttribute('data-activity-id', activityId);
                    cell.setAttribute('data-input-type', activity.input_type);
                    cell.innerHTML = `<span class="cell-badge">${displayValue}</span>`;

                    // Fade in badge
                    cell.style.opacity = '1';

                    completed++;
                    if (completed === total) {
                        setTimeout(resolve, 300);
                    }
                }, 200);
            }, index * 100); // Stagger animation
        });
    });
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
        // Get leaderboard for current week (no limit parameter - getLeaderboard takes groupId, weekStartDate)
        const leaderboard = await DatabaseHelper.getLeaderboard(currentStudent.group_id, currentWeek);
        const container = document.getElementById('leaderboardList');
        container.innerHTML = '';

        // Limit to top 10
        const top10 = leaderboard.slice(0, 10);

        top10.forEach((item, index) => {
            const studentId = item.student?.id || item.id;
            const studentName = item.student?.name || item.name || 'Unknown';
            const isCurrentStudent = studentId === currentStudentId;
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
                <div class="leaderboard-name">${studentName}${isCurrentStudent ? ' (You)' : ''}</div>
                <div class="leaderboard-score">${item.score || 0} pts</div>
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
    const currentWeekStart = DatabaseHelper.getWeekStartDate();

    // Current week is ALWAYS allowed
    if (weekString === currentWeekStart) {
        return true;
    }

    // For past weeks: Calculate the Saturday of the week at midnight
    const saturdayOfWeek = new Date(weekDate);
    saturdayOfWeek.setDate(saturdayOfWeek.getDate() + 5); // Monday + 5 = Saturday
    saturdayOfWeek.setHours(0, 0, 0, 0);

    // Past week is accessible if today is >= Saturday of that week
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

// ==================== MOBILE WIZARD SYSTEM ====================

function isMobile() {
    return window.innerWidth <= 768;
}

async function openMobileWizard() {
    if (!isMobile()) return;

    // Reset wizard state
    wizardCurrentIndex = 0;
    wizardData = {};

    // Load existing submission if available
    const existingSubmission = await DatabaseHelper.getWeeklySubmission(currentStudentId, currentWeek);
    if (existingSubmission) {
        wizardData = { ...existingSubmission.activity_completions };
    }

    // Generate wizard cards
    generateWizardCards();

    // Show overlay
    const overlay = document.getElementById('mobileWizard');
    overlay.classList.add('active');
    document.body.classList.add('mobile-wizard-active');

    // Show first card
    showWizardCard(0);
}

function closeMobileWizard() {
    const overlay = document.getElementById('mobileWizard');
    overlay.classList.remove('active');
    document.body.classList.remove('mobile-wizard-active');
}

function generateWizardCards() {
    const container = document.getElementById('mobileWizardCards');
    container.innerHTML = '';

    activities.forEach((activity, index) => {
        const card = document.createElement('div');
        card.className = 'wizard-card';
        card.dataset.index = index;

        const activityIcon = getActivityIcon(activity.name);
        const existingValue = wizardData[activity.id];

        if (activity.input_type === 'number') {
            card.innerHTML = `
                <div class="wizard-card-icon">${activityIcon}</div>
                <div class="wizard-card-title">${activity.name}</div>
                <div class="wizard-card-description">${activity.description}</div>
                <div class="wizard-input-wrapper">
                    <input type="number"
                        class="wizard-number-input"
                        id="wizard-input-${activity.id}"
                        data-activity-id="${activity.id}"
                        value="${existingValue || ''}"
                        placeholder="0"
                        min="0"
                        max="${activity.target * 2}"
                        inputmode="numeric">
                    <span class="wizard-target-label">Target: ${activity.target} ${activity.unit}</span>
                </div>
            `;
        } else {
            const isYes = existingValue === true;
            const isNo = existingValue === false;
            card.innerHTML = `
                <div class="wizard-card-icon">${activityIcon}</div>
                <div class="wizard-card-title">${activity.name}</div>
                <div class="wizard-card-description">${activity.description}</div>
                <div class="wizard-checkbox-group">
                    <button class="wizard-checkbox-btn ${isYes ? 'selected' : ''}"
                        onclick="selectWizardCheckbox(${activity.id}, true)">
                        ✓ Yes
                    </button>
                    <button class="wizard-checkbox-btn ${isNo ? 'selected' : ''}"
                        onclick="selectWizardCheckbox(${activity.id}, false)">
                        ✕ No
                    </button>
                </div>
            `;
        }

        container.appendChild(card);
    });
}

function getActivityIcon(activityName) {
    const icons = {
        'Kitap': '📚',
        'Risale Sohbet 1': '💬',
        'Risale Sohbet 2': '💬',
        'Kuran': '📖',
        'Kaset/Video': '🎥',
        'Teheccud': '🌙',
        'SWB/Dhikr': '📿'
    };
    return icons[activityName] || '✨';
}

function selectWizardCheckbox(activityId, value) {
    wizardData[activityId] = value;

    // Update UI
    const card = document.querySelector(`.wizard-card[data-index="${wizardCurrentIndex}"]`);
    const buttons = card.querySelectorAll('.wizard-checkbox-btn');
    buttons.forEach(btn => btn.classList.remove('selected'));

    if (value === true) {
        buttons[0].classList.add('selected');
    } else {
        buttons[1].classList.add('selected');
    }

    // Auto-advance after selection
    setTimeout(() => {
        nextWizardCard();
    }, 400);
}

function showWizardCard(index) {
    const cards = document.querySelectorAll('.wizard-card');
    const totalCards = cards.length;

    // Update title
    document.getElementById('mobileWizardTitle').textContent = `Activity ${index + 1} of ${totalCards}`;

    // Update progress bar
    const progressPercent = ((index + 1) / totalCards) * 100;
    document.getElementById('wizardProgressBar').style.width = progressPercent + '%';

    // Update button text
    const nextBtn = document.getElementById('wizardNextBtn');
    if (index === totalCards - 1) {
        nextBtn.textContent = '✓ Submit';
        nextBtn.classList.add('submit');
    } else {
        nextBtn.textContent = 'Next →';
        nextBtn.classList.remove('submit');
    }

    // Show active card, hide others
    cards.forEach((card, i) => {
        card.classList.remove('active', 'exiting');
        if (i === index) {
            card.classList.add('active');
        } else if (i < index) {
            card.classList.add('exiting');
        }
    });
}

async function nextWizardCard() {
    const cards = document.querySelectorAll('.wizard-card');
    const currentCard = cards[wizardCurrentIndex];

    // Save current input value if it's a number input
    const input = currentCard.querySelector('.wizard-number-input');
    if (input) {
        const activityId = input.dataset.activityId; // Keep as string (UUID)
        const value = parseInt(input.value) || 0;
        wizardData[activityId] = value;
    }

    // Check if we're on the last card
    if (wizardCurrentIndex === cards.length - 1) {
        // Submit the data
        await submitMobileWizard();
        return;
    }

    // Move to next card
    wizardCurrentIndex++;
    showWizardCard(wizardCurrentIndex);
}

async function submitMobileWizard() {
    try {
        // Submit to database
        const result = await DatabaseHelper.submitWeeklyData(
            currentStudentId,
            currentWeek,
            wizardData
        );

        console.log('✅ Mobile wizard save result:', result);

        // Close wizard
        closeMobileWizard();

        // Show success modal
        showSuccessModal();

        // Reload all data
        await loadAllData();

        // Reset wizard
        wizardCurrentIndex = 0;
        wizardData = {};
    } catch (error) {
        console.error('Error saving from mobile wizard:', error);
        alert('Error saving your cetele. Please try again.');
    }
}

// Modify existing toggleEdit to support mobile wizard
const originalToggleEdit = typeof toggleEdit !== 'undefined' ? toggleEdit : null;
function toggleEdit() {
    if (isMobile()) {
        // Open mobile wizard instead of inline editing
        openMobileWizard();
    } else if (originalToggleEdit) {
        // Use desktop inline editing
        originalToggleEdit();
    } else {
        // Fallback to default behavior
        isEditing = !isEditing;
        loadCeteleTable();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);
