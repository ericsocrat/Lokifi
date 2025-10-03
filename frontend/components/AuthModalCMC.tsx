'use client';

import { Apple, Eye, EyeOff, Mail, Wallet, X } from 'lucide-react';
import { useState } from 'react';

interface AuthModalCMCProps {
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
}

export function AuthModalCMC({ onClose, defaultTab = 'login' }: AuthModalCMCProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepUpdated, setKeepUpdated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // TODO: Implement actual authentication logic
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulated delay

      if (activeTab === 'login') {
        // Handle login
        console.log('Login:', { email, password });
      } else {
        // Handle signup
        console.log('Signup:', { email, password, keepUpdated });
      }

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuth = (provider: string) => {
    console.log(`Authenticating with ${provider}`);
    // TODO: Implement social authentication
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-[#17171A] rounded-2xl shadow-2xl border border-gray-800 overflow-hidden">
        {/* Header with Tabs */}
        <div className="border-b border-gray-800">
          <div className="flex">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition-colors relative ${
                activeTab === 'login' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Log In
              {activeTab === 'login' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition-colors relative ${
                activeTab === 'signup' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Sign Up
              {activeTab === 'signup' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'login' && (
            <div className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address..."
                    className="w-full bg-[#1E1E22] border border-gray-700 rounded-lg px-4 py-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Unlock your account to view autofill suggestions
                </p>
                <button
                  type="button"
                  className="mt-2 flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                >
                  <span className="w-4 h-4 rounded-full border-2 border-blue-400 flex items-center justify-center">
                    🔓
                  </span>
                  Unlock account
                </button>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password..."
                    className="w-full bg-[#1E1E22] border border-gray-700 rounded-lg px-4 py-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Login Button */}
              <button
                onClick={handleSubmit}
                disabled={isLoading || !email || !password}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {isLoading ? 'Logging in...' : 'Log In'}
              </button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-[#17171A] text-gray-400">OR</span>
                </div>
              </div>

              {/* Social Login Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => handleSocialAuth('google')}
                  className="w-full bg-[#1E1E22] hover:bg-[#252529] border border-gray-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>

                <button
                  onClick={() => handleSocialAuth('apple')}
                  className="w-full bg-[#1E1E22] hover:bg-[#252529] border border-gray-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-3"
                >
                  <Apple className="w-5 h-5" />
                  Continue with Apple
                </button>

                <button
                  onClick={() => handleSocialAuth('binance')}
                  className="w-full bg-[#1E1E22] hover:bg-[#252529] border border-gray-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 126.61 126.61" fill="#F3BA2F">
                    <path d="M38.73 53.2l24.59-24.58 24.6 24.6 14.3-14.31L63.32 0 24.43 38.89zm-14.31 10.12L10.11 77.63l14.31 14.31 14.31-14.31zm28.61 0l24.59 24.59 24.6-24.6 14.31 14.32-38.9 38.91-38.91-38.88v-.03zm53.22 0l14.31-14.31 14.31 14.31-14.31 14.31z" />
                  </svg>
                  Continue with Binance
                </button>

                <button
                  onClick={() => handleSocialAuth('wallet')}
                  className="w-full bg-[#1E1E22] hover:bg-[#252529] border border-gray-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-3"
                >
                  <Wallet className="w-5 h-5" />
                  Continue with Wallet
                </button>
              </div>
            </div>
          )}

          {activeTab === 'signup' && (
            <div className="space-y-4">
              {/* Social Signup Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => handleSocialAuth('google')}
                  className="w-full bg-[#1E1E22] hover:bg-[#252529] border border-gray-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>

                <button
                  onClick={() => handleSocialAuth('apple')}
                  className="w-full bg-[#1E1E22] hover:bg-[#252529] border border-gray-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-3"
                >
                  <Apple className="w-5 h-5" />
                  Continue with Apple
                </button>

                <button
                  onClick={() => handleSocialAuth('binance')}
                  className="w-full bg-[#1E1E22] hover:bg-[#252529] border border-gray-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 126.61 126.61" fill="#F3BA2F">
                    <path d="M38.73 53.2l24.59-24.58 24.6 24.6 14.3-14.31L63.32 0 24.43 38.89zm-14.31 10.12L10.11 77.63l14.31 14.31 14.31-14.31zm28.61 0l24.59 24.59 24.6-24.6 14.31 14.32-38.9 38.91-38.91-38.88v-.03zm53.22 0l14.31-14.31 14.31 14.31-14.31 14.31z" />
                  </svg>
                  Continue with Binance
                </button>

                <button
                  onClick={() => handleSocialAuth('wallet')}
                  className="w-full bg-[#1E1E22] hover:bg-[#252529] border border-gray-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-3"
                >
                  <Wallet className="w-5 h-5" />
                  Continue with Wallet
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-[#17171A] text-gray-400">OR CONTINUE WITH EMAIL</span>
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address..."
                    className="w-full bg-[#1E1E22] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password..."
                    className="w-full bg-[#1E1E22] border border-gray-700 rounded-lg px-4 py-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Newsletter Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepUpdated}
                  onChange={(e) => setKeepUpdated(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-600 bg-[#1E1E22] text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-sm text-gray-400">
                  Please keep me updated by email with the latest crypto news, research findings,
                  reward programs, event updates, coin listings and more information from
                  CoinMarketCap.
                </span>
              </label>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Create Account Button */}
              <button
                onClick={handleSubmit}
                disabled={isLoading || !email || !password}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {isLoading ? 'Creating account...' : 'Create an account'}
              </button>

              {/* Terms */}
              <p className="text-xs text-gray-500 text-center">
                By proceeding, you agree to CoinMarketCap's{' '}
                <a href="#" className="text-blue-400 hover:text-blue-300">
                  Terms of Use
                </a>{' '}
                &{' '}
                <a href="#" className="text-blue-400 hover:text-blue-300">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
