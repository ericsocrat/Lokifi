'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function TestSentryPage() {
  useEffect(() => {
    // Send a test message on page load
    Sentry.captureMessage('Sentry test page loaded successfully!', 'info');
  }, []);

  const handleTestError = () => {
    try {
      throw new Error('This is a test error from the frontend!');
    } catch (error) {
      Sentry.captureException(error);
      alert('Test error sent to Sentry! Check your Sentry dashboard.');
    }
  };

  const handleTestMessage = () => {
    Sentry.captureMessage('User clicked test message button', 'info');
    alert('Test message sent to Sentry! Check your Sentry dashboard.');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">🔍 Sentry Test Page</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Frontend Error Tracking</h2>
          <p className="text-gray-300 mb-4">
            This page helps you test the Sentry integration for the frontend.
          </p>
          
          <div className="space-y-4">
            <button
              onClick={handleTestMessage}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              📨 Send Test Message
            </button>
            
            <button
              onClick={handleTestError}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              ⚠️ Trigger Test Error
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Backend Error Tracking</h2>
          <p className="text-gray-300 mb-4">
            Test the backend Sentry integration by calling these endpoints:
          </p>
          
          <div className="space-y-4">
            <button
              onClick={async () => {
                try {
                  const response = await fetch('http://localhost:8000/api/test-sentry/message');
                  const data = await response.json();
                  alert(`Backend: ${data.message}`);
                } catch (error) {
                  alert('Error calling backend. Make sure the backend is running!');
                }
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              📨 Backend: Send Test Message
            </button>
            
            <button
              onClick={async () => {
                try {
                  await fetch('http://localhost:8000/api/test-sentry/error');
                  alert('Error endpoint called! (This should fail - check Sentry)');
                } catch (error) {
                  alert('Backend error triggered! Check your Sentry dashboard.');
                }
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              ⚠️ Backend: Trigger Test Error
            </button>
          </div>
        </div>

        <div className="mt-6 bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-2">✅ What to Check</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>Go to your Sentry dashboard</li>
            <li>Check the "Issues" page for errors</li>
            <li>Check "Performance" for transaction data</li>
            <li>Verify error details, stack traces, and context</li>
          </ul>
        </div>

        <div className="mt-6 text-center">
          <a
            href="https://lokifi.sentry.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Open Sentry Dashboard →
          </a>
        </div>
      </div>
    </div>
  );
}
