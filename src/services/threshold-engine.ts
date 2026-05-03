import type { Database } from 'better-sqlite3';
import { sendNotification } from './notification-service.js';

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
 * Resets all in-memory cooldown timers. Useful for testing.
 */
export function resetThresholdCooldowns(): void {
  lastTriggered.clear();
}

/**
 * Evaluates server metrics against configured thresholds.
 * If a threshold is exceeded, it creates an incident and triggers notifications.
 */
export async function evaluateThresholds(serverId: string, serverName: string, metrics: any, db: Database): Promise<void> {
  const server = { ...metrics, name: serverName };
  // Try to load custom thresholds for this server, fallback to defaults
  const customThresholds = db.prepare("SELECT * FROM threshold_configs WHERE serverId = ?").all(serverId) as any[];
  
  const rulesToEvaluate = customThresholds.length > 0 
    ? customThresholds.flatMap(ct => {
        const critical = ct.critical ?? 90;
        const warning = ct.warning ?? 80;
        return [
          {
            id: `custom-${ct.metric}-${ct.serverId}-critical`,
            metric: ct.metric,
            operator: '>',
            value: critical,
            severity: 'critical' as const,
            cooldownMinutes: 30
          },
          {
            id: `custom-${ct.metric}-${ct.serverId}-warning`,
            metric: ct.metric,
            operator: '>',
            value: warning,
            severity: 'warning' as const,
            cooldownMinutes: 60
          }
        ];
      })
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

      // Also check DB for recent incidents (survives restarts)
      const recentIncident = db.prepare(
        "SELECT COUNT(*) as c FROM incidents WHERE serverId = ? AND title = ? AND timestamp > datetime('now', '-' || ? || ' minutes')"
      ).get(serverId, `[AUTO] ${rule.metric.toUpperCase()} ${rule.severity.toUpperCase()}`, rule.cooldownMinutes) as any;

      if (Date.now() - lastTime > cooldownMs && recentIncident.c === 0) {
        lastTriggered.set(cooldownKey, Date.now());
        
        const incidentId = `inc-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
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

        // Log audit with compliance tag
        const auditId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        db.prepare("INSERT INTO audit_logs (id, type, event, detail, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?)")
          .run(auditId, "SYSTEM", "THRESHOLD_ALERT", 
            `Server ${server.name} exceeded ${rule.metric} threshold: ${metricValue}%`,
            JSON.stringify({ _compliance: true, metric: rule.metric, value: metricValue, threshold: rule.value, severity: rule.severity }),
            timestamp);

        // Send notification for threshold breach
        const isCritical = rule.severity === 'critical';
        sendNotification(db, 'threshold_breach',
          `${isCritical ? '🚨' : '⚠️'} ${rule.metric.toUpperCase()} threshold ${isCritical ? 'CRITICAL' : 'breached'} on ${serverName}`,
          `${rule.metric} = ${metricValue}% (threshold: ${rule.operator} ${rule.value})`,
          rule.severity,
          { metric: rule.metric, serverId, value: metricValue, threshold: rule.value, severity: rule.severity }
        ).catch(e => console.error('[NOTIFY] Threshold notification failed:', e.message));
      }
    }
  }
}
