'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { userApi } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import './AddUserModal.css';

// Validation schema for creating new user
const addUserSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  handle: z.string()
    .min(3, 'Handle must be at least 3 characters')
    .max(30, 'Handle must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Handle can only contain letters, numbers, and underscores'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  bio: z.string().max(500, 'Bio too long (max 500 characters)').optional(),
  role: z.enum(['user', 'moderator', 'admin']).refine((val) => ['user', 'moderator', 'admin'].includes(val), {
    message: 'Invalid role selected',
  }),
  is_verified: z.boolean(),
  is_active: z.boolean(),
});

type AddUserForm = z.infer<typeof addUserSchema>;

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddUserModal({ isOpen, onClose }: AddUserModalProps) {
  const queryClient = useQueryClient();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddUserForm>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      email: '',
      handle: '',
      name: '',
      password: '',
      bio: '',
      role: 'user',
      is_verified: false,
      is_active: true,
    },
  });

  const onSubmit = async (data: AddUserForm) => {
    try {
      const newUser = await userApi.createUser(data);
      
      // Invalidate users query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      alert(`User "${newUser.name}" created successfully!\n\nUser ID: ${newUser.id}\nEmail: ${newUser.email}\nHandle: @${newUser.handle}`);
      
      // Reset form and close modal
      reset();
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to create user: ${errorMessage}`);
      console.error('Create user error:', error);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content add-user-modal">
        <div className="modal-header">
          <h2>Create New User</h2>
          <button
            type="button"
            className="close-button"
            onClick={handleClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="add-user-form">
          {/* Email Field */}
          <div className="form-field">
            <label htmlFor="email" className="form-label">
              Email <span className="required">*</span>
            </label>
            <input
              id="email"
              type="email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="user@example.com"
              {...register('email')}
            />
            {errors.email && (
              <span className="error-message">{errors.email.message}</span>
            )}
          </div>

          {/* Handle Field */}
          <div className="form-field">
            <label htmlFor="handle" className="form-label">
              Handle <span className="required">*</span>
            </label>
            <div className="handle-input-wrapper">
              <span className="handle-prefix">@</span>
              <input
                id="handle"
                type="text"
                className={`form-input handle-input ${errors.handle ? 'error' : ''}`}
                placeholder="username"
                {...register('handle')}
              />
            </div>
            {errors.handle && (
              <span className="error-message">{errors.handle.message}</span>
            )}
            <span className="field-hint">3-30 characters, letters, numbers, and underscores only</span>
          </div>

          {/* Name Field */}
          <div className="form-field">
            <label htmlFor="name" className="form-label">
              Full Name <span className="required">*</span>
            </label>
            <input
              id="name"
              type="text"
              className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder="John Doe"
              {...register('name')}
            />
            {errors.name && (
              <span className="error-message">{errors.name.message}</span>
            )}
          </div>

          {/* Password Field */}
          <div className="form-field">
            <label htmlFor="password" className="form-label">
              Password <span className="required">*</span>
            </label>
            <input
              id="password"
              type="password"
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && (
              <span className="error-message">{errors.password.message}</span>
            )}
            <span className="field-hint">Min 8 characters, must include uppercase, lowercase, and number</span>
          </div>

          {/* Bio Field */}
          <div className="form-field">
            <label htmlFor="bio" className="form-label">
              Bio (Optional)
            </label>
            <textarea
              id="bio"
              className={`form-textarea ${errors.bio ? 'error' : ''}`}
              placeholder="Tell us about this user..."
              rows={3}
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
              <option value="user">User (Default)</option>
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
                ✓ Mark as Verified
              </label>
            </div>

            <div className="checkbox-field">
              <input
                id="is_active"
                type="checkbox"
                className="form-checkbox"
                defaultChecked
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
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="create-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : '+ Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
