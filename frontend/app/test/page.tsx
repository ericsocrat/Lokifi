"use client";

import { useEffect, useState } from 'react';

export default function TestPage() {
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const testFetch = async () => {
    setResult('Testing...');
    setError('');
    
    try {
      console.log('Starting fetch test...');
      const response = await fetch('http://localhost:8000/api/auth/check', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      console.log('Response received:', response.status);
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const testLogin = async () => {
    setResult('Testing login...');
    setError('');
    
    try {
      console.log('Starting login test...');
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: 'hello@lokifi.com',
          password: '?Apollwng113?'
        })
      });
      
      console.log('Login response:', response.status);
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#1a1a1a', minHeight: '100vh', color: '#fff' }}>
      <h1 style={{ color: '#4ade80', marginBottom: '30px' }}>API Connection Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testFetch} 
          style={{ 
            marginRight: '10px', 
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Test /api/auth/check
        </button>
        <button 
          onClick={testLogin} 
          style={{ 
            padding: '12px 24px',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Test Login
        </button>
      </div>

      {error && (
        <div style={{ 
          padding: '15px', 
          background: '#7f1d1d', 
          border: '2px solid #dc2626', 
          borderRadius: '8px',
          marginBottom: '15px',
          color: '#fecaca'
        }}>
          <strong style={{ color: '#ff6b6b' }}>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ 
          padding: '15px', 
          background: '#14532d', 
          border: '2px solid #16a34a', 
          borderRadius: '8px',
          color: '#bbf7d0'
        }}>
          <strong style={{ color: '#4ade80' }}>Result:</strong>
          <pre style={{ marginTop: '10px', color: '#d1fae5' }}>{result}</pre>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', background: '#1e3a8a', borderRadius: '8px', border: '2px solid #3b82f6' }}>
        <strong style={{ color: '#93c5fd', fontSize: '18px' }}>Instructions:</strong>
        <ol>
          <li>Open browser console (F12)</li>
          <li>Click &quot;Test /api/auth/check&quot; button</li>
          <li>Check console for logs</li>
          <li>Check for CORS errors</li>
        </ol>
      </div>
    </div>
  );
}
