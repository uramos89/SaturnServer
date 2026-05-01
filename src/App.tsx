import React, { useState, useEffect, useCallback } from 'react';
import { 
  Server, 
  Activity, 
  Database, 
  Brain, 
  ShieldCheck, 
  AlertTriangle, 
  Terminal, 
  ChevronRight,
  Cpu, 
  HardDrive,
  RefreshCw,
  Search,
  Bell,
  Settings,
  LayoutDashboard,
  Logs,
  CheckCircle2,
  XCircle,
  Mail,
  Zap,
  Plug,
  Unplug,
  TerminalSquare,
  History,
  Globe,
  Key,
  Wifi,
  User,
  Lock,
  Eye,
  EyeOff,
  Send
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import type { ManagedServer, Incident, AuditLog, NotificationConfig, AIConfig, SshConnection } from './lib/types';
import { t, Language } from './lib/i18n';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

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

// ── Login View ────────────────────────────────────────────────────────
const LoginView = ({ onLogin, t }: { onLogin: (u: UserData) => void, t: (k: string) => string }) => {
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
        onLogin(data.user);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md immersive-card p-8"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-orange-500 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.3)]">
            <div className="w-8 h-1.5 bg-orange-500 rounded-full" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-[0.2em] mb-2 uppercase">SATURN</h1>
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
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 pl-10 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
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
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 pl-10 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
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
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
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
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
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
      const res = await fetch('/api/admin/create', {
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
          {users.map(u => (
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
    fetch('/api/ai/providers')
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
      const res = await fetch('/api/ai/providers/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: selectedProvider,
          model: selectedModel,
          apiKey: apiKey || undefined,
          endpoint: endpoint || undefined,
          name: providers.find(p => p.id === selectedProvider)?.name
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

  const handleSmtpSave = async () => {
    if (!smtpHost || !smtpUser || !smtpPass) {
      setSmtpError('SMTP Host, Username and Password are required');
      return;
    }
    setSmtpSaving(true);
    setSmtpError('');
    try {
      const res = await fetch('/api/notifications/config', {
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
      const res = await fetch('/api/admin/create', {
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

  const provider = providers.find(p => p.id === selectedProvider);

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
    .map(tier => ({ tier, label: tierLabels[tier], items: providers.filter(p => p.tier === tier) }))
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
          SATURN <span className="text-orange-500 font-light">v0.1.0</span>
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
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-500",
              step >= i ? "bg-orange-500/20 text-orange-400" : "bg-white/5 text-slate-600"
            )}>
              <s.icon size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{s.label}</span>
            </div>
            {i < 2 && <div className={cn("h-px w-8", step > i ? "bg-orange-500" : "bg-white/10")} />}
          </div>
        ))}
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
                  <div className="relative">
                    <Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={t('onboarding.apiKey.placeholder')}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 pl-10 text-xs focus:ring-1 focus:ring-orange-500 outline-none font-mono"
                    />
                  </div>
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
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 pl-10 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
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
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 pl-10 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
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
const IncidentCard = ({ incident, onAnalyze, onResolve, t }: { incident: Incident, onAnalyze: () => void, onResolve: (id: string) => void, t: (k: string) => string }) => (
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
              className="text-[10px] font-black uppercase tracking-widest bg-orange-500/20 text-orange-400 px-3 py-1.5 rounded-lg hover:bg-orange-500/30 transition-all"
            >
              Analyze
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
const CredentialCard = ({ cred, onDelete, onScan }: { cred: any, onDelete: (id: string) => void, onScan: (id: string) => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-orange-500/30 transition-all group"
  >
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-xl",
          cred.provider === 'aws' ? "bg-orange-500/10 text-orange-500" :
          cred.provider === 'gcp' ? "bg-sky-500/10 text-sky-500" :
          "bg-blue-600/10 text-blue-500"
        )}>
          <Globe size={18} />
        </div>
        <div>
          <div className="text-sm font-bold text-white uppercase tracking-wider">{cred.name}</div>
          <div className="text-[10px] text-slate-500 uppercase">{cred.provider} • {cred.type}</div>
        </div>
      </div>
      <button onClick={() => onDelete(cred.id)} className="p-2 text-slate-600 hover:text-rose-500 transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
    <div className="flex gap-2">
      <button 
        onClick={() => onScan(cred.id)}
        className="flex-1 py-2 bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all flex items-center justify-center gap-2"
      >
        <RefreshCw size={12} /> Scan Account
      </button>
    </div>
  </motion.div>
);

// ── Main App Component ─────────────────────────────────────────────────
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
  const [serverDetailTab, setServerDetailTab] = useState('summary');
  const [remediationConfigs, setRemediationConfigs] = useState<any[]>([]);
  const [globalConfig, setGlobalConfig] = useState<any>({ mode: 'auto', threshold: 0.7 });
  const [selectedSkillId, setSelectedSkillId] = useState<string>('ps_remediation_v1');
  const [importData, setImportData] = useState({ name: '', provider: 'aws', type: 'key', content: '' });
  const [commandHistory, setCommandHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<any>(null);
  const [user, setUser] = useState<UserData | null>(() => {
    const saved = localStorage.getItem('saturn-user');
    return saved ? JSON.parse(saved) : null;
  });

  // Connection form state
  const [connHost, setConnHost] = useState('');
  const [connPort, setConnPort] = useState('22');
  const [connUser, setConnUser] = useState('');
  const [connKey, setConnKey] = useState('');
  const [connPass, setConnPass] = useState('');
  const [connError, setConnError] = useState('');
  const [connLoading, setConnLoading] = useState(false);

  // Command state
  const [cmdText, setCmdText] = useState('');
  const [cmdResult, setCmdResult] = useState<any>(null);
  const [cmdLoading, setCmdLoading] = useState(false);

  // AI Config state
  const [aiProvider, setAiProvider] = useState('gemini');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiAutoRemediate, setAiAutoRemediate] = useState(false);

  // Detail View State
  const [detailTab, setDetailTab] = useState<'overview' | 'users' | 'processes' | 'tasks' | 'network' | 'firewall' | 'apps' | 'web' | 'health' | 'backups' | 'security' | 'logs' | 'neural'>('overview');
  const [serverLogs, setServerLogs] = useState('');
  const [logLoading, setLogLoading] = useState(false);
  const [neuralPrompt, setNeuralPrompt] = useState('');
  const [neuralResult, setNeuralResult] = useState<any>(null);
  const [neuralLoading, setNeuralLoading] = useState(false);
  const [listOutputs, setListOutputs] = useState<Record<string, string>>({ users: '', processes: '', tasks: '', network: '', firewall: '', packages: '', webserver: '', health: '', backups: '', ssl: '', audit: '' });

  // Check setup status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/setup/status');
        const data = await res.json();
        setOnboarding(!data.initialized);
      } catch (e) {
        setOnboarding(true); // Default to onboarding if check fails
      }
    };
    checkStatus();
  }, []);

  // SSE connection for real-time metrics
  useEffect(() => {
    if (onboarding) return;
    const fetchData = async () => {
      try {
        const [sRes, iRes, aRes, nRes, aiRes, sshRes, cRes, skRes, rRes, pRes, cpRes] = await Promise.all([
          fetch('/api/servers'),
          fetch('/api/incidents'),
          fetch('/api/audit'),
          fetch('/api/notifications'),
          fetch('/api/ai/config'),
          fetch('/api/ssh/connections'),
          fetch('/api/credentials'),
          fetch('/api/skills'),
          fetch('/api/remediation/config'),
          fetch('/api/proactive'),
          fetch('/api/contextp/files')
        ]);
        setServers(await sRes.json());
        setIncidents(await iRes.json());
        setAuditLogs(await aRes.json());
        setNotifications(await nRes.json());
        setAiConfig(await aiRes.json());
        setSshConnections(await sshRes.json());
        setCloudCreds(await cRes.json());
        setSkills(await skRes.json());
        setProactiveActivities(await pRes.json());
        setContextPFiles(await cpRes.json());
        const configs = await rRes.json();
        setRemediationConfigs(configs);
        setGlobalConfig(configs.find((c: any) => c.serverId === 'global') || { mode: 'auto', threshold: 0.7 });
      } catch (e) {
        console.error('Failed to fetch data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [onboarding]);

  // SSE stream
  useEffect(() => {
    if (onboarding) return;
    const evtSource = new EventSource('/api/servers/ssh/stream');
    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'metrics') {
          setServers(data.servers);
        }
      } catch {}
    };
    return () => evtSource.close();
  }, [onboarding]);

  const handleConnect = async () => {
    if (!connHost || !connUser) return;
    setConnLoading(true);
    setConnError('');
    try {
      const res = await fetch('/api/ssh/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: connHost,
          port: parseInt(connPort),
          username: connUser,
          privateKey: connKey || undefined,
          password: connPass || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        // setShowConnectModal(false);
        setConnHost('');
        setConnUser('');
        setConnKey('');
        setConnPass('');
        // Refresh
        const [sRes, sshRes] = await Promise.all([
          fetch('/api/servers'),
          fetch('/api/ssh/connections')
        ]);
        setServers(await sRes.json());
        setSshConnections(await sshRes.json());
      } else {
        setConnError(data.error || 'Connection failed');
      }
    } catch (err: any) {
      setConnError(err.message);
    } finally {
      setConnLoading(false);
    }
  };

  const handleDisconnect = async (serverId: string) => {
    await fetch('/api/ssh/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId })
    });
    const [sRes, sshRes] = await Promise.all([
      fetch('/api/servers'),
      fetch('/api/ssh/connections')
    ]);
    setServers(await sRes.json());
    setSshConnections(await sshRes.json());
  };

  const handleRefresh = async (serverId: string) => {
    await fetch(`/api/servers/${serverId}/refresh`, { method: 'POST' });
    const sRes = await fetch('/api/servers');
    setServers(await sRes.json());
  };

  const handleExecCommand = async () => {
    if (!cmdText || !selectedServer) return;
    setCmdLoading(true);
    setCmdResult(null);
    try {
      const res = await fetch(`/api/servers/${selectedServer.id}/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmdText })
      });
      const data = await res.json();
      setCmdResult(data);
      // Refresh history
      const hRes = await fetch(`/api/servers/${selectedServer.id}/history`);
      setCommandHistory(await hRes.json());
    } catch (err: any) {
      setCmdResult({ error: err.message });
    } finally {
      setCmdLoading(false);
    }
  };

  const handleAnalyze = async (incidentId: string) => {
    try {
      await fetch('/api/neural/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId, provider: aiConfig?.provider || 'gemini' })
      });
      const iRes = await fetch('/api/incidents');
      setIncidents(await iRes.json());
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem('saturn-user');
    setUser(null);
  };

  const handleLogin = (u: UserData) => {
    localStorage.setItem('saturn-user', JSON.stringify(u));
    setUser(u);
  };

  const handleUpdateRemediationMode = async (serverId: string | null, mode: string, skillId?: string) => {
    try {
      await fetch('/api/remediation/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId, mode, skillId })
      });
      const res = await fetch('/api/remediation/config');
      const configs = await res.json();
      setRemediationConfigs(configs);
      if (!serverId || serverId === 'global') setGlobalConfig(configs.find((c: any) => c.serverId === 'global'));
    } catch (e: any) { alert(e.message); }
  };

  // ── Components ──────────────────────────────────────────────────────
  // ── View Components ────────────────────────────────────────────────
  const DashboardView = () => {
    const stats = {
      total: servers.length,
      online: servers.filter(s => s.status === 'online').length,
      incidents: incidents.filter(i => i.status === 'open').length,
      sshConnected: sshConnections.filter(c => c.status === 'connected').length
    };

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label={t('stats.totalServers')} value={stats.total} icon={Server} color="text-blue-500" />
          <StatCard label={t('stats.online')} value={stats.online} icon={CheckCircle} color="text-emerald-500" />
          <StatCard label={t('stats.incidents')} value={stats.incidents} icon={AlertTriangle} color="text-rose-500" />
          <StatCard label="SSH Connected" value={stats.sshConnected} icon={Zap} color="text-orange-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Recent Servers</h2>
                <button onClick={() => setActiveTab('servers')} className="text-[10px] font-black uppercase text-orange-500 hover:underline">View All</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {servers.slice(0, 4).map(server => (
                  <ServerCard key={server.id} server={server} onClick={() => { setSelectedServer(server); setServerDetailTab('summary'); setActiveTab('servers'); }} />
                ))}
              </div>
            </section>
          </div>
          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Open Incidents</h2>
              <div className="space-y-3">
                {incidents.filter(i => i.status === 'open').length > 0 ? (
                  incidents.filter(i => i.status === 'open').slice(0, 5).map(incident => <IncidentCard key={incident.id} incident={incident} t={t} />)
                ) : (
                  <div className="p-8 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                    <p className="text-[10px] font-black uppercase text-emerald-500">All systems clear</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  };

  const ServersListView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Filter servers..." 
              className="bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-orange-500 outline-none w-64"
            />
          </div>
        </div>
        <button onClick={() => {}} className="px-4 py-2 bg-orange-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all">
          Add Server
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {servers.map(server => (
          <ServerCard key={server.id} server={server} onClick={() => { setSelectedServer(server); setServerDetailTab('summary'); }} />
        ))}
      </div>
    </div>
  );

  const ServerDetailView = () => {
    if (!selectedServer) return null;

    const tabs = [
      { id: 'summary', label: 'Summary', icon: LayoutDashboard },
      { id: 'system', label: 'System', icon: Cpu },
      { id: 'network', label: 'Network', icon: Network },
      { id: 'security', label: 'Security', icon: Shield },
      { id: 'backups', label: 'Backups', icon: Database },
      { id: 'tasks', label: 'Tasks', icon: ClipboardList },
      { id: 'terminal', label: 'Terminal', icon: Terminal }
    ];

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        {/* Detail Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/40 border border-white/5 p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedServer(null)} className="p-2 text-slate-500 hover:text-white bg-white/5 rounded-xl transition-all">
              <ChevronLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-sm font-black uppercase tracking-widest">{selectedServer.name}</h2>
                <div className={cn("w-2 h-2 rounded-full animate-pulse", selectedServer.status === 'online' ? "bg-emerald-500" : "bg-rose-500")} />
              </div>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">{selectedServer.ip} • {selectedServer.os}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-300 text-[10px] font-black uppercase rounded-xl hover:bg-white/10 transition-all">
              <RefreshCw size={14} /> Sync
            </button>
            <select 
              value={remediationConfigs.find(c => c.serverId === selectedServer.id)?.mode || 'global'}
              onChange={(e) => handleUpdateRemediationMode(selectedServer.id, e.target.value)}
              className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-orange-500 outline-none"
            >
              <option value="global">Mode: Global</option>
              <option value="auto">Mode: Auto</option>
              <option value="skill">Mode: Skill</option>
              <option value="manual">Mode: Manual</option>
            </select>
          </div>
        </div>

        {/* Tabs - Horizontal Scrollable on Mobile */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 custom-scrollbar lg:overflow-visible">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setServerDetailTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                serverDetailTab === tab.id ? "bg-orange-500 text-black" : "text-slate-500 hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {serverDetailTab === 'summary' && <ServerSummaryTab />}
          {serverDetailTab === 'system' && <div className="p-12 text-center text-slate-500 italic uppercase text-[10px] font-black tracking-widest">System details loading...</div>}
          {serverDetailTab === 'terminal' && <div className="h-[500px] bg-black rounded-2xl border border-white/5 p-4 font-mono text-xs text-slate-400">Terminal coming soon...</div>}
        </div>
      </div>
    );
  };

  const ServerSummaryTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        {/* Real-time Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'CPU', value: selectedServer?.cpu + '%', icon: Cpu, color: 'text-orange-500' },
            { label: 'RAM', value: selectedServer?.memory + '%', icon: Database, color: 'text-blue-500' },
            { label: 'Disk', value: '45%', icon: HardDrive, color: 'text-emerald-500' },
            { label: 'Uptime', value: '12d 4h', icon: Clock, color: 'text-slate-400' }
          ].map(m => (
            <div key={m.label} className="p-4 rounded-2xl bg-black/40 border border-white/5">
              <div className="flex items-center gap-2 mb-2 text-slate-500">
                <m.icon size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">{m.label}</span>
              </div>
              <p className={cn("text-xl font-black", m.color)}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Neural Actions */}
        <div className="p-6 rounded-2xl bg-orange-500/5 border border-orange-500/10">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={16} className="text-orange-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-500">Neural Remediation</h3>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="How can I help you with this server?" 
              className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
            />
            <button className="px-6 py-3 bg-orange-500 text-black text-[10px] font-black uppercase rounded-xl hover:bg-orange-400 transition-all">Generate</button>
          </div>
        </div>
      </div>

      {/* ContextP Panel */}
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-black/40 border border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <History size={14} className="text-slate-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">ContextP Insights</h3>
          </div>
          <div className="space-y-4">
            {[
              { type: 'FIX', date: '2h ago', title: 'SSH Port Hardening' },
              { type: 'AUDIT', date: '5h ago', title: 'Root login check' },
              { type: 'PATTERN', date: 'Pattern Match', title: 'Web server recovery' }
            ].map((i, idx) => (
              <div key={idx} className="flex gap-3 text-[10px]">
                <div className="w-1 h-1 rounded-full bg-orange-500 mt-1" />
                <div>
                  <p className="font-black text-slate-300 uppercase tracking-tighter">{i.title}</p>
                  <p className="text-[8px] text-slate-600 mt-0.5 uppercase">{i.type} • {i.date}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setActiveTab('contextp')} className="w-full mt-6 py-2 border border-white/5 rounded-xl text-[9px] font-black uppercase text-slate-500 hover:bg-white/5 transition-all">
            Explore Memory
          </button>
        </div>
      </div>
    </div>
  );

  const ProactiveView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="text-orange-500" size={20} />
          <h2 className="text-sm font-black uppercase tracking-[0.2em]">Proactive Activities</h2>
        </div>
        <button className="px-4 py-2 bg-orange-500 text-black text-[10px] font-black uppercase rounded-xl hover:bg-orange-400 transition-all">New Activity</button>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {proactiveActivities.length > 0 ? (
          proactiveActivities.map(act => (
            <div key={act.id} className="p-6 rounded-2xl bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                  <Play size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white">{act.name}</p>
                  <p className="text-[8px] font-medium text-slate-500 uppercase tracking-widest">{act.condition} • {act.schedule}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-white/5 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-400">Target: {act.targetType}</div>
                <div className={cn("px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest", act.enabled ? "bg-emerald-500/10 text-emerald-500" : "bg-white/5 text-slate-600")}>
                  {act.enabled ? 'Active' : 'Paused'}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 rounded-2xl border border-dashed border-white/10 text-center space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">No proactive activities defined</p>
            <button className="text-[9px] font-black uppercase text-orange-500 hover:underline">Create your first automation</button>
          </div>
        )}
      </div>
    </div>
  );

  const SkillsView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="text-orange-500" size={20} />
          <h2 className="text-sm font-black uppercase tracking-[0.2em]">AI Skills Library</h2>
        </div>
        <button className="px-4 py-2 bg-white/5 text-slate-300 text-[10px] font-black uppercase rounded-xl hover:bg-white/10 transition-all">Add Custom Skill</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {skills.map(skill => (
          <div key={skill.id} className="p-6 rounded-2xl bg-black/40 border border-white/5 hover:border-orange-500/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-all">
                {skill.language === 'powershell' ? <Terminal size={20} /> : <FileCode size={20} />}
              </div>
              <div className="px-3 py-1 bg-white/5 rounded-lg text-[8px] font-black uppercase text-slate-500">v{skill.version}</div>
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest mb-1">{skill.name}</h3>
            <p className="text-[10px] text-slate-500 mb-6 line-clamp-2">{skill.description}</p>
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <span className="text-[8px] font-black uppercase text-slate-600">{skill.language}</span>
              <button className="text-[9px] font-black uppercase text-orange-500 hover:underline">Manage Rules</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const CredentialsView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Key className="text-orange-500" size={20} />
          <h2 className="text-sm font-black uppercase tracking-[0.2em]">Credential Vault</h2>
        </div>
        <button className="px-4 py-2 bg-orange-500 text-black text-[10px] font-black uppercase rounded-xl hover:bg-orange-400 transition-all">Import Key</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cloudCreds.map(cred => (
          <div key={cred.id} className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-orange-500/30 transition-all group relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                <Shield size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">{cred.name}</p>
                <p className="text-[8px] font-medium text-slate-500 uppercase">{cred.provider} • {cred.type}</p>
              </div>
            </div>
            <button className="absolute top-4 right-4 p-2 text-slate-600 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const ContextPView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="text-orange-500" size={20} />
          <h2 className="text-sm font-black uppercase tracking-[0.2em]">ContextP Explorer</h2>
        </div>
        <div className="flex bg-black/40 border border-white/10 p-1 rounded-xl">
          <button className="px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-500">Files</button>
          <button className="px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-400">Semantic Search</button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 bg-black/40 border border-white/5 rounded-2xl p-4 overflow-y-auto max-h-[600px] custom-scrollbar">
          <div className="space-y-2">
            {contextPFiles.map((node, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg cursor-pointer text-slate-400">
                  <Folder size={14} className="text-orange-500/50" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">{node.name}</span>
                </div>
                {node.children && (
                  <div className="ml-4 border-l border-white/5 pl-4 space-y-1">
                    {node.children.map((child: any, j: number) => (
                      <div key={j} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg cursor-pointer text-slate-500">
                        <FileText size={12} />
                        <span className="text-[9px] font-medium truncate">{child.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-3 bg-black/60 border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4">
          <Brain size={48} className="text-slate-800" />
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Select a file to view or analyze its contents</p>
            <p className="text-[8px] text-slate-700 mt-1 uppercase">Persistent memory is encrypted at rest</p>
          </div>
        </div>
      </div>
    </div>
  );

  const SidebarItem = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => { setActiveTab(id); setMobileMenuOpen(false); }}
      className={cn(
        "flex items-center gap-3 w-full p-3 rounded-xl transition-all group",
        activeTab === id ? "bg-orange-500/10 text-orange-400" : "text-slate-500 hover:text-white hover:bg-white/5"
      )}
    >
      <Icon size={20} className={cn("transition-transform group-hover:scale-110", activeTab === id ? "text-orange-500" : "text-slate-500")} />
      {(!sidebarCollapsed || mobileMenuOpen) && <span className="text-xs font-black uppercase tracking-widest">{label}</span>}
    </button>
  );

  // ── Render ───────────────────────────────────────────────────────────
  if (onboarding === null) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-12 h-12 rounded-full border-2 border-orange-500/20 border-t-orange-500" />
    </div>
  );

  if (onboarding) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <OnboardingWizard onComplete={() => setOnboarding(false)} t={t} />
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={handleLogin} t={t} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full border-4 border-orange-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex overflow-hidden">
      {/* Mobile Menu Backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-[70] bg-black border-r border-white/5 transition-all duration-300 flex flex-col",
          mobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed ? "lg:w-20" : "lg:w-64"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          {(!sidebarCollapsed || mobileMenuOpen) && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-orange-500 flex items-center justify-center">
                <div className="w-4 h-0.5 bg-orange-500 rounded-full" />
              </div>
              <span className="font-black text-sm tracking-widest">SATURN</span>
            </div>
          )}
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:block text-slate-500 hover:text-white"
          >
            <ChevronLeft size={18} className={cn("transition-transform", sidebarCollapsed && "rotate-180")} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          <SidebarItem id="dashboard" label={t('nav.dashboard')} icon={LayoutDashboard} />
          <SidebarItem id="servers" label={t('nav.servers')} icon={Server} />
          <SidebarItem id="skills" label="Skills" icon={Brain} />
          <SidebarItem id="proactive" label="Proactive" icon={Zap} />
          <SidebarItem id="credentials" label="Credentials" icon={Key} />
          <SidebarItem id="contextp" label="ContextP" icon={Database} />
          <SidebarItem id="settings" label="Settings" icon={Settings} />
          <SidebarItem id="admin" label="Admin" icon={User} />
        </nav>

        <div className="p-4 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3 px-3">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-black font-black text-[10px]">AD</div>
            {(!sidebarCollapsed || mobileMenuOpen) && (
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase text-white truncate">Admin User</p>
                <p className="text-[8px] font-medium text-slate-500 truncate">admin@saturn.io</p>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all">
            <LogOut size={18} />
            {(!sidebarCollapsed || mobileMenuOpen) && <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        )}
      >
        {/* Header */}
        <header className="h-16 border-b border-white/5 bg-black/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-slate-500 hover:text-white">
              <Menu size={20} />
            </button>
            <h1 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              {activeTab} <span className="text-white/20 mx-2">/</span> <span className="text-white">{selectedServer ? selectedServer.name : 'Overview'}</span>
            </h1>
          </div>

          <div className="flex items-center gap-6">
            {/* Global Remediation Mode */}
            <div className="hidden sm:flex bg-black/40 border border-white/10 p-1 rounded-xl">
              {[
                { id: 'auto', label: '🤖 AUTO', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { id: 'skill', label: '🧠 SKILL', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { id: 'manual', label: '🔧 MANUAL', color: 'text-slate-400', bg: 'bg-white/5' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => handleUpdateRemediationMode('global', m.id)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                    globalConfig.mode === m.id ? `${m.bg} ${m.color}` : "text-slate-600 hover:text-slate-400"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConnectModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all"
            >
              <Plug size={14} />
              {t('nav.connect')}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "p-2 rounded-xl transition-all",
                showSettings ? "bg-orange-500/10 text-orange-400" : "text-slate-500 hover:text-white hover:bg-white/5"
              )}
            >
              <Settings size={16} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
              title="Logout"
            >
              <Unplug size={16} />
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-white/5">
              <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-black font-black text-[10px]">
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>
            <button
              onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
              className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white/5 text-slate-400 hover:bg-white/10"
            >
              {lang.toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
              <StatCard title={t('stats.total')} value={stats.total} icon={Server} />
              <StatCard title={t('stats.online')} value={stats.online} icon={Activity} color="emerald" trend={stats.online > 0 ? 100 : 0} />
              <StatCard title={t('stats.degraded')} value={stats.degraded} icon={AlertTriangle} color="amber" />
              <StatCard title={t('stats.offline')} value={stats.offline} icon={XCircle} color="rose" />
              <StatCard title={t('stats.incidents')} value={stats.incidents} icon={AlertTriangle} color="rose" />
              <StatCard title={t('stats.ssh')} value={stats.sshConnected} icon={Wifi} color="sky" />
            </div>

            {/* CPU/Memory Chart */}
            <div className="immersive-card p-6 mb-8">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">{t('dashboard.performance')}</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={servers.map(s => ({ name: s.name, cpu: s.cpu, memory: s.memory }))}>
                    <defs>
                      <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 12 }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="cpu" stroke="#f97316" fill="url(#cpuGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="memory" stroke="#06b6d4" fill="url(#memGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Incidents */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incidents.slice(0, 4).map(inc => (
                <IncidentCard key={inc.id} incident={inc} onAnalyze={() => handleAnalyze(inc.id)} onResolve={handleResolveIncident} t={t} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Servers */}
        {activeTab === 'servers' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-white uppercase tracking-widest">{t('nav.servers')}</h2>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-500 font-mono">{stats.online}/{stats.total} online</span>
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all"
                >
                  <Plug size={14} /> {t('nav.connect')}
                </button>
              </div>
            </div>

            <div className="immersive-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                  <Server size={12} /> {t('server.name')}
                </div>
                <div className="hidden md:flex items-center gap-8 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                  <span className="w-24">{t('server.cpu')}</span>
                  <span className="w-24">{t('server.mem')}</span>
                </div>
              </div>
              {servers.map(s => (
                <ServerRow
                  key={s.id}
                  server={s}
                  onClick={() => setSelectedServer(selectedServer?.id === s.id ? null : s)}
                  t={t}
                />
              ))}
              {servers.length === 0 && (
                <div className="p-12 text-center">
                  <Server size={32} className="mx-auto mb-4 text-slate-600" />
                  <p className="text-sm text-slate-500">{t('server.none')}</p>
                  <button
                    onClick={() => setShowConnectModal(true)}
                    className="mt-4 px-6 py-3 bg-orange-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all"
                  >
                    {t('nav.connect')}
                  </button>
                </div>
              )}
            </div>

            {/* Server Detail */}
            {selectedServer && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 immersive-card p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedServer.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">{selectedServer.ip} • {selectedServer.os}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRefresh(selectedServer.id)}
                      className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      onClick={() => { setSelectedServer(null); setShowCommandModal(true); }}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-400 text-xs font-semibold rounded-xl hover:bg-white/10 transition-all"
                    >
                      <Terminal size={14} /> {t('server.exec')}
                    </button>
                    <button
                      onClick={() => handleDisconnect(selectedServer.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-400 text-xs font-semibold rounded-xl hover:bg-rose-500/20 transition-all"
                    >
                      <Unplug size={14} /> {t('server.disconnect')}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">{t('server.cpu')}</div>
                    <div className="text-2xl font-mono font-bold text-white">{selectedServer.cpu}%</div>
                    <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(selectedServer.cpu, 100)}%` }}
                        className={cn("h-full rounded-full", selectedServer.cpu > 90 ? "bg-rose-500" : "bg-emerald-500")}
                      />
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">{t('server.mem')}</div>
                    <div className="text-2xl font-mono font-bold text-white">{selectedServer.memory}%</div>
                    <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(selectedServer.memory, 100)}%` }}
                        className={cn("h-full rounded-full", selectedServer.memory > 90 ? "bg-rose-500" : "bg-emerald-500")}
                      />
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">{t('server.disk')}</div>
                    <div className="text-2xl font-mono font-bold text-white">{selectedServer.disk}%</div>
                    <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(selectedServer.disk, 100)}%` }}
                        className={cn("h-full rounded-full", selectedServer.disk > 90 ? "bg-rose-500" : "bg-emerald-500")}
                      />
                    </div>
                  </div>
                </div>

                {/* Command Execution */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Terminal size={14} className="text-slate-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('server.exec')}</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cmdText}
                      onChange={(e) => setCmdText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleExecCommand()}
                      placeholder="$ command"
                      className="flex-1 bg-black/60 border border-white/10 rounded-xl p-3 text-xs font-mono focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                    <button
                      onClick={handleExecCommand}
                      disabled={cmdLoading || !cmdText}
                      className="px-4 py-2 bg-orange-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all disabled:opacity-30"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                  {cmdResult && (
                    <div className="mt-3 p-4 rounded-xl bg-black/80 border border-white/5 font-mono text-[10px]">
                      {cmdResult.stdout && <pre className="text-emerald-400 whitespace-pre-wrap">{cmdResult.stdout}</pre>}
                      {cmdResult.stderr && <pre className="text-rose-400 whitespace-pre-wrap">{cmdResult.stderr}</pre>}
                      {cmdResult.error && <pre className="text-rose-400">{cmdResult.error}</pre>}
                      {cmdResult.code !== undefined && (
                        <div className="mt-2 text-slate-600">Exit code: {cmdResult.code}</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Tabs for Details */}
                <div className="flex border-b border-white/5 mb-6 overflow-x-auto no-scrollbar">
                  {['overview', 'users', 'processes', 'tasks', 'network', 'firewall', 'apps', 'web', 'health', 'backups', 'security', 'logs', 'neural'].map(t => (
                    <button
                      key={t}
                      onClick={() => setDetailTab(t as any)}
                      className={cn(
                        "px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap",
                        detailTab === t ? "border-orange-500 text-orange-500" : "border-transparent text-slate-500 hover:text-white"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {detailTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Command History */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <History size={14} className="text-slate-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('server.history')}</span>
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                        {commandHistory.map((h: any) => (
                          <div key={h.id} className="p-2 rounded-lg bg-white/[0.02] text-[10px] font-mono">
                            <span className="text-emerald-400">$</span>{' '}
                            <span className="text-slate-300">{h.command}</span>
                            <span className="text-slate-600 ml-2">• {new Date(h.timestamp).toLocaleTimeString()}</span>
                          </div>
                        ))}
                        {commandHistory.length === 0 && (
                          <p className="text-[10px] text-slate-600">{t('server.history.empty')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {detailTab === 'users' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Remote Users & Groups</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleFetchList('users')} className="text-[9px] font-black uppercase text-orange-500">Refresh</button>
                        <button onClick={() => { setDetailTab('neural'); setNeuralPrompt(`create a new user named "deploy" with bash shell`); }} className="text-[9px] font-black uppercase text-emerald-500">Add User</button>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-[10px] h-[300px] overflow-y-auto custom-scrollbar">
                      <pre className="text-slate-400 whitespace-pre-wrap">{listOutputs.users || "Click Refresh to load list..."}</pre>
                    </div>
                  </div>
                )}

                {detailTab === 'processes' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity size={14} className="text-slate-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Running Processes</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleFetchList('processes')} className="text-[9px] font-black uppercase text-orange-500">Refresh</button>
                        <button onClick={() => { setDetailTab('neural'); setNeuralPrompt(`kill process with pid `); }} className="text-[9px] font-black uppercase text-rose-500">Kill Process</button>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-[10px] h-[300px] overflow-y-auto custom-scrollbar">
                      <pre className="text-slate-400 whitespace-pre-wrap">{listOutputs.processes || "Click Refresh to load list..."}</pre>
                    </div>
                  </div>
                )}

                {detailTab === 'tasks' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scheduled Tasks</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleFetchList('tasks')} className="text-[9px] font-black uppercase text-orange-500">Refresh</button>
                        <button onClick={() => { setDetailTab('neural'); setNeuralPrompt(`schedule a new task that runs "echo hello" every day at 3am`); }} className="text-[9px] font-black uppercase text-emerald-500">Add Task</button>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-[10px] h-[300px] overflow-y-auto custom-scrollbar">
                      <pre className="text-slate-400 whitespace-pre-wrap">{listOutputs.tasks || "Click Refresh to load list..."}</pre>
                    </div>
                  </div>
                )}
                {detailTab === 'network' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe size={14} className="text-slate-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Network Interfaces & Routing</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleFetchList('network')} className="text-[9px] font-black uppercase text-orange-500">Refresh</button>
                        <button onClick={() => { setDetailTab('neural'); setNeuralPrompt(`configure static ip 192.168.1.100 on eth0`); }} className="text-[9px] font-black uppercase text-rose-500">Configure IP</button>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-[10px] h-[400px] overflow-y-auto custom-scrollbar">
                      <pre className="text-slate-400 whitespace-pre-wrap">{listOutputs.network || "Click Refresh to load list..."}</pre>
                    </div>
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400">
                      <AlertTriangle size={12} className="inline mr-2" />
                      <strong>WARNING:</strong> Network changes may disconnect your current session. Use static IPs with caution.
                    </div>
                  </div>
                )}

                {detailTab === 'firewall' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield size={14} className="text-slate-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Firewall Rules</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleFetchList('firewall')} className="text-[9px] font-black uppercase text-orange-500">Refresh</button>
                        <button onClick={() => { setDetailTab('neural'); setNeuralPrompt(`allow incoming traffic on port 8080 tcp`); }} className="text-[9px] font-black uppercase text-emerald-500">Add Rule</button>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-[10px] h-[400px] overflow-y-auto custom-scrollbar">
                      <pre className="text-slate-400 whitespace-pre-wrap">{listOutputs.firewall || "Click Refresh to load list..."}</pre>
                    </div>
                  </div>
                )}
                {detailTab === 'apps' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package size={14} className="text-slate-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Installed Packages</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleFetchList('packages')} className="text-[9px] font-black uppercase text-orange-500">Refresh</button>
                        <button onClick={() => { setDetailTab('neural'); setNeuralPrompt(`install nodejs and npm`); }} className="text-[9px] font-black uppercase text-emerald-500">Install App</button>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-[10px] h-[400px] overflow-y-auto custom-scrollbar">
                      <pre className="text-slate-400 whitespace-pre-wrap">{listOutputs.packages || "Click Refresh to load list..."}</pre>
                    </div>
                  </div>
                )}

                {detailTab === 'web' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layout size={14} className="text-slate-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Web Servers & Virtual Hosts</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleFetchList('webserver')} className="text-[9px] font-black uppercase text-orange-500">Refresh</button>
                        <button onClick={() => { setDetailTab('neural'); setNeuralPrompt(`create a new nginx virtual host for domain "example.com" pointing to "/var/www/html"`); }} className="text-[9px] font-black uppercase text-emerald-500">Add Site</button>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-[10px] h-[400px] overflow-y-auto custom-scrollbar">
                      <pre className="text-slate-400 whitespace-pre-wrap">{listOutputs.webserver || "Click Refresh to load list..."}</pre>
                    </div>
                  </div>
                )}

                {detailTab === 'health' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HeartPulse size={14} className="text-slate-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Disk Health & SMART</span>
                      </div>
                      <button onClick={() => handleFetchList('health')} className="text-[9px] font-black uppercase text-orange-500">Refresh</button>
                    </div>
                    <div className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-[10px] h-[400px] overflow-y-auto custom-scrollbar">
                      <pre className="text-slate-400 whitespace-pre-wrap">{listOutputs.health || "Click Refresh to load list..."}</pre>
                    </div>
                  </div>
                )}

                {detailTab === 'backups' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Save size={14} className="text-slate-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Backup Management</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleFetchList('backups')} className="text-[9px] font-black uppercase text-orange-500">Refresh</button>
                        <button onClick={() => { setDetailTab('neural'); setNeuralPrompt(`create a daily backup of /etc and /var/www to /backup`); }} className="text-[9px] font-black uppercase text-emerald-500">New Backup</button>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-[10px] h-[400px] overflow-y-auto custom-scrollbar">
                      <pre className="text-slate-400 whitespace-pre-wrap">{listOutputs.backups || "Click Refresh to load list..."}</pre>
                    </div>
                  </div>
                )}

                {detailTab === 'security' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* SSL Certificates */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Lock size={14} className="text-slate-500" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SSL Certificates</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleFetchList('ssl')} className="text-[9px] font-black uppercase text-orange-500">Refresh</button>
                            <button onClick={() => { setDetailTab('neural'); setNeuralPrompt(`renew ssl certificate for my-domain.com`); }} className="text-[9px] font-black uppercase text-emerald-500">Renew</button>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-[10px] h-[300px] overflow-y-auto custom-scrollbar">
                          <pre className="text-slate-400 whitespace-pre-wrap">{listOutputs.ssl || "Click Refresh to load SSL info..."}</pre>
                        </div>
                      </div>

                      {/* Security Audit */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldAlert size={14} className="text-slate-500" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Security Audit</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleFetchList('audit')} className="text-[9px] font-black uppercase text-orange-500">Run Audit</button>
                            <button onClick={() => { setDetailTab('neural'); setNeuralPrompt(`harden ssh: disable root login and change port to 2222`); }} className="text-[9px] font-black uppercase text-rose-500">Harden SSH</button>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-[10px] h-[300px] overflow-y-auto custom-scrollbar">
                          <pre className="text-slate-400 whitespace-pre-wrap">{listOutputs.audit || "Click Run Audit to scan..."}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {detailTab === 'logs' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Logs size={14} className="text-slate-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Logs</span>
                      </div>
                      <button 
                        onClick={handleFetchLogs}
                        className="text-[9px] font-black uppercase text-orange-500 hover:text-orange-400"
                      >
                        Refresh Logs
                      </button>
                    </div>
                    <div className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-[10px] h-[400px] overflow-y-auto custom-scrollbar">
                      {logLoading ? (
                        <div className="h-full flex items-center justify-center text-slate-600 animate-pulse italic">Fetching logs from server...</div>
                      ) : (
                        <pre className="text-slate-400 whitespace-pre-wrap">{serverLogs || "No logs fetched yet."}</pre>
                      )}
                    </div>
                  </div>
                )}

                {detailTab === 'neural' && (
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                      <div className="flex items-center gap-2 mb-4">
                        <Brain size={14} className="text-orange-500" />
                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Neural Script Generator</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-4 italic">
                        Describe what you want to do on this server (e.g., "list all docker containers" or "rotate system logs"). Saturn will generate and execute the appropriate script.
                      </p>
                      <div className="flex gap-2">
                        <select
                          value={selectedSkillId}
                          onChange={(e) => setSelectedSkillId(e.target.value)}
                          className="bg-black/60 border border-white/10 rounded-xl p-3 text-[10px] uppercase font-black tracking-widest text-orange-500 outline-none"
                        >
                          {skills.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={neuralPrompt}
                          onChange={(e) => setNeuralPrompt(e.target.value)}
                          placeholder="What would you like to do?"
                          className="flex-1 bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                        />
                        <button
                          onClick={handleExecuteNeuralScript}
                          disabled={neuralLoading || !neuralPrompt}
                          className="px-6 py-2 bg-orange-500 text-black text-xs font-black uppercase rounded-xl hover:bg-orange-400 disabled:opacity-30"
                        >
                          {neuralLoading ? 'Generating...' : 'Generate'}
                        </button>
                      </div>
                    </div>

                    {neuralResult && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="immersive-card p-6 border-orange-500/20"
                      >
                        <div className="text-xs font-bold text-white mb-2">{neuralResult.description}</div>
                        <pre className="p-4 bg-black/80 rounded-xl border border-white/10 text-[10px] text-emerald-400 font-mono mb-4 overflow-x-auto">
                          {neuralResult.script}
                        </pre>
                        <div className="space-y-2 mb-4">
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Identified Risks:</div>
                          {neuralResult.risks.map((r: string, i: number) => (
                            <div key={i} className="text-[10px] text-rose-400 flex items-center gap-2">
                              <AlertTriangle size={10} /> {r}
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={handleExecuteNeuralScript}
                          disabled={cmdLoading}
                          className="w-full py-3 bg-emerald-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-400"
                        >
                          {cmdLoading ? 'Executing...' : 'Approve & Execute'}
                        </button>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Incidents */}
        {activeTab === 'incidents' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-lg font-black text-white uppercase tracking-widest mb-6">{t('nav.incidents')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incidents.map(inc => (
                <IncidentCard key={inc.id} incident={inc} onAnalyze={() => handleAnalyze(inc.id)} onResolve={handleResolveIncident} t={t} />
              ))}
              {incidents.length === 0 && (
                <div className="col-span-2 p-12 text-center">
                  <CheckCircle2 size={32} className="mx-auto mb-4 text-emerald-500" />
                  <p className="text-sm text-slate-500">{t('incidents.none')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Terminal */}
        {activeTab === 'terminal' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-lg font-black text-white uppercase tracking-widest mb-6">{t('nav.terminal')}</h2>
            <div className="immersive-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Terminal size={14} className="text-slate-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('terminal.global')}</span>
              </div>
              <div className="flex gap-2 mb-4">
                <select
                  value={selectedServer?.id || ''}
                  onChange={(e) => setSelectedServer(servers.find(s => s.id === e.target.value) || null)}
                  className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                >
                  <option value="">{t('terminal.select')}</option>
                  {servers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.ip})</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={cmdText}
                  onChange={(e) => setCmdText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExecCommand()}
                  placeholder="$ command"
                  className="flex-1 bg-black/60 border border-white/10 rounded-xl p-3 text-xs font-mono focus:ring-1 focus:ring-orange-500 outline-none"
                />
                <button
                  onClick={handleExecCommand}
                  disabled={cmdLoading || !cmdText || !selectedServer}
                  className="px-4 py-2 bg-orange-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all disabled:opacity-30"
                >
                  <Send size={14} />
                </button>
              </div>
              {cmdResult && (
                <div className="p-4 rounded-xl bg-black/80 border border-white/5 font-mono text-[10px] max-h-96 overflow-y-auto custom-scrollbar">
                  {cmdResult.stdout && <pre className="text-emerald-400 whitespace-pre-wrap">{cmdResult.stdout}</pre>}
                  {cmdResult.stderr && <pre className="text-rose-400 whitespace-pre-wrap">{cmdResult.stderr}</pre>}
                  {cmdResult.error && <pre className="text-rose-400">{cmdResult.error}</pre>}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Credentials */}
        {activeTab === 'credentials' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-widest mb-1">Cloud Credentials</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Manage AWS, GCP and Azure authentication</p>
              </div>
              <button 
                onClick={() => setShowImportModal(true)}
                className="px-6 py-2.5 bg-white text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2"
              >
                <Plus size={14} /> Import Credential
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cloudCreds.map(cred => (
                <CredentialCard 
                  key={cred.id} 
                  cred={cred} 
                  onDelete={handleDeleteCredential}
                  onScan={handleCloudScan}
                />
              ))}
              {cloudCreds.length === 0 && (
                <div className="col-span-3 p-12 text-center immersive-card border-dashed border-2 border-white/5">
                  <Key size={32} className="mx-auto mb-4 text-slate-700" />
                  <p className="text-sm text-slate-500 uppercase tracking-widest font-black">No credentials found</p>
                  <p className="text-[10px] text-slate-600 mt-2 italic">Import your first cloud account to discover servers</p>
                </div>
              )}
            </div>

            {/* Import Modal */}
            {showImportModal && (
              <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg immersive-card p-8">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">Import Cloud Credential</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Name</label>
                        <input
                          type="text"
                          value={importData.name}
                          onChange={e => setImportData({...importData, name: e.target.value})}
                          placeholder="e.g. AWS Production"
                          className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Provider</label>
                        <select
                          value={importData.provider}
                          onChange={e => setImportData({...importData, provider: e.target.value})}
                          className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs outline-none"
                        >
                          <option value="aws">AWS</option>
                          <option value="gcp">Google Cloud</option>
                          <option value="azure">Azure</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Credential Content (JSON / PEM / AccessKey)</label>
                      <textarea
                        value={importData.content}
                        onChange={e => setImportData({...importData, content: e.target.value})}
                        rows={6}
                        placeholder="Paste your credential file content here..."
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs font-mono outline-none focus:border-orange-500"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button 
                        onClick={() => setShowImportModal(false)}
                        className="flex-1 py-3 border border-white/10 text-white text-[10px] font-black uppercase rounded-xl hover:bg-white/5"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleImportCredential}
                        className="flex-1 py-3 bg-orange-500 text-black text-[10px] font-black uppercase rounded-xl hover:bg-orange-400"
                      >
                        Save & Encrypt
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}

        {/* Audit */}
        {activeTab === 'audit' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-lg font-black text-white uppercase tracking-widest mb-6">{t('nav.audit')}</h2>
            <div className="immersive-card overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                <Logs size={12} /> {t('audit.logs')}
              </div>
              <div className="divide-y divide-slate-800">
                {auditLogs.map(log => (
                  <div key={log.id} className="p-4 flex items-start gap-3">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full mt-1.5",
                      log.type === 'SYSTEM' ? "bg-sky-500" :
                      log.type === 'NEURAL' ? "bg-purple-500" :
                      log.type === 'USER' ? "bg-orange-500" : "bg-slate-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold text-white uppercase">{log.event}</span>
                        <span className="text-[9px] text-slate-600 font-mono">{log.type}</span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{log.detail}</p>
                      <p className="text-[9px] text-slate-600 mt-1 font-mono">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-sm text-slate-500">{t('audit.empty')}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* User Management Content */}
        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-8"
          >
            <UserManager t={t} />
          </motion.div>
        )}
      </main>

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md immersive-card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">{t('connect.title')}</h3>
              <button onClick={() => setShowConnectModal(false)} className="text-slate-500 hover:text-white">
                <XCircle size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">{t('connect.host')}</label>
                  <input
                    type="text"
                    value={connHost}
                    onChange={(e) => setConnHost(e.target.value)}
                    placeholder="192.168.1.100"
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">{t('connect.port')}</label>
                  <input
                    type="text"
                    value={connPort}
                    onChange={(e) => setConnPort(e.target.value)}
                    placeholder="22"
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">{t('connect.user')}</label>
                <input
                  type="text"
                  value={connUser}
                  onChange={(e) => setConnUser(e.target.value)}
                  placeholder="root"
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">{t('connect.key')}</label>
                <textarea
                  value={connKey}
                  onChange={(e) => setConnKey(e.target.value)}
                  placeholder="Paste private key or leave empty for password"
                  rows={3}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs font-mono focus:ring-1 focus:ring-orange-500 outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">{t('connect.pass')}</label>
                <input
                  type="password"
                  value={connPass}
                  onChange={(e) => setConnPass(e.target.value)}
                  placeholder="Or password"
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>
              {connError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[10px] text-rose-400">
                  {connError}
                </div>
              )}
              <button
                onClick={handleConnect}
                disabled={connLoading || !connHost || !connUser}
                className="w-full py-3.5 bg-orange-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {connLoading ? (
                  <><RefreshCw size={14} className="animate-spin" /> Connecting...</>
                ) : (
                  <><Plug size={14} /> {t('connect.btn')}</>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg immersive-card p-6 max-h-[80vh] overflow-y-auto custom-scrollbar"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">{t('settings.title')}</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white">
                <XCircle size={16} />
              </button>
            </div>

            {/* AI Configuration */}
            <div className="mb-6">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Brain size={12} /> {t('settings.ai')}
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">{t('settings.provider')}</label>
                  <select
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="ollama">Ollama (Local)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">{t('settings.apiKey')}</label>
                  <input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder="API Key"
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiDeepVerify}
                    onChange={(e) => setAiDeepVerify(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-black/60 accent-orange-500"
                  />
                  <span className="text-xs text-slate-400">{t('settings.deepVerify')}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiAutoRemediate}
                    onChange={(e) => setAiAutoRemediate(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-black/60 accent-orange-500"
                  />
                  <span className="text-xs text-slate-400">{t('settings.autoRemediate')}</span>
                </label>
                <button
                  onClick={handleAiConfigSave}
                  className="w-full py-3 bg-orange-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all"
                >
                  {t('settings.save')}
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Bell size={12} /> {t('settings.notifications')}
              </h4>
              <div className="space-y-2">
                {notifications.map(n => (
                  <div key={n.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">{n.type}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{n.destination}</div>
                    </div>
                    <div className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                      n.enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-500"
                    )}>
                      {n.enabled ? 'ON' : 'OFF'}
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <p className="text-xs text-slate-500">{t('settings.notifications.none')}</p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
