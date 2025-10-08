/**
 * Google OAuth type definitions
 */

export interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
  client_id?: string;
}

export interface GoogleAuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  user?: {
    id: string;
    email: string;
    username?: string;
    name?: string;
  };
}

export interface GoogleAuthError {
  detail?: string;
  message?: string;
  [key: string]: unknown;
}
