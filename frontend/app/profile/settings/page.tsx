'use client';

"use client";
'use client';


'use client';

import React, { useState, useEffect } from 'react';
'use client';

import { useAuth } from '../../../src/components/AuthProvider';
'use client';

import { Navbar } from '../../../src/components/Navbar';
'use client';

import Link from 'next/link';
'use client';

import { 
'use client';

  Save, 
'use client';

  ArrowLeft, 
'use client';

  User, 
'use client';

  Mail, 
'use client';

  MapPin, 
'use client';

  Globe,
'use client';

  Clock,
'use client';

  Shield,
'use client';

  Bell,
'use client';

  Trash2,
'use client';

  AlertTriangle
'use client';

} from 'lucide-react';
'use client';


'use client';

interface UserSettings {
'use client';

  full_name: string;
'use client';

  email: string;
'use client';

  timezone: string;
'use client';

  language: string;
'use client';

}
'use client';


'use client';

const timezones = [
'use client';

  'UTC',
'use client';

  'America/New_York',
'use client';

  'America/Chicago', 
'use client';

  'America/Denver',
'use client';

  'America/Los_Angeles',
'use client';

  'Europe/London',
'use client';

  'Europe/Paris',
'use client';

  'Europe/Berlin',
'use client';

  'Asia/Tokyo',
'use client';

  'Asia/Shanghai',
'use client';

  'Asia/Kolkata',
'use client';

  'Australia/Sydney'
'use client';

];
'use client';


'use client';

const languages = [
'use client';

  { code: 'en', name: 'English' },
'use client';

  { code: 'es', name: 'Spanish' },
'use client';

  { code: 'fr', name: 'French' },
'use client';

  { code: 'de', name: 'German' },
'use client';

  { code: 'it', name: 'Italian' },
'use client';

  { code: 'pt', name: 'Portuguese' },
'use client';

  { code: 'ja', name: 'Japanese' },
'use client';

  { code: 'zh', name: 'Chinese' }
'use client';

];
'use client';


'use client';

export default function UserSettingsPage() {
'use client';

  const { user } = useAuth();
'use client';

  const [formData, setFormData] = useState<UserSettings>({
'use client';

    full_name: '',
'use client';

    email: '',
'use client';

    timezone: '',
'use client';

    language: 'en',
'use client';

  });
'use client';

  const [isLoading, setIsLoading] = useState(true);
'use client';

  const [isSaving, setIsSaving] = useState(false);
'use client';

  const [error, setError] = useState<string | null>(null);
'use client';

  const [saveMessage, setSaveMessage] = useState<string | null>(null);
'use client';

  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'danger'>('general');
'use client';

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
'use client';


'use client';

  useEffect(() => {
'use client';

    if (!user) return;
'use client';


'use client';

    const loadSettings = async () => {
'use client';

      try {
'use client';

        setIsLoading(true);
'use client';

        setError(null);
'use client';


'use client';

        const token = localStorage.getItem('token') || localStorage.getItem('social_token');
'use client';

        if (!token) {
'use client';

          setError('No authentication token found');
'use client';

          return;
'use client';

        }
'use client';


'use client';

        const response = await fetch('/api/profile/settings/user', {
'use client';

          headers: {
'use client';

            'Authorization': `Bearer ${token}`,
'use client';

            'Content-Type': 'application/json',
'use client';

          },
'use client';

        });
'use client';


'use client';

        if (response.ok) {
'use client';

          const settings = await response.json();
'use client';

          setFormData({
'use client';

            full_name: settings.full_name || '',
'use client';

            email: settings.email || '',
'use client';

            timezone: settings.timezone || '',
'use client';

            language: settings.language || 'en',
'use client';

          });
'use client';

        } else {
'use client';

          setError('Failed to load settings');
'use client';

        }
'use client';


'use client';

      } catch (err) {
'use client';

        console.error('Failed to load settings:', err);
'use client';

        setError(err instanceof Error ? err.message : 'Failed to load settings');
'use client';

      } finally {
'use client';

        setIsLoading(false);
'use client';

      }
'use client';

    };
'use client';


'use client';

    loadSettings();
'use client';

  }, [user]);
'use client';


'use client';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
'use client';

    const { name, value } = e.target;
'use client';

    setFormData(prev => ({ ...prev, [name]: value }));
'use client';

  };
