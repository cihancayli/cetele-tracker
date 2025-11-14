// Student Portal JavaScript

let currentStudentId = null;
let currentStudent = null;
let currentWeek = DatabaseHelper.getWeekStartDate();
let activities = [];
let selectedActivities = {};

// Initialize
async function init() {
    try {
        await loadActivities();
        await loadStudentsList();
        checkStoredStudent();
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

// Check if student is stored in localStorage
function checkStoredStudent() {
    const storedStudentId = localStorage.getItem('studentId');
    if (storedStudentId) {
        loadStoredStudent(storedStudentId);
    }
}

async function loadStoredStudent(studentId) {
    try {
        const student = await DatabaseHelper.getStudentById(studentId);
        if (student) {
            currentStudentId = studentId;
            currentStudent = student;
            document.getElementById('studentNameDisplay').textContent = student.name;
            document.getElementById('selectStudentSection').style.display = 'none';
            showSection('submit');
        }
    } catch (error) {
        console.error('Error loading stored student:', error);
        localStorage.removeItem('studentId');
    }
}

// Load students list for selection
async function loadStudentsList() {
    try {
        const students = await DatabaseHelper.getStudents();
        const select = document.getElementById('studentSelect');

        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            option.textContent = `${student.name} - ${student.grade}`;
            select.appendChild(option);
        });

        // Also populate group select for new student form
        const groups = await DatabaseHelper.getGroups();
        const groupSelect = document.getElementById('newStudentGroup');

        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = `${group.name} - ${group.grade}`;
            groupSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading students list:', error);
    }
}

// Select student
async function selectStudent() {
    const selectEl = document.getElementById('studentSelect');
    const studentId = selectEl.value;

    if (!studentId) return;

    try {
        const student = await DatabaseHelper.getStudentById(studentId);
        currentStudentId = studentId;
        currentStudent = student;

        // Store in localStorage
        localStorage.setItem('studentId', studentId);

        document.getElementById('studentNameDisplay').textContent = student.name;
        document.getElementById('selectStudentSection').style.display = 'none';
        showSection('submit');
    } catch (error) {
        console.error('Error selecting student:', error);
        alert('Error loading student data. Please try again.');
    }
}

// Show new student form
function showNewStudentForm() {
    document.getElementById('newStudentForm').style.display = 'block';
}

// Register new student
async function registerNewStudent() {
    try {
        const name = document.getElementById('newStudentName').value.trim();
        const grade = document.getElementById('newStudentGrade').value.trim();
        const groupId = document.getElementById('newStudentGroup').value || null;

        if (!name || !grade) {
            alert('Please enter your name and grade');
            return;
        }

        const student = await DatabaseHelper.createStudent(name, grade, groupId);
        currentStudentId = student.id;
        currentStudent = student;

        // Store in localStorage
        localStorage.setItem('studentId', student.id);

        document.getElementById('studentNameDisplay').textContent = student.name;
        document.getElementById('selectStudentSection').style.display = 'none';
        showSection('submit');

        // Reload students list
        await loadStudentsList();
    } catch (error) {
        console.error('Error registering student:', error);
        alert('Error creating student account. Please try again.');
    }
}

// Load activities
async function loadActivities() {
    try {
        activities = await DatabaseHelper.getActivities();

        // If no activities exist, create defaults
        if (activities.length === 0) {
            activities = await DatabaseHelper.initializeDefaultActivities();
        }
    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

// Section Navigation
function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });

    const section = document.getElementById(`${sectionName}Section`);
    if (section) {
        section.style.display = 'block';
    }

    switch (sectionName) {
        case 'submit':
            loadSubmitSection();
            break;
        case 'history':
            loadHistorySection();
            break;
    }
}

// ==================== SUBMIT SECTION ====================

async function loadSubmitSection() {
    if (!currentStudentId) {
        document.getElementById('selectStudentSection').style.display = 'block';
        document.getElementById('submitSection').style.display = 'none';
        return;
    }

    try {
        // Update week display
        document.getElementById('currentWeek').textContent = DatabaseHelper.formatDate(currentWeek);

        // Load existing submission if any
        const existingSubmission = await DatabaseHelper.getWeeklySubmission(currentStudentId, currentWeek);

        if (existingSubmission) {
            selectedActivities = existingSubmission.activity_completions;
        } else {
            selectedActivities = {};
            activities.forEach(activity => {
                selectedActivities[activity.name] = false;
            });
        }

        renderActivitiesForm();
        updateScore();
    } catch (error) {
        console.error('Error loading submit section:', error);
    }
}

function renderActivitiesForm() {
    const container = document.getElementById('activitiesForm');
    container.innerHTML = '';

    activities.forEach(activity => {
        const isChecked = selectedActivities[activity.name] === true;

        const item = document.createElement('div');
        item.className = `activity-item ${isChecked ? 'checked' : ''}`;
        item.onclick = () => toggleActivity(activity.name);

        item.innerHTML = `
            <div class="activity-checkbox"></div>
            <div class="activity-content">
                <div class="activity-name">${activity.name}</div>
                <div class="activity-description">${activity.description || ''}</div>
            </div>
        `;

        container.appendChild(item);
    });
}

