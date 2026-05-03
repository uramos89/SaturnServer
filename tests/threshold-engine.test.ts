import { describe, it, expect, vi, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

// Mock notification-service BEFORE importing threshold-engine
vi.mock('../src/services/notification-service.js', () => ({
  sendNotification: vi.fn().mockResolvedValue([]),
}));

const TEST_DB = ':memory:';

function createTestDb() {
  const db = new Database(TEST_DB);
  db.exec(`
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY, serverId TEXT, severity TEXT, title TEXT,
      description TEXT, status TEXT, timestamp TEXT
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY, type TEXT, event TEXT, detail TEXT, metadata TEXT, timestamp TEXT
    );
    CREATE TABLE IF NOT EXISTS threshold_configs (
      serverId TEXT, metric TEXT, warning REAL, critical REAL,
      PRIMARY KEY (serverId, metric)
    );
    CREATE TABLE IF NOT EXISTS notification_configs (
      id TEXT PRIMARY KEY, type TEXT, destination TEXT, config TEXT, enabled INTEGER
    );
  `);
  return db;
}

describe('threshold-engine', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    vi.clearAllMocks();
  });

  describe('evaluateThresholds with custom configs', () => {
    it('should create both warning and critical incidents when metric exceeds critical', async () => {
      const { evaluateThresholds, resetThresholdCooldowns } = await import('../src/services/threshold-engine.js');
      resetThresholdCooldowns();

      db.prepare('INSERT INTO threshold_configs (serverId, metric, warning, critical) VALUES (?, ?, ?, ?)')
        .run('s1', 'cpu', 80, 90);

      await evaluateThresholds('s1', 'test-server', { cpu: 95, memory: 50, disk: 30 }, db as any);

      // custom config generates 2 rules (warning + critical). cpu=95 exceeds both.
      const incidents = db.prepare('SELECT * FROM incidents').all() as any[];
      expect(incidents.length).toBe(2);
      expect(incidents.some((i: any) => i.severity === 'critical')).toBe(true);
      expect(incidents.some((i: any) => i.severity === 'warning')).toBe(true);
    });

    it('should create a warning incident when metric exceeds warning but not critical', async () => {
      const { evaluateThresholds, resetThresholdCooldowns } = await import('../src/services/threshold-engine.js');
      resetThresholdCooldowns();

      db.prepare('INSERT INTO threshold_configs (serverId, metric, warning, critical) VALUES (?, ?, ?, ?)')
        .run('s1', 'cpu', 80, 90);

      await evaluateThresholds('s1', 'test-server', { cpu: 85, memory: 50, disk: 30 }, db as any);

      // 85 > 80 (warning) but 85 NOT > 90 (critical) → only warning triggers
      const incidents = db.prepare('SELECT * FROM incidents').all() as any[];
      expect(incidents.length).toBe(1);
      expect(incidents[0].severity).toBe('warning');
    });

    it('should NOT create an incident when metric is below warning', async () => {
      const { evaluateThresholds, resetThresholdCooldowns } = await import('../src/services/threshold-engine.js');
      resetThresholdCooldowns();

      db.prepare('INSERT INTO threshold_configs (serverId, metric, warning, critical) VALUES (?, ?, ?, ?)')
        .run('s1', 'cpu', 80, 90);

      await evaluateThresholds('s1', 'test-server', { cpu: 50, memory: 50, disk: 30 }, db as any);

      const incidents = db.prepare('SELECT * FROM incidents').all() as any[];
      expect(incidents.length).toBe(0);
    });
  });

  describe('evaluateThresholds with DEFAULT_RULES', () => {
    it('should use default rules when no custom configs exist', async () => {
      const { evaluateThresholds, resetThresholdCooldowns } = await import('../src/services/threshold-engine.js');
      resetThresholdCooldowns();

      // No custom configs — use defaults: cpu-warning(>75), cpu-critical(>90)
      await evaluateThresholds('s1', 'test-server', { cpu: 95, memory: 50, disk: 30 }, db as any);

      const incidents = db.prepare('SELECT * FROM incidents').all() as any[];
      // 95 > 90 (critical) AND 95 > 75 (warning/high) = 2 incidents
      expect(incidents.length).toBe(2);
    });

    it('should respect cooldown and not create duplicates', async () => {
      const { evaluateThresholds, resetThresholdCooldowns } = await import('../src/services/threshold-engine.js');
      resetThresholdCooldowns();

      // First call
      await evaluateThresholds('s1', 'test-server', { cpu: 95, memory: 50, disk: 30 }, db as any);
      const firstCount = (db.prepare('SELECT COUNT(*) as c FROM incidents').get() as any).c;

      // Second call immediately after — cooldown should suppress
      await evaluateThresholds('s1', 'test-server', { cpu: 95, memory: 50, disk: 30 }, db as any);
      const secondCount = (db.prepare('SELECT COUNT(*) as c FROM incidents').get() as any).c;

      expect(secondCount).toBe(firstCount); // No new incidents
    });
  });

  describe('Audit logging', () => {
    it('should log threshold breaches to audit_logs', async () => {
      const { evaluateThresholds, resetThresholdCooldowns } = await import('../src/services/threshold-engine.js');
      resetThresholdCooldowns();

      db.prepare('INSERT INTO threshold_configs (serverId, metric, warning, critical) VALUES (?, ?, ?, ?)')
        .run('s1', 'cpu', 80, 90);

      await evaluateThresholds('s1', 'test-server', { cpu: 95, memory: 50, disk: 30 }, db as any);

      const logs = db.prepare("SELECT * FROM audit_logs WHERE event = 'THRESHOLD_ALERT'").all() as any[];
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].detail).toContain('95%');

      const meta = JSON.parse(logs[0].metadata || '{}');
      expect(meta._compliance).toBeTruthy();
    });
  });

  describe('Notification dispatch', () => {
    it('should call sendNotification on threshold breach', async () => {
      const { sendNotification } = await import('../src/services/notification-service.js');
      const { evaluateThresholds, resetThresholdCooldowns } = await import('../src/services/threshold-engine.js');
      resetThresholdCooldowns();

      db.prepare('INSERT INTO threshold_configs (serverId, metric, warning, critical) VALUES (?, ?, ?, ?)')
        .run('s1', 'cpu', 80, 90);

      await evaluateThresholds('s1', 'test-server', { cpu: 95, memory: 50, disk: 30 }, db as any);

      expect(sendNotification).toHaveBeenCalled();
    });
  });
});
