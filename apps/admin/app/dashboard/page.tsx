/**
 * Dashboard Overview Page
 * Session 188: Admin dashboard home with system metrics
 */

'use client';

import './page.css';

interface StatCard {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
}

const stats: StatCard[] = [
  { label: 'Active Users', value: '128,540', change: '+12.5%', trend: 'up' },
  { label: 'Daily Trades', value: '42,110', change: '+8.2%', trend: 'up' },
  { label: 'API Requests', value: '3.1M', change: '+15.3%', trend: 'up' },
  { label: 'Alerts', value: '18,902', change: '-5.1%', trend: 'down' },
];

const activities = [
  {
    id: 1,
    type: 'user',
    message: 'New user registration: john.doe@example.com',
    time: '2 minutes ago',
  },
  {
    id: 2,
    type: 'alert',
    message: 'Rate limit exceeded for API key: api_xyz123',
    time: '8 minutes ago',
  },
  {
    id: 3,
    type: 'system',
    message: 'Database backup completed successfully',
    time: '15 minutes ago',
  },
  {
    id: 4,
    type: 'security',
    message: 'Failed login attempt from IP: 192.168.1.100',
    time: '23 minutes ago',
  },
  {
    id: 5,
    type: 'user',
    message: 'User verification completed: jane.smith@example.com',
    time: '34 minutes ago',
  },
];

export default function DashboardPage(): JSX.Element {
  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Dashboard Overview</h1>
        <p className="page-subtitle">
          Real-time metrics and platform health monitoring
        </p>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
            <div className={`stat-change ${stat.trend}`}>
              <span className="change-icon">
                {stat.trend === 'up' ? '↑' : '↓'}
              </span>
              <span>{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="content-grid">
        <div className="content-card">
          <div className="card-header">
            <h2>Recent Activity</h2>
            <button className="refresh-button" type="button">
              🔄 Refresh
            </button>
          </div>
          <div className="activity-list">
            {activities.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className={`activity-icon ${activity.type}`}>
                  {activity.type === 'user' && '👤'}
                  {activity.type === 'alert' && '⚠️'}
                  {activity.type === 'system' && '⚙️'}
                  {activity.type === 'security' && '🛡️'}
                </div>
                <div className="activity-content">
                  <div className="activity-message">{activity.message}</div>
                  <div className="activity-time">{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="content-card">
          <div className="card-header">
            <h2>System Status</h2>
          </div>
          <div className="status-list">
            <div className="status-item">
              <div className="status-label">API Server</div>
              <div className="status-badge operational">Operational</div>
            </div>
            <div className="status-item">
              <div className="status-label">Database</div>
              <div className="status-badge operational">Operational</div>
            </div>
            <div className="status-item">
              <div className="status-label">Redis Cache</div>
              <div className="status-badge operational">Operational</div>
            </div>
            <div className="status-item">
              <div className="status-label">WebSocket</div>
              <div className="status-badge operational">Operational</div>
            </div>
            <div className="status-item">
              <div className="status-label">Email Service</div>
              <div className="status-badge operational">Operational</div>
            </div>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <button className="action-button" type="button">
            <span className="action-icon">👥</span>
            <span className="action-label">Manage Users</span>
          </button>
          <button className="action-button" type="button">
            <span className="action-icon">📊</span>
            <span className="action-label">View Analytics</span>
          </button>
          <button className="action-button" type="button">
            <span className="action-icon">🔑</span>
            <span className="action-label">API Keys</span>
          </button>
          <button className="action-button" type="button">
            <span className="action-icon">⚙️</span>
            <span className="action-label">System Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
