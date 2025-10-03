'use client';
import { useToast } from '@/components/dashboard/ToastProvider';
import React, { useState } from 'react';
import { APIKeyModal } from './APIKeyModal';
import { usePreferences } from './PreferencesContext';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  user: { name?: string; email?: string } | null;
  onSignOut?: () => void;
  onProfileSave?: (u: { name?: string; email?: string }) => void;
}

const tabs = [
  'Profile',
  'Subscription',
  'Users',
  'Connectivity',
  'Notifications',
  'Appearance',
  'API',
  'Security',
] as const;
type Tab = (typeof tabs)[number];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  user,
  onSignOut,
  onProfileSave,
}) => {
  const [tab, setTab] = useState<Tab>('Profile');
  const [apiOpen, setApiOpen] = useState(false);
  const [twoFA, setTwoFA] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lokifi.security.twofa') === '1';
    } catch {
      return false;
    }
  });
  const [name, setName] = useState<string>(user?.name || '');
  const [email, setEmail] = useState<string>(user?.email || '');
  const { darkMode, setDarkMode, numberFormat, setNumberFormat, fontSize, setFontSize } =
    usePreferences();
  const { push } = useToast();
  if (!open) return null;

  // subscription trial start persistence
  const trialStart = (() => {
    try {
      const s = localStorage.getItem('lokifi.subscription.trialStart');
      if (s) return parseInt(s, 10);
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

  const saveProfile = () => {
    try {
      localStorage.setItem('lokifi.profile', JSON.stringify({ name, email }));
    } catch {}
    onProfileSave?.({ name, email });
    push({
      type: 'success',
      title: 'Profile Saved',
      message: 'Your profile details were updated.',
    });
  };

  const toggle2FA = () => {
    setTwoFA((v) => {
      const nv = !v;
      try {
        localStorage.setItem('lokifi.security.twofa', nv ? '1' : '0');
      } catch {}
      push({
        type: 'info',
        title: 'Security',
        message: nv ? '2FA enabled (placeholder).' : '2FA disabled.',
      });
      return nv;
    });
  };

  const deleteAccount = () => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('lokifi.'))
      .forEach((k) => localStorage.removeItem(k));
    onSignOut?.();
    onClose();
    push({ type: 'error', title: 'Account Deleted', message: 'Local demo data cleared.' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-5xl rounded shadow-xl overflow-hidden flex animate-fadeIn border border-gray-200 dark:border-gray-800 transition-colors">
        <aside className="w-64 border-r border-gray-200 dark:border-gray-800 py-6 bg-gray-50 dark:bg-gray-950/60 transition-colors">
          <ul className="space-y-0">
            {tabs.map((t) => {
              const active = tab === t;
              return (
                <li key={t}>
                  <button
                    onClick={() => setTab(t)}
                    className={
                      `w-full text-left px-6 py-3 text-sm transition-colors rounded-none ${
                        active
                          ? 'font-medium bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`
                    }
                  >
                    {t}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
        <div className="flex-1 flex flex-col max-h-[80vh]">
          <header className="px-8 py-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start bg-white dark:bg-gray-900 transition-colors">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{tab}</h2>
            <button onClick={onClose} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              ESC ✕
            </button>
          </header>
          <div className="p-8 overflow-y-auto text-sm leading-relaxed text-gray-700 dark:text-gray-300 transition-colors">
            {tab === 'Profile' && (
              <div className="space-y-6 max-w-lg">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-semibold">
                    {(name || email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="space-y-2 flex-1">
                    <div>
                      <label className="text-xs font-medium">FULL NAME</label>
                      <input
                        className="mt-1 w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 transition-colors"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">EMAIL</label>
                      <input
                        className="mt-1 w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 transition-colors"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">On trial till {trialEnds}</p>
                <div className="flex gap-3">
                  <button
                    onClick={saveProfile}
                    className="px-5 py-2 bg-black text-white rounded text-xs font-medium"
                  >
                    Save
                  </button>
                  <button onClick={onClose} className="px-5 py-2 bg-gray-200 dark:bg-gray-700 dark:text-gray-100 rounded text-xs transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {tab === 'Subscription' && (
              <div className="space-y-4 max-w-xl">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  You are currently on a <strong>Free Trial</strong>. {daysLeft} day
                  {daysLeft === 1 ? '' : 's'} left. Subscription plans coming soon.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="border rounded p-4 space-y-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Lokifi Essentials • $??/year</h3>
                    <p className="text-gray-500 dark:text-gray-400">All core features except advanced additions.</p>
                    <button className="mt-2 w-full py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded text-xs transition-colors">
                      Subscribe (soon)
                    </button>
                  </div>
                  <div className="border rounded p-4 space-y-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Lokifi Pro • $??/year</h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Nested portfolios, granular permissions & VIP support.
                    </p>
                    <button className="mt-2 w-full py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded text-xs transition-colors">
                      Subscribe (soon)
                    </button>
                  </div>
                </div>
              </div>
            )}
            {tab === 'Users' && (
              <div className="space-y-4 max-w-xl">
                <p className="text-sm">
                  User management (invite collaborators / family) will be implemented later.
                </p>
                <div className="border rounded p-4 text-xs text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                  Account Owner: {user?.name || user?.email || 'You'}
                </div>
              </div>
            )}
            {tab === 'Connectivity' && (
              <div className="space-y-4 max-w-2xl">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Bank & brokerage account connections are not foolproof, as many institutions still
                  rely on legacy technology. It is often easier to manually track them instead of
                  constantly dealing with connection errors and becoming frustrated. If a connection
                  is not working well, please follow the on-screen suggestions to reconnect and
                  switch the aggregator or to track it manually.{' '}
                  <a
                    className="text-blue-600 underline"
                    href="https://help.kubera.com/article/102-why-do-my-bank-and-brokerage-connections-keep-dropping"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Know more
                  </a>
                </p>
              </div>
            )}
            {tab === 'Notifications' && (
              <div className="space-y-6 max-w-lg">
                <h3 className="text-sm font-medium">Daily Digest Email</h3>
                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked /> <span>1-Day Top Movers</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" />{' '}
                    <span>
                      Send only when the 1-Day change is more than{' '}
                      <span className="underline">0.5%</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" /> <span>Connections that need attention</span>
                  </label>
                </div>
              </div>
            )}
            {tab === 'Appearance' && (
              <div className="space-y-8 max-w-xl">
                <div>
                  <h3 className="text-sm font-medium mb-3">Dark Mode</h3>
                  <div className="space-y-2">
                    {['off', 'on', 'oled', 'sunset', 'system'].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer text-gray-700 dark:text-gray-300">
                        <input
                          type="radio"
                          name="darkmode"
                          value={opt}
                          checked={darkMode === opt}
                          onChange={() => setDarkMode(opt as any)}
                        />
                        <span className="capitalize">
                          {opt === 'sunset'
                            ? 'Sunset to Sunrise'
                            : opt === 'oled'
                              ? 'OLED (Pure Black)'
                              : opt}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-3">Number Format</h3>
                  <div className="space-y-2 text-gray-700 dark:text-gray-300">
                    <FormatOption
                      value="system"
                      label="System Default"
                      current={numberFormat}
                      onSelect={setNumberFormat}
                    />
                    <FormatOption
                      value="us"
                      label="1,234,567.89 (US, UK, Canada)"
                      current={numberFormat}
                      onSelect={setNumberFormat}
                    />
                    <FormatOption
                      value="europe"
                      label="1.234.567,89 (Most of Europe, South America)"
                      current={numberFormat}
                      onSelect={setNumberFormat}
                    />
                    <FormatOption
                      value="nordic"
                      label="1 234 567,89 (Nordic & Central Europe)"
                      current={numberFormat}
                      onSelect={setNumberFormat}
                    />
                    <FormatOption
                      value="swiss"
                      label="1'234'567.89 (Switzerland, Liechtenstein)"
                      current={numberFormat}
                      onSelect={setNumberFormat}
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-3">Font Size</h3>
                  <div className="flex gap-4">
                    {(['sm', 'md', 'lg'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setFontSize(s)}
                        className={`px-3 py-1 border rounded text-xs transition-colors ${fontSize === s ? 'bg-black text-white dark:bg-white dark:text-gray-900' : 'bg-white dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700'}`}
                      >
                        {s.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {tab === 'API' && (
              <div className="space-y-4 max-w-xl">
                <button
                  onClick={() => setApiOpen(true)}
                  className="px-5 py-2 bg-black dark:bg-gray-100 text-white dark:text-gray-900 rounded text-sm font-medium transition-colors"
                >
                  Generate API Key
                </button>
                <p className="text-sm">
                  Ready to dive in? Here&apos;s the{' '}
                  <a
                    className="text-blue-600 underline"
                    href="https://docs.google.com/document/d/1G6YjL27eOrfBQZPS6H91ZFDGZ97YnS6Ra5Nnsth7CYg/view"
                    target="_blank"
                    rel="noreferrer"
                  >
                    API documentation
                  </a>
                  .
                </p>
                <div className="pt-2">
                  <h4 className="text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">Existing Keys</h4>
                  <APIKeysList />
                </div>
              </div>
            )}
            {tab === 'Security' && (
              <div className="space-y-8 max-w-xl">
                <div>
                  <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Two-Factor Authentication</h3>
                  <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={twoFA} onChange={toggle2FA} /> Enable 2FA
                    (placeholder)
                  </label>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    Future: integrate with authenticator apps / email OTP.
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Sign Out</h3>
                  <button onClick={onSignOut} className="text-xs underline text-blue-600">
                    Sign out from all devices
                  </button>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Delete Lokifi Account</h3>
                  <button onClick={deleteAccount} className="text-xs underline text-red-600">
                    Permanently delete my Lokifi account and all data
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <APIKeyModal open={apiOpen} onClose={() => setApiOpen(false)} />
    </div>
  );
};

const FormatOption: React.FC<{
  value: string;
  label: string;
  current: string;
  onSelect: (v: any) => void;
}> = ({ value, label, current, onSelect }) => (
  <label className="flex items-center gap-2 text-sm cursor-pointer">
    <input
      type="radio"
      name="numformat"
      value={value}
      checked={current === value}
      onChange={() => onSelect(value)}
    />
    <span>{label}</span>
  </label>
);

const APIKeysList: React.FC = () => {
  let keys: any[] = [];
  try {
    keys = JSON.parse(localStorage.getItem('lokifi.apiKeys') || '[]');
  } catch {
    /* ignore */
  }
  if (!keys.length) return <div className="text-xs text-gray-500">No keys yet.</div>;
  return (
    <ul className="space-y-1 text-xs">
      {keys.map((k, i) => (
        <li key={i} className="flex items-center justify-between border rounded px-3 py-2">
          <span className="truncate font-mono">{k.token.slice(0, 20)}…</span>
          <span className="text-gray-500">{k.permission}</span>
        </li>
      ))}
    </ul>
  );
};
