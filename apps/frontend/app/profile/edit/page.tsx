'use client';

import { Navbar } from '@/src/components/Navbar';
import { authToken } from '@/src/lib/api/auth';
import { ArrowLeft, Globe, Lock, Save, Upload, User, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

interface _Profile {
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

export default function EditProfilePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    username: '',
    is_public: true,
  });
  const [fieldErrors, setFieldErrors] = useState<{
    display_name?: string;
    username?: string;
    bio?: string;
  }>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const token = authToken();
    if (token) {
      fetchProfile();
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
        setFormData({
          display_name: profileData.display_name || '',
          bio: profileData.bio || '',
          username: profileData.username || '',
          is_public: profileData.is_public !== false,
        });
        setAvatarPreview(profileData.avatar_url || '');
      } else {
        setError('Failed to load profile');
      }
    } catch {
      setError('Network error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const validateField = (name: string, value: string | boolean): string | undefined => {
    if (name === 'display_name') {
      const v = String(value).trim();
      if (!v) return 'Display name is required';
      if (v.length < 2) return 'Display name must be at least 2 characters';
      if (v.length > 50) return 'Display name must be 50 characters or fewer';
    }
    if (name === 'username') {
      const v = String(value).trim();
      if (!v) return 'Username is required';
      const re = /^[a-zA-Z0-9_]{3,20}$/;
      if (!re.test(v)) return 'Username must be 3-20 characters (letters, numbers, underscores)';
    }
    if (name === 'bio') {
      const v = String(value);
      if (v.length > 500) return 'Bio must be 500 characters or fewer';
    }
    return undefined;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
    // Real-time field validation
    const message = validateField(name, newValue);
    setFieldErrors((prev) => ({ ...prev, [name]: message }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        setError('Avatar file must be less than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('Avatar must be an image file');
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Validate all fields before submit
    const errors: { display_name?: string; username?: string; bio?: string } = {
      display_name: validateField('display_name', formData.display_name),
      username: validateField('username', formData.username),
      bio: validateField('bio', formData.bio),
    };
    setFieldErrors(errors);
    const hasErrors = Object.values(errors).some((m) => !!m);
    if (hasErrors) {
      setSaving(false);
      setError('Please fix the highlighted errors and try again.');
      return;
    }

    try {
      const token = authToken();

      // Update profile data
      const profileResponse = await fetch('/api/profile/me', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to update profile');
      }

      // Upload avatar if changed
      if (avatarFile) {
        const avatarFormData = new FormData();
        avatarFormData.append('avatar', avatarFile);

        const avatarResponse = await fetch('/api/profile/enhanced/avatar', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: avatarFormData,
        });

        if (!avatarResponse.ok) {
          throw new Error('Failed to upload avatar');
        }
      }

      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        router.push('/profile');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main role="main" aria-label="Edit Profile page" className="min-h-screen bg-surface-0">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]" aria-live="polite">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            <span className="sr-only">Loading profile editor</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main role="main" aria-label="Edit Profile page" className="min-h-screen bg-surface-0">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              href="/profile"
              className="p-2 bg-surface-100 rounded-lg hover:bg-surface-200 transition-colors"
              aria-label="Back to profile"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <h1 className="text-2xl font-bold text-white">Edit Profile</h1>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div
            className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6"
            role="alert"
            aria-live="assertive"
          >
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div
            className="bg-green-900/20 border border-green-500 rounded-lg p-4 mb-6"
            role="alert"
            aria-live="polite"
          >
            <p className="text-green-300">{success}</p>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="bg-surface-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Profile Picture</h3>

            <div className="flex items-center space-x-6">
              <div className="relative">
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Avatar preview"
                    width={96}
                    height={96}
                    className="rounded-full object-cover border-4 border-blue-500"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-surface-200 flex items-center justify-center border-4 border-surface-300">
                    <User className="w-12 h-12 text-surface-300" />
                  </div>
                )}

                {avatarPreview && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="absolute -top-2 -right-2 bg-red-600 p-1 rounded-full hover:bg-red-700 transition-colors"
                    aria-label="Remove current avatar"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>

              <div className="flex-1">
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <div className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Upload New Avatar</span>
                  </div>
                </label>
                <p className="text-surface-300 text-sm mt-2">JPG, PNG or GIF. Max size 5MB.</p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-surface-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="display_name"
                  className="block text-sm font-medium text-surface-300 mb-2"
                >
                  Display Name
                </label>
                <input
                  id="display_name"
                  type="text"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-surface-100 border border-surface-300 rounded-lg text-white placeholder-surface-300 focus:outline-none focus:ring-2 focus:ring-lokifi"
                  placeholder="Your display name"
                  maxLength={50}
                  aria-invalid={!!fieldErrors.display_name}
                  aria-describedby={fieldErrors.display_name ? 'display_name-error' : undefined}
                />
                {fieldErrors.display_name && (
                  <p
                    id="display_name-error"
                    role="alert"
                    aria-live="assertive"
                    className="text-red-300 text-sm mt-1"
                  >
                    {fieldErrors.display_name}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-surface-300 mb-2"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-surface-100 border border-surface-300 rounded-lg text-white placeholder-surface-300 focus:outline-none focus:ring-2 focus:ring-lokifi"
                  placeholder="Your username"
                  pattern="^[a-zA-Z0-9_]{3,20}$"
                  title="Username must be 3-20 characters, letters, numbers and underscores only"
                  aria-invalid={!!fieldErrors.username}
                  aria-describedby={fieldErrors.username ? 'username-error' : undefined}
                />
                <p className="text-surface-300 text-sm mt-1">
                  3-20 characters, letters, numbers and underscores only
                </p>
                {fieldErrors.username && (
                  <p
                    id="username-error"
                    role="alert"
                    aria-live="assertive"
                    className="text-red-300 text-sm mt-1"
                  >
                    {fieldErrors.username}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-surface-300 mb-2">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 bg-surface-100 border border-surface-300 rounded-lg text-white placeholder-surface-300 focus:outline-none focus:ring-2 focus:ring-lokifi resize-none"
                  placeholder="Tell us about yourself..."
                  maxLength={500}
                  aria-invalid={!!fieldErrors.bio}
                  aria-describedby={fieldErrors.bio ? 'bio-error' : undefined}
                />
                <p className="text-surface-300 text-sm mt-1">
                  {formData.bio.length}/500 characters
                </p>
                {fieldErrors.bio && (
                  <p
                    id="bio-error"
                    role="alert"
                    aria-live="polite"
                    className="text-red-300 text-sm mt-1"
                  >
                    {fieldErrors.bio}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-surface-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Privacy Settings</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {formData.is_public ? (
                    <Globe className="w-5 h-5 text-green-500" />
                  ) : (
                    <Lock className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <h4 className="text-white font-medium">Public Profile</h4>
                    <p className="text-surface-300 text-sm">
                      Make your profile visible to everyone
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_public"
                    checked={formData.is_public}
                    onChange={handleInputChange}
                    className="sr-only peer"
                    aria-label="Toggle public profile visibility"
                  />
                  <div className="w-11 h-6 bg-surface-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lokifi/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lokifi" />
                </label>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end space-x-4">
            <Link
              href="/profile"
              className="px-6 py-2 bg-surface-200 text-white rounded-lg hover:bg-surface-300 transition-colors"
              aria-label="Cancel editing and return to profile"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              aria-label={saving ? 'Saving your profile changes' : 'Save your profile changes'}
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
