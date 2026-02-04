/**
 * Admin Panel Type Definitions
 * Session 188: Admin authentication and RBAC
 */

export type AdminRole = 'admin' | 'moderator' | 'support';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  created_at: string;
  last_login?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AdminUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ApiError {
  detail: string;
  status?: number;
}
