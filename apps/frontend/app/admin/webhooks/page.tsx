'use client';

import { format } from 'date-fns';
import { Copy, Edit2, Eye, Plus, RotateCw, Send, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import styles from './page.module.css';

interface Webhook {
  id: string;
  url: string;
  name: string;
  description?: string;
  events: string[];
  active: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'DISABLED';
  max_retries: number;
  retry_delay_seconds: number;
  trigger_count: number;
  delivery_success: number;
  delivery_failed: number;
  last_triggered_at?: string;
  created_at: string;
  updated_at: string;
}

interface WebhookDelivery {
  id: string;
  event: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRYING';
  attempt_count: number;
  http_status_code?: number;
  response_body?: string;
  next_retry_at?: string;
  created_at: string;
}

interface WebhookListResponse {
  total: number;
  page: number;
  page_size: number;
  webhooks: Webhook[];
}

type FormAction = 'create' | 'edit' | 'view-deliveries' | 'view-secret' | 'none';

const WEBHOOK_EVENTS = [
  'user.created',
  'user.updated',
  'user.deleted',
  'user.login',
  'user.verified',
  'content.created',
  'content.updated',
  'content.deleted',
  'post.created',
  'post.updated',
  'post.deleted',
  'follow.created',
  'follow.deleted',
  'conversation.started',
  'conversation.message',
  'admin.action',
  'settings.changed',
  'system.health',
  'system.error',
  'system.event',
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-yellow-100 text-yellow-800',
  DISABLED: 'bg-red-100 text-red-800',
};

const DELIVERY_STATUS_COLORS: Record<string, string> = {
  SUCCESS: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  PENDING: 'bg-blue-100 text-blue-800',
  RETRYING: 'bg-yellow-100 text-yellow-800',
};

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [secret, setSecret] = useState<string | null>(null);

  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formAction, setFormAction] = useState<FormAction>('none');
  const [formData, setFormData] = useState({
    url: '',
    name: '',
    description: '',
    events: [] as string[],
    max_retries: 5,
    retry_delay_seconds: 60,
  });

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');

  // Fetch webhooks
  const fetchWebhooks = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('page_size', String(pageSize));
      if (statusFilter) params.append('status_filter', statusFilter);

      const response = await fetch(`/api/admin/webhooks?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch webhooks');
      }

      const data: WebhookListResponse = await response.json();
      setWebhooks(data.webhooks);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch deliveries for a webhook
  const fetchDeliveries = async (webhookId: string) => {
    try {
      const response = await fetch(
        `/api/admin/webhooks/${webhookId}/deliveries?page=1&page_size=50`
      );
      if (!response.ok) throw new Error('Failed to fetch deliveries');
      const data = await response.json();
      setDeliveries(data.deliveries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deliveries');
    }
  };

  // Fetch secret for a webhook
  const fetchSecret = async (webhookId: string) => {
    try {
      const response = await fetch(`/api/admin/webhooks/${webhookId}/secret`);
      if (!response.ok) throw new Error('Failed to fetch secret');
      const data = await response.json();
      setSecret(data.secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch secret');
    }
  };

  // Create or update webhook
  const handleSaveWebhook = async () => {
    try {
      const method = formAction === 'create' ? 'POST' : 'PATCH';
      const url =
        formAction === 'create'
          ? '/api/admin/webhooks'
          : `/api/admin/webhooks/${selectedWebhook?.id}`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save webhook');

      setSuccess(`Webhook ${formAction === 'create' ? 'created' : 'updated'} successfully`);
      setFormAction('none');
      resetForm();
      fetchWebhooks();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save webhook');
    }
  };

  // Delete webhook
  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      const response = await fetch(`/api/admin/webhooks/${webhookId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete webhook');

      setSuccess('Webhook deleted successfully');
      fetchWebhooks();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete webhook');
    }
  };

  // Test webhook
  const handleTestWebhook = async (webhookId: string) => {
    try {
      const response = await fetch(`/api/admin/webhooks/${webhookId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'system.event' }),
      });

      if (!response.ok) throw new Error('Failed to send test payload');

      setSuccess('Test payload sent successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test payload');
    }
  };

  // Rotate secret
  const handleRotateSecret = async (webhookId: string) => {
    if (!confirm('Are you sure you want to rotate the webhook secret?')) return;

    try {
      const response = await fetch(`/api/admin/webhooks/${webhookId}/rotate-secret`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to rotate secret');

      setSuccess('Secret rotated successfully');
      if (selectedWebhook && selectedWebhook.id === webhookId) {
        fetchSecret(webhookId);
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate secret');
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard');
    setTimeout(() => setSuccess(null), 2000);
  };

  // Toggle event selection
  const toggleEvent = (event: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      url: '',
      name: '',
      description: '',
      events: [],
      max_retries: 5,
      retry_delay_seconds: 60,
    });
    setSelectedWebhook(null);
  };

  useEffect(() => {
    fetchWebhooks();
  }, [page, statusFilter]);

  const totalPages = Math.ceil(total / pageSize);
  const canPreviousPage = page > 1;
  const canNextPage = page < totalPages;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Webhooks</h1>
        <p className={styles.subtitle}>Manage webhook integrations and subscriptions</p>
      </div>

      {/* Success message */}
      {success && <div className="mb-4 p-4 rounded-lg bg-green-100 text-green-800">{success}</div>}

      {/* Error message */}
      {error && <div className="mb-4 p-4 rounded-lg bg-red-100 text-red-800">{error}</div>}

      {/* Form Modal */}
      {formAction !== 'none' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>
              {formAction === 'create' ? 'Create Webhook' : 'Edit Webhook'}
            </h2>

            {/* Form Fields */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Webhook URL *</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://webhook.example.com/events"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Webhook"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                className={styles.textarea}
                rows={3}
              />
            </div>

            {/* Event Selection */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Event Subscriptions *</label>
              <div className={styles.eventGrid}>
                {WEBHOOK_EVENTS.map((event) => (
                  <label key={event} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.events.includes(event)}
                      onChange={() => toggleEvent(event)}
                      className={styles.checkbox}
                    />
                    {event}
                  </label>
                ))}
              </div>
            </div>

            {/* Retry Configuration */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Max Retries</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.max_retries}
                  onChange={(e) =>
                    setFormData({ ...formData, max_retries: parseInt(e.target.value) })
                  }
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Retry Delay (seconds)</label>
                <input
                  type="number"
                  min="10"
                  max="3600"
                  value={formData.retry_delay_seconds}
                  onChange={(e) =>
                    setFormData({ ...formData, retry_delay_seconds: parseInt(e.target.value) })
                  }
                  className={styles.input}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className={styles.modalActions}>
              <button onClick={() => setFormAction('none')} className={styles.buttonSecondary}>
                Cancel
              </button>
              <button onClick={handleSaveWebhook} className={styles.buttonPrimary}>
                {formAction === 'create' ? 'Create' : 'Update'} Webhook
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deliveries Modal */}
      {formAction === 'view-deliveries' && selectedWebhook && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Delivery History</h2>
              <button onClick={() => setFormAction('none')} className={styles.closeButton}>
                ✕
              </button>
            </div>

            <div className={styles.deliveryTable}>
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Status</th>
                    <th>Attempts</th>
                    <th>HTTP Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.length > 0 ? (
                    deliveries.map((delivery) => (
                      <tr key={delivery.id}>
                        <td>{delivery.event}</td>
                        <td>
                          <span className={`badge ${DELIVERY_STATUS_COLORS[delivery.status]}`}>
                            {delivery.status}
                          </span>
                        </td>
                        <td>{delivery.attempt_count}</td>
                        <td>{delivery.http_status_code || '-'}</td>
                        <td>{format(new Date(delivery.created_at), 'MMM dd, HH:mm')}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className={styles.emptyCell}>
                        No deliveries yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.modalActions}>
              <button onClick={() => setFormAction('none')} className={styles.buttonSecondary}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secret Modal */}
      {formAction === 'view-secret' && selectedWebhook && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Webhook Secret</h2>
              <button onClick={() => setFormAction('none')} className={styles.closeButton}>
                ✕
              </button>
            </div>

            <div className={styles.secretBox}>
              <p className={styles.secretLabel}>Secret Key (save this securely):</p>
              <div className={styles.secretDisplay}>
                <code>{secret}</code>
                <button
                  onClick={() => secret && copyToClipboard(secret)}
                  className={styles.copyButton}
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => {
                  setFormAction('none');
                }}
                className={styles.buttonSecondary}
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (selectedWebhook) {
                    handleRotateSecret(selectedWebhook.id);
                    setFormAction('none');
                  }
                }}
                className={styles.buttonDanger}
              >
                <RotateCw size={16} /> Rotate Secret
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className={styles.controls}>
        <button
          onClick={() => {
            resetForm();
            setFormAction('create');
          }}
          className={styles.buttonPrimary}
        >
          <Plus size={16} /> New Webhook
        </button>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className={styles.select}
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className={styles.loading}>Loading webhooks...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : webhooks.length > 0 ? (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>URL</th>
                  <th>Status</th>
                  <th>Events</th>
                  <th>Success/Failed</th>
                  <th>Last Triggered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((webhook) => (
                  <tr key={webhook.id}>
                    <td className={styles.name}>{webhook.name}</td>
                    <td className={styles.url} title={webhook.url}>
                      {webhook.url.substring(0, 40)}...
                    </td>
                    <td>
                      <span className={`badge ${STATUS_COLORS[webhook.status]}`}>
                        {webhook.status}
                      </span>
                    </td>
                    <td className={styles.events}>{webhook.events.length} events</td>
                    <td className={styles.stats}>
                      ✓ {webhook.delivery_success} / ✕ {webhook.delivery_failed}
                    </td>
                    <td>
                      {webhook.last_triggered_at
                        ? format(new Date(webhook.last_triggered_at), 'MMM dd, HH:mm')
                        : 'Never'}
                    </td>
                    <td className={styles.actions}>
                      <button
                        onClick={() => {
                          setSelectedWebhook(webhook);
                          setFormData({
                            url: webhook.url,
                            name: webhook.name,
                            description: webhook.description || '',
                            events: webhook.events,
                            max_retries: webhook.max_retries,
                            retry_delay_seconds: webhook.retry_delay_seconds,
                          });
                          setFormAction('edit');
                        }}
                        className={styles.iconButton}
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedWebhook(webhook);
                          fetchSecret(webhook.id);
                          setFormAction('view-secret');
                        }}
                        className={styles.iconButton}
                        title="View Secret"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedWebhook(webhook);
                          fetchDeliveries(webhook.id);
                          setFormAction('view-deliveries');
                        }}
                        className={styles.iconButton}
                        title="View Deliveries"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => handleTestWebhook(webhook.id)}
                        className={styles.iconButton}
                        title="Send Test Payload"
                      >
                        <Send size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteWebhook(webhook.id)}
                        className={`${styles.iconButton} ${styles.danger}`}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            <button
              onClick={() => setPage(page - 1)}
              disabled={!canPreviousPage}
              className={styles.pageButton}
            >
              Previous
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!canNextPage}
              className={styles.pageButton}
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <div className={styles.empty}>
          <p>No webhooks configured yet</p>
          <button
            onClick={() => {
              resetForm();
              setFormAction('create');
            }}
            className={styles.buttonPrimary}
          >
            Create Your First Webhook
          </button>
        </div>
      )}
    </div>
  );
}
