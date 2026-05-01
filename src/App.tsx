
import React, { useState, useEffect } from 'react';
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
  History
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import type { ManagedServer, Incident, ContextP_Entry, AuditLog, NotificationConfig } from './lib/types';
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

// Components
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

const ServerRow = ({ server, onClick }: { server: ManagedServer, onClick: () => void }) => (
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
          <span>CPU</span>
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
          <span>MEM</span>
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

const OBPA_Visualizer = ({ incident, onComplete }: { incident: Incident, onComplete: () => void }) => {
  const [step, setStep] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [proposal, setProposal] = useState<any>(null);
  const [obpaId, setObpaId] = useState<string | null>(null);

  const steps = [
    { id: 'OBSERVE', label: 'Infrastucture Monitoring', icon: Activity },
    { id: 'PROPOSE', label: 'ContextP Pattern Matching', icon: Brain },
    { id: 'EXECUTE', label: 'Remediation Synthesis', icon: Terminal },
    { id: 'APPROVE', label: 'Manual Approval', icon: Settings },
    { id: 'BITACORA', label: 'Contractual Validation', icon: ShieldCheck },
    { id: 'CONSOLIDATE', label: 'Knowledge Persistance', icon: Database },
  ];

  const runAnalysis = async () => {
    setIsProcessing(true);
    setLog(['Initiating OBPA Neural Cycle...', `Analyzing incident: ${incident.id}`]);
    
    try {
      // Observe & Propose & Execute Synthesis
      for (let i = 0; i < 3; i++) {
        setStep(i);
        setLog(prev => [...prev, `[${steps[i].id}] ${steps[i].label} in progress...`]);
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
        `[NEURAL] Analysis Complete. Confidence: ${(data.analysis.confidence * 100).toFixed(2)}%`,
        `[NEURAL] Proposed Fix: ${data.analysis.proposal}`,
        `[NEURAL] Waiting for administrative approval to proceed with execution.`
      ]);
      setStep(3); // Wait at Approval step
    } catch (err) {
      setLog(prev => [...prev, 'Error in Neural Core processing.']);
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
        setLog(prev => [...prev, '[USER] Execution approved. Applying script...']);
        // Finalize steps
        for (let i = 4; i < steps.length; i++) {
          setStep(i);
          setLog(prev => [...prev, `[${steps[i].id}] ${steps[i].label} complete.`]);
          await new Promise(r => setTimeout(r, 800));
        }
        setLog(prev => [...prev, '[SATURNO] Cycle finalized successfully. Knowledge consolidated.']);
        setTimeout(onComplete, 1500);
      } else {
        setLog(prev => [...prev, '[USER] Execution rejected. Incident stays open.']);
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
          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] italic">OBPA Cycle Progress // Deep-Verify Active</h3>
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
                <Brain size={14} /> Action Required
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
                  Confirm & Execute
                </button>
                <button 
                   disabled={isProcessing}
                   onClick={() => approveRemediation(false)}
                   className="flex-1 py-1.5 bg-white/5 text-white text-[10px] font-black uppercase rounded hover:bg-white/10 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </motion.div>
          )}
        </div>

        <div className="bg-black/80 rounded-2xl border border-white/5 p-5 font-mono text-[10px] h-[400px] overflow-y-auto no-scrollbar shadow-inner">
          <div className="flex items-center justify-between mb-4 text-slate-500 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Terminal size={14} />
              <span className="font-bold tracking-widest uppercase">Saturno_Neural_Output</span>
            </div>
            <span className="text-[9px]">v1.0.42</span>
          </div>
          {log.map((line, i) => (
            <div key={i} className="mb-2 leading-relaxed">
              <span className={cn(
                "mr-2 font-bold",
                line.includes('[INFO]') ? "text-emerald-500" : 
                line.includes('[NEURAL]') ? "text-orange-500" : "text-slate-600"
              )}>
                {line.includes('root@saturno') ? '' : line.startsWith('[') ? '' : '>'}
              </span>
              <span className={cn(
                line.includes('Error') ? "text-rose-400" : 
                line.includes('Resolution Applied') ? "text-emerald-400 font-bold" : "text-slate-400"
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

export default function App() {
  const [servers, setServers] = useState<ManagedServer[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [knowledge, setKnowledge] = useState<ContextP_Entry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifConfigs, setNotifConfigs] = useState<NotificationConfig[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<Incident | null>(null);
  const [activeTab, setActiveTab] = useState<'dash' | 'servers' | 'knowledge' | 'audit' | 'settings'>('dash');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [sRes, iRes, kRes, aRes, nRes] = await Promise.all([
        fetch('/api/servers'),
        fetch('/api/incidents'),
        fetch('/api/contextp'),
        fetch('/api/audit'),
        fetch('/api/notifications')
      ]);
      setServers(await sRes.json());
      setIncidents(await iRes.json());
      setKnowledge(await kRes.json());
      setAuditLogs(await aRes.json());
      setNotifConfigs(await nRes.json());
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

  const triggerIncident = async () => {
    const randomServer = servers[Math.floor(Math.random() * servers.length)];
    await fetch('/api/incidents/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serverId: randomServer.id,
        title: "Alta Latencia Detectada",
        description: `Se detectaron picos de CPU en ${randomServer.name}. Posible fuga de memoria en proceso nginx.`,
        severity: "high"
      })
    });
    fetchData();
  };

  return (
    <div className="flex h-screen bg-[#050507] overflow-hidden relative">
      {/* Background Ambient Glows */}
      <div className="ambient-glow-1" />
      <div className="ambient-glow-2" />

      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-black/20 flex flex-col hidden lg:flex p-4 gap-2 z-10 font-sans">
        <div className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-orange-500 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.4)]">
            <div className="w-4 h-1 bg-orange-500 rounded-full" />
          </div>
          <h1 className="text-xl font-bold tracking-widest text-white">SATURNO <span className="text-orange-500 font-light">CORE</span></h1>
        </div>

        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-6 mb-2 px-4 italic">Infrastructure</div>
        <nav className="px-2 space-y-1">
          <button 
            onClick={() => setActiveTab('dash')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm",
              activeTab === 'dash' ? "bg-white/5 border border-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <div className={cn("w-2 h-2 rounded-full", activeTab === 'dash' ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" : "bg-slate-700")} />
            <span>Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('servers')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm",
              activeTab === 'servers' ? "bg-white/5 border border-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <div className={cn("w-2 h-2 rounded-full", activeTab === 'servers' ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" : "bg-slate-700")} />
            <span>Managed Nodes</span>
          </button>
        </nav>

        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-8 mb-2 px-4 italic">Neural ContextP</div>
        <nav className="px-2 space-y-1">
          <button 
            onClick={() => setActiveTab('knowledge')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm",
              activeTab === 'knowledge' ? "bg-white/5 border border-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <div className={cn("w-1.5 h-4 rounded-full", activeTab === 'knowledge' ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "bg-blue-500/20")} />
            <span>Knowledge Base</span>
          </button>
        </nav>

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

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-black/40 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input 
                type="text" 
                placeholder="DeepSearch managed nodes..." 
                className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all font-sans text-slate-300"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">System Status</span>
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                STABLE // 99.99%
              </span>
            </div>
            <div className="h-8 w-[1px] bg-white/10"></div>
            <div className="px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black tracking-tighter uppercase">
              Neural: 1.0.42-DEEP_VERIFY
            </div>
            <button 
              onClick={triggerIncident}
              className="bg-orange-500 hover:bg-orange-400 text-black text-[10px] font-black px-6 py-2 rounded-full transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] flex items-center gap-2 uppercase tracking-tighter"
            >
              Simular Incident
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar z-10">
          {activeTab === 'dash' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  title="Salud del Sistema" 
                  value="99.9%" 
                  icon={ShieldCheck} 
                  color="bg-emerald-600" 
                  trend={0.1}
                />
                <StatCard 
                  title="Conexiones Activas" 
                  value={servers.length} 
                  icon={Server} 
                  color="bg-indigo-600" 
                />
                <StatCard 
                  title="Incidentes 24h" 
                  value={incidents.length} 
                  icon={AlertTriangle} 
                  color="bg-amber-600" 
                  trend={-12}
                />
                <StatCard 
                  title="Memoria ContextP" 
                  value={`${knowledge.length} docs`} 
                  icon={Brain} 
                  color="bg-fuchsia-600" 
                  trend={4}
                />
              </div>

              {/* Charts & Activity */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-6">
                  <div className="immersive-card p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black text-white uppercase tracking-[0.2em] text-[10px] flex items-center gap-2 italic">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Global System Latency p99
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
                      Critical Infrastructure Nodes
                    </h3>
                    <div className="divide-y divide-slate-800">
                      {servers.map(server => (
                        <ServerRow key={server.id} server={server} onClick={() => setActiveTab('servers')} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col h-full">
                    <h3 className="font-bold text-white uppercase tracking-wider text-sm mb-6 flex items-center gap-2">
                       <AlertTriangle size={16} className="text-amber-500" />
                       Incidentes Recientes
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
                              {incident.status.toUpperCase()}
                            </span>
                            {incident.status === 'open' && (
                              <button 
                                className="text-[10px] font-black text-orange-500 uppercase hover:underline tracking-tighter"
                                onClick={(e) => { e.stopPropagation(); setActiveAnalysis(incident); }}
                              >
                                Deep Analysis →
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {incidents.length === 0 && (
                        <div className="text-center py-12 text-slate-500 text-xs italic">No se detectaron anomalías.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

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
                            <Cpu size={12} /> CPU LOAD
                          </div>
                          <div className="text-xl font-mono font-bold text-white tracking-tighter">{server.cpu}%</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2 flex items-center gap-1">
                            <HardDrive size={12} /> RAM UTIL
                          </div>
                          <div className="text-xl font-mono font-bold text-white tracking-tighter">{server.memory}%</div>
                        </div>
                      </div>
                      <div className="mt-6 flex flex-wrap gap-1.5">
                        {server.tags.map(t => <span key={t} className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-slate-400 font-bold uppercase">#{t}</span>)}
                      </div>
                   </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'audit' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
               <div className="immersive-card overflow-hidden">
                 <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2 italic">
                       <Logs size={16} className="text-orange-500" />
                       Comprehensive Audit Trace // Level-4
                    </h3>
                    <div className="flex gap-2">
                       <button className="text-[9px] font-black text-slate-500 uppercase hover:text-white transition-colors">Export CSV</button>
                       <div className="w-[1px] h-3 bg-white/10" />
                       <button className="text-[9px] font-black text-rose-500 uppercase hover:text-rose-400 transition-colors">Purge Logs</button>
                    </div>
                 </div>
                 <div className="overflow-x-auto overflow-y-auto max-h-[600px] no-scrollbar">
                    <table className="w-full text-left text-[10px] font-mono border-collapse">
                       <thead className="bg-[#050507] text-slate-500 sticky top-0 z-10 shadow-sm shadow-white/5">
                          <tr>
                             <th className="px-6 py-4 uppercase font-black tracking-widest border-b border-white/5">Timestamp</th>
                             <th className="px-6 py-4 uppercase font-black tracking-widest border-b border-white/5">Origin</th>
                             <th className="px-6 py-4 uppercase font-black tracking-widest border-b border-white/5">Event</th>
                             <th className="px-6 py-4 uppercase font-black tracking-widest border-b border-white/5">Detail</th>
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

          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="space-y-6">
                  <div className="immersive-card p-8">
                     <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-6 italic flex items-center gap-2">
                        <Mail size={16} /> Notification Pipeline Config
                     </h3>
                     <form onSubmit={saveNotifConfig} className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Adapter Type</label>
                           <select name="type" className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none">
                              <option value="slack">Slack Webhook</option>
                              <option value="webhook">Generic API Webhook</option>
                              <option value="email">SMTP Outbound</option>
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Destination End-point</label>
                           <input 
                              name="destination"
                              type="text" 
                              placeholder="https://hooks.slack.com/services/..." 
                              className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-orange-500 outline-none font-mono"
                           />
                        </div>
                        <button className="w-full py-3 bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all flex items-center justify-center gap-2">
                           <RefreshCw size={14} /> Initialize Adapter
                        </button>
                     </form>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="immersive-card p-8 bg-orange-500/5">
                     <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-6 italic flex items-center gap-2">
                        <Zap size={16} className="text-orange-500" /> Neural Engine Controller
                     </h3>
                     <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-black/40 border border-white/5 rounded-2xl">
                           <div>
                              <div className="text-xs font-bold text-white uppercase italic">Deep-Verify Mode</div>
                              <div className="text-[10px] text-slate-500">Manual approval required for all OBPA-v4 cycles.</div>
                           </div>
                           <div className="w-12 h-6 bg-orange-500 rounded-full p-1 flex justify-end">
                              <div className="w-4 h-4 bg-white rounded-full shadow-lg" />
                           </div>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-black/40 border border-white/5 rounded-2xl opacity-50 grayscale">
                           <div>
                              <div className="text-xs font-bold text-white uppercase italic">Auto-Remediate (Alpha)</div>
                              <div className="text-[10px] text-slate-500">Autonomous resolution for low-severity incidents.</div>
                           </div>
                           <div className="w-12 h-6 bg-slate-800 rounded-full p-1 flex justify-start">
                              <div className="w-4 h-4 bg-slate-600 rounded-full" />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="immersive-card p-8">
                     <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 italic">Active Notifications</h3>
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
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

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
                      {knowledge.filter(k => k.type === type).map(k => (
                        <div key={k.path} className="text-[11px] text-slate-500 hover:text-white cursor-pointer py-1.5 px-3 rounded-lg hover:bg-white/5 transition-all truncate border border-transparent hover:border-white/5">
                          {k.path.split('/').pop()}
                        </div>
                      ))}
                      {knowledge.filter(k => k.type === type).length === 0 && (
                         <div className="text-[9px] text-slate-700 italic px-3">Recursive index empty.</div>
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
                    <div className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-2 italic">NEURAL_METADATA_VISOR // CONTEXTP</div>
                    <h2 className="text-3xl font-black text-white tracking-widest uppercase italic">Root_Contract.md</h2>
                  </div>
                  <div className="text-[10px] font-mono text-slate-600 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                    SYNCED: 2026-05-01T17:15:40Z
                  </div>
                </div>
                <div className="prose prose-invert prose-orange max-w-none font-mono text-[13px] text-slate-400 leading-relaxed">
                   <p className="mb-6 text-white font-bold tracking-tight text-base italic border-l-2 border-orange-500 pl-4 bg-orange-500/5 py-2">
                     # INFRASTRUCTURE ROOT CONTRACT // IMMUTABLE
                   </p>
                   <p className="mb-4">This document establishes the high-order ethical and technical boundaries for the Saturno Neural Engine.</p>
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

        {/* Modal Analysis */}
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
                      <h2 className="font-bold text-white">SATURNO.Neural_Protocol_OBPA</h2>
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
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Bottom Global Metrics */}
        <footer className="h-10 border-t border-white/10 bg-black flex items-center px-8 justify-between text-[10px] font-mono text-slate-500 z-20">
          <div className="flex gap-6 uppercase">
            <span>GOROUTINES: 1,402</span>
            <span>STORAGE: SQLITE/WAL</span>
            <span>RECURSION: OBPA-v4</span>
          </div>
          <div className="flex items-center gap-2 uppercase">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            NODE POOL REPLICATION SUCCESSFUL
          </div>
        </footer>
      </main>
    </div>
  );
}
