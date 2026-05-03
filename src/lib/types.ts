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
  disk: number;
  uptime: number;
  kernel: string;
  load_avg: number[];
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
  type: 'SYSTEM' | 'NEURAL' | 'USER' | 'TECH' | 'FUNC' | 'STRUCT' | 'AUDIT' | 'INGEST';
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
  provider: string;
  apiKey: string;
  endpoint?: string;
  model?: string;
  temperature?: number;
  contextWindow?: number;
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

// ── Fase 2: Server Administration Types ─────────────────────────────────

export interface ServerDb {
  id: string;
  name: string;
  ip: string;
  os: string;
  status: string;
  cpu: number;
  memory: number;
  disk: number;
  uptime: number;
  kernel: string;
  load_avg: string;
  lastCheck: string;
  tags: string;
}

export interface UserDb {
  id: string;
  username: string;
  password_hash: string;
  role: "admin" | "viewer";
  created_at: string;
}

export interface IncidentDb {
  id: string;
  serverId: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  status: "open" | "analyzing" | "remediating" | "closed";
  timestamp: string;
}

export interface SshConnectionDb {
  id: string;
  serverId: string;
  host: string;
  port: number;
  username: string;
  authType: string;
  encryptedKey: string | null;
  encryptedPassword: string | null;
  fingerprint: string | null;
  lastConnected: string | null;
  status: string;
}

export type OSType = "linux" | "windows";

export interface ScriptResult {
  stdout: string;
  stderr: string;
  code: number | null;
  duration: number;
}

// S01: User Management
export interface SystemUser {
  username: string;
  uid: number;
  gid: number;
  home: string;
  shell: string;
  groups: string[];
  lastLogin?: string;
  locked: boolean;
}

export interface SystemGroup {
  name: string;
  gid: number;
  members: string[];
}

// S02: Scheduled Tasks
export interface ScheduledTask {
  id: string;
  command: string;
  schedule: string;
  description: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  os: OSType;
}

// S03: Processes
export interface SystemProcess {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  user: string;
  state: string;
  command: string;
  uptime: number;
}

// S04: Resource Monitoring
export interface ResourceSnapshot {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  networkRx: number;
  networkTx: number;
  loadAvg: number[];
  processes: number;
}

// S05: Logs
export interface LogEntry {
  timestamp: string;
  source: string;
  level: string;
  message: string;
  host: string;
}

// N01: Network Interfaces
export interface NetworkInterface {
  name: string;
  mac: string;
  ipv4: string;
  ipv6: string;
  netmask: string;
  gateway: string;
  dns: string[];
  status: 'up' | 'down';
  speed: number;
  rxBytes: number;
  txBytes: number;
}

// N02: Firewall Rules
export interface FirewallRule {
  id: string;
  chain: string;
  protocol: string;
  source: string;
  destination: string;
  port: string;
  action: 'ACCEPT' | 'DROP' | 'REJECT';
  enabled: boolean;
  description: string;
}

// A01: Packages
export interface Package {
  name: string;
  version: string;
  arch: string;
  description: string;
  size: number;
  status: 'installed' | 'available' | 'upgradable';
}

// A02: Web Servers
export interface VirtualHost {
  name: string;
  domain: string;
  root: string;
  port: number;
  ssl: boolean;
  status: 'enabled' | 'disabled';
  error?: string;
}

// H01: SMART
export interface SmartInfo {
  device: string;
  status: 'PASSED' | 'FAILED' | 'UNKNOWN';
  temperature: number;
  reallocatedSectors: number;
  pendingSectors: number;
  powerOnHours: number;
}

// SEC01: SSL Certificates
export interface SslCertificate {
  domain: string;
  issuer: string;
  expiresAt: string;
  daysRemaining: number;
  autoRenew: boolean;
}

// B01: Backups
export interface BackupJob {
  id: string;
  name: string;
  source: string;
  destination: string;
  schedule: string;
  type: 'files' | 'database' | 'system';
  lastRun?: string;
  lastSize?: number;
  status: 'active' | 'inactive' | 'error';
}

// Script Generator Types
export interface ScriptRequest {
  action: string;
  category: string;
  os: OSType;
  params: Record<string, unknown>;
  dryRun?: boolean;
}

export interface ScriptResponse {
  script: string;
  description: string;
  risks: string[];
  preview?: string;
  rollbackScript?: string;
  estimatedTime: string;
}
