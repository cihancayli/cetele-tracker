// Student Portal JavaScript

let currentStudentId = null;
let currentStudent = null;
let currentWeek = null;
let activities = [];
let isEditing = false;
let groupStudents = [];
let allSubmissions = [];
let charts = {};

// Group deadline settings (defaults: Friday 6PM)
let groupDeadlineDay = 5; // 0=Sunday, 5=Friday, 6=Saturday
let groupDeadlineHour = 18; // 18 = 6:00 PM

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
            localStorage.removeItem('cetele_user');
            sessionStorage.removeItem('studentId');
            window.location.href = 'student-login.html';
            return;
        }
    }

    try {

        // Load student data
        currentStudent = await DatabaseHelper.getStudentById(currentStudentId);

        if (!currentStudent) {
            throw new Error('Student not found. Please login again.');
        }

        // Load activities for this student's group only
        if (currentStudent.group_id) {
            activities = await DatabaseHelper.getActivitiesForGroup(currentStudent.group_id);
            console.log('[DEBUG] Loaded activities for group', currentStudent.group_id, ':', activities.length);

            // Load group's deadline settings
            await loadGroupDeadlineSettings(currentStudent.group_id);
        } else {
            // Fallback: if no group, show no activities (mentor needs to set up cetele)
            activities = [];
            console.log('[DEBUG] No group_id, activities empty');
        }

        if (activities.length === 0) {
            console.log('[DEBUG] Warning: No activities found for this group');
        }

        currentWeek = DatabaseHelper.getWeekStartDate();

        // Update header
        updateHeader();

        // Load data
        await loadAllData();
    } catch (error) {
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

    // Calculate due date based on group's custom deadline
    const dueDate = getGroupDeadline(weekDate);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hourStr = groupDeadlineHour > 12
        ? `${groupDeadlineHour - 12}PM`
        : groupDeadlineHour === 12
            ? '12PM'
            : `${groupDeadlineHour}AM`;
    const dueDateStr = `${dayNames[dueDate.getDay()]} ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${hourStr}`;
    document.getElementById('dueDate').textContent = dueDateStr;

    // Start/restart countdown timer
    startCountdownTimer();
}

// Load group's deadline settings
async function loadGroupDeadlineSettings(groupId) {
    try {
        const { data: group, error } = await supabase
            .from('groups')
            .select('deadline_day, deadline_hour')
            .eq('id', groupId)
            .single();

        if (error) throw error;

        // Update global variables with group settings (or use defaults)
        groupDeadlineDay = group?.deadline_day ?? 5; // Default: Friday
        groupDeadlineHour = group?.deadline_hour ?? 18; // Default: 6 PM
        console.log('[DEBUG] Loaded deadline settings:', { day: groupDeadlineDay, hour: groupDeadlineHour });
    } catch (error) {
        console.log('[DEBUG] Could not load deadline settings, using defaults (Friday 6PM)');
        groupDeadlineDay = 5;
        groupDeadlineHour = 18;
    }
}

// Get deadline for a given week using group's custom settings
function getGroupDeadline(weekStart) {
    const deadline = new Date(weekStart);
    // Calculate days from Monday to deadline day
    // groupDeadlineDay: 0=Sunday, 1=Monday... 6=Saturday
    // Week starts on Monday, so: Monday=offset 0, Tuesday=offset 1, ... Sunday=offset 6
    const dayOffset = groupDeadlineDay === 0 ? 6 : groupDeadlineDay - 1;
    deadline.setDate(deadline.getDate() + dayOffset);
    deadline.setHours(groupDeadlineHour, 0, 0, 0);
    return deadline;
}

// Countdown timer
let countdownInterval = null;

function startCountdownTimer() {
    // Clear any existing interval
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    // Update immediately
    updateCountdownTimer();

    // Update every second
    countdownInterval = setInterval(updateCountdownTimer, 1000);
}

