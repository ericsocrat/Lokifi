'use client';

"use client";
'use client';


'use client';

import React, { useState, useEffect } from 'react';
'use client';

import { useAuth } from '../../src/components/AuthProvider';
'use client';

import { Navbar } from '../../src/components/Navbar';
'use client';

import Link from 'next/link';
'use client';

import { 
'use client';

  User, 
'use client';

  Edit, 
'use client';

  Settings, 
'use client';

  Shield, 
'use client';

  Bell, 
'use client';

  MapPin, 
'use client';

  Calendar,
'use client';

  Globe,
'use client';

  Camera,
'use client';

  Mail,
'use client';

  Phone,
'use client';

  Link as LinkIcon
'use client';

} from 'lucide-react';
'use client';


'use client';

interface UserProfile {
'use client';

  id: string;
'use client';

  user_id: string;
'use client';

  username: string;
'use client';

  display_name: string;
'use client';

  bio: string;
'use client';

  avatar_url: string;
'use client';

  is_public: boolean;
'use client';

  follower_count: number;
'use client';

  following_count: number;
'use client';

  created_at: string;
'use client';

  updated_at: string;
'use client';

}
'use client';


'use client';

interface UserSettings {
'use client';

  id: string;
'use client';

  email: string;
'use client';

  full_name: string;
'use client';

  timezone: string;
'use client';

  language: string;
'use client';

  is_verified: boolean;
'use client';

  is_active: boolean;
'use client';

  created_at: string;
'use client';

  updated_at: string;
'use client';

  last_login: string;
'use client';

}
'use client';


'use client';

