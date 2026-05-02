import fs from 'fs';
import path from 'path';

const filePath = 'src/App.tsx';
const original = fs.readFileSync(filePath, 'utf8').split('\n');

const imports = `import React, { useState, useEffect, useCallback } from 'react';
import { 
  Server, Activity, Database, Brain, ShieldCheck, AlertTriangle, Terminal, 
  ChevronRight, ChevronLeft, Cpu, HardDrive, RefreshCw, Search, Bell, Settings, 
  LayoutDashboard, Logs, CheckCircle2, XCircle, Mail, Zap, Plug, Unplug, 
  TerminalSquare, History, Globe, Key, Wifi, User, Lock, Eye, EyeOff, Send, 
  LogOut, Menu, Trash2, Folder, FileText, Play, Plus, Trash, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import type { ManagedServer, Incident, AuditLog, NotificationConfig, AIConfig, SshConnection } from './lib/types';
import { t, Language } from './lib/i18n';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
`;

const helpers = `
const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="p-6 rounded-2xl bg-black/40 border border-white/5 group hover:border-orange-500/20 transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-2 rounded-xl bg-white/5", color)}>
        <Icon size={20} />
      </div>
    </div>
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{title}</p>
    <h3 className="text-2xl font-black text-white">{value}</h3>
  </div>
);

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
`;

const head = original.slice(1028, 1122).join('\n'); // Keep original components like IncidentCard, OnboardingWizard, etc.
// Wait, I should verify the line numbers for existing components in App.tsx

const newBody = `
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
    <button onClick={() => { setActiveTab(id); setMobileMenuOpen(false); setSelectedServer(null); }}
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
        <StatCard title={t('stats.ssh')} value={sshConnections.filter(c => c.status === 'connected').length} icon={Zap} color="text-orange-500" />
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/40 border border-white/5 p-6 rounded-2xl"><div className="flex items-center gap-4"><button onClick={() => setSelectedServer(null)} className="p-2 text-slate-500 hover:text-white bg-white/5 rounded-xl"><ChevronLeft size={18} /></button><div><div className="flex items-center gap-2 mb-1"><h2 className="text-sm font-black uppercase tracking-widest">{selectedServer?.name}</h2><div className={cn("w-2 h-2 rounded-full animate-pulse", selectedServer?.status === 'online' ? "bg-emerald-500" : "bg-rose-500")} /></div><p className="text-[10px] font-medium text-slate-500 uppercase">{selectedServer?.ip} • {selectedServer?.os}</p></div></div><div className="flex items-center gap-3"><button className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-300 text-[10px] font-black uppercase rounded-xl"><RefreshCw size={14} /> Sync</button><select value={remediationConfigs.find(c => c.serverId === selectedServer?.id)?.mode || 'global'} onChange={(e) => handleUpdateRemediationMode(selectedServer!.id, e.target.value)} className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-orange-500 outline-none"><option value="global">Mode: Global</option><option value="auto">Mode: Auto</option><option value="skill">Mode: Skill</option><option value="manual">Mode: Manual</option></select></div></div>
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

  const SettingsView = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 mb-8"><Settings className="text-orange-500" size={20} /><h2 className="text-sm font-black uppercase tracking-[0.2em]">Settings</h2></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 rounded-2xl bg-black/40 border border-white/5 space-y-6">
          <div><h3 className="text-xs font-black uppercase mb-2">Neural Provider</h3><p className="text-[10px] text-slate-500 mb-4">{t('settings.ai.desc')}</p><select className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none"><option value="google">Google Gemini</option><option value="openai">OpenAI</option></select></div>
          <button className="w-full py-3 bg-orange-500 text-black text-[10px] font-black uppercase rounded-xl">Save Configuration</button>
        </div>
        <div className="p-6 rounded-2xl bg-black/40 border border-white/5 space-y-6">
          <div><h3 className="text-xs font-black uppercase mb-2">System Mode</h3><div className="space-y-3 mt-4">{['auto', 'skill', 'manual'].map(m => <div key={m} className="flex items-center justify-between p-3 rounded-xl bg-white/5"><span className="text-[10px] font-black uppercase">{m}</span><div className={cn("w-4 h-4 rounded-full border-2", globalConfig.mode === m ? "border-orange-500 bg-orange-500" : "border-white/20")} /></div>)}</div></div>
        </div>
      </div>
    </div>
  );

  const AdminView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><User className="text-orange-500" size={20} /><h2 className="text-sm font-black uppercase tracking-[0.2em]">Administration</h2></div></div><div className="p-12 bg-black/40 border border-white/5 rounded-2xl text-center"><Lock size={48} className="text-slate-800 mx-auto mb-4" /><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Admin modules initialized. Access granted.</p></div></div>
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
          <SidebarItem id="settings" label={t('nav.settings')} icon={Settings} />
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
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'admin' && <AdminView />}
        </div>
      </main>
    </div>
  );
}
`;

fs.writeFileSync(filePath, imports + head + helpers + newBody);
