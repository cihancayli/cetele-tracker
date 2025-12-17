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
    }
}

// ==================== ACHIEVEMENT BADGES (TROPHY-BASED) ====================

// Trophy calculation: 100% = 10, 90% = 8, 80% = 6, 70% = 4, <70% = 2, no submission = -5
function calculateTrophiesForWeek(submission, hasSubmission = true) {
    if (!hasSubmission || !submission) return -5; // Penalty for missing week
    if (!submission.activity_completions) return -5;

    let completed = 0;
    activities.forEach(activity => {
        const value = submission.activity_completions[activity.id];
        if (value === true || (typeof value === 'number' && value >= activity.target)) {
            completed++;
        }
    });

    const percentage = (completed / activities.length) * 100;

    if (percentage >= 100) return 10;
    if (percentage >= 90) return 8;
    if (percentage >= 80) return 6;
    if (percentage >= 70) return 4;
    return 2;
}

// Rank definitions (trophy-based)
const RANKS = [
    { name: 'İskelet Talebe', image: 'IskeletMuridleri.png', requirement: 0, description: 'Starting rank' },
    { name: 'İskelet Muridi', image: 'IskeletBeyi.png', requirement: 10, description: '10 trophies' },
    { name: 'Goblin Sâliki', image: 'GoblinSaliki.webp', requirement: 25, description: '25 trophies' },
    { name: 'Minion Dervişleri', image: 'MinionDervisleri.png', requirement: 40, description: '40 trophies' },
    { name: 'Talebe-i Ceryan', image: 'Talebe-iCeryan.png', requirement: 55, description: '55 trophies' },
    { name: 'Electro Talebe', image: 'Electro.png', requirement: 70, description: '70 trophies' },
    { name: 'Şövalye Ağası', image: 'SovalyeAgasi.png', requirement: 90, description: '90 trophies' },
    { name: 'Hisar Padişahı', image: 'HisarPadisahi.png', requirement: 110, description: '110 trophies' },
    { name: 'Talebe-i Nur', image: 'Talebe-iNur.png', requirement: 130, description: '130 trophies' },
    { name: 'Üstat Hog', image: 'UstatHog.png', requirement: 145, description: '145 trophies' },
    { name: 'Pırlanta Talebe', image: 'PirlantaTalebe.png', requirement: 160, description: '160 trophies (max)' }
];

function getCurrentRank(trophies) {
    let currentRank = null;
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (trophies >= RANKS[i].requirement) {
            currentRank = RANKS[i];
            break;
        }
    }
    return currentRank;
}

