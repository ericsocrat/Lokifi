'use client';

import {
    Activity,
    BarChart3,
    Bell,
    Calendar,
    Camera,
    Edit,
    Globe,
    Heart,
    MessageCircle,
    Settings,
    Shield,
    Star,
    User,
    Users
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../../src/components/AuthProvider';
import { Navbar } from '../../src/components/Navbar';
import { authToken } from '../../src/lib/auth';

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
    const { user } = useAuth();
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
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const profileData = await response.json();
                setProfile(profileData);
            } else {
                setError('Failed to load profile');
            }
        } catch (err) {
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
                    'Authorization': `Bearer ${token}`
                }
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
            <div className="min-h-screen bg-gray-900">
                <Navbar />
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900">
                <Navbar />
                <div className="container mx-auto px-4 py-8">
                    <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
                        <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Profile</h2>
                        <p className="text-red-300">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const renderOverviewTab = () => (
        <div className="space-y-6">
            {/* Profile Header */}
            <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-start space-x-6">
                    <div className="relative">
                        {profile?.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt="Profile"
                                className="w-24 h-24 rounded-full object-cover border-4 border-blue-500"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center border-4 border-gray-600">
                                <User className="w-12 h-12 text-gray-400" />
                            </div>
                        )}
                        <Link
                            href="/profile/edit"
                            className="absolute -bottom-2 -right-2 bg-blue-600 p-2 rounded-full hover:bg-blue-700 transition-colors"
                        >
                            <Camera className="w-4 h-4 text-white" />
                        </Link>
                    </div>

                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-white mb-1">
                            {profile?.display_name || 'User'}
                        </h1>
                        <p className="text-gray-400 mb-2">@{profile?.username}</p>
                        {profile?.bio && (
                            <p className="text-gray-300 mb-4">{profile.bio}</p>
                        )}

                        <div className="flex items-center space-x-6 text-sm text-gray-400">
                            <div className="flex items-center space-x-1">
                                <Users className="w-4 h-4" />
                                <span>{profile?.follower_count || 0} followers</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Users className="w-4 h-4" />
                                <span>{profile?.following_count || 0} following</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>Joined {new Date(profile?.created_at || '').toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex space-x-2">
                        <Link
                            href="/profile/edit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                        >
                            <Edit className="w-4 h-4" />
                            <span>Edit Profile</span>
                        </Link>
                        <Link
                            href="/profile/settings"
                            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
                        >
                            <Settings className="w-4 h-4" />
                            <span>Settings</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Profile Completeness</p>
                                <p className="text-2xl font-bold text-white">{stats.profile_completeness}%</p>
                            </div>
                            <BarChart3 className="w-8 h-8 text-blue-500" />
                        </div>
                        <div className="mt-2 bg-gray-700 rounded-full h-2">
                            <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${stats.profile_completeness}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Activity Score</p>
                                <p className="text-2xl font-bold text-white">{stats.activity_score}</p>
                            </div>
                            <Activity className="w-8 h-8 text-green-500" />
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Account Age</p>
                                <p className="text-2xl font-bold text-white">{stats.account_age_days} days</p>
                            </div>
                            <Calendar className="w-8 h-8 text-purple-500" />
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Total Logins</p>
                                <p className="text-2xl font-bold text-white">{stats.total_logins}</p>
                            </div>
                            <Star className="w-8 h-8 text-yellow-500" />
                        </div>
                    </div>
                </div>
            )}

            {/* Activity Feed Placeholder */}
            <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-gray-400">
                        <Heart className="w-5 h-5 text-red-500" />
                        <span>Updated profile information</span>
                        <span className="text-sm">2 hours ago</span>
                    </div>
                    <div className="flex items-center space-x-3 text-gray-400">
                        <MessageCircle className="w-5 h-5 text-blue-500" />
                        <span>Changed notification preferences</span>
                        <span className="text-sm">1 day ago</span>
                    </div>
                    <div className="flex items-center space-x-3 text-gray-400">
                        <User className="w-5 h-5 text-green-500" />
                        <span>Profile created</span>
                        <span className="text-sm">{stats?.account_age_days} days ago</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSettingsTab = () => (
        <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                    href="/profile/settings"
                    className="flex items-center space-x-3 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                    <User className="w-6 h-6 text-blue-500" />
                    <div>
                        <h4 className="text-white font-medium">Account Settings</h4>
                        <p className="text-gray-400 text-sm">Manage your account information</p>
                    </div>
                </Link>

                <Link
                    href="/profile/settings"
                    className="flex items-center space-x-3 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                    <Bell className="w-6 h-6 text-green-500" />
                    <div>
                        <h4 className="text-white font-medium">Notifications</h4>
                        <p className="text-gray-400 text-sm">Control notification preferences</p>
                    </div>
                </Link>

                <Link
                    href="/profile/settings"
                    className="flex items-center space-x-3 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                    <Shield className="w-6 h-6 text-red-500" />
                    <div>
                        <h4 className="text-white font-medium">Privacy & Security</h4>
                        <p className="text-gray-400 text-sm">Manage privacy settings</p>
                    </div>
                </Link>

                <Link
                    href="/profile/settings"
                    className="flex items-center space-x-3 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                    <Globe className="w-6 h-6 text-purple-500" />
                    <div>
                        <h4 className="text-white font-medium">Preferences</h4>
                        <p className="text-gray-400 text-sm">Language, timezone, and more</p>
                    </div>
                </Link>
            </div>
        </div>
    );

    const renderPrivacyTab = () => (
        <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Privacy Overview</h3>
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                        <Globe className={`w-5 h-5 ${profile?.is_public ? 'text-green-500' : 'text-red-500'}`} />
                        <div>
                            <h4 className="text-white font-medium">Profile Visibility</h4>
                            <p className="text-gray-400 text-sm">
                                Your profile is {profile?.is_public ? 'public' : 'private'}
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/profile/edit"
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                        Change
                    </Link>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                        <Shield className="w-5 h-5 text-blue-500" />
                        <div>
                            <h4 className="text-white font-medium">Data Export</h4>
                            <p className="text-gray-400 text-sm">Download your data (GDPR compliant)</p>
                        </div>
                    </div>
                    <button className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-500 transition-colors">
                        Export
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-900">
            <Navbar />

            <div className="container mx-auto px-4 py-8">
                {/* Tab Navigation */}
                <div className="mb-8">
                    <div className="border-b border-gray-700">
                        <nav className="-mb-px flex space-x-8">
                            {[
                                { id: 'overview', label: 'Overview', icon: User },
                                { id: 'settings', label: 'Settings', icon: Settings },
                                { id: 'privacy', label: 'Privacy', icon: Shield }
                            ].map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => setActiveTab(id)}
                                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === id
                                            ? 'border-blue-500 text-blue-400'
                                            : 'border-transparent text-gray-400 hover:text-gray-300'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && renderOverviewTab()}
                {activeTab === 'settings' && renderSettingsTab()}
                {activeTab === 'privacy' && renderPrivacyTab()}
            </div>
        </div>
    );
}