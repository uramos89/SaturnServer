// ── Saturn Types ────────────────────────────────────────────────────────

export type ServerStatus = 'online' | 'offline' | 'degraded' | 'maintenance';

export interface ManagedServer {
  id: string;
  name: string;
  ip: string;
  os: 'linux' | 'windows' | 'unix';
  status: ServerStatus;
  cpu: number;
  memory: number;
  lastCheck: string;
  tags: string[];
  sshConnected?: boolean;
}

export interface Incident {
  id: string;
  serverId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  status: 'open' | 'analyzing' | 'remediating' | 'closed';
  timestamp: string;
}

export interface OBPA_Cycle {
  id: string;
  incidentId: string;
  phase: 'OBSERVE' | 'PROPOSE' | 'EXECUTE' | 'BITACORA' | 'CONSOLIDATE';
  outputs: {
    observation?: string;
    proposal?: string;
    remediation_script?: string;
    execution_result?: string;
    consolidated_knowledge?: string;
  };
  confidence: number;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  type: 'SYSTEM' | 'NEURAL' | 'USER';
  event: string;
  detail: string;
  timestamp: string;
}

export interface NotificationConfig {
  id: string;
  type: 'email' | 'slack' | 'webhook';
  destination: string;
  config: string;
  enabled: boolean;
}

export interface AIConfig {
  provider: 'gemini' | 'openai' | 'ollama' | 'anthropic' | 'none';
  apiKey: string;
  endpoint?: string;
  model?: string;
  deepVerify: boolean;
  autoRemediate: boolean;
}

export interface SshConnection {
  id: string;
  serverId: string;
  host: string;
  port: number;
  username: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  metrics?: {
    cpu: number;
    memory: number;
    disk: number;
    uptime: number;
    kernel: string;
    loadAvg: number[];
  };
}
