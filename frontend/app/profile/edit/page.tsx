'use client';

import {
    ArrowLeft,
    Globe,
    Lock,
    Save,
    Upload,
    User,
    X
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../../src/components/Navbar';
import { authToken } from '../../../src/lib/auth';

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

export default function EditProfilePage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        display_name: '',
        bio: '',
        username: '',
        is_public: true
    });
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
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const profileData = await response.json();
                setFormData({
                    display_name: profileData.display_name || '',
                    bio: profileData.bio || '',
                    username: profileData.username || '',
                    is_public: profileData.is_public !== false
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
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

        try {
            const token = authToken();

            // Update profile data
            const profileResponse = await fetch('/api/profile/me', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
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
                        'Authorization': `Bearer ${token}`
                    },
                    body: avatarFormData
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

    return (
        <div className="min-h-screen bg-gray-900">
            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                        <Link
                            href="/profile"
                            className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </Link>
                        <h1 className="text-2xl font-bold text-white">Edit Profile</h1>
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

                {/* Edit Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Avatar Section */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Profile Picture</h3>

                        <div className="flex items-center space-x-6">
                            <div className="relative">
                                {avatarPreview ? (
                                    <img
                                        src={avatarPreview}
                                        alt="Avatar preview"
                                        className="w-24 h-24 rounded-full object-cover border-4 border-blue-500"
                                    />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center border-4 border-gray-600">
                                        <User className="w-12 h-12 text-gray-400" />
                                    </div>
                                )}

                                {avatarPreview && (
                                    <button
                                        type="button"
                                        onClick={removeAvatar}
                                        className="absolute -top-2 -right-2 bg-red-600 p-1 rounded-full hover:bg-red-700 transition-colors"
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
                                <p className="text-gray-400 text-sm mt-2">
                                    JPG, PNG or GIF. Max size 5MB.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Basic Information */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    name="display_name"
                                    value={formData.display_name}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Your display name"
                                    maxLength={50}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Your username"
                                    pattern="^[a-zA-Z0-9_]{3,20}$"
                                    title="Username must be 3-20 characters, letters, numbers and underscores only"
                                />
                                <p className="text-gray-400 text-sm mt-1">
                                    3-20 characters, letters, numbers and underscores only
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Bio
                                </label>
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleInputChange}
                                    rows={4}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    placeholder="Tell us about yourself..."
                                    maxLength={500}
                                />
                                <p className="text-gray-400 text-sm mt-1">
                                    {formData.bio.length}/500 characters
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Privacy Settings */}
                    <div className="bg-gray-800 rounded-lg p-6">
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
                                        <p className="text-gray-400 text-sm">
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
                                    />
                                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center justify-end space-x-4">
                        <Link
                            href="/profile"
                            className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                            <Save className="w-4 h-4" />
                            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}