// Mock Data for Development/Demo - FULL REALISTIC DATA

// Helper to get Monday of the week N weeks ago
function getWeeksAgo(weeks) {
    const date = new Date();
    date.setDate(date.getDate() - (weeks * 7));

    // Normalize to Monday (same logic as getWeekStartDate)
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));

    // Format as YYYY-MM-DD using local date (not UTC)
    const yyyy = monday.getFullYear();
    const mm = String(monday.getMonth() + 1).padStart(2, '0');
    const dd = String(monday.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
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
        { id: 1, name: 'Kitap', description: '35 pages', type: 'reading', target: 35, unit: 'pages', order_index: 1, input_type: 'number' },
        { id: 2, name: 'Risale Sohbet 1', description: 'First session', type: 'discussion', target: 1, unit: 'session', order_index: 2, input_type: 'checkbox' },
        { id: 3, name: 'Risale Sohbet 2', description: 'Second session', type: 'discussion', target: 1, unit: 'session', order_index: 3, input_type: 'checkbox' },
        { id: 4, name: 'Kuran', description: '7 pages', type: 'reading', target: 7, unit: 'pages', order_index: 4, input_type: 'number' },
        { id: 5, name: 'Kaset/Video', description: '60 minutes', type: 'media', target: 60, unit: 'minutes', order_index: 5, input_type: 'number' },
        { id: 6, name: 'Teheccud', description: '3 times', type: 'prayer', target: 3, unit: 'times', order_index: 6, input_type: 'number' },
        { id: 7, name: 'SWB/Dhikr', description: '101/day', type: 'prayer', target: 101, unit: 'per day', order_index: 7, input_type: 'number' },
    ],

    weeklySubmissions: []  // Will be generated below
};

// Seeded random number generator for consistent mock data
function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// Generate realistic submission data for the past 3 weeks only (for demo)
const weeklySubmissions = [];
let submissionId = 1;
let seedCounter = 1;

// Store the valid week range for navigation limits
const DEMO_WEEKS_COUNT = 3;

