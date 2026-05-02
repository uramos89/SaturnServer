import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Server, Monitor, Users, CalendarClock, Activity, FileText,
  Network, Shield, Package, Globe, HardDrive, Lock, Database,
  Terminal, Plus, X, RefreshCw, ChevronRight, Wifi, WifiOff,
  AlertTriangle, CheckCircle, Clock, Cpu, HardDrive as Hdd,
  MemoryStick as Memory
} from "lucide-react";
import AdminPanel from "./AdminPanel.js";

import type { ManagedServer } from '../lib/types.js';

export default function AdminDashboard() {
  const [servers, setServers] = useState<ManagedServer[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectForm, setConnectForm] = useState({ host: "", port: "22", username: "root", password: "", privateKey: "" });
  const [connectError, setConnectError] = useState("");

  const fetchServers = async () => {
    try {
      const res = await fetch("/api/servers");
      const data = await res.json();
      setServers(data);
    } catch (e) {
      console.error("Failed to fetch servers", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchServers(); }, []);

  const handleConnect = async () => {
    setConnectError("");
    try {
      const res = await fetch("/api/ssh/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: connectForm.host,
          port: parseInt(connectForm.port),
          username: connectForm.username,
          password: connectForm.password || undefined,
          privateKey: connectForm.privateKey || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setConnectError(data.error || "Connection failed");
      } else {
        setShowConnectModal(false);
        setConnectForm({ host: "", port: "22", username: "root", password: "", privateKey: "" });
        fetchServers();
      }
    } catch (e: any) {
      setConnectError(e.message);
    }
  };

  const stats = {
    total: servers.length,
    online: servers.filter(s => s.status === "online").length,
    degraded: servers.filter(s => s.status === "degraded").length,
    offline: servers.filter(s => s.status === "offline").length,
  };

  if (selectedServer) {
    return (
      <div className="p-6">
        <button
          onClick={() => setSelectedServer(null)}
          className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to Servers
        </button>
        <AdminPanel serverId={selectedServer} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Server Administration</h1>
          <p className="text-slate-400 text-sm mt-1">Manage users, processes, firewall, packages and more</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchServers} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => setShowConnectModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-black font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Connect Server
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Servers", value: stats.total, icon: Server, color: "text-blue-400" },
          { label: "Online", value: stats.online, icon: Wifi, color: "text-green-400" },
          { label: "Degraded", value: stats.degraded, icon: AlertTriangle, color: "text-yellow-400" },
          { label: "Offline", value: stats.offline, icon: WifiOff, color: "text-red-400" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="immersive-card p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color} opacity-50`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Server List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading servers...</div>
        ) : servers.length === 0 ? (
          <div className="text-center py-12">
            <Server className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No servers connected</p>
            <p className="text-slate-500 text-sm mt-1">Connect your first server to start managing it</p>
          </div>
        ) : servers.map((server, i) => (
          <motion.div
            key={server.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelectedServer(server.id)}
            className="immersive-card p-4 cursor-pointer hover:bg-white/[0.05] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${
                  server.status === "online" ? "bg-green-400" :
                  server.status === "degraded" ? "bg-yellow-400" : "bg-red-400"
                }`} />
                <div>
                  <p className="text-white font-medium">{server.name || server.ip}</p>
                  <p className="text-slate-500 text-xs">{server.ip} · {server.os} · Kernel {server.kernel}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-xs">
                  <Cpu className="w-3 h-3 text-slate-500" />
                  <span className={server.cpu > 80 ? "text-red-400" : "text-slate-400"}>{server.cpu.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Memory className="w-3 h-3 text-slate-500" />
                  <span className={server.memory > 80 ? "text-red-400" : "text-slate-400"}>{server.memory.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Hdd className="w-3 h-3 text-slate-500" />
                  <span className={server.disk > 80 ? "text-red-400" : "text-slate-400"}>{server.disk.toFixed(1)}%</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Connect SSH Server</h2>
              <button onClick={() => setShowConnectModal(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Host</label>
                <input
                  value={connectForm.host}
                  onChange={e => setConnectForm(f => ({ ...f, host: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                  placeholder="192.168.1.100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Port</label>
                  <input
                    value={connectForm.port}
                    onChange={e => setConnectForm(f => ({ ...f, port: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Username</label>
                  <input
                    value={connectForm.username}
                    onChange={e => setConnectForm(f => ({ ...f, username: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Password (or leave empty for key auth)</label>
                <input
                  type="password"
                  value={connectForm.password}
                  onChange={e => setConnectForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Private Key (optional)</label>
                <textarea
                  value={connectForm.privateKey}
                  onChange={e => setConnectForm(f => ({ ...f, privateKey: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-orange-500 h-20"
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                />
              </div>
              {connectError && (
                <p className="text-red-400 text-xs">{connectError}</p>
              )}
              <button
                onClick={handleConnect}
                className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-black font-medium rounded-lg transition-colors"
              >
                Connect
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
