import React from 'react';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../services/storage';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckSquare, 
  Flame, 
  Award, 
  Sparkles,
  PieChart
} from 'lucide-react';

const AnalyticsView = () => {
  const { user, activityLog, tasks } = useApp();

  // 1. Calculate general statistics dynamically from tasks
  const totalCompleted = tasks.filter(t => t.completed || t.status === 'completed').length;
  const totalMissed = tasks.filter(t => t.expired || t.status === 'expired').length;
  const totalTasks = totalCompleted + totalMissed;
  const historicConsistency = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 100;
  
  // Calculate total hours spent from activity logs
  const totalHours = activityLog.reduce((acc, curr) => acc + (curr.hours || 0), 0);

  // 2. Format custom SVG line chart data
  // Use activityLog (reverse it to go chronologically Mon -> Sun)
  const cronLog = [...activityLog].reverse().slice(-7);
  
  // If insufficient data, fill with defaults
  while (cronLog.length < 7) {
    const dates = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    cronLog.unshift({
      date: dates[7 - cronLog.length - 1],
      completed: 0,
      total: 0,
      hours: 0
    });
  }

  // Calculate coordinates for SVG (viewBox 0 0 500 200)
  const maxVal = Math.max(3, ...cronLog.map(l => l.completed));
  const points = cronLog.map((log, index) => {
    const x = 30 + (index * 70); // x-axis step
    const y = 170 - ((log.completed / maxVal) * 130); // y-axis step
    return { x, y, label: log.date.split('-')[2] || log.date };
  });

  // Construct SVG Polyline path
  const pathData = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  // Area path for gradient fill
  const areaData = `${pathData} L ${points[points.length - 1].x} 170 L ${points[0].x} 170 Z`;

  // 3. Category distribution (from tasks list)
  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = tasks.filter(t => t.category === cat && (t.completed || t.status === 'completed')).length;
    return acc;
  }, {});
  
  const totalCatSum = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="analytics-view-container">
      {/* Analytics Title */}
      <header className="analytics-header glass-panel">
        <div className="analytics-title">
          <BarChart3 size={22} className="title-icon" />
          <h1>Productivity <span className="gradient-text">Analytics</span></h1>
          <p>Examine your daily consistency trends, category allocation metrics, and career milestones.</p>
        </div>
      </header>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card glass-panel">
          <div className="metric-icon icon-emerald"><CheckSquare size={20} /></div>
          <div className="metric-details">
            <span className="metric-label">Completed Tasks</span>
            <h3>{totalCompleted}</h3>
            <p className="metric-helper">Historical record</p>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-icon icon-blue"><Clock size={20} /></div>
          <div className="metric-details">
            <span className="metric-label">Productive Hours</span>
            <h3>{totalHours} hrs</h3>
            <p className="metric-helper">Time invested in goals</p>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-icon icon-orange"><Flame size={20} /></div>
          <div className="metric-details">
            <span className="metric-label">Urgency Consistency</span>
            <h3>{historicConsistency}%</h3>
            <p className="metric-helper">Completion vs. Expired ratio</p>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-icon icon-purple"><Award size={20} /></div>
          <div className="metric-details">
            <span className="metric-label">Gamification Level</span>
            <h3>Lvl {user.level}</h3>
            <p className="metric-helper">{user.xp} XP current level</p>
          </div>
        </div>
      </div>

      {/* Visual Charts section */}
      <div className="charts-flex-row">
        {/* Trend Area Chart (Custom SVG!) */}
        <div className="chart-box-card glass-panel">
          <div className="chart-title-block">
            <TrendingUp size={18} className="icon-blue" />
            <h3>7-Day Productivity Trend</h3>
          </div>
          <p className="chart-subtitle">Daily completed tasks count</p>

          <div className="svg-chart-container">
            <svg viewBox="0 0 500 200" className="svg-line-chart">
              {/* Grid Lines */}
              <line x1="30" y1="40" x2="450" y2="40" className="chart-grid-line" />
              <line x1="30" y1="105" x2="450" y2="105" className="chart-grid-line" />
              <line x1="30" y1="170" x2="450" y2="170" className="chart-grid-line" />

              {/* Area Gradient Fill */}
              {points.length > 0 && (
                <path d={areaData} fill="url(#chart-area-grad)" stroke="none" />
              )}

              {/* Line Curve */}
              {points.length > 0 && (
                <path d={pathData} className="chart-bezier-line" fill="none" strokeWidth="3" />
              )}

              {/* Data points & labels */}
              {points.map((p, idx) => (
                <g key={idx}>
                  <circle cx={p.x} cy={p.y} r="5" className="chart-dot-ring" />
                  <circle cx={p.x} cy={p.y} r="3" className="chart-dot-inner" />
                  
                  {/* Axis Text Label */}
                  <text x={p.x} y="192" textAnchor="middle" className="chart-axis-text">
                    {p.label}
                  </text>
                  
                  {/* Floating count numbers */}
                  <text x={p.x} y={p.y - 10} textAnchor="middle" className="chart-value-text">
                    {cronLog[idx].completed}
                  </text>
                </g>
              ))}

              <defs>
                <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-secondary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.00" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Category distribution */}
        <div className="chart-box-card glass-panel category-analytics-card">
          <div className="chart-title-block">
            <PieChart size={18} className="icon-purple" />
            <h3>Category Focus</h3>
          </div>
          <p className="chart-subtitle">Distribution of completed goals</p>

          <div className="category-density-list">
            {CATEGORIES.map(cat => {
              const count = categoryCounts[cat] || 0;
              const percent = totalCatSum > 0 ? Math.round((count / totalCatSum) * 100) : 0;
              
              return (
                <div key={cat} className="category-density-row">
                  <div className="cat-label-row">
                    <span className="cat-name">{cat}</span>
                    <span className="cat-values">{count} goals ({percent}%)</span>
                  </div>
                  <div className="density-bar-outer">
                    <div 
                      className={`density-bar-inner density-${cat.toLowerCase()}`}
                      style={{ width: `${percent || 2}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Badges and Milestones Section */}
      <section className="milestones-section glass-panel">
        <div className="section-title-wrapper">
          <Sparkles className="icon-orange animate-flame" size={20} />
          <h2>Unlocked Achievement Badges</h2>
        </div>
        <p className="section-subtitle-under">Celebrate your productivity milestones on GoalMate</p>

        <div className="badges-grid-layout">
          {user.badges && user.badges.map((badge) => (
            <div key={badge.id} className="badge-item-card">
              <span className="badge-logo-icon">{badge.icon}</span>
              <div className="badge-card-info">
                <h4>{badge.name}</h4>
                <p>{badge.description}</p>
              </div>
            </div>
          ))}

          {/* Locked Badge Demonstration */}
          <div className="badge-item-card badge-locked">
            <span className="badge-logo-icon">👑</span>
            <div className="badge-card-info">
              <h4>Consistency Monarch (Locked)</h4>
              <p>Maintain a consecutive 15-day task completion streak.</p>
            </div>
          </div>

          <div className="badge-item-card badge-locked">
            <span className="badge-logo-icon">🚀</span>
            <div className="badge-card-info">
              <h4>Career Champion (Locked)</h4>
              <p>Complete all interview stages and accept an internship offer.</p>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .analytics-view-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .analytics-header {
          padding: 28px;
        }

        .analytics-title h1 {
          font-size: 2.2rem;
          margin-bottom: 6px;
        }

        .analytics-title p {
          color: var(--text-secondary);
        }

        /* Metrics grid */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .metric-card {
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .metric-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .icon-emerald { background: rgba(16, 185, 129, 0.1); color: var(--success); }
        .icon-blue { background: rgba(56, 189, 248, 0.1); color: #38bdf8; }
        .icon-orange { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .icon-purple { background: rgba(167, 139, 250, 0.1); color: #a78bfa; }

        .metric-details {
          display: flex;
          flex-direction: column;
        }

        .metric-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .metric-details h3 {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 2px 0;
        }

        .metric-helper {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        /* Charts Flexrow */
        .charts-flex-row {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 24px;
        }

        .chart-box-card {
          padding: 28px;
        }

        .chart-title-block {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 2px;
        }

        .chart-subtitle {
          color: var(--text-secondary);
          font-size: 0.8rem;
          margin-bottom: 24px;
        }

        /* Custom SVG styling */
        .svg-chart-container {
          width: 100%;
          padding: 10px 0;
        }

        .svg-line-chart {
          width: 100%;
          height: auto;
          overflow: visible;
        }

        .chart-grid-line {
          stroke: var(--glass-border);
          stroke-width: 1;
          stroke-dasharray: 4 4;
        }

        .chart-bezier-line {
          stroke: var(--accent-secondary);
          stroke-linecap: round;
        }

        .chart-dot-ring {
          fill: var(--bg-primary);
          stroke: var(--accent-secondary);
          stroke-width: 2;
        }

        .chart-dot-inner {
          fill: var(--accent-secondary);
        }

        .chart-axis-text {
          font-size: 11px;
          fill: var(--text-secondary);
          font-weight: 500;
        }

        .chart-value-text {
          font-size: 10px;
          fill: var(--text-primary);
          font-weight: 700;
        }

        /* Category bars */
        .category-density-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .category-density-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .cat-label-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .cat-name { color: var(--text-primary); }
        .cat-values { color: var(--text-secondary); }

        .density-bar-outer {
          width: 100%;
          height: 6px;
          background: var(--bg-tertiary);
          border-radius: 99px;
          overflow: hidden;
        }

        .density-bar-inner {
          height: 100%;
          border-radius: 99px;
        }

        /* Unique category colors */
        .density-coding { background: var(--accent-primary); }
        .density-career { background: var(--accent-secondary); }
        .density-health { background: var(--success); }
        .density-work { background: #fb923c; }
        .density-habits { background: #facc15; }
        .density-general { background: var(--text-muted); }

        /* Badges Section */
        .milestones-section {
          padding: 28px;
        }

        .section-title-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .section-subtitle-under {
          color: var(--text-secondary);
          font-size: 0.85rem;
          margin-bottom: 24px;
        }

        .badges-grid-layout {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .badge-item-card {
          padding: 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .badge-logo-icon {
          font-size: 28px;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.15));
        }

        .badge-card-info h4 {
          font-size: 0.95rem;
          font-weight: 700;
          margin-bottom: 2px;
        }

        .badge-card-info p {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .badge-locked {
          opacity: 0.45;
          background: rgba(255, 255, 255, 0.005);
          border-style: dashed;
        }

        .badge-locked .badge-logo-icon {
          filter: grayscale(1);
        }

        @media (max-width: 1024px) {
          .charts-flex-row {
            grid-template-columns: 1fr;
          }

          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .badges-grid-layout {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .metrics-grid, .badges-grid-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default AnalyticsView;
