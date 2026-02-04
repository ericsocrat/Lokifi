/**
 * User Management Page
 * Session 189: User list with search, filtering, and pagination
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi, type User, type UserFilters } from '@/lib/api';
import './page.css';

export default function UsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    page_size: 20,
  });

  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', filters],
    queryFn: () => userApi.listUsers(filters),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, search: searchInput, page: 1 });
  };

  const handleFilterChange = (key: keyof UserFilters, value: unknown) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
  };

  const handleViewUser = (userId: string) => {
    router.push(`/dashboard/users/${userId}`);
  };

  const handleEditUser = (userId: string) => {
    // TODO: Open edit modal when edit modal component is created
    console.log('Edit user:', userId);
    alert('Edit functionality coming soon. For now, user details can be updated via the API.');
  };

  const handleDeleteUser = async (user: User) => {
    const confirmMessage = `Are you sure you want to delete user "${user.name || user.handle}"?\n\n` +
      `Email: ${user.email}\n` +
      `This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await userApi.deleteUser(user.id);
      
      // Invalidate users query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      alert(`User "${user.name || user.handle}" has been deleted successfully.`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to delete user: ${errorMessage}`);
      console.error('Delete error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p className="page-subtitle">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <button className="primary-button" type="button">
          + Add User
        </button>
      </div>

      <div className="filters-card">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, or handle..."
            className="search-input"
          />
          <button type="submit" className="search-button">
            🔍 Search
          </button>
        </form>

        <div className="filter-controls">
          <select
            value={filters.role || ''}
            onChange={(e) =>
              handleFilterChange('role', e.target.value || undefined)
            }
            className="filter-select"
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={
              filters.is_verified === undefined
                ? ''
                : filters.is_verified.toString()
            }
            onChange={(e) =>
              handleFilterChange(
                'is_verified',
                e.target.value === '' ? undefined : e.target.value === 'true'
              )
            }
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>

          <select
            value={
              filters.is_active === undefined ? '' : filters.is_active.toString()
            }
            onChange={(e) =>
              handleFilterChange(
                'is_active',
                e.target.value === '' ? undefined : e.target.value === 'true'
              )
            }
            className="filter-select"
          >
            <option value="">All Users</option>
            <option value="true">Active</option>
            <option value="false">Suspended</option>
          </select>

          {(filters.search || filters.role || filters.is_verified !== undefined || filters.is_active !== undefined) && (
            <button
              type="button"
              onClick={() => {
                setFilters({ page: 1, page_size: 20 });
                setSearchInput('');
              }}
              className="clear-filters"
            >
              ✕ Clear Filters
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <p>Failed to load users: {(error as Error).message}</p>
        </div>
      )}

      {data && (
        <>
          <div className="results-header">
            <p className="results-count">
              Showing {data.users.length} of {data.total} users
            </p>
          </div>

          <div className="table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Handle</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Followers</th>
                  <th>Joined</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {user.name?.charAt(0).toUpperCase() || user.handle.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-info">
                          <div className="user-name">{user.name || user.handle}</div>
                          <div className="user-email">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="handle">@{user.handle}</span>
                    </td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <div className="status-badges">
                        {user.is_verified && (
                          <span className="badge verified">✓ Verified</span>
                        )}
                        {!user.is_active && (
                          <span className="badge suspended">Suspended</span>
                        )}
                        {user.is_active && !user.is_verified && (
                          <span className="badge pending">Pending</span>
                        )}
                      </div>
                    </td>
                    <td>{user.follower_count || 0}</td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      {user.last_login
                        ? formatDate(user.last_login)
                        : 'Never'}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn view"
                          title="View Details"
                          type="button"
                          onClick={() => handleViewUser(user.id)}
                        >
                          👁️
                        </button>
                        <button
                          className="action-btn edit"
                          title="Edit User"
                          type="button"
                          onClick={() => handleEditUser(user.id)}
                        >
                          ✏️
                        </button>
                        <button
                          className="action-btn delete"
                          title="Delete User"
                          type="button"
                          onClick={() => handleDeleteUser(user)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.total_pages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(filters.page! - 1)}
                disabled={filters.page === 1}
                className="pagination-button"
                type="button"
              >
                ← Previous
              </button>

              <div className="pagination-info">
                Page {filters.page} of {data.total_pages}
              </div>

              <button
                onClick={() => handlePageChange(filters.page! + 1)}
                disabled={filters.page === data.total_pages}
                className="pagination-button"
                type="button"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
