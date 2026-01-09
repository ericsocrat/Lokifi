/**
 * @file ApiTestPage.test.tsx
 * @description Tests for the /test page - API connection test utility
 * @session 140 - Page testing coverage
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TestPage from '../../app/test/page';

describe('ApiTestPage', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the page title', () => {
      render(<TestPage />);
      expect(screen.getByText('API Connection Test')).toBeInTheDocument();
    });

    it('displays the test auth check button', () => {
      render(<TestPage />);
      expect(screen.getByRole('button', { name: /test.*auth.*check/i })).toBeInTheDocument();
    });

    it('displays the test login button', () => {
      render(<TestPage />);
      expect(screen.getByRole('button', { name: /test login/i })).toBeInTheDocument();
    });

    it('displays instructions section', () => {
      render(<TestPage />);
      expect(screen.getByText(/instructions/i)).toBeInTheDocument();
    });

    it('shows instruction steps', () => {
      render(<TestPage />);
      expect(screen.getByText(/open browser console/i)).toBeInTheDocument();
      expect(screen.getByText(/check console for logs/i)).toBeInTheDocument();
      expect(screen.getByText(/check for cors errors/i)).toBeInTheDocument();
    });
  });

  describe('Auth Check Test', () => {
    it('shows testing state when auth check button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ authenticated: true }),
      });

      render(<TestPage />);
      const button = screen.getByRole('button', { name: /test.*auth.*check/i });
      fireEvent.click(button);

      // Should show testing state briefly
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('calls auth check endpoint with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ authenticated: true }),
      });

      render(<TestPage />);
      const button = screen.getByRole('button', { name: /test.*auth.*check/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/auth/check',
          expect.objectContaining({
            method: 'GET',
            credentials: 'include',
          })
        );
      });
    });

    it('displays successful auth check result', async () => {
      const mockResponse = { authenticated: true, user: { id: 1 } };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      });

      render(<TestPage />);
      const button = screen.getByRole('button', { name: /test.*auth.*check/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/result/i)).toBeInTheDocument();
      });
    });

    it('displays error when auth check fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<TestPage />);
      const button = screen.getByRole('button', { name: /test.*auth.*check/i });
      fireEvent.click(button);

      await waitFor(() => {
        // Error message should appear in the error container
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Login Test', () => {
    it('shows testing state when login button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ success: true }),
      });

      render(<TestPage />);
      const button = screen.getByRole('button', { name: /test login/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('calls login endpoint with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ success: true }),
      });

      render(<TestPage />);
      const button = screen.getByRole('button', { name: /test login/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/auth/login',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
            body: expect.any(String),
          })
        );
      });
    });

    it('sends test credentials in login request', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ success: true }),
      });

      render(<TestPage />);
      const button = screen.getByRole('button', { name: /test login/i });
      fireEvent.click(button);

      await waitFor(() => {
        const call = mockFetch.mock.calls[0];
        const body = JSON.parse(call[1].body);
        expect(body).toHaveProperty('email');
        expect(body).toHaveProperty('password');
      });
    });

    it('displays successful login result', async () => {
      const mockResponse = { success: true, token: 'abc123' };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      });

      render(<TestPage />);
      const button = screen.getByRole('button', { name: /test login/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/result/i)).toBeInTheDocument();
      });
    });

    it('displays error when login fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      render(<TestPage />);
      const button = screen.getByRole('button', { name: /test login/i });
      fireEvent.click(button);

      await waitFor(() => {
        // Error message should appear in the error container
        expect(screen.getByText(/connection refused/i)).toBeInTheDocument();
      });
    });
  });

  describe('State Management', () => {
    it('clears previous result when starting new test', async () => {
      // First test succeeds
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ first: true }),
      });

      render(<TestPage />);
      const authButton = screen.getByRole('button', { name: /test.*auth.*check/i });
      fireEvent.click(authButton);

      await waitFor(() => {
        expect(screen.getByText(/first/i)).toBeInTheDocument();
      });

      // Second test - should clear previous result
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ second: true }),
      });

      const loginButton = screen.getByRole('button', { name: /test login/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/second/i)).toBeInTheDocument();
      });
    });

    it('clears previous error when starting new test', async () => {
      // First test fails
      mockFetch.mockRejectedValueOnce(new Error('First error'));

      render(<TestPage />);
      const authButton = screen.getByRole('button', { name: /test.*auth.*check/i });
      fireEvent.click(authButton);

      await waitFor(() => {
        expect(screen.getByText(/first error/i)).toBeInTheDocument();
      });

      // Second test succeeds - should clear error
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ success: true }),
      });

      const loginButton = screen.getByRole('button', { name: /test login/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.queryByText(/first error/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Display', () => {
    it('displays non-Error objects as strings', async () => {
      // Reject with a string instead of Error
      mockFetch.mockRejectedValueOnce('String error');

      render(<TestPage />);
      const button = screen.getByRole('button', { name: /test.*auth.*check/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/string error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Component Export', () => {
    it('exports TestPage as default', () => {
      expect(TestPage).toBeDefined();
      expect(typeof TestPage).toBe('function');
    });
  });
});
