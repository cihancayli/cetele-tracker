// Database Helper Functions

// Skip if mock data is active
if (window.DatabaseHelper && window.DatabaseHelper.__isMock) {
} else {

window.DatabaseHelper = class DatabaseHelper {
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

        if (!studentId) {
            return null;
        }

        const { data, error } = await supabase
            .from('students')
            .select('*, groups(*)')
            .eq('id', studentId)
            .single();

        if (error) {
            // Don't throw on PGRST116 (no rows found) - just return null
            if (error.code === 'PGRST116') {
                return null;
            }
            throw error;
        }

        return data;
    }

    // ==================== ACTIVITIES ====================

    static async createActivity(name, description, inputType, orderIndex, target = null, unit = null, groupId = null) {
        const activityData = {
            name,
            description,
            input_type: inputType,
            order_index: orderIndex,
            target,
            unit,
            group_id: groupId
        };

        const { data, error} = await supabase
            .from('activities')
            .insert([activityData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async updateActivity(id, name, description, inputType, orderIndex, target = null, unit = null) {
        const { data, error } = await supabase
            .from('activities')
            .update({
                name,
                description,
                input_type: inputType,
                order_index: orderIndex,
                target,
                unit
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async deleteActivity(id) {
        const { data, error } = await supabase
            .from('activities')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return data;
    }

    static async getActivities(groupId = null) {
        let query = supabase
            .from('activities')
            .select('*');

        // If groupId is provided, filter to show only:
        // 1. Activities specific to this group (group_id = groupId)
        // 2. Global activities (group_id is null) - only if no group-specific ones exist
        if (groupId) {
            // First, get group-specific activities
            query = query.eq('group_id', groupId);
        }

        query = query.order('order_index');

        const { data, error } = await query;

        if (error) throw error;
        return data;
    }

    // Get activities for a student's group (only group-specific activities)
    static async getActivitiesForGroup(groupId) {
        if (!groupId) {
            return [];
        }

        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('group_id', groupId)
            .order('order_index');

        if (error) throw error;

        return data || [];
    }

    // Get all activities (global + group-specific) - for admin views
    static async getAllActivities() {
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

        // Get student to find their group
        const student = await this.getStudentById(studentId);
        const groupId = student?.group_id;

        // Get activities for the student's group
        const activities = groupId ? await this.getActivitiesForGroup(groupId) : [];
        const totalActivitiesPerWeek = activities.length;

        // If no activities, return 0
        if (totalActivitiesPerWeek === 0) {
            return {
                totalWeeks: submissions.length,
                totalCompletions: 0,
                averageCompletion: 0,
                weeklyScores: submissions.map(sub => ({
                    week: sub.week_start_date,
                    score: 0,
                    percentage: 0
                }))
            };
        }

        let totalCompletions = 0;
        const weeklyScores = submissions.map(sub => {
            if (!sub.activity_completions) {
                return { week: sub.week_start_date, score: 0, percentage: 0 };
            }

            // Count completions properly - both checkbox (true) and number (>= target)
            let completions = 0;
            activities.forEach(activity => {
                const value = sub.activity_completions[activity.id];
                const target = activity.target || 1;
                if (value === true || (typeof value === 'number' && value >= target)) {
                    completions++;
                }
            });

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

        // Get activities for the specific group
        const activities = groupId ? await this.getActivitiesForGroup(groupId) : [];
        const totalActivitiesPerWeek = activities.length;

        // If no activities, return students with 0 scores
        if (totalActivitiesPerWeek === 0) {
            return students.map(student => ({
                student,
                score: 0,
                percentage: 0
            }));
        }

        const leaderboardPromises = students.map(async student => {
            if (weekStartDate) {
                // Weekly leaderboard - count completions for specific week
                const submission = await this.getWeeklySubmission(student.id, weekStartDate);
                if (!submission || !submission.activity_completions) {
                    return { student, score: 0, percentage: 0 };
                }

                // Count completions properly - both checkbox and number
                let score = 0;
                activities.forEach(activity => {
                    const value = submission.activity_completions[activity.id];
                    const target = activity.target || 1;
                    if (value === true || (typeof value === 'number' && value >= target)) {
                        score++;
                    }
                });

                return {
                    student,
                    score,
                    percentage: (score / totalActivitiesPerWeek) * 100
                };
            } else {
                // Historical leaderboard - use average from all submissions
                const stats = await this.getStudentStats(student.id);
                return {
                    student,
                    score: stats.totalCompletions,
                    percentage: stats.averageCompletion
                };
            }
        });

        const leaderboard = await Promise.all(leaderboardPromises);
        return leaderboard.sort((a, b) => b.percentage - a.percentage);
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
