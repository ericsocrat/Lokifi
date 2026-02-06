'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from '../admin.module.css';

interface EmailTemplate {
  id: number;
  name: string;
  category: string;
  subject: string;
  body: string;
  html_body?: string;
  variables?: string[];
  enabled: boolean;
  version: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

interface ListResponse {
  templates: EmailTemplate[];
  total: number;
  offset: number;
  limit: number;
}

const CATEGORIES = ['password_reset', 'welcome', 'email_verification', 'notification', 'alert'];

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const [formData, setFormData] = useState({
    name: '',
    category: 'password_reset',
    subject: '',
    body: '',
    html_body: '',
    variables: '',
    enabled: true,
  });

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: LIMIT.toString(),
        ...(search && { search }),
        ...(category && { category }),
      });
      const response = await fetch(`/api/admin/email-templates?${params}`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data: ListResponse = await response.json();
      setTemplates(data.templates);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [offset, search, category]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreateClick = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      category: 'password_reset',
      subject: '',
      body: '',
      html_body: '',
      variables: '',
      enabled: true,
    });
    setShowForm(true);
  };

  const handleEditClick = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      subject: template.subject,
      body: template.body,
      html_body: template.html_body || '',
      variables: template.variables?.join(', ') || '',
      enabled: template.enabled,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingTemplate ? 'PATCH' : 'POST';
      const url = editingTemplate
        ? `/api/admin/email-templates/${editingTemplate.id}`
        : '/api/admin/email-templates';

      const variables = formData.variables
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          variables: variables.length > 0 ? variables : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save template');
      }

      setShowForm(false);
      fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const response = await fetch(`/api/admin/email-templates/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete template');
      fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Email Templates</h1>
        <p>Manage reusable email templates ({total} total)</p>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Search by name or subject"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
          className={styles.searchInput}
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setOffset(0);
          }}
          className={styles.select}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <button onClick={handleCreateClick} className={styles.buttonPrimary}>
          + Create Template
        </button>
      </div>

      {showForm && (
        <div className={styles.formContainer}>
          <h2>{editingTemplate ? 'Edit Template' : 'Create Template'}</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Name</label>
              <input
                type="text"
                required
                maxLength={255}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  />
                  Enabled
                </label>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Subject</label>
              <input
                type="text"
                required
                maxLength={500}
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Body (Plain Text)</label>
              <textarea
                required
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                rows={6}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Body (HTML)</label>
              <textarea
                value={formData.html_body}
                onChange={(e) => setFormData({ ...formData, html_body: e.target.value })}
                rows={6}
                placeholder="Optional HTML version"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Variables (comma-separated)</label>
              <input
                type="text"
                placeholder="user_name, reset_link, expiry_time"
                value={formData.variables}
                onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
              />
              <small>Variables that can be used in template {`(e.g., {{user_name}})`}</small>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.buttonPrimary}>
                {editingTemplate ? 'Update' : 'Create'} Template
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className={styles.buttonSecondary}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.loading}>Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className={styles.empty}>No templates found</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Subject</th>
                <th>Version</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id}>
                  <td className={styles.nameCell}>{template.name}</td>
                  <td>{template.category}</td>
                  <td className={styles.truncate}>{template.subject}</td>
                  <td className={styles.center}>{template.version}</td>
                  <td className={styles.center}>
                    <span className={template.enabled ? styles.badgeEnabled : styles.badgeDisabled}>
                      {template.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(template.created_at).toLocaleDateString()}
                  </td>
                  <td className={styles.actions}>
                    <button
                      onClick={() => handleEditClick(template)}
                      className={styles.buttonSmall}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className={styles.buttonSmallDanger}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={styles.pagination}>
        <button
          onClick={() => setOffset(Math.max(0, offset - LIMIT))}
          disabled={offset === 0}
          className={styles.buttonSmall}
        >
          ← Previous
        </button>
        <span className={styles.paginationInfo}>
          Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
        </span>
        <button
          onClick={() => setOffset(offset + LIMIT)}
          disabled={offset + LIMIT >= total}
          className={styles.buttonSmall}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