'use client';


'use client';

  const handleSubmit = async (e: React.FormEvent) => {
'use client';

    e.preventDefault();
'use client';

    
'use client';

    if (!user) return;
'use client';


'use client';

    try {
'use client';

      setIsSaving(true);
'use client';

      setError(null);
'use client';

      setSaveMessage(null);
'use client';


'use client';

      const token = localStorage.getItem('token') || localStorage.getItem('social_token');
'use client';

      if (!token) {
'use client';

        setError('No authentication token found');
'use client';

        return;
'use client';

      }
'use client';


'use client';

      const response = await fetch('/api/profile/settings/user', {
'use client';

        method: 'PUT',
'use client';

        headers: {
'use client';

          'Authorization': `Bearer ${token}`,
'use client';

          'Content-Type': 'application/json',
'use client';

        },
'use client';

        body: JSON.stringify(formData),
'use client';

      });
'use client';


'use client';

      if (!response.ok) {
'use client';

        const errorData = await response.json();
'use client';

        throw new Error(errorData.detail || `HTTP ${response.status}`);
'use client';

      }
'use client';


'use client';

      setSaveMessage('Settings updated successfully!');
'use client';

      setTimeout(() => setSaveMessage(null), 3000);
'use client';


'use client';

    } catch (err) {
'use client';

      console.error('Failed to update settings:', err);
'use client';

      setError(err instanceof Error ? err.message : 'Failed to update settings');
'use client';

    } finally {
'use client';

      setIsSaving(false);
'use client';

    }
'use client';

  };
'use client';


'use client';

  const handleDeleteAccount = async () => {
'use client';

    if (!user || !showDeleteConfirm) return;
'use client';


'use client';

    try {
'use client';

      const token = localStorage.getItem('token') || localStorage.getItem('social_token');
'use client';

      if (!token) {
'use client';

        setError('No authentication token found');
'use client';

        return;
'use client';

      }
'use client';


'use client';

      const response = await fetch('/api/profile/me', {
'use client';

        method: 'DELETE',
'use client';

        headers: {
'use client';

          'Authorization': `Bearer ${token}`,
'use client';

        },
'use client';

      });
'use client';


'use client';

      if (response.ok) {
'use client';

        // Logout and redirect
'use client';

        localStorage.removeItem('token');
'use client';

        localStorage.removeItem('social_token');
'use client';

        window.location.href = '/';
'use client';

      } else {
'use client';

        throw new Error('Failed to delete account');
'use client';

      }
'use client';


'use client';

    } catch (err) {
'use client';

      console.error('Failed to delete account:', err);
'use client';

      setError(err instanceof Error ? err.message : 'Failed to delete account');
'use client';

    }
'use client';

  };
'use client';


'use client';

  if (!user) {
'use client';

    return (
'use client';

      <div className="min-h-screen bg-gray-900 text-white">
'use client';

        <Navbar />
'use client';

        <div className="max-w-4xl mx-auto px-4 py-8">
'use client';

          <div className="text-center">
'use client';

            <h1 className="text-2xl font-bold mb-4">Please log in to access settings</h1>
'use client';

            <Link href="/login" className="text-blue-400 hover:text-blue-300">
'use client';

              Go to Login
'use client';

            </Link>
'use client';

          </div>
'use client';

        </div>
'use client';

      </div>
'use client';

    );
'use client';

  }
'use client';


