// Additional Visualizations for Student Portal

// ==================== HEATMAP CALENDAR ====================

async function renderActivityHeatmap() {
    try {
        const allMySubmissions = await DatabaseHelper.getAllSubmissionsForStudent(currentStudentId);
        const container = document.getElementById('activityHeatmap');
        if (!container) return;

        // Get last 8 weeks of data
        const weeks = DatabaseHelper.getLastNWeeks(8).reverse();

        let html = '<div class="heatmap-grid">';

        // Day labels header
        html += '<div></div>'; // Empty corner
        const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        dayLabels.forEach(day => {
            html += `<div class="heatmap-day-label">${day}</div>`;
        });

        // Week rows
        weeks.forEach((weekStart, weekIndex) => {
            const submission = allMySubmissions.find(sub => {
                const subWeek = new Date(sub.week_start_date).toISOString().split('T')[0];
                return subWeek === weekStart;
            });

            let level = 0;
            if (submission) {
                const completed = Object.values(submission.activity_completions).filter(v => {
                    return (typeof v === 'number' && v > 0) || v === true;
                }).length;
                const percentage = (completed / activities.length) * 100;

                if (percentage === 0) level = 0;
                else if (percentage < 50) level = 1;
                else if (percentage < 75) level = 2;
                else if (percentage < 100) level = 3;
                else level = 4;
            }

            html += `<div class="heatmap-week-label">Week ${weekIndex + 1}</div>`;

            // Create 7 cells for each day of the week
            for (let day = 0; day < 7; day++) {
                const cellDate = new Date(weekStart);
                cellDate.setDate(cellDate.getDate() + day);
                const dateStr = cellDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                html += `<div class="heatmap-cell level-${level}"
                    title="${dateStr}: ${level === 0 ? 'No data' : level * 25 + '%'}"
                    data-date="${cellDate.toISOString()}"></div>`;
            }
        });

        html += '</div>';

        // Legend
        html += `
            <div class="heatmap-legend">
                <span>Less</span>
                <div class="heatmap-legend-box" style="background: rgba(255, 255, 255, 0.03);"></div>
                <div class="heatmap-legend-box" style="background: rgba(239, 68, 68, 0.3);"></div>
                <div class="heatmap-legend-box" style="background: rgba(251, 191, 36, 0.3);"></div>
                <div class="heatmap-legend-box" style="background: rgba(16, 185, 129, 0.3);"></div>
                <div class="heatmap-legend-box" style="background: rgba(16, 185, 129, 0.6);"></div>
                <span>More</span>
            </div>
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Error rendering activity heatmap:', error);
    }
}

// ==================== ACHIEVEMENT BADGES ====================

async function renderBadges() {
    try {
        const allMySubmissions = await DatabaseHelper.getAllSubmissionsForStudent(currentStudentId);
        const container = document.getElementById('badgesContainer');
        if (!container) return;

        // Calculate badge progress
        const streak = calculateStreak(allMySubmissions);
        const totalWeeks = allMySubmissions.length;

        let maxPagesInWeek = 0;
        let perfectWeeks = 0;
        let consistentWeeks = 0;

        allMySubmissions.forEach(sub => {
            const kitapPages = sub.activity_completions[1] || 0;
            const kuranPages = sub.activity_completions[4] || 0;
            const totalPages = kitapPages + kuranPages;

            if (totalPages > maxPagesInWeek) maxPagesInWeek = totalPages;

            const completed = Object.values(sub.activity_completions).filter(v => {
                return (typeof v === 'number' && v > 0) || v === true;
            }).length;
            const percentage = (completed / activities.length) * 100;

            if (percentage === 100) perfectWeeks++;
            if (percentage >= 80) consistentWeeks++;
        });

        const badges = [
            {
                icon: '🔥',
                name: '4-Week Streak',
                description: 'Complete 4 weeks in a row',
                progress: Math.min(streak, 4),
                target: 4,
                earned: streak >= 4
            },
            {
                icon: '📚',
                name: 'Book Worm',
                description: 'Read 150+ pages in one week',
                progress: Math.min(maxPagesInWeek, 150),
                target: 150,
                earned: maxPagesInWeek >= 150
            },
            {
                icon: '⭐',
                name: 'Perfect Week',
                description: '100% completion all activities',
                progress: perfectWeeks,
                target: 1,
                earned: perfectWeeks >= 1
            },
            {
                icon: '💪',
                name: 'Consistency Champion',
                description: '8 weeks of 80%+ completion',
                progress: consistentWeeks,
                target: 8,
                earned: consistentWeeks >= 8
            },
            {
                icon: '🎯',
                name: 'Completionist',
                description: 'Track for 12 weeks',
                progress: totalWeeks,
                target: 12,
                earned: totalWeeks >= 12
            },
            {
                icon: '⚡',
                name: 'Lightning Fast',
                description: '3 perfect weeks in a row',
                progress: 0,
                target: 3,
                earned: false
            }
        ];

        let html = '';
        badges.forEach(badge => {
            const progressPercent = Math.min((badge.progress / badge.target) * 100, 100);

            html += `
                <div class="badge-card ${badge.earned ? 'earned' : 'locked'}">
                    ${badge.earned ? '<div class="badge-earned-checkmark">✓</div>' : ''}
                    <div class="badge-icon">${badge.icon}</div>
                    <div class="badge-name">${badge.name}</div>
                    <div class="badge-description">${badge.description}</div>
                    ${!badge.earned ? `
                        <div class="badge-progress">
                            <div class="badge-progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <div class="badge-progress-text">${badge.progress} / ${badge.target}</div>
                    ` : ''}
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (error) {
        console.error('Error rendering badges:', error);
    }
}

// ==================== ACTIVITY BALANCE CHART ====================

async function renderActivityBalanceChart() {
    try {
        const allMySubmissions = await DatabaseHelper.getAllSubmissionsForStudent(currentStudentId);
        const ctx = document.getElementById('activityBalanceChart');
        if (!ctx) return;

        // Calculate average completion for each activity
        const activityTotals = {};
        activities.forEach(activity => {
            activityTotals[activity.id] = { total: 0, count: 0, name: activity.name };
        });

        allMySubmissions.forEach(sub => {
            activities.forEach(activity => {
                const value = sub.activity_completions[activity.id];
                if (activity.input_type === 'number' && value !== null && value !== undefined) {
                    const percentage = Math.min((value / activity.target) * 100, 100);
                    activityTotals[activity.id].total += percentage;
                    activityTotals[activity.id].count++;
                } else if (activity.input_type === 'checkbox') {
                    activityTotals[activity.id].total += (value === true ? 100 : 0);
                    activityTotals[activity.id].count++;
                }
            });
        });

        const labels = [];
        const data = [];

        activities.forEach(activity => {
            const avg = activityTotals[activity.id].count > 0
                ? activityTotals[activity.id].total / activityTotals[activity.id].count
                : 0;
            labels.push(activity.name);
            data.push(Math.round(avg));
        });

        if (charts.activityBalance) {
            charts.activityBalance.destroy();
        }

        charts.activityBalance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Average Completion %',
                    data: data,
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    borderColor: '#8b5cf6',
                    borderWidth: 2,
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
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: '#94a3b8',
                            stepSize: 20,
                            callback: value => value + '%'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        pointLabels: {
                            color: '#f8fafc',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
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
                        callbacks: {
                            label: context => `${context.parsed.r}% average completion`
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering activity balance chart:', error);
    }
}
