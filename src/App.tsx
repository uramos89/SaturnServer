import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Server, Activity, Database, Brain, ShieldCheck, AlertTriangle, Terminal, 
  ChevronRight, ChevronLeft, Cpu, HardDrive, RefreshCw, Search, Bell, Settings, 
  LayoutDashboard, Logs, CheckCircle2, XCircle, Mail, Zap, Plug, Unplug, 
  TerminalSquare, History, Globe, Key, Wifi, User, Lock, Eye, EyeOff, Send, 
  LogOut, Menu, Trash2, Folder, FileText, Play, Plus, Trash, Upload, X, Users, Package, HeartPulse, Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, api, parseApiError } from './lib/utils';
import type { ManagedServer, Incident, AuditLog, NotificationConfig, AIConfig, SshConnection } from './lib/types';
import { t, Language } from './lib/i18n';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { io, Socket } from "socket.io-client";

// ── Provider & Model Types ─────────────────────────────────────────────
interface AIProvider {
  id: string;
  name: string;
  tier: string;
  models: string[];
}

interface ConfiguredProvider {
  id: string;
  name: string;
  provider: string;
  model: string;
  enabled: number;
}

interface UserData {
  id: string;
  username: string;
  role: string;
}

// ── Error Boundary ────────────────────────────────────────────────────
// Wraps component tree to catch rendering errors and show them consistently.
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      const errorMsg = parseApiError(this.state.error) || 'Unknown runtime exception';
      return (
        <div className="p-8 rounded-[2rem] bg-rose-500/5 border border-rose-500/20 text-rose-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-500/20 rounded-xl"><AlertTriangle size={20} /></div>
            <h3 className="text-sm font-black uppercase tracking-widest">Interface Component Error</h3>
          </div>
          <pre className="text-[10px] font-mono bg-black/40 p-4 rounded-xl border border-white/5 mb-4 overflow-x-auto">
            {this.state.error?.stack || errorMsg}
          </pre>
          <button 
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }} 
            className="px-6 py-2 bg-rose-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-400 transition-all"
          >
            Restart Interface
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Login View ────────────────────────────────────────────────────────
const LoginView = ({ onLogin, t }: { onLogin: (u: UserData, token?: string, refreshToken?: string) => void, t: (k: string) => string }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user, data.token, data.refreshToken);
      } else {
        setError(parseApiError(data));
      }
    } catch (err: any) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md immersive-card p-8 bg-white/5 border border-white/10 ring-1 ring-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.15)]"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-orange-500 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.3)]">
            <div className="w-8 h-1.5 bg-orange-500 rounded-full" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-[0.2em] mb-2 uppercase drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]">SATURN</h1>
          <p className="text-slate-500 text-xs uppercase tracking-widest">Neural Infrastructure Core</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Username</label>
            <div className="relative">
              <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-800/80 border border-orange-500/30 rounded-xl p-3 pl-10 text-xs text-white focus:ring-1 focus:ring-orange-500 outline-none placeholder-gray-500"
                placeholder="admin"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800/80 border border-orange-500/30 rounded-xl p-3 pl-10 text-xs text-white focus:ring-1 focus:ring-orange-500 outline-none placeholder-gray-500"
                placeholder="••••••••"
              />
            </div>
          </div>
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[10px] text-rose-400">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full py-4 bg-orange-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <><ShieldCheck size={14} /> Authenticate</>}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// ── User Manager Component ────────────────────────────────────────────
const UserManager = ({ t }: { t: (k: string) => string }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(() => {
    const saved = localStorage.getItem("saturn-user");
    return saved ? false : true;
  });
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await api('/api/admin/users');
      const data = await res.json();
      setUsers(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await api(`/api/admin/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchUsers();
      else alert(data.error);
    } catch {}
  };

  const handleCreate = async () => {
    if (!newUsername || newPassword.length < 8) return;
    setCreating(true);
    setError('');
    try {
      const res = await api('/api/admin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setNewUsername('');
        setNewPassword('');
        fetchUsers();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-widest">User Management</h2>
          <p className="text-xs text-slate-500">Manage Saturn application administrators</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-orange-400 transition-all flex items-center gap-2"
        >
          <User size={12} /> Add Admin
        </button>
      </div>

      <div className="immersive-card overflow-hidden">
        <div className="grid grid-cols-4 p-4 border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/[0.02]">
          <div>Username</div>
          <div>Role</div>
          <div>Created At</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="divide-y divide-white/5">
          {(users || []).map((u: any) => (
            <div key={u.id} className="grid grid-cols-4 p-4 items-center text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold">
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-white">{u.username}</span>
              </div>
              <div>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 text-[9px] font-black uppercase">
                  {u.role}
                </span>
              </div>
              <div className="text-slate-500 font-mono text-[10px]">
                {new Date(u.created_at).toLocaleDateString()}
              </div>
              <div className="text-right">
                <button 
                  onClick={() => handleDelete(u.id)}
                  className="p-2 text-slate-500 hover:text-rose-500 transition-colors"
                >
                  <XCircle size={16} />
                </button>
              </div>
            </div>
          ))}
          {loading && <div className="p-12 text-center text-slate-500 animate-pulse">Loading users...</div>}
        </div>
      </div>

      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm immersive-card p-6"
            >
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">Create New Admin</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Username</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                    placeholder="john_doe"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                    placeholder="Minimum 8 characters"
                  />
                </div>
                {error && <div className="text-[10px] text-rose-400">{error}</div>}
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowCreate(false)}
                    className="flex-1 py-3 bg-white/5 text-slate-400 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreate}
                    disabled={creating || !newUsername || newPassword.length < 8}
                    className="flex-1 py-3 bg-orange-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 disabled:opacity-30"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Onboarding Wizard (3-Step: AI Provider + SMTP + Admin User) ────────
const OnboardingWizard = ({ onComplete, t }: { onComplete: () => void, t: (k: string) => string }) => {
  const [step, setStep] = useState(0);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [configured, setConfigured] = useState<ConfiguredProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // SMTP state
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpTo, setSmtpTo] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [smtpError, setSmtpError] = useState('');

  // Admin User state
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirm, setAdminConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminSaved, setAdminSaved] = useState(false);
  const [adminError, setAdminError] = useState('');

  useEffect(() => {
    api('/api/ai/providers')
      .then(r => r.json())
      .then(data => {
        setProviders(data.providers);
        setConfigured(data.configured);
        if (data.configured.length > 0) setSaved(true);
      })
      .catch(() => {});
  }, []);

  const handleConfigure = async () => {
    if (!selectedProvider || !selectedModel) return;
    setSaving(true);
    setError('');
    try {
      const res = await api('/api/ai/providers/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: selectedProvider,
          model: selectedModel,
          apiKey: apiKey || undefined,
          endpoint: endpoint || undefined,
          name: (providers || []).find(p => p.id === selectedProvider)?.name
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setStep(1);
      } else {
        setError(data.error || 'Failed to configure');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestKey = async () => {
    if (!apiKey) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api('/api/ai/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: selectedProvider,
          model: selectedModel,
          apiKey
        })
      });
      const data = await res.json();
      setTestResult({ ok: data.success, msg: data.message || data.error || 'Unknown error' });
      if (data.success) setError('');
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSmtpSave = async () => {
    if (!smtpHost || !smtpUser || !smtpPass) {
      setSmtpError('SMTP Host, Username and Password are required');
      return;
    }
    setSmtpSaving(true);
    setSmtpError('');
    try {
      const res = await api('/api/notifications/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email',
          destination: smtpTo || smtpUser,
          config: {
            host: smtpHost,
            port: parseInt(smtpPort),
            secure: smtpSecure,
            auth: { user: smtpUser, pass: smtpPass },
            from: smtpFrom || smtpUser
          },
          enabled: true
        })
      });
      const data = await res.json();
      if (data.success) {
        setSmtpSaved(true);
        setTimeout(() => setStep(2), 500);
      } else {
        setSmtpError(data.error || 'Failed to save SMTP config');
      }
    } catch (err: any) {
      setSmtpError(err.message);
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleAdminCreate = async () => {
    if (!adminUsername || adminPassword.length < 8) {
      setAdminError(t('admin.error.short'));
      return;
    }
    if (adminPassword !== adminConfirm) {
      setAdminError(t('admin.error.match'));
      return;
    }
    setAdminSaving(true);
    setAdminError('');
    try {
      const res = await api('/api/admin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        setAdminSaved(true);
        setTimeout(onComplete, 1000);
      } else {
        setAdminError(data.error || 'Failed to create admin');
      }
    } catch (err: any) {
      setAdminError(err.message);
    } finally {
      setAdminSaving(false);
    }
  };

  const provider = (providers || []).find(p => p.id === selectedProvider);

  // Group providers by tier
  const tierOrder = ['frontier', 'hyperscaler', 'aggregator', 'inference', 'value', 'asia', 'specialized', 'selfhosted'];
  const tierLabels: Record<string, string> = {
    frontier: 'Frontier (Top Tier)',
    hyperscaler: 'Hyperscalers & Aggregators',
    aggregator: 'Multi-Proxy Aggregators',
    inference: 'High-Performance Inference',
    value: 'Value (Cost-Effective)',
    asia: 'Asian Ecosystem',
    specialized: 'Specialized / Niche',
    selfhosted: 'Self-Hosted / Local'
  };
  const groupedProviders = tierOrder
    .map(tier => ({ tier, label: tierLabels[tier], items: (providers || []).filter(p => p.tier === tier) }))
    .filter(g => g.items.length > 0);

  if (adminSaved) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh]"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-24 h-24 rounded-full border-4 border-orange-500 border-t-transparent mb-8"
        />
        <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">
          {t('onboarding.ready')}
        </h2>
        <p className="text-slate-400 text-sm">{t('onboarding.ready.desc')}</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-orange-500 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.3)]"
        >
          <div className="w-10 h-2 bg-orange-500 rounded-full" />
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-black text-white tracking-[0.15em] mb-4"
        >
          SATURN <span className="text-orange-500 font-light">v0.2.0</span>
              <span className="ml-2 text-[8px] text-slate-600 font-mono">build: 2026-05-03</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed"
        >
          {t('onboarding.subtitle')}
        </motion.p>
      </div>

      {/* Step indicator - 3 steps */}
      <div className="flex justify-center gap-2 mb-8">
        {[
          { label: 'AI Provider', icon: Brain },
          { label: 'SMTP', icon: Mail },
          { label: 'Admin', icon: User }
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-500",
                step >= i ? "bg-orange-500/20 text-orange-400" : "bg-white/5 text-slate-600"
              )}>
                <Icon size={12} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{s.label}</span>
              </div>
              {i < 2 && <div className={cn("h-px w-8", step > i ? "bg-orange-500" : "bg-white/10")} />}
            </div>
          );
        })}
      </div>

      {/* Step 0: AI Provider Selection */}
      {step === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-lg font-black text-white uppercase tracking-widest mb-2">
            {t('onboarding.select')}
          </h2>
          <p className="text-xs text-slate-500 mb-6">{t('onboarding.select.desc')}</p>
          
          {!selectedProvider ? (
            <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
              {groupedProviders.map(group => (
                <div key={group.tier}>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                    {group.label}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {group.items.map(p => (
                      <motion.button
                        key={p.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setSelectedProvider(p.id); setSelectedModel(''); }}
                        className={cn(
                          "p-4 rounded-2xl border text-left transition-all",
                          selectedProvider === p.id
                            ? "bg-orange-500/10 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.1)]"
                            : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                            selectedProvider === p.id ? "bg-orange-500/20 text-orange-500" : "bg-white/5 text-slate-400"
                          )}>
                            {p.name.charAt(0)}
                          </div>
                          {configured.some(c => c.provider === p.id) && (
                            <CheckCircle2 size={12} className="text-emerald-500" />
                          )}
                        </div>
                        <h3 className="text-xs font-bold text-white mb-0.5 truncate">{p.name}</h3>
                        <p className="text-[9px] text-slate-500 font-mono">{p.models.length} models</p>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Model & API Key inline */
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setSelectedProvider('')} className="text-slate-500 hover:text-white transition-colors text-xs">
                  ← {t('onboarding.back')}
                </button>
                <h2 className="text-lg font-black text-white uppercase tracking-widest">{provider?.name}</h2>
              </div>

              <div className="space-y-5">
                {/* Model Selection */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
                    {t('onboarding.model')}
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {provider?.models.map(m => (
                      <button
                        key={m}
                        onClick={() => setSelectedModel(m)}
                        className={cn(
                          "p-2.5 rounded-xl border text-[10px] font-mono transition-all text-left",
                          selectedModel === m
                            ? "bg-orange-500/10 border-orange-500 text-orange-400"
                            : "bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* API Key */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
                    {t('onboarding.apiKey')}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => { setApiKey(e.target.value); }}
                        placeholder={t('onboarding.apiKey.placeholder')}
                        className="w-full bg-slate-800/80 border border-orange-500/30 rounded-xl p-3 pl-10 text-xs text-white focus:ring-1 focus:ring-orange-500 outline-none placeholder-gray-500 font-mono"
                      />
                    </div>
                    <button
                      onClick={handleTestKey}
                      disabled={!apiKey || testing}
                      className="px-3 py-3 bg-black/60 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider hover:border-orange-500/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                    >
                      {testing ? (
                        <><RefreshCw size={12} className="animate-spin" /> Testing</>
                      ) : (
                        <><Zap size={12} /> Test</>
                      )}
                    </button>
                  </div>
                  {testResult && (
                    <div className={`mt-2 flex items-start gap-2 text-[10px] ${testResult.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {testResult.ok ? <CheckCircle2 size={12} className="mt-0.5 shrink-0" /> : <XCircle size={12} className="mt-0.5 shrink-0" />}
                      <span>{testResult.msg.slice(0, 200)}</span>
                    </div>
                  )}
                  <p className="text-[9px] text-slate-600 mt-1">{t('onboarding.apiKey.desc')}</p>
                </div>

                {/* Endpoint (for self-hosted) */}
                {(provider?.id === 'ollama' || provider?.id === 'vllm' || provider?.id === 'localai' || provider?.id === 'custom' || provider?.id === 'lmstudio' || provider?.id === 'textgen' || provider?.id === 'kobold' || provider?.id === 'tabbyapi') && (
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
                      {t('onboarding.endpoint')}
                    </label>
                    <input
                      type="text"
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      placeholder="http://localhost:11434"
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none font-mono"
                    />
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[10px] text-rose-400">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleConfigure}
                    disabled={!selectedModel || saving}
                    className="flex-1 py-3.5 bg-orange-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <><RefreshCw size={14} className="animate-spin" /> {t('onboarding.saving')}</>
                    ) : (
                      <><Zap size={14} /> {t('onboarding.next')}</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Step 1: SMTP Configuration */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setStep(0)} className="text-slate-500 hover:text-white transition-colors text-xs">
              ← {t('onboarding.back')}
            </button>
            <h2 className="text-lg font-black text-white uppercase tracking-widest">{t('smtp.title')}</h2>
          </div>
          <p className="text-xs text-slate-500 mb-6">{t('smtp.desc')}</p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
                  {t('smtp.host')}
                </label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
                  {t('smtp.port')}
                </label>
                <input
                  type="text"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="587"
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
                {t('smtp.user')}
              </label>
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="user@gmail.com"
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
                {t('smtp.pass')}
              </label>
              <input
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
                  {t('smtp.from')}
                </label>
                <input
                  type="text"
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  placeholder="saturn@domain.com"
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
                  {t('smtp.to')}
                </label>
                <input
                  type="text"
                  value={smtpTo}
                  onChange={(e) => setSmtpTo(e.target.value)}
                  placeholder="admin@domain.com"
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={smtpSecure}
                onChange={(e) => setSmtpSecure(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/60 accent-orange-500"
              />
              <span className="text-xs text-slate-400">{t('smtp.secure')}</span>
            </label>

            {smtpError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[10px] text-rose-400">
                {smtpError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-white/5 text-slate-400 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all"
              >
                Skip →
              </button>
              <button
                onClick={handleSmtpSave}
                disabled={smtpSaving}
                className="flex-1 py-3.5 bg-orange-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {smtpSaving ? (
                  <><RefreshCw size={14} className="animate-spin" /> Saving...</>
                ) : (
                  <><Mail size={14} /> {t('smtp.save')}</>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Step 2: Admin User Creation */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setStep(1)} className="text-slate-500 hover:text-white transition-colors text-xs">
              ← {t('onboarding.back')}
            </button>
            <h2 className="text-lg font-black text-white uppercase tracking-widest">{t('admin.create')}</h2>
          </div>
          <p className="text-xs text-slate-500 mb-6">{t('admin.create.desc')}</p>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
                {t('admin.username')}
              </label>
              <div className="relative">
                <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-slate-800/80 border border-orange-500/30 rounded-xl p-3 pl-10 text-xs text-white focus:ring-1 focus:ring-orange-500 outline-none placeholder-gray-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
                {t('admin.password')}
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 pl-10 pr-10 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
                {t('admin.confirm')}
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={adminConfirm}
                  onChange={(e) => setAdminConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/80 border border-orange-500/30 rounded-xl p-3 pl-10 text-xs text-white focus:ring-1 focus:ring-orange-500 outline-none placeholder-gray-500"
                />
              </div>
            </div>

            {adminError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[10px] text-rose-400">
                {adminError}
              </div>
            )}

            <button
              onClick={handleAdminCreate}
              disabled={adminSaving || !adminUsername || !adminPassword}
              className="w-full py-4 bg-orange-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {adminSaving ? (
                <><RefreshCw size={14} className="animate-spin" /> Creating...</>
              ) : (
                <><ShieldCheck size={14} /> {t('admin.create.btn')}</>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};


// ── i18n Hook ──────────────────────────────────────────────────────────
function useLang() {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('saturn-lang') as Language) || 'en';
  });
  const set = useCallback((l: Language) => {
    localStorage.setItem('saturn-lang', l);
    setLang(l);
  }, []);
  return { lang, setLang: set, t: (key: string) => t(key, lang) };
}

// ── StatCard ────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
  <div className="immersive-card p-6 group transition-all hover:bg-white/[0.05]">
    <div className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">{title}</div>
    <div className="text-3xl font-mono font-bold text-white tracking-tighter flex items-baseline gap-2">
      {value}
      {trend && (
        <span className={cn("text-xs font-normal", trend > 0 ? "text-emerald-400" : "text-rose-400")}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div className="mt-4 flex gap-1 h-1">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: i * 0.1 }}
            className={cn("h-full w-full origin-left", trend && trend > 0 ? "bg-emerald-500" : "bg-orange-500")}
          />
        </div>
      ))}
    </div>
  </div>
);

