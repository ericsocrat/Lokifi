'use client';
import { useToast } from '@/components/dashboard/ToastProvider';
import React, { useState } from 'react';

interface APIKeyModalProps {
  open: boolean;
  onClose: () => void;
}

interface GeneratedKey {
  name: string;
  permission: string;
  allowedIp?: string;
  token: string;
  createdAt: number;
}

export const APIKeyModal: React.FC<APIKeyModalProps> = ({ open, onClose }) => {
  const [name, setName] = useState('API Key 1');
  const [permission, setPermission] = useState('read');
  const [allowedIp, setAllowedIp] = useState('');
  const [generated, setGenerated] = useState<GeneratedKey | null>(null);
  const { push } = useToast();

  if (!open) return null;

  const save = () => {
    const token = 'lk_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const key: GeneratedKey = {
      name,
      permission,
      allowedIp: allowedIp || undefined,
      token,
      createdAt: Date.now(),
    };
    setGenerated(key);
    try {
      const raw = localStorage.getItem('lokifi.apiKeys') || '[]';
      const list = JSON.parse(raw);
      list.push(key);
      localStorage.setItem('lokifi.apiKeys', JSON.stringify(list));
    } catch {
      /* ignore */
    }
    push({
      type: 'success',
      title: 'API Key Created',
      message: 'Copy it now; it will be masked later.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white w-full max-w-xl rounded shadow-lg overflow-hidden animate-fadeIn">
        <div className="px-6 py-4 border-b border-gray-200 font-semibold">Create an API Key</div>
        <div className="p-6 space-y-4 text-sm">
          {generated ? (
            <div className="space-y-4">
              <p className="text-green-700 font-medium">API Key generated successfully.</p>
              <div className="bg-gray-100 p-3 rounded font-mono text-xs break-all select-all">
                {generated.token}
              </div>
              <p className="text-xs text-gray-500">
                Copy and store this key securely. You won&apos;t be able to view it again.
              </p>
              <div className="flex gap-3">
                <button onClick={onClose} className="px-4 py-2 bg-black text-white rounded text-xs">
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">NAME</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="API Key name"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">PERMISSION</label>
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value)}
                  className="border rounded px-3 py-2 text-sm"
                >
                  <option value="read">Read portfolio data</option>
                  <option value="readwrite">Read & Write (future)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">ALLOWED IP (OPTIONAL)</label>
                <input
                  value={allowedIp}
                  onChange={(e) => setAllowedIp(e.target.value)}
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="E.g. 192.168.1.10"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={save}
                  className="px-5 py-2 bg-black text-white rounded text-sm font-medium"
                >
                  Save
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-gray-200 text-gray-700 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const APIKeysList: React.FC = () => {
  let keys: GeneratedKey[] = [] as any;
  try {
    keys = JSON.parse(localStorage.getItem('lokifi.apiKeys') || '[]');
  } catch {
    /* ignore */
  }
  if (!keys.length) return <div className="text-xs text-gray-500">No keys yet.</div>;
  const revoke = (token: string) => {
    try {
      const list: GeneratedKey[] = JSON.parse(
        localStorage.getItem('lokifi.apiKeys') || '[]'
      ).filter((k: GeneratedKey) => k.token !== token);
      localStorage.setItem('lokifi.apiKeys', JSON.stringify(list));
    } catch {
      /* ignore */
    }
    (window as any).dispatchEvent(
      new CustomEvent('lokifi.toast', {
        detail: { type: 'info', title: 'API Key Revoked', message: 'Key removed.' },
      })
    );
  };
  return (
    <ul className="space-y-1 text-xs">
      {keys
        .slice()
        .reverse()
        .map((k, i) => (
          <li
            key={i}
            className="flex items-center justify-between border rounded px-3 py-2 bg-white"
          >
            <div className="flex flex-col">
              <span className="font-mono">
                {k.token.slice(0, 8)}••••••••{k.token.slice(-4)}
              </span>
              <span className="text-[10px] text-gray-500">
                {new Date(k.createdAt).toLocaleDateString()}
              </span>
            </div>
            <button onClick={() => revoke(k.token)} className="text-red-500 hover:underline ml-4">
              Revoke
            </button>
          </li>
        ))}
    </ul>
  );
};
