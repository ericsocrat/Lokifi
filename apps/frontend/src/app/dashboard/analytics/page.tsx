'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import styles from './page.module.css';

// Type definitions matching backend schemas
interface UserGrowthMetrics {
  total_users: number;
  active_users: number;
  verified_users: number;
  new_users_today: number;
  new_users_week: number;
  new_users_month: number;
  growth_rate: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

interface UserActivityMetrics {
  daily_active_users: number;
  weekly_active_users: number;
  monthly_active_users: number;
  avg_session_duration: number;
  avg_sessions_per_user: number;
  retention_rate: number;
}

interface ContentMetrics {
  total_posts: number;
  total_comments: number;
  total_reactions: number;
  posts_today: number;
  posts_week: number;
  posts_month: number;
  avg_posts_per_user: number;
  content_growth_rate: number;
}

interface ModerationMetrics {
  total_flags: number;
  pending_flags: number;
  resolved_flags: number;
  dismissed_flags: number;
  appealed_flags: number;
  avg_resolution_time: number;
  flags_by_reason: { [key: string]: number };
  flags_by_status: { [key: string]: number };
  actions_by_type: { [key: string]: number };
}

interface SocialMetrics {
  total_follows: number;
  total_conversations: number;
  total_messages: number;
  messages_today: number;
  messages_week: number;
  conversations_today: number;
  avg_followers_per_user: number;
  avg_following_per_user: number;
  engagement_rate: number;
}

interface AIMetrics {
  total_threads: number;
  active_threads: number;
  total_messages: number;
  threads_today: number;
  threads_week: number;
  avg_messages_per_thread: number;
  avg_response_time: number;
  usage_by_provider: { [key: string]: number };
}

interface DashboardOverview {
  user_growth: UserGrowthMetrics;
  user_activity: UserActivityMetrics;
  content: ContentMetrics;
  moderation: ModerationMetrics;
  social: SocialMetrics;
  ai: AIMetrics;
  generated_at: string;
}

interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  label: string;
}

