import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Users, CalendarClock, Activity, FileText, Network, Shield,
  Package, Globe, HardDrive, Lock, Database, Terminal, RefreshCw,
  Plus, X, Play, Trash2, AlertTriangle, CheckCircle, Clock,
  UserPlus, UserX, UserCheck, Search, Copy, Download, ChevronDown
} from "lucide-react";

interface AdminPanelProps {
  serverId: string;
}

type TabId = "users" | "tasks" | "processes" | "monitoring" | "logs" | "network" | "firewall" | "packages" | "webserver" | "smart" | "ssl" | "backups" | "console";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "users", label: "Users", icon: Users },
  { id: "tasks", label: "Tasks", icon: CalendarClock },
  { id: "processes", label: "Processes", icon: Activity },
  { id: "monitoring", label: "Monitoring", icon: Clock },
  { id: "logs", label: "Logs", icon: FileText },
  { id: "network", label: "Network", icon: Network },
  { id: "firewall", label: "Firewall", icon: Shield },
  { id: "packages", label: "Packages", icon: Package },
  { id: "webserver", label: "Web Server", icon: Globe },
  { id: "smart", label: "SMART", icon: HardDrive },
  { id: "ssl", label: "SSL", icon: Lock },
  { id: "console", label: "Console", icon: Terminal },
];