function updateCountdownTimer() {
    const timerEl = document.getElementById('countdownTimer');
    if (!timerEl) return;

    const weekDate = new Date(currentWeek);
    const deadline = getGroupDeadline(weekDate);
    const now = new Date();
    const diff = deadline - now;

    // Calculate end of deadline day (11:59:59 PM)
    const lateDeadline = new Date(deadline);
    lateDeadline.setHours(23, 59, 59, 999);
    const lateDiff = lateDeadline - now;

    // Check if this is a past week (before the current calendar week)
    const currentWeekStart = DatabaseHelper.getWeekStartDate();
    const isPastWeek = currentWeek < currentWeekStart;

    // Check if we're past the late submission window
    const isPastLateWindow = lateDiff <= 0;

    if (isPastWeek && isPastLateWindow) {
        timerEl.textContent = '📁 Past week';
        timerEl.className = 'countdown-timer expired';
        return;
    }

    // Past deadline but still in late submission window (until 11:59 PM)
    if (diff <= 0 && !isPastLateWindow) {
        const hours = Math.floor(lateDiff / (1000 * 60 * 60));
        const minutes = Math.floor((lateDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((lateDiff % (1000 * 60)) / 1000);

        let lateStr = '⚠️ Late: ';
        if (hours > 0) {
            lateStr += `${hours}h ${minutes}m left`;
        } else {
            lateStr += `${minutes}m ${seconds}s left`;
        }

        timerEl.textContent = lateStr;
        timerEl.className = 'countdown-timer warning';
        return;
    }

    // Late window has ended for current week
    if (isPastLateWindow) {
        timerEl.textContent = '✓ Week closed';
        timerEl.className = 'countdown-timer expired';
        return;
    }

    // Still before deadline - show countdown
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    // Format the countdown string
    let countdownStr = '⏱️ ';
    if (days > 0) {
        countdownStr += `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        countdownStr += `${hours}h ${minutes}m ${seconds}s`;
    } else {
        countdownStr += `${minutes}m ${seconds}s`;
    }

    timerEl.textContent = countdownStr;

    // Set urgency class
    const hoursRemaining = diff / (1000 * 60 * 60);
    if (hoursRemaining <= 2) {
        timerEl.className = 'countdown-timer urgent';
    } else if (hoursRemaining <= 24) {
        timerEl.className = 'countdown-timer warning';
    } else {
        timerEl.className = 'countdown-timer';
    }
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

        // Check if current student has submitted FIRST to set isEditing before rendering
        const mySubmission = allSubmissions.find(s => s.student_id == currentStudentId);
        // Only count as "submitted" if there's actual data in the submission
        const hasActualData = mySubmission && mySubmission.activity_completions &&
            Object.keys(mySubmission.activity_completions).length > 0 &&
            Object.values(mySubmission.activity_completions).some(v => v !== null && v !== undefined);
        const hasSubmitted = hasActualData;
        const currentWeekStart = DatabaseHelper.getWeekStartDate();
        const isCurrentWeek = currentWeek === currentWeekStart;

        // Set isEditing state BEFORE rendering
        if (hasSubmitted) {
            isEditing = false;
        } else if (isCurrentWeek) {
            isEditing = true; // Auto-enable editing for current week with no submission
        } else {
            isEditing = false; // Can't edit past weeks
        }


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

                    // Calculate display value and color for current student
                    let displayValue = '-';
                    let cellClass = '';

                    if (activity.input_type === 'number') {
                        if (value !== null && value !== undefined) {
                            const percentage = (value / activity.target) * 100;
                            if (percentage >= 100) {
                                displayValue = 'Yes';
                                cellClass = 'cell-yes';
                            } else if (percentage >= 50) {
                                displayValue = 'Partial';
                                cellClass = 'cell-partial';
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

                            if (percentage >= 100) {
                                displayValue = 'Yes';
                                cellClass = 'cell-yes';
                            } else if (percentage >= 50) {
                                displayValue = 'Partial';
                                cellClass = 'cell-partial';
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

            cell.classList.remove('cell-yes', 'cell-no', 'cell-partial', 'cell-empty');

            if (percentage >= 100) {
                cell.classList.add('cell-yes');
            } else if (percentage >= 50) {
                cell.classList.add('cell-partial');
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

function desktopToggleEdit() {
    isEditing = !isEditing;
    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');

    if (isEditing) {
        editBtn.style.display = 'none';
        saveBtn.style.display = 'block';

        // Convert badges to inputs with smooth transition
        const currentRow = document.querySelector('.current-student-row');
        if (!currentRow) return;

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

        // Submit to database
        const result = await DatabaseHelper.submitWeeklyData(
            currentStudentId,
            currentWeek,
            activityCompletions
        );


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


    } catch (error) {
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
                    if (percentage >= 100) {
                        displayValue = 'Yes';
                        cellClass = 'cell-yes';
                    } else if (percentage >= 50) {
                        displayValue = 'Partial';
                        cellClass = 'cell-partial';
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

        // Get current activity IDs for accurate counting
        const currentActivityIds = activities.map(a => a.id);

        // Calculate stats - only count completions for current activities
        const totalWeeks = allMySubmissions.length;
        let totalCompletions = 0;
        let bestScore = 0;

        allMySubmissions.forEach(sub => {
            if (!sub.activity_completions) return;

            // Only count completions for current activities (must meet target)
            let score = 0;
            currentActivityIds.forEach(actId => {
                const activity = activities.find(a => a.id === actId);
                const value = sub.activity_completions[actId];
                const target = activity?.target || 1;
                if (value === true) {
                    score++;
                } else if (typeof value === 'number' && value >= target) {
                    score++;
                }
            });

            totalCompletions += score;
            if (score > bestScore) bestScore = Math.min(score, activities.length);
        });

        const avgCompletion = totalWeeks > 0 && activities.length > 0
            ? Math.min(Math.round((totalCompletions / (totalWeeks * activities.length)) * 100), 100)
            : 0;

        // Calculate streak
        const streak = calculateStreak(allMySubmissions);

        // Calculate rank
        const leaderboard = await DatabaseHelper.getLeaderboard(currentStudent.group_id);
        const myRank = leaderboard.findIndex(item => item.student?.id === currentStudentId) + 1;

        // Update UI
        document.getElementById('totalWeeks').textContent = totalWeeks;
        document.getElementById('completionRate').textContent = avgCompletion + '%';
        document.getElementById('bestScore').textContent = bestScore + '/' + activities.length;
        document.getElementById('currentStreak').textContent = streak;
        document.getElementById('streakCount').textContent = streak;
        // Rank is now displayed in header via visualizations.js updateHeaderRank()

    } catch (error) {
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
        // Get leaderboard for current student's group (overall averages)
        const leaderboard = await DatabaseHelper.getLeaderboard(currentStudent.group_id);
        console.log('[DEBUG] Leaderboard data:', leaderboard.map(l => ({ name: l.student?.name, percentage: l.percentage })));
        const container = document.getElementById('leaderboardList');
        container.innerHTML = '';

        // Limit to top 10
        const top10 = leaderboard.slice(0, 10);

        top10.forEach((item, index) => {
            const studentId = item.student?.id || item.id;
            const studentName = item.student?.name || item.name || 'Unknown';
            const isCurrentStudent = studentId == currentStudentId;
            const percentage = Math.round(item.percentage || 0);

            // Color code percentage: green >= 80%, yellow >= 50%, red < 50%
            let scoreColor = '#ef4444'; // red
            if (percentage >= 80) {
                scoreColor = '#10b981'; // green
            } else if (percentage >= 50) {
                scoreColor = '#fbbf24'; // yellow
            }

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
                <div class="leaderboard-score" style="color: ${scoreColor}; font-weight: 600;">${percentage}%</div>
                <div class="leaderboard-bar">
                    <div class="leaderboard-fill" style="width: ${percentage}%; background: ${scoreColor};"></div>
                </div>
            `;

            container.appendChild(div);
        });
    } catch (error) {
        console.error('[DEBUG] Leaderboard error:', error);
    }
}

