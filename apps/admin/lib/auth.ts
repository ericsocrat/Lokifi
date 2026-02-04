/**
 * Authentication Utilities
 * Session 188: JWT validation and role-based access control
 */

import type { AdminUser, AuthResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Authenticate admin user with backend
 */
export async function loginAdmin(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username: email,
      password: password,
    }),
    credentials: 'include', // Include cookies for session management
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Authentication failed');
  }

  const data = await response.json();

  // Verify user has admin role
  if (!isAdminRole(data.user?.role)) {
    throw new Error('Access denied: Admin privileges required');
  }

  return data;
}

/**
 * Logout admin user
 */
export async function logoutAdmin(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Logout failed');
  }
}

/**
 * Get current admin user from session
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const user = await response.json();

    // Verify admin role
    if (!isAdminRole(user.role)) {
      return null;
    }

    return user;
  } catch (error) {
    return null;
  }
}

/**
 * Check if role has admin privileges
 */
export function isAdminRole(role: string | undefined): boolean {
  return role === 'admin' || role === 'moderator' || role === 'support';
}

/**
 * Check if user has specific permission level
 */
export function hasPermission(
  userRole: string,
  requiredRole: 'admin' | 'moderator' | 'support'
): boolean {
  const roleHierarchy: Record<string, number> = {
    admin: 3,
    moderator: 2,
    support: 1,
  };

  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Format role for display
 */
export function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
