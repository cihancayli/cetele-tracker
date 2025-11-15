// Mock Data for Development/Demo - FULL REALISTIC DATA

// Helper to get date N weeks ago
function getWeeksAgo(weeks) {
    const date = new Date();
    date.setDate(date.getDate() - (weeks * 7));
    return date.toISOString().split('T')[0];
}

const MOCK_DATA = {
    students: [
        // Group A - 10th Grade (5 students)
        { id: 1, name: 'Emma Thompson', grade: '10th', group_id: 1, created_at: new Date() },
        { id: 2, name: 'Oliver Chen', grade: '10th', group_id: 1, created_at: new Date() },
        { id: 3, name: 'Sophia Martinez', grade: '10th', group_id: 1, created_at: new Date() },
        { id: 4, name: 'Lucas Anderson', grade: '10th', group_id: 1, created_at: new Date() },
        { id: 5, name: 'Mia Patel', grade: '10th', group_id: 1, created_at: new Date() },

        // Group B - 11th Grade (6 students)
        { id: 6, name: 'Liam Johnson', grade: '11th', group_id: 2, created_at: new Date() },
        { id: 7, name: 'Ava Williams', grade: '11th', group_id: 2, created_at: new Date() },
        { id: 8, name: 'Noah Brown', grade: '11th', group_id: 2, created_at: new Date() },
        { id: 9, name: 'Isabella Garcia', grade: '11th', group_id: 2, created_at: new Date() },
        { id: 10, name: 'Ethan Davis', grade: '11th', group_id: 2, created_at: new Date() },
        { id: 11, name: 'Amelia Wilson', grade: '11th', group_id: 2, created_at: new Date() },

        // Group C - 12th Grade (5 students)
        { id: 12, name: 'James Rodriguez', grade: '12th', group_id: 3, created_at: new Date() },
        { id: 13, name: 'Charlotte Moore', grade: '12th', group_id: 3, created_at: new Date() },
        { id: 14, name: 'Benjamin Taylor', grade: '12th', group_id: 3, created_at: new Date() },
        { id: 15, name: 'Harper Lee', grade: '12th', group_id: 3, created_at: new Date() },
        { id: 16, name: 'Elijah Kim', grade: '12th', group_id: 3, created_at: new Date() },

        // Group D - Mixed (4 students)
        { id: 17, name: 'Aisha Hassan', grade: '10th', group_id: 4, created_at: new Date() },
        { id: 18, name: 'Muhammad Ali', grade: '11th', group_id: 4, created_at: new Date() },
        { id: 19, name: 'Fatima Ahmed', grade: '11th', group_id: 4, created_at: new Date() },
        { id: 20, name: 'Yusuf Ibrahim', grade: '12th', group_id: 4, created_at: new Date() },
    ],

    groups: [
        { id: 1, name: 'Eagles - 10th Grade', grade: '10th', mentor_id: null, created_at: new Date() },
        { id: 2, name: 'Hawks - 11th Grade', grade: '11th', mentor_id: null, created_at: new Date() },
        { id: 3, name: 'Falcons - 12th Grade', grade: '12th', mentor_id: null, created_at: new Date() },
        { id: 4, name: 'Phoenix - Mixed', grade: 'Mixed', mentor_id: null, created_at: new Date() },
    ],

    activities: [
        { id: 1, name: 'Kitap', description: '35 pages', type: 'reading', order_index: 1 },
        { id: 2, name: 'Risale Sohbet 1', description: 'First session', type: 'discussion', order_index: 2 },
        { id: 3, name: 'Risale Sohbet 2', description: 'Second session', type: 'discussion', order_index: 3 },
        { id: 4, name: 'Kuran', description: '7 pages', type: 'reading', order_index: 4 },
        { id: 5, name: 'Kaset/Video', description: '60 minutes', type: 'media', order_index: 5 },
        { id: 6, name: 'Teheccud', description: '3 times', type: 'prayer', order_index: 6 },
        { id: 7, name: 'SWB/Dhikr', description: '101/day', type: 'prayer', order_index: 7 },
    ],

    weeklySubmissions: []  // Will be generated below
};

// Generate realistic submission data for the past 8 weeks
const weeklySubmissions = [];
let submissionId = 1;