export default function ProfilePage() {
'use client';

  const { user } = useAuth();
'use client';

  const [profile, setProfile] = useState<UserProfile | null>(null);
'use client';

  const [settings, setSettings] = useState<UserSettings | null>(null);
'use client';

  const [isLoading, setIsLoading] = useState(true);
'use client';

  const [error, setError] = useState<string | null>(null);
'use client';

  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'privacy'>('overview');
'use client';


'use client';

  useEffect(() => {
'use client';

    if (!user) return;
'use client';


'use client';

    const loadProfileData = async () => {
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

        // Load profile
'use client';

        const profileResponse = await fetch('/api/profile/me', {
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

        if (profileResponse.ok) {
'use client';

          const profileData = await profileResponse.json();
'use client';

          setProfile(profileData);
'use client';

        }
'use client';


'use client';

        // Load settings
'use client';

        const settingsResponse = await fetch('/api/profile/settings/user', {
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

        if (settingsResponse.ok) {
'use client';

          const settingsData = await settingsResponse.json();
'use client';

          setSettings(settingsData);
'use client';

        }
'use client';


'use client';

      } catch (err) {
'use client';

        console.error('Failed to load profile data:', err);
'use client';

        setError(err instanceof Error ? err.message : 'Failed to load profile');
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

    loadProfileData();
'use client';

  }, [user]);
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

            <h1 className="text-2xl font-bold mb-4">Please log in to view your profile</h1>
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

            <div className="h-32 bg-gray-800 rounded-lg mb-6"></div>
'use client';

            <div className="h-8 bg-gray-800 rounded w-1/3 mb-4"></div>
'use client';

            <div className="h-6 bg-gray-800 rounded w-2/3 mb-4"></div>
'use client';

            <div className="h-4 bg-gray-800 rounded w-1/2"></div>
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

        {/* Profile Header */}
'use client';

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
'use client';

          <div className="flex items-start justify-between">
'use client';

            <div className="flex items-center space-x-4">
'use client';

              <div className="relative">
'use client';

                <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center">
'use client';

                  {profile?.avatar_url ? (
'use client';

                    <img 
'use client';

                      src={profile.avatar_url} 
'use client';

                      alt="Profile" 
'use client';

                      className="w-20 h-20 rounded-full object-cover"
'use client';

                    />
'use client';

                  ) : (
'use client';

                    <User className="w-8 h-8 text-gray-400" />
'use client';

                  )}
'use client';

                </div>
'use client';

                <button className="absolute -bottom-1 -right-1 p-1 bg-blue-600 rounded-full hover:bg-blue-700">
'use client';

                  <Camera className="w-3 h-3" />
'use client';

                </button>
'use client';

              </div>
'use client';

              
'use client';

              <div>
'use client';

                <h1 className="text-2xl font-bold">{profile?.display_name || settings?.full_name}</h1>
'use client';

                <p className="text-gray-400">@{profile?.username || 'username-not-set'}</p>
'use client';

                {profile?.bio && (
'use client';

                  <p className="text-gray-300 mt-2 max-w-md">{profile.bio}</p>
'use client';

                )}
'use client';

                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
'use client';

                  <span>{profile?.follower_count || 0} followers</span>
'use client';

                  <span>{profile?.following_count || 0} following</span>
'use client';

                  <span className="flex items-center">
'use client';

                    <Calendar className="w-4 h-4 mr-1" />
'use client';

                    Joined {settings?.created_at ? new Date(settings.created_at).toLocaleDateString() : 'Unknown'}
'use client';

                  </span>
'use client';

                </div>
'use client';

              </div>
'use client';

            </div>
'use client';

            
'use client';

            <div className="flex space-x-2">
'use client';

              <Link 
'use client';

                href="/profile/edit" 
'use client';

                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center space-x-2"
'use client';

              >
'use client';

                <Edit className="w-4 h-4" />
'use client';

                <span>Edit Profile</span>
'use client';

              </Link>
'use client';

              <Link 
'use client';

                href="/profile/settings" 
'use client';

                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center space-x-2"
'use client';

              >
'use client';

                <Settings className="w-4 h-4" />
'use client';

                <span>Settings</span>
'use client';

              </Link>
'use client';

            </div>
'use client';

          </div>
'use client';

        </div>
'use client';


'use client';

        {/* Navigation Tabs */}
'use client';

        <div className="flex space-x-1 mb-6">
'use client';

          {[
'use client';

            { id: 'overview', label: 'Overview', icon: User },
'use client';

            { id: 'settings', label: 'Settings', icon: Settings },
'use client';

            { id: 'privacy', label: 'Privacy', icon: Shield },
'use client';

          ].map(({ id, label, icon: Icon }) => (
'use client';

            <button
'use client';

              key={id}
'use client';

              onClick={() => setActiveTab(id as any)}
'use client';

              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
'use client';

                activeTab === id 
'use client';

                  ? 'bg-blue-600 text-white' 
'use client';

                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
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

        </div>
'use client';


'use client';

        {/* Tab Content */}
'use client';

        {activeTab === 'overview' && (
'use client';

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
'use client';

            {/* Profile Information */}
'use client';

            <div className="bg-gray-800 rounded-lg p-6">
'use client';

              <h3 className="text-lg font-semibold mb-4 flex items-center">
'use client';

                <User className="w-5 h-5 mr-2" />
'use client';

                Profile Information
'use client';

              </h3>
'use client';

              <div className="space-y-3">
'use client';

                <div>
'use client';

                  <label className="text-sm text-gray-400">Display Name</label>
'use client';

                  <p className="text-white">{profile?.display_name || 'Not set'}</p>
'use client';

                </div>
'use client';

                <div>
'use client';

                  <label className="text-sm text-gray-400">Username</label>
'use client';

                  <p className="text-white">@{profile?.username || 'Not set'}</p>
'use client';

                </div>
'use client';

                <div>
'use client';

                  <label className="text-sm text-gray-400">Bio</label>
'use client';

                  <p className="text-white">{profile?.bio || 'No bio added'}</p>
'use client';

                </div>
'use client';

                <div>
'use client';

                  <label className="text-sm text-gray-400">Profile Visibility</label>
'use client';

                  <p className="text-white flex items-center">
'use client';

                    <Globe className="w-4 h-4 mr-2" />
'use client';

                    {profile?.is_public ? 'Public' : 'Private'}
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

            {/* Account Information */}
'use client';

            <div className="bg-gray-800 rounded-lg p-6">
'use client';

              <h3 className="text-lg font-semibold mb-4 flex items-center">
'use client';

                <Settings className="w-5 h-5 mr-2" />
'use client';

                Account Information
'use client';

              </h3>
'use client';

              <div className="space-y-3">
'use client';

                <div>
'use client';

                  <label className="text-sm text-gray-400">Email</label>
'use client';

                  <p className="text-white flex items-center">
'use client';

                    <Mail className="w-4 h-4 mr-2" />
'use client';

                    {settings?.email}
'use client';

                    {settings?.is_verified && (
'use client';

                      <span className="ml-2 px-2 py-1 bg-green-600 text-xs rounded">Verified</span>
'use client';

                    )}
'use client';

                  </p>
'use client';

                </div>
'use client';

                <div>
'use client';

                  <label className="text-sm text-gray-400">Full Name</label>
'use client';

                  <p className="text-white">{settings?.full_name}</p>
'use client';

                </div>
'use client';

                <div>
'use client';

                  <label className="text-sm text-gray-400">Timezone</label>
'use client';

                  <p className="text-white flex items-center">
'use client';

                    <MapPin className="w-4 h-4 mr-2" />
'use client';

                    {settings?.timezone || 'Not set'}
'use client';

                  </p>
'use client';

                </div>
'use client';

                <div>
'use client';

                  <label className="text-sm text-gray-400">Language</label>
'use client';

                  <p className="text-white">{settings?.language || 'en'}</p>
'use client';

                </div>
'use client';

                <div>
'use client';

                  <label className="text-sm text-gray-400">Last Login</label>
'use client';

                  <p className="text-white">
'use client';

                    {settings?.last_login 
'use client';

                      ? new Date(settings.last_login).toLocaleString() 
'use client';

                      : 'Unknown'
'use client';

                    }
'use client';

                  </p>
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

        {activeTab === 'settings' && (
'use client';

          <div className="bg-gray-800 rounded-lg p-6">
'use client';

            <h3 className="text-lg font-semibold mb-4">Quick Settings</h3>
'use client';

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
'use client';

              <Link 
'use client';

                href="/profile/edit" 
'use client';

                className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center space-x-3"
'use client';

              >
'use client';

                <Edit className="w-5 h-5 text-blue-400" />
'use client';

                <span>Edit Profile</span>
'use client';

              </Link>
'use client';

              <Link 
'use client';

                href="/profile/settings" 
'use client';

                className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center space-x-3"
'use client';

              >
'use client';

                <Settings className="w-5 h-5 text-green-400" />
'use client';

                <span>Account Settings</span>
'use client';

              </Link>
'use client';

              <Link 
'use client';

                href="/notifications/preferences" 
'use client';

                className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center space-x-3"
'use client';

              >
'use client';

                <Bell className="w-5 h-5 text-yellow-400" />
'use client';

                <span>Notifications</span>
'use client';

              </Link>
'use client';

              <Link 
'use client';

                href="/profile/privacy" 
'use client';

                className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center space-x-3"
'use client';

              >
'use client';

                <Shield className="w-5 h-5 text-red-400" />
'use client';

                <span>Privacy & Security</span>
'use client';

              </Link>
'use client';

            </div>
'use client';

          </div>
'use client';

        )}
'use client';


'use client';

        {activeTab === 'privacy' && (
'use client';

          <div className="bg-gray-800 rounded-lg p-6">
'use client';

            <h3 className="text-lg font-semibold mb-4">Privacy & Security</h3>
'use client';

            <div className="space-y-4">
'use client';

              <div className="p-4 bg-gray-700 rounded-lg">
'use client';

                <h4 className="font-medium mb-2">Profile Visibility</h4>
'use client';

                <p className="text-sm text-gray-400 mb-2">
'use client';

                  Control who can see your profile information
'use client';

                </p>
'use client';

                <label className="flex items-center">
'use client';

                  <input 
'use client';

                    type="checkbox" 
'use client';

                    checked={profile?.is_public || false}
'use client';

                    className="mr-2"
'use client';

                    disabled
'use client';

                  />
'use client';

                  <span>Public Profile</span>
'use client';

                </label>
'use client';

              </div>
'use client';

              
'use client';

              <div className="p-4 bg-gray-700 rounded-lg">
'use client';

                <h4 className="font-medium mb-2">Account Status</h4>
'use client';

                <div className="flex items-center space-x-4">
'use client';

                  <span className={`px-3 py-1 rounded-full text-sm ${
'use client';

                    settings?.is_active 
'use client';

                      ? 'bg-green-600 text-green-100' 
'use client';

                      : 'bg-red-600 text-red-100'
'use client';

                  }`}>
'use client';

                    {settings?.is_active ? 'Active' : 'Inactive'}
'use client';

                  </span>
'use client';

                  <span className={`px-3 py-1 rounded-full text-sm ${
'use client';

                    settings?.is_verified 
'use client';

                      ? 'bg-blue-600 text-blue-100' 
'use client';

                      : 'bg-gray-600 text-gray-100'
'use client';

                  }`}>
'use client';

                    {settings?.is_verified ? 'Verified' : 'Unverified'}
'use client';

                  </span>
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

      </div>
'use client';

    </div>
'use client';

  );
'use client';

}