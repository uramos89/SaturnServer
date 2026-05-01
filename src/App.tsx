import React, { useState, useEffect, useCallback } from 'react';
import { 
  Server, Activity, Database, Brain, ShieldCheck, AlertTriangle, Terminal, 
  ChevronRight, ChevronLeft, Cpu, HardDrive, RefreshCw, Search, Bell, Settings, 
  LayoutDashboard, Logs, CheckCircle2, XCircle, Mail, Zap, Plug, Unplug, 
  TerminalSquare, History, Globe, Key, Wifi, User, Lock, Eye, EyeOff, Send, 
  LogOut, Menu, Trash2, Folder, FileText, Play, Plus, Trash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import type { ManagedServer, Incident, AuditLog, NotificationConfig, AIConfig, SshConnection } from './lib/types';
import { t, Language } from './lib/i18n';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
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
const ServerCard = ({ server, onClick }: { server: ManagedServer, onClick: () => void }) => (
  <motion.div 
    whileHover={{ y: -4 }}
    onClick={onClick}
    className="p-5 rounded-2xl bg-black/40 border border-white/5 hover:border-orange-500/30 transition-all cursor-pointer group"
  >
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
    <h3 className="text-xs font-black uppercase tracking-widest text-white mb-1 truncate">{server.name}</h3>
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
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(() => {
    const saved = localStorage.getItem('saturn-user');
    return saved ? JSON.parse(saved) : null;
  });

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
          fetch('/api/servers'), fetch('/api/incidents'), fetch('/api/audit'), fetch('/api/notifications'),
          fetch('/api/ai/config'), fetch('/api/ssh/connections'), fetch('/api/credentials'), fetch('/api/skills'),
          fetch('/api/remediation/config'), fetch('/api/proactive'), fetch('/api/contextp/files')
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
      } catch {} finally { setLoading(false); }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [onboarding]);

  const handleLogin = (u: UserData) => { setUser(u); localStorage.setItem('saturn-user', JSON.stringify(u)); };
  const handleLogout = () => { setUser(null); localStorage.removeItem('saturn-user'); };

  const handleUpdateRemediationMode = async (serverId: string | null, mode: string) => {
    try {
      await fetch('/api/remediation/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: serverId || 'global', mode })
      });
      const res = await fetch('/api/remediation/config');
      const configs = await res.json();
      setRemediationConfigs(configs);
      if (!serverId || serverId === 'global') setGlobalConfig(configs.find((c: any) => c.serverId === 'global'));
    } catch {}
  };

  const SidebarItem = ({ id, label, icon: Icon }: any) => (
    <button onClick={() => { setActiveTab(id); setMobileMenuOpen(false); }}
      className={cn("flex items-center gap-3 w-full p-3 rounded-xl transition-all group", activeTab === id ? "bg-orange-500/10 text-orange-400" : "text-slate-500 hover:text-white hover:bg-white/5")}>
      <Icon size={20} className={cn("transition-transform group-hover:scale-110", activeTab === id ? "text-orange-500" : "text-slate-500")} />
      {(!sidebarCollapsed || mobileMenuOpen) && <span className="text-xs font-black uppercase tracking-widest">{label}</span>}
    </button>
  );

  const DashboardView = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title={t('stats.total')} value={servers.length} icon={Server} color="text-blue-500" />
        <StatCard title={t('stats.online')} value={servers.filter(s => s.status === 'online').length} icon={CheckCircle2} color="text-emerald-500" />
        <StatCard title={t('stats.incidents')} value={incidents.filter(i => i.status === 'open').length} icon={AlertTriangle} color="text-rose-500" />
        <StatCard title="SSH Connected" value={sshConnections.filter(c => c.status === 'connected').length} icon={Zap} color="text-orange-500" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Recent Servers</h2>
              <button onClick={() => setActiveTab('servers')} className="text-[10px] font-black uppercase text-orange-500 hover:underline">View All</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {servers.slice(0, 4).map(s => <ServerCard key={s.id} server={s} onClick={() => { setSelectedServer(s); setServerDetailTab('summary'); setActiveTab('servers'); }} />)}
            </div>
          </section>
        </div>
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Open Incidents</h2>
            <div className="space-y-3">
              {incidents.filter(i => i.status === 'open').length > 0 ? (
                incidents.filter(i => i.status === 'open').slice(0, 5).map(inc => <IncidentCard key={inc.id} incident={inc} onAnalyze={() => {}} onResolve={() => {}} t={t} />)
              ) : <div className="p-8 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-center"><p className="text-[10px] font-black uppercase text-emerald-500">All clear</p></div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  const ServersListView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} /><input type="text" placeholder="Filter..." className="bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-orange-500 outline-none w-64" /></div><button className="px-4 py-2 bg-orange-500 text-black text-xs font-black uppercase tracking-widest rounded-xl">Add Server</button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{servers.map(s => <ServerCard key={s.id} server={s} onClick={() => { setSelectedServer(s); setServerDetailTab('summary'); }} />)}</div>
    </div>
  );

  const ServerDetailView = () => {
    const tabs = [{ id: 'summary', label: 'Summary', icon: LayoutDashboard }, { id: 'system', label: 'System', icon: Cpu }, { id: 'network', label: 'Network', icon: Globe }, { id: 'security', label: 'Security', icon: ShieldCheck }, { id: 'backups', label: 'Backups', icon: Database }, { id: 'tasks', label: 'Tasks', icon: Logs }, { id: 'terminal', label: 'Terminal', icon: Terminal }];
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/40 border border-white/5 p-6 rounded-2xl"><div className="flex items-center gap-4"><button onClick={() => setSelectedServer(null)} className="p-2 text-slate-500 hover:text-white bg-white/5 rounded-xl"><ChevronLeft className="" size={18} /></button><div><div className="flex items-center gap-2 mb-1"><h2 className="text-sm font-black uppercase tracking-widest">{selectedServer?.name}</h2><div className={cn("w-2 h-2 rounded-full animate-pulse", selectedServer?.status === 'online' ? "bg-emerald-500" : "bg-rose-500")} /></div><p className="text-[10px] font-medium text-slate-500 uppercase">{selectedServer?.ip} • {selectedServer?.os}</p></div></div><div className="flex items-center gap-3"><button className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-300 text-[10px] font-black uppercase rounded-xl"><RefreshCw size={14} /> Sync</button><select value={remediationConfigs.find(c => c.serverId === selectedServer?.id)?.mode || 'global'} onChange={(e) => handleUpdateRemediationMode(selectedServer!.id, e.target.value)} className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-orange-500 outline-none"><option value="global">Mode: Global</option><option value="auto">Mode: Auto</option><option value="skill">Mode: Skill</option><option value="manual">Mode: Manual</option></select></div></div>
        <div className="flex items-center gap-1 overflow-x-auto pb-2 custom-scrollbar">{tabs.map(t => <button key={t.id} onClick={() => setServerDetailTab(t.id)} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", serverDetailTab === t.id ? "bg-orange-500 text-black" : "text-slate-500 hover:text-white hover:bg-white/5")}><t.icon size={14} /> {t.label}</button>)}</div>
        <div className="min-h-[500px]">{serverDetailTab === 'summary' && <ServerSummaryTab />} {serverDetailTab !== 'summary' && <div className="p-12 text-center text-slate-500 italic uppercase text-[10px] font-black tracking-widest">{serverDetailTab} loading...</div>}</div>
      </div>
    );
  };

  const ServerSummaryTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8"><div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[{ label: 'CPU', value: selectedServer?.cpu + '%', icon: Cpu }, { label: 'RAM', value: selectedServer?.memory + '%', icon: Database }, { label: 'Disk', value: '45%', icon: HardDrive }, { label: 'Uptime', value: '12d', icon: Activity }].map(m => <div key={m.label} className="p-4 rounded-2xl bg-black/40 border border-white/5"><div className="flex items-center gap-2 mb-2 text-slate-500"><m.icon size={12} /><span className="text-[9px] font-black uppercase">{m.label}</span></div><p className="text-xl font-black">{m.value}</p></div>)}</div><div className="p-6 rounded-2xl bg-orange-500/5 border border-orange-500/10"><div className="flex items-center gap-2 mb-4"><Brain size={16} className="text-orange-500" /><h3 className="text-[10px] font-black uppercase text-orange-500">Neural Remediation</h3></div><div className="flex gap-2"><input type="text" placeholder="Prompt..." className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none" /><button className="px-6 py-3 bg-orange-500 text-black text-[10px] font-black uppercase rounded-xl">Run</button></div></div></div>
      <div className="space-y-6"><div className="p-6 rounded-2xl bg-black/40 border border-white/5"><div className="flex items-center gap-2 mb-4"><History size={14} className="text-slate-500" /><h3 className="text-[10px] font-black uppercase text-slate-500">ContextP Insights</h3></div><div className="space-y-4">{[{ t: 'FIX', d: '2h', i: 'SSH' }, { t: 'AUD', d: '5h', i: 'Root' }].map((i, x) => <div key={x} className="flex gap-3 text-[10px]"><div className="w-1 h-1 rounded-full bg-orange-500 mt-1" /><div><p className="font-black text-slate-300 uppercase">{i.i}</p><p className="text-[8px] text-slate-600 uppercase">{i.t} • {i.d}</p></div></div>)}</div><button onClick={() => setActiveTab('contextp')} className="w-full mt-6 py-2 border border-white/5 rounded-xl text-[9px] font-black uppercase text-slate-500">Explore Memory</button></div></div>
    </div>
  );

  const ProactiveView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><Zap className="text-orange-500" size={20} /><h2 className="text-sm font-black uppercase tracking-[0.2em]">Proactive</h2></div><button className="px-4 py-2 bg-orange-500 text-black text-[10px] font-black uppercase rounded-xl">New</button></div><div className="grid grid-cols-1 gap-4">{proactiveActivities.map(a => <div key={a.id} className="p-6 rounded-2xl bg-black/40 border border-white/5 flex justify-between items-center"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500"><Activity size={18} /></div><div><p className="text-[10px] font-black uppercase text-white">{a.name}</p><p className="text-[8px] font-medium text-slate-500 uppercase">{a.condition} • {a.schedule}</p></div></div><div className={cn("px-3 py-1 rounded-lg text-[8px] font-black uppercase", a.enabled ? "bg-emerald-500/10 text-emerald-500" : "bg-white/5 text-slate-600")}>{a.enabled ? 'Active' : 'Paused'}</div></div>)}</div></div>
  );

  const SkillsView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><Brain className="text-orange-500" size={20} /><h2 className="text-sm font-black uppercase tracking-[0.2em]">Skills</h2></div><button className="px-4 py-2 bg-white/5 text-slate-300 text-[10px] font-black uppercase rounded-xl">Add</button></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{skills.map(s => <div key={s.id} className="p-6 rounded-2xl bg-black/40 border border-white/5 hover:border-orange-500/30 group"><h3 className="text-xs font-black uppercase mb-1">{s.name}</h3><p className="text-[10px] text-slate-500 mb-6">{s.description}</p><div className="flex justify-between pt-4 border-t border-white/5 text-[8px] font-black uppercase text-slate-600"><span>{s.language}</span><button className="text-orange-500">Manage</button></div></div>)}</div></div>
  );

  const CredentialsView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><Key className="text-orange-500" size={20} /><h2 className="text-sm font-black uppercase tracking-[0.2em]">Vault</h2></div><button className="px-4 py-2 bg-orange-500 text-black text-[10px] font-black uppercase rounded-xl">Import</button></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{cloudCreds.map(c => <div key={c.id} className="p-4 rounded-2xl bg-black/40 border border-white/5 flex gap-3 items-center"><div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500"><ShieldCheck size={18} /></div><div><p className="text-[10px] font-black uppercase text-slate-300">{c.name}</p><p className="text-[8px] font-medium text-slate-500 uppercase">{c.provider} • {c.type}</p></div></div>)}</div></div>
  );

  const ContextPView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><Database className="text-orange-500" size={20} /><h2 className="text-sm font-black uppercase tracking-[0.2em]">Memory</h2></div></div><div className="grid grid-cols-1 lg:grid-cols-4 gap-8"><div className="lg:col-span-1 bg-black/40 border border-white/5 rounded-2xl p-4 overflow-y-auto max-h-[600px] custom-scrollbar">{contextPFiles.map((n, i) => <div key={i} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 flex items-center gap-2"><Database size={14} className="text-orange-500/50" /><span className="text-[10px] font-black uppercase">{n.name}</span></div>)}</div><div className="lg:col-span-3 bg-black/60 border border-white/5 rounded-2xl p-8 text-center"><Brain size={48} className="text-slate-800 mx-auto mb-4" /><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Select a file to analyze</p></div></div></div>
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
          <SidebarItem id="skills" label="Skills" icon={Brain} />
          <SidebarItem id="proactive" label="Proactive" icon={Zap} />
          <SidebarItem id="credentials" label="Credentials" icon={Key} />
          <SidebarItem id="contextp" label="ContextP" icon={Database} />
          <SidebarItem id="settings" label="Settings" icon={Settings} />
          <SidebarItem id="admin" label="Admin" icon={User} />
        </nav>
        <div className="p-4 border-t border-white/5 space-y-4"><div className="flex items-center gap-3 px-3"><div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-black font-black text-[10px]">{user.username.charAt(0).toUpperCase()}</div>{(!sidebarCollapsed || mobileMenuOpen) && <div className="flex-1 min-w-0"><p className="text-[10px] font-black uppercase text-white truncate">{user.username}</p><p className="text-[8px] font-medium text-slate-500 truncate">{user.role}</p></div>}</div><button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all"><Unplug size={18} />{(!sidebarCollapsed || mobileMenuOpen) && <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>}</button></div>
      </aside>
      <main className={cn("flex-1 flex flex-col min-w-0 transition-all duration-300", sidebarCollapsed ? "lg:ml-20" : "lg:ml-64")}>
        <header className="h-16 border-b border-white/5 bg-black/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50"><div className="flex items-center gap-4"><button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-slate-500 hover:text-white"><Menu size={20} /></button><h1 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{activeTab} <span className="text-white/20 mx-2">/</span> <span className="text-white">{selectedServer ? selectedServer.name : 'Overview'}</span></h1></div><div className="flex items-center gap-6"><div className="hidden sm:flex bg-black/40 border border-white/10 p-1 rounded-xl">{['auto', 'skill', 'manual'].map(m => <button key={m} onClick={() => handleUpdateRemediationMode(null, m)} className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", globalConfig.mode === m ? "bg-orange-500/10 text-orange-400" : "text-slate-600 hover:text-slate-400")}>{m}</button>)}</div><div className="flex items-center gap-3"><div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg"><div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /><span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Neural Live</span></div></div></div></header>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'servers' && !selectedServer && <ServersListView />}
          {activeTab === 'servers' && selectedServer && <ServerDetailView />}
          {activeTab === 'skills' && <SkillsView />}
          {activeTab === 'proactive' && <ProactiveView />}
          {activeTab === 'credentials' && <CredentialsView />}
          {activeTab === 'contextp' && <ContextPView />}
        </div>
      </main>
    </div>
  );
}
