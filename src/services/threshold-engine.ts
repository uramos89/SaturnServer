import type { Database } from 'better-sqlite3';

interface ThresholdRule {
  id: string;
  metric: 'cpu' | 'memory' | 'disk' | 'uptime';
  operator: '>' | '<' | '>=' | '<=' | '==';
  value: number;
  severity: 'warning' | 'critical' | 'high'; // Standardized to include 'high'
  cooldownMinutes: number;
}

const DEFAULT_RULES: ThresholdRule[] = [
  { id: 'th-cpu-critical', metric: 'cpu', operator: '>', value: 90, severity: 'critical', cooldownMinutes: 30 },
  { id: 'th-cpu-warning', metric: 'cpu', operator: '>', value: 75, severity: 'high', cooldownMinutes: 60 },
  { id: 'th-mem-critical', metric: 'memory', operator: '>', value: 90, severity: 'critical', cooldownMinutes: 30 },
  { id: 'th-mem-warning', metric: 'memory', operator: '>', value: 80, severity: 'high', cooldownMinutes: 60 },
  { id: 'th-disk-critical', metric: 'disk', operator: '>', value: 95, severity: 'critical', cooldownMinutes: 30 },
  { id: 'th-disk-warning', metric: 'disk', operator: '>', value: 85, severity: 'high', cooldownMinutes: 60 },
];

const lastTriggered = new Map<string, number>(); // ruleId:serverId -> timestamp

/**
 * Evaluates server metrics against configured thresholds.
 * If a threshold is exceeded, it creates an incident and triggers notifications.
 */
export async function evaluateThresholds(serverId: string, serverName: string, metrics: any, db: Database): Promise<void> {
  const server = { ...metrics, name: serverName };
  // Try to load custom thresholds for this server, fallback to defaults
  const customThresholds = db.prepare("SELECT * FROM threshold_configs WHERE serverId = ?").all(serverId) as any[];
  
  const rulesToEvaluate = customThresholds.length > 0 
    ? customThresholds.map(ct => ({
        id: `custom-${ct.metric}-${ct.serverId}`,
        metric: ct.metric,
        operator: '>', // UI currently only supports '>'
        value: ct.critical, // Map UI 'critical' to rule value
        severity: 'critical' as const,
        cooldownMinutes: 30
      }))
    : DEFAULT_RULES;

  for (const rule of rulesToEvaluate) {
    const metricValue = parseFloat(server[rule.metric]);
    if (isNaN(metricValue)) continue;

    let triggered = false;
    switch (rule.operator) {
      case '>': triggered = metricValue > rule.value; break;
      case '<': triggered = metricValue < rule.value; break;
      case '>=': triggered = metricValue >= rule.value; break;
      case '<=': triggered = metricValue <= rule.value; break;
      case '==': triggered = metricValue === rule.value; break;
    }

    if (triggered) {
      const cooldownKey = `${rule.id}:${serverId}`;
      const lastTime = lastTriggered.get(cooldownKey) || 0;
      const cooldownMs = rule.cooldownMinutes * 60 * 1000;

      if (Date.now() - lastTime > cooldownMs) {
        lastTriggered.set(cooldownKey, Date.now());
        
        const incidentId = `inc-auto-${Date.now()}`;
        const timestamp = new Date().toISOString();
        
        // Create incident in database
        db.prepare(`INSERT INTO incidents (id, serverId, title, description, severity, status, timestamp)
          VALUES (?, ?, ?, ?, ?, 'open', ?)`).run(
            incidentId, serverId,
            `[AUTO] ${rule.metric.toUpperCase()} ${rule.severity.toUpperCase()}`,
            `${server.name} ${rule.metric} is at ${metricValue}% (threshold: ${rule.operator} ${rule.value})`,
            rule.severity,
            timestamp
          );
        
        console.log(`[THRESHOLD] Alert triggered for ${server.name}: ${rule.metric} is ${metricValue}%`);

        // Log audit
        db.prepare("INSERT INTO audit_logs (id, type, event, detail, timestamp) VALUES (?, ?, ?, ?, ?)")
          .run(`audit-${Date.now()}`, "SYSTEM", "THRESHOLD_ALERT", 
            `Server ${server.name} exceeded ${rule.metric} threshold: ${metricValue}%`, timestamp);
      }
    }
  }
}
