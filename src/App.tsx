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
  Wifi
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
  models: string[];
}

interface ConfiguredProvider {
  id: string;
  name: string;
  provider: string;
  model: string;
  enabled: number;
}

// ── Onboarding Wizard ──────────────────────────────────────────────────
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

  useEffect(() => {
    fetch('/api/ai/providers')
      .then(r => r.json())
      .then(data => {
        setProviders(data.providers);
        setConfigured(data.configured);
        if (data.configured.length > 0) {
          setSaved(true);
        }
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
        setTimeout(onComplete, 1000);
      } else {
        setError(data.error || 'Failed to configure');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const provider = providers.find(p => p.id === selectedProvider);

  if (saved) {
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
      <div className="text-center mb-12">
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

      {/* Step indicator */}
      <div className="flex justify-center gap-2 mb-12">
        {[0, 1].map(i => (
          <div key={i} className={cn(
            "h-1 w-24 rounded-full transition-all duration-500",
            step >= i ? "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" : "bg-white/10"
          )} />
        ))}
      </div>

      {/* Step 0: Provider Selection */}
      {step === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-lg font-black text-white uppercase tracking-widest mb-2">
            {t('onboarding.select')}
          </h2>
          <p className="text-xs text-slate-500 mb-8">{t('onboarding.select.desc')}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map(p => (
              <motion.button
                key={p.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setSelectedProvider(p.id); setSelectedModel(''); }}
                className={cn(
                  "p-5 rounded-2xl border text-left transition-all",
                  selectedProvider === p.id
                    ? "bg-orange-500/10 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.1)]"
                    : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
                    selectedProvider === p.id ? "bg-orange-500/20 text-orange-500" : "bg-white/5 text-slate-400"
                  )}>
                    {p.name.charAt(0)}
                  </div>
                  {configured.some(c => c.provider === p.id) && (
                    <span className="text-[9px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase font-black">
                      {t('onboarding.configured')}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{p.name}</h3>
                <p className="text-[10px] text-slate-500 font-mono">{p.models.length} models</p>
              </motion.button>
            ))}
          </div>

          <div className="flex justify-end mt-8">
            <button
              onClick={() => setStep(1)}
              disabled={!selectedProvider}
              className="px-8 py-3 bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {t('onboarding.next')} →
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 1: Model & API Key */}
      {step === 1 && provider && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setStep(0)} className="text-slate-500 hover:text-white transition-colors">
              ← {t('onboarding.back')}
            </button>
            <h2 className="text-lg font-black text-white uppercase tracking-widest">
              {provider.name}
            </h2>
          </div>

          <div className="space-y-6">
            {/* Model Selection */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
                {t('onboarding.model')}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {provider.models.map(m => (
                  <button
                    key={m}
                    onClick={() => setSelectedModel(m)}
                    className={cn(
                      "p-3 rounded-xl border text-xs font-mono transition-all text-left",
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
              <p className="text-[9px] text-slate-600 mt-2">{t('onboarding.apiKey.desc')}</p>
            </div>

            {/* Endpoint (for self-hosted) */}
            {(provider.id === 'ollama' || provider.id === 'vllm' || provider.id === 'localai' || provider.id === 'custom') && (
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

            <button
              onClick={handleConfigure}
              disabled={!selectedModel || saving}
              className="w-full py-4 bg-orange-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {saving ? (
                <><RefreshCw size={14} className="animate-spin" /> {t('onboarding.saving')}</>
              ) : (
                <><Zap size={14} /> {t('onboarding.start')}</>
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
        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${server.cpu}%` }}
            className={cn("h-full", server.cpu > 80 ? "bg-rose-500" : "bg-emerald-500")}
          />
        </div>
      </div>
      <div className="hidden md:flex flex-col gap-1 w-24">
        <div className="flex justify-between text-[10px] text-slate-500 uppercase">
          <span>{t('server.mem')}</span>
          <span>{server.memory}%</span>
        </div>
        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${server.memory}%` }}
            className={cn("h-full", server.memory > 80 ? "bg-rose-500" : "bg-emerald-500")}
          />
        </div>
      </div>
      <div className="flex gap-1">
        {server.tags.map(tag => (
          <span key={tag} className="text-[10px] border border-slate-700 px-1.5 py-0.5 rounded text-slate-500">
            {tag}
          </span>
        ))}
      </div>
      <ChevronRight size={16} className="text-slate-600" />
    </div>
  </motion.div>
);

// ── OBPA Visualizer ────────────────────────────────────────────────────
const OBPA_Visualizer = ({ incident, onComplete, t }: { incident: Incident, onComplete: () => void, t: (k: string) => string }) => {
  const [step, setStep] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [proposal, setProposal] = useState<any>(null);
  const [obpaId, setObpaId] = useState<string | null>(null);

  const steps = [
    { id: 'OBSERVE', label: t('obpa.observe'), icon: Activity },
    { id: 'PROPOSE', label: t('obpa.propose'), icon: Brain },
    { id: 'EXECUTE', label: t('obpa.execute'), icon: Terminal },
    { id: 'APPROVE', label: t('obpa.approve'), icon: Settings },
    { id: 'BITACORA', label: t('obpa.bitacora'), icon: ShieldCheck },
    { id: 'CONSOLIDATE', label: t('obpa.consolidate'), icon: Database },
  ];

  const runAnalysis = async () => {
    setIsProcessing(true);
    setLog([`[ARES] Initiating OBPA Neural Cycle...`, `[ARES] Analyzing incident: ${incident.id}`]);
    
    try {
      for (let i = 0; i < 3; i++) {
        setStep(i);
        setLog(prev => [...prev, `[ARES] [${steps[i].id}] ${steps[i].label} in progress...`]);
        await new Promise(r => setTimeout(r, 800));
      }

      const res = await fetch('/api/neural/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: incident.id })
      });
      const data = await res.json();
      setProposal(data.analysis);
      setObpaId(data.obpaId);
      
      setLog(prev => [
        ...prev, 
        `[ARES] Analysis Complete. Confidence: ${(data.analysis.confidence * 100).toFixed(2)}%`,
        `[ARES] Proposed Fix: ${data.analysis.proposal}`,
        `[ARES] ${t('obpa.waiting')}`
      ]);
      setStep(3);
    } catch (err) {
      setLog(prev => [...prev, '[ARES] Error in Neural Core processing.']);
    } finally {
      setIsProcessing(false);
    }
  };

  const approveRemediation = async (approved: boolean) => {
    if (!obpaId) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/obpa/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obpaId, approved })
      });
      
      if (approved) {
        setLog(prev => [...prev, `[USER] ${t('obpa.approved')}`]);
        for (let i = 4; i < steps.length; i++) {
          setStep(i);
          setLog(prev => [...prev, `[ARES] [${steps[i].id}] ${steps[i].label} complete.`]);
          await new Promise(r => setTimeout(r, 800));
        }
        setLog(prev => [...prev, `[SATURN] ${t('obpa.finalized')}`]);
        setTimeout(onComplete, 1500);
      } else {
        setLog(prev => [...prev, `[USER] ${t('obpa.rejected')}`]);
        setTimeout(onComplete, 1500);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, [incident.id]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] italic">{t('obpa.title')}</h3>
        </div>
        <div className="flex gap-2">
          {steps.map((s, i) => (
            <div 
              key={s.id}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-500",
                step >= i ? "bg-orange-500 shadow-[0_0_10px_#f97316]" : "bg-white/5"
              )}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          {steps.map((s, i) => (
            <motion.div 
              key={s.id}
              initial={{ scale: 0.95, opacity: 0.5 }}
              animate={{ 
                scale: step === i ? 1.05 : 1, 
                opacity: step === i ? 1 : 0.6,
                borderColor: step === i ? '#f97316' : 'rgba(255,255,255,0.05)'
              }}
              className={cn(
                "flex items-center gap-4 p-3 rounded-xl border bg-black/40 transition-all",
                step === i ? "border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.1)]" : "border-white/5"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                step >= i ? "bg-orange-500/20 text-orange-400" : "bg-white/5 text-slate-600"
              )}>
                <s.icon size={18} />
              </div>
              <div className="flex-1">
                <div className="text-[9px] font-black uppercase tracking-widest leading-none mb-1">{s.id}</div>
                <div className="text-[10px] text-slate-500 uppercase font-bold">{s.label}</div>
              </div>
              {step > i && <ShieldCheck size={16} className="text-emerald-500" />}
            </motion.div>
          ))}
          
          {step === 3 && proposal && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl"
            >
              <h4 className="text-[10px] font-black text-orange-500 uppercase flex items-center gap-2 mb-2">
                <Brain size={14} /> {t('obpa.action')}
              </h4>
              <p className="text-xs text-white mb-4 italic leading-relaxed">"{proposal.proposal}"</p>
              <div className="bg-black/60 p-2 rounded font-mono text-[9px] text-emerald-500 mb-4 whitespace-pre-wrap">
                {proposal.remediation_script}
              </div>
              <div className="flex gap-2">
                <button 
                  disabled={isProcessing}
                  onClick={() => approveRemediation(true)}
                  className="flex-1 py-1.5 bg-orange-500 text-black text-[10px] font-black uppercase rounded hover:bg-orange-400 disabled:opacity-50"
                >
                  {t('obpa.confirm')}
                </button>
                <button 
                   disabled={isProcessing}
                   onClick={() => approveRemediation(false)}
                   className="flex-1 py-1.5 bg-white/5 text-white text-[10px] font-black uppercase rounded hover:bg-white/10 disabled:opacity-50"
                >
                  {t('obpa.reject')}
                </button>
              </div>
            </motion.div>
          )}
        </div>

        <div className="bg-black/80 rounded-2xl border border-white/5 p-5 font-mono text-[10px] h-[400px] overflow-y-auto no-scrollbar shadow-inner">
          <div className="flex items-center justify-between mb-4 text-slate-500 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Terminal size={14} />
              <span className="font-bold tracking-widest uppercase">Saturn_Ares_Output</span>
            </div>
            <span className="text-[9px]">{t('neural.version')}</span>
          </div>
          {log.map((line, i) => (
            <div key={i} className="mb-2 leading-relaxed">
              <span className={cn(
                "mr-2 font-bold",
                line.includes('[ARES]') ? "text-orange-500" : "text-slate-600"
              )}>
                {'>'}
              </span>
              <span className={cn(
                line.includes('Error') ? "text-rose-400" : 
                line.includes('finalized') ? "text-emerald-400 font-bold" : "text-slate-400"
              )}>
                {line}
              </span>
            </div>
          ))}
          {isProcessing && (
            <motion.div 
              animate={{ opacity: [0, 1] }} 
              transition={{ repeat: Infinity, duration: 1 }}
              className="inline-block w-1.5 h-3 bg-orange-500 ml-1 translate-y-0.5"
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main App ───────────────────────────────────────────────────────────
export default function App() {
  const { lang, setLang, t: _t } = useLang();
  const t = _t;

  const [servers, setServers] = useState<ManagedServer[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifConfigs, setNotifConfigs] = useState<NotificationConfig[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<Incident | null>(null);
  const [activeTab, setActiveTab] = useState<'dash' | 'servers' | 'knowledge' | 'audit' | 'settings'>('dash');
  const [isLoading, setIsLoading] = useState(true);
  const [sshModal, setSshModal] = useState(false);
  const [sshConnections, setSshConnections] = useState<SshConnection[]>([]);
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'none',
    apiKey: '',
    deepVerify: true,
    autoRemediate: false
  });
  const [aiSaved, setAiSaved] = useState(false);
  const [aiEndpoint, setAiEndpoint] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // SSH Form state
  const [sshForm, setSshForm] = useState({ host: '', port: '22', username: 'root', password: '', keyFile: '' });

  const fetchData = async () => {
    try {
      const [sRes, iRes, kRes, aRes, nRes, aiRes] = await Promise.all([
        fetch('/api/servers'),
        fetch('/api/incidents'),
        fetch('/api/contextp'),
        fetch('/api/audit'),
        fetch('/api/notifications'),
        fetch('/api/ai/config').catch(() => null)
      ]);
      setServers(await sRes.json());
      setIncidents(await iRes.json());
      setKnowledge(await kRes.json());
      setAuditLogs(await aRes.json());
      setNotifConfigs(await nRes.json());
      if (aiRes) {
        const aiData = await aiRes.json();
        setAiConfig(aiData);
        // Show onboarding if no AI provider is configured
        if (!aiData.configured) {
          setShowOnboarding(true);
        }
      }
      setIsLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────
  const saveNotifConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
       type: formData.get('type'),
       destination: formData.get('destination'),
       enabled: true,
       config: {}
    };
    await fetch('/api/notifications/config', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(data)
    });
    fetchData();
  };

  const saveAiConfig = async () => {
    try {
      await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiConfig)
      });
      setAiSaved(true);
      setTimeout(() => setAiSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save AI config:', err);
    }
  };

  const triggerIncident = async () => {
    const randomServer = servers[Math.floor(Math.random() * servers.length)];
    if (!randomServer) return;
    await fetch('/api/incidents/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serverId: randomServer.id,
        title: "High Latency Detected",
        description: `CPU spikes detected on ${randomServer.name}. Possible memory leak in nginx process.`,
        severity: "high"
      })
    });
    fetchData();
  };

  const connectSsh = async () => {
    try {
      const res = await fetch('/api/ssh/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: sshForm.host,
          port: parseInt(sshForm.port),
          username: sshForm.username,
          password: sshForm.password || undefined,
          keyFile: sshForm.keyFile || undefined
        })
      });
      const conn = await res.json();
      setSshConnections(prev => [...prev, conn]);
      setSshModal(false);
    } catch (err) {
      console.error('SSH connection failed:', err);
    }
  };

  const disconnectSsh = async (connId: string) => {
    try {
      await fetch(`/api/ssh/disconnect/${connId}`, { method: 'POST' });
      setSshConnections(prev => prev.filter(c => c.id !== connId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen bg-[#050507] overflow-hidden relative">
      <div className="ambient-glow-1" />
      <div className="ambient-glow-2" />

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-64 border-r border-white/5 bg-black/20 flex flex-col hidden lg:flex p-4 gap-2 z-10 font-sans">
        <div className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-orange-500 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.4)]">
            <div className="w-4 h-1 bg-orange-500 rounded-full" />
          </div>
          <h1 className="text-xl font-bold tracking-widest text-white">SATURN <span className="text-orange-500 font-light">CORE</span></h1>
        </div>

        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-6 mb-2 px-4 italic">{t('nav.infrastructure')}</div>
        <nav className="px-2 space-y-1">
          <button 
            onClick={() => setActiveTab('dash')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm",
              activeTab === 'dash' ? "bg-white/5 border border-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <div className={cn("w-2 h-2 rounded-full", activeTab === 'dash' ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" : "bg-slate-700")} />
            <span>{t('nav.dashboard')}</span>
          </button>
          <button 
            onClick={() => setActiveTab('servers')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm",
              activeTab === 'servers' ? "bg-white/5 border border-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <div className={cn("w-2 h-2 rounded-full", activeTab === 'servers' ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" : "bg-slate-700")} />
            <span>{t('nav.servers')}</span>
          </button>
        </nav>

        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-8 mb-2 px-4 italic">{t('nav.neural')}</div>
        <nav className="px-2 space-y-1">
          <button 
            onClick={() => setActiveTab('knowledge')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm",
              activeTab === 'knowledge' ? "bg-white/5 border border-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <div className={cn("w-1.5 h-4 rounded-full", activeTab === 'knowledge' ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "bg-blue-500/20")} />
            <span>{t('nav.knowledge')}</span>
          </button>
          <button 
            onClick={() => setActiveTab('audit')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm",
              activeTab === 'audit' ? "bg-white/5 border border-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <div className={cn("w-1.5 h-4 rounded-full", activeTab === 'audit' ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]" : "bg-purple-500/20")} />
            <span>{t('nav.audit')}</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm",
              activeTab === 'settings' ? "bg-white/5 border border-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <div className={cn("w-1.5 h-4 rounded-full", activeTab === 'settings' ? "bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.6)]" : "bg-slate-500/20")} />
            <span>{t('nav.settings')}</span>
          </button>
        </nav>

        {/* SSH Connections sidebar */}
        {sshConnections.length > 0 && (
          <div className="mt-2 px-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2 px-4 italic">SSH Sessions</div>
            {sshConnections.map(conn => (
              <div key={conn.id} className="flex items-center justify-between px-4 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-emerald-400 font-mono">{conn.host}</span>
                </div>
                <button onClick={() => disconnectSsh(conn.id)} className="text-[9px] text-slate-500 hover:text-rose-400">
                  <XCircle size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20">
          <div className="text-xs text-orange-200 mb-1 flex items-center gap-2">
            <RefreshCw size={12} className="animate-spin text-orange-500" />
            SQLite Active Backup
          </div>
          <div className="text-[10px] text-orange-200/50 font-mono italic">litestream-replica: syncing...</div>
          <div className="w-full bg-black/40 h-1 mt-3 rounded-full overflow-hidden">
            <div className="bg-orange-500 h-full w-[88%]"></div>
          </div>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-black/40 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input 
                type="text" 
                placeholder={t('search.placeholder')}
                className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all font-sans text-slate-300"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* Language Toggle */}
            <div className="flex items-center border border-white/10 rounded-full p-0.5">
              <button
                onClick={() => setLang('en')}
                className={cn(
                  "px-3 py-1 text-[10px] font-black uppercase rounded-full transition-all tracking-wider",
                  lang === 'en' ? "bg-orange-500 text-black" : "text-slate-500 hover:text-white"
                )}
              >EN</button>
              <button
                onClick={() => setLang('es')}
                className={cn(
                  "px-3 py-1 text-[10px] font-black uppercase rounded-full transition-all tracking-wider",
                  lang === 'es' ? "bg-orange-500 text-black" : "text-slate-500 hover:text-white"
                )}
              >ES</button>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{t('status.system')}</span>
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                {t('status.stable')} // 99.99%
              </span>
            </div>
            <div className="h-8 w-[1px] bg-white/10"></div>
            <div className="px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black tracking-tighter uppercase">
              {t('neural.version')}
            </div>
            <button 
              onClick={() => setSshModal(true)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-black px-4 py-2 rounded-full transition-all flex items-center gap-2 uppercase tracking-tighter"
            >
              <Plug size={12} /> SSH
            </button>
            <button 
              onClick={triggerIncident}
              className="bg-orange-500 hover:bg-orange-400 text-black text-[10px] font-black px-6 py-2 rounded-full transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] flex items-center gap-2 uppercase tracking-tighter"
            >
              {t('button.simulate')}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar z-10">
          {showOnboarding ? (
            <OnboardingWizard 
              onComplete={() => {
                setShowOnboarding(false);
                fetchData();
              }} 
              t={t} 
            />
          ) : activeTab === 'dash' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title={t('card.health')} value="99.9%" icon={ShieldCheck} color="bg-emerald-600" trend={0.1} />
                <StatCard title={t('card.connections')} value={servers.length} icon={Server} color="bg-indigo-600" />
                <StatCard title={t('card.incidents')} value={incidents.length} icon={AlertTriangle} color="bg-amber-600" trend={-12} />
                <StatCard title={t('card.memory')} value={`${knowledge.length} docs`} icon={Brain} color="bg-fuchsia-600" trend={4} />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-6">
                  <div className="immersive-card p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black text-white uppercase tracking-[0.2em] text-[10px] flex items-center gap-2 italic">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {t('metrics.latency')}
                      </h3>
                      <div className="flex gap-2">
                        <button className="text-[10px] px-2 py-1 bg-slate-800 rounded uppercase font-bold text-slate-400">1h</button>
                        <button className="text-[10px] px-2 py-1 bg-emerald-500/20 text-emerald-500 rounded uppercase font-bold">24h</button>
                      </div>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[
                          { time: '00:00', val: 45 }, { time: '04:00', val: 32 }, { time: '08:00', val: 68 },
                          { time: '12:00', val: 42 }, { time: '16:00', val: 55 }, { time: '20:00', val: 38 },
                          { time: '23:59', val: 40 }
                        ]}>
                          <defs>
                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                            itemStyle={{ color: '#10b981' }}
                          />
                          <Area type="monotone" dataKey="val" stroke="#10b981" fillOpacity={1} fill="url(#colorVal)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="immersive-card p-6 overflow-hidden">
                    <h3 className="font-black text-white uppercase tracking-[0.2em] text-[10px] mb-6 flex items-center gap-2 italic">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      {t('metrics.nodes')}
                    </h3>
                    <div className="divide-y divide-slate-800">
                      {servers.map(server => (
                        <div key={server.id}>
                          <ServerRow server={server} onClick={() => setActiveTab('servers')} t={t} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col h-full">
                    <h3 className="font-bold text-white uppercase tracking-wider text-sm mb-6 flex items-center gap-2">
                       <AlertTriangle size={16} className="text-amber-500" />
                       {t('incident.title')}
                    </h3>
                    <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar max-h-[600px]">
                      {incidents.map((incident) => (
                        <div 
                          key={incident.id} 
                          className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-orange-500/20 transition-all cursor-pointer group"
                          onClick={() => incident.status === 'open' && setActiveAnalysis(incident)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className={cn(
                              "text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-tighter",
                              incident.severity === 'critical' ? "bg-rose-500/20 text-rose-500" :
                              incident.severity === 'high' ? "bg-orange-500/20 text-orange-500" : "bg-emerald-500/20 text-emerald-500"
                            )}>
                              {incident.severity}
                            </span>
                            <span className="text-[10px] text-slate-600 font-mono italic">{new Date(incident.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <h4 className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors uppercase tracking-tight">{incident.title}</h4>
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{incident.description}</p>
                          <div className="mt-3 flex items-center justify-between">
                            <span className={cn(
                              "text-[9px] font-black tracking-widest flex items-center gap-1.5",
                              incident.status === 'open' ? "text-orange-400" : "text-emerald-400"
                            )}>
                              {incident.status === 'open' ? <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /> : <ShieldCheck size={10} />}
                              {incident.status === 'open' ? t('incident.open') : t('incident.closed')}
                            </span>
                            {incident.status === 'open' && (
                              <button 
                                className="text-[10px] font-black text-orange-500 uppercase hover:underline tracking-tighter"
                                onClick={(e) => { e.stopPropagation(); setActiveAnalysis(incident); }}
                              >
                                {t('incident.analyze')} →
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {incidents.length === 0 && (
                        <div className="text-center py-12 text-slate-500 text-xs italic">{t('incident.none')}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Servers Tab ────────────────────────────────────────────── */}
          {activeTab === 'servers' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {servers.map(server => (
                   <div key={server.id} className="immersive-card p-6 hover:bg-white/[0.05] hover:border-orange-500/20 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-5">
                         <Server size={64} />
                      </div>
                      <div className="flex justify-between items-start mb-6">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 border border-white/10",
                          server.os === 'linux' ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : 
                          server.os === 'windows' ? "bg-sky-500/10 text-sky-500 border-sky-500/20" : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                        )}>
                          <Server size={24} />
                        </div>
                        <div className={cn(
                          "px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter",
                          server.status === 'online' ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-400"
                        )}>
                          {server.status}
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-white tracking-tighter">{server.name}</h3>
                      <p className="text-xs text-slate-500 font-mono mb-6">{server.ip}</p>
                      <div className="grid grid-cols-2 gap-6 border-t border-white/5 pt-6">
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2 flex items-center gap-1">
                            <Cpu size={12} /> {t('server.cpu')}
                          </div>
                          <div className="text-xl font-mono font-bold text-white tracking-tighter">{server.cpu}%</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2 flex items-center gap-1">
                            <HardDrive size={12} /> {t('server.mem')}
                          </div>
                          <div className="text-xl font-mono font-bold text-white tracking-tighter">{server.memory}%</div>
                        </div>
                      </div>
                      <div className="mt-6 flex flex-wrap gap-1.5">
                        {server.tags.map(tag => <span key={tag} className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-slate-400 font-bold uppercase">#{tag}</span>)}
                      </div>
                   </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Audit Tab ────────────────────────────────────────────── */}
          {activeTab === 'audit' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
               <div className="immersive-card overflow-hidden">
                 <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2 italic">
                       <Logs size={16} className="text-orange-500" />
                       {t('audit.title')}
                    </h3>
                    <div className="flex gap-2">
                       <button className="text-[9px] font-black text-slate-500 uppercase hover:text-white transition-colors">{t('audit.export')}</button>
                       <div className="w-[1px] h-3 bg-white/10" />
                       <button className="text-[9px] font-black text-rose-500 uppercase hover:text-rose-400 transition-colors">{t('audit.purge')}</button>
                    </div>
                 </div>
                 <div className="overflow-x-auto overflow-y-auto max-h-[600px] no-scrollbar">
                    <table className="w-full text-left text-[10px] font-mono border-collapse">
                       <thead className="bg-[#050507] text-slate-500 sticky top-0 z-10 shadow-sm shadow-white/5">
                          <tr>
                             <th className="px-6 py-4 uppercase font-black tracking-widest border-b border-white/5">{t('audit.timestamp')}</th>
                             <th className="px-6 py-4 uppercase font-black tracking-widest border-b border-white/5">{t('audit.origin')}</th>
                             <th className="px-6 py-4 uppercase font-black tracking-widest border-b border-white/5">{t('audit.event')}</th>
                             <th className="px-6 py-4 uppercase font-black tracking-widest border-b border-white/5">{t('audit.detail')}</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {auditLogs.map((log) => (
                             <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-4 text-slate-500 font-mono whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="px-6 py-4">
                                   <span className={cn(
                                      "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter",
                                      log.type === 'SYSTEM' ? "bg-blue-500/10 text-blue-400" :
                                      log.type === 'NEURAL' ? "bg-orange-500/10 text-orange-400" : "bg-emerald-500/10 text-emerald-400"
                                   )}>
                                      {log.type}
                                   </span>
                                </td>
                                <td className="px-6 py-4 text-white font-bold group-hover:text-orange-400 transition-colors">{log.event}</td>
                                <td className="px-6 py-4 text-slate-500 italic max-w-md truncate">{log.detail}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
               </div>
            </motion.div>
          )}

          {/* ── Settings Tab ──────────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* Language */}
               <div className="space-y-6">
                  <div className="immersive-card p-8">
                     <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-6 italic flex items-center gap-2">
                        <Globe size={16} /> {t('settings.language')}
                     </h3>
                     <p className="text-xs text-slate-500 mb-6">{t('settings.language.desc')}</p>
                     <div className="flex gap-4">
                        <button
                          onClick={() => setLang('en')}
                          className={cn(
                            "flex-1 py-3 rounded-xl border text-sm font-black uppercase tracking-wider transition-all",
                            lang === 'en' 
                              ? "bg-orange-500 text-black border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]" 
                              : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20"
                          )}
                        >
                          🇬🇧 English
                        </button>
                        <button
                          onClick={() => setLang('es')}
                          className={cn(
                            "flex-1 py-3 rounded-xl border text-sm font-black uppercase tracking-wider transition-all",
                            lang === 'es' 
                              ? "bg-orange-500 text-black border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]" 
                              : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20"
                          )}
                        >
                          🇪🇸 Español
                        </button>
                     </div>
                  </div>

                  {/* AI Configuration */}
                  <div className="immersive-card p-8">
                     <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-6 italic flex items-center gap-2">
                        <Brain size={16} /> {t('settings.ai')}
                     </h3>
                     <p className="text-xs text-slate-500 mb-6">{t('settings.ai.desc')}</p>

                     <div className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('settings.ai.provider')}</label>
                           <select 
                             value={aiConfig.provider}
                             onChange={(e) => setAiConfig({ ...aiConfig, provider: e.target.value as any })}
                             className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                           >
                             <option value="none">{t('provider.none')}</option>
                             <option value="gemini">{t('provider.gemini')}</option>
                             <option value="openai">{t('provider.openai')}</option>
                             <option value="ollama">{t('provider.ollama')}</option>
                             <option value="anthropic">{t('provider.anthropic')}</option>
                           </select>
                        </div>

                        {aiConfig.provider !== 'none' && (
                          <>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('settings.ai.key')}</label>
                               <div className="relative">
                                 <Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                 <input 
                                   type="password"
                                   value={aiConfig.apiKey}
                                   onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                                   placeholder="sk-..." 
                                   className="w-full bg-black/60 border border-white/10 rounded-xl p-3 pl-10 text-xs focus:ring-1 focus:ring-orange-500 outline-none font-mono"
                                 />
                               </div>
                            </div>

                            {aiConfig.provider === 'ollama' && (
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Endpoint</label>
                                 <input 
                                   type="text"
                                   value={aiEndpoint}
                                   onChange={(e) => setAiEndpoint(e.target.value)}
                                   placeholder="http://localhost:11434"
                                   className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none font-mono"
                                 />
                              </div>
                            )}

                            <div className="space-y-4 pt-4 border-t border-white/5">
                               <div className="flex justify-between items-center p-4 bg-black/40 border border-white/5 rounded-2xl">
                                  <div className="flex-1">
                                     <div className="text-xs font-bold text-white uppercase italic">{t('settings.ai.deep')}</div>
                                     <div className="text-[10px] text-slate-500">{t('settings.ai.deep.desc')}</div>
                                  </div>
                                  <button
                                    onClick={() => setAiConfig({ ...aiConfig, deepVerify: !aiConfig.deepVerify })}
                                    className={cn(
                                      "w-12 h-6 rounded-full p-1 transition-all",
                                      aiConfig.deepVerify ? "bg-orange-500" : "bg-slate-800"
                                    )}
                                  >
                                     <div className={cn(
                                       "w-4 h-4 bg-white rounded-full shadow-lg transition-transform",
                                       aiConfig.deepVerify ? "translate-x-6" : "translate-x-0"
                                     )} />
                                  </button>
                               </div>
                               <div className="flex justify-between items-center p-4 bg-black/40 border border-white/5 rounded-2xl">
                                  <div className="flex-1">
                                     <div className="text-xs font-bold text-white uppercase italic">{t('settings.ai.auto')}</div>
                                     <div className="text-[10px] text-slate-500">{t('settings.ai.auto.desc')}</div>
                                  </div>
                                  <button
                                    onClick={() => setAiConfig({ ...aiConfig, autoRemediate: !aiConfig.autoRemediate })}
                                    className={cn(
                                      "w-12 h-6 rounded-full p-1 transition-all",
                                      aiConfig.autoRemediate ? "bg-orange-500" : "bg-slate-800"
                                    )}
                                  >
                                     <div className={cn(
                                       "w-4 h-4 bg-white rounded-full shadow-lg transition-transform",
                                       aiConfig.autoRemediate ? "translate-x-6" : "translate-x-0"
                                     )} />
                                  </button>
                               </div>
                            </div>
                          </>
                        )}

                        <button 
                          onClick={saveAiConfig}
                          className="w-full py-3 bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all flex items-center justify-center gap-2"
                        >
                          {aiSaved ? (
                            <><CheckCircle2 size={14} /> {t('settings.ai.saved')}</>
                          ) : (
                            <><Zap size={14} /> {t('settings.ai.save')}</>
                          )}
                        </button>
                     </div>
                  </div>
               </div>

               {/* Notifications */}
               <div className="space-y-6">
                  <div className="immersive-card p-8">
                     <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-6 italic flex items-center gap-2">
                        <Mail size={16} /> {t('settings.notifications')}
                     </h3>
                     <p className="text-xs text-slate-500 mb-6">{t('settings.notifications.desc')}</p>
                     <form onSubmit={saveNotifConfig} className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('settings.notifications.type')}</label>
                           <select name="type" className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none">
                              <option value="slack">Slack Webhook</option>
                              <option value="webhook">Generic API Webhook</option>
                              <option value="email">SMTP Outbound</option>
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('settings.notifications.dest')}</label>
                           <input 
                              name="destination"
                              type="text" 
                              placeholder="https://hooks.slack.com/services/..." 
                              className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none font-mono"
                           />
                        </div>
                        <button className="w-full py-3 bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all flex items-center justify-center gap-2">
                           <RefreshCw size={14} /> {t('settings.notifications.init')}
                        </button>
                     </form>
                  </div>

                  <div className="immersive-card p-8">
                     <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 italic">{t('settings.notifications.active')}</h3>
                     <div className="space-y-3">
                        {notifConfigs.map(notif => (
                           <div key={notif.id} className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                 <div className="p-2 bg-white/5 rounded-lg text-orange-500">
                                    {notif.type === 'slack' && <RefreshCw size={16} />}
                                    {notif.type === 'email' && <Mail size={16} />}
                                    {notif.type === 'webhook' && <Zap size={16} />}
                                 </div>
                                 <div>
                                    <div className="text-xs font-bold text-white uppercase">{notif.type} ADAPTER</div>
                                    <div className="text-[9px] text-slate-500 font-mono truncate max-w-[200px]">{notif.destination}</div>
                                 </div>
                              </div>
                              <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-widest">Active</span>
                           </div>
                        ))}
                        {notifConfigs.length === 0 && (
                          <div className="text-center py-8 text-slate-600 text-xs italic">{t('settings.notifications.none')}</div>
                        )}
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {/* ── Knowledge Tab ────────────────────────────────────────── */}
          {activeTab === 'knowledge' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1 space-y-4">
                {['CONTRACTS', 'TECH', 'FUNC', 'STRUCT', 'AUDIT'].map(type => (
                  <div key={type} className="bg-black/20 border border-white/5 rounded-2xl p-5">
                    <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 italic">
                       <div className="w-1 h-3 bg-orange-500/40 rounded-full" />
                       {type}
                    </h3>
                    <div className="space-y-1">
                      {knowledge.filter((k: any) => k.type === type).map((k: any) => (
                        <div key={k.path} className="text-[11px] text-slate-500 hover:text-white cursor-pointer py-1.5 px-3 rounded-lg hover:bg-white/5 transition-all truncate border border-transparent hover:border-white/5">
                          {k.path.split('/').pop()}
                        </div>
                      ))}
                      {knowledge.filter((k: any) => k.type === type).length === 0 && (
                         <div className="text-[9px] text-slate-700 italic px-3">{t('knowledge.empty')}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="lg:col-span-3 immersive-card p-10 min-h-[600px] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                   <Database size={300} />
                </div>
                <div className="flex justify-between items-start mb-10 pb-6 border-b border-white/5">
                  <div>
                    <div className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-2 italic">{t('knowledge.title')}</div>
                    <h2 className="text-3xl font-black text-white tracking-widest uppercase italic">Root_Contract.md</h2>
                  </div>
                  <div className="text-[10px] font-mono text-slate-600 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                    {t('knowledge.synced')}: 2026-05-01T17:15:40Z
                  </div>
                </div>
                <div className="prose prose-invert prose-orange max-w-none font-mono text-[13px] text-slate-400 leading-relaxed">
                   <p className="mb-6 text-white font-bold tracking-tight text-base italic border-l-2 border-orange-500 pl-4 bg-orange-500/5 py-2">
                     # INFRASTRUCTURE ROOT CONTRACT // IMMUTABLE
                   </p>
                   <p className="mb-4">This document establishes the high-order ethical and technical boundaries for the Saturn Neural Engine (Ares).</p>
                   <ul className="space-y-4">
                      <li className="flex gap-4">
                        <span className="text-orange-500">[01]</span>
                        <span>All remediation steps must undergo pre-execution simulation vs current OBPA-v4 state.</span>
                      </li>
                      <li className="flex gap-4">
                        <span className="text-orange-500">[02]</span>
                        <span>Recursive index deletion or modification is strictly prohibited without multi-sig auth.</span>
                      </li>
                      <li className="flex gap-4 border-y border-white/5 py-4 my-4">
                        <span className="text-orange-500">[03]</span>
                        <span>Full Audit Trace (FAT) must persist in ContextP/AUDIT-L4 for 99+ cycles.</span>
                      </li>
                      <li className="flex gap-4">
                        <span className="text-orange-500">[04]</span>
                        <span>SSH/WinRM credentials must remain ephemeral and isolated from the primary LLM buffer.</span>
                      </li>
                   </ul>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── OBPA Modal ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {activeAnalysis && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 lg:p-12"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-4 border-b border-slate-800 flex justify-between items-center px-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <Brain size={24} />
                    </div>
                    <div>
                      <h2 className="font-bold text-white">SATURN.Ares_Protocol_OBPA</h2>
                      <div className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">Initializing Cognitive Resolution Path...</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveAnalysis(null)}
                    className="p-2 text-slate-500 hover:text-white transition-colors"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
                <OBPA_Visualizer 
                  incident={activeAnalysis} 
                  onComplete={() => {
                    setActiveAnalysis(null);
                    fetchData();
                  }} 
                  t={t}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── SSH Connection Modal ───────────────────────────────────── */}
        <AnimatePresence>
          {sshModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-8"
              >
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                  <Wifi size={20} className="text-orange-500" />
                  {t('server.ssh.connect')}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('server.ssh.host')}</label>
                    <input 
                      value={sshForm.host}
                      onChange={(e) => setSshForm({...sshForm, host: e.target.value})}
                      placeholder="192.168.1.100"
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('server.ssh.port')}</label>
                      <input 
                        value={sshForm.port}
                        onChange={(e) => setSshForm({...sshForm, port: e.target.value})}
                        placeholder="22"
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('server.ssh.user')}</label>
                      <input 
                        value={sshForm.username}
                        onChange={(e) => setSshForm({...sshForm, username: e.target.value})}
                        placeholder="root"
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('server.ssh.password')}</label>
                    <input 
                      type="password"
                      value={sshForm.password}
                      onChange={(e) => setSshForm({...sshForm, password: e.target.value})}
                      placeholder="••••••••"
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none mt-1"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={connectSsh}
                      className="flex-1 py-3 bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all"
                    >
                      <Plug size={14} className="inline mr-2" /> {t('server.ssh.connect')}
                    </button>
                    <button 
                      onClick={() => setSshModal(false)}
                      className="flex-1 py-3 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all"
                    >
                      {t('button.cancel')}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="h-10 border-t border-white/10 bg-black flex items-center px-8 justify-between text-[10px] font-mono text-slate-500 z-20">
          <div className="flex gap-6 uppercase">
            <span>{t('footer.goroutines')}: 1,402</span>
            <span>{t('footer.storage')}</span>
            <span>{t('footer.recursion')}</span>
          </div>
          <div className="flex items-center gap-2 uppercase">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {t('footer.replication')}
          </div>
        </footer>
      </main>
    </div>
  );
}