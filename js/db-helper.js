// Database Helper Functions

// Skip if mock data is active
if (window.DatabaseHelper && window.DatabaseHelper.__isMock) {
    console.log('Skipping real DatabaseHelper - using mock data');
} else {

class DatabaseHelper {
    // ==================== AUTH & SESSION ====================

    static getCurrentUser() {
        const userStr = localStorage.getItem('cetele_user');
        return userStr ? JSON.parse(userStr) : null;
    }

    static getSessionStudentId() {
        return sessionStorage.getItem('studentId');
    }

    static async getUserRegion() {
        const user = this.getCurrentUser();
        if (!user || !user.region_id) return null;

        const { data, error } = await supabase
            .from('regions')
            .select('*')
            .eq('id', user.region_id)
            .single();

        if (error) throw error;
        return data;
    }

    // ==================== GROUPS ====================

    static async createGroup(name, grade, mentorId = null, regionId = null, division = null) {
        const { data, error } = await supabase
            .from('groups')
            .insert([{
                name,
                grade,
                mentor_id: mentorId,
                region_id: regionId,
                division: division
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async getGroups(regionId = null, division = null) {
        let query = supabase
            .from('groups')
            .select('*, users!groups_mentor_id_fkey(username)')
            .order('name');

        if (regionId) {
            query = query.eq('region_id', regionId);
        }

        if (division) {
            query = query.eq('division', division);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    }

    static async getGroupById(groupId) {
        const { data, error } = await supabase
            .from('groups')
            .select('*, students(*)')
            .eq('id', groupId)
            .single();

        if (error) throw error;
        return data;
    }

    // ==================== STUDENTS ====================

    static async createStudent(name, grade, groupId) {
        const { data, error } = await supabase
            .from('students')
            .insert([{ name, grade, group_id: groupId }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async getStudents(groupId = null, regionId = null) {
        let query = supabase
            .from('students')
            .select('*, groups(name, grade, division)')
            .order('name');

        if (groupId) {
            query = query.eq('group_id', groupId);
        }

        if (regionId) {
            query = query.eq('region_id', regionId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    }

    static async getStudentById(studentId) {
        const { data, error } = await supabase
            .from('students')
            .select('*, groups(*)')
            .eq('id', studentId)
            .single();

        if (error) throw error;
        return data;
    }

    // ==================== ACTIVITIES ====================

    static async createActivity(name, description, type, orderIndex) {
        const { data, error } = await supabase
            .from('activities')
            .insert([{ name, description, type, order_index: orderIndex }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async getActivities() {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .order('order_index');

        if (error) throw error;
        return data;
    }

    static async initializeDefaultActivities() {
        const defaultActivities = [
            { name: 'Kitap', description: '35 pages', type: 'reading', order_index: 1 },
            { name: 'Risale Sohbet 1', description: 'First session', type: 'discussion', order_index: 2 },
            { name: 'Risale Sohbet 2', description: 'Second session', type: 'discussion', order_index: 3 },
            { name: 'Kuran', description: '7 pages', type: 'reading', order_index: 4 },
            { name: 'Kaset/Video', description: '60 minutes', type: 'media', order_index: 5 },
            { name: 'Teheccud', description: '3 times', type: 'prayer', order_index: 6 },
            { name: 'SWB/Dhikr', description: '101/day', type: 'prayer', order_index: 7 }
        ];

        const { data, error } = await supabase
            .from('activities')
            .insert(defaultActivities)
            .select();

        if (error) throw error;
        return data;
    }

    // ==================== WEEKLY SUBMISSIONS ====================

    static async submitWeeklyData(studentId, weekStartDate, activityCompletions) {
        const { data, error } = await supabase
            .from('weekly_submissions')
            .upsert([{
                student_id: studentId,
                week_start_date: weekStartDate,
                activity_completions: activityCompletions
            }], {
                onConflict: 'student_id,week_start_date'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async getWeeklySubmission(studentId, weekStartDate) {
        const { data, error } = await supabase
            .from('weekly_submissions')
            .select('*')
            .eq('student_id', studentId)
            .eq('week_start_date', weekStartDate)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
        return data;
    }

    static async getAllSubmissionsForWeek(weekStartDate, groupId = null) {
        let query = supabase
            .from('weekly_submissions')
            .select('*, students(*, groups(*))')
            .eq('week_start_date', weekStartDate);

        const { data, error } = await query;

        if (error) throw error;

        // Filter by group if specified
        if (groupId && data) {
            return data.filter(sub => sub.students.group_id === groupId);
        }

        return data;
    }

    static async getAllSubmissionsForStudent(studentId) {
        const { data, error } = await supabase
            .from('weekly_submissions')
            .select('*')
            .eq('student_id', studentId)
            .order('week_start_date', { ascending: false });

        if (error) throw error;
        return data;
    }

    static async getAllSubmissions() {
        const { data, error } = await supabase
            .from('weekly_submissions')
            .select('*, students(*, groups(*))')
            .order('week_start_date', { ascending: false });

        if (error) throw error;
        return data;
    }

    // ==================== ANALYTICS ====================

    static async getStudentStats(studentId) {
        const submissions = await this.getAllSubmissionsForStudent(studentId);

        if (!submissions || submissions.length === 0) {
            return {
                totalWeeks: 0,
                totalCompletions: 0,
                averageCompletion: 0,
                weeklyScores: []
            };
        }

        const activities = await this.getActivities();
        const totalActivitiesPerWeek = activities.length;

        let totalCompletions = 0;
        const weeklyScores = submissions.map(sub => {
            const completions = Object.values(sub.activity_completions).filter(v => v === true).length;
            totalCompletions += completions;
            return {
                week: sub.week_start_date,
                score: completions,
                percentage: (completions / totalActivitiesPerWeek) * 100
            };
        });

        return {
            totalWeeks: submissions.length,
            totalCompletions,
            averageCompletion: (totalCompletions / (submissions.length * totalActivitiesPerWeek)) * 100,
            weeklyScores
        };
    }

    static async getGroupStats(groupId, weekStartDate = null) {
        const students = await this.getStudents(groupId);
        const activities = await this.getActivities();
        const totalActivitiesPerWeek = activities.length;

        const statsPromises = students.map(async student => {
            if (weekStartDate) {
                const submission = await this.getWeeklySubmission(student.id, weekStartDate);
                const score = submission ?
                    Object.values(submission.activity_completions).filter(v => v === true).length : 0;
                return {
                    student,
                    score,
                    percentage: (score / totalActivitiesPerWeek) * 100
                };
            } else {
                const stats = await this.getStudentStats(student.id);
                return {
                    student,
                    ...stats
                };
            }
        });

        return Promise.all(statsPromises);
    }

    static async getLeaderboard(groupId = null, weekStartDate = null) {
        let students;

        if (groupId) {
            students = await this.getStudents(groupId);
        } else {
            students = await this.getStudents();
        }

        const activities = await this.getActivities();
        const totalActivitiesPerWeek = activities.length;

        const leaderboardPromises = students.map(async student => {
            if (weekStartDate) {
                const submission = await this.getWeeklySubmission(student.id, weekStartDate);
                const score = submission ?
                    Object.values(submission.activity_completions).filter(v => v === true).length : 0;
                return {
                    student,
                    score,
                    percentage: (score / totalActivitiesPerWeek) * 100
                };
            } else {
                const stats = await this.getStudentStats(student.id);
                return {
                    student,
                    score: stats.totalCompletions,
                    percentage: stats.averageCompletion
                };
            }
        });

        const leaderboard = await Promise.all(leaderboardPromises);
        return leaderboard.sort((a, b) => b.score - a.score);
    }

    // ==================== UTILITIES ====================

    static getWeekStartDate(date = new Date()) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when Sunday
        const monday = new Date(d.setDate(diff));
        return monday.toISOString().split('T')[0];
    }

    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    static getLastNWeeks(n) {
        const weeks = [];
        const today = new Date();

        for (let i = 0; i < n; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - (i * 7));
            weeks.push(this.getWeekStartDate(date));
        }

        return weeks;
    }
}

// Close the else block
}