// ── ServerRow ──────────────────────────────────────────────────────────
const ServerRow = ({ server, onClick, t }: { server: ManagedServer, onClick: () => void, t: (k: string) => string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ backgroundColor: 'rgba(30, 41, 59, 0.5)' }}
    onClick={onClick}
    className="flex items-center justify-between p-4 border-b border-slate-800 cursor-pointer transition-colors"
  >
    <div className="flex items-center gap-4">
      <div className={cn(
        "w-3 h-3 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]",
        server.status === 'online' ? 'bg-emerald-500' : 
        server.status === 'degraded' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-slate-600'
      )} />
      <div>
        <div className="font-semibold text-white flex items-center gap-2">
          {server.name}
          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 uppercase">{server.os}</span>
        </div>
        <div className="text-xs text-slate-500 font-mono">{server.ip}</div>
      </div>
    </div>
    <div className="flex items-center gap-8">
      <div className="hidden md:flex flex-col gap-1 w-24">
        <div className="flex justify-between text-[10px] text-slate-500 uppercase">
          <span>{t('server.cpu')}</span>
          <span>{server.cpu}%</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(server.cpu, 100)}%` }}
            className={cn("h-full rounded-full", server.cpu > 90 ? "bg-rose-500" : server.cpu > 70 ? "bg-amber-500" : "bg-emerald-500")}
          />
        </div>
      </div>
      <div className="hidden md:flex flex-col gap-1 w-24">
        <div className="flex justify-between text-[10px] text-slate-500 uppercase">
          <span>{t('server.mem')}</span>
          <span>{server.memory}%</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(server.memory, 100)}%` }}
            className={cn("h-full rounded-full", server.memory > 90 ? "bg-rose-500" : server.memory > 70 ? "bg-amber-500" : "bg-emerald-500")}
          />
        </div>
      </div>
      <ChevronRight size={16} className="text-slate-600" />
    </div>
  </motion.div>
);

// ── IncidentCard ───────────────────────────────────────────────────────
const IncidentCard = ({ incident, analyzing, onAnalyze, onResolve, t }: { incident: Incident, analyzing?: boolean, onAnalyze: () => void, onResolve: (id: string) => void, t: (k: string) => string }) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className={cn(
      "p-4 rounded-2xl border transition-all",
      incident.severity === 'critical' ? "border-rose-500/30 bg-rose-500/5" :
      incident.severity === 'warning' ? "border-amber-500/30 bg-amber-500/5" :
      "border-sky-500/30 bg-sky-500/5"
    )}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-2 h-2 rounded-full",
          incident.status === 'open' ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
        )} />
        <div>
          <div className="text-sm font-bold text-white">{incident.title}</div>
          <div className="text-[10px] text-slate-500 font-mono">{incident.serverId} • {new Date(incident.timestamp).toLocaleString()}</div>
        </div>
      </div>
      <span className={cn(
        "text-[9px] uppercase font-black px-2 py-0.5 rounded-full",
        incident.severity === 'critical' ? "bg-rose-500/20 text-rose-400" :
        incident.severity === 'warning' ? "bg-amber-500/20 text-amber-400" :
        "bg-sky-500/20 text-sky-400"
      )}>
        {incident.severity}
      </span>
    </div>
    <p className="text-xs text-slate-400 leading-relaxed mb-3">{incident.description}</p>
    <div className="flex items-center justify-between gap-2">
      <span className="text-[9px] text-slate-600 font-mono">{incident.status}</span>
      <div className="flex gap-2">
        {incident.status === 'open' && (
          <>
            <button
              onClick={onAnalyze}
              disabled={analyzing}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-orange-500/20 text-orange-400 px-3 py-1.5 rounded-lg hover:bg-orange-500/30 transition-all disabled:opacity-50"
            >
              {analyzing ? 'Analyzing...' : 'Analyze'}
            </button>
            <button
              onClick={() => onResolve(incident.id)}
              className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-500/30 transition-all"
            >
              Resolve
            </button>
          </>
        )}
      </div>
    </div>
  </motion.div>
);

// ── CredentialCard ─────────────────────────────────────────────────────
const CredentialCard = ({ cred, onDelete, onScan, scanning }: { cred: any, onDelete: (id: string) => void, onScan: (id: string) => void, scanning: boolean }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-6 rounded-3xl bg-black/40 border border-white/5 hover:border-orange-500/30 transition-all group relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 p-4">
       <button onClick={() => onDelete(cred.id)} className="p-2 text-slate-600 hover:text-rose-500 transition-colors bg-white/5 rounded-xl">
        <Trash2 size={14} />
      </button>
    </div>
    
    <div className="flex items-center gap-4 mb-6">
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-xl transition-transform group-hover:scale-110",
        cred.provider === 'aws' ? "bg-orange-500/10 text-orange-500" :
        cred.provider === 'gcp' ? "bg-sky-500/10 text-sky-500" :
        "bg-blue-600/10 text-blue-500"
      )}>
        <Globe size={24} />
      </div>
      <div>
        <div className="text-md font-black text-white uppercase tracking-wider">{cred.name}</div>
        <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{cred.provider} • {cred.type}</div>
      </div>
    </div>

    <div className="space-y-4">
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] font-mono text-slate-400">
        Vault ID: <span className="text-orange-500">{cred.id.slice(0, 8)}...</span>
      </div>
      
      <button 
        onClick={() => onScan(cred.id)}
        disabled={scanning}
        className="w-full py-4 bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.2)] disabled:opacity-50"
      >
        {scanning ? (
          <><RefreshCw size={14} className="animate-spin" /> Scanning account...</>
        ) : (
          <><RefreshCw size={14} /> Discover Instances</>
        )}
      </button>
    </div>
  </motion.div>
);

// ── Main App Component ─────────────────────────────────────────────────
const ServerCard = ({ server, onClick }: { server: ManagedServer, onClick: () => void }) => {
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete server ${server.name} (${server.ip})? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api(`/api/servers/${server.id}`, { method: 'DELETE' });
    } catch {}
    setDeleting(false);
    window.location.reload();
  };
  return (
  <motion.div 
    whileHover={{ y: -4 }}
    onClick={onClick}
    className="p-5 rounded-2xl bg-black/40 border border-white/5 hover:border-orange-500/30 transition-all cursor-pointer group relative"
  >
    <button onClick={handleDelete} disabled={deleting}
      className="absolute top-3 right-3 p-1.5 rounded-lg bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 transition-all"
      title="Delete server"
    >
      {deleting ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
    </button>
    <div className="flex items-start justify-between mb-4">
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
        server.status === 'online' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
      )}>
        <Server size={20} />
      </div>
      <div className={cn(
        "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
        server.status === 'online' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
      )}>
        {server.status}
      </div>
    </div>
    <h3 className="text-xs font-black uppercase tracking-widest text-black mb-1 truncate">{server.name}</h3>
    <p className="text-[10px] text-slate-500 font-mono mb-4">{server.ip}</p>
    <div className="grid grid-cols-2 gap-2">
      <div className="p-2 rounded-lg bg-white/5">
        <p className="text-[8px] text-slate-500 uppercase font-black mb-1">CPU</p>
        <p className="text-[10px] font-mono text-white">{server.cpu}%</p>
      </div>
      <div className="p-2 rounded-lg bg-white/5">
        <p className="text-[8px] text-slate-500 uppercase font-black mb-1">RAM</p>
        <p className="text-[10px] font-mono text-white">{server.memory}%</p>
      </div>
    </div>
  </motion.div>
);
  };

const AddNodeModal = ({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) => {
  const [newServerIp, setNewServerIp] = useState('');
  const [newServerPort, setNewServerPort] = useState('22');
  const [newServerUser, setNewServerUser] = useState('ubuntu');
  const [newServerKey, setNewServerKey] = useState('');
  const [newServerPassword, setNewServerPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [addingServer, setAddingServer] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddServer = async () => {
    setErrorMsg(null);
    if (!newServerIp || !newServerUser || (!newServerKey && !newServerPassword && !confirm('No key or password provided. Attempt using default?'))) return;
    setAddingServer(true);
    try {
      const res = await api('/api/ssh/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: newServerIp, port: parseInt(newServerPort) || 22, username: newServerUser, privateKey: newServerKey, password: newServerPassword })
      });
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        try {
          const error = await res.json();
          setErrorMsg(`Connection Failed: ${error.error || error.message || 'Unknown error'} (HTTP ${res.status})`);
        } catch(e) {
          const text = await res.text();
          setErrorMsg(`Connection Failed (HTTP ${res.status}): ${text.substring(0,200)}`);
        }
      }
    } catch (e: any) {
      setErrorMsg(`Error: ${e.message}`);
    }
    setAddingServer(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
          <X size={20} />
        </button>
        <h3 className="text-sm font-black uppercase tracking-widest mb-6 text-white flex items-center gap-2"><Server className="text-orange-500" size={18}/> Adopt New Node</h3>
        
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold font-mono">
            {errorMsg}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">IP Address or Hostname</label>
              <input type="text" value={newServerIp} onChange={e => setNewServerIp(e.target.value)} placeholder="e.g. 192.168.1.100" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none" />
            </div>
            <div className="w-24">
              <label className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-2 block">Port</label>
              <input type="text" value={newServerPort} onChange={e => setNewServerPort(e.target.value)} placeholder="22" className="w-full bg-black border border-orange-500/30 rounded-xl px-4 py-3 text-sm text-orange-400 focus:border-orange-500 outline-none text-center font-bold" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">SSH Username</label>
            <input type="text" value={newServerUser} onChange={e => setNewServerUser(e.target.value)} placeholder="ubuntu" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">SSH Private Key (PEM/RSA/ED25519)</label>
            <div className="relative">
              <textarea value={newServerKey} onChange={e => setNewServerKey(e.target.value)} placeholder="-----BEGIN PRIVATE KEY-----..." rows={5} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-slate-400 focus:border-orange-500 outline-none custom-scrollbar" />
              <label className="absolute bottom-4 right-4 px-3 py-1.5 bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest cursor-pointer transition-colors flex items-center gap-2">
                <Upload size={12} /> Upload .pem
                <input type="file" className="hidden" accept=".pem,.key,application/x-pem-file" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => setNewServerKey(e.target?.result as string);
                    reader.readAsText(file);
                  }
                }} />
              </label>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Or SSH Password (if no key)</label>
            <div className="relative">
              <input type={showPass ? "text" : "password"} value={newServerPassword} onChange={e => setNewServerPassword(e.target.value)} placeholder="••••••••" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm text-white focus:border-orange-500 outline-none" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex gap-4 mt-8">
            <button onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors">Cancel</button>
            <button onClick={handleAddServer} disabled={addingServer || !newServerIp} className="flex-1 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2">
              {addingServer ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full" /> : <><Zap size={14}/> Connect</>}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ImportSkillModal = ({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) => {
  const [prompt, setPrompt] = useState('');
  const [skillName, setSkillName] = useState('');
  const [os, setOs] = useState('linux');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedSkill, setGeneratedSkill] = useState<any>(null);
  const [importError, setImportError] = useState('');

  const handleGenerate = async () => {
    if (!prompt) return;
    setGenerating(true);
    setImportError('');
    try {
      const res = await api('/api/neural/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, os, context: {} })
      });
      const data = await res.json();
      setGeneratedSkill({
        name: skillName || `AI_${os}_${Date.now().toString().slice(-4)}`,
        language: os === 'windows' ? 'powershell' : 'bash',
        version: '1.0',
        description: data.description,
        script: data.script,
      });
    } catch (e) {
      console.error(e);
      setImportError('Failed to generate script: ' + (e as any).message);
    }
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!generatedSkill) return;
    setSaving(true);
    setImportError('');
    try {
      const res = await api('/api/skills/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...generatedSkill, name: skillName || generatedSkill.name })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setImportError(data.error || 'Failed to save');
      }
    } catch (e) {
      setImportError('Error saving skill: ' + (e as any).message);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
        <h3 className="text-sm font-black uppercase tracking-widest mb-6 text-white flex items-center gap-2"><Brain className="text-orange-500" size={18}/> Neural Skill Generator</h3>
        
        <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
          {importError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-mono">
              {importError}
            </div>
          )}
          {!generatedSkill ? (
            <>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Skill Name</label>
                <input
                  type="text"
                  value={skillName}
                  onChange={e => setSkillName(e.target.value)}
                  placeholder="e.g. Memory Usage Monitor"
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Target Environment</label>
                <select value={os} onChange={e => setOs(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none">
                  <option value="linux">Linux (Bash)</option>
                  <option value="windows">Windows (PowerShell)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Description / Goal</label>
                <textarea 
                  value={prompt} 
                  onChange={e => setPrompt(e.target.value)} 
                  placeholder="e.g. Automatically detect and restart the Nginx service if it consumes more than 1GB of RAM..." 
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none h-32 resize-none custom-scrollbar" 
                />
              </div>
              <button 
                onClick={handleGenerate} 
                disabled={generating || !prompt} 
                className="w-full py-3 mt-4 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {generating ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full" /> : <><Brain size={14}/> Generate Script</>}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-2">Skill: {generatedSkill.name}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{generatedSkill.description}</p>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Script ({generatedSkill.language})</label>
                <div className="bg-black border border-white/10 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-[10px] text-slate-300 font-mono whitespace-pre-wrap">{generatedSkill.script}</pre>
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => { setGeneratedSkill(null); setImportError(''); }} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors">Discard</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2">
                  {saving ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full" /> : <><Plus size={14}/> Save Skill</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const SkillSourceModal = ({ skill, onClose }: { skill: any, onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-3xl bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col max-h-[80vh]">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
        <h3 className="text-sm font-black uppercase tracking-widest mb-6 text-white flex items-center gap-2"><FileText className="text-orange-500" size={18}/> {skill.name} Source</h3>
        <div className="flex-1 overflow-auto bg-black border border-white/5 rounded-xl p-4">
          <pre className="text-[10px] text-slate-300 font-mono whitespace-pre-wrap">{skill.script || 'No source available. Fetch from backend not implemented.'}</pre>
        </div>
      </motion.div>
    </div>
  );
};

const SkillsView = ({ skills, setSkills }: { skills: any[], setSkills: any }) => {
  const [syncingSkills, setSyncingSkills] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedSource, setSelectedSource] = useState<any | null>(null);

  const handleSyncSkills = async () => {
    setSyncingSkills(true);
    try {
      const res = await api('/api/skills');
      const data = await res.json();
      setSkills(Array.isArray(data) ? data : []);
    } catch {} finally {
      setSyncingSkills(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Brain className="text-orange-500" size={20} />
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em]">Expert Skills Library</h2>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Autonomous Agent Capabilities</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSyncSkills} disabled={syncingSkills} className="px-4 py-2 bg-white/5 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 flex items-center gap-2 disabled:opacity-50">
            <RefreshCw size={14} className={syncingSkills ? "animate-spin" : ""} /> Sync Repo
          </button>
          <button onClick={() => setShowImport(true)} className="px-4 py-2 bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 flex items-center gap-2">
            <Plus size={14} /> Import Skill
          </button>
        </div>
      </div>
      {(skills || []).length === 0 ? (
        <div className="col-span-full p-12 border border-dashed border-white/10 rounded-2xl text-center">
          <Brain size={32} className="text-slate-600 mx-auto mb-4" />
          <p className="text-xs font-black uppercase text-slate-500 tracking-widest">No skills in library</p>
          <p className="text-[10px] text-slate-600 mt-2">Import a skill from the repository or generate one with AI</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(skills || []).map((s: any) => (
          <div key={s.id} className="p-6 rounded-2xl bg-black/40 border border-white/5 hover:border-orange-500/30 transition-all group flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xs font-black uppercase text-white leading-relaxed">{s.name}</h3>
              <span className="px-2 py-1 bg-white/5 rounded text-[8px] font-black uppercase text-slate-400 border border-white/10">v{s.version || '1.0.0'}</span>
            </div>
            <p className="text-[10px] text-slate-500 mb-6 flex-1">{s.description}</p>
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                s.language === 'python' ? "bg-sky-500/10 text-sky-400" :
                s.language === 'bash' ? "bg-emerald-500/10 text-emerald-400" :
                "bg-amber-500/10 text-amber-400"
              )}>
                {s.language}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setSelectedSource(s)} className="p-1.5 text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors" title="View Source"><FileText size={14} /></button>
                <button onClick={async () => {
                  const targetId = prompt('Enter target server ID or group name:');
                  if (targetId) {
                    await api('/api/skills/assignments', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ skillId: s.id, targetId, targetType: 'server' })
                    });
                    alert('Skill assigned to ' + targetId);
                  }
                }} className="p-1.5 text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors" title="Assign to Node"><Plug size={14} /></button>
                <button onClick={async () => {
                  const targetId = prompt('Enter target server ID to run on:');
                  if (targetId) {
                    await api('/api/skills/generate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ skillId: s.id, serverId: targetId })
                    });
                    alert('Skill execution triggered on ' + targetId);
                  }
                }} className="p-1.5 text-orange-500 hover:text-white bg-orange-500/10 hover:bg-orange-500/30 rounded-lg transition-colors font-black text-[9px] uppercase px-3">Run</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
      <AnimatePresence>
        {showImport && <ImportSkillModal onClose={() => setShowImport(false)} onSuccess={() => { setShowImport(false); handleSyncSkills(); }} />}
        {selectedSource && <SkillSourceModal skill={selectedSource} onClose={() => setSelectedSource(null)} />}
      </AnimatePresence>
    </div>
  );
};

