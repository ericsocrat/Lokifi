'use client';

import { usePreferences } from '@/src/components/dashboard/PreferencesContext';
import {
  Bell,
  Check,
  Globe,
  Lock,
  Moon,
  Palette,
  Settings,
  Shield,
  Sun,
  User,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';

type SettingsTab = 'general' | 'appearance' | 'notifications' | 'privacy' | 'account';

const currencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
];

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
];

export default function SettingsPage() {
  const { darkMode, setDarkMode, currency, setCurrency } = usePreferences();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState({
    priceAlerts: true,
    portfolioUpdates: true,
    marketNews: false,
    weeklyReport: true,
    emailNotifications: true,
  });

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Settings className="w-5 h-5" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-5 h-5" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
    { id: 'privacy', label: 'Privacy & Security', icon: <Shield className="w-5 h-5" /> },
    { id: 'account', label: 'Account', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Header */}
      <div className="border-b border-surface-300/50 bg-surface-50/80 backdrop-blur-xl sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-lokifi-light" />
            Settings
          </h1>
          <p className="text-sm text-surface-300 mt-1">Manage your preferences and account settings</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <nav className="w-64 shrink-0">
            <div className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-linear-to-r from-lokifi/15 to-electric/10 text-lokifi-light border border-lokifi/20'
                      : 'text-surface-300 hover:bg-surface-200 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Settings Content */}
          <div className="flex-1 space-y-6">
            {activeTab === 'general' && (
              <>
                {/* Currency */}
                <div className="border border-surface-300/50 rounded-2xl bg-surface-100/50 backdrop-blur-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-lokifi/10 rounded-lg">
                      <Wallet className="w-5 h-5 text-lokifi-light" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Display Currency</h3>
                      <p className="text-sm text-surface-300">
                        Choose your preferred currency for displaying values
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {currencies.map((curr) => (
                      <button
                        key={curr.code}
                        onClick={() => setCurrency(curr.code)}
                        className={`p-3 rounded-xl border transition-all duration-200 ${
                          currency === curr.code
                            ? 'border-lokifi bg-lokifi/10 text-lokifi-light'
                            : 'border-surface-300 hover:border-surface-200 text-surface-300'
                        }`}
                      >
                        <span className="text-lg font-bold">{curr.symbol}</span>
                        <span className="text-sm ml-2">{curr.code}</span>
                        {currency === curr.code && (
                          <Check className="w-4 h-4 ml-auto inline text-lokifi" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div className="border border-surface-300/50 rounded-2xl bg-surface-100/50 backdrop-blur-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-lokifi/10 rounded-lg">
                      <Globe className="w-5 h-5 text-lokifi-light" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Language</h3>
                      <p className="text-sm text-surface-300">Select your preferred language</p>
                    </div>
                  </div>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-200 border border-surface-300 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-lokifi/20 focus:border-lokifi/50"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {activeTab === 'appearance' && (
              <div className="border border-surface-300/50 rounded-2xl bg-surface-100/50 backdrop-blur-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-lokifi/10 rounded-lg">
                    <Palette className="w-5 h-5 text-lokifi-light" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Theme</h3>
                    <p className="text-sm text-surface-300">Choose your preferred color scheme</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setDarkMode(false)}
                    className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                      !darkMode
                        ? 'border-lokifi bg-lokifi/10'
                        : 'border-surface-300 hover:border-surface-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Sun className="w-6 h-6 text-amber-400" />
                      <span className="font-semibold text-white">Light</span>
                    </div>
                    <div className="h-16 rounded-lg bg-white border border-surface-200" />
                  </button>
                  <button
                    onClick={() => setDarkMode(true)}
                    className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                      darkMode
                        ? 'border-lokifi bg-lokifi/10'
                        : 'border-surface-300 hover:border-surface-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Moon className="w-6 h-6 text-indigo-400" />
                      <span className="font-semibold text-white">Dark</span>
                    </div>
                    <div className="h-16 rounded-lg bg-surface-0 border border-surface-200" />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="border border-surface-300/50 rounded-2xl bg-surface-100/50 backdrop-blur-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-lokifi/10 rounded-lg">
                    <Bell className="w-5 h-5 text-lokifi-light" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Notification Preferences</h3>
                    <p className="text-sm text-surface-300">
                      Manage how and when you receive notifications
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  {Object.entries(notifications).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between py-3 border-b border-surface-300/50 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-white capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-sm text-surface-300">
                          Receive notifications for {key.toLowerCase()}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setNotifications((prev) => ({
                            ...prev,
                            [key]: !value,
                          }))
                        }
                        className={`w-12 h-6 rounded-full transition-colors duration-200 ${
                          value ? 'bg-lokifi' : 'bg-surface-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                            value ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="border border-surface-300/50 rounded-2xl bg-surface-100/50 backdrop-blur-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-lokifi/10 rounded-lg">
                    <Lock className="w-5 h-5 text-lokifi-light" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Privacy & Security</h3>
                    <p className="text-sm text-surface-300">
                      Manage your privacy settings and account security
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <button className="w-full p-4 text-left rounded-xl border border-surface-300 hover:border-lokifi/30 hover:bg-surface-200/50 transition-all">
                    <h4 className="font-medium text-white">Change Password</h4>
                    <p className="text-sm text-surface-300">Update your account password</p>
                  </button>
                  <button className="w-full p-4 text-left rounded-xl border border-surface-300 hover:border-lokifi/30 hover:bg-surface-200/50 transition-all">
                    <h4 className="font-medium text-white">Two-Factor Authentication</h4>
                    <p className="text-sm text-surface-300">Add an extra layer of security</p>
                  </button>
                  <button className="w-full p-4 text-left rounded-xl border border-surface-300 hover:border-lokifi/30 hover:bg-surface-200/50 transition-all">
                    <h4 className="font-medium text-white">Download Your Data</h4>
                    <p className="text-sm text-surface-300">Export all your portfolio data</p>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="border border-surface-300/50 rounded-2xl bg-surface-100/50 backdrop-blur-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-lokifi/10 rounded-lg">
                    <User className="w-5 h-5 text-lokifi-light" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Account Settings</h3>
                    <p className="text-sm text-surface-300">Manage your account information</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <button className="w-full p-4 text-left rounded-xl border border-surface-300 hover:border-lokifi/30 hover:bg-surface-200/50 transition-all">
                    <h4 className="font-medium text-white">Edit Profile</h4>
                    <p className="text-sm text-surface-300">Update your name and email</p>
                  </button>
                  <button className="w-full p-4 text-left rounded-xl border border-surface-300 hover:border-lokifi/30 hover:bg-surface-200/50 transition-all">
                    <h4 className="font-medium text-white">Connected Accounts</h4>
                    <p className="text-sm text-surface-300">Manage linked brokerage accounts</p>
                  </button>
                  <button className="w-full p-4 text-left rounded-xl border border-rose-500/30 hover:border-rose-500/50 hover:bg-rose-500/10 text-rose-400 transition-all">
                    <h4 className="font-medium">Delete Account</h4>
                    <p className="text-sm text-rose-400/70">
                      Permanently delete your account and data
                    </p>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

