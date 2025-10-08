"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { GoogleLogin } from '@react-oauth/google';
import type { GoogleCredentialResponse, GoogleAuthResponse } from '@/src/types/google-auth';

export function AuthModal({ onClose, initialMode = "register" }: { onClose: () => void; initialMode?: "login" | "register" }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  
  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  
  // UI state
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState<string | null>(null);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
    fullName?: string;
    username?: string;
  }>({});

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password strength validation
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score, label: "Weak", color: "bg-red-500" };
    if (score <= 3) return { score, label: "Medium", color: "bg-yellow-500" };
    return { score, label: "Strong", color: "bg-green-500" };
  };

  const passwordStrength = mode === "register" ? getPasswordStrength(password) : null;

  // Form validation
  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};
    
    if (!validateEmail(email)) {
      errors.email = "Please enter a valid email address";
    }
    
    if (mode === "register") {
      if (password.length < 8) {
        errors.password = "Password must be at least 8 characters";
      }
      if (!fullName.trim()) {
        errors.fullName = "Full name is required";
      }
      if (username && username.length < 3) {
        errors.username = "Username must be at least 3 characters";
      }
      if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
        errors.username = "Username can only contain letters, numbers, and underscores";
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Email/Password submit
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) {
      return;
    }
    
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, fullName, username || undefined);
      }
      
      // Check for redirect after successful auth
      if (typeof window !== 'undefined') {
        const redirectPath = sessionStorage.getItem('redirectAfterAuth');
        if (redirectPath) {
          sessionStorage.removeItem('redirectAfterAuth');
          window.location.href = redirectPath;
          return;
        }
      }
      
      onClose();
    } catch (err: unknown) {
      // Provide user-friendly error messages
      const errorMessage = err instanceof Error ? err.message : "Authentication failed. Please try again.";
      if (errorMessage.includes("Invalid email")) {
        setError("Invalid email or password. Please check your credentials and try again.");
      } else if (errorMessage.includes("verify your email")) {
        setError("Please verify your email address before logging in. Check your inbox for the verification link.");
      } else if (errorMessage.includes("deactivated")) {
        setError("Your account has been deactivated. Please contact support for assistance.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setBusy(false);
    }
  };

  // Social auth handlers
  const handleGoogleAuth = async (credentialResponse: GoogleCredentialResponse | { credential?: string }) => {
    setSocialBusy("google");
    setError(null);
    try {
      if (!credentialResponse?.credential) {
        throw new Error("Failed to receive authentication from Google. Please try again.");
      }

      // Get API base URL from environment variable
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api';
      console.log('🔍 Google Auth: API_BASE =', API_BASE);
      console.log('🔍 Google Auth: Sending credential to backend...');

      // Send the Google credential to backend
      const response = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          token: credentialResponse.credential,
        }),
      });
      
      console.log('✅ Google Auth: Response received, status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Google auth error response:", errorData);
        
        // Provide specific error messages based on response
        let errorMessage: string;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData?.detail) {
          const detail = errorData.detail;
          // Parse backend error messages
          if (detail.includes("token verification failed")) {
            errorMessage = "Google authentication failed. Please try again or use email/password login.";
          } else if (detail.includes("email not verified")) {
            errorMessage = "Your Google email is not verified. Please verify your email with Google first.";
          } else if (detail.includes("Invalid token audience")) {
            errorMessage = "Invalid authentication token. Please try again.";
          } else if (detail.includes("expired")) {
            errorMessage = "Authentication token has expired. Please try again.";
          } else {
            errorMessage = detail;
          }
        } else {
          errorMessage = errorData?.message || "Google authentication failed. Please try again.";
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json() as GoogleAuthResponse;
      
      // Store tokens in localStorage (optional, cookies are primary)
      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
      }

      // Close modal and redirect if needed
      const redirectPath = sessionStorage.getItem('redirectAfterAuth');
      if (redirectPath) {
        sessionStorage.removeItem('redirectAfterAuth');
        window.location.href = redirectPath;
        return;
      }
      
      onClose();
      window.location.reload(); // Refresh to update auth state
    } catch (err: unknown) {
      console.error("Google auth error:", err);
      
      // Handle network errors specifically
      let errorMessage: string;
      if (err instanceof Error && (err.message === "Failed to fetch" || err.name === "TypeError")) {
        errorMessage = "Cannot connect to server. Please make sure the backend is running on http://localhost:8000";
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = "Google authentication failed. Please try again.";
      }
      
      setError(errorMessage);
    } finally {
      setSocialBusy(null);
    }
  };

  const handleAppleAuth = async () => {
    setSocialBusy("apple");
    setError(null);
    try {
      setError("Apple authentication coming soon!");
      setTimeout(() => setError(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Apple authentication failed");
    } finally {
      setSocialBusy(null);
    }
  };

  const handleBinanceAuth = async () => {
    setSocialBusy("binance");
    setError(null);
    try {
      setError("Binance authentication coming soon!");
      setTimeout(() => setError(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Binance authentication failed");
    } finally {
      setSocialBusy(null);
    }
  };

  const handleWalletAuth = async () => {
    setSocialBusy("wallet");
    setError(null);
    try {
      setError("Wallet authentication coming soon!");
      setTimeout(() => setError(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Wallet authentication failed");
    } finally {
      setSocialBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div className="flex gap-4">
            <button
              onClick={() => setMode("login")}
              className={`text-lg font-semibold pb-2 transition-colors ${
                mode === "login"
                  ? "text-white border-b-2 border-blue-500"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => setMode("register")}
              className={`text-lg font-semibold pb-2 transition-colors ${
                mode === "register"
                  ? "text-white border-b-2 border-blue-500"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              Sign Up
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Social Auth Buttons */}
          <div className="space-y-3">
            {/* Google OAuth Button */}
            <div className="w-full">
              <GoogleLogin
                onSuccess={handleGoogleAuth}
                onError={() => {
                  setError("Google authentication failed");
                  setTimeout(() => setError(null), 3000);
                }}
                useOneTap={false}
                theme="filled_black"
                size="large"
                width="100%"
                text={mode === "login" ? "signin_with" : "signup_with"}
                shape="rectangular"
              />
            </div>

            <button
              onClick={handleAppleAuth}
              disabled={!!socialBusy}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 hover:border-neutral-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {socialBusy === "apple" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
              )}
              <span className="text-white font-medium">Continue with Apple</span>
            </button>

            <button
              onClick={handleBinanceAuth}
              disabled={!!socialBusy}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 hover:border-neutral-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {socialBusy === "binance" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 126.61 126.61" fill="#F3BA2F">
                  <path d="M38.73 53.2l24.59-24.58 24.6 24.6 14.3-14.31L63.32 0 24.43 38.89l14.3 14.31zm-14.31 10.1L10.11 77.61l14.31 14.3 14.31-14.3-14.31-14.31zM77.61 63.3l14.31 14.31 14.31-14.31-14.31-14.3L77.61 63.3zm-14.29 14.3l-24.6 24.6-24.59-24.6-14.3 14.31 38.89 38.89 38.9-38.89-14.3-14.31zM63.31 77.61l-14.3-14.3 14.3-14.31 14.31 14.3-14.31 14.31z" />
                </svg>
              )}
              <span className="text-white font-medium">Continue with Binance</span>
            </button>

            <button
              onClick={handleWalletAuth}
              disabled={!!socialBusy}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 hover:border-neutral-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {socialBusy === "wallet" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M2 10h20" />
                </svg>
              )}
              <span className="text-white font-medium">Continue with Wallet</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-neutral-900 text-neutral-500 uppercase tracking-wide">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={submit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter your email address..."
                value={email}
                onChange={(e: any) => {
                  setEmail(e.target.value);
                  setValidationErrors((prev: any) => ({ ...prev, email: undefined }));
                }}
                className={`w-full px-4 py-3 rounded-lg bg-neutral-800 border ${
                  validationErrors.email ? "border-red-500" : "border-neutral-700"
                } text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                required
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.email}</p>
              )}
            </div>

            {/* Full Name (Register only) */}
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your full name..."
                  value={fullName}
                  onChange={(e: any) => {
                    setFullName(e.target.value);
                    setValidationErrors((prev: any) => ({ ...prev, fullName: undefined }));
                  }}
                  className={`w-full px-4 py-3 rounded-lg bg-neutral-800 border ${
                    validationErrors.fullName ? "border-red-500" : "border-neutral-700"
                  } text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                  required
                />
                {validationErrors.fullName && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.fullName}</p>
                )}
              </div>
            )}

            {/* Username (Register only, optional) */}
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Username <span className="text-neutral-500">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Choose a username..."
                  value={username}
                  onChange={(e: any) => {
                    setUsername(e.target.value);
                    setValidationErrors((prev: any) => ({ ...prev, username: undefined }));
                  }}
                  className={`w-full px-4 py-3 rounded-lg bg-neutral-800 border ${
                    validationErrors.username ? "border-red-500" : "border-neutral-700"
                  } text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                />
                {validationErrors.username && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.username}</p>
                )}
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password..."
                  value={password}
                  onChange={(e: any) => {
                    setPassword(e.target.value);
                    setValidationErrors((prev: any) => ({ ...prev, password: undefined }));
                  }}
                  className={`w-full px-4 py-3 pr-12 rounded-lg bg-neutral-800 border ${
                    validationErrors.password ? "border-red-500" : "border-neutral-700"
                  } text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.password}</p>
              )}

              {/* Password Strength Indicator (Register only) */}
              {mode === "register" && password && passwordStrength && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        passwordStrength.score <= 2
                          ? "text-red-400"
                          : passwordStrength.score <= 3
                            ? "text-yellow-400"
                            : "text-green-400"
                      }`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  {password.length < 8 && (
                    <p className="text-xs text-neutral-400">
                      Password must be at least 8 characters
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Terms checkbox (Register only) */}
            {mode === "register" && (
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreeToTerms}
                  onChange={(e: any) => setAgreeToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="terms" className="text-sm text-neutral-400">
                  Please keep me updated by email with the latest crypto news, research findings,
                  reward programs, event updates, coin listings and more information from Lokifi.
                </label>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">
                  {typeof error === 'string' ? error : 'An error occurred. Please try again.'}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-medium transition-all flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Please wait...</span>
                </>
              ) : (
                <span>{mode === "login" ? "Log In" : "Create an account"}</span>
              )}
            </button>

            {/* Terms notice (Register only) */}
            {mode === "register" && (
              <p className="text-xs text-center text-neutral-500">
                By proceeding, you agree to Lokifi&apos;s{" "}
                <a href="/terms" className="text-blue-400 hover:underline">
                  Terms of Use
                </a>{" "}
                &{" "}
                <a href="/privacy" className="text-blue-400 hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
