/**
 * API Client Utilities
 * Session 189: Admin panel API integration
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Generic API error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Make authenticated API request
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Include cookies for authentication
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.detail || `API error: ${response.statusText}`,
      response.status,
      errorData
    );
  }

  return response.json();
}

/**
 * User Management API
 */
export interface User {
  id: string;
  email: string;
  handle: string;
  name?: string;
  bio?: string;
  role: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  follower_count?: number;
  following_count?: number;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UserFilters {
  search?: string;
  role?: string;
  is_verified?: boolean;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export const userApi = {
  /**
   * List users with filters and pagination
   */
  async listUsers(filters: UserFilters = {}): Promise<UserListResponse> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.role) params.append('role', filters.role);
    if (filters.is_verified !== undefined) {
      params.append('is_verified', filters.is_verified.toString());
    }
    if (filters.is_active !== undefined) {
      params.append('is_active', filters.is_active.toString());
    }
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.page_size) params.append('page_size', filters.page_size.toString());

    const queryString = params.toString();
    const endpoint = `/admin/users${queryString ? `?${queryString}` : ''}`;

    return fetchApi<UserListResponse>(endpoint);
  },

  /**
   * Get user by ID
   */
  async getUser(id: string): Promise<User> {
    return fetchApi<User>(`/admin/users/${id}`);
  },

  /**
   * Update user
   */
  async updateUser(
    id: string,
    data: Partial<User>
  ): Promise<User> {
    return fetchApi<User>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<void> {
    return fetchApi<void>(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Suspend user
   */
  async suspendUser(id: string): Promise<User> {
    return fetchApi<User>(`/admin/users/${id}/suspend`, {
      method: 'POST',
    });
  },

  /**
   * Verify user
   */
  async verifyUser(id: string): Promise<User> {
    return fetchApi<User>(`/admin/users/${id}/verify`, {
      method: 'POST',
    });
  },
};