export default function AdminPanel({ serverId }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("users");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scriptResult, setScriptResult] = useState<any>(null);
  const [command, setCommand] = useState("");

  const fetchData = async (tab: TabId) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/servers/${serverId}/${tab}`);
      const result = await res.json();
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "console") fetchData(activeTab);
  }, [activeTab, serverId]);

  const executeAction = async (action: string, body: any = {}) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/servers/${serverId}/${activeTab}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.error) setError(result.error);
      fetchData(activeTab);
      return result;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const executeCommand = async () => {
    if (!command.trim()) return;
    setLoading(true);
    setScriptResult(null);
    try {
      const res = await fetch(`/api/admin/servers/${serverId}/console/exec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      setScriptResult(await res.json());
    } catch (e: any) {
      setScriptResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;
    if (error) return <div className="text-center py-12 text-red-400">{error}</div>;

    switch (activeTab) {
      case "users": return <UsersTab data={data} onAction={executeAction} />;
      case "tasks": return <TasksTab data={data} onAction={executeAction} />;
      case "processes": return <ProcessesTab data={data} onAction={executeAction} />;
      case "monitoring": return <MonitoringTab data={data} />;
      case "logs": return <LogsTab data={data} onAction={executeAction} />;
      case "network": return <NetworkTab data={data} />;
      case "firewall": return <FirewallTab data={data} onAction={executeAction} />;
      case "packages": return <PackagesTab data={data} onAction={executeAction} />;
      case "webserver": return <WebserverTab data={data} onAction={executeAction} />;
      case "smart": return <SmartTab data={data} />;
      case "ssl": return <SslTab data={data} />;
      case "backups": return <BackupsTab data={data} onAction={executeAction} />;
      case "console": return (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={command}
              onChange={e => setCommand(e.target.value)}
              onKeyDown={e => e.key === "Enter" && executeCommand()}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-orange-500"
              placeholder="Enter command or paste script..."
            />
            <button onClick={executeCommand} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-black font-medium rounded-lg transition-colors flex items-center gap-2">
              <Play className="w-4 h-4" /> Run
            </button>
          </div>
          {scriptResult && (
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-xs">
              {scriptResult.stdout && <pre className="text-green-400 whitespace-pre-wrap">{scriptResult.stdout}</pre>}
              {scriptResult.stderr && <pre className="text-red-400 whitespace-pre-wrap">{scriptResult.stderr}</pre>}
              {scriptResult.error && <pre className="text-red-400">{scriptResult.error}</pre>}
              {scriptResult.code !== undefined && <p className="text-slate-500 mt-2">Exit code: {scriptResult.code}</p>}
            </div>
          )}
        </div>
      );
      default: return null;
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="immersive-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white capitalize">{activeTab}</h2>
          {activeTab !== "console" && (
            <button onClick={() => fetchData(activeTab)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
        {renderTabContent()}
      </div>
    </div>
  );
}

// ── Tab Components ──────────────────────────────────────────────────────

function UsersTab({ data, onAction }: { data: any; onAction: (action: string, body?: any) => Promise<any> }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", groups: "" });

  const users = data?.users || [];
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-black text-xs font-medium rounded-lg transition-colors">
          <UserPlus className="w-3.5 h-3.5" /> Create User
        </button>
      </div>
      {showCreate && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Username" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500" />
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Password" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500" />
            <input value={form.groups} onChange={e => setForm(f => ({ ...f, groups: e.target.value }))} placeholder="Groups (comma separated)" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={async () => { await onAction("create", { ...form, groups: form.groups.split(",").map(g => g.trim()).filter(Boolean) }); setShowCreate(false); setForm({ username: "", password: "", groups: "" }); }} className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-black text-xs font-medium rounded-lg">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 text-xs rounded-lg">Cancel</button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-white/5">
              <th className="text-left py-2 px-2">Username</th>
              <th className="text-left py-2 px-2">UID</th>
              <th className="text-left py-2 px-2">GID</th>
              <th className="text-left py-2 px-2">Home</th>
              <th className="text-left py-2 px-2">Shell</th>
              <th className="text-right py-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any, i: number) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="py-2 px-2 text-white">{u.username || u.Name}</td>
                <td className="py-2 px-2 text-slate-400">{u.uid || u.UID}</td>
                <td className="py-2 px-2 text-slate-400">{u.gid || u.GID}</td>
                <td className="py-2 px-2 text-slate-400">{u.home || u.Home}</td>
                <td className="py-2 px-2 text-slate-400">{u.shell || u.Shell}</td>
                <td className="py-2 px-2 text-right">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => onAction("lock", { username: u.username || u.Name, locked: true })} className="p-1 hover:bg-white/10 rounded" title="Lock"><UserX className="w-3.5 h-3.5 text-yellow-400" /></button>
                    <button onClick={() => onAction("lock", { username: u.username || u.Name, locked: false })} className="p-1 hover:bg-white/10 rounded" title="Unlock"><UserCheck className="w-3.5 h-3.5 text-green-400" /></button>
                    <button onClick={() => onAction("delete", { username: u.username || u.Name })} className="p-1 hover:bg-white/10 rounded" title="Delete"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TasksTab({ data, onAction }: { data: any; onAction: (action: string, body?: any) => Promise<any> }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ schedule: "", command: "", name: "" });
  const tasks = data?.tasks || [];
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-black text-xs font-medium rounded-lg"><Plus className="w-3.5 h-3.5" /> Create Task</button>
      </div>
      {showCreate && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Task name" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500" />
            <input value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))} placeholder="Schedule (e.g. */5 * * * *)" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500" />
            <input value={form.command} onChange={e => setForm(f => ({ ...f, command: e.target.value }))} placeholder="Command" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={async () => { await onAction("create", form); setShowCreate(false); setForm({ schedule: "", command: "", name: "" }); }} className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-black text-xs font-medium rounded-lg">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 text-xs rounded-lg">Cancel</button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-slate-500 border-b border-white/5"><th className="text-left py-2 px-2">Name</th><th className="text-left py-2 px-2">Schedule</th><th className="text-left py-2 px-2">Command</th><th className="text-right py-2 px-2">Actions</th></tr></thead>
          <tbody>
            {tasks.map((t: any, i: number) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="py-2 px-2 text-white">{t.name || t.TaskName}</td>
                <td className="py-2 px-2 text-slate-400 font-mono">{t.schedule || t.TaskPath}</td>
                <td className="py-2 px-2 text-slate-400 font-mono max-w-[300px] truncate">{t.command || t.TR}</td>
                <td className="py-2 px-2 text-right"><button onClick={() => onAction("delete", { taskId: t.name || t.TaskName })} className="p-1 hover:bg-white/10 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProcessesTab({ data, onAction }: { data: any; onAction: (action: string, body?: any) => Promise<any> }) {
  const [killPid, setKillPid] = useState("");
  const processes = data?.processes || [];
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input value={killPid} onChange={e => setKillPid(e.target.value)} placeholder="PID to kill" className="w-32 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-orange-500" />
        <button onClick={() => { onAction("kill", { pid: parseInt(killPid) }); setKillPid(""); }} className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium rounded-lg">Kill</button>
      </div>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-slate-500 border-b border-white/5 sticky top-0 bg-[#0a0a0f]"><th className="text-left py-2 px-2">PID</th><th className="text-left py-2 px-2">Name</th><th className="text-right py-2 px-2">CPU%</th><th className="text-right py-2 px-2">Memory</th><th className="text-right py-2 px-2">Actions</th></tr></thead>
          <tbody>
            {processes.map((p: any, i: number) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="py-1.5 px-2 text-white">{p.pid || p.Id}</td>
                <td className="py-1.5 px-2 text-slate-300">{p.name || p.ProcessName}</td>
                <td className="py-1.5 px-2 text-right text-slate-400">{(p.cpu || p.CPU || 0).toFixed(1)}</td>
                <td className="py-1.5 px-2 text-right text-slate-400">{p.memory || p.WorkingSet ? Math.round((p.memory || p.WorkingSet) / 1024 / 1024) + "MB" : "-"}</td>
                <td className="py-1.5 px-2 text-right"><button onClick={() => onAction("kill", { pid: p.pid || p.Id })} className="p-1 hover:bg-white/10 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MonitoringTab({ data }: { data: any }) {
  if (!data || !data.snapshot) {
    return (
      <div className="text-center py-12 text-slate-500 bg-white/5 border border-white/10 rounded-xl">
        <p>No snapshot data available. Is the node online?</p>
      </div>
    );
  }

  const snap = data.snapshot;
  const format = (v: any) => (v === null || v === undefined || isNaN(v) ? "0" : v);

  const metrics = [
    { label: "CPU", value: format(snap.cpu || snap.CPU) + "%", color: "text-blue-400" },
    { label: "Memory", value: format(snap.memory || snap.Memory) + "%", color: "text-green-400" },
    { label: "Disk", value: format(snap.disk || snap.Disk) + "%", color: "text-yellow-400" },
    { label: "Load Avg", value: Array.isArray(snap.loadAvg) ? snap.loadAvg.join(", ") : format(snap.loadAvg || snap["Load Average"]), color: "text-purple-400" },
    { label: "Uptime", value: format(snap.uptime || snap.Uptime) + "s", color: "text-cyan-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {metrics.map((m, i) => (
        <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-slate-400 text-xs">{m.label}</p>
          <p className={`text-lg font-bold mt-1 ${m.color}`}>{m.value}</p>
        </div>
      ))}
    </div>
  );
}

function LogsTab({ data, onAction }: { data: any; onAction: (action: string, body?: any) => Promise<any> }) {
  const logs = data?.logs || [];
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => onAction("rotate")} className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs font-medium rounded-lg"><RefreshCw className="w-3.5 h-3.5" /> Rotate Logs</button>
      </div>
      <div className="bg-black/40 border border-white/10 rounded-xl p-4 max-h-96 overflow-y-auto font-mono text-xs">
        {logs.map((l: any, i: number) => (
          <div key={i} className="py-1 border-b border-white/5 last:border-0">
            <span className="text-slate-500">{l.timestamp || l.TimeCreated}</span>
            <span className={`ml-2 ${l.level === "Error" || l.LevelDisplayName === "Error" ? "text-red-400" : l.level === "Warning" ? "text-yellow-400" : "text-slate-300"}`}>
              {l.message || l.Message}
            </span>
          </div>
        ))}
        {logs.length === 0 && <p className="text-slate-500 text-center py-4">No logs available</p>}
      </div>
    </div>
  );
}

function NetworkTab({ data }: { data: any }) {
  const interfaces = data?.interfaces || [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="text-slate-500 border-b border-white/5"><th className="text-left py-2 px-2">Interface</th><th className="text-left py-2 px-2">IP</th><th className="text-left py-2 px-2">Status</th><th className="text-left py-2 px-2">Speed</th></tr></thead>
        <tbody>
          {interfaces.map((iface: any, i: number) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
              <td className="py-2 px-2 text-white">{iface.name || iface.Name || iface.InterfaceAlias}</td>
              <td className="py-2 px-2 text-slate-400">{iface.ip || iface.IPAddress || iface.IP}</td>
              <td className="py-2 px-2"><span className={`px-2 py-0.5 rounded-full text-xs ${iface.status === "Up" || iface.Status === "Up" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{iface.status || iface.Status}</span></td>
              <td className="py-2 px-2 text-slate-400">{iface.speed || iface.LinkSpeed || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FirewallTab({ data, onAction }: { data: any; onAction: (action: string, body?: any) => Promise<any> }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ port: "", protocol: "tcp", action: "ACCEPT" });
  const rules = data?.rules || [];
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-black text-xs font-medium rounded-lg"><Plus className="w-3.5 h-3.5" /> Add Rule</button>
      </div>
      {showAdd && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input value={form.port} onChange={e => setForm(f => ({ ...f, port: e.target.value }))} placeholder="Port" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500" />
            <select value={form.protocol} onChange={e => setForm(f => ({ ...f, protocol: e.target.value }))} className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500"><option value="tcp">TCP</option><option value="udp">UDP</option></select>
            <select value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))} className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500"><option value="ACCEPT">Allow</option><option value="DROP">Deny</option></select>
          </div>
          <div className="flex gap-2">
            <button onClick={async () => { await onAction("add", form); setShowAdd(false); setForm({ port: "", protocol: "tcp", action: "ACCEPT" }); }} className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-black text-xs font-medium rounded-lg">Add</button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 text-xs rounded-lg">Cancel</button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-slate-500 border-b border-white/5"><th className="text-left py-2 px-2">Name</th><th className="text-left py-2 px-2">Direction</th><th className="text-left py-2 px-2">Action</th><th className="text-left py-2 px-2">Profile</th><th className="text-right py-2 px-2">Actions</th></tr></thead>
          <tbody>
            {rules.map((r: any, i: number) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="py-2 px-2 text-white">{r.name || r.DisplayName}</td>
                <td className="py-2 px-2 text-slate-400">{r.direction || r.Direction}</td>
                <td className="py-2 px-2"><span className={`px-2 py-0.5 rounded-full text-xs ${(r.action || r.Action) === "ACCEPT" || (r.action || r.Action) === "Allow" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{r.action || r.Action}</span></td>
                <td className="py-2 px-2 text-slate-400">{r.profile || r.Profile}</td>
                <td className="py-2 px-2 text-right"><button onClick={() => onAction("delete", { ruleId: r.name || r.DisplayName })} className="p-1 hover:bg-white/10 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PackagesTab({ data, onAction }: { data: any; onAction: (action: string, body?: any) => Promise<any> }) {
  const [showInstall, setShowInstall] = useState(false);
  const [pkgName, setPkgName] = useState("");
  const packages = data?.packages || [];
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowInstall(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-black text-xs font-medium rounded-lg"><Plus className="w-3.5 h-3.5" /> Install Package</button>
      </div>
      {showInstall && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex gap-2">
            <input value={pkgName} onChange={e => setPkgName(e.target.value)} placeholder="Package name" className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500" />
            <button onClick={async () => { await onAction("install", { packages: [pkgName] }); setShowInstall(false); setPkgName(""); }} className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-black text-xs font-medium rounded-lg">Install</button>
            <button onClick={() => setShowInstall(false)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 text-xs rounded-lg">Cancel</button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-slate-500 border-b border-white/5"><th className="text-left py-2 px-2">Package</th><th className="text-left py-2 px-2">Version</th><th className="text-left py-2 px-2">Actions</th></tr></thead>
          <tbody>
            {packages.map((p: any, i: number) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="py-2 px-2 text-white">{p.name || p.Name}</td>
                <td className="py-2 px-2 text-slate-400">{p.version || p.Version}</td>
                <td className="py-2 px-2"><button onClick={() => onAction("remove", { packages: [p.name || p.Name] })} className="p-1 hover:bg-white/10 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WebserverTab({ data, onAction }: { data: any; onAction: (action: string, body?: any) => Promise<any> }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ domain: "", root: "", ssl: false });
  const sites = data?.sites || [];
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-black text-xs font-medium rounded-lg"><Plus className="w-3.5 h-3.5" /> Create VHost</button>
      </div>
      {showCreate && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} placeholder="Domain" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500" />
            <input value={form.root} onChange={e => setForm(f => ({ ...f, root: e.target.value }))} placeholder="Document root" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500" />
            <label className="flex items-center gap-2 text-slate-400 text-xs"><input type="checkbox" checked={form.ssl} onChange={e => setForm(f => ({ ...f, ssl: e.target.checked }))} className="accent-orange-500" /> SSL</label>
          </div>
          <div className="flex gap-2">
            <button onClick={async () => { await onAction("create", form); setShowCreate(false); setForm({ domain: "", root: "", ssl: false }); }} className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-black text-xs font-medium rounded-lg">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 text-xs rounded-lg">Cancel</button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-slate-500 border-b border-white/5"><th className="text-left py-2 px-2">Domain</th><th className="text-left py-2 px-2">Root</th><th className="text-left py-2 px-2">State</th></tr></thead>
          <tbody>
            {sites.map((s: any, i: number) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="py-2 px-2 text-white">{s.domain || s.Name}</td>
                <td className="py-2 px-2 text-slate-400 font-mono">{s.root || s.PhysicalPath}</td>
                <td className="py-2 px-2"><span className={`px-2 py-0.5 rounded-full text-xs ${(s.state || s.State) === "Started" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>{s.state || s.State}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SmartTab({ data }: { data: any }) {
  const disks = data?.disks || [];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {disks.map((d: any, i: number) => (
        <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white font-medium text-sm">{d.name || d.FriendlyName}</p>
          <div className="mt-2 space-y-1 text-xs">
            <p className="text-slate-400">Health: <span className={d.health === "Healthy" || d.HealthStatus === "Healthy" ? "text-green-400" : "text-red-400"}>{d.health || d.HealthStatus}</span></p>
            <p className="text-slate-400">Type: {d.type || d.MediaType}</p>
            <p className="text-slate-400">Size: {d.size || d.Size ? Math.round(parseInt(d.size || d.Size) / 1024 / 1024 / 1024) + "GB" : "-"}</p>
            {d.temperature && <p className="text-slate-400">Temp: {d.temperature}°C</p>}
            {d.powerOnHours && <p className="text-slate-400">Power On: {d.powerOnHours}h</p>}
          </div>
        </div>
      ))}
      {disks.length === 0 && <p className="text-slate-500 text-center py-8 col-span-2">No disk info available</p>}
    </div>
  );
}

function SslTab({ data }: { data: any }) {
  const certs = data?.certificates || [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="text-slate-500 border-b border-white/5"><th className="text-left py-2 px-2">Subject</th><th className="text-left py-2 px-2">Issuer</th><th className="text-left py-2 px-2">Expires</th><th className="text-left py-2 px-2">Status</th></tr></thead>
        <tbody>
          {certs.map((c: any, i: number) => {
            const expires = new Date(c.notAfter || c.NotAfter);
            const isExpired = expires < new Date();
            return (
              <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="py-2 px-2 text-white">{c.subject || c.Subject}</td>
                <td className="py-2 px-2 text-slate-400">{c.issuer || c.Issuer}</td>
                <td className="py-2 px-2 text-slate-400">{expires.toLocaleDateString()}</td>
                <td className="py-2 px-2"><span className={`px-2 py-0.5 rounded-full text-xs ${isExpired ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>{isExpired ? "Expired" : "Valid"}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BackupsTab({ data, onAction }: { data: any; onAction: (action: string, body?: any) => Promise<any> }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ path: "", retention: "7", schedule: "" });
  const backups = data?.backups || [];
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-black text-xs font-medium rounded-lg"><Plus className="w-3.5 h-3.5" /> Create Backup</button>
      </div>
      {showCreate && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input value={form.path} onChange={e => setForm(f => ({ ...f, path: e.target.value }))} placeholder="Path to backup" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500" />
            <input value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))} placeholder="Schedule (cron)" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500" />
            <input value={form.retention} onChange={e => setForm(f => ({ ...f, retention: e.target.value }))} placeholder="Retention (days)" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={async () => { await onAction("create", form); setShowCreate(false); setForm({ path: "", retention: "7", schedule: "" }); }} className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-black text-xs font-medium rounded-lg">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 text-xs rounded-lg">Cancel</button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-slate-500 border-b border-white/5"><th className="text-left py-2 px-2">File</th><th className="text-left py-2 px-2">Size</th><th className="text-left py-2 px-2">Date</th><th className="text-right py-2 px-2">Actions</th></tr></thead>
          <tbody>
            {backups.map((b: any, i: number) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="py-2 px-2 text-white font-mono">{b.name || b.file}</td>
                <td className="py-2 px-2 text-slate-400">{b.size}</td>
                <td className="py-2 px-2 text-slate-400">{b.date || b.lastModified}</td>
                <td className="py-2 px-2 text-right"><button onClick={() => onAction("run", { backupId: b.name || b.id })} className="p-1 hover:bg-white/10 rounded"><Play className="w-3.5 h-3.5 text-green-400" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
