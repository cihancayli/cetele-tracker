// Mock Data for Development/Demo

const MOCK_DATA = {
    students: [
        { id: 1, name: 'Emma Thompson', grade: '10th', group_id: 1, created_at: new Date() },
        { id: 2, name: 'Oliver Chen', grade: '10th', group_id: 1, created_at: new Date() },
        { id: 3, name: 'Sophia Martinez', grade: '10th', group_id: 1, created_at: new Date() },
        { id: 4, name: 'Liam Johnson', grade: '10th', group_id: 2, created_at: new Date() },
        { id: 5, name: 'Ava Williams', grade: '11th', group_id: 2, created_at: new Date() },
        { id: 6, name: 'Noah Brown', grade: '11th', group_id: 2, created_at: new Date() },
        { id: 7, name: 'Isabella Garcia', grade: '11th', group_id: 3, created_at: new Date() },
        { id: 8, name: 'Ethan Davis', grade: '11th', group_id: 3, created_at: new Date() },
        { id: 9, name: 'Mia Rodriguez', grade: '12th', group_id: 3, created_at: new Date() },
        { id: 10, name: 'James Wilson', grade: '12th', group_id: 4, created_at: new Date() },
        { id: 11, name: 'Charlotte Moore', grade: '12th', group_id: 4, created_at: new Date() },
        { id: 12, name: 'Benjamin Taylor', grade: '12th', group_id: 4, created_at: new Date() },
    ],

    groups: [
        { id: 1, name: 'Group A', grade: '10th', created_at: new Date() },
        { id: 2, name: 'Group B', grade: '10th-11th', created_at: new Date() },
        { id: 3, name: 'Group C', grade: '11th', created_at: new Date() },
        { id: 4, name: 'Group D', grade: '12th', created_at: new Date() },
    ],

    activities: [
        { id: 1, name: 'Prayer 5 times daily', type: 'spiritual', order_index: 1 },
        { id: 2, name: 'Read Quran', type: 'spiritual', order_index: 2 },
        { id: 3, name: 'Physical Exercise', type: 'physical', order_index: 3 },
        { id: 4, name: 'Study/Homework', type: 'academic', order_index: 4 },
        { id: 5, name: 'Help Family', type: 'social', order_index: 5 },
        { id: 6, name: 'Good Deed', type: 'social', order_index: 6 },
        { id: 7, name: 'No Screen Before Bed', type: 'health', order_index: 7 },
    ],

    weeklySubmissions: [
        // This week - high performers
        { id: 1, student_id: 1, week_start_date: new Date(), activity_completions: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true }, created_at: new Date() },
        { id: 2, student_id: 2, week_start_date: new Date(), activity_completions: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: false, 7: true }, created_at: new Date() },
        { id: 3, student_id: 3, week_start_date: new Date(), activity_completions: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: false }, created_at: new Date() },
        { id: 4, student_id: 4, week_start_date: new Date(), activity_completions: { 1: true, 2: false, 3: true, 4: true, 5: true, 6: true, 7: true }, created_at: new Date() },
        { id: 5, student_id: 5, week_start_date: new Date(), activity_completions: { 1: true, 2: true, 3: true, 4: true, 5: false, 6: true, 7: true }, created_at: new Date() },
        { id: 6, student_id: 6, week_start_date: new Date(), activity_completions: { 1: true, 2: true, 3: false, 4: true, 5: true, 6: true, 7: true }, created_at: new Date() },
        { id: 7, student_id: 7, week_start_date: new Date(), activity_completions: { 1: true, 2: true, 3: true, 4: false, 5: true, 6: true, 7: true }, created_at: new Date() },
        { id: 8, student_id: 8, week_start_date: new Date(), activity_completions: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: false, 7: false }, created_at: new Date() },
        { id: 9, student_id: 9, week_start_date: new Date(), activity_completions: { 1: false, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true }, created_at: new Date() },
        { id: 10, student_id: 10, week_start_date: new Date(), activity_completions: { 1: true, 2: false, 3: true, 4: true, 5: true, 6: true, 7: false }, created_at: new Date() },
    ]
};

// Mock Database Helper
const MockDatabaseHelper = {
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

    getWeekStartDate() {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(today.setDate(diff));
    }
};

// Use mock data if DatabaseHelper is not available or for demo mode
if (typeof window !== 'undefined' && !window.DatabaseHelper) {
    window.DatabaseHelper = MockDatabaseHelper;
    console.log('📊 Using mock data for demo');
}
