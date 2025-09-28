"use client";

import React from 'react';
import { NotificationCenter } from '../../components/NotificationCenter';
import { useAuth } from '../../src/components/AuthProvider';
import { Navbar } from '../../src/components/Navbar';
import Link from 'next/link';

export default function NotificationsPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold text-white mb-4">
              Access Required
            </h1>
            <p className="text-neutral-400 mb-6">
              Please log in to view your notifications.
            </p>
            <Link 
              href="/login" 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white mb-2">
            Notifications
          </h1>
          <p className="text-neutral-400">
            Stay updated with your latest activities and interactions.
          </p>
        </div>
        
        <NotificationCenter 
          className="w-full"
          showHeader={false}
          maxHeight="calc(100vh - 200px)"
        />
      </div>
    </div>
  );
}