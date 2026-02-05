'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import styles from './page.module.css';

interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  status: string;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  changes: Record<string, unknown> | null;
  created_at: string;
  user?: {
    username: string;
    email: string;
  };
}

interface AuditLogResponse {
  total: number;
  entries: AuditLogEntry[];
  oldest_entry_at: string | null;
  newest_entry_at: string | null;
}

type AuditAction = 'create' | 'update' | 'delete' | 'view' | 'export';
type ResourceType = 'user' | 'content' | 'settings' | 'moderation' | 'analytics' | 'report' | 'api_key' | 'email_template';
type AuditStatus = 'success' | 'failure' | 'pending';

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  view: 'bg-gray-100 text-gray-800',
  export: 'bg-purple-100 text-purple-800',
};

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-green-100 text-green-800',
  failure: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
};

export default function AuditLogsPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [action, setAction] = useState<AuditAction | ''>('');
  const [resourceType, setResourceType] = useState<ResourceType | ''>('');
  const [status, setStatus] = useState<AuditStatus | ''>('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('offset', String((page - 1) * limit));
      params.append('limit', String(limit));

      if (action) params.append('action', action);
      if (resourceType) params.append('resource_type', resourceType);
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data: AuditLogResponse = await response.json();
      setEntries(data.entries);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, action, resourceType, status, search, startDate, endDate]);

  const totalPages = Math.ceil(total / limit);
  const canPreviousPage = page > 1;
  const canNextPage = page < totalPages;

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (action) params.append('action', action);
      if (resourceType) params.append('resource_type', resourceType);
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}&format=csv`);

      if (!response.ok) {
        throw new Error('Failed to export audit logs');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Audit Logs</h1>
        <p className={styles.subtitle}>Track all admin actions and system changes</p>
      </div>

      {error && (
        <div className={styles.errorAlert}>
          <div className={styles.errorText}>{error}</div>
        </div>
      )}

      <div className={styles.filterCard}>
        <div className={styles.filterHeader}>
          <h2 className={styles.filterTitle}>Filters</h2>
          <p className={styles.filterDescription}>Search and filter audit log entries</p>
        </div>

        <div className={styles.filterContent}>
          <div className={styles.filterGrid}>
            <div>
              <label className={styles.label}>Search</label>
              <input
                type="text"
                placeholder="User, IP, description..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className={styles.input}
              />
            </div>

            <div>
              <label className={styles.label}>Action</label>
              <select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value as AuditAction | '');
                  setPage(1);
                }}
                className={styles.select}
              >
                <option value="">All actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="view">View</option>
                <option value="export">Export</option>
              </select>
            </div>

            <div>
              <label className={styles.label}>Resource</label>
              <select
                value={resourceType}
                onChange={(e) => {
                  setResourceType(e.target.value as ResourceType | '');
                  setPage(1);
                }}
                className={styles.select}
              >
                <option value="">All resources</option>
                <option value="user">User</option>
                <option value="content">Content</option>
                <option value="settings">Settings</option>
                <option value="moderation">Moderation</option>
                <option value="analytics">Analytics</option>
                <option value="report">Report</option>
                <option value="api_key">API Key</option>
                <option value="email_template">Email Template</option>
              </select>
            </div>

            <div>
              <label className={styles.label}>Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as AuditStatus | '');
                  setPage(1);
                }}
                className={styles.select}
              >
                <option value="">All status</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div>
              <label className={styles.label}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className={styles.input}
              />
            </div>

            <div>
              <label className={styles.label}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.filterActions}>
            <button
              className={styles.button}
              onClick={() => {
                setAction('');
                setResourceType('');
                setStatus('');
                setSearch('');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
            >
              Reset Filters
            </button>

            <button
              className={`${styles.button} ${entries.length === 0 ? styles.buttonDisabled : ''}`}
              onClick={handleExport}
              disabled={entries.length === 0}
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className={styles.entriesCard}>
        <div className={styles.entriesHeader}>
          <h2 className={styles.entriesTitle}>Audit Log Entries</h2>
          <p className={styles.entriesDescription}>
            Showing {entries.length} of {total} entries
          </p>
        </div>

        <div className={styles.entriesContent}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
            </div>
          ) : entries.length === 0 ? (
            <div className={styles.empty}>
              No audit log entries found
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Admin</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th>IP Address</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <span className={`${styles.badge} ${ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-800'}`}>
                          {entry.action}
                        </span>
                      </td>
                      <td>
                        <div>
                          <div className={styles.resourceType}>{entry.resource_type}</div>
                          {entry.resource_id && (
                            <div className={styles.resourceId}>{entry.resource_id}</div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className={styles.username}>{entry.user?.username || 'Unknown'}</div>
                          <div className={styles.email}>{entry.user?.email || entry.user_id}</div>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${STATUS_COLORS[entry.status] || 'bg-gray-100 text-gray-800'}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className={styles.description}>
                        {entry.description || '-'}
                      </td>
                      <td className={styles.ip}>
                        {entry.ip_address || '-'}
                      </td>
                      <td className={styles.date}>
                        {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm:ss')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && entries.length > 0 && (
            <div className={styles.pagination}>
              <div className={styles.pageInfo}>
                Page {page} of {totalPages}
              </div>

              <div className={styles.pageButtons}>
                <button
                  className={`${styles.button} ${!canPreviousPage ? styles.buttonDisabled : ''}`}
                  onClick={() => setPage((p) => p - 1)}
                  disabled={!canPreviousPage}
                >
                  Previous
                </button>

                <button
                  className={`${styles.button} ${!canNextPage ? styles.buttonDisabled : ''}`}
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!canNextPage}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
