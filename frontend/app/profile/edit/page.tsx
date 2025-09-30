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

import { useRouter } from 'next/navigation';
'use client';

import { 
'use client';

  Save, 
'use client';

  ArrowLeft, 
'use client';

  Camera, 
'use client';

  User, 
'use client';

  Globe, 
'use client';

  Lock,
'use client';

  Upload,
'use client';

  X
'use client';

} from 'lucide-react';
'use client';


'use client';

interface ProfileData {
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

}
'use client';


'use client';

export default function EditProfilePage() {
'use client';

  const { user } = useAuth();
'use client';

  const router = useRouter();
'use client';

  const [formData, setFormData] = useState<ProfileData>({
'use client';

    username: '',
'use client';

    display_name: '',
'use client';

    bio: '',
'use client';

    avatar_url: '',
'use client';

    is_public: true,
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

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
'use client';

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
'use client';


'use client';

  useEffect(() => {
'use client';

    if (!user) {
'use client';

      router.push('/login');
'use client';

      return;
'use client';

    }
'use client';


'use client';

    const loadProfile = async () => {
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

        const response = await fetch('/api/profile/me', {
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

          const profile = await response.json();
'use client';

          setFormData({
'use client';

            username: profile.username || '',
'use client';

            display_name: profile.display_name || '',
'use client';

            bio: profile.bio || '',
'use client';

            avatar_url: profile.avatar_url || '',
'use client';

            is_public: profile.is_public !== false,
'use client';

          });
'use client';

        } else {
'use client';

          setError('Failed to load profile');
'use client';

        }
'use client';


'use client';

      } catch (err) {
'use client';

        console.error('Failed to load profile:', err);
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

    loadProfile();
'use client';

  }, [user, router]);
'use client';


'use client';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
'use client';

    const { name, value, type } = e.target;
'use client';

    setFormData(prev => ({
'use client';

      ...prev,
'use client';

      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
'use client';

    }));
'use client';

  };
'use client';


'use client';

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
'use client';

    const file = e.target.files?.[0];
'use client';

    if (file) {
'use client';

      setAvatarFile(file);
'use client';

      const reader = new FileReader();
'use client';

      reader.onload = (e) => {
'use client';

        setAvatarPreview(e.target?.result as string);
'use client';

      };
'use client';

      reader.readAsDataURL(file);
'use client';

    }
'use client';

  };
'use client';


'use client';

  const removeAvatar = () => {
'use client';

    setAvatarFile(null);
'use client';

    setAvatarPreview(null);
'use client';

    setFormData(prev => ({ ...prev, avatar_url: '' }));
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

      // If there's a new avatar file, upload it first
'use client';

      let avatarUrl = formData.avatar_url;
'use client';

      if (avatarFile) {
'use client';

        const formDataUpload = new FormData();
'use client';

        formDataUpload.append('avatar', avatarFile);
'use client';


'use client';

        const uploadResponse = await fetch('/api/profile/avatar', {
'use client';

          method: 'POST',
'use client';

          headers: {
'use client';

            'Authorization': `Bearer ${token}`,
'use client';

          },
'use client';

          body: formDataUpload,
'use client';

        });
'use client';


'use client';

        if (uploadResponse.ok) {
'use client';

          const uploadResult = await uploadResponse.json();
'use client';

          avatarUrl = uploadResult.avatar_url;
'use client';

        } else {
'use client';

          throw new Error('Failed to upload avatar');
'use client';

        }
'use client';

      }
'use client';


'use client';

      // Update profile
'use client';

      const updateData = {
'use client';

        ...formData,
'use client';

        avatar_url: avatarUrl
'use client';

      };
'use client';


'use client';

      const response = await fetch('/api/profile/me', {
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

        body: JSON.stringify(updateData),
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

      setSaveMessage('Profile updated successfully!');
'use client';

      setTimeout(() => {
'use client';

        router.push('/profile');
'use client';

      }, 1500);
'use client';


'use client';

    } catch (err) {
'use client';

      console.error('Failed to update profile:', err);
'use client';

      setError(err instanceof Error ? err.message : 'Failed to update profile');
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

  if (!user) {
'use client';

    return null; // Will redirect in useEffect
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

        <div className="max-w-2xl mx-auto px-4 py-8">
'use client';

          <div className="animate-pulse">
'use client';

            <div className="h-8 bg-gray-800 rounded w-1/3 mb-6"></div>
'use client';

            <div className="space-y-4">
'use client';

              <div className="h-20 bg-gray-800 rounded-lg"></div>
'use client';

              <div className="h-12 bg-gray-800 rounded"></div>
'use client';

              <div className="h-12 bg-gray-800 rounded"></div>
'use client';

              <div className="h-24 bg-gray-800 rounded"></div>
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

      <div className="max-w-2xl mx-auto px-4 py-8">
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

            <h1 className="text-2xl font-bold">Edit Profile</h1>
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

        {/* Form */}
'use client';

        <form onSubmit={handleSubmit} className="space-y-6">
'use client';

          {/* Avatar Upload */}
'use client';

          <div className="bg-gray-800 rounded-lg p-6">
'use client';

            <h3 className="text-lg font-semibold mb-4">Profile Picture</h3>
'use client';

            <div className="flex items-center space-x-4">
'use client';

              <div className="relative">
'use client';

                <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
'use client';

                  {avatarPreview || formData.avatar_url ? (
'use client';

                    <img 
'use client';

                      src={avatarPreview || formData.avatar_url} 
'use client';

                      alt="Avatar" 
'use client';

                      className="w-full h-full object-cover"
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

                {(avatarPreview || formData.avatar_url) && (
'use client';

                  <button
'use client';

                    type="button"
'use client';

                    onClick={removeAvatar}
'use client';

                    className="absolute -top-1 -right-1 p-1 bg-red-600 hover:bg-red-700 rounded-full"
'use client';

                  >
'use client';

                    <X className="w-3 h-3" />
'use client';

                  </button>
'use client';

                )}
'use client';

              </div>
'use client';

              
'use client';

              <div className="flex-1">
'use client';

                <label className="block">
'use client';

                  <span className="sr-only">Choose avatar</span>
'use client';

                  <input
'use client';

                    type="file"
'use client';

                    accept="image/*"
'use client';

                    onChange={handleAvatarChange}
'use client';

                    className="block w-full text-sm text-gray-300
'use client';

                             file:mr-4 file:py-2 file:px-4
'use client';

                             file:rounded-lg file:border-0
'use client';

                             file:bg-blue-600 file:text-white
'use client';

                             hover:file:bg-blue-700"
'use client';

                  />
'use client';

                </label>
'use client';

                <p className="text-sm text-gray-400 mt-2">
'use client';

                  JPG, PNG or GIF. Max size 5MB.
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

          {/* Basic Information */}
'use client';

          <div className="bg-gray-800 rounded-lg p-6">
'use client';

            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
'use client';

            <div className="space-y-4">
'use client';

              <div>
'use client';

                <label className="block text-sm font-medium text-gray-300 mb-2">
'use client';

                  Username
'use client';

                </label>
'use client';

                <input
'use client';

                  type="text"
'use client';

                  name="username"
'use client';

                  value={formData.username}
'use client';

                  onChange={handleInputChange}
'use client';

                  pattern="^[a-zA-Z0-9_]+$"
'use client';

                  minLength={3}
'use client';

                  maxLength={30}
'use client';

                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg 
'use client';

                           focus:outline-none focus:border-blue-500 text-white"
'use client';

                  placeholder="Enter your username"
'use client';

                />
'use client';

                <p className="text-sm text-gray-400 mt-1">
'use client';

                  3-30 characters. Letters, numbers, and underscores only.
'use client';

                </p>
'use client';

              </div>
'use client';


'use client';

              <div>
'use client';

                <label className="block text-sm font-medium text-gray-300 mb-2">
'use client';

                  Display Name
'use client';

                </label>
'use client';

                <input
'use client';

                  type="text"
'use client';

                  name="display_name"
'use client';

                  value={formData.display_name}
'use client';

                  onChange={handleInputChange}
'use client';

                  maxLength={100}
'use client';

                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg 
'use client';

                           focus:outline-none focus:border-blue-500 text-white"
'use client';

                  placeholder="Enter your display name"
'use client';

                />
'use client';

                <p className="text-sm text-gray-400 mt-1">
'use client';

                  This is how your name will appear to others.
'use client';

                </p>
'use client';

              </div>
'use client';


'use client';

              <div>
'use client';

                <label className="block text-sm font-medium text-gray-300 mb-2">
'use client';

                  Bio
'use client';

                </label>
'use client';

                <textarea
'use client';

                  name="bio"
'use client';

                  value={formData.bio}
'use client';

                  onChange={handleInputChange}
'use client';

                  maxLength={500}
'use client';

                  rows={4}
'use client';

                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg 
'use client';

                           focus:outline-none focus:border-blue-500 text-white resize-none"
'use client';

                  placeholder="Tell others about yourself..."
'use client';

                />
'use client';

                <p className="text-sm text-gray-400 mt-1">
'use client';

                  {formData.bio.length}/500 characters
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

          {/* Privacy Settings */}
'use client';

          <div className="bg-gray-800 rounded-lg p-6">
'use client';

            <h3 className="text-lg font-semibold mb-4">Privacy Settings</h3>
'use client';

            <div className="flex items-center justify-between">
'use client';

              <div className="flex items-center space-x-3">
'use client';

                {formData.is_public ? (
'use client';

                  <Globe className="w-5 h-5 text-green-400" />
'use client';

                ) : (
'use client';

                  <Lock className="w-5 h-5 text-red-400" />
'use client';

                )}
'use client';

                <div>
'use client';

                  <h4 className="font-medium">Public Profile</h4>
'use client';

                  <p className="text-sm text-gray-400">
'use client';

                    Allow others to find and view your profile
'use client';

                  </p>
'use client';

                </div>
'use client';

              </div>
'use client';

              <label className="relative inline-flex items-center cursor-pointer">
'use client';

                <input
'use client';

                  type="checkbox"
'use client';

                  name="is_public"
'use client';

                  checked={formData.is_public}
'use client';

                  onChange={handleInputChange}
'use client';

                  className="sr-only peer"
'use client';

                />
'use client';

                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 
'use client';

                              peer-focus:ring-blue-300 rounded-full peer 
'use client';

                              peer-checked:after:translate-x-full peer-checked:after:border-white 
'use client';

                              after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
'use client';

                              after:bg-white after:border-gray-300 after:border after:rounded-full 
'use client';

                              after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600">
'use client';

                </div>
'use client';

              </label>
'use client';

            </div>
'use client';

          </div>
'use client';


'use client';

          {/* Actions */}
'use client';

          <div className="flex justify-end space-x-4">
'use client';

            <Link
'use client';

              href="/profile"
'use client';

              className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg 
'use client';

                       hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
'use client';

            >
'use client';

              Cancel
'use client';

            </Link>
'use client';

            <button
'use client';

              type="submit"
'use client';

              disabled={isSaving}
'use client';

              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 
'use client';

                       disabled:cursor-not-allowed rounded-lg flex items-center space-x-2
'use client';

                       focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      </div>
'use client';

    </div>
'use client';

  );
'use client';

}