for (let weekOffset = 0; weekOffset < 8; weekOffset++) {
    const weekDate = getWeeksAgo(weekOffset);

    MOCK_DATA.students.forEach(student => {
        // Create varied completion patterns
        const completionRate = Math.random();
        const isHighPerformer = student.id % 3 === 0; // Every 3rd student is high performer
        const isStruggling = student.id % 7 === 0; // Every 7th student struggles

        let completions = {};

        // Generate realistic activity completion
        for (let activityId = 1; activityId <= 7; activityId++) {
            let shouldComplete;

            if (isHighPerformer) {
                shouldComplete = Math.random() > 0.1; // 90% completion rate
            } else if (isStruggling) {
                shouldComplete = Math.random() > 0.6; // 40% completion rate
            } else {
                shouldComplete = Math.random() > 0.3; // 70% completion rate
            }

            // More recent weeks have slightly better completion
            if (weekOffset < 2) {
                shouldComplete = shouldComplete || (Math.random() > 0.7);
            }

            completions[activityId] = shouldComplete;
        }

        weeklySubmissions.push({
            id: submissionId++,
            student_id: student.id,
            week_start_date: weekDate,
            activity_completions: completions,
            created_at: new Date(weekDate)
        });
    });
}

MOCK_DATA.weeklySubmissions = weeklySubmissions;

// Mock Database Helper
const MockDatabaseHelper = {
    __isMock: true,

    async getStudents(groupFilter = null) {
        let students = [...MOCK_DATA.students];
        if (groupFilter) {
            students = students.filter(s => s.group_id == groupFilter);
        }
        return students;
    },

    async getGroups() {
        return [...MOCK_DATA.groups];
    },

    async getActivities() {
        return [...MOCK_DATA.activities];
    },

    async getWeeklySubmissions(weekStartDate, groupFilter = null) {
        let submissions = MOCK_DATA.weeklySubmissions.filter(sub => {
            const subDate = new Date(sub.week_start_date);
            const compareDate = new Date(weekStartDate);
            return subDate.toDateString() === compareDate.toDateString();
        });

        if (groupFilter) {
            const groupStudents = MOCK_DATA.students.filter(s => s.group_id == groupFilter).map(s => s.id);
            submissions = submissions.filter(sub => groupStudents.includes(sub.student_id));
        }

        return submissions;
    },

    async getLeaderboard(groupFilter = null, limit = 10) {
        const students = await this.getStudents(groupFilter);
        const submissions = await this.getWeeklySubmissions(new Date());

        const leaderboard = students.map(student => {
            const submission = submissions.find(s => s.student_id === student.id);
            let score = 0;
            if (submission) {
                score = Object.values(submission.activity_completions).filter(Boolean).length;
            }
            return {
                ...student,
                score,
                total_activities: MOCK_DATA.activities.length
            };
        });

        leaderboard.sort((a, b) => b.score - a.score);
        return leaderboard.slice(0, limit);
    },

    getWeekStartDate(date = new Date()) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return monday.toISOString().split('T')[0];
    },

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    async getStudentById(studentId) {
        const student = MOCK_DATA.students.find(s => s.id == studentId);
        if (!student) return null;

        // Add group information
        const group = MOCK_DATA.groups.find(g => g.id === student.group_id);
        return {
            ...student,
            groups: group
        };
    },

    async getWeeklySubmission(studentId, weekStartDate) {
        const submission = MOCK_DATA.weeklySubmissions.find(sub => {
            const subDate = new Date(sub.week_start_date);
            const compareDate = new Date(weekStartDate);
            return sub.student_id == studentId &&
                   subDate.toDateString() === compareDate.toDateString();
        });
        return submission || null;
    },

    async submitWeeklyData(studentId, weekStartDate, activityCompletions) {
        // Normalize the date string
        const weekDateStr = weekStartDate instanceof Date ? weekStartDate.toDateString() : new Date(weekStartDate).toDateString();

        // Find existing submission
        const existingIndex = MOCK_DATA.weeklySubmissions.findIndex(sub => {
            const subDate = new Date(sub.week_start_date);
            return sub.student_id == studentId && subDate.toDateString() === weekDateStr;
        });

        const submission = {
            id: existingIndex >= 0 ? MOCK_DATA.weeklySubmissions[existingIndex].id : MOCK_DATA.weeklySubmissions.length + 1,
            student_id: parseInt(studentId),
            week_start_date: new Date(weekStartDate),
            activity_completions: activityCompletions,
            created_at: new Date()
        };

        console.log('📝 Submitting:', {
            studentId,
            weekDateStr,
            existingIndex,
            activityCompletions,
            submission
        });

        if (existingIndex >= 0) {
            MOCK_DATA.weeklySubmissions[existingIndex] = submission;
            console.log('✏️ Updated existing submission at index', existingIndex);
        } else {
            MOCK_DATA.weeklySubmissions.push(submission);
            console.log('➕ Added new submission');
        }

        console.log('📦 All submissions now:', MOCK_DATA.weeklySubmissions.length);

        return submission;
    },

    async getAllSubmissionsForWeek(weekStartDate, groupId = null) {
        let submissions = MOCK_DATA.weeklySubmissions.filter(sub => {
            const subDate = new Date(sub.week_start_date);
            const compareDate = new Date(weekStartDate);
            return subDate.toDateString() === compareDate.toDateString();
        });

        // Add student and group data to submissions
        submissions = submissions.map(sub => {
            const student = MOCK_DATA.students.find(s => s.id === sub.student_id);
            const group = student ? MOCK_DATA.groups.find(g => g.id === student.group_id) : null;
            return {
                ...sub,
                students: student ? { ...student, groups: group } : null
            };
        });

        // Filter by group if specified
        if (groupId) {
            submissions = submissions.filter(sub => sub.students?.group_id == groupId);
        }

        return submissions;
    },

    async getAllSubmissionsForStudent(studentId) {
        return MOCK_DATA.weeklySubmissions
            .filter(sub => sub.student_id == studentId)
            .sort((a, b) => new Date(b.week_start_date) - new Date(a.week_start_date));
    },

    getLastNWeeks(n) {
        const weeks = [];
        const today = new Date();

        for (let i = 0; i < n; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - (i * 7));
            weeks.push(this.getWeekStartDate(date));
        }

        return weeks;
    },

    // Auth & Session Methods (for production code compatibility)
    getCurrentUser() {
        const userStr = localStorage.getItem('cetele_user');
        return userStr ? JSON.parse(userStr) : null;
    },

    getSessionStudentId() {
        return sessionStorage.getItem('studentId');
    },

    async getUserRegion() {
        // Return mock region for demo
        return {
            id: 'demo-region-id',
            name: 'Demo Region',
            ed_code: 'DEMO-ED',
            hs_code: 'DEMO-HS',
            ms_code: 'DEMO-MS'
        };
    }
};

