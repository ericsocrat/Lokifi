'use client';
import React, { useEffect, useRef, useState } from 'react';
import { BillboardModal } from './BillboardModal';
import { SettingsModal } from './SettingsModal';

interface ProfileDropdownProps {
  user: { name?: string; email?: string } | null;
  onSignOut?: () => void;
  onUpdateUser?: (u: { name?: string; email?: string }) => void;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  user,
  onSignOut,
  onUpdateUser,
}) => {
  const [open, setOpen] = useState(false);
  const [billboardOpen, setBillboardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  const name = user?.name || user?.email || 'User';
  const trialStart = (() => {
    try {
      const v = localStorage.getItem('lokifi.subscription.trialStart');
      if (v) return parseInt(v, 10);
      const now = Date.now();
      localStorage.setItem('lokifi.subscription.trialStart', String(now));
      return now;
    } catch {
      return Date.now();
    }
  })();
  const trialEndsDate = new Date(trialStart + 14 * 24 * 60 * 60 * 1000);
  const trialEnds = trialEndsDate.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const daysLeft = Math.max(
    0,
    Math.ceil((trialEndsDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold"
      >
        {name.charAt(0).toUpperCase()}
      </button>
      {open && (
        <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-200 rounded shadow-lg z-40 overflow-hidden animate-fadeIn">
          <div className="px-5 py-5 border-b border-gray-200 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-semibold">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="font-medium text-sm">{name}</div>
              {user?.email && <div className="text-xs text-gray-500">{user.email}</div>}
              <div className="text-[11px] text-gray-500">
                Trial: {daysLeft}d left (till {trialEnds})
              </div>
            </div>
          </div>
          <div className="divide-y text-sm">
            <button
              onClick={() => {
                setBillboardOpen(true);
                setOpen(false);
              }}
              className="w-full text-left px-5 py-3 hover:bg-gray-50 flex items-center justify-between"
            >
              Billboard <span className="text-[10px] text-gray-500">Subscriber only</span>
            </button>
            <button
              onClick={() => {
                setSettingsOpen(true);
                setOpen(false);
              }}
              className="w-full text-left px-5 py-3 hover:bg-gray-50"
            >
              Settings
            </button>
            <button onClick={onSignOut} className="w-full text-left px-5 py-3 hover:bg-gray-50">
              Sign Out
            </button>
          </div>
        </div>
      )}
      <BillboardModal open={billboardOpen} onClose={() => setBillboardOpen(false)} />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
        onSignOut={onSignOut}
        onProfileSave={onUpdateUser}
      />
    </div>
  );
};