const TreeNode = ({ node, level = 0, onSelectFile, selectedFile }: any) => {
  const [expanded, setExpanded] = useState(false);
  const isDir = node.type === 'dir';
  return (
    <div className="w-full">
      <button 
        onClick={() => isDir ? setExpanded(!expanded) : onSelectFile(node)}
        className={cn(
          "w-full text-left py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
          !isDir && selectedFile?.name === node.name ? "bg-orange-500/10 text-orange-500" : "text-slate-400 hover:bg-white/5",
          level > 0 && "ml-4"
        )}
      >
        {isDir ? (
          expanded ? <Folder size={14} className="text-orange-500" /> : <Folder size={14} className="text-slate-600" />
        ) : (
          <FileText size={14} className={selectedFile?.name === node.name ? "text-orange-500" : "text-slate-600"} />
        )}
        {node.name}
      </button>
      {isDir && expanded && node.children && (
        <div className="border-l border-white/5 ml-4 mt-1">
          {(node.children || []).map((child: any, i: number) => (
            <TreeNode key={i} node={child} level={level + 1} onSelectFile={onSelectFile} selectedFile={selectedFile} />
          ))}
        </div>
      )}
    </div>
  );
};

const ContextPView = () => {
  const [tree, setTree] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    api('/api/contextp/files')
      .then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(data => { setTree(Array.isArray(data) ? data : []); })
      .catch(err => { console.error(err); setError('Could not load ContextP files. Ensure backend is running.'); });
  }, []);

  const loadFile = async (f: any) => {
    if (f.type === 'dir') return;
    setSelectedFile(f);
    setLoading(true);
    try {
      const res = await api(`/api/contextp/read?path=${encodeURIComponent(f.path)}`);
      const data = await res.json();
      setFileContent(data.content || 'File not found or empty.');
    } catch (e) {
      setFileContent('Error loading file.');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="text-orange-500" size={20} />
          <h2 className="text-sm font-black uppercase tracking-[0.2em]">ContextP Memory</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 bg-black/40 border border-white/5 rounded-2xl p-4 overflow-y-auto max-h-[600px] custom-scrollbar">
          {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-mono mb-3">{error}</div>}
          {(tree || []).map((node: any, i: number) => (
            <TreeNode key={i} node={node} onSelectFile={loadFile} selectedFile={selectedFile} />
          ))}
          {(tree || []).length === 0 && !error && <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center py-8">No ContextP files available. Check backend directory structure.</p>}
        </div>
        <div className="lg:col-span-3 bg-black/60 border border-white/5 rounded-2xl overflow-hidden flex flex-col h-[600px]">
          {!selectedFile ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
              <Brain size={48} className="text-slate-800 mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Select a ContextP file to analyze</p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-slate-700 border-t-orange-500 rounded-full mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Reading Cognitive Memory...</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">{fileContent}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AuditView = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(() => {
    const saved = localStorage.getItem("saturn-user");
    return saved ? false : true;
  });

  useEffect(() => {
    api('/api/audit')
      .then(res => res.json())
      .then(data => {
        setLogs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 mb-8">
        <FileText className="text-orange-500" size={24} />
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.2em]">Global Audit Logs</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">System-wide Immutable Event Trail</p>
        </div>
      </div>
      
      <div className="bg-black/60 border border-white/5 rounded-2xl overflow-hidden flex flex-col min-h-[600px] max-h-[800px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-slate-700 border-t-orange-500 rounded-full mx-auto mb-4" />
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Loading Audit Trail...</p>
          </div>
        ) : (logs || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">No audit logs found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-[9px] font-black uppercase text-slate-500 tracking-widest">
                  <th className="p-4 w-48">Timestamp</th>
                  <th className="p-4 w-32">Action</th>
                  <th className="p-4 w-32">Server ID</th>
                  <th className="p-4 w-32">User</th>
                  <th className="p-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(logs || []).map((log, i) => (
                  <tr key={i} className="hover:bg-white/5 text-[10px] text-slate-300 font-mono transition-colors">
                    <td className="p-4 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-4"><span className="px-2 py-1 bg-white/5 rounded-lg text-orange-500 uppercase">{log.action}</span></td>
                    <td className="p-4">{log.serverId || 'GLOBAL'}</td>
                    <td className="p-4">{log.username || 'System'}</td>
                    <td className="p-4 truncate max-w-[300px]" title={log.details}>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
// ── Socket.io Hook (Ticket W-01) ──────────────────────────────────────
function useSocket(onMetricsUpdate: (data: any) => void, onNewIncident: (incident: any) => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(window.location.origin);
    socketRef.current = socket;

    socket.on('connect', () => console.log('[WS] Connected to Saturn Core'));
    socket.on('metrics:update', onMetricsUpdate);
    socket.on('incident:new', onNewIncident);

    return () => {
      socket.disconnect();
    };
  }, [onMetricsUpdate, onNewIncident]);

  const subscribeToServer = (serverId: string) => {
    socketRef.current?.emit('subscribe:server', serverId);
  };

  const unsubscribeFromServer = (serverId: string) => {
    socketRef.current?.emit('unsubscribe:server', serverId);
  };

  return { subscribeToServer, unsubscribeFromServer };
}

// ── SSE Hook (lightweight alternative to Socket.io, TD-005) ─────────
// Connect via EventSource to /api/metrics/stream and emit events.
// Returns the same interface as useSocket for drop-in replacement.
function useSSE(onMetricsUpdate: (data: any) => void, _onNewIncident: (incident: any) => void) {
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource('/api/metrics/stream');
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      console.log('[SSE] Connected to Saturn Metrics Stream');
    });

    es.addEventListener('metrics', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.servers) {
          // Emit per-server metrics updates
          for (const s of data.servers) {
            onMetricsUpdate({
              serverId: s.id,
              cpu: s.cpu,
              memory: s.memory,
              disk: s.disk,
              uptime: s.uptime,
              status: s.status,
              timestamp: s.timestamp || data.timestamp
            });
          }
        }
      } catch (e) {
        console.error('[SSE] Failed to parse metrics event:', e);
      }
    });

    // Also listen to per-server events for more granular updates
    es.onmessage = (event: MessageEvent) => {
      if (event.type === 'message' && event.data) {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.serverId) {
            onMetricsUpdate(parsed);
          }
        } catch {}
      }
    };

    es.onerror = () => {
      console.warn('[SSE] Connection error — will auto-reconnect');
    };

    return () => {
      es.close();
    };
  }, [onMetricsUpdate, _onNewIncident]);

  // SSE doesn't support per-server subscription — it receives all data
  const subscribeToServer = (_serverId: string) => {};
  const unsubscribeFromServer = (_serverId: string) => {};

  return { subscribeToServer, unsubscribeFromServer };
}