// Debug mode - Check URL parameter or localStorage
function isDebugMode() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('debug') === 'true' || localStorage.getItem('cetele_debug') === 'true';
}

// Enable debug mode from console: enableDebugMode()
window.enableDebugMode = function() {
    localStorage.setItem('cetele_debug', 'true');
    console.log('✅ Debug mode enabled! Reload the page to use mock data.');
    console.log('To disable: disableDebugMode()');
};

window.disableDebugMode = function() {
    localStorage.removeItem('cetele_debug');
    console.log('❌ Debug mode disabled! Reload the page to use real data.');
};

// Use mock data in debug mode - Override DatabaseHelper immediately
if (typeof window !== 'undefined') {
    if (isDebugMode()) {
        // Store the real DatabaseHelper if it exists
        if (window.DatabaseHelper) {
            window.RealDatabaseHelper = window.DatabaseHelper;
        }

        // Override with mock data
        window.DatabaseHelper = MockDatabaseHelper;

        console.log('%c📊 MOCK DATA MODE ACTIVE', 'background: #8b5cf6; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold;');
        console.log('Students:', MOCK_DATA.students.length);
        console.log('Groups:', MOCK_DATA.groups.length);
        console.log('Activities:', MOCK_DATA.activities.length);
        console.log('Submissions:', MOCK_DATA.weeklySubmissions.length);
        console.log('%cTo disable: disableDebugMode() or click the sidebar button', 'color: #8b5cf6; font-style: italic;');
    } else {
        console.log('%cTo enable mock data:', 'color: #8b5cf6; font-weight: bold;');
        console.log('  1. Click "Toggle Mock Data" in sidebar');
        console.log('  2. Type: enableDebugMode()');
        console.log('  3. Add ?debug=true to URL');
    }
}
