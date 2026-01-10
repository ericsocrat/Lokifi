'use client';

import {
  Activity,
  BarChart3,
  Bell,
  Calendar,
  Camera,
  Download,
  Edit,
  Globe,
  Heart,
  Lock,
  MessageCircle,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  Star,
  User,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authToken } from '../../src/lib/api/auth';

interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  is_public: boolean;
  follower_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
}

interface ProfileStats {
  profile_completeness: number;
  activity_score: number;
  account_age_days: number;
  last_active_days_ago?: number;
  total_logins: number;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = authToken();
    if (token) {
      fetchProfile();
      fetchStats();
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const token = authToken();
      const response = await fetch('/api/profile/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);
      } else {
        setError('Failed to load profile');
      }
    } catch {
      setError('Network error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = authToken();
      const response = await fetch('/api/profile/enhanced/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="flex items-center gap-3 text-surface-300" aria-live="polite">
          <div className="w-5 h-5 border-2 border-lokifi border-t-transparent rounded-full animate-spin" />
          <span>Loading profile...</span>
          <span className="sr-only">Loading your profile details</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6">
        <div
          className="max-w-md w-full border border-red-500/30 bg-red-500/10 rounded-2xl p-8 text-center backdrop-blur-sm"
          role="alert"
          aria-live="assertive"
        >
          <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Profile</h2>
          <p className="text-surface-300 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-lokifi to-electric rounded-xl text-white font-medium transition-all hover:from-lokifi-dark hover:to-electric/90"
            aria-label="Try again loading profile"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="border border-surface-300/50 rounded-2xl bg-gradient-to-br from-surface-100/80 to-surface-100/40 backdrop-blur-sm overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-lokifi/30 via-electric/20 to-lokifi/30" />

        <div className="px-6 pb-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 -mt-12">
            {/* Avatar and Info */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="relative">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt="Profile"
                    width={112}
                    height={112}
                    className="rounded-2xl object-cover border-4 border-surface-100 shadow-xl"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-lokifi to-electric flex items-center justify-center border-4 border-surface-100 shadow-xl">
                    <User className="w-12 h-12 text-white" />
                  </div>
                )}
                <Link
                  href="/profile/edit"
                  className="absolute -bottom-2 -right-2 bg-lokifi p-2.5 rounded-xl hover:bg-lokifi-dark transition-colors shadow-lg"
                  aria-label="Update profile picture"
                >
                  <Camera className="w-4 h-4 text-white" />
                </Link>
              </div>

              <div className="pb-2">
                <h1 className="text-2xl font-bold text-white mb-1">
                  {profile?.display_name || 'User'}
                </h1>
                <p className="text-surface-300 text-lg">@{profile?.username}</p>
                {profile?.bio && <p className="text-surface-300 mt-2 max-w-xl">{profile.bio}</p>}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Link
                href="/profile/edit"
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-lokifi to-electric hover:from-lokifi-dark hover:to-electric/90 rounded-xl text-white font-medium transition-all shadow-lg shadow-lokifi/30"
                aria-label="Edit your profile information"
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-5 py-2.5 bg-surface-200 hover:bg-surface-300 border border-surface-300 rounded-xl text-white font-medium transition-all"
                aria-label="Open account settings"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex flex-wrap items-center gap-6 mt-6 pt-6 border-t border-surface-300/50">
            <div className="flex items-center gap-2 text-surface-300 hover:text-white transition-colors cursor-pointer">
              <Users className="w-4 h-4" />
              <span className="font-semibold text-white">{profile?.follower_count || 0}</span>
              <span>followers</span>
            </div>
            <div className="flex items-center gap-2 text-surface-300 hover:text-white transition-colors cursor-pointer">
              <Users className="w-4 h-4" />
              <span className="font-semibold text-white">{profile?.following_count || 0}</span>
              <span>following</span>
            </div>
            <div className="flex items-center gap-2 text-surface-300">
              <Calendar className="w-4 h-4" />
              <span>Joined {new Date(profile?.created_at || '').toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${profile?.is_public ? 'bg-green-500' : 'bg-amber-500'}`}
              />
              <span className="text-surface-300">
                {profile?.is_public ? 'Public profile' : 'Private profile'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-lokifi/30 rounded-2xl bg-gradient-to-br from-lokifi/10 via-lokifi/5 to-transparent p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-lokifi/20 rounded-xl">
                <BarChart3 className="w-5 h-5 text-lokifi-light" />
              </div>
              <Sparkles className="w-4 h-4 text-lokifi-light animate-pulse" />
            </div>
            <p className="text-sm text-surface-300 mb-1">Profile Completeness</p>
            <p className="text-2xl font-bold text-white">{stats.profile_completeness}%</p>
            <div className="mt-3 bg-surface-300 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-lokifi to-electric transition-all duration-500"
                style={{ width: `${stats.profile_completeness}%` }}
              />
            </div>
          </div>

          <div className="border border-green-500/30 rounded-2xl bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-green-500/20 rounded-xl">
                <Activity className="w-5 h-5 text-green-400" />
              </div>
            </div>
            <p className="text-sm text-surface-300 mb-1">Activity Score</p>
            <p className="text-2xl font-bold text-white">{stats.activity_score}</p>
          </div>

          <div className="border border-purple-500/30 rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-purple-500/20 rounded-xl">
                <Calendar className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <p className="text-sm text-surface-300 mb-1">Account Age</p>
            <p className="text-2xl font-bold text-white">{stats.account_age_days} days</p>
          </div>

          <div className="border border-amber-500/30 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-amber-500/20 rounded-xl">
                <Star className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <p className="text-sm text-surface-300 mb-1">Total Logins</p>
            <p className="text-2xl font-bold text-white">{stats.total_logins}</p>
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="border border-surface-300/50 rounded-2xl bg-surface-100/50 backdrop-blur-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-300/50 flex items-center gap-3">
          <div className="p-2 bg-lokifi/10 rounded-xl">
            <Activity className="w-5 h-5 text-lokifi-light" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Recent Activity</h3>
            <p className="text-xs text-surface-300">Your latest profile updates</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4 p-3 bg-surface-200/50 rounded-xl">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Heart className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm">Updated profile information</p>
              <p className="text-xs text-surface-300">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 bg-surface-200/50 rounded-xl">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <MessageCircle className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm">Changed notification preferences</p>
              <p className="text-xs text-surface-300">1 day ago</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 bg-surface-200/50 rounded-xl">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <User className="w-4 h-4 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm">Profile created</p>
              <p className="text-xs text-surface-300">{stats?.account_age_days} days ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="border border-surface-300/50 rounded-2xl bg-surface-100/50 backdrop-blur-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-300/50 flex items-center gap-3">
        <div className="p-2 bg-lokifi/10 rounded-xl">
          <Settings className="w-5 h-5 text-lokifi-light" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Quick Settings</h3>
          <p className="text-xs text-surface-300">Manage your account preferences</p>
        </div>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/settings"
          className="flex items-center gap-4 p-4 bg-surface-200/50 hover:bg-surface-200 border border-surface-300/50 hover:border-lokifi/30 rounded-xl transition-all group"
        >
          <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
            <User className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h4 className="text-white font-medium group-hover:text-lokifi-light transition-colors">
              Account Settings
            </h4>
            <p className="text-surface-300 text-sm">Manage your account information</p>
          </div>
        </Link>

        <Link
          href="/settings"
          className="flex items-center gap-4 p-4 bg-surface-200/50 hover:bg-surface-200 border border-surface-300/50 hover:border-lokifi/30 rounded-xl transition-all group"
        >
          <div className="p-3 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors">
            <Bell className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h4 className="text-white font-medium group-hover:text-lokifi-light transition-colors">
              Notifications
            </h4>
            <p className="text-surface-300 text-sm">Control notification preferences</p>
          </div>
        </Link>

        <Link
          href="/settings"
          className="flex items-center gap-4 p-4 bg-surface-200/50 hover:bg-surface-200 border border-surface-300/50 hover:border-lokifi/30 rounded-xl transition-all group"
        >
          <div className="p-3 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-colors">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h4 className="text-white font-medium group-hover:text-lokifi-light transition-colors">
              Privacy & Security
            </h4>
            <p className="text-surface-300 text-sm">Manage privacy settings</p>
          </div>
        </Link>

        <Link
          href="/settings"
          className="flex items-center gap-4 p-4 bg-surface-200/50 hover:bg-surface-200 border border-surface-300/50 hover:border-lokifi/30 rounded-xl transition-all group"
        >
          <div className="p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
            <Globe className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h4 className="text-white font-medium group-hover:text-lokifi-light transition-colors">
              Preferences
            </h4>
            <p className="text-surface-300 text-sm">Language, timezone, and more</p>
          </div>
        </Link>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="border border-surface-300/50 rounded-2xl bg-surface-100/50 backdrop-blur-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-300/50 flex items-center gap-3">
        <div className="p-2 bg-lokifi/10 rounded-xl">
          <Shield className="w-5 h-5 text-lokifi-light" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Privacy Overview</h3>
          <p className="text-xs text-surface-300">Control your data and visibility</p>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between p-4 bg-surface-200/50 border border-surface-300/50 rounded-xl">
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-xl ${profile?.is_public ? 'bg-green-500/10' : 'bg-amber-500/10'}`}
            >
              {profile?.is_public ? (
                <Globe className="w-5 h-5 text-green-400" />
              ) : (
                <Lock className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <h4 className="text-white font-medium">Profile Visibility</h4>
              <p className="text-surface-300 text-sm">
                Your profile is{' '}
                {profile?.is_public
                  ? 'public and visible to everyone'
                  : 'private and only visible to you'}
              </p>
            </div>
          </div>
          <Link
            href="/profile/edit"
            className="px-4 py-2 bg-lokifi/20 hover:bg-lokifi/30 text-lokifi-light rounded-xl text-sm font-medium transition-colors"
            aria-label="Change profile visibility settings"
          >
            Change
          </Link>
        </div>

        <div className="flex items-center justify-between p-4 bg-surface-200/50 border border-surface-300/50 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Download className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h4 className="text-white font-medium">Data Export</h4>
              <p className="text-surface-300 text-sm">Download all your data (GDPR compliant)</p>
            </div>
          </div>
          <button
            className="px-4 py-2 bg-surface-300 hover:bg-surface-400 text-white rounded-xl text-sm font-medium transition-colors"
            aria-label="Export your data"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-surface-0" role="main" aria-label="Profile page">
      {/* Header */}
      <div className="border-b border-surface-300/50 bg-surface-50/80 backdrop-blur-xl sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-lokifi to-electric rounded-xl">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Profile</h1>
              <p className="text-sm text-surface-300">Manage your account and preferences</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div
            className="inline-flex bg-surface-100 border border-surface-300/50 rounded-xl p-1"
            role="tablist"
            aria-label="Profile tabs"
          >
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'settings', label: 'Settings', icon: Settings },
              { id: 'privacy', label: 'Privacy', icon: Shield },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  activeTab === id
                    ? 'bg-lokifi text-white shadow-lg shadow-lokifi/30'
                    : 'text-surface-300 hover:text-white hover:bg-surface-200'
                }`}
                role="tab"
                aria-selected={activeTab === id}
                aria-pressed={activeTab === id}
                aria-label={`${label} tab`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'settings' && renderSettingsTab()}
        {activeTab === 'privacy' && renderPrivacyTab()}
      </div>
    </main>
  );
}
