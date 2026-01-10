'use client';

import { requireAuth } from '@/src/lib/api/auth-guard';
import {
  createAlert,
  deleteAlert,
  listAlerts,
  subscribeAlerts,
  toggleAlert,
  type Alert,
  type AlertEvent,
} from '@/src/lib/utils/alerts';
import {
  Activity,
  AlertTriangle,
  Bell,
  ChevronDown,
  Pause,
  Percent,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  Zap,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

// Lazy load AuthModal - only loads when user needs to authenticate
const AuthModal = dynamic(
  () => import('@/src/components/AuthModal').then((mod) => ({ default: mod.AuthModal })),
  {
    loading: () => null,
    ssr: false,
  }
);

type Kind = 'price_threshold' | 'pct_change';

export default function AlertsPage() {
  const [needAuthModal, setNeedAuthModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [form, setForm] = useState<{
    kind: Kind;
    symbol: string;
    timeframe: string;
    direction: string;
    number: string;
    window: string;
  }>({
    kind: 'price_threshold',
    symbol: 'BTCUSD',
    timeframe: '1h',
    direction: 'above',
    number: '45000',
    window: '60',
  });
  const [log, setLog] = useState<string[]>([]);
  const subRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        await requireAuth();
      } catch {
        setNeedAuthModal(true);
        setIsLoading(false);
        return;
      }
      await refresh();
      setIsLoading(false);
      // subscribe SSE
      subRef.current = subscribeAlerts((ev: AlertEvent) => {
        setLog((l) =>
          [
            `${new Date(ev.at).toLocaleTimeString()} ${ev.kind} ${ev.price ? `@ $${ev.price.toLocaleString()}` : ''}`,
            ...l,
          ].slice(0, 50)
        );
      }, true);
    })();
    return () => {
      subRef.current?.();
    };
  }, []);

  async function refresh() {
    setIsRefreshing(true);
    setError(null);
    try {
      const ls = await listAlerts();
      setAlerts(ls);
      setStatusMessage(`Loaded ${ls.length} alert${ls.length === 1 ? '' : 's'}`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load alerts';
      setError(message);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function create() {
    setIsCreating(true);
    setError(null);
    const { kind, symbol, direction, number } = form;
    try {
      if (kind === 'price_threshold') {
        await createAlert({
          kind: 'price_threshold',
          note: `${symbol} ${direction} ${number}`,
          sound: 'ping',
          maxTriggers: 1,
        });
      } else {
        const dir =
          direction === 'above' || direction === 'up'
            ? 'up'
            : direction === 'below' || direction === 'down'
              ? 'down'
              : 'abs';
        await createAlert({
          kind: 'pct_change',
          note: `${symbol} ${dir} ${number}%`,
          sound: 'ping',
          maxTriggers: 1,
        });
      }
      await refresh();
      setShowCreateForm(false);
      setStatusMessage('Alert created');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unable to create alert';
      setError(message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggle(id: string, nextEnabled: boolean) {
    setPendingId(id);
    setError(null);
    try {
      await toggleAlert(id, nextEnabled);
      await refresh();
      setStatusMessage(`Alert ${nextEnabled ? 'enabled' : 'paused'}`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unable to update alert';
      setError(message);
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(id: string) {
    setPendingId(id);
    setError(null);
    try {
      await deleteAlert(id);
      await refresh();
      setStatusMessage('Alert deleted');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unable to delete alert';
      setError(message);
    } finally {
      setPendingId(null);
    }
  }

  const enabledAlerts = alerts.filter((a) => a.enabled);
  const disabledAlerts = alerts.filter((a) => !a.enabled);

  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-surface-0 flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3 text-surface-300">
          <div
            className="w-5 h-5 border-2 border-lokifi border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
          <span>Loading alerts...</span>
          <span className="sr-only">Loading your price alerts</span>
        </div>
      </div>
    );
  }

  return (
    <main role="main" aria-label="Price Alerts page" className="min-h-screen bg-surface-0">
      {needAuthModal && <AuthModal onClose={() => setNeedAuthModal(false)} />}

      {/* Header */}
      <div className="border-b border-surface-300/50 bg-surface-50/80 backdrop-blur-xl sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Bell className="w-6 h-6 text-amber-500" />
                Price Alerts
              </h1>
              <p className="text-sm text-surface-300 mt-1">
                Get notified when assets hit your target prices
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={refresh}
                disabled={isRefreshing}
                aria-busy={isRefreshing}
                aria-label={isRefreshing ? 'Refreshing alerts' : 'Refresh alerts'}
                className="flex items-center gap-2 px-4 py-2.5 bg-surface-100 hover:bg-surface-200 border border-surface-300 hover:border-lokifi/30 rounded-xl text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isRefreshing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </>
                )}
              </button>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                aria-expanded={showCreateForm}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-lokifi to-electric hover:from-lokifi-dark hover:to-electric/90 rounded-xl text-white font-medium transition-all duration-200 shadow-lg shadow-lokifi/30 hover:shadow-lokifi/40"
              >
                <Plus className="w-4 h-4" />
                Create Alert
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {(error || statusMessage) && (
          <div className="space-y-2" aria-live="polite">
            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
            {statusMessage && !error && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-100"
              >
                <Sparkles className="w-4 h-4" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Create Alert Form */}
        {showCreateForm && (
          <div className="border border-lokifi/30 rounded-2xl bg-gradient-to-br from-lokifi/10 via-electric/5 to-transparent p-6 backdrop-blur-sm animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-lokifi/20 rounded-xl">
                <Sparkles className="w-5 h-5 text-lokifi-light" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Create New Alert</h3>
                <p className="text-sm text-surface-300">
                  Set up a price or percentage change alert
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Alert Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-surface-300" htmlFor="alert-kind">
                  Alert Type
                </label>
                <div className="relative">
                  <select
                    id="alert-kind"
                    className="w-full px-4 py-3 bg-surface-100 border border-surface-300 focus:border-lokifi/50 focus:ring-2 focus:ring-lokifi/20 rounded-xl text-white appearance-none cursor-pointer"
                    value={form.kind}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setForm({ ...form, kind: e.target.value as Kind })
                    }
                  >
                    <option value="price_threshold">Price Threshold</option>
                    <option value="pct_change">% Change</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-300 pointer-events-none" />
                </div>
              </div>

              {/* Symbol */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-surface-300" htmlFor="alert-symbol">
                  Symbol
                </label>
                <input
                  id="alert-symbol"
                  className="w-full px-4 py-3 bg-surface-100 border border-surface-300 focus:border-lokifi/50 focus:ring-2 focus:ring-lokifi/20 rounded-xl text-white placeholder-surface-300"
                  placeholder="e.g., BTCUSD"
                  value={form.symbol}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, symbol: e.target.value.toUpperCase() })
                  }
                />
              </div>

              {/* Timeframe */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-surface-300" htmlFor="alert-timeframe">
                  Timeframe
                </label>
                <div className="relative">
                  <select
                    id="alert-timeframe"
                    className="w-full px-4 py-3 bg-surface-100 border border-surface-300 focus:border-lokifi/50 focus:ring-2 focus:ring-lokifi/20 rounded-xl text-white appearance-none cursor-pointer"
                    value={form.timeframe}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setForm({ ...form, timeframe: e.target.value })
                    }
                  >
                    <option value="1m">1 minute</option>
                    <option value="5m">5 minutes</option>
                    <option value="15m">15 minutes</option>
                    <option value="1h">1 hour</option>
                    <option value="4h">4 hours</option>
                    <option value="1d">1 day</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-300 pointer-events-none" />
                </div>
              </div>

              {/* Direction */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-surface-300" htmlFor="alert-direction">
                  Direction
                </label>
                <div className="relative">
                  <select
                    id="alert-direction"
                    className="w-full px-4 py-3 bg-surface-100 border border-surface-300 focus:border-lokifi/50 focus:ring-2 focus:ring-lokifi/20 rounded-xl text-white appearance-none cursor-pointer"
                    value={form.direction}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setForm({ ...form, direction: e.target.value })
                    }
                  >
                    <option value="above">Above / Up</option>
                    <option value="below">Below / Down</option>
                    <option value="abs">Absolute (for %)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-300 pointer-events-none" />
                </div>
              </div>

              {/* Threshold */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-surface-300" htmlFor="alert-number">
                  {form.kind === 'price_threshold' ? 'Target Price' : 'Percentage'}
                </label>
                <div className="relative">
                  <input
                    id="alert-number"
                    className="w-full px-4 py-3 bg-surface-100 border border-surface-300 focus:border-lokifi/50 focus:ring-2 focus:ring-lokifi/20 rounded-xl text-white placeholder-surface-300"
                    placeholder={form.kind === 'price_threshold' ? '45000' : '5'}
                    value={form.number}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setForm({ ...form, number: e.target.value })
                    }
                  />
                  {form.kind === 'pct_change' && (
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-300" />
                  )}
                </div>
              </div>

              {/* Window (for % change only) */}
              {form.kind === 'pct_change' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-surface-300" htmlFor="alert-window">
                    Window (minutes)
                  </label>
                  <input
                    id="alert-window"
                    className="w-full px-4 py-3 bg-surface-100 border border-surface-300 focus:border-lokifi/50 focus:ring-2 focus:ring-lokifi/20 rounded-xl text-white placeholder-surface-300"
                    placeholder="60"
                    value={form.window}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setForm({ ...form, window: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={create}
                disabled={isCreating}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-lokifi to-electric hover:from-lokifi-dark hover:to-electric/90 rounded-xl text-white font-medium transition-all duration-200 shadow-lg shadow-lokifi/30 hover:shadow-lokifi/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Create Alert
                  </>
                )}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-3 text-surface-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-surface-300/50 rounded-2xl bg-surface-100/50 backdrop-blur-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Activity className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-sm text-surface-300">Active Alerts</span>
            </div>
            <p className="text-3xl font-bold text-white">{enabledAlerts.length}</p>
          </div>
          <div className="border border-surface-300/50 rounded-2xl bg-surface-100/50 backdrop-blur-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-surface-300/10 rounded-lg">
                <Pause className="w-5 h-5 text-surface-300" />
              </div>
              <span className="text-sm text-surface-300">Paused</span>
            </div>
            <p className="text-3xl font-bold text-white">{disabledAlerts.length}</p>
          </div>
          <div className="border border-surface-300/50 rounded-2xl bg-surface-100/50 backdrop-blur-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-sm text-surface-300">Recent Triggers</span>
            </div>
            <p className="text-3xl font-bold text-white">{log.length}</p>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-lokifi-light" />
            Your Alerts
          </h2>

          {alerts.length === 0 ? (
            <div className="border border-surface-300/50 rounded-2xl bg-surface-100/30 p-12 text-center">
              <div className="w-16 h-16 bg-surface-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-surface-300" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No alerts yet</h3>
              <p className="text-surface-300 text-sm mb-6">
                Create your first price alert to get notified when assets hit your targets
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-lokifi to-electric hover:from-lokifi-dark hover:to-electric/90 rounded-xl text-white font-medium transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                Create Your First Alert
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {alerts.map((a: Alert) => (
                <div
                  key={a.id}
                  className={`border rounded-2xl p-5 transition-all duration-200 ${
                    a.enabled
                      ? 'border-lokifi/30 bg-lokifi/5 hover:bg-lokifi/10'
                      : 'border-surface-300/50 bg-surface-100/30 opacity-60'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-xl ${
                          a.kind === 'price_threshold' ? 'bg-amber-500/10' : 'bg-blue-500/10'
                        }`}
                      >
                        {a.kind === 'price_threshold' ? (
                          <Target className="w-5 h-5 text-amber-500" />
                        ) : (
                          <Percent className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              a.kind === 'price_threshold'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {a.kind === 'price_threshold' ? 'Price Target' : '% Change'}
                          </span>
                          {!a.enabled && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-300/20 text-surface-300">
                              Paused
                            </span>
                          )}
                        </div>
                        <p className="text-white font-medium">{a.note || `${a.kind} alert`}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-surface-300">
                          {a.maxTriggers && (
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Max {a.maxTriggers} triggers
                            </span>
                          )}
                          {(a.triggers ?? 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5 text-amber-500" />
                              Triggered {a.triggers}x
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(a.id, !a.enabled)}
                        disabled={pendingId === a.id || isRefreshing}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                          a.enabled
                            ? 'bg-surface-200 hover:bg-surface-300 text-surface-300'
                            : 'bg-green-500/10 hover:bg-green-500/20 text-green-400'
                        }`}
                        aria-label={a.enabled ? 'Pause alert' : 'Enable alert'}
                        aria-busy={pendingId === a.id}
                      >
                        {a.enabled ? (
                          <>
                            <Pause className="w-4 h-4" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Enable
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        disabled={pendingId === a.id || isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        aria-label="Delete alert"
                        aria-busy={pendingId === a.id}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Triggers Log */}
        <div className="border border-surface-300/50 rounded-2xl bg-surface-100/30 backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-300/50 flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Activity className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Live Triggers</h3>
              <p className="text-xs text-surface-300">Real-time alert activity</p>
            </div>
            {log.length > 0 && (
              <div className="ml-auto flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-400">Live</span>
              </div>
            )}
          </div>
          <div
            className="p-5 max-h-64 overflow-auto"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {log.length === 0 ? (
              <p className="text-sm text-surface-300 text-center py-8">
                No triggers yet. Alerts will appear here in real-time.
              </p>
            ) : (
              <div className="space-y-2">
                {log.map((l: string, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-2 px-3 bg-surface-200/50 rounded-lg"
                  >
                    <div className="p-1.5 bg-amber-500/10 rounded-lg">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <span className="text-sm text-surface-300 font-mono">{l}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