export default function App() {
  const { lang, setLang, t } = useLang();
  const [onboarding, setOnboarding] = useState<boolean | null>(null);
  const [servers, setServers] = useState<ManagedServer[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationConfig[]>([]);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [sshConnections, setSshConnections] = useState<SshConnection[]>([]);
  const [cloudCreds, setCloudCreds] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [proactiveActivities, setProactiveActivities] = useState<any[]>([]);
  const [contextPFiles, setContextPFiles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ManagedServer | null>(null);
  const [dashboardServerId, setDashboardServerId] = useState<string | null>(null);
  const [metricsBuffer, setMetricsBuffer] = useState<Record<string, Array<{ time: string; cpu: number; memory: number; disk: number }>>>(() => {
    try {
      const saved = localStorage.getItem('saturn-metrics-buffer');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [serverDetailTab, setServerDetailTab] = useState('summary');
  const [remediationConfigs, setRemediationConfigs] = useState<any[]>([]);
  const [globalConfig, setGlobalConfig] = useState<any>({ mode: 'auto', threshold: 0.7 });
  const [globalThresholds, setGlobalThresholds] = useState<Record<string,number>>({ cpu: 90, memory: 85, disk: 85 });
  const [loading, setLoading] = useState(() => {
    const saved = localStorage.getItem("saturn-user");
    return saved ? false : true;
  });
  const [analyzingIncident, setAnalyzingIncident] = useState<string | null>(null);

  // Realtime transport toggle: 'socketio' | 'sse'
  const [realtimeMode, setRealtimeMode] = useState<'socketio' | 'sse'>(() => {
    return (localStorage.getItem('saturn-realtime-mode') as 'socketio' | 'sse') || 'socketio';
  });

  // Real-time Metrics Handler
  const handleMetricsUpdate = useCallback((data: any) => {
    setServers(prev => prev.map(s => s.id === data.serverId ? { ...s, ...data } : s));
    // Accumulate into metrics buffer
    if (data.cpu != null && data.serverId) {
      const point = { time: new Date().toLocaleTimeString(), cpu: data.cpu, memory: data.memory ?? 0, disk: data.disk ?? 0 };
      setMetricsBuffer(prev => {
        const buf = { ...prev };
        const arr = [...(buf[data.serverId] || []), point].slice(-120);
        buf[data.serverId] = arr;
        // Persist to localStorage (throttled)
        try { localStorage.setItem('saturn-metrics-buffer', JSON.stringify(buf)); } catch {}
        return buf;
      });
    }
  }, []);

  const handleNewIncident = useCallback((incident: any) => {
    setIncidents(prev => [incident, ...prev]);
  }, []);

  // Choose transport based on toggle
  const socketHook = useSocket(handleMetricsUpdate, handleNewIncident);
  const sseHook = useSSE(handleMetricsUpdate, handleNewIncident);
  const { subscribeToServer, unsubscribeFromServer } = realtimeMode === 'socketio' ? socketHook : sseHook;

  // Toggle handler
  const toggleRealtimeMode = useCallback(() => {
    setRealtimeMode(prev => {
      const next = prev === 'socketio' ? 'sse' : 'socketio';
      localStorage.setItem('saturn-realtime-mode', next);
      return next;
    });
  }, []);
  
  // Add Server State
  const [showAddServer, setShowAddServer] = useState(false);

  const [user, setUser] = useState<UserData | null>(() => {
    const saved = localStorage.getItem('saturn-user');
    const token = localStorage.getItem('saturn-token');
    if (saved && !token) return null; // No token = no user
    return saved ? JSON.parse(saved) : null;
  });

  // ── Validate saved token against server ──
  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('saturn-token');
      if (!token) return;
      try {
        const res = await fetch('/api/servers', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('saturn-token');
          localStorage.removeItem('saturn-user');
          localStorage.removeItem('saturn-refresh-token');
          setUser(null);
        }
      } catch { /* Network error - keep saved state */ }
    };
    validateSession();
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/setup/status');
        const data = await res.json();
        setOnboarding(!data.initialized);
      } catch (e) { setOnboarding(true); }
    };
    checkStatus();
  }, []);

  useEffect(() => {
    if (onboarding) return;
    const fetchData = async () => {
      try {
        const [sRes, iRes, aRes, nRes, aiRes, sshRes, cRes, skRes, rRes, pRes, cpRes] = await Promise.all([
          api('/api/servers'), api('/api/incidents'), api('/api/audit'), api('/api/notifications'),
          api('/api/ai/config'), api('/api/ssh/connections'), api('/api/credentials'), api('/api/skills'),
          api('/api/remediation/config'), api('/api/proactive'), api('/api/contextp/files')
        ]);
        const sData = await sRes.json();
        setServers(Array.isArray(sData) ? sData : []);
        const iData = await iRes.json();
        setIncidents(Array.isArray(iData) ? iData : []);
        const aData = await aRes.json();
        setAuditLogs(Array.isArray(aData) ? aData : []);
        const nData = await nRes.json();
        setNotifications(Array.isArray(nData) ? nData : []);
        setAiConfig(await aiRes.json());
        const sshData = await sshRes.json();
        setSshConnections(Array.isArray(sshData) ? sshData : []);
        const cData = await cRes.json();
        setCloudCreds(Array.isArray(cData) ? cData : []);
        const skillsData = await skRes.json();
        setSkills(Array.isArray(skillsData) ? skillsData : []);
        const pData = await pRes.json();
        setProactiveActivities(Array.isArray(pData) ? pData : []);
        const cpData = await cpRes.json();
        setContextPFiles(Array.isArray(cpData) ? cpData : []);
        const rData = await rRes.json();
        setRemediationConfigs(Array.isArray(rData) ? rData : []);
        setGlobalConfig((configs || []).find((c: any) => c.serverId === 'global') || { mode: 'auto', threshold: 0.7 });
      } catch {} finally { setLoading(false); }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [onboarding]);

  const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 min inactivity

const handleLogin = (u: UserData, token?: string, refreshToken?: string) => {
    setUser(u);
    localStorage.setItem('saturn-user', JSON.stringify(u));
    if (token) localStorage.setItem('saturn-token', token);
    if (refreshToken) localStorage.setItem('saturn-refresh-token', refreshToken);
    localStorage.setItem('saturn-last-activity', Date.now().toString());
  };

  // ── Session inactivity timeout ──
  useEffect(() => {
    const checkSession = () => {
      const lastActivity = localStorage.getItem('saturn-last-activity');
      if (lastActivity && Date.now() - parseInt(lastActivity) > SESSION_TIMEOUT_MS) {
        console.log('[SESSION] Expired due to inactivity');
        localStorage.removeItem('saturn-token');
        localStorage.removeItem('saturn-user');
        localStorage.removeItem('saturn-refresh-token');
        localStorage.removeItem('saturn-last-activity');
        window.location.reload();
      }
    };
    const interval = setInterval(checkSession, 30000); // check every 30s
    return () => clearInterval(interval);
  }, []);

  // ── Update activity timestamp on user interaction ──
  useEffect(() => {
    const updateActivity = () => localStorage.setItem('saturn-last-activity', Date.now().toString());
    window.addEventListener('mousemove', updateActivity, { passive: true });
    window.addEventListener('keydown', updateActivity, { passive: true });
    window.addEventListener('click', updateActivity, { passive: true });
    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, []);
  const handleLogout = () => { setUser(null); localStorage.removeItem('saturn-user'); };

  const handleUpdateRemediationMode = async (serverId: string | null, mode: string) => {
    try {
      await api('/api/remediation/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: serverId || 'global', mode })
      });
      const res = await api('/api/remediation/config');
      const configs = await res.json();
      setRemediationConfigs(Array.isArray(configs) ? configs : []);
      if (!serverId || serverId === 'global') setGlobalConfig((configs || []).find((c: any) => c.serverId === 'global'));
    } catch {}
  };

  const handleAnalyzeIncident = async (incidentId: string) => {
    setAnalyzingIncident(incidentId);
    try {
      const res = await api('/api/neural/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId })
      });
      if (res.ok) {
        // Refetch incidents
        const iRes = await api('/api/incidents');
        const incidentsData = await iRes.json(); setIncidents(Array.isArray(incidentsData) ? incidentsData : []);
      }
    } catch (e) {
      console.error("Failed to analyze incident", e);
    } finally {
      setAnalyzingIncident(null);
    }
  };

  const handleResolveIncident = async (incidentId: string) => {
    try {
      const res = await api(`/api/incidents/${incidentId}/resolve`, { method: 'POST' });
      if (res.ok) {
        const iRes = await api('/api/incidents');
        const incidentsData = await iRes.json(); setIncidents(Array.isArray(incidentsData) ? incidentsData : []);
      }
    } catch (e) {
      console.error("Failed to resolve incident", e);
    }
  };

  const SidebarItem = ({ id, label, icon: Icon }: any) => (
    <button onClick={() => { setActiveTab(id); setMobileMenuOpen(false); setSelectedServer(null); }}
      className={cn("flex items-center gap-3 w-full p-3 rounded-xl transition-all group", activeTab === id ? "bg-orange-500/10 text-orange-400" : "text-slate-500 hover:text-white hover:bg-white/5")}>
      <Icon size={20} className={cn("transition-transform group-hover:scale-110", activeTab === id ? "text-orange-500" : "text-slate-500")} />
      {(!sidebarCollapsed || mobileMenuOpen) && <span className="text-xs font-black uppercase tracking-widest">{label}</span>}
    </button>
  );

  // ── Live Metrics Dashboard ────────────────────────────────────────
  const selectedForDashboard = dashboardServerId
    ? (servers || []).find(s => s.id === dashboardServerId) || null
    : servers.length > 0 ? servers[0] : null;

  // Re-subscribe when dashboard server changes
  useEffect(() => {
    if (selectedForDashboard) {
      subscribeToServer(selectedForDashboard.id);
      return () => unsubscribeFromServer(selectedForDashboard.id);
    }
  }, [selectedForDashboard?.id]);

  const dashboardMetrics = selectedForDashboard
    ? metricsBuffer[selectedForDashboard.id] || []
    : [];

  const gaugeColor = (val: number) => {
    if (val >= 90) return 'text-rose-500';
    if (val >= 75) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const gaugeBar = (val: number) => {
    const color = val >= 90 ? 'bg-rose-500' : val >= 75 ? 'bg-amber-500' : 'bg-emerald-500';
    return (
      <div className="w-full bg-white/5 rounded-full h-2 mt-2">
        <motion.div
          className={`h-full rounded-full ${color} transition-all`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(val, 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    );
  };

  const DashboardView = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title={t('stats.total')} value={(servers || []).length} icon={Server} color="text-blue-500" />
        <StatCard title={t('stats.online')} value={(servers || []).filter(s => s.status === 'online').length} icon={CheckCircle2} color="text-emerald-500" />
        <StatCard title={t('stats.incidents')} value={(incidents || []).filter(i => i.status === 'open').length} icon={AlertTriangle} color="text-rose-500" />
        <StatCard title={t('stats.ssh')} value={(sshConnections || []).filter(c => c.status === 'connected').length} icon={Zap} color="text-orange-500" />
      </div>

      {/* Realtime Transport Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Transport:
          </span>
          <button
            onClick={toggleRealtimeMode}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              realtimeMode === 'socketio'
                ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
                : "bg-sky-500/10 text-sky-400 border border-sky-500/30"
            )}
            title="Toggle between WebSocket (Socket.io) and SSE for real-time metrics"
          >
            {realtimeMode === 'socketio' ? '⚡ Socket.io' : '📡 SSE'}
          </button>
          <span className="text-[9px] text-slate-600 italic">
            {realtimeMode === 'socketio' ? 'Bidirectional (default)' : 'Lightweight (EventSource)'}
          </span>
        </div>
      </div>

      {/* Server Selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-2">Live Monitor:</span>
        {(servers || []).length === 0 && <span className="text-[10px] text-slate-600 italic">No servers connected</span>}
        {(servers || []).map(s => (
          <button
            key={s.id}
            onClick={() => setDashboardServerId(s.id)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              dashboardServerId === s.id
                ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${s.status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            {s.name || s.ip}
          </button>
        ))}
      </div>

      {/* Real-time Gauges */}
      {selectedForDashboard && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="immersive-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-orange-500" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">CPU</h3>
              </div>
              <motion.span
                key={selectedForDashboard.cpu}
                initial={{ scale: 1.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`text-2xl font-black ${gaugeColor(selectedForDashboard.cpu || 0)}`}
              >
                {Math.round(selectedForDashboard.cpu || 0)}%
              </motion.span>
            </div>
            {gaugeBar(selectedForDashboard.cpu || 0)}
          </div>

          <div className="immersive-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-orange-500" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">RAM</h3>
              </div>
              <motion.span
                key={selectedForDashboard.memory}
                initial={{ scale: 1.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`text-2xl font-black ${gaugeColor(selectedForDashboard.memory || 0)}`}
              >
                {Math.round(selectedForDashboard.memory || 0)}%
              </motion.span>
            </div>
            {gaugeBar(selectedForDashboard.memory || 0)}
          </div>

          <div className="immersive-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HardDrive size={16} className="text-orange-500" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Disk</h3>
              </div>
              <motion.span
                key={selectedForDashboard.disk}
                initial={{ scale: 1.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`text-2xl font-black ${gaugeColor(selectedForDashboard.disk || 0)}`}
              >
                {Math.round(selectedForDashboard.disk || 0)}%
              </motion.span>
            </div>
            {gaugeBar(selectedForDashboard.disk || 0)}
          </div>
        </div>
      )}

      {/* Live Charts */}
      {selectedForDashboard && dashboardMetrics.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="immersive-card p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              CPU {t('over time')}
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={dashboardMetrics}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#64748b' }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px' }} />
                <Area type="monotone" dataKey="cpu" stroke="#f97316" fill="url(#cpuGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="immersive-card p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              RAM &amp; Disk Over Time
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={dashboardMetrics}>
                <defs>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="diskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#64748b' }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px' }} />
                <Area type="monotone" dataKey="memory" stroke="#22c55e" fill="url(#memGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="disk" stroke="#3b82f6" fill="url(#diskGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bottom: Servers + Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Servers</h2>
              <button onClick={() => setActiveTab('servers')} className="text-[10px] font-black uppercase text-orange-500 hover:underline">View All</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(servers || []).slice(0, 4).map(s => <ServerCard key={s.id} server={s} onClick={() => { setSelectedServer(s); setServerDetailTab('summary'); setActiveTab('servers'); }} />)}
              {(servers || []).length === 0 && <div className="col-span-full p-12 border border-dashed border-white/10 rounded-2xl text-center"><Server size={24} className="text-slate-600 mx-auto mb-2" /><p className="text-[10px] font-black uppercase text-slate-600">No servers registered</p></div>}
            </div>
          </section>
        </div>
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <AlertTriangle size={12} className="text-rose-500" />
              Open Incidents
            </h2>
            <div className="space-y-3">
              {(incidents || []).filter((i: any) => i.status === 'open').length > 0 ? (
                (incidents || []).filter((i: any) => i.status === 'open').slice(0, 5).map(inc => <IncidentCard key={inc.id} incident={inc} analyzing={analyzingIncident === inc.id} onAnalyze={() => handleAnalyzeIncident(inc.id)} onResolve={() => handleResolveIncident(inc.id)} t={t} />)
              ) : <div className="p-8 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-center"><p className="text-[10px] font-black uppercase text-emerald-500">All clear</p></div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );

// ── Neural Result Cache (persists across re-renders) ───────────
let _neuralResultCache: any = null;

  const ServersListView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Server className="text-orange-500" size={20} />
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em]">{t('nav.servers')}</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Infrastructure Fleet</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} /><input type="text" placeholder="Filter..." className="bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-orange-500 outline-none w-64" /></div>
          <button onClick={() => setShowAddServer(true)} className="px-4 py-2 bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-colors flex items-center gap-2">
            <Plus size={14} /> Add Node
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {(servers || []).map(s => <ServerCard key={s.id} server={s} onClick={() => { setSelectedServer(s); setServerDetailTab('summary'); }} />)}
        {(servers || []).length === 0 && (
          <div className="col-span-full p-12 border border-dashed border-white/10 rounded-2xl text-center">
            <Server size={32} className="text-slate-600 mx-auto mb-4" />
            <p className="text-xs font-black uppercase text-slate-500 tracking-widest">No nodes registered</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddServer && <AddNodeModal onClose={() => setShowAddServer(false)} onSuccess={() => {
          api('/api/servers').then(r => r.json()).then(d => setServers(Array.isArray(d) ? d : []));
        }} />}
      </AnimatePresence>
    </div>
  );


  const ServerDetailView = () => {
    const [tabData, setTabData] = useState<Record<string, any>>({});
    const [loadingTab, setLoadingTab] = useState(false);
    const [syncingServer, setSyncingServer] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(0);
    const currentTabData = tabData[serverDetailTab];
    const setCurrentTabData = (data: any) => setTabData(prev => ({ ...prev, [serverDetailTab]: data }));

    const handleRefreshServer = async (silent = false) => {
      if (!selectedServer) return;
      setSyncingServer(true);
      try {
        const res = await api(`/api/servers/${selectedServer.id}/refresh`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to refresh server');
        setSelectedServer({ ...selectedServer, ...data.metrics });
      } catch (e: any) {
        console.error("Error refreshing server", e);
        if (!silent) alert(`Sync Failed: ${e.message}`);
      } finally {
        setSyncingServer(false);
      }
    };

    useEffect(() => {
      if (!selectedServer || serverDetailTab !== 'summary') return;
      const intervalId = setInterval(() => {
        handleRefreshServer(true);
      }, 60000);
      return () => clearInterval(intervalId);
    }, [selectedServer?.id, serverDetailTab]);

    useEffect(() => {
      if (!selectedServer || serverDetailTab === 'summary' || serverDetailTab === 'terminal') return;
      // Skip fetch if data already cached for this tab
      if (tabData[serverDetailTab]) return;
      const fetchTab = async () => {
        setLoadingTab(true);
        try {
          const res = await api(`/api/admin/servers/${selectedServer.id}/${serverDetailTab}`);
          const data = await res.json();
          setCurrentTabData(data);
        } catch (e) {
          console.error(e);
        }
        setLoadingTab(false);
      };
      fetchTab();
    }, [serverDetailTab, selectedServer]);

    const tabs = [
      { id: 'summary', label: 'Summary', icon: LayoutDashboard }, 
      { id: 'processes', label: 'Processes', icon: Cpu }, 
      { id: 'network', label: 'Network', icon: Globe }, 
      { id: 'firewall', label: 'Firewall', icon: ShieldCheck }, 
      { id: 'tasks', label: 'Tasks', icon: Logs }, 
      { id: 'users', label: 'Users', icon: Users },
      { id: 'packages', label: 'Packages', icon: Package },
      { id: 'webserver', label: 'Web', icon: Globe },
      { id: 'health', label: 'Health', icon: HeartPulse },
      { id: 'ssl', label: 'SSL', icon: Lock },
      { id: 'thresholds', label: 'Thresholds', icon: Sliders },
      { id: 'audit', label: 'Audit', icon: FileText },
      { id: 'config', label: 'Config', icon: Settings },
      { id: 'terminal', label: 'Terminal', icon: Terminal }
    ];
    
    const renderTabData = () => {
      if (loadingTab && !currentTabData) return <div className="p-12 text-center text-slate-500 italic uppercase text-[10px] font-black tracking-widest flex flex-col items-center gap-4"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-slate-700 border-t-orange-500 rounded-full" /> Fetching {serverDetailTab} telemetry...</div>;
      if (!currentTabData) return null;
      
      const dataArray = Array.isArray(currentTabData.data) ? currentTabData.data : (Array.isArray(currentTabData) ? currentTabData : [currentTabData]);
      
      if (dataArray.length === 0) return <div className="p-12 text-center text-slate-500 italic uppercase text-[10px] font-black tracking-widest">No data available for {serverDetailTab}</div>;

      const keys = Object.keys(dataArray[0] || {}).slice(0, 6);

      return (
        <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-[9px] font-black uppercase text-slate-500 tracking-widest">
                {keys.map(k => <th key={k} className="p-4">{k}</th>)}
              </tr>
            </thead>
            <tbody>
              {(dataArray || []).map((row: any, i: number) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 text-[10px] text-slate-300 font-mono transition-colors">
                  {(keys || []).map(k => <td key={k} className="p-4 truncate max-w-[200px]">{typeof row[k] === 'object' ? JSON.stringify(row[k]) : String(row[k])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/40 border border-white/5 p-6 rounded-2xl"><div className="flex items-center gap-4"><button onClick={() => setSelectedServer(null)} className="p-2 text-slate-500 hover:text-white bg-white/5 rounded-xl"><ChevronLeft className="" size={18} /></button><div><div className="flex items-center gap-2 mb-1"><h2 className="text-sm font-black uppercase tracking-widest">{selectedServer?.name}</h2><div className={cn("w-2 h-2 rounded-full animate-pulse", selectedServer?.status === 'online' ? "bg-emerald-500" : "bg-rose-500")} /></div><p className="text-[10px] font-medium text-slate-500 uppercase">{selectedServer?.ip} • {selectedServer?.os}</p></div></div><div className="flex items-center gap-3"><button onClick={() => handleRefreshServer(false)} disabled={syncingServer} className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-300 text-[10px] font-black uppercase rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"><RefreshCw size={14} className={syncingServer ? "animate-spin" : ""} /> Sync</button><select value={(remediationConfigs || []).find(c => c.serverId === selectedServer?.id)?.mode || 'global'} onChange={(e) => handleUpdateRemediationMode(selectedServer!.id, e.target.value)} className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-orange-500 outline-none cursor-pointer"><option value="global">Mode: Global</option><option value="auto">Mode: Auto</option><option value="skill">Mode: Skill</option><option value="manual">Mode: Manual</option></select></div></div>
        <div className="flex items-center gap-1 overflow-x-auto pb-2 custom-scrollbar">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button 
                key={t.id} 
                onClick={() => setServerDetailTab(t.id)} 
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", 
                  serverDetailTab === t.id ? "bg-orange-500 text-black" : "text-slate-500 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>
        <div className="min-h-[500px]">
          {serverDetailTab === 'summary' && <ServerSummaryTab />}
          {serverDetailTab === 'config' && <ServerConfigTab selectedServer={selectedServer} />}
          {serverDetailTab === 'terminal' && <TerminalTab />}
          {serverDetailTab === 'processes' && <ProcessesTab loadingTab={loadingTab} tabData={currentTabData} selectedServer={selectedServer} handleRefreshServer={handleRefreshServer} />}
          {serverDetailTab === 'network' && <NetworkTab loadingTab={loadingTab} tabData={currentTabData} selectedServer={selectedServer} handleRefreshServer={handleRefreshServer} />}
          {serverDetailTab === 'firewall' && <FirewallTab loadingTab={loadingTab} tabData={currentTabData} selectedServer={selectedServer} handleRefreshServer={handleRefreshServer} />}
          {serverDetailTab === 'tasks' && <TasksTab loadingTab={loadingTab} tabData={currentTabData} selectedServer={selectedServer} handleRefreshServer={handleRefreshServer} />}
          {serverDetailTab === 'users' && <UsersTab loadingTab={loadingTab} tabData={currentTabData} selectedServer={selectedServer} handleRefreshServer={handleRefreshServer} />}
          {serverDetailTab === 'packages' && <PackagesTab loadingTab={loadingTab} tabData={currentTabData} selectedServer={selectedServer} handleRefreshServer={handleRefreshServer} />}
          {serverDetailTab === 'webserver' && <WebserverTab loadingTab={loadingTab} tabData={currentTabData} selectedServer={selectedServer} handleRefreshServer={handleRefreshServer} />}
          { serverDetailTab === 'health' && <HealthTab loadingTab={loadingTab} tabData={currentTabData} selectedServer={selectedServer} handleRefreshServer={handleRefreshServer} />}
          { serverDetailTab === 'thresholds' && <ThresholdsTab selectedServer={selectedServer} />}
          { serverDetailTab !== 'summary' && serverDetailTab !== 'terminal' && serverDetailTab !== 'processes' && serverDetailTab !== 'network' && serverDetailTab !== 'firewall' && serverDetailTab !== 'tasks' && serverDetailTab !== 'users' && serverDetailTab !== 'packages' && serverDetailTab !== 'webserver' && serverDetailTab !== 'health' && serverDetailTab !== 'thresholds' && renderTabData()}
        </div>
      </div>
    );
  };

  const ThresholdsTab = ({ selectedServer }: { selectedServer: ManagedServer | null }) => {
    const [configs, setConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      fetchConfigs();
    }, [selectedServer?.id]);

    const fetchConfigs = async () => {
      setLoading(true);
      try {
        const res = await api(`/api/thresholds/${selectedServer?.id}`);
        const cfgData = await res.json(); setConfigs(Array.isArray(cfgData) ? cfgData : []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };

    const handleSave = async (metric: string, value: number, severity: string) => {
      try {
        await api(`/api/servers/${selectedServer?.id}/thresholds`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thresholds: [{ metric, warning: value, critical: value + 10 }] }) // Adjusting to backend format
        });
        fetchConfigs();
      } catch (e) { alert('Failed to save threshold'); }
    };

    const metrics = [
      { id: 'cpu', label: 'CPU Usage', unit: '%' },
      { id: 'memory', label: 'Memory Usage', unit: '%' },
      { id: 'disk', label: 'Disk Usage', unit: '%' }
    ];

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="p-6 rounded-2xl bg-orange-500/5 border border-orange-500/10">
            <h3 className="text-xs font-black uppercase tracking-widest text-orange-500 mb-2">Reactive Guardrails</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Define limits that trigger autonomous incidents and remediation skills.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {metrics.map(m => {
            const config = (configs || []).find(c => c.metric === m.id) || { value: 80, severity: 'high' };
            return (
              <div key={m.id} className="p-6 rounded-2xl bg-black/40 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">{m.label}</span>
                  <span className="text-xl font-black text-white">{config.value}{m.unit}</span>
                </div>
                <input 
                    type="range" 
                    min="10" 
                    max="95" 
                    value={config.value} 
                    onChange={(e) => handleSave(m.id, parseInt(e.target.value), config.severity)}
                    className="w-full accent-orange-500" 
                />
                <div className="flex justify-between items-center pt-2">
                  <select 
                    value={config.severity} 
                    onChange={(e) => handleSave(m.id, config.value, e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[8px] font-black uppercase text-slate-400 outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <span className="text-[8px] font-black uppercase text-slate-600 tracking-widest">Auto-Alert Enabled</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const ServerConfigTab = ({ selectedServer }: { selectedServer: ManagedServer | null }) => {
    const [configUser, setConfigUser] = useState(selectedServer?.username || '');
    const [configPass, setConfigPass] = useState('');
    const [configPort, setConfigPort] = useState('22');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState<string | null>(null);
    const [thresholds, setThresholds] = useState<Record<string, {warning: number; critical: number}>>({
      cpu: { warning: 70, critical: 90 },
      memory: { warning: 75, critical: 85 },
      disk: { warning: 80, critical: 95 }
    });

    useEffect(() => {
      if (!selectedServer) return;
      // Load existing thresholds
      api(`/api/servers/${selectedServer.id}/thresholds`).then(r => r.json()).then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const t: any = {};
          for (const item of data) {
            t[item.metric] = { warning: item.warning, critical: item.critical };
          }
          if (t.cpu || t.memory || t.disk) setThresholds(prev => ({...prev, ...t}));
        }
      }).catch(() => {});
    }, [selectedServer?.id]);

    const handleSave = async () => {
      if (!selectedServer) return;
      setSaving(true);
      setSaved(null);
      try {
        const res = await api(`/api/servers/${selectedServer.id}/config`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            port: parseInt(configPort) || 22,
            username: configUser || undefined,
            password: configPass || undefined,
            thresholds: Object.entries(thresholds).map(([metric, vals]) => ({
              metric, warning: vals.warning, critical: vals.critical
            }))
          })
        });
        const data = await res.json();
        setSaved(data.message || 'Configuration saved');
        setTimeout(() => setSaved(null), 3000);
      } catch (e: any) {
        setSaved('Error: ' + e.message);
      }
      setSaving(false);
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        {/* SSH Configuration */}
        <div className="p-6 rounded-2xl bg-black/40 border border-white/5 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Terminal size={16} className="text-orange-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white">SSH Connection</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Username</label>
              <input type="text" value={configUser} onChange={e => setConfigUser(e.target.value)} placeholder={selectedServer?.username || 'ubuntu'} className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-orange-500" /></div>
            <div><label className="text-[9px] font-black uppercase text-orange-500 block mb-1">Port</label>
              <input type="text" value={configPort} onChange={e => setConfigPort(e.target.value)} placeholder="22" className="w-full bg-black/60 border border-orange-500/30 rounded-lg px-3 py-2 text-xs text-orange-400 outline-none focus:border-orange-500 text-center" /></div>
          </div>
          <div><label className="text-[9px] font-black uppercase text-slate-500 block mb-1">New Password</label>
            <input type="password" value={configPass} onChange={e => setConfigPass(e.target.value)} placeholder="Leave empty to keep current" className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-orange-500" /></div>
        </div>

        {/* Thresholds */}
        <div className="p-6 rounded-2xl bg-black/40 border border-white/5 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Sliders size={16} className="text-orange-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Remediation Thresholds</h3>
          </div>
          {['cpu', 'memory', 'disk'].map(m => {
            const t = thresholds[m] || { warning: 70, critical: 90 };
            return (
              <div key={m} className="p-4 rounded-xl bg-white/5">
                <p className="text-[9px] font-black uppercase text-slate-400 mb-3">{m.toUpperCase()}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[8px] text-slate-500 uppercase font-black">Warning %</label>
                    <input type="range" min="10" max="95" value={t.warning} onChange={e => setThresholds({...thresholds, [m]: {...t, warning: parseInt(e.target.value)}})} className="w-full accent-orange-500" />
                    <span className="text-[10px] font-black text-orange-500">{t.warning}%</span></div>
                  <div><label className="text-[8px] text-slate-500 uppercase font-black">Critical %</label>
                    <input type="range" min="20" max="100" value={t.critical} onChange={e => setThresholds({...thresholds, [m]: {...t, critical: parseInt(e.target.value)}})} className="w-full accent-rose-500" />
                    <span className="text-[10px] font-black text-rose-500">{t.critical}%</span></div>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={handleSave} disabled={saving || !selectedServer}
          className="w-full py-3 bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all disabled:opacity-30">
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        {saved && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">{saved}</div>}
      </div>
    );
  };

  const ServerSummaryTab = () => {
    const [prompt, setPrompt] = useState('');
    const [running, setRunning] = useState(false);
    const [neuralResult, setNeuralResult] = useState<any>(() => _neuralResultCache);

    const handleRunNeural = async () => {
      if (!prompt || !selectedServer) return;
      setRunning(true);
      setNeuralResult(null);
      try {
        const res = await api('/api/neural/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, serverId: selectedServer.id })
        });
        const data = await res.json();
        setNeuralResult(data); _neuralResultCache = data;
      } catch (e: any) {
        const errResult = { success: false, error: e.message, explanation: 'Failed to execute' }; setNeuralResult(errResult); _neuralResultCache = errResult;
      }
      setRunning(false);
    };

    const getExamplePrompts = () => [
      'What is the largest file on the system?',
      'Show disk usage for all mounts',
      'Check for failed SSH login attempts',
      'Show top 5 memory-consuming processes',
      'Check if any services need restarting',
    ];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'CPU', value: selectedServer?.cpu ? Number(selectedServer.cpu).toFixed(1) + '%' : '0%', icon: Cpu }, 
              { label: 'RAM', value: selectedServer?.memory ? Number(selectedServer.memory).toFixed(1) + '%' : '0%', icon: Database }, 
              { label: 'Disk', value: selectedServer?.disk ? Math.round(selectedServer.disk) + '%' : '0%', icon: HardDrive }, 
              { label: 'Uptime', value: selectedServer?.uptime ? Math.floor(selectedServer.uptime / 86400) + 'd' : 'N/A', icon: Activity }
            ].map(m => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="p-4 rounded-2xl bg-black/40 border border-white/5">
                  <div className="flex items-center gap-2 mb-2 text-slate-500">
                    <Icon size={12} />
                    <span className="text-[9px] font-black uppercase">{m.label}</span>
                  </div>
                  <p className="text-xl font-black text-white">{m.value}</p>
                </div>
              );
            })}
          </div>
          
          {/* Neural Engine Section */}
          <div className="p-6 rounded-2xl bg-orange-500/5 border border-orange-500/10 transition-all">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={16} className="text-orange-500" />
              <h3 className="text-[10px] font-black uppercase text-orange-500">Neural Engine</h3>
            </div>
            <p className="text-[9px] text-slate-500 mb-4">Ask in natural language. ARES will generate the command, execute it via SSH, and explain the result.</p>
            
            {/* Example prompts */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {getExamplePrompts().map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(ex)}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] text-slate-400 hover:text-white transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input 
                type="text" 
                value={prompt} 
                onChange={e => setPrompt(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleRunNeural()}
                placeholder="e.g. Find the largest file, check disk health, restart a service..." 
                className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-orange-500 text-white" 
              />
              <button 
                onClick={handleRunNeural} 
                disabled={running || !prompt} 
                className="px-6 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black text-[10px] font-black uppercase rounded-xl transition-colors flex items-center justify-center min-w-[80px]"
              >
                {running ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full" /> : 'Run'}
              </button>
            </div>

            {/* Results - persistent */}
            {neuralResult && (
              <div className="mt-4 p-4 rounded-xl bg-black/40 border border-orange-500/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-black uppercase text-orange-400">Last Response</span>
                  <button onClick={() => { setNeuralResult(null); _neuralResultCache = null; }} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[8px] text-slate-500 hover:text-white transition-colors">Clear</button>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {/* AI Explanation */}
                {neuralResult.explanation && (
                  <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/10">
                    <p className="text-[9px] font-black uppercase text-sky-400 mb-2">AI Analysis</p>
                    <p className="text-[11px] text-sky-200 leading-relaxed">{neuralResult.explanation}</p>
                    {neuralResult.confidence && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-orange-500" 
                            style={{ width: `${Math.round(neuralResult.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono">{Math.round(neuralResult.confidence * 100)}%</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Generated Command */}
                {neuralResult.command && (
                  <div className="p-4 rounded-xl bg-black/60 border border-white/10">
                    <p className="text-[9px] font-black uppercase text-orange-400 mb-2">Generated Command</p>
                    <pre className="text-[11px] font-mono text-green-400 whitespace-pre-wrap break-all">{neuralResult.command}</pre>
                  </div>
                )}

                {/* Execution Output */}
                {neuralResult.output && (
                  <div className="p-4 rounded-xl bg-black/60 border border-white/10">
                    <p className="text-[9px] font-black uppercase text-emerald-400 mb-2">Output</p>
                    <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap break-all max-h-60 overflow-y-auto">{neuralResult.output}</pre>
                  </div>
                )}

                {/* Error output */}
                {neuralResult.error && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <p className="text-[9px] font-black uppercase text-rose-400 mb-2">Error Output</p>
                    <pre className="text-[11px] font-mono text-rose-300 whitespace-pre-wrap break-all">{neuralResult.error}</pre>
                  </div>
                )}
                </div>
                {/* Risks */}
                {neuralResult.risks && neuralResult.risks.length > 0 && (
                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <p className="text-[9px] font-black uppercase text-amber-400 mb-2">⚠ Risks</p>
                    <ul className="list-disc list-inside">
                      {neuralResult.risks.map((r: string, i: number) => (
                        <li key={i} className="text-[10px] text-amber-300">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Exit code */}
                {neuralResult.exitCode !== undefined && (
                  <div className="flex items-center gap-2 text-[9px] font-mono">
                    <span className={neuralResult.exitCode === 0 ? 'text-emerald-500' : 'text-rose-500'}>
                      Exit code: {neuralResult.exitCode}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-black/40 border border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <History size={14} className="text-slate-500" />
              <h3 className="text-[10px] font-black uppercase text-slate-500">ContextP Insights</h3>
            </div>
            <div className="space-y-4">
              {[{ t: 'FIX', d: '2h', i: 'SSH' }, { t: 'AUD', d: '5h', i: 'Root' }].map((i, x) => (
                <div key={x} className="flex gap-3 text-[10px]">
                  <div className="w-1 h-1 rounded-full bg-orange-500 mt-1" />
                  <div>
                    <p className="font-black text-slate-300 uppercase">{i.i}</p>
                    <p className="text-[8px] text-slate-600 uppercase">{i.t} • {i.d}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setActiveTab('contextp')} className="w-full mt-6 py-2 border border-white/5 hover:border-white/20 rounded-xl text-[9px] font-black uppercase text-slate-500 transition-colors">Explore Memory</button>
          </div>
        </div>
      </div>
    );
  };

  const TerminalTab = () => {
    const [command, setCommand] = useState('');
    const [history, setHistory] = useState<{cmd: string, out: string, err: boolean}[]>([]);
    const [executing, setExecuting] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    const handleExec = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!command.trim() || !selectedServer) return;
      
      const currentCmd = command;
      setCommand('');
      setExecuting(true);
      
      try {
        const res = await api(`/api/servers/${selectedServer.id}/exec`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: currentCmd })
        });
        const data = await res.json();
        setHistory(prev => [...prev, { cmd: currentCmd, out: data.output || data.error, err: !!data.error }]);
      } catch (err: any) {
        setHistory(prev => [...prev, { cmd: currentCmd, out: err.message, err: true }]);
      }
      setExecuting(false);
    };

    useEffect(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    return (
      <div className="flex flex-col h-[500px] bg-black/80 border border-white/5 rounded-2xl overflow-hidden font-mono text-xs">
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
          <div className="text-emerald-500/50 mb-4">
            Connected to {selectedServer?.name} ({selectedServer?.ip})<br/>
            Saturn Web Terminal v1.0.0
          </div>
          {history.map((h, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-orange-500">saturn@{selectedServer?.name}:~$</span>
                <span>{h.cmd}</span>
              </div>
              <pre className={cn("whitespace-pre-wrap break-words leading-relaxed", h.err ? "text-rose-400" : "text-slate-300")}>{h.out}</pre>
            </div>
          ))}
          {executing && (
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-orange-500">saturn@{selectedServer?.name}:~$</span>
              <span className="animate-pulse">_</span>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <form onSubmit={handleExec} className="p-4 bg-white/5 border-t border-white/5 flex gap-3">
          <span className="text-orange-500 pt-3">saturn@{selectedServer?.name}:~$</span>
          <input 
            type="text" 
            value={command}
            onChange={e => setCommand(e.target.value)}
            disabled={executing}
            placeholder="Enter command..."
            className="flex-1 bg-transparent outline-none text-slate-300 pt-3 pb-3"
            autoFocus
          />
        </form>
      </div>
    );
  };

  const ProcessesTab = ({ loadingTab, tabData, selectedServer, handleRefreshServer }: any) => {
    if (loadingTab) return <div className="p-12 text-center text-slate-500 italic uppercase text-[10px] font-black tracking-widest flex flex-col items-center gap-4"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-slate-700 border-t-orange-500 rounded-full" /> Fetching processes...</div>;
    if (!tabData) return null;
    const dataArray = Array.isArray(tabData.data) ? tabData.data : [];
    if (dataArray.length === 0) return <div className="p-12 text-center text-slate-500 italic uppercase text-[10px] font-black tracking-widest">No processes available</div>;

    const handleAction = async (pid: string, action: string, extraParams: any = {}) => {
      try {
        await api(`/api/admin/servers/${selectedServer!.id}/tab/processes/${action}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pid, ...extraParams })
        });
        handleRefreshServer(true);
      } catch (e) {
        alert(`Error executing ${action}`);
      }
    };

    return (
      <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-[9px] font-black uppercase text-slate-500 tracking-widest">
              <th className="p-4">PID</th>
              <th className="p-4">User</th>
              <th className="p-4">Name</th>
              <th className="p-4">CPU %</th>
              <th className="p-4">Memory</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {((dataArray || [])).map((row: any, i: number) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5 text-[10px] text-slate-300 font-mono transition-colors">
                <td className="p-4">{row.pid}</td>
                <td className="p-4">{row.user}</td>
                <td className="p-4 truncate max-w-[150px] font-bold text-white">{row.name}</td>
                <td className="p-4 text-orange-400">{row.cpu}</td>
                <td className="p-4">{row.mem}</td>
                <td className="p-4">{row.state}</td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => handleAction(row.pid, 'renice', { priority: -10 })} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-md text-[9px] uppercase">Prioritize</button>
                  <button onClick={() => handleAction(row.pid, 'kill', { signal: 'SIGTERM' })} className="px-2 py-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-md text-[9px] uppercase">Kill</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const NetworkTab = ({ loadingTab, tabData, selectedServer, handleRefreshServer }: any) => {
    if (loadingTab) return <div className="p-12 text-center text-slate-500 italic uppercase text-[10px] font-black tracking-widest flex flex-col items-center gap-4"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-slate-700 border-t-orange-500 rounded-full" /> Fetching network...</div>;
    if (!tabData) return null;
    const dataArray = Array.isArray(tabData.data) ? tabData.data : [];
    if (dataArray.length === 0) return <div className="p-12 text-center text-slate-500 italic uppercase text-[10px] font-black tracking-widest">No network data</div>;

    const handleAction = async (iface: string, action: string, extraParams: any = {}) => {
      try {
        await api(`/api/admin/servers/${selectedServer!.id}/tab/network/${action}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ iface, ...extraParams })
        });
        handleRefreshServer(true);
      } catch (e) {
        alert(`Error executing ${action}`);
      }
    };

    return (
      <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-[9px] font-black uppercase text-slate-500 tracking-widest">
              <th className="p-4">Interface</th>
              <th className="p-4">Status</th>
              <th className="p-4">IP / Mask</th>
              <th className="p-4">MAC Address</th>
              <th className="p-4">Gateway</th>
              <th className="p-4">DNS</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {((dataArray || [])).map((row: any, i: number) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5 text-[10px] text-slate-300 font-mono transition-colors">
                <td className="p-4 font-bold text-white">{row.iface}</td>
                <td className="p-4">
                  <span className={cn("px-2 py-1 rounded-full text-[8px] uppercase font-black", row.status?.toLowerCase() === 'up' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                    {row.status}
                  </span>
                </td>
                <td className="p-4 text-white">
                  {row.ip || 'N/A'}<br/>
                  <span className="text-slate-500 text-[8px]">CIDR: {row.mask || '0'}</span>
                </td>
                <td className="p-4 text-slate-400">{row.mac || 'N/A'}</td>
                <td className="p-4 text-slate-400">{row.gateway || 'N/A'}</td>
                <td className="p-4 text-slate-400 truncate max-w-[120px]" title={row.dns}>{row.dns || 'N/A'}</td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => {
                    const newIp = prompt("Enter new IP address:");
                    if(newIp) handleAction(row.iface, 'configure', { ip: newIp, dhcp: false });
                  }} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-md text-[9px] uppercase">Set IP</button>
                  <button onClick={() => handleAction(row.iface, 'configure', { dhcp: true })} className="px-2 py-1 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 rounded-md text-[9px] uppercase">DHCP</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const FirewallTab = ({ loadingTab, tabData, selectedServer, handleRefreshServer }: any) => {
    if (loadingTab) return <div className="p-12 text-center text-slate-500 italic uppercase text-[10px] font-black tracking-widest flex flex-col items-center gap-4"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-slate-700 border-t-orange-500 rounded-full" /> Fetching firewall...</div>;
    if (!tabData) return null;
    const dataArray = Array.isArray(tabData.data) ? tabData.data : [];

    const handleAction = async (action: string, extraParams: any = {}) => {
      try {
        await api(`/api/admin/servers/${selectedServer!.id}/tab/firewall/${action}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(extraParams)
        });
        handleRefreshServer(true);
      } catch (e) {
        alert(`Error executing ${action}`);
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <button onClick={() => {
            const port = prompt("Enter port number to ALLOW (e.g. 8080):");
            if(port) handleAction('add', { port, protocol: 'tcp', action: 'ACCEPT' });
          }} className="px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-xl text-[10px] font-black uppercase transition-colors">+ Open Port</button>
        </div>
        <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden overflow-x-auto">
          {dataArray.length === 0 ? <div className="p-12 text-center text-slate-500 italic uppercase text-[10px] font-black tracking-widest">No firewall rules</div> : (
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-[9px] font-black uppercase text-slate-500 tracking-widest">
                <th className="p-4">ID</th>
                <th className="p-4">Name/Chain</th>
                <th className="p-4">Direction</th>
                <th className="p-4">Action</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {((dataArray || [])).map((row: any, i: number) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 text-[10px] text-slate-300 font-mono transition-colors">
                  <td className="p-4 text-slate-500">{row.id}</td>
                  <td className="p-4 font-bold text-white">{row.name}</td>
                  <td className="p-4">{row.direction}</td>
                  <td className="p-4">
                    <span className={cn("px-2 py-1 rounded-full text-[8px] uppercase font-black", (row.action === 'ACCEPT' || row.action === 'Allow') ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                      {row.action}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => {
                      if(confirm(`Delete rule ${row.id}?`)) handleAction('delete', { ruleId: row.id });
                    }} className="px-2 py-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-md text-[9px] uppercase">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>
    );
  };

  const TasksTab = ({ loadingTab, tabData, selectedServer, handleRefreshServer }: any) => {
    if (loadingTab) return <div className="p-12 text-center text-slate-500 italic uppercase text-[10px] font-black tracking-widest flex flex-col items-center gap-4"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-slate-700 border-t-orange-500 rounded-full" /> Fetching tasks...</div>;
    if (!tabData) return null;
    const dataArray = Array.isArray(tabData.data) ? tabData.data : [];

    const handleAction = async (action: string, extraParams: any = {}) => {
      try {
        await api(`/api/admin/servers/${selectedServer!.id}/tab/tasks/${action}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(extraParams)
        });
        handleRefreshServer(true);
      } catch (e) {
        alert(`Error executing ${action}`);
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <button onClick={() => {
            const command = prompt("Enter command to schedule:");
            const schedule = prompt("Enter cron schedule (e.g. '0 * * * *'):");
            if(command && schedule) handleAction('create', { command, schedule });
          }} className="px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-xl text-[10px] font-black uppercase transition-colors">+ New Task</button>
        </div>
        <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden overflow-x-auto">
          {dataArray.length === 0 ? <div className="p-12 text-center text-slate-500 italic uppercase text-[10px] font-black tracking-widest">No scheduled tasks</div> : (
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-[9px] font-black uppercase text-slate-500 tracking-widest">
                <th className="p-4">Name</th>
                <th className="p-4">Schedule</th>
                <th className="p-4">Command</th>
                <th className="p-4">State</th>
                <th className="p-4">Shebang</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {((dataArray || [])).map((row: any, i: number) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 text-[10px] text-slate-300 font-mono transition-colors">
                  <td className="p-4 font-bold text-white">{row.name}</td>
                  <td className="p-4 text-orange-400">{row.schedule}</td>
                  <td className="p-4 truncate max-w-[200px]">{row.command}</td>
                  <td className="p-4">{row.state}</td>
                  <td className="p-4 text-slate-500">{row.script?.shebang ? <span>{row.script.shebang}</span> : <span>—</span>}</td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => {
                      if(confirm(`Delete task ${row.id}?`)) handleAction('delete', { taskId: row.id });
                    }} className="px-2 py-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-md text-[9px] uppercase">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>
    );
  };

  const UsersTab = ({ loadingTab, tabData, selectedServer, handleRefreshServer }: any) => {
    if (loadingTab) return <div className="p-12 text-center text-slate-500 italic uppercase text-[10px] font-black tracking-widest flex flex-col items-center gap-4"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-slate-700 border-t-orange-500 rounded-full" /> Fetching users...</div>;
    if (!tabData) return null;
    const dataArray = Array.isArray(tabData.data) ? tabData.data : [];

    const handleAction = async (username: string, action: string, extraParams: any = {}) => {
      try {
        await api(`/api/admin/servers/${selectedServer!.id}/tab/users/${action}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, ...extraParams })
        });
        handleRefreshServer(true);
      } catch (e) {
        alert(`Error executing ${action}`);
      }
    };

    return (
      <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-[9px] font-black uppercase text-slate-500 tracking-widest">
              <th className="p-4">Username</th>
              <th className="p-4">UID/GID</th>
              <th className="p-4">Home</th>
              <th className="p-4">Shell</th>
              <th className="p-4">Last Login</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {((dataArray || [])).map((row: any, i: number) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5 text-[10px] text-slate-300 font-mono transition-colors">
                <td className="p-4 font-bold text-white">{row.username}</td>
                <td className="p-4">{row.uid}/{row.gid}</td>
                <td className="p-4">{row.home || '/home/' + row.username}</td>
                <td className="p-4">{row.shell}</td>
                <td className="p-4 text-slate-500">{row.lastLogin || 'Never'}</td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => {
                    const newPass = prompt(`Enter new password for ${row.username}:`);
                    if(newPass) handleAction(row.username, 'password', { password: newPass });
                  }} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-md text-[9px] uppercase">Pass</button>
                  <button onClick={() => handleAction(row.username, 'lock', { locked: true })} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-md text-[9px] uppercase">Lock</button>
                  <button onClick={() => { if(confirm(`Delete user ${row.username}?`)) handleAction(row.username, 'delete'); }} className="px-2 py-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-md text-[9px] uppercase">Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const PackagesTab = ({ loadingTab, tabData, selectedServer, handleRefreshServer }: any) => {
    if (loadingTab) return <div className="p-12 text-center text-slate-500 italic uppercase text-[10px] font-black tracking-widest flex flex-col items-center gap-4"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-slate-700 border-t-orange-500 rounded-full" /> Fetching packages...</div>;
    if (!tabData) return null;
    const dataArray = Array.isArray(tabData.data) ? tabData.data : [];

    const handleAction = async (action: string, extraParams: any = {}) => {
      try {
        await api(`/api/admin/servers/${selectedServer!.id}/tab/packages/${action}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(extraParams)
        });
        handleRefreshServer(true);
      } catch (e) {
        alert(`Error executing ${action}`);
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <button onClick={() => {
            const pkg = prompt("Enter package name to install:");
            if(pkg) handleAction('install', { packages: [pkg] });
          }} className="px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-xl text-[10px] font-black uppercase transition-colors">+ Install Package</button>
        </div>
        <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-[9px] font-black uppercase text-slate-500 tracking-widest">
                <th className="p-4">Package Name</th>
                <th className="p-4">Version</th>
                <th className="p-4">Architecture</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {((dataArray || [])).map((row: any, i: number) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 text-[10px] text-slate-300 font-mono transition-colors">
                  <td className="p-4 font-bold text-white">{row.name}</td>
                  <td className="p-4 text-orange-400">{row.version}</td>
                  <td className="p-4 text-slate-500">{row.arch || 'x64'}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => { if(confirm(`Remove ${row.name}?`)) handleAction('remove', { packages: [row.name] }); }} className="px-2 py-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-md text-[9px] uppercase">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const WebserverTab = ({ loadingTab, tabData, selectedServer, handleRefreshServer }: any) => {
    if (loadingTab) return <div className="p-12 text-center text-slate-500 italic uppercase text-[10px] font-black tracking-widest flex flex-col items-center gap-4"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-slate-700 border-t-orange-500 rounded-full" /> Fetching vhosts...</div>;
    if (!tabData) return null;
    const dataArray = Array.isArray(tabData.data) ? tabData.data : [];

    return (
      <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-[9px] font-black uppercase text-slate-500 tracking-widest">
              <th className="p-4">Domain / Site</th>
              <th className="p-4">Root Path</th>
              <th className="p-4">State</th>
              <th className="p-4">Type</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {((dataArray || [])).map((row: any, i: number) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5 text-[10px] text-slate-300 font-mono transition-colors">
                <td className="p-4 font-bold text-white">{row.domain}</td>
                <td className="p-4 truncate max-w-[200px]">{row.root}</td>
                <td className="p-4">
                  <span className={cn("px-2 py-1 rounded-full text-[8px] uppercase font-black", row.state === 'Enabled' || row.state === 'running' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                    {row.state}
                  </span>
                </td>
                <td className="p-4 text-slate-500">{row.type || 'Nginx'}</td>
                <td className="p-4 text-right space-x-2">
                  <button className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-md text-[9px] uppercase">Edit</button>
                  <button className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-md text-[9px] uppercase">Logs</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const HealthTab = ({ loadingTab, tabData, selectedServer, handleRefreshServer }: any) => {
    if (loadingTab) return <div className="p-12 text-center text-slate-500 italic uppercase text-[10px] font-black tracking-widest flex flex-col items-center gap-4"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-slate-700 border-t-orange-500 rounded-full" /> Analyzing health...</div>;
    if (!tabData) return null;
    const dataArray = Array.isArray(tabData.data) ? tabData.data : [];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {((dataArray || [])).map((row: any, i: number) => (
          <div key={i} className="p-6 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-xl text-orange-500"><HardDrive size={20} /></div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-black">{row.name || row.device || 'Disk Unit'}</h3>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest">{row.type || 'Physical'} • {row.size || 'Unknown Size'}</p>
                </div>
              </div>
              <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", row.health === 'PASSED' || row.health === 'Healthy' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                {row.health || 'STATUS OK'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
              <div className="p-2 bg-white/5 rounded-lg flex justify-between"><span>Temp:</span> <span className="text-white">{row.temp || '32C'}</span></div>
              <div className={cn("p-2 bg-white/5 rounded-lg flex justify-between", row.realloc > 0 ? "text-rose-400" : "")}><span>Realloc:</span> <span className="text-white">{row.realloc || 0}</span></div>
              <div className="p-2 bg-white/5 rounded-lg flex justify-between"><span>Power On:</span> <span className="text-white">{row.powerOn || 'N/A'}</span></div>
              <div className="p-2 bg-white/5 rounded-lg flex justify-between"><span>Cycles:</span> <span className="text-white">{row.cycles || 'N/A'}</span></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const ProactiveView = () => {
    const [showNewTaskModal, setShowNewTaskModal] = useState(false);
    const [newTaskForm, setNewTaskForm] = useState({ name: '', skillId: '', condition: 'cpu > 90', schedule: '5m', targetType: 'all', targets: [] as string[], enabled: true });
    const [savingTask, setSavingTask] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(false);

    useEffect(() => {
      fetchTasks();
    }, []);

    const fetchTasks = async () => {
      setLoadingTasks(true);
      try {
        const res = await api('/api/proactive');
        const data = await res.json();
        setProactiveActivities(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      }
      setLoadingTasks(false);
    };

    const handleSaveTask = async () => {
      if (!newTaskForm.name || !newTaskForm.skillId) return;
      setSavingTask(true);
      try {
        await api('/api/proactive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTaskForm)
        });
        await fetchTasks();
        setShowNewTaskModal(false);
        setNewTaskForm({ name: '', skillId: '', condition: 'cpu > 90', schedule: '5m', targetType: 'all', targets: [], enabled: true });
      } catch (e) {
        console.error(e);
      }
      setSavingTask(false);
    };

    const handleToggleTask = async (task: any) => {
      try {
        await api(`/api/proactive/${task.id}/toggle`, { method: 'PATCH' });
        fetchTasks();
      } catch (e) {
        console.error(e);
      }
    };

    const handleDeleteTask = async (id: string) => {
      if (!confirm('Delete this proactive task?')) return;
      try {
        await api(`/api/proactive/${id}`, { method: 'DELETE' });
        fetchTasks();
      } catch (e) {
        console.error(e);
      }
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="text-orange-500" size={20} />
            <h2 className="text-sm font-black uppercase tracking-[0.2em]">Autonomous Proactive Engine</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewTaskModal(true)} className="px-4 py-2 bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all flex items-center gap-2">
              <Plus size={14} /> New Task
            </button>
            <button onClick={() => window.open('/api/proactive/history', '_blank')} className="px-4 py-2 bg-black/60 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:border-white/20 transition-all flex items-center gap-2">
              <History size={14} /> History
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {loadingTasks && (proactiveActivities || []).length === 0 ? (
            <div className="p-12 text-center"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-slate-700 border-t-orange-500 rounded-full mx-auto" /></div>
          ) : (proactiveActivities || []).length === 0 ? (
            <div className="p-12 border border-dashed border-white/10 rounded-2xl text-center">
              <Activity size={32} className="text-slate-600 mx-auto mb-4" />
              <p className="text-xs font-black uppercase text-slate-500 tracking-widest">No proactive tasks defined</p>
            </div>
          ) : (
            (proactiveActivities || []).map((a: any) => (
              <div key={a.id} className="p-6 rounded-2xl bg-black/40 border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-orange-500/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                    <Activity size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-white mb-1">{a.name}</p>
                    <div className="flex items-center gap-3 text-[9px] font-medium text-slate-500 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><TerminalSquare size={10} className="text-sky-500" /> IF {a.condition}</span>
                      <span className="flex items-center gap-1"><History size={10} className="text-amber-500" /> SCHEDULE: {a.schedule}</span>
                      <span className="flex items-center gap-1"><Server size={10} className="text-emerald-500" /> TARGET: {a.targetType.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="hidden md:block text-right">
                    <p className="text-[9px] font-black uppercase text-slate-600 mb-1">Assigned Skill</p>
                    <p className="text-[10px] font-mono text-slate-400">{(skills || []).find((s: any) => s.id === a.skillId)?.name || a.skillId}</p>
                  </div>
                  <div className="h-8 w-px bg-white/10 mx-2 hidden md:block" />
                  <button onClick={() => handleToggleTask(a)} className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all w-full md:w-auto",
                    a.enabled ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20" : "bg-white/5 text-slate-600 border border-white/10 hover:bg-white/10"
                  )}>
                    {a.enabled ? 'Enabled' : 'Paused'}
                  </button>
                  <button onClick={() => handleDeleteTask(a.id)} className="p-2 text-slate-600 hover:text-rose-500 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <AnimatePresence>
          {showNewTaskModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowNewTaskModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl">
                <h3 className="text-sm font-black uppercase tracking-widest mb-6 text-white flex items-center gap-2"><Zap className="text-orange-500" size={18}/> New Proactive Task</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Task Name</label>
                    <input type="text" value={newTaskForm.name} onChange={e => setNewTaskForm({...newTaskForm, name: e.target.value})} placeholder="e.g. Cache Auto-Clear" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Assigned Skill</label>
                    <select value={newTaskForm.skillId} onChange={e => setNewTaskForm({...newTaskForm, skillId: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none">
                      <option value="">-- Select Skill --</option>
                      {(skills || []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Condition</label>
                      <input type="text" value={newTaskForm.condition} onChange={e => setNewTaskForm({...newTaskForm, condition: e.target.value})} placeholder="e.g. cpu > 90" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Schedule</label>
                      <input type="text" value={newTaskForm.schedule} onChange={e => setNewTaskForm({...newTaskForm, schedule: e.target.value})} placeholder="e.g. 5m" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-8">
                    <button onClick={() => setShowNewTaskModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors">Cancel</button>
                    <button onClick={handleSaveTask} disabled={savingTask || !newTaskForm.name || !newTaskForm.skillId} className="flex-1 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2">
                      {savingTask ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full" /> : <><Plus size={14}/> Create</>}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };


  const CredentialsView = () => {
    const [showImportModal, setShowImportModal] = useState(false);
    const [importForm, setImportForm] = useState({ name: '', provider: 'aws', type: 'access_key', accessKey: '', secretKey: '' });
    const [savingCred, setSavingCred] = useState(false);
    const [loadingCreds, setLoadingCreds] = useState(false);
    const [scanningId, setScanningId] = useState<string | null>(null);
    const [discoveredInstances, setDiscoveredInstances] = useState<any[]>([]);

    useEffect(() => {
      fetchCreds();
    }, []);

    const fetchCreds = async () => {
      setLoadingCreds(true);
      try {
        const res = await api('/api/credentials');
        const data = await res.json();
        setCloudCreds(data);
      } catch (e) {
        console.error(e);
      }
      setLoadingCreds(false);
    };

    const handleScan = async (id: string) => {
      setScanningId(id);
      setDiscoveredInstances([]);
      try {
        const res = await api('/api/cloud/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credId: id })
        });
        const data = await res.json();
        if (data.success) {
          setDiscoveredInstances(data.instances || []);
          api('/api/servers').then(r => r.json()).then(d => setServers(Array.isArray(d) ? d : [])).catch(() => {});
        } else {
          alert(`Scan failed: ${data.error}`);
        }
      } catch (e: any) {
        alert(`Network Error: ${e.message}`);
      } finally {
        setScanningId(null);
      }
    };

    const handleImportCred = async () => {
      if (!importForm.name || !importForm.accessKey || !importForm.secretKey) return;
      setSavingCred(true);
      try {
        await api('/api/credentials/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: importForm.name,
            provider: importForm.provider,
            type: importForm.type,
            content: JSON.stringify({ accessKey: importForm.accessKey, secretKey: importForm.secretKey })
          })
        });
        await fetchCreds();
        setShowImportModal(false);
        setImportForm({ name: '', provider: 'aws', type: 'access_key', accessKey: '', secretKey: '' });
      } catch (e) {
        console.error(e);
      }
      setSavingCred(false);
    };

    const handleDeleteCred = async (id: string) => {
      if (!confirm('Delete this credential?')) return;
      try {
        await api(`/api/credentials/${id}`, { method: 'DELETE' });
        fetchCreds();
      } catch (e) {
        console.error(e);
      }
    };

    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                <Key size={24} />
            </div>
            <div>
                <h2 className="text-xl font-black text-white uppercase tracking-widest">Identity Vault</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Multi-Cloud Credential Management</p>
            </div>
          </div>
          <button onClick={() => setShowImportModal(true)} className="px-6 py-3 bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.3)]">
            <Plus size={14} /> Import Credential
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {loadingCreds && (cloudCreds || []).length === 0 ? (
            <div className="p-12 text-center col-span-full flex flex-col items-center gap-4">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-10 h-10 border-4 border-slate-700 border-t-orange-500 rounded-full" />
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Decrypting Vault...</p>
            </div>
          ) : (cloudCreds || []).length === 0 ? (
            <div className="p-16 border-2 border-dashed border-white/5 rounded-[2.5rem] text-center col-span-full flex flex-col items-center gap-4">
              <Key size={48} className="text-slate-800" />
              <div>
                  <p className="text-xs font-black uppercase text-slate-500 tracking-widest">No credentials stored</p>
                  <p className="text-[9px] text-slate-600 uppercase mt-2">Connect your Cloud Accounts to begin automated discovery</p>
              </div>
            </div>
          ) : (
            (cloudCreds || []).map((c: any) => (
              <CredentialCard 
                key={c.id} 
                cred={c} 
                onDelete={handleDeleteCred} 
                onScan={handleScan}
                scanning={scanningId === c.id}
              />
            ))
          )}
        </div>

        <AnimatePresence>
          {(discoveredInstances || []).length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-6 pt-12 border-t border-white/5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Activity className="text-emerald-500" size={20} />
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Discovery Results ({(discoveredInstances || []).length} nodes)</h3>
                </div>
                <button onClick={() => setDiscoveredInstances([])} className="text-[10px] font-black uppercase text-slate-500 hover:text-white">Clear Results</button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(discoveredInstances || []).map((inst, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-emerald-500/20 flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-start">
                        <div className="text-[10px] font-mono text-emerald-400 font-bold">{inst.id}</div>
                        <CheckCircle2 size={12} className="text-emerald-500" />
                    </div>
                    <div>
                        <div className="text-xs font-black text-white uppercase truncate">{inst.name}</div>
                        <div className="text-[9px] text-slate-500 font-mono mt-1">{inst.ip} • {inst.os}</div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center">
                        <span className="text-[8px] uppercase font-black px-2 py-0.5 rounded bg-white/5 text-slate-400">{inst.provider}</span>
                        <span className="text-[8px] font-mono text-slate-600">{inst.region || inst.location || inst.zone}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-4">
                <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-500">
                    <Zap size={16} />
                </div>
                <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">
                    Discovered nodes have been added to the registry in 'Pending' status. Deploy Saturn Agent to begin monitoring.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showImportModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowImportModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-500">
                        <Key size={20} />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-[0.2em] text-white">Import Credential</h3>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Friendly Name (Alias)</label>
                    <input type="text" value={importForm.name} onChange={e => setImportForm({...importForm, name: e.target.value})} placeholder="e.g. AWS Production Hub" className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:border-orange-500 outline-none transition-all" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Cloud Provider</label>
                      <select value={importForm.provider} onChange={e => setImportForm({...importForm, provider: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:border-orange-500 outline-none appearance-none cursor-pointer">
                        <option value="aws">AWS EC2</option>
                        <option value="gcp">Google Cloud Compute</option>
                        <option value="azure">Azure Virtual Machines</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Auth Type</label>
                      <select value={importForm.type} onChange={e => setImportForm({...importForm, type: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:border-orange-500 outline-none appearance-none cursor-pointer">
                        <option value="access_key">Access Keys</option>
                        <option value="service_account">Service Account JSON</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Access Key / Client ID</label>
                    <div className="relative">
                        <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                        <input type="text" value={importForm.accessKey} onChange={e => setImportForm({...importForm, accessKey: e.target.value})} placeholder="AKIA..." className="w-full bg-black border border-white/10 rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:border-orange-500 outline-none transition-all" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Secret Key / Private Key</label>
                    <div className="relative">
                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                        <input type="password" value={importForm.secretKey} onChange={e => setImportForm({...importForm, secretKey: e.target.value})} placeholder="••••••••" className="w-full bg-black border border-white/10 rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:border-orange-500 outline-none transition-all" />
                    </div>
                    <p className="text-[8px] text-slate-600 uppercase mt-2 flex items-center gap-1"><ShieldCheck size={10} /> AES-256-GCM Hardware Encrypted in Vault</p>
                  </div>

                  <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
                    <button onClick={() => setShowImportModal(false)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">Cancel</button>
                    <button 
                        onClick={handleImportCred} 
                        disabled={savingCred || !importForm.name || !importForm.accessKey || !importForm.secretKey} 
                        className="flex-2 py-4 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(249,115,22,0.2)] px-8"
                    >
                      {savingCred ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full" /> : <><ShieldCheck size={14}/> Secure Vault Import</>}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };


  const SettingsView = () => {
    const [localAiConfig, setLocalAiConfig] = useState<AIConfig | null>(aiConfig);
    const [savingAi, setSavingAi] = useState(false);
    const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([]);
    const [configuredProviders, setConfiguredProviders] = useState<ConfiguredProvider[]>([]);
    const [settingsProviderId, setSettingsProviderId] = useState('');
    const [settingsModel, setSettingsModel] = useState('');
    const [settingsEndpoint, setSettingsEndpoint] = useState('');
    const [settingsTesting, setSettingsTesting] = useState(false);
    const [settingsTestResult, setSettingsTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
    const [webhookUrl, setWebhookUrl] = useState('');
    const [webhooks, setWebhooks] = useState<any[]>([]);
    const [savingWebhook, setSavingWebhook] = useState(false);
    const [fetchingWebhooks, setFetchingWebhooks] = useState(false);

    const fetchWebhooks = async () => {
      setFetchingWebhooks(true);
      try {
        const res = await api('/api/notifications');
        const data = await res.json();
        setWebhooks(Array.isArray(data) ? data.filter((n: any) => n && n.type === 'webhook') : []);
      } catch {}
      setFetchingWebhooks(false);
    };

    const handleSaveWebhook = async () => {
      if (!webhookUrl) return;
      setSavingWebhook(true);
      try {
        await api('/api/notifications/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'webhook', destination: webhookUrl, config: {}, enabled: true })
        });
        setWebhookUrl('');
        fetchWebhooks();
      } catch {}
      setSavingWebhook(false);
    };

    const handleDeleteWebhook = async (id: string) => {
      if (!confirm('Delete this webhook?')) return;
      try {
        await api(`/api/notifications/${id}`, { method: 'DELETE' });
        fetchWebhooks();
      } catch {}
    };

    useEffect(() => {
      setLocalAiConfig(aiConfig);
      fetchWebhooks();
      // Fetch provider list for the settings panel
      api('/api/ai/providers')
        .then(r => r.json())
        .then(data => {
          setAvailableProviders(data.providers);
          setConfiguredProviders(data.configured);
          if (data.configured.length > 0) {
            const active = data.configured[0];
            setSettingsProviderId(active.provider);
            setSettingsModel(active.model);
          } else if (data.providers.length > 0) {
            setSettingsProviderId(data.providers[0].id);
            setSettingsModel(data.providers[0].models[0] || '');
          }
        })
        .catch(() => {});
    }, [aiConfig]);

    const settingsProvider = (availableProviders || []).find(p => p.id === settingsProviderId);

    const handleSaveAi = async () => {
      if (!localAiConfig) return;
      setSavingAi(true);
      try {
        // Use the configure endpoint which saves to DB
        const res = await api('/api/ai/providers/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: settingsProviderId,
            model: settingsModel,
            apiKey: localAiConfig.apiKey || undefined,
            endpoint: settingsEndpoint || undefined,
            name: settingsProvider?.name || settingsProviderId
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setAiConfig({ ...localAiConfig, provider: settingsProviderId, model: settingsModel });
            alert('AI Configuration saved successfully');
          } else {
            alert(data.error || 'Failed to save');
          }
        } else {
          alert('Failed to save AI configuration');
        }
      } catch (e) {
        alert('Error saving AI configuration');
      }
      setSavingAi(false);
    };

    const handleSettingsTestKey = async () => {
      if (!localAiConfig?.apiKey) return;
      setSettingsTesting(true);
      setSettingsTestResult(null);
      try {
        const res = await api('/api/ai/test-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: settingsProviderId,
            model: settingsModel,
            apiKey: localAiConfig.apiKey
          })
        });
        const data = await res.json();
        setSettingsTestResult({ ok: data.success, msg: data.message || data.error || 'Unknown error' });
      } catch (err: any) {
        setSettingsTestResult({ ok: false, msg: err.message });
      } finally {
        setSettingsTesting(false);
      }
    };

    // Group providers by tier (same as onboarding)
    const tierOrder = ['frontier', 'hyperscaler', 'aggregator', 'inference', 'value', 'asia', 'specialized', 'selfhosted'];
    const tierLabels: Record<string, string> = {
      frontier: 'Frontier (Top Tier)',
      hyperscaler: 'Hyperscalers & Aggregators',
      aggregator: 'Multi-Proxy Aggregators',
      inference: 'High-Performance Inference',
      value: 'Value (Cost-Effective)',
      asia: 'Asian Ecosystem',
      specialized: 'Specialized / Niche',
      selfhosted: 'Self-Hosted / Local',
    };

    return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Settings className="text-orange-500" size={24} />
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em]">{t('settings.title')}</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Core Platform Directives & Security Parameters</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Neural Engine Config */}
        <div className="p-8 rounded-3xl bg-black/40 border border-white/5 space-y-8">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <Brain size={18} className="text-orange-500" />
            <h3 className="text-xs font-black uppercase tracking-widest">Ares Neural Engine</h3>
          </div>
          
          <div className="space-y-4">
            {/* Provider Selector */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Provider</label>
              <select
                value={settingsProviderId}
                onChange={(e) => {
                  setSettingsProviderId(e.target.value);
                  setSettingsModel('');
                  const prov = (availableProviders || []).find(p => p.id === e.target.value);
                  if (prov && prov.models.length > 0) setSettingsModel(prov.models[0]);
                }}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-orange-500 transition-colors"
              >
                <option value="">-- Select Provider --</option>
                {tierOrder.map(tier => {
                  const items = availableProviders.filter(p => p.tier === tier);
                  if (items.length === 0) return null;
                  return (
                    <optgroup key={tier} label={tierLabels[tier]}>
                      {items.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            {/* Model Selector */}
            {settingsProvider && settingsProvider.models.length > 0 && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Model</label>
                <select
                  value={settingsModel}
                  onChange={(e) => setSettingsModel(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-orange-500 transition-colors"
                >
                  {settingsProvider.models.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}

            {/* API Key */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">API Key</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    type="password"
                    value={localAiConfig?.apiKey || ''}
                    onChange={(e) => { setLocalAiConfig({...localAiConfig, apiKey: e.target.value}); }}
                    placeholder="Enter API key for this provider"
                    className="w-full bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white outline-none focus:border-orange-500"
                  />
                </div>
                <button
                  onClick={handleSettingsTestKey}
                  disabled={!localAiConfig?.apiKey || settingsTesting}
                  className="px-3 py-3 bg-black/60 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider hover:border-orange-500/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                >
                  {settingsTesting ? (
                    <><RefreshCw size={12} className="animate-spin" /> Testing</>
                  ) : (
                    <><Zap size={12} /> Test</>
                  )}
                </button>
              </div>
              {settingsTestResult && (
                <div className={`mt-2 flex items-start gap-2 text-[10px] ${settingsTestResult.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {settingsTestResult.ok ? <CheckCircle2 size={12} className="mt-0.5 shrink-0" /> : <XCircle size={12} className="mt-0.5 shrink-0" />}
                  <span>{settingsTestResult.msg.slice(0, 200)}</span>
                </div>
              )}
            </div>

            {/* Custom Endpoint (optional) */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Custom Endpoint <span className="text-slate-600">(optional)</span></label>
              <div className="relative">
                <input
                  type="text"
                  value={settingsEndpoint}
                  onChange={(e) => setSettingsEndpoint(e.target.value)}
                  placeholder="e.g. http://localhost:11434 or https://api.custom.com/v1"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex justify-between">Temperature <span>{localAiConfig?.temperature || 0.2}</span></label>
                <input type="range" min="0" max="1" step="0.1" value={localAiConfig?.temperature || 0.2} onChange={(e) => setLocalAiConfig({...localAiConfig, temperature: parseFloat(e.target.value)})} className="w-full accent-orange-500" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex justify-between">Context Window <span>{localAiConfig?.contextWindow || 128}k</span></label>
                <input type="range" min="8" max="256" step="8" value={localAiConfig?.contextWindow || 128} onChange={(e) => setLocalAiConfig({...localAiConfig, contextWindow: parseInt(e.target.value)})} className="w-full accent-orange-500" />
              </div>
            </div>
          </div>
          
          <button onClick={handleSaveAi} disabled={savingAi} className="w-full py-4 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors flex justify-center">
            {savingAi ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full" /> : t('settings.ai.save')}
          </button>
        </div>

        {/* Remediation & Autonomy */}
        <div className="space-y-8">
          <div className="p-8 rounded-3xl bg-black/40 border border-white/5 space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <ShieldCheck size={18} className="text-orange-500" />
              <h3 className="text-xs font-black uppercase tracking-widest">Autonomy Directives</h3>
            </div>
            
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Define how the platform reacts to incidents. <span className="text-orange-500 font-black">AUTO</span> mode allows the neural engine to execute generated scripts without approval if confidence exceeds the threshold.
            </p>
            
            <div className="space-y-3">
              {[
                { id: 'auto', label: 'Autonomous Remediation', desc: 'Ares executes solutions automatically' },
                { id: 'skill', label: 'Skill-Restricted', desc: 'Only runs predefined verified skills' },
                { id: 'manual', label: 'Manual Approval', desc: 'Requires admin approval for execution' }
              ].map(m => (
                <button key={m.id} onClick={() => handleUpdateRemediationMode(null, m.id)} className={cn(
                  "flex items-center justify-between w-full p-4 rounded-xl border transition-all text-left",
                  globalConfig.mode === m.id ? "bg-orange-500/10 border-orange-500" : "bg-white/5 border-white/10 hover:border-white/20"
                )}>
                  <div>
                    <p className={cn("text-[10px] font-black uppercase tracking-widest", globalConfig.mode === m.id ? "text-orange-500" : "text-white")}>{m.label}</p>
                    <p className="text-[9px] text-slate-500 mt-1 uppercase">{m.desc}</p>
                  </div>
                  <div className={cn("w-4 h-4 rounded-full border-2", globalConfig.mode === m.id ? "border-orange-500 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" : "border-slate-700")} />
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-white/5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex justify-between">Auto-Execution Confidence Threshold <span>{(globalConfig.threshold || 0.8) * 100}%</span></label>
              <input type="range" min="10" max="100" value={(globalConfig.threshold || 0.8) * 100} onChange={e => setGlobalConfig({...globalConfig, threshold: parseInt(e.target.value) / 100})} className="w-full accent-orange-500 mt-3" />
            </div>

            {/* ── Reactive Thresholds (CPU/RAM/Disk) ── */}
            <div className="pt-4 border-t border-white/5 space-y-4">
              <div className="flex items-center gap-2"><AlertTriangle size={14} className="text-orange-500"/><h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500">Reactive Guardrails</h4></div>
              <p className="text-[9px] text-slate-500">Define thresholds that trigger autonomous proactive activities when breached.</p>
              {[
                {id:'cpu',label:'CPU Usage',icon:Cpu,color:'text-orange-500'},
                {id:'memory',label:'Memory Usage',icon:Activity,color:'text-emerald-500'},
                {id:'disk',label:'Disk Usage',icon:Database,color:'text-sky-500'}
              ].map(m=>{
                const threshold=globalThresholds[m.id]||80;
                return (
                  <div key={m.id} className="p-4 rounded-xl bg-black/40 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2"><m.icon size={14} className={m.color}/><span className="text-[10px] font-black uppercase text-white">{m.label}</span></div>
                      <span className="text-lg font-black text-white">{threshold}%</span>
                    </div>
                    <input type="range" min="10" max="95" value={threshold}
                      onChange={e=>setGlobalThresholds({...globalThresholds,[m.id]:parseInt(e.target.value)})}
                      className="w-full accent-orange-500"
                    />
                    <div className="flex justify-between text-[8px] text-slate-600 font-black uppercase mt-1">
                      <span>Low</span>
                      <span className={threshold>=90?'text-rose-500':threshold>=80?'text-orange-500':'text-slate-500'}>
                        {threshold>=90?'Critical':threshold>=80?'Warning':'Normal'}
                      </span>
                      <span>High</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Webhook Configuration */}
          <div className="p-8 rounded-3xl bg-black/40 border border-white/5 space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <Bell size={18} className="text-orange-500" />
              <h3 className="text-xs font-black uppercase tracking-widest">Webhook Notifications</h3>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Configure webhook URLs to receive notifications when proactive activities fail or thresholds are breached.
            </p>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Webhook URL</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hooks.example.com/alert"
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-orange-500"
                  />
                </div>
                <button
                  onClick={handleSaveWebhook}
                  disabled={!webhookUrl || savingWebhook}
                  className="px-4 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
                >
                  {savingWebhook ? <><RefreshCw size={12} className="animate-spin" /> Saving</> : <><Zap size={12} /> Save</>}
                </button>
              </div>
            </div>
            {webhooks.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Configured Webhooks</p>
                {(webhooks || []).map((w: any) => (
                  <div key={w.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Bell size={12} className="text-emerald-500" />
                      <span className="text-[10px] text-slate-400 font-mono">{w.destination}</span>
                    </div>
                    <button onClick={() => handleDeleteWebhook(w.id)} className="p-1.5 text-slate-600 hover:text-rose-500 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  };

  const NotificationsView = () => {
    const [notifs, setNotifs] = useState<any[]>([]);
    const [loading, setLoading] = useState(() => {
    const saved = localStorage.getItem("saturn-user");
    return saved ? false : true;
  });

    useEffect(() => {
      api('/api/notifications')
        .then(r => r.json())
        .then(d => { setNotifs(Array.isArray(d) ? d : []); setLoading(false); })
        .catch(() => setLoading(false));
    }, []);

    const handleDelete = async (id: string) => {
      if (!confirm('Delete this notification channel?')) return;
      await api('/api/notifications/' + id, { method: 'DELETE' });
      setNotifs(prev => prev.filter(n => n.id !== id));
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center gap-3 mb-8">
          <Bell className="text-orange-500" size={24} />
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em]">Notification Channels</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Configured alerts and webhooks</p>
          </div>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="p-12 text-center"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-slate-700 border-t-orange-500 rounded-full mx-auto" /></div>
          ) : (notifs || []).length === 0 ? (
            <div className="p-12 border border-dashed border-white/10 rounded-2xl text-center">
              <Bell size={32} className="text-slate-600 mx-auto mb-4" />
              <p className="text-xs font-black uppercase text-slate-500 tracking-widest">No notification channels configured</p>
              <p className="text-[10px] text-slate-600 mt-2">Configure webhooks, Telegram, or email in Settings</p>
            </div>
          ) : (
            (notifs || []).map((n: any) => {
              const icons: Record<string, any> = { webhook: Globe, telegram: Send, email: Mail };
              const Icon = icons[n.type] || Bell;
              return (
                <div key={n.id} className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between hover:border-orange-500/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center"><Icon size={18} className="text-orange-500" /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-white">{n.type || 'unknown'}</p>
                      <p className="text-[9px] text-slate-500 font-mono">{n.destination || n.config?.chatId || '(no destination)'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={"text-[9px] font-black uppercase px-2 py-1 rounded " + (n.enabled ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-600 bg-white/5')}>
                      {n.enabled ? 'Active' : 'Disabled'}
                    </span>
                    <button onClick={() => handleDelete(n.id)} className="p-1.5 text-slate-600 hover:text-rose-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Add notification forms ── */}
        <div className="space-y-4 mt-8">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Add Notification Channel</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Webhook */}
            <ChannelForm type="webhook" icon={Globe} label="Webhook"
              fields={[{key:"destination",placeholder:"https://hooks.example.com/alert"}]}
              onAdd={async (vals) => {
                const r=await api('/api/notifications/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'webhook',destination:vals.destination,enabled:true})});
                const d=await r.json();if(d.success){setNotifs(p=>[...p,d.config||d]);return true}throw new Error(d.error||'Failed');
              }}
            />
            {/* Telegram */}
            <ChannelForm type="telegram" icon={Send} label="Telegram Bot"
              fields={[{key:"chatId",placeholder:"Chat ID (numeric)"},{key:"token",placeholder:"Bot token",type:"password"}]}
              onAdd={async (vals) => {
                const r=await api('/api/notifications/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'telegram',destination:vals.chatId,config:{token:vals.token},enabled:true})});
                const d=await r.json();if(d.success){setNotifs(p=>[...p,d.config||d]);return true}throw new Error(d.error||'Failed');
              }}
            />
            {/* Email */}
            <ChannelForm type="email" icon={Mail} label="Email (SMTP)"
              fields={[
                {key:"host",placeholder:"smtp.example.com"},{key:"port",placeholder:"587",default:"587"},
                {key:"user",placeholder:"user@example.com"},{key:"pass",placeholder:"Password",type:"password"},
                {key:"to",placeholder:"alert@example.com"}
              ]}
              onAdd={async (vals) => {
                const r=await api('/api/notifications/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'email',destination:vals.to||vals.user,config:{host:vals.host,port:parseInt(vals.port),auth:{user:vals.user,pass:vals.pass}},enabled:true})});
                const d=await r.json();if(d.success){setNotifs(p=>[...p,d.config||d]);return true}throw new Error(d.error||'Failed');
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  // ── ChannelForm sub-component ──
  const ChannelForm = ({ type, icon: Icon, label, fields, onAdd }: { type: string; icon: any; label: string; fields: {key:string;placeholder:string;type?:string;default?:string}[]; onAdd:(vals:Record<string,string>)=>Promise<boolean> }) => {
    const [vals,setVals]=useState<Record<string,string>>({});
    const [saving,setSaving]=useState(false);
    const [result,setResult]=useState<{ok:boolean;msg:string}|null>(null);
    return (
      <div className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-all">
        <div className="flex items-center gap-2 mb-3"><Icon size={14} className="text-orange-500"/><span className="text-[10px] font-black uppercase text-white">{label}</span></div>
        <div className="space-y-2">
          {fields.map(f=>(
            <input key={f.key} type={f.type||'text'} value={vals[f.key]||''} onChange={e=>setVals({...vals,[f.key]:e.target.value})}
              placeholder={f.placeholder} className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-[10px] outline-none focus:border-orange-500 font-mono"
            />
          ))}
          <div className="flex gap-2">
            <button disabled={saving} onClick={async()=>{
              setSaving(true);setResult(null);
              try{const ok=await onAdd(vals);setResult({ok,msg:ok?'Channel added':'Failed'});}catch(e:any){setResult({ok:false,msg:e.message||'Unknown error'});}
              setSaving(false);
            }} className="flex-1 py-2 bg-orange-500 text-black text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-orange-400 transition-all disabled:opacity-30">
              {saving?'Adding...':'Add Channel'}
            </button>
            <button disabled={saving} onClick={async()=>{
              setSaving(true);setResult(null);
              try{const r=await api('/api/notifications/test/'+type,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(vals)});
                const d=await r.json();setResult({ok:d.success,msg:d.message||d.error||'Test sent'});
              }catch(e:any){setResult({ok:false,msg:e.message});}
              setSaving(false);
            }} className="px-3 py-2 bg-white/5 border border-white/10 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-lg hover:border-white/20 transition-all disabled:opacity-30 flex items-center gap-1">
              <Zap size={10}/> Test
            </button>
          </div>
          {result && (
            <div className={`flex items-start gap-1.5 text-[9px] ${result.ok?'text-emerald-400':'text-rose-400'}`}>
              {result.ok?<CheckCircle2 size={10} className="mt-0.5 shrink-0"/>:<XCircle size={10} className="mt-0.5 shrink-0"/>}
              <span>{result.msg.slice(0,150)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const AdminView = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 mb-8"><User className="text-orange-500" size={20} /><h2 className="text-sm font-black uppercase tracking-[0.2em]">Platform Administration</h2></div>
      <UserManager t={t} />
    </div>
  );

  if (onboarding === null) return <div className="min-h-screen bg-black flex items-center justify-center"><motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 rounded-full border-2 border-orange-500/20 border-t-orange-500" /></div>;
  if (onboarding) return <div className="min-h-screen bg-black text-white flex items-center justify-center p-8"><OnboardingWizard onComplete={() => setOnboarding(false)} t={t} /></div>;
  if (!user) return <LoginView onLogin={handleLogin} t={t} />;
  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-16 h-16 rounded-full border-4 border-orange-500 border-t-transparent" /></div>;

  return (
    <div className="min-h-screen bg-black text-white flex overflow-hidden">
      <AnimatePresence>{mobileMenuOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] lg:hidden" />}</AnimatePresence>
      <aside className={cn("fixed inset-y-0 left-0 z-[70] bg-black border-r border-white/5 transition-all duration-300 flex flex-col", mobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0", sidebarCollapsed ? "lg:w-20" : "lg:w-64")}>
        <div className="p-6 flex items-center justify-between">{(!sidebarCollapsed || mobileMenuOpen) && <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full border border-orange-500 flex items-center justify-center"><div className="w-4 h-0.5 bg-orange-500 rounded-full" /></div><span className="font-black text-sm tracking-widest">SATURN</span></div>}<button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden lg:block text-slate-500 hover:text-white"><ChevronLeft className={cn("transition-transform", sidebarCollapsed && "rotate-180")} size={18} /></button></div>
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          <SidebarItem id="dashboard" label={t('nav.dashboard')} icon={LayoutDashboard} />
          <SidebarItem id="servers" label={t('nav.servers')} icon={Server} />
          <SidebarItem id="skills" label={t('nav.skills')} icon={Brain} />
          <SidebarItem id="proactive" label={t('nav.proactive')} icon={Zap} />
          <SidebarItem id="credentials" label={t('nav.credentials')} icon={Key} />
          <SidebarItem id="contextp" label={t('nav.contextp')} icon={Database} />
          <SidebarItem id="notifications" label={t('nav.notifications') || 'Notifications'} icon={Bell} />
          <SidebarItem id="audit" label="Audit Logs" icon={History} />
          <SidebarItem id="settings" label={t('nav.settings')} icon={Settings} />
          <SidebarItem id="admin" label={t('nav.admin')} icon={User} />
        </nav>
        <div className="p-4 border-t border-white/5 space-y-4"><div className="flex items-center gap-3 px-3"><div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-black font-black text-[10px]">{user.username.charAt(0).toUpperCase()}</div>{(!sidebarCollapsed || mobileMenuOpen) && <div className="flex-1 min-w-0"><p className="text-[10px] font-black uppercase text-white truncate">{user.username}</p><p className="text-[8px] font-medium text-slate-500 truncate">{user.role}</p></div>}</div><button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all"><Unplug size={18} />{(!sidebarCollapsed || mobileMenuOpen) && <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>}</button></div>
      </aside>
      <main className={cn("flex-1 flex flex-col min-w-0 transition-all duration-300", sidebarCollapsed ? "lg:ml-20" : "lg:ml-64")}>
        <header className="h-16 border-b border-white/5 bg-black/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50"><div className="flex items-center gap-4"><button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-slate-500 hover:text-white"><Menu size={20} /></button><h1 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{activeTab} <span className="text-white/20 mx-2">/</span> <span className="text-white">{selectedServer ? selectedServer.name : 'Overview'}</span></h1></div><div className="flex items-center gap-6"><div className="hidden sm:flex bg-black/40 border border-white/10 p-1 rounded-xl">{['auto', 'skill', 'manual'].map(m => <button key={m} onClick={() => handleUpdateRemediationMode(null, m)} className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", globalConfig.mode === m ? "bg-orange-500/10 text-orange-400" : "text-slate-600 hover:text-slate-400")}>{m}</button>)}</div><div className="flex items-center gap-3"><div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg", aiConfig ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-orange-500/10 border border-orange-500/20")}><div className={cn("w-1.5 h-1.5 rounded-full", aiConfig ? "bg-emerald-500" : "bg-orange-500 animate-pulse")} /><span className={cn("text-[10px] font-black uppercase tracking-widest", aiConfig ? "text-emerald-500" : "text-orange-500")}>Neural {aiConfig ? 'Active' : 'Standby'}</span></div></div></div></header>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <ErrorBoundary>
            {activeTab === 'dashboard' && DashboardView()}
            {activeTab === 'servers' && !selectedServer && ServersListView()}
            {activeTab === 'servers' && selectedServer && <ServerDetailView />}
            {activeTab === 'skills' && <SkillsView skills={skills} setSkills={setSkills} />}
            {activeTab === 'proactive' && <ProactiveView />}
            {activeTab === 'credentials' && <CredentialsView />}
            {activeTab === 'contextp' && <ContextPView />}
            {activeTab === 'notifications' && <NotificationsView />}
            {activeTab === 'audit' && <AuditView />}
            {activeTab === 'settings' && <SettingsView />}
            {activeTab === 'admin' && <AdminView />}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