async function loadTopPerformers() {
    try {
        const submissions = await DatabaseHelper.getAllSubmissionsForWeek(currentWeek, currentStudent.group_id);
        console.log('[DEBUG] Top Performers - Submissions for week', currentWeek, ':', submissions?.length || 0);

        // Get current activity IDs for accurate counting
        const currentActivityIds = activities.map(a => a.id);

        // Calculate scores for this week - only count current activities
        const performers = submissions.map(sub => {
            if (!sub.activity_completions) {
                return { student: sub.students, score: 0, percentage: 0 };
            }

            // Only count completions for current activities (must meet target)
            let score = 0;
            currentActivityIds.forEach(actId => {
                const activity = activities.find(a => a.id === actId);
                const value = sub.activity_completions[actId];
                const target = activity?.target || 1;
                if (value === true || (typeof value === 'number' && value >= target)) {
                    score++;
                }
            });

            const cappedScore = Math.min(score, activities.length);
            const percentage = activities.length > 0
                ? Math.min(Math.round((cappedScore / activities.length) * 100), 100)
                : 0;

            return {
                student: sub.students,
                score: cappedScore,
                percentage: percentage
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
    }
}

function changeWeek(direction) {
    // Parse currentWeek properly to avoid timezone issues
    const [year, month, day] = currentWeek.split('-').map(Number);
    const date = new Date(year, month - 1, day);
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
    const currentWeekStart = DatabaseHelper.getWeekStartDate();

    // Current week is ALWAYS allowed
    if (weekString === currentWeekStart) {
        return true;
    }

    // Parse the week string to compare
    const [year, month, day] = weekString.split('-').map(Number);
    const weekDate = new Date(year, month - 1, day);

    const [cYear, cMonth, cDay] = currentWeekStart.split('-').map(Number);
    const currentWeekDate = new Date(cYear, cMonth - 1, cDay);

    // Don't allow future weeks (weeks after current week)
    if (weekDate > currentWeekDate) {
        return false;
    }

    // Allow all past weeks up to current week
    return true;
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
        console.log('[DEBUG] Progress Chart - Submissions:', allMySubmissions?.length || 0);
        console.log('[DEBUG] Progress Chart - Activities:', activities?.length || 0);

        // Get current activity IDs for accurate counting
        const currentActivityIds = activities.map(a => a.id);

        // Get last 8 weeks
        const weeks = DatabaseHelper.getLastNWeeks(8).reverse();
        console.log('[DEBUG] Progress Chart - Looking for weeks:', weeks);
        console.log('[DEBUG] Progress Chart - Submission dates (normalized):', allMySubmissions?.map(s => DatabaseHelper.getWeekStartDate(new Date(s.week_start_date))));

        const weeklyScores = weeks.map(week => {
            const submission = allMySubmissions.find(sub => {
                // Normalize submission date to its week start (Monday) for proper matching
                const subWeek = DatabaseHelper.getWeekStartDate(new Date(sub.week_start_date));
                return subWeek === week;
            });

            if (!submission || !submission.activity_completions) return 0;
            if (activities.length === 0) return 0;

            // Only count completions for current activities (must meet target)
            let completions = 0;
            currentActivityIds.forEach(actId => {
                const activity = activities.find(a => a.id === actId);
                const value = submission.activity_completions[actId];
                const target = activity?.target || 1;
                if (value === true || (typeof value === 'number' && value >= target)) {
                    completions++;
                }
            });

            const percentage = Math.round((completions / activities.length) * 100);
            return Math.min(percentage, 100); // Cap at 100%
        });

        console.log('[DEBUG] Progress Chart - Weekly scores:', weeklyScores);

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
                layout: {
                    padding: {
                        top: 25 // Extra padding for points at 100%
                    }
                },
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
                        max: 110,
                        ticks: {
                            color: '#94a3b8',
                            callback: value => value <= 100 ? value + '%' : ''
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#94a3b8',
                            font: { size: 9 },
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('[DEBUG] Progress Chart error:', error);
    }
}

async function renderConsistencyChart() {
    try {
        const allMySubmissions = await DatabaseHelper.getAllSubmissionsForStudent(currentStudentId);
        console.log('[DEBUG] Consistency Chart - Submissions:', allMySubmissions?.length || 0);
        console.log('[DEBUG] Consistency Chart - Submission dates (normalized):', allMySubmissions?.map(s => DatabaseHelper.getWeekStartDate(new Date(s.week_start_date))));

        // Get current activity IDs for accurate counting
        const currentActivityIds = activities.map(a => a.id);

        // Get last 8 weeks
        const weeks = DatabaseHelper.getLastNWeeks(8).reverse();
        console.log('[DEBUG] Consistency Chart - Looking for weeks:', weeks);

        // Calculate completion count for each week (only for current activities)
        const completionRates = weeks.map(week => {
            const submission = allMySubmissions.find(sub => {
                // Normalize submission date to its week start (Monday) for proper matching
                const subWeek = DatabaseHelper.getWeekStartDate(new Date(sub.week_start_date));
                return subWeek === week;
            });

            if (!submission || !submission.activity_completions) return 0;

            // Only count completions for current activities (must meet target)
            let completions = 0;
            currentActivityIds.forEach(actId => {
                const activity = activities.find(a => a.id === actId);
                const value = submission.activity_completions[actId];
                const target = activity?.target || 1;
                if (value === true || (typeof value === 'number' && value >= target)) {
                    completions++;
                }
            });

            // Cap at max activities
            return Math.min(completions, activities.length);
        });

        console.log('[DEBUG] Consistency Chart - Completion rates:', completionRates);

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
        console.error('[DEBUG] Consistency Chart error:', error);
    }
}

async function renderGroupComparisonChart() {
    try {
        if (!currentStudent.group_id) return;

        // Use historical leaderboard data (all-time averages)
        const leaderboard = await DatabaseHelper.getLeaderboard(currentStudent.group_id);

        // Use first name only for compact display
        const studentNames = leaderboard.map(item => {
            const student = item.student;
            const firstName = student.name.split(' ')[0];
            return student.id == currentStudentId ? `${firstName} (You)` : firstName;
        });

        // Use average completion percentage (0-100)
        const scores = leaderboard.map(item => Math.round(item.percentage || 0));

        const ctx = document.getElementById('groupComparisonChart');
        if (!ctx) return;

        if (charts.comparison) {
            charts.comparison.destroy();
        }

        // Highlight current student's bar
        const backgroundColors = leaderboard.map(item =>
            item.student.id == currentStudentId ? '#8b5cf6' : 'rgba(139, 92, 246, 0.3)'
        );

        charts.comparison = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: studentNames,
                datasets: [{
                    label: 'Avg Completion %',
                    data: scores,
                    backgroundColor: backgroundColors,
                    borderColor: leaderboard.map(item =>
                        item.student.id == currentStudentId ? '#8b5cf6' : 'rgba(139, 92, 246, 0.5)'
                    ),
                    borderWidth: 1,
                    borderRadius: 4,
                    barThickness: 'flex',
                    maxBarThickness: 25
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // Horizontal bars - more compact
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
                        padding: 10,
                        callbacks: {
                            label: context => `${context.parsed.x}% average completion`
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: '#94a3b8',
                            callback: value => value + '%',
                            font: { size: 9 }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#e2e8f0',
                            font: { size: 10 }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('[DEBUG] Group Comparison error:', error);
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
        alert('Error saving your cetele. Please try again.');
    }
}

// Toggle edit - routes to mobile wizard or desktop editing
function toggleEdit() {
    if (isMobile()) {
        // Open mobile wizard instead of inline editing
        openMobileWizard();
    } else {
        // Use desktop inline editing
        desktopToggleEdit();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);
