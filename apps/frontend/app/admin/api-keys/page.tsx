'use client';

import { useEffect, useState } from 'react';
import styles from '../admin.module.css';

interface APIKey {
  id: string;
  key_prefix: string;
  name: string;
  description: string | null;
  scopes: string[];
  rate_limit: number;
  expires_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

interface CreateAPIKeyData {
  name: string;
  description: string;
  scopes: string[];
  rate_limit: number;
  expires_at: string | null;
  is_active: boolean;
}

interface UpdateAPIKeyData {
  name?: string;
  description?: string;
  scopes?: string[];
  rate_limit?: number;
  expires_at?: string | null;
  is_active?: boolean;
}

export default function APIKeysPage() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingKey, setEditingKey] = useState<APIKey | null>(null);
  const [showPlainKey, setShowPlainKey] = useState(false);
  const [plainKeyValue, setPlainKeyValue] = useState<string>('');
  const [formData, setFormData] = useState<CreateAPIKeyData>({
    name: '',
    description: '',
    scopes: [],
    rate_limit: 60,
    expires_at: null,
    is_active: true,
  });
  const [scopesInput, setScopesInput] = useState('');
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const fetchAPIKeys = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString(),
      });

      if (search) {
        params.append('search', search);
      }

      if (isActiveFilter !== 'all') {
        params.append('is_active', isActiveFilter);
      }

      const response = await fetch(`/api/admin/api-keys?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch API keys: ${response.statusText}`);
      }

      const data = await response.json();
      setApiKeys(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAPIKeys();
  }, [offset, search, isActiveFilter]);

  const handleCreateAPIKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create API key');
      }

      const data = await response.json();

      // Show plain key ONCE
      setPlainKeyValue(data.plain_key);
      setShowPlainKey(true);

      // Reset form and refresh list
      setFormData({
        name: '',
        description: '',
        scopes: [],
        rate_limit: 60,
        expires_at: null,
        is_active: true,
      });
      setScopesInput('');
      setShowForm(false);
      fetchAPIKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleUpdateAPIKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKey) return;

    setError(null);

    try {
      const updateData: UpdateAPIKeyData = {};

      if (formData.name !== editingKey.name) {
        updateData.name = formData.name;
      }
      if (formData.description !== editingKey.description) {
        updateData.description = formData.description;
      }
      if (JSON.stringify(formData.scopes) !== JSON.stringify(editingKey.scopes)) {
        updateData.scopes = formData.scopes;
      }
      if (formData.rate_limit !== editingKey.rate_limit) {
        updateData.rate_limit = formData.rate_limit;
      }
      if (formData.expires_at !== editingKey.expires_at) {
        updateData.expires_at = formData.expires_at;
      }
      if (formData.is_active !== editingKey.is_active) {
        updateData.is_active = formData.is_active;
      }

      const response = await fetch(`/api/admin/api-keys/${editingKey.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update API key');
      }

      // Reset form and refresh list
      setEditingKey(null);
      setFormData({
        name: '',
        description: '',
        scopes: [],
        rate_limit: 60,
        expires_at: null,
        is_active: true,
      });
      setScopesInput('');
      fetchAPIKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDeleteAPIKey = async (keyId: string, keyName: string) => {
    if (
      !confirm(
        `Are you sure you want to deactivate API key "${keyName}"? This action will set is_active=False.`
      )
    ) {
      return;
    }

    setError(null);

    try {
      const response = await fetch(`/api/admin/api-keys/${keyId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete API key');
      }

      fetchAPIKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const openEditForm = (apiKey: APIKey) => {
    setEditingKey(apiKey);
    setFormData({
      name: apiKey.name,
      description: apiKey.description || '',
      scopes: apiKey.scopes,
      rate_limit: apiKey.rate_limit,
      expires_at: apiKey.expires_at,
      is_active: apiKey.is_active,
    });
    setScopesInput(apiKey.scopes.join(', '));
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingKey(null);
    setFormData({
      name: '',
      description: '',
      scopes: [],
      rate_limit: 60,
      expires_at: null,
      is_active: true,
    });
    setScopesInput('');
    setError(null);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(plainKeyValue);
    alert('API key copied to clipboard!');
  };

  const closePlainKeyModal = () => {
    setShowPlainKey(false);
    setPlainKeyValue('');
  };

  const handleScopesChange = (value: string) => {
    setScopesInput(value);
    // Parse CSV input into array
    const scopesArray = value
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    setFormData({ ...formData, scopes: scopesArray });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>API Keys Management</h1>
        <button className={styles.primaryButton} onClick={() => setShowForm(true)}>
          + Create API Key
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      )}

      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search by name or description..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
          className={styles.searchInput}
        />

        <select
          value={isActiveFilter}
          onChange={(e) => {
            setIsActiveFilter(e.target.value);
            setOffset(0);
          }}
          className={styles.select}
        >
          <option value="all">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading API keys...</div>
      ) : (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Key Prefix</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Scopes</th>
                  <th>Rate Limit</th>
                  <th>Expires At</th>
                  <th>Last Used</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.length === 0 ? (
                  <tr>
                    <td colSpan={10} className={styles.emptyState}>
                      No API keys found
                    </td>
                  </tr>
                ) : (
                  apiKeys.map((apiKey) => (
                    <tr key={apiKey.id}>
                      <td>
                        <code className={styles.codeBlock}>{apiKey.key_prefix}</code>
                      </td>
                      <td>{apiKey.name}</td>
                      <td>{apiKey.description || '-'}</td>
                      <td>
                        {apiKey.scopes.length > 0 ? (
                          <div className={styles.badges}>
                            {apiKey.scopes.map((scope, idx) => (
                              <span key={idx} className={styles.badge}>
                                {scope}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className={styles.mutedText}>No scopes</span>
                        )}
                      </td>
                      <td>{apiKey.rate_limit === 0 ? 'Unlimited' : `${apiKey.rate_limit} RPM`}</td>
                      <td>{formatDate(apiKey.expires_at)}</td>
                      <td>{formatDate(apiKey.last_used_at)}</td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            apiKey.is_active ? styles.statusActive : styles.statusInactive
                          }`}
                        >
                          {apiKey.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{formatDate(apiKey.created_at)}</td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            className={styles.editButton}
                            onClick={() => openEditForm(apiKey)}
                          >
                            Edit
                          </button>
                          <button
                            className={styles.deleteButton}
                            onClick={() => handleDeleteAPIKey(apiKey.id, apiKey.name)}
                            disabled={!apiKey.is_active}
                          >
                            Deactivate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <button
              className={styles.paginationButton}
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
            >
              Previous
            </button>
            <span className={styles.paginationInfo}>
              Showing {offset + 1} to {Math.min(offset + limit, total)} of {total}
            </span>
            <button
              className={styles.paginationButton}
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
            >
              Next
            </button>
          </div>
        </>
      )}

      {(showForm || editingKey) && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{editingKey ? 'Edit API Key' : 'Create New API Key'}</h2>
              <button className={styles.closeButton} onClick={closeForm}>
                &times;
              </button>
            </div>

            <form onSubmit={editingKey ? handleUpdateAPIKey : handleCreateAPIKey}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className={styles.input}
                  maxLength={255}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={styles.textarea}
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="scopes">
                  Scopes (comma-separated, e.g., "read:users, write:content")
                </label>
                <input
                  type="text"
                  id="scopes"
                  value={scopesInput}
                  onChange={(e) => handleScopesChange(e.target.value)}
                  className={styles.input}
                  placeholder="read:users, write:content"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="rate_limit">
                  Rate Limit (requests per minute, 0 for unlimited)
                </label>
                <input
                  type="number"
                  id="rate_limit"
                  value={formData.rate_limit}
                  onChange={(e) =>
                    setFormData({ ...formData, rate_limit: parseInt(e.target.value) || 0 })
                  }
                  min={0}
                  max={10000}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="expires_at">Expires At (optional)</label>
                <input
                  type="datetime-local"
                  id="expires_at"
                  value={
                    formData.expires_at
                      ? new Date(formData.expires_at).toISOString().slice(0, 16)
                      : ''
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expires_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span>Active</span>
                </label>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" onClick={closeForm} className={styles.secondaryButton}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton}>
                  {editingKey ? 'Update API Key' : 'Create API Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPlainKey && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>⚠️ API Key Created - Save This Now!</h2>
              <button className={styles.closeButton} onClick={closePlainKeyModal}>
                &times;
              </button>
            </div>

            <div className={styles.plainKeyWarning}>
              <p>
                <strong>This is the ONLY time you will see this API key.</strong>
              </p>
              <p>Store it securely - you cannot retrieve it again.</p>

              <div className={styles.plainKeyDisplay}>
                <code className={styles.plainKeyCode}>{plainKeyValue}</code>
                <button className={styles.copyButton} onClick={copyToClipboard}>
                  Copy to Clipboard
                </button>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={closePlainKeyModal} className={styles.primaryButton}>
                I've Saved the Key Securely
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