for (let weekOffset = 0; weekOffset < DEMO_WEEKS_COUNT; weekOffset++) {
    const weekDate = getWeeksAgo(weekOffset);

    MOCK_DATA.students.forEach(student => {
        // Create varied completion patterns based on student ID (deterministic)
        const isHighPerformer = student.id % 3 === 0; // Every 3rd student is high performer
        const isStruggling = student.id % 7 === 0; // Every 7th student struggles

        let completions = {};

        // Generate realistic activity completion with seeded random
        MOCK_DATA.activities.forEach(activity => {
            // Create a unique seed for each student/week/activity combination
            const seed = student.id * 1000 + weekOffset * 100 + activity.id;
            const rand = seededRandom(seed);

            if (activity.input_type === 'number') {
                // For number inputs, generate realistic values
                let percentage;

                if (isHighPerformer) {
                    percentage = 0.85 + (rand * 0.2); // 85-105%
                } else if (isStruggling) {
                    percentage = 0.2 + (rand * 0.4); // 20-60%
                } else {
                    percentage = 0.5 + (rand * 0.4); // 50-90%
                }

                // More recent weeks have slightly better completion
                if (weekOffset < 2) {
                    percentage = Math.min(1.1, percentage + 0.1);
                }

                // Calculate actual value based on target
                const value = Math.round(activity.target * percentage);
                completions[activity.id] = Math.max(0, value);
            } else {
                // For checkboxes, use boolean
                let shouldComplete;

                if (isHighPerformer) {
                    shouldComplete = rand > 0.1; // 90% completion rate
                } else if (isStruggling) {
                    shouldComplete = rand > 0.6; // 40% completion rate
                } else {
                    shouldComplete = rand > 0.3; // 70% completion rate
                }

                // More recent weeks have slightly better completion
                if (weekOffset < 2) {
                    const rand2 = seededRandom(seed + 500);
                    shouldComplete = shouldComplete || (rand2 > 0.7);
                }

                completions[activity.id] = shouldComplete;
            }
        });

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

// Mock Database Helper - exposed to window for demo pages
window.MockDatabaseHelper = {
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

    async createGroup(name, grade) {
        const newGroup = {
            id: MOCK_DATA.groups.length + 1,
            name,
            grade,
            mentor_id: null,
            created_at: new Date()
        };
        MOCK_DATA.groups.push(newGroup);
        return newGroup;
    },

    async getGroupStats(groupId, weekStartDate = null) {
        const students = await this.getStudents(groupId);
        const currentWeek = weekStartDate || this.getWeekStartDate(new Date());
        const activities = MOCK_DATA.activities;
        const totalActivities = activities.length;

        const stats = [];
        for (const student of students) {
            const submission = await this.getWeeklySubmission(student.id, currentWeek);
            let score = 0;
            if (submission) {
                // Count completions properly - check against target for numeric values
                activities.forEach(activity => {
                    const value = submission.activity_completions[activity.id];
                    if (value === true) {
                        score++;
                    } else if (typeof value === 'number' && value >= activity.target) {
                        score++;
                    }
                });
            }
            const percentage = totalActivities > 0 ? (score / totalActivities) * 100 : 0;
            stats.push({
                student,
                score,
                percentage
            });
        }
        return stats;
    },

    async getActivities(groupId = null) {
        // In demo mode, all activities are shared across groups
        return [...MOCK_DATA.activities];
    },

    async getActivitiesForGroup(groupId) {
        // In demo mode, all activities are shared across groups
        return [...MOCK_DATA.activities];
    },

    async getAllActivities() {
        return [...MOCK_DATA.activities];
    },

    async createActivity(name, description, inputType, orderIndex, target = null, unit = null, groupId = null) {
        const newActivity = {
            id: 'mock-' + Date.now(),
            name,
            description,
            input_type: inputType,
            order_index: orderIndex,
            target,
            unit,
            group_id: groupId,
            created_at: new Date()
        };
        MOCK_DATA.activities.push(newActivity);
        console.log('📋 Mock: Created activity', newActivity);
        return newActivity;
    },

    async getWeeklySubmissions(weekStartDate, groupFilter = null) {
        let submissions = MOCK_DATA.weeklySubmissions.filter(sub => {
            // Compare as ISO date strings to avoid timezone issues
            const subDateStr = typeof sub.week_start_date === 'string'
                ? sub.week_start_date
                : sub.week_start_date.toISOString().split('T')[0];
            const compareDateStr = typeof weekStartDate === 'string'
                ? weekStartDate
                : new Date(weekStartDate).toISOString().split('T')[0];
            return subDateStr === compareDateStr;
        });

        if (groupFilter) {
            const groupStudents = MOCK_DATA.students.filter(s => s.group_id == groupFilter).map(s => s.id);
            submissions = submissions.filter(sub => groupStudents.includes(sub.student_id));
        }

        return submissions;
    },

    async getLeaderboard(groupFilter = null, limit = 10) {
        const students = await this.getStudents(groupFilter);
        const activities = MOCK_DATA.activities;
        const totalActivities = activities.length;

        // Get last N weeks (up to 4, or however many exist)
        const allWeeks = this.getLastNWeeks(4);
        const weeksWithData = [];

        // Check which weeks have any submissions
        for (const week of allWeeks) {
            const subs = await this.getWeeklySubmissions(week);
            if (subs.length > 0) {
                weeksWithData.push(week);
            }
        }

        // Use 1-4 weeks based on available data
        const weeksToUse = weeksWithData.slice(0, Math.min(4, weeksWithData.length));
        const numWeeks = weeksToUse.length || 1;

        const leaderboard = await Promise.all(students.map(async student => {
            let totalPercentage = 0;
            let weeksWithSubmission = 0;

            for (const week of weeksToUse) {
                const submission = await this.getWeeklySubmission(student.id, week);
                if (submission) {
                    let score = 0;
                    activities.forEach(activity => {
                        const value = submission.activity_completions[activity.id];
                        if (value === true) {
                            score++;
                        } else if (typeof value === 'number' && value >= activity.target) {
                            score++;
                        }
                    });
                    const weekPercentage = totalActivities > 0 ? (score / totalActivities) * 100 : 0;
                    totalPercentage += weekPercentage;
                    weeksWithSubmission++;
                }
            }

            // Average percentage over weeks with submissions
            const avgPercentage = weeksWithSubmission > 0 ? totalPercentage / weeksWithSubmission : 0;
            const avgScore = Math.round((avgPercentage / 100) * totalActivities);

            return {
                student: student,
                score: avgScore,
                percentage: avgPercentage,
                weeksCount: weeksWithSubmission
            };
        }));

        leaderboard.sort((a, b) => b.percentage - a.percentage);
        return leaderboard.slice(0, limit);
    },

    getWeekStartDate(date = new Date()) {
        let d;
        // Handle string dates to avoid timezone issues
        if (typeof date === 'string') {
            const [year, month, day] = date.split('-').map(Number);
            d = new Date(year, month - 1, day);
        } else {
            d = new Date(date);
        }
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        // Format as YYYY-MM-DD using local date (not UTC)
        const yyyy = monday.getFullYear();
        const mm = String(monday.getMonth() + 1).padStart(2, '0');
        const dd = String(monday.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
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
            // Compare as ISO date strings to avoid timezone issues
            const subDateStr = typeof sub.week_start_date === 'string'
                ? sub.week_start_date
                : sub.week_start_date.toISOString().split('T')[0];
            const compareDateStr = typeof weekStartDate === 'string'
                ? weekStartDate
                : new Date(weekStartDate).toISOString().split('T')[0];
            return sub.student_id == studentId && subDateStr === compareDateStr;
        });
        return submission || null;
    },

    async submitWeeklyData(studentId, weekStartDate, activityCompletions) {
        // Normalize to ISO date string
        const weekDateStr = typeof weekStartDate === 'string'
            ? weekStartDate
            : new Date(weekStartDate).toISOString().split('T')[0];

        // Find existing submission
        const existingIndex = MOCK_DATA.weeklySubmissions.findIndex(sub => {
            const subDateStr = typeof sub.week_start_date === 'string'
                ? sub.week_start_date
                : sub.week_start_date.toISOString().split('T')[0];
            return sub.student_id == studentId && subDateStr === weekDateStr;
        });

        const submission = {
            id: existingIndex >= 0 ? MOCK_DATA.weeklySubmissions[existingIndex].id : MOCK_DATA.weeklySubmissions.length + 1,
            student_id: parseInt(studentId),
            week_start_date: weekDateStr, // Store as string
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
        console.log('🔎 getAllSubmissionsForWeek called with:', weekStartDate);
        console.log('📦 Total submissions in MOCK_DATA:', MOCK_DATA.weeklySubmissions.length);

        // Log all available week dates
        const availableWeeks = [...new Set(MOCK_DATA.weeklySubmissions.map(s => s.week_start_date))];
        console.log('📅 Available weeks in mock data:', availableWeeks);

        let submissions = MOCK_DATA.weeklySubmissions.filter(sub => {
            // Compare as ISO date strings to avoid timezone issues
            const subDateStr = typeof sub.week_start_date === 'string'
                ? sub.week_start_date
                : sub.week_start_date.toISOString().split('T')[0];
            const compareDateStr = typeof weekStartDate === 'string'
                ? weekStartDate
                : new Date(weekStartDate).toISOString().split('T')[0];

            const matches = subDateStr === compareDateStr;
            return matches;
        });

        console.log('🎯 Matched submissions:', submissions.length);

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

    async getStudentStats(studentId) {
        const submissions = await this.getAllSubmissionsForStudent(studentId);
        const activities = MOCK_DATA.activities;
        const totalActivities = activities.length;

        if (!submissions || submissions.length === 0) {
            return {
                totalWeeks: 0,
                totalCompletions: 0,
                averageCompletion: 0,
                weeklyScores: []
            };
        }

        let totalCompletions = 0;
        const weeklyScores = submissions.map(sub => {
            // Count completions properly - check against target for numeric values
            let completions = 0;
            activities.forEach(activity => {
                const value = sub.activity_completions[activity.id];
                if (value === true) {
                    completions++;
                } else if (typeof value === 'number' && value >= activity.target) {
                    completions++;
                }
            });
            totalCompletions += completions;
            return {
                week: sub.week_start_date,
                score: completions,
                percentage: totalActivities > 0 ? (completions / totalActivities) * 100 : 0
            };
        });

        const averageCompletion = weeklyScores.length > 0
            ? weeklyScores.reduce((sum, w) => sum + w.percentage, 0) / weeklyScores.length
            : 0;

        return {
            totalWeeks: submissions.length,
            totalCompletions,
            averageCompletion,
            weeklyScores
        };
    },

    async getAllSubmissions() {
        // Return all submissions with student and group data joined
        return MOCK_DATA.weeklySubmissions.map(sub => {
            const student = MOCK_DATA.students.find(s => s.id === sub.student_id);
            const group = student ? MOCK_DATA.groups.find(g => g.id === student.group_id) : null;
            return {
                ...sub,
                students: student ? { ...student, groups: group } : null
            };
        });
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
    },

    // Demo navigation limits
    getValidWeekRange() {
        const currentWeekStart = this.getWeekStartDate(new Date());
        const oldestWeekStart = getWeeksAgo(DEMO_WEEKS_COUNT - 1);
        return {
            newest: currentWeekStart,  // Current week (can't go to future)
            oldest: oldestWeekStart,   // 3 weeks ago
            weeksCount: DEMO_WEEKS_COUNT
        };
    },

    isValidWeek(weekDate) {
        const range = this.getValidWeekRange();
        const checkDate = typeof weekDate === 'string' ? weekDate : this.getWeekStartDate(new Date(weekDate));
        return checkDate >= range.oldest && checkDate <= range.newest;
    },

    canNavigate(currentWeekDate, direction) {
        // Parse date string correctly to avoid timezone issues
        let current;
        if (typeof currentWeekDate === 'string') {
            const [year, month, day] = currentWeekDate.split('-').map(Number);
            current = new Date(year, month - 1, day);
        } else {
            current = new Date(currentWeekDate);
        }
        const targetDate = new Date(current);
        targetDate.setDate(targetDate.getDate() + (direction * 7));
        const targetWeek = this.getWeekStartDate(targetDate);
        console.log('🧭 canNavigate: current=', currentWeekDate, 'direction=', direction, 'target=', targetWeek);
        return this.isValidWeek(targetWeek);
    }
};

// Debug mode - ONLY enabled for demo pages (demo.html, admin-demo.html, student-demo.html)
function isDebugMode() {
    // Only enable mock mode for demo pages
    const path = window.location.pathname;
    return path.includes('demo.html') || path.includes('-demo.html');
}

// Use mock data in debug mode - Override DatabaseHelper for demo pages only
if (typeof window !== 'undefined' && (isDebugMode() || window.__FORCE_MOCK__)) {
    // Set flag for demo mode
    window.__DEMO_MODE__ = true;

    // Override DatabaseHelper immediately (before db-helper.js loads)
    window.DatabaseHelper = window.MockDatabaseHelper;

    // Also override after DOM loads in case db-helper.js overwrites it
    document.addEventListener('DOMContentLoaded', function() {
        window.DatabaseHelper = window.MockDatabaseHelper;
    });
}
