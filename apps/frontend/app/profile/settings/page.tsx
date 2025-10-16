'use client';

import {
    AlertTriangle,
    ArrowLeft,
    Bell,
    Download,
    Save,
    Shield,
    Trash2,
    User
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Navbar } from '../../../src/components/Navbar';
import { authToken } from '../../../src/lib/api/auth';

interface UserSettings {
    full_name: string;
    email: string;
    timezone?: string;
    language: string;
    is_verified: boolean;
    is_active: boolean;
}

interface NotificationPreferences {
    email_enabled: boolean;
    email_follows: boolean;
    email_messages: boolean;
    email_ai_responses: boolean;
    push_enabled: boolean;
    push_follows: boolean;
    push_messages: boolean;
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general');
    const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
    const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        const token = authToken();
        if (token) {
            fetchUserSettings();
            fetchNotificationPreferences();
        }
    }, []);

    const fetchUserSettings = async () => {
        try {
            const token = authToken();
            const response = await fetch('/api/profile/settings/user', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const settings = await response.json();
                setUserSettings(settings);
            }
        } catch (err) {
            setError('Failed to load user settings');
        } finally {
            setLoading(false);
        }
    };

    const fetchNotificationPreferences = async () => {
        try {
            const token = authToken();
            const response = await fetch('/api/profile/settings/notifications', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const prefs = await response.json();
                setNotificationPrefs(prefs);
            }
        } catch (err) {
            console.error('Failed to load notification preferences:', err);
        }
    };

    const updateUserSettings = async (updatedSettings: Partial<UserSettings>) => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const token = authToken();
            const response = await fetch('/api/profile/settings/user', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedSettings)
            });

            if (response.ok) {
                const updated = await response.json();
                setUserSettings(updated);
                setSuccess('Settings updated successfully!');
            } else {
                throw new Error('Failed to update settings');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    const updateNotificationPreferences = async (updatedPrefs: Partial<NotificationPreferences>) => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const token = authToken();
            const response = await fetch('/api/profile/settings/notifications', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedPrefs)
            });

            if (response.ok) {
                const updated = await response.json();
                setNotificationPrefs(updated);
                setSuccess('Notification preferences updated successfully!');
            } else {
                throw new Error('Failed to update notification preferences');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update notification preferences');
        } finally {
            setSaving(false);
        }
    };

    const exportData = async () => {
        try {
            const token = authToken();
            const response = await fetch('/api/profile/enhanced/export', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `lokifi-profile-data-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setSuccess('Data exported successfully!');
            } else {
                throw new Error('Failed to export data');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to export data');
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

    const renderGeneralTab = () => (
        <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={userSettings?.full_name || ''}
                            onChange={(e) => setUserSettings(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Your full name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Email Address
                        </label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="email"
                                value={userSettings?.email || ''}
                                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled
                            />
                            {userSettings?.is_verified && (
                                <span className="px-2 py-1 bg-green-900 text-green-300 text-xs rounded">
                                    Verified
                                </span>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Timezone
                        </label>
                        <select
                            value={userSettings?.timezone || ''}
                            onChange={(e) => setUserSettings(prev => prev ? { ...prev, timezone: e.target.value } : null)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select timezone</option>
                            <option value="America/New_York">Eastern Time (ET)</option>
                            <option value="America/Chicago">Central Time (CT)</option>
                            <option value="America/Denver">Mountain Time (MT)</option>
                            <option value="America/Los_Angeles">Pacific Time (PT)</option>
                            <option value="Europe/London">GMT (London)</option>
                            <option value="Europe/Paris">CET (Paris)</option>
                            <option value="Asia/Tokyo">JST (Tokyo)</option>
                            <option value="UTC">UTC</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Language
                        </label>
                        <select
                            value={userSettings?.language || 'en'}
                            onChange={(e) => setUserSettings(prev => prev ? { ...prev, language: e.target.value } : null)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="en">English</option>
                            <option value="es">Español</option>
                            <option value="fr">Français</option>
                            <option value="de">Deutsch</option>
                            <option value="ja">日本語</option>
                            <option value="zh">中文</option>
                        </select>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={() => userSettings && updateUserSettings(userSettings)}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                    >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderNotificationsTab = () => (
        <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Email Notifications</h3>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-white font-medium">Enable Email Notifications</h4>
                            <p className="text-gray-400 text-sm">Receive notifications via email</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notificationPrefs?.email_enabled || false}
                                onChange={(e) => setNotificationPrefs(prev => prev ? { ...prev, email_enabled: e.target.checked } : null)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-white font-medium">New Followers</h4>
                            <p className="text-gray-400 text-sm">When someone follows you</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notificationPrefs?.email_follows || false}
                                onChange={(e) => setNotificationPrefs(prev => prev ? { ...prev, email_follows: e.target.checked } : null)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-white font-medium">Messages</h4>
                            <p className="text-gray-400 text-sm">When you receive a message</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notificationPrefs?.email_messages || false}
                                onChange={(e) => setNotificationPrefs(prev => prev ? { ...prev, email_messages: e.target.checked } : null)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Push Notifications</h3>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-white font-medium">Enable Push Notifications</h4>
                            <p className="text-gray-400 text-sm">Receive notifications on your device</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notificationPrefs?.push_enabled || false}
                                onChange={(e) => setNotificationPrefs(prev => prev ? { ...prev, push_enabled: e.target.checked } : null)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-white font-medium">Messages</h4>
                            <p className="text-gray-400 text-sm">Push notifications for messages</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notificationPrefs?.push_messages || false}
                                onChange={(e) => setNotificationPrefs(prev => prev ? { ...prev, push_messages: e.target.checked } : null)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={() => notificationPrefs && updateNotificationPreferences(notificationPrefs)}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                    >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderPrivacyTab = () => (
        <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Data & Privacy</h3>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                            <Download className="w-5 h-5 text-blue-500" />
                            <div>
                                <h4 className="text-white font-medium">Export Your Data</h4>
                                <p className="text-gray-400 text-sm">Download all your profile data (GDPR compliant)</p>
                            </div>
                        </div>
                        <button
                            onClick={exportData}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                            Export
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderDangerTab = () => (
        <div className="space-y-6">
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                    <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
                </div>

                <div className="space-y-4">
                    <div className="p-4 bg-gray-800 rounded-lg">
                        <h4 className="text-white font-medium mb-2">Delete Account</h4>
                        <p className="text-gray-400 text-sm mb-4">
                            Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center space-x-2">
                            <Trash2 className="w-4 h-4" />
                            <span>Delete Account</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-900">
            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                        <Link
                            href="/profile"
                            className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </Link>
                        <h1 className="text-2xl font-bold text-white">Settings</h1>
                    </div>
                </div>

                {/* Error/Success Messages */}
                {error && (
                    <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
                        <p className="text-red-300">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="bg-green-900/20 border border-green-500 rounded-lg p-4 mb-6">
                        <p className="text-green-300">{success}</p>
                    </div>
                )}

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Tab Navigation */}
                    <div className="lg:w-64">
                        <nav className="space-y-1">
                            {[
                                { id: 'general', label: 'General', icon: User },
                                { id: 'notifications', label: 'Notifications', icon: Bell },
                                { id: 'privacy', label: 'Privacy', icon: Shield },
                                { id: 'danger', label: 'Danger Zone', icon: AlertTriangle }
                            ].map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => setActiveTab(id)}
                                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === id
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1">
                        {activeTab === 'general' && renderGeneralTab()}
                        {activeTab === 'notifications' && renderNotificationsTab()}
                        {activeTab === 'privacy' && renderPrivacyTab()}
                        {activeTab === 'danger' && renderDangerTab()}
                    </div>
                </div>
            </div>
        </div>
    );
}