'use client';

import { useAuth } from '@/src/components/AuthProvider';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Lock,
  PieChart,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="flex items-center gap-3 text-surface-400">
          <div className="w-5 h-5 border-2 border-lokifi border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render landing for authenticated users (they're being redirected)
  if (user) return null;

  const features = [
    {
      icon: Wallet,
      title: 'Portfolio Tracking',
      description: 'Track all your assets in one place - crypto, stocks, and more.',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: TrendingUp,
      title: 'Live Market Data',
      description: 'Real-time prices and market insights across all asset classes.',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: PieChart,
      title: 'Smart Analytics',
      description: 'Understand your portfolio allocation and performance at a glance.',
      gradient: 'from-lokifi to-electric',
    },
    {
      icon: Bell,
      title: 'Price Alerts',
      description: 'Never miss a price movement with customizable notifications.',
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      icon: BarChart3,
      title: 'Advanced Charts',
      description: 'Professional charting tools with technical indicators.',
      gradient: 'from-pink-500 to-rose-500',
    },
    {
      icon: Lock,
      title: 'Bank-Level Security',
      description: 'Your data is encrypted and protected with industry standards.',
      gradient: 'from-violet-500 to-purple-500',
    },
  ];

  return (
    <main
      className="min-h-screen bg-surface-0 overflow-hidden"
      role="main"
      aria-label="Landing page"
    >
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-6" aria-label="Hero section">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-lokifi/20 rounded-full blur-3xl opacity-50" />
          <div className="absolute top-1/3 -right-32 w-96 h-96 bg-electric/20 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-radial from-lokifi/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto relative">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-lokifi/10 border border-lokifi/20 rounded-full">
              <Sparkles className="w-4 h-4 text-lokifi-light" />
              <span className="text-sm font-medium text-lokifi-light">
                Your Personal Finance Command Center
              </span>
            </div>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-center text-white leading-tight mb-6">
            Track Your Wealth,
            <br />
            <span className="bg-gradient-to-r from-lokifi via-electric to-lokifi-light bg-clip-text text-transparent">
              Master Your Future
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-surface-400 text-center max-w-2xl mx-auto mb-10 leading-relaxed">
            The modern way to manage your portfolio. Track crypto, stocks, and all your assets with
            real-time data, smart analytics, and beautiful visualizations.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/dashboard"
              className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-lokifi to-electric hover:from-lokifi-dark hover:to-electric/90 rounded-2xl text-white font-semibold text-lg transition-all duration-300 shadow-xl shadow-lokifi/30 hover:shadow-lokifi/50 hover:scale-105"
              aria-label="Get started with Lokifi for free - no credit card required"
            >
              <Zap className="w-5 h-5" />
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/markets"
              className="flex items-center gap-2 px-8 py-4 bg-surface-100 hover:bg-surface-200 border border-surface-300 hover:border-lokifi/30 rounded-2xl text-white font-semibold text-lg transition-all duration-300"
              aria-label="Browse cryptocurrency, stocks, forex, and indices markets"
            >
              <TrendingUp className="w-5 h-5 text-green-500" />
              Explore Markets
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { label: 'Active Users', value: '50K+' },
              { label: 'Assets Tracked', value: '$2B+' },
              { label: 'Cryptocurrencies', value: '500+' },
              { label: 'Uptime', value: '99.9%' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center p-4 bg-surface-50/50 border border-surface-300/50 rounded-2xl backdrop-blur-sm"
              >
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-surface-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-surface-50/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need to
              <span className="text-lokifi-light"> Succeed</span>
            </h2>
            <p className="text-surface-400 text-lg max-w-xl mx-auto">
              Powerful features designed to help you track, analyze, and grow your investments.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group p-6 bg-surface-100/50 hover:bg-surface-100 border border-surface-300/50 hover:border-lokifi/30 rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-lokifi/10"
                >
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-surface-400 text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-12 bg-gradient-to-br from-lokifi/20 via-electric/10 to-transparent border border-lokifi/20 rounded-3xl overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-lokifi/30 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-electric/20 rounded-full blur-3xl" />

            <div className="relative text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Take Control?
              </h2>
              <p className="text-surface-300 text-lg mb-8 max-w-xl mx-auto">
                Join thousands of investors who trust Lokifi to manage their portfolio. No credit
                card required.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-surface-100 rounded-2xl text-surface-0 font-semibold text-lg transition-all duration-300 hover:scale-105"
              >
                Start Tracking for Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-surface-300/30">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-lokifi to-electric rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">L</span>
              </div>
              <span className="font-bold text-xl text-white">Lokifi</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-surface-400">
              <Link href="/markets" className="hover:text-white transition-colors">
                Markets
              </Link>
              <Link href="/dashboard" className="hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/portfolio" className="hover:text-white transition-colors">
                Portfolio
              </Link>
              <Link href="/alerts" className="hover:text-white transition-colors">
                Alerts
              </Link>
            </div>
            <p className="text-sm text-surface-400">
              © {new Date().getFullYear()} Lokifi. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