'use client';

  if (isLoading) {
'use client';

    return (
'use client';

      <div className="min-h-screen bg-gray-900 text-white">
'use client';

        <Navbar />
'use client';

        <div className="max-w-4xl mx-auto px-4 py-8">
'use client';

          <div className="animate-pulse">
'use client';

            <div className="h-8 bg-gray-800 rounded w-1/3 mb-6"></div>
'use client';

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
'use client';

              <div className="h-64 bg-gray-800 rounded-lg"></div>
'use client';

              <div className="lg:col-span-3 h-64 bg-gray-800 rounded-lg"></div>
'use client';

            </div>
'use client';

          </div>
'use client';

        </div>
'use client';

      </div>
'use client';

    );
'use client';

  }
'use client';


'use client';

  return (
'use client';

    <div className="min-h-screen bg-gray-900 text-white">
'use client';

      <Navbar />
'use client';

      
'use client';

      <div className="max-w-4xl mx-auto px-4 py-8">
'use client';

        {/* Header */}
'use client';

        <div className="flex items-center justify-between mb-6">
'use client';

          <div className="flex items-center space-x-4">
'use client';

            <Link 
'use client';

              href="/profile" 
'use client';

              className="p-2 hover:bg-gray-800 rounded-lg"
'use client';

            >
'use client';

              <ArrowLeft className="w-5 h-5" />
'use client';

            </Link>
'use client';

            <h1 className="text-2xl font-bold">Account Settings</h1>
'use client';

          </div>
'use client';

        </div>
'use client';


'use client';

        {/* Messages */}
'use client';

        {error && (
'use client';

          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg">
'use client';

            <p className="text-red-300">{error}</p>
'use client';

          </div>
'use client';

        )}
'use client';


'use client';

        {saveMessage && (
'use client';

          <div className="mb-6 p-4 bg-green-900/50 border border-green-500 rounded-lg">
'use client';

            <p className="text-green-300">{saveMessage}</p>
'use client';

          </div>
'use client';

        )}
'use client';


'use client';

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
'use client';

          {/* Sidebar */}
'use client';

          <div className="lg:col-span-1">
'use client';

            <nav className="space-y-1">
'use client';

              {[
'use client';

                { id: 'general', label: 'General', icon: User },
'use client';

                { id: 'security', label: 'Security', icon: Shield },
'use client';

                { id: 'notifications', label: 'Notifications', icon: Bell },
'use client';

                { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
'use client';

              ].map(({ id, label, icon: Icon }) => (
'use client';

                <button
'use client';

                  key={id}
'use client';

                  onClick={() => setActiveTab(id as any)}
'use client';

                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center space-x-2 ${
'use client';

                    activeTab === id 
'use client';

                      ? 'bg-blue-600 text-white' 
'use client';

                      : 'text-gray-300 hover:bg-gray-800'
'use client';

                  }`}
'use client';

                >
'use client';

                  <Icon className="w-4 h-4" />
'use client';

                  <span>{label}</span>
'use client';

                </button>
'use client';

              ))}
'use client';

            </nav>
'use client';

          </div>
'use client';


'use client';

          {/* Content */}
'use client';

          <div className="lg:col-span-3">
'use client';

            {activeTab === 'general' && (
'use client';

              <form onSubmit={handleSubmit} className="space-y-6">
'use client';

                <div className="bg-gray-800 rounded-lg p-6">
'use client';

                  <h3 className="text-lg font-semibold mb-4 flex items-center">
'use client';

                    <User className="w-5 h-5 mr-2" />
'use client';

                    Personal Information
'use client';

                  </h3>
'use client';

                  <div className="space-y-4">
'use client';

                    <div>
'use client';

                      <label className="block text-sm font-medium text-gray-300 mb-2">
'use client';

                        Full Name
'use client';

                      </label>
'use client';

                      <input
'use client';

                        type="text"
'use client';

                        name="full_name"
'use client';

                        value={formData.full_name}
'use client';

                        onChange={handleInputChange}
'use client';

                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg 
'use client';

                                 focus:outline-none focus:border-blue-500 text-white"
'use client';

                        placeholder="Enter your full name"
'use client';

                      />
'use client';

                    </div>
'use client';


'use client';

                    <div>
'use client';

                      <label className="block text-sm font-medium text-gray-300 mb-2">
'use client';

                        Email Address
'use client';

                      </label>
'use client';

                      <input
'use client';

                        type="email"
'use client';

                        name="email"
'use client';

                        value={formData.email}
'use client';

                        onChange={handleInputChange}
'use client';

                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg 
'use client';

                                 focus:outline-none focus:border-blue-500 text-white"
'use client';

                        placeholder="Enter your email"
'use client';

                        disabled
'use client';

                      />
'use client';

                      <p className="text-sm text-gray-400 mt-1">
'use client';

                        Email changes require verification. Contact support to change your email.
'use client';

                      </p>
'use client';

                    </div>
'use client';

                  </div>
'use client';

                </div>
'use client';


'use client';

                <div className="bg-gray-800 rounded-lg p-6">
'use client';

                  <h3 className="text-lg font-semibold mb-4 flex items-center">
'use client';

                    <Globe className="w-5 h-5 mr-2" />
'use client';

                    Localization
'use client';

                  </h3>
'use client';

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
'use client';

                    <div>
'use client';

                      <label className="block text-sm font-medium text-gray-300 mb-2">
'use client';

                        Timezone
'use client';

                      </label>
'use client';

                      <select
'use client';

                        name="timezone"
'use client';

                        value={formData.timezone}
'use client';

                        onChange={handleInputChange}
'use client';

                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg 
'use client';

                                 focus:outline-none focus:border-blue-500 text-white"
'use client';

                      >
'use client';

                        <option value="">Select timezone</option>
'use client';

                        {timezones.map(tz => (
'use client';

                          <option key={tz} value={tz}>{tz}</option>
'use client';

                        ))}
'use client';

                      </select>
'use client';

                    </div>
'use client';


'use client';

                    <div>
'use client';

                      <label className="block text-sm font-medium text-gray-300 mb-2">
'use client';

                        Language
'use client';

                      </label>
'use client';

                      <select
'use client';

                        name="language"
'use client';

                        value={formData.language}
'use client';

                        onChange={handleInputChange}
'use client';

                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg 
'use client';

                                 focus:outline-none focus:border-blue-500 text-white"
'use client';

                      >
'use client';

                        {languages.map(lang => (
'use client';

                          <option key={lang.code} value={lang.code}>{lang.name}</option>
'use client';

                        ))}
'use client';

                      </select>
'use client';

                    </div>
'use client';

                  </div>
'use client';

                </div>
'use client';


'use client';

                <div className="flex justify-end">
'use client';

                  <button
'use client';

                    type="submit"
'use client';

                    disabled={isSaving}
'use client';

                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 
'use client';

                             disabled:cursor-not-allowed rounded-lg flex items-center space-x-2"
'use client';

                  >
'use client';

                    {isSaving ? (
'use client';

                      <>
'use client';

                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
'use client';

                        <span>Saving...</span>
'use client';

                      </>
'use client';

                    ) : (
'use client';

                      <>
'use client';

                        <Save className="w-4 h-4" />
'use client';

                        <span>Save Changes</span>
'use client';

                      </>
'use client';

                    )}
'use client';

                  </button>
'use client';

                </div>
'use client';

              </form>
'use client';

            )}
'use client';


'use client';

            {activeTab === 'security' && (
'use client';

              <div className="space-y-6">
'use client';

                <div className="bg-gray-800 rounded-lg p-6">
'use client';

                  <h3 className="text-lg font-semibold mb-4 flex items-center">
'use client';

                    <Shield className="w-5 h-5 mr-2" />
'use client';

                    Security Settings
'use client';

                  </h3>
'use client';

                  <div className="space-y-4">
'use client';

                    <div className="p-4 bg-gray-700 rounded-lg">
'use client';

                      <h4 className="font-medium mb-2">Password</h4>
'use client';

                      <p className="text-sm text-gray-400 mb-3">
'use client';

                        Change your account password to keep your account secure.
'use client';

                      </p>
'use client';

                      <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
'use client';

                        Change Password
'use client';

                      </button>
'use client';

                    </div>
'use client';


'use client';

                    <div className="p-4 bg-gray-700 rounded-lg">
'use client';

                      <h4 className="font-medium mb-2">Two-Factor Authentication</h4>
'use client';

                      <p className="text-sm text-gray-400 mb-3">
'use client';

                        Add an extra layer of security to your account.
'use client';

                      </p>
'use client';

                      <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg">
'use client';

                        Enable 2FA
'use client';

                      </button>
'use client';

                    </div>
'use client';


'use client';

                    <div className="p-4 bg-gray-700 rounded-lg">
'use client';

                      <h4 className="font-medium mb-2">Active Sessions</h4>
'use client';

                      <p className="text-sm text-gray-400 mb-3">
'use client';

                        Manage devices that are signed in to your account.
'use client';

                      </p>
'use client';

                      <button className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">
'use client';

                        View Sessions
'use client';

                      </button>
'use client';

                    </div>
'use client';

                  </div>
'use client';

                </div>
'use client';

              </div>
'use client';

            )}
'use client';


'use client';

            {activeTab === 'notifications' && (
'use client';

              <div className="bg-gray-800 rounded-lg p-6">
'use client';

                <h3 className="text-lg font-semibold mb-4 flex items-center">
'use client';

                  <Bell className="w-5 h-5 mr-2" />
'use client';

                  Notification Preferences
'use client';

                </h3>
'use client';

                <p className="text-gray-400 mb-4">
'use client';

                  Configure how you want to receive notifications.
'use client';

                </p>
'use client';

                <Link 
'use client';

                  href="/notifications/preferences"
'use client';

                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
'use client';

                >
'use client';

                  <Bell className="w-4 h-4 mr-2" />
'use client';

                  Manage Notifications
'use client';

                </Link>
'use client';

              </div>
'use client';

            )}
'use client';


'use client';

            {activeTab === 'danger' && (
'use client';

              <div className="bg-gray-800 rounded-lg p-6">
'use client';

                <h3 className="text-lg font-semibold mb-4 flex items-center text-red-400">
'use client';

                  <AlertTriangle className="w-5 h-5 mr-2" />
'use client';

                  Danger Zone
'use client';

                </h3>
'use client';

                <div className="space-y-4">
'use client';

                  <div className="p-4 border border-red-500 rounded-lg">
'use client';

                    <h4 className="font-medium text-red-400 mb-2">Delete Account</h4>
'use client';

                    <p className="text-sm text-gray-400 mb-3">
'use client';

                      Permanently delete your account and all associated data. This action cannot be undone.
'use client';

                    </p>
'use client';

                    {!showDeleteConfirm ? (
'use client';

                      <button 
'use client';

                        onClick={() => setShowDeleteConfirm(true)}
'use client';

                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white flex items-center space-x-2"
'use client';

                      >
'use client';

                        <Trash2 className="w-4 h-4" />
'use client';

                        <span>Delete Account</span>
'use client';

                      </button>
'use client';

                    ) : (
'use client';

                      <div className="space-y-3">
'use client';

                        <p className="text-red-300 font-medium">Are you absolutely sure?</p>
'use client';

                        <p className="text-sm text-gray-400">
'use client';

                          This will permanently delete your account, profile, and all associated data.
'use client';

                        </p>
'use client';

                        <div className="flex space-x-3">
'use client';

                          <button 
'use client';

                            onClick={handleDeleteAccount}
'use client';

                            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
'use client';

                          >
'use client';

                            Yes, Delete My Account
'use client';

                          </button>
'use client';

                          <button 
'use client';

                            onClick={() => setShowDeleteConfirm(false)}
'use client';

                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white"
'use client';

                          >
'use client';

                            Cancel
'use client';

                          </button>
'use client';

                        </div>
'use client';

                      </div>
'use client';

                    )}
'use client';

                  </div>
'use client';

                </div>
'use client';

              </div>
'use client';

            )}
'use client';

          </div>
'use client';

        </div>
'use client';

      </div>
'use client';

    </div>
'use client';

  );
'use client';

}