'use client';

import { ArrowLeft, Bell, RefreshCw, Save, Settings } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../src/components/AuthProvider';

interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  type_preferences: {
    follow_notifications: boolean;
    dm_notifications: boolean;
    ai_reply_notifications: boolean;
    mention_notifications: boolean;
    system_notifications: boolean;
  };
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone: string;
  daily_digest_enabled: boolean;
  weekly_digest_enabled: boolean;
  digest_time: string;
}

export default function NotificationPreferencesPage() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load preferences
  useEffect(() => {
    if (!user) return;

    const loadPreferences = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = localStorage.getItem('token') || localStorage.getItem('social_token');
        if (!token) {
          setError('No authentication token found');
          return;
        }

        const response = await fetch('/api/notifications/preferences', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setPreferences(data);
      } catch (err) {
        console.error('Failed to load preferences:', err);
        setError(err instanceof Error ? err.message : 'Failed to load preferences');
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  // Save preferences
  const savePreferences = async () => {
    if (!preferences || !user) return;

    try {
      setIsSaving(true);
      setError(null);
      setSaveMessage(null);

      const token = localStorage.getItem('token') || localStorage.getItem('social_token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setSaveMessage('Preferences saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  // Update preference
  const updatePreference = (path: string, value: boolean | string) => {
    if (!preferences) return;

    const keys = path.split('.');
    const newPrefs = { ...preferences };

    if (keys.length === 1) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any required: dynamic path accessor pattern
      (newPrefs as any)[keys[0]] = value;
    } else if (keys.length === 2) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any required: dynamic path accessor pattern
      (newPrefs as any)[keys[0]] = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any required: dynamic path accessor pattern
        ...(newPrefs as any)[keys[0]],
        [keys[1]]: value,
      };
    }

    setPreferences(newPrefs);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-surface-0">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-lokifi/20 flex items-center justify-center">
              <Bell className="w-8 h-8 text-lokifi" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-4">Access Required</h1>
            <p className="text-gray-400 mb-6">
              Please log in to manage your notification preferences.
            </p>
            <Link
              href="/login"
              className="px-4 py-2 bg-lokifi hover:bg-lokifi/90 text-white rounded-lg transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/notifications"
              className="p-2 text-gray-400 hover:text-white hover:bg-surface-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Settings className="w-6 h-6 text-lokifi" />
            <h1 className="text-2xl font-semibold text-white">Notification Preferences</h1>
          </div>
          <p className="text-gray-400">Customize how and when you receive notifications.</p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {saveMessage && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg text-emerald-400">
            {saveMessage}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-surface-300 border-t-lokifi rounded-full mx-auto mb-4" />
            <p className="text-gray-400">Loading preferences...</p>
          </div>
        )}

        {/* Preferences Form */}
        {!isLoading && preferences && (
          <div className="space-y-8">
            {/* General Settings */}
            <div className="bg-surface-100 border border-surface-200/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">General Settings</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-white font-medium">In-App Notifications</label>
                    <p className="text-sm text-gray-400">Show notifications in the application</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.in_app_enabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updatePreference('in_app_enabled', e.target.checked)
                    }
                    className="w-4 h-4 rounded border-surface-300 bg-surface-200 text-lokifi accent-lokifi"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-white font-medium">Push Notifications</label>
                    <p className="text-sm text-gray-400">
                      Browser push notifications when app is closed
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.push_enabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updatePreference('push_enabled', e.target.checked)
                    }
                    className="w-4 h-4 rounded border-surface-300 bg-surface-200 text-lokifi accent-lokifi"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-white font-medium">Email Notifications</label>
                    <p className="text-sm text-gray-400">Send notifications to your email</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.email_enabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updatePreference('email_enabled', e.target.checked)
                    }
                    className="w-4 h-4 rounded border-surface-300 bg-surface-200 text-lokifi accent-lokifi"
                  />
                </div>
              </div>
            </div>

            {/* Notification Types */}
            <div className="bg-surface-100 border border-surface-200/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Notification Types</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">👤</span>
                    <div>
                      <label className="text-white font-medium">Follow Notifications</label>
                      <p className="text-sm text-gray-400">When someone starts following you</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.type_preferences.follow_notifications}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updatePreference('type_preferences.follow_notifications', e.target.checked)
                    }
                    className="w-4 h-4 rounded border-surface-300 bg-surface-200 text-lokifi accent-lokifi"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💬</span>
                    <div>
                      <label className="text-white font-medium">Direct Messages</label>
                      <p className="text-sm text-gray-400">When you receive a direct message</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.type_preferences.dm_notifications}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updatePreference('type_preferences.dm_notifications', e.target.checked)
                    }
                    className="w-4 h-4 rounded border-surface-300 bg-surface-200 text-lokifi accent-lokifi"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🤖</span>
                    <div>
                      <label className="text-white font-medium">AI Responses</label>
                      <p className="text-sm text-gray-400">
                        When AI assistant completes a response
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.type_preferences.ai_reply_notifications}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updatePreference('type_preferences.ai_reply_notifications', e.target.checked)
                    }
                    className="w-4 h-4 rounded border-surface-300 bg-surface-200 text-lokifi accent-lokifi"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🏷️</span>
                    <div>
                      <label className="text-white font-medium">Mentions</label>
                      <p className="text-sm text-gray-400">When someone mentions you</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.type_preferences.mention_notifications}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updatePreference('type_preferences.mention_notifications', e.target.checked)
                    }
                    className="w-4 h-4 rounded border-surface-300 bg-surface-200 text-lokifi accent-lokifi"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <label className="text-white font-medium">System Notifications</label>
                      <p className="text-sm text-gray-400">Important system announcements</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.type_preferences.system_notifications}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updatePreference('type_preferences.system_notifications', e.target.checked)
                    }
                    className="w-4 h-4 rounded border-surface-300 bg-surface-200 text-lokifi accent-lokifi"
                  />
                </div>
              </div>
            </div>

            {/* Digest Settings */}
            <div className="bg-surface-100 border border-surface-200/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Digest Settings</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-white font-medium">Daily Digest</label>
                    <p className="text-sm text-gray-400">
                      Receive a daily summary of notifications
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.daily_digest_enabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updatePreference('daily_digest_enabled', e.target.checked)
                    }
                    className="w-4 h-4 rounded border-surface-300 bg-surface-200 text-lokifi accent-lokifi"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-white font-medium">Weekly Digest</label>
                    <p className="text-sm text-gray-400">
                      Receive a weekly summary of notifications
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.weekly_digest_enabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updatePreference('weekly_digest_enabled', e.target.checked)
                    }
                    className="w-4 h-4 rounded border-surface-300 bg-surface-200 text-lokifi accent-lokifi"
                  />
                </div>

                {(preferences.daily_digest_enabled || preferences.weekly_digest_enabled) && (
                  <div>
                    <label className="block text-white font-medium mb-2">Digest Time</label>
                    <input
                      type="time"
                      value={preferences.digest_time}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updatePreference('digest_time', e.target.value)
                      }
                      className="bg-surface-200 border border-surface-300/50 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-lokifi focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="bg-surface-100 border border-surface-200/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Quiet Hours</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-medium mb-2">Start Time</label>
                  <input
                    type="time"
                    value={preferences.quiet_hours_start || '22:00'}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updatePreference('quiet_hours_start', e.target.value)
                    }
                    className="w-full bg-surface-200 border border-surface-300/50 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-lokifi focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">End Time</label>
                  <input
                    type="time"
                    value={preferences.quiet_hours_end || '08:00'}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updatePreference('quiet_hours_end', e.target.value)
                    }
                    className="w-full bg-surface-200 border border-surface-300/50 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-lokifi focus:border-transparent"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-400 mt-2">
                During quiet hours, only urgent notifications will be delivered.
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={savePreferences}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-lokifi hover:bg-lokifi/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Preferences
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