async function renderBadges() {
    try {
        const allMySubmissions = await DatabaseHelper.getAllSubmissionsForStudent(currentStudentId);
        const container = document.getElementById('badgesContainer');
        if (!container) return;

        // Calculate total trophies
        let totalTrophies = 0;
        allMySubmissions.forEach(sub => {
            totalTrophies += calculateTrophiesForWeek(sub);
        });

        // Find current rank and next rank
        let currentRank = getCurrentRank(totalTrophies);
        let nextRank = RANKS[0];

        for (let i = RANKS.length - 1; i >= 0; i--) {
            if (totalTrophies >= RANKS[i].requirement) {
                nextRank = RANKS[i + 1] || null;
                break;
            }
        }

        // If no rank yet, next is first rank
        if (!currentRank) {
            nextRank = RANKS[0];
        }

        // Update header rank display
        updateHeaderRank(currentRank, totalTrophies);

        let html = '';

        // Trophy help overlay (will be shown on click)
        html += `
            <div id="trophyHelpOverlay" class="trophy-help-overlay" onclick="closeTrophyHelp(event)">
                <div class="trophy-help-popup" onclick="event.stopPropagation()">
                    <div class="trophy-help-close" onclick="closeTrophyHelp()">&times;</div>
                    <div class="trophy-help-title">Weekly Trophies</div>
                    <div class="trophy-help-row"><span>100%</span><span>+10</span></div>
                    <div class="trophy-help-row"><span>90%</span><span>+8</span></div>
                    <div class="trophy-help-row"><span>80%</span><span>+6</span></div>
                    <div class="trophy-help-row"><span>70%</span><span>+4</span></div>
                    <div class="trophy-help-row"><span>&lt;70%</span><span>+2</span></div>
                    <div class="trophy-help-row penalty"><span>Missed</span><span>-5</span></div>
                </div>
            </div>
        `;

        // LEFT COLUMN - Current Rank + Progress
        html += `<div class="rank-left-column">`;

        // Current Rank Display
        html += `
            <div class="current-rank-display">
                <div class="rank-label">Current Rank</div>
                ${currentRank ? `
                    <img src="assets/${currentRank.image}" alt="${currentRank.name}" class="rank-image current">
                    <div class="rank-name">${currentRank.name}</div>
                ` : `
                    <div class="rank-image-placeholder">?</div>
                    <div class="rank-name">No Rank Yet</div>
                `}
                <div class="rank-stat">
                    <img src="assets/trophycrown.png" alt="trophy" class="trophy-icon-small">
                    ${totalTrophies}
                    <div class="trophy-help-wrapper">
                        <span class="trophy-help-icon" onclick="openTrophyHelp()">?</span>
                    </div>
                </div>
            </div>
        `;

        // Next Rank Progress
        if (nextRank) {
            const progress = currentRank
                ? ((totalTrophies - currentRank.requirement) / (nextRank.requirement - currentRank.requirement)) * 100
                : (totalTrophies / nextRank.requirement) * 100;
            const trophiesNeeded = nextRank.requirement - totalTrophies;

            html += `
                <div class="next-rank-progress">
                    <div class="next-rank-header">
                        <span>Next Rank</span>
                        <span class="weeks-needed">
                            <img src="assets/trophycrown.png" alt="trophy" class="trophy-icon-tiny">
                            ${trophiesNeeded} to go
                        </span>
                    </div>
                    <div class="next-rank-info">
                        <img src="assets/${nextRank.image}" alt="${nextRank.name}" class="rank-image next">
                        <div class="next-rank-details">
                            <div class="next-rank-name">${nextRank.name}</div>
                            <div class="next-rank-req">${nextRank.description}</div>
                            <div class="rank-progress-bar">
                                <div class="rank-progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="max-rank-achieved">
                    <div class="max-rank-text">🏆 Maximum rank achieved!</div>
                </div>
            `;
        }

        html += `</div>`; // Close rank-left-column

        // RIGHT COLUMN - All Ranks
        html += `<div class="rank-right-column">`;
        html += `<div class="all-ranks-label">All Ranks</div>`;
        html += `<div class="all-ranks-grid">`;
        RANKS.forEach((rank, index) => {
            const isEarned = totalTrophies >= rank.requirement;
            const isCurrent = currentRank && currentRank.name === rank.name;
            html += `
                <div class="rank-badge-container ${isEarned ? 'earned' : 'locked'} ${isCurrent ? 'current' : ''}" title="${rank.description}">
                    <div class="rank-badge">
                        <img src="assets/${rank.image}" alt="${rank.name}" class="rank-badge-image ${isEarned ? '' : 'grayscale'}">
                        ${isCurrent ? '<div class="current-indicator"></div>' : ''}
                    </div>
                    <div class="rank-badge-name">${rank.name}</div>
                </div>
            `;
        });
        html += `</div>`;
        html += `</div>`; // Close rank-right-column

        container.innerHTML = html;
    } catch (error) {
        console.error('Error rendering badges:', error);
    }
}

function updateHeaderRank(currentRank, totalTrophies) {
    const headerIcon = document.getElementById('headerRankIcon');
    const headerName = document.getElementById('headerRankName');

    if (headerIcon && headerName) {
        if (currentRank) {
            headerIcon.src = `assets/${currentRank.image}`;
            headerIcon.alt = currentRank.name;
            headerIcon.style.display = 'inline-block';
            headerName.innerHTML = `${currentRank.name} <img src="assets/trophycrown.png" class="trophy-icon-tiny" alt=""> ${totalTrophies}`;
        } else {
            headerIcon.style.display = 'none';
            headerName.textContent = 'No Rank';
        }
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
                            display: false, // Hide the percentage labels inside
                            stepSize: 25
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.08)'
                        },
                        angleLines: {
                            color: 'rgba(255, 255, 255, 0.08)'
                        },
                        pointLabels: {
                            color: '#e2e8f0',
                            font: {
                                size: 10,
                                weight: '500'
                            },
                            padding: 8
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
    }
}

// ==================== TROPHY HELP POPUP ====================

function openTrophyHelp() {
    const overlay = document.getElementById('trophyHelpOverlay');
    if (overlay) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scroll
    }
}

function closeTrophyHelp(event) {
    // If called from overlay click, only close if clicking the overlay itself
    if (event && event.target !== event.currentTarget) return;

    const overlay = document.getElementById('trophyHelpOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = ''; // Restore scroll
    }
}

// Close on escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeTrophyHelp();
    }
});