function toggleActivity(activityName) {
    selectedActivities[activityName] = !selectedActivities[activityName];
    renderActivitiesForm();
    updateScore();
}

function updateScore() {
    const completedCount = Object.values(selectedActivities).filter(v => v === true).length;
    document.getElementById('currentScore').textContent = completedCount;
}

async function submitWeeklyData() {
    if (!currentStudentId) {
        alert('Please select your name first');
        return;
    }

    try {
        await DatabaseHelper.submitWeeklyData(currentStudentId, currentWeek, selectedActivities);

        // Show success animation
        showSuccessAnimation();

        // Show success message
        const messageEl = document.getElementById('submissionMessage');
        messageEl.textContent = 'Your progress has been saved successfully!';
        messageEl.className = 'message success';
        messageEl.style.display = 'block';

        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    } catch (error) {
        console.error('Error submitting data:', error);

        const messageEl = document.getElementById('submissionMessage');
        messageEl.textContent = 'Error saving your progress. Please try again.';
        messageEl.className = 'message error';
        messageEl.style.display = 'block';
    }
}

function showSuccessAnimation() {
    const overlay = document.getElementById('successOverlay');
    overlay.style.display = 'flex';

    setTimeout(() => {
        overlay.style.display = 'none';
    }, 2500);
}

// ==================== HISTORY SECTION ====================

async function loadHistorySection() {
    if (!currentStudentId) {
        alert('Please select your name first');
        showSection('submit');
        return;
    }

    try {
        const stats = await DatabaseHelper.getStudentStats(currentStudentId);
        const submissions = await DatabaseHelper.getAllSubmissionsForStudent(currentStudentId);

        // Update stats
        document.getElementById('totalWeeks').textContent = stats.totalWeeks;
        document.getElementById('totalCompletions').textContent = stats.totalCompletions;
        document.getElementById('avgCompletion').textContent = Math.round(stats.averageCompletion) + '%';

        const bestWeekScore = stats.weeklyScores.length > 0
            ? Math.max(...stats.weeklyScores.map(w => w.score))
            : 0;
        document.getElementById('bestWeek').textContent = bestWeekScore;

        // Render history
        renderHistory(submissions);

        // Show encouragement
        showEncouragement(stats);
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

function renderHistory(submissions) {
    const container = document.getElementById('historyContent');

    if (submissions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-dim);">No submissions yet. Start tracking your progress!</p>';
        return;
    }

    container.innerHTML = '';

    submissions.forEach(sub => {
        const score = Object.values(sub.activity_completions).filter(v => v === true).length;
        const percentage = Math.round((score / activities.length) * 100);

        const item = document.createElement('div');
        item.className = 'history-item';

        let activitiesHTML = '';
        activities.forEach(activity => {
            const completed = sub.activity_completions[activity.name];
            const icon = completed === true ? '✅' : completed === false ? '❌' : '➖';

            activitiesHTML += `
                <div class="history-activity">
                    <span class="history-activity-icon">${icon}</span>
                    <span>${activity.name}</span>
                </div>
            `;
        });

        item.innerHTML = `
            <div class="history-header">
                <div class="history-week">Week of ${DatabaseHelper.formatDate(sub.week_start_date)}</div>
                <div class="history-score">${score}/${activities.length} (${percentage}%)</div>
            </div>
            <div class="history-activities">
                ${activitiesHTML}
            </div>
        `;

        container.appendChild(item);
    });
}

function showEncouragement(stats) {
    const messageEl = document.getElementById('encouragementMessage');
    let message = '';

    const avgCompletion = Math.round(stats.averageCompletion);

    if (avgCompletion >= 90) {
        message = '🌟 Outstanding work! You\'re absolutely crushing it! Keep up this incredible momentum!';
    } else if (avgCompletion >= 75) {
        message = '🔥 Great job! You\'re doing really well. You\'re on the path to excellence!';
    } else if (avgCompletion >= 60) {
        message = '💪 Good effort! You\'re making solid progress. Keep pushing forward!';
    } else if (avgCompletion >= 40) {
        message = '📈 You\'re getting there! Every week is a new opportunity to improve. Stay committed!';
    } else if (stats.totalWeeks > 0) {
        message = '🌱 Every journey starts with a single step. You\'ve started - now keep building!';
    } else {
        message = '✨ Welcome! Start your journey today and watch yourself grow week by week!';
    }

    messageEl.innerHTML = `<p>${message}</p>`;
}

// ==================== LOGOUT ====================

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('studentId');
        currentStudentId = null;
        currentStudent = null;
        document.getElementById('selectStudentSection').style.display = 'block';
        document.getElementById('submitSection').style.display = 'none';
        document.getElementById('historySection').style.display = 'none';
        location.reload();
    }
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', init);
