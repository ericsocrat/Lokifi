'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, userApi } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import './EditUserModal.css';

// Validation schema
const editUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  bio: z.string().max(500, 'Bio too long (max 500 characters)').optional(),
  role: z.enum(['user', 'moderator', 'admin']).refine((val) => ['user', 'moderator', 'admin'].includes(val), {
    message: 'Invalid role selected',
  }),
  is_verified: z.boolean(),
  is_active: z.boolean(),
});

type EditUserForm = z.infer<typeof editUserSchema>;

interface EditUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditUserModal({ user, isOpen, onClose }: EditUserModalProps) {
  const queryClient = useQueryClient();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: user?.name || '',
      bio: user?.bio || '',
      role: (user?.role as 'user' | 'moderator' | 'admin') || 'user',
      is_verified: user?.is_verified || false,
      is_active: user?.is_active !== false,
    },
  });

  // Reset form when user changes or modal opens
  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        bio: user.bio || '',
        role: (user.role as 'user' | 'moderator' | 'admin') || 'user',
        is_verified: user.is_verified || false,
        is_active: user.is_active !== false,
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: EditUserForm) => {
    if (!user) return;

    try {
      await userApi.updateUser(user.id, data);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', user.id] });
      
      alert(`User "${data.name}" updated successfully!`);
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to update user: ${errorMessage}`);
      console.error('Update error:', error);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Edit User</h2>
          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="modal-user-info">
          <p className="modal-user-email">{user.email}</p>
          <p className="modal-user-handle">@{user.handle}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="edit-user-form">
          {/* Name Field */}
          <div className="form-field">
            <label htmlFor="name" className="form-label">
              Name <span className="required">*</span>
            </label>
            <input
              id="name"
              type="text"
              className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder="Enter user's full name"
              {...register('name')}
            />
            {errors.name && (
              <span className="error-message">{errors.name.message}</span>
            )}
          </div>

          {/* Bio Field */}
          <div className="form-field">
            <label htmlFor="bio" className="form-label">
              Bio
            </label>
            <textarea
              id="bio"
              className={`form-textarea ${errors.bio ? 'error' : ''}`}
              placeholder="Enter user bio (optional)"
              rows={4}
              {...register('bio')}
            />
            {errors.bio && (
              <span className="error-message">{errors.bio.message}</span>
            )}
          </div>

          {/* Role Field */}
          <div className="form-field">
            <label htmlFor="role" className="form-label">
              Role <span className="required">*</span>
            </label>
            <select
              id="role"
              className={`form-select ${errors.role ? 'error' : ''}`}
              {...register('role')}
            >
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && (
              <span className="error-message">{errors.role.message}</span>
            )}
          </div>

          {/* Checkboxes */}
          <div className="form-checkboxes">
            <div className="checkbox-field">
              <input
                id="is_verified"
                type="checkbox"
                className="form-checkbox"
                {...register('is_verified')}
              />
              <label htmlFor="is_verified" className="checkbox-label">
                ✓ Verified User
              </label>
            </div>

            <div className="checkbox-field">
              <input
                id="is_active"
                type="checkbox"
                className="form-checkbox"
                {...register('is_active')}
              />
              <label htmlFor="is_active" className="checkbox-label">
                ✓ Active Account
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="save-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