interface TimeSeriesMetrics {
  metric_name: string;
  period: string;
  data_points: TimeSeriesDataPoint[];
  total: number;
  average: number;
  peak: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

type MetricPeriod = 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ALL_TIME';

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [userGrowthTimeSeries, setUserGrowthTimeSeries] =
    useState<TimeSeriesMetrics | null>(null);
  const [period, setPeriod] = useState<MetricPeriod>('DAY');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch dashboard overview
  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/analytics/overview`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch overview: ${response.statusText}`);
      }

      const data = await response.json();
      setOverview(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user growth time series
  const fetchUserGrowthTimeSeries = async (selectedPeriod: MetricPeriod) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/analytics/timeseries/user-growth?period=${selectedPeriod}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch time series: ${response.statusText}`
        );
      }

      const data = await response.json();
      setUserGrowthTimeSeries(data);
    } catch (err) {
      console.error('Error fetching time series:', err);
    }
  };

  // Initial load and auto-refresh every 60 seconds
  useEffect(() => {
    fetchOverview();
    fetchUserGrowthTimeSeries(period);

    const interval = setInterval(
      () => {
        fetchOverview();
        fetchUserGrowthTimeSeries(period);
      },
      60000
    ); // 60 seconds

    return () => clearInterval(interval);
  }, [period]);

  // Handle manual refresh
  const handleRefresh = () => {
    fetchOverview();
    fetchUserGrowthTimeSeries(period);
  };

  // Handle period change
  const handlePeriodChange = (newPeriod: MetricPeriod) => {
    setPeriod(newPeriod);
    fetchUserGrowthTimeSeries(newPeriod);
  };

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Get trend icon and color
  const getTrendIndicator = (trend: 'UP' | 'DOWN' | 'STABLE') => {
    switch (trend) {
      case 'UP':
        return { icon: '↑', color: styles.trendUp };
      case 'DOWN':
        return { icon: '↓', color: styles.trendDown };
      case 'STABLE':
        return { icon: '→', color: styles.trendStable };
      default:
        return { icon: '→', color: styles.trendStable };
    }
  };

  if (loading && !overview) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Error Loading Analytics</h2>
          <p>{error}</p>
          <button onClick={handleRefresh} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Analytics Dashboard</h1>
          <p className={styles.subtitle}>
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className={styles.controls}>
          <select
            value={period}
            onChange={(e) =>
              handlePeriodChange(e.target.value as MetricPeriod)
            }
            className={styles.periodSelect}
          >
            <option value="HOUR">Last Hour</option>
            <option value="DAY">Last Day</option>
            <option value="WEEK">Last Week</option>
            <option value="MONTH">Last Month</option>
            <option value="YEAR">Last Year</option>
            <option value="ALL_TIME">All Time</option>
          </select>
          <button onClick={handleRefresh} className={styles.refreshButton}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      {overview && (
        <>
          <div className={styles.metricsGrid}>
            {/* User Growth Card */}
            <div className={styles.metricCard}>
              <div className={styles.cardHeader}>
                <h3>User Growth</h3>
                <span
                  className={
                    getTrendIndicator(overview.user_growth.trend).color
                  }
                >
                  {getTrendIndicator(overview.user_growth.trend).icon}{' '}
                  {overview.user_growth.growth_rate.toFixed(1)}%
                </span>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.mainStat}>
                  {formatNumber(overview.user_growth.total_users)}
                </div>
                <div className={styles.label}>Total Users</div>
                <div className={styles.subStats}>
                  <div>
                    <span className={styles.subValue}>
                      {formatNumber(overview.user_growth.active_users)}
                    </span>
                    <span className={styles.subLabel}>Active</span>
                  </div>
                  <div>
                    <span className={styles.subValue}>
                      {formatNumber(overview.user_growth.new_users_month)}
                    </span>
                    <span className={styles.subLabel}>New (Month)</span>
                  </div>
                  <div>
                    <span className={styles.subValue}>
                      {formatNumber(overview.user_growth.verified_users)}
                    </span>
                    <span className={styles.subLabel}>Verified</span>
                  </div>
                </div>
              </div>
            </div>

            {/* User Activity Card */}
            <div className={styles.metricCard}>
              <div className={styles.cardHeader}>
                <h3>User Activity</h3>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.mainStat}>
                  {formatNumber(overview.user_activity.monthly_active_users)}
                </div>
                <div className={styles.label}>MAU</div>
                <div className={styles.subStats}>
                  <div>
                    <span className={styles.subValue}>
                      {formatNumber(overview.user_activity.daily_active_users)}
                    </span>
                    <span className={styles.subLabel}>DAU</span>
                  </div>
                  <div>
                    <span className={styles.subValue}>
                      {formatNumber(overview.user_activity.weekly_active_users)}
                    </span>
                    <span className={styles.subLabel}>WAU</span>
                  </div>
                  <div>
                    <span className={styles.subValue}>
                      {overview.user_activity.retention_rate.toFixed(1)}%
                    </span>
                    <span className={styles.subLabel}>Retention</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Card */}
            <div className={styles.metricCard}>
              <div className={styles.cardHeader}>
                <h3>Content</h3>
                <span className={styles.trendUp}>
                  ↑ {overview.content.content_growth_rate.toFixed(1)}%
                </span>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.mainStat}>
                  {formatNumber(overview.content.total_posts)}
                </div>
                <div className={styles.label}>Total Posts</div>
                <div className={styles.subStats}>
                  <div>
                    <span className={styles.subValue}>
                      {formatNumber(overview.content.total_comments)}
                    </span>
                    <span className={styles.subLabel}>Comments</span>
                  </div>
                  <div>
                    <span className={styles.subValue}>
                      {formatNumber(overview.content.total_reactions)}
                    </span>
                    <span className={styles.subLabel}>Reactions</span>
                  </div>
                  <div>
                    <span className={styles.subValue}>
                      {formatNumber(overview.content.posts_month)}
                    </span>
                    <span className={styles.subLabel}>This Month</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Moderation Card */}
            <div className={styles.metricCard}>
              <div className={styles.cardHeader}>
                <h3>Moderation</h3>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.mainStat}>
                  {formatNumber(overview.moderation.total_flags)}
                </div>
                <div className={styles.label}>Total Flags</div>
                <div className={styles.subStats}>
                  <div>
                    <span className={styles.subValue}>
                      {formatNumber(overview.moderation.pending_flags)}
                    </span>
                    <span className={styles.subLabel}>Pending</span>
                  </div>
                  <div>
                    <span className={styles.subValue}>
                      {formatNumber(overview.moderation.resolved_flags)}
                    </span>
                    <span className={styles.subLabel}>Resolved</span>
                  </div>
                  <div>
                    <span className={styles.subValue}>
                      {overview.moderation.avg_resolution_time.toFixed(1)}h
                    </span>
                    <span className={styles.subLabel}>Avg Time</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Card */}
            <div className={styles.metricCard}>
              <div className={styles.cardHeader}>
                <h3>Social</h3>
                <span className={styles.trendUp}>
                  ↑ {overview.social.engagement_rate.toFixed(1)}%
                </span>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.mainStat}>
                  {formatNumber(overview.social.total_messages)}
                </div>
                <div className={styles.label}>Total Messages</div>
                <div className={styles.subStats}>
                  <div>
                    <span className={styles.subValue}>
                      {formatNumber(overview.social.total_conversations)}
                    </span>
                    <span className={styles.subLabel}>Conversations</span>
                  </div>
                  <div>
                    <span className={styles.subValue}>
                      {formatNumber(overview.social.total_follows)}
                    </span>
                    <span className={styles.subLabel}>Follows</span>
                  </div>
                  <div>
                    <span className={styles.subValue}>
                      {formatNumber(overview.social.messages_week)}
                    </span>
                    <span className={styles.subLabel}>This Week</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Card */}
            <div className={styles.metricCard}>
              <div className={styles.cardHeader}>
                <h3>AI Usage</h3>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.mainStat}>
                  {formatNumber(overview.ai.total_threads)}
                </div>
                <div className={styles.label}>Total Threads</div>
                <div className={styles.subStats}>
                  <div>
                    <span className={styles.subValue}>
                      {formatNumber(overview.ai.active_threads)}
                    </span>
                    <span className={styles.subLabel}>Active</span>
                  </div>
                  <div>
                    <span className={styles.subValue}>
                      {formatNumber(overview.ai.total_messages)}
                    </span>
                    <span className={styles.subLabel}>Messages</span>
                  </div>
                  <div>
                    <span className={styles.subValue}>
                      {overview.ai.avg_response_time.toFixed(1)}s
                    </span>
                    <span className={styles.subLabel}>Avg Response</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className={styles.chartsSection}>
            {/* User Growth Time Series */}
            {userGrowthTimeSeries && (
              <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <h3>User Registration Trend</h3>
                  <div className={styles.chartStats}>
                    <span>Total: {formatNumber(userGrowthTimeSeries.total)}</span>
                    <span>
                      Avg: {formatNumber(Math.round(userGrowthTimeSeries.average))}
                    </span>
                    <span>Peak: {formatNumber(userGrowthTimeSeries.peak)}</span>
                    <span
                      className={
                        getTrendIndicator(userGrowthTimeSeries.trend).color
                      }
                    >
                      {getTrendIndicator(userGrowthTimeSeries.trend).icon} Trend
                    </span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={userGrowthTimeSeries.data_points.map((point) => ({
                      date: new Date(point.timestamp).toLocaleDateString(),
                      users: point.value,
                      label: point.label,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(20, 20, 30, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="users"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="New Users"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Moderation Activity */}
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <h3>Moderation Activity</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    {
                      name: 'Pending',
                      count: overview.moderation.pending_flags,
                    },
                    {
                      name: 'Resolved',
                      count: overview.moderation.resolved_flags,
                    },
                    {
                      name: 'Dismissed',
                      count: overview.moderation.dismissed_flags,
                    },
                    {
                      name: 'Appealed',
                      count: overview.moderation.appealed_flags,
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(20, 20, 30, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="count" fill="#8b5cf6" name="Flags" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Social Engagement */}
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <h3>Social Engagement</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={[
                    {
                      name: 'Messages',
                      value: overview.social.total_messages,
                    },
                    {
                      name: 'Conversations',
                      value: overview.social.total_conversations,
                    },
                    { name: 'Follows', value: overview.social.total_follows },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(20, 20, 30, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="value"
                    fill="#8b5cf6"
                    stroke="#8b5cf6"
                    fillOpacity={0.6}
                    name="Count"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
