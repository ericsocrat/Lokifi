/**
 * User Detail Page
 * Session 189: Displays comprehensive user information
 */

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/lib/api';
import { EditUserModal } from '@/components/EditUserModal';
import './page.css';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = params.id as string;

  const [showEditModal, setShowEditModal] = useState(false);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => userApi.getUser(userId),
  });

  const handleBack = () => {
    router.push('/dashboard/users');
  };

  const handleSuspend = async () => {
    if (!user) return;

    const action = user.is_active ? 'suspend' : 'reactivate';
    const confirmMessage = `Are you sure you want to ${action} user "${user.name || user.handle}"?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      if (user.is_active) {
        await userApi.suspendUser(userId);
        alert(`User "${user.name || user.handle}" has been suspended.`);
      } else {
        // Reactivate by updating is_active to true
        await userApi.updateUser(userId, { is_active: true });
        alert(`User "${user.name || user.handle}" has been reactivated.`);
      }
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to ${action} user: ${errorMessage}`);
      console.error(`${action} error:`, error);
    }
  };

  const handleVerify = async () => {
    if (!user) return;

    const action = user.is_verified ? 'unverify' : 'verify';
    const confirmMessage = `Are you sure you want to ${action} user "${user.name || user.handle}"?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      if (user.is_verified) {
        // Unverify by updating is_verified to false
        await userApi.updateUser(userId, { is_verified: false });
        alert(`User "${user.name || user.handle}" has been unverified.`);
      } else {
        await userApi.verifyUser(userId);
        alert(`User "${user.name || user.handle}" has been verified.`);
      }
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to ${action} user: ${errorMessage}`);
      console.error(`${action} error:`, error);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    const confirmMessage = `⚠️ WARNING: Delete user "${user.name || user.handle}"?\n\n` +
      `Email: ${user.email}\n` +
      `This action CANNOT be undone.\n\n` +
      `Type "DELETE" to confirm:`;

    const confirmation = window.prompt(confirmMessage);

    if (confirmation !== 'DELETE') {
      if (confirmation !== null) {
        alert('Deletion cancelled. You must type "DELETE" exactly to confirm.');
      }
      return;
    }

    try {
      await userApi.deleteUser(userId);
      
      // Invalidate users list query
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      alert(`User "${user.name || user.handle}" has been deleted permanently.`);
      router.push('/dashboard/users');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to delete user: ${errorMessage}`);
      console.error('Delete error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="user-detail-page">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading user details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-detail-page">
        <div className="error-state">
          <p>⚠️ Error loading user: {error instanceof Error ? error.message : 'Unknown error'}</p>
          <button onClick={handleBack} className="secondary-button">
            ← Back to Users
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-detail-page">
        <div className="error-state">
          <p>User not found</p>
          <button onClick={handleBack} className="secondary-button">
            ← Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-detail-page">
      <div className="page-header">
        <button onClick={handleBack} className="back-button" type="button">
          ← Back to Users
        </button>
        <h1>User Details</h1>
      </div>

      <div className="detail-grid">
        {/* Profile Card */}
        <div className="detail-card profile-card">
          <div className="user-avatar-large">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name || user.handle || 'User'} />
            ) : (
              <div className="avatar-placeholder">
                {(user.name || user.handle || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <h2 className="user-name-large">{user.name || user.handle}</h2>
          <p className="user-handle-large">@{user.handle}</p>
          <p className="user-email-large">{user.email}</p>

          {user.bio && (
            <div className="user-bio">
              <p>{user.bio}</p>
            </div>
          )}

          <div className="status-badges-large">
            <span className={`role-badge ${user.role}`}>
              {user.role}
            </span>
            {user.is_verified && (
              <span className="badge verified">✓ Verified</span>
            )}
            {!user.is_active && (
              <span className="badge suspended">Suspended</span>
            )}
          </div>
        </div>

        {/* Statistics Card */}
        <div className="detail-card stats-card">
          <h3>Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Followers</div>
              <div className="stat-value">{user.follower_count || 0}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Following</div>
              <div className="stat-value">{user.following_count || 0}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Joined</div>
              <div className="stat-value">{formatDate(user.created_at)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Last Login</div>
              <div className="stat-value">
                {user.last_login ? formatDate(user.last_login) : 'Never'}
              </div>
            </div>
          </div>
        </div>

        {/* Account Information Card */}
        <div className="detail-card info-card">
          <h3>Account Information</h3>
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">User ID:</span>
              <span className="info-value">{user.id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email:</span>
              <span className="info-value">{user.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Handle:</span>
              <span className="info-value">@{user.handle}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Role:</span>
              <span className="info-value">{user.role}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Verified:</span>
              <span className="info-value">{user.is_verified ? 'Yes' : 'No'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Active:</span>
              <span className="info-value">{user.is_active ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Admin Actions Card */}
        <div className="detail-card actions-card">
          <h3>Admin Actions</h3>
          <div className="action-buttons-vertical">
            <button
              onClick={() => setShowEditModal(true)}
              className="primary-button"
              type="button"
            >
              ✏️ Edit User Information
            </button>
            <button
              onClick={handleVerify}
              className={user.is_verified ? 'secondary-button' : 'primary-button'}
              type="button"
            >
              {user.is_verified ? '✗ Unverify User' : '✓ Verify User'}
            </button>
            <button
              onClick={handleSuspend}
              className={user.is_active ? 'warning-button' : 'success-button'}
              type="button"
            >
              {user.is_active ? '🚫 Suspend Account' : '✓ Reactivate Account'}
            </button>
            <button
              onClick={handleDelete}
              className="danger-button"
              type="button"
            >
              🗑️ Delete User Permanently
            </button>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      <EditUserModal
        user={user}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </div>
  );
}
