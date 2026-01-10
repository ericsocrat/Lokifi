'use client';

import { AuthModal } from '@/src/components/AuthModal';
import { useAuth } from '@/src/components/AuthProvider';
import { ArrowRight, Mail, Sparkles, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Redirect authenticated users
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main
        className="min-h-screen bg-surface-0 flex items-center justify-center"
        role="main"
        aria-label="Checking login state"
      >
        <div className="flex items-center gap-3 text-surface-300">
          <div className="w-5 h-5 border-2 border-lokifi border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      </main>
    );
  }

  if (user) return null;

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  return (
    <main
      className="min-h-screen bg-surface-0 flex"
      role="main"
      aria-label="Login or create account"
    >
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-lokifi/30 via-electric/20 to-surface-0" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-lokifi/40 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-electric/30 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 max-w-lg mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-14 h-14 bg-gradient-to-br from-lokifi to-electric rounded-2xl flex items-center justify-center shadow-xl shadow-lokifi/30">
              <span className="text-white font-bold text-2xl">L</span>
            </div>
            <span className="font-bold text-3xl text-white">Lokifi</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Your finances,
            <br />
            <span className="bg-gradient-to-r from-lokifi-light to-electric bg-clip-text text-transparent">
              all in one place
            </span>
          </h1>

          <p className="text-surface-300 text-lg leading-relaxed mb-8">
            Track your investments, monitor markets, and make smarter financial decisions with
            real-time insights and beautiful analytics.
          </p>

          {/* Features List */}
          <div className="space-y-4">
            {[
              'Real-time portfolio tracking',
              'Multi-asset support (crypto, stocks, & more)',
              'Smart alerts & notifications',
              'Beautiful, intuitive interface',
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-surface-300">
                <div className="w-6 h-6 rounded-full bg-lokifi/20 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-lokifi-light" />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Auth Options */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-10">
            <div className="w-12 h-12 bg-gradient-to-br from-lokifi to-electric rounded-xl flex items-center justify-center shadow-lg shadow-lokifi/30">
              <span className="text-white font-bold text-xl">L</span>
            </div>
            <span className="font-bold text-2xl text-white">Lokifi</span>
          </div>

          {/* Card */}
          <div className="bg-surface-50/80 border border-surface-300/50 rounded-3xl p-8 backdrop-blur-xl shadow-2xl shadow-black/20">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
              <p className="text-surface-300">Sign in to continue to your dashboard</p>
            </div>

            {/* Auth Buttons */}
            <div className="space-y-4">
              <button
                onClick={() => handleOpenAuth('login')}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-lokifi to-electric hover:from-lokifi-dark hover:to-electric/90 rounded-xl text-white font-semibold transition-all duration-200 shadow-lg shadow-lokifi/30 hover:shadow-lokifi/50 hover:scale-[1.02]"
              >
                Sign In
                <ArrowRight className="w-5 h-5 ml-auto" aria-hidden="true" />
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-surface-300/50" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 text-sm text-surface-300 bg-surface-50/80">
                    New to Lokifi?
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleOpenAuth('register')}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-surface-100 hover:bg-surface-200 border border-surface-300 hover:border-lokifi/30 rounded-xl text-white font-medium transition-all duration-200"
              >
                <User className="w-5 h-5" aria-hidden="true" />
                Create an Account
              </button>
            </div>

            {/* Demo Mode */}
            <div className="mt-8 p-4 bg-surface-100/50 border border-surface-300/50 rounded-xl">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-lokifi-light mt-0.5" />
                <div>
                  <p className="text-sm text-surface-200 font-medium">Try without signing up</p>
                  <p className="text-xs text-surface-300 mt-1">
                    Explore the dashboard with demo data to see what Lokifi can do.
                  </p>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1 text-xs text-lokifi-light hover:text-lokifi mt-2 font-medium"
                  >
                    Enter Demo Mode <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <nav
            className="flex items-center justify-center gap-6 mt-8 text-sm text-surface-300"
            aria-label="Footer navigation"
          >
            <Link href="/markets" className="hover:text-white transition-colors">
              Markets
            </Link>
            <span className="w-1 h-1 rounded-full bg-surface-300" aria-hidden="true" />
            <Link href="/" className="hover:text-white transition-colors">
              About
            </Link>
            <span className="w-1 h-1 rounded-full bg-surface-300" aria-hidden="true" />
            <button className="hover:text-white transition-colors">Help</button>
          </nav>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal initialMode={authMode} onClose={() => setShowAuthModal(false)} />
      )}
    </main>
  );
}
