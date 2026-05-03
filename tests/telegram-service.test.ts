import { describe, it, expect, vi, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

const TEST_DB = ':memory:';

function createTestDb() {
  const db = new Database(TEST_DB);
  db.exec(`
    CREATE TABLE IF NOT EXISTS servers (id TEXT PRIMARY KEY, name TEXT, ip TEXT, os TEXT, status TEXT, cpu REAL, memory REAL, disk REAL);
    CREATE TABLE IF NOT EXISTS incidents (id TEXT PRIMARY KEY, serverId TEXT, severity TEXT, title TEXT, description TEXT, status TEXT, timestamp TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS obpa_cycles (id TEXT PRIMARY KEY, incidentId TEXT, phase TEXT, observation TEXT, proposal TEXT, remediation_script TEXT, execution_result TEXT, confidence REAL, status TEXT DEFAULT 'pending', timestamp TEXT);
    CREATE TABLE IF NOT EXISTS skills (id TEXT PRIMARY KEY, name TEXT, language TEXT, version TEXT, description TEXT, path TEXT, enabled INTEGER DEFAULT 1);
    CREATE TABLE IF NOT EXISTS ssh_connections (id TEXT PRIMARY KEY, serverId TEXT UNIQUE, host TEXT, port INTEGER, username TEXT, status TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS proactive_activities (id TEXT PRIMARY KEY, name TEXT, skillId TEXT, condition TEXT, schedule TEXT, targetType TEXT, targets TEXT, enabled INTEGER, last_run TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS proactive_execution_history (id TEXT PRIMARY KEY, activityId TEXT, activityName TEXT, serverId TEXT, condition TEXT, status TEXT, executed_at TEXT);
    CREATE TABLE IF NOT EXISTS ai_providers (id TEXT PRIMARY KEY, name TEXT, provider TEXT, model TEXT, api_key TEXT, endpoint TEXT, enabled INTEGER DEFAULT 0, created_at TEXT);
  `);
  return db;
}

// Mock axios to prevent actual HTTP calls
vi.mock('axios', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: { ok: true } }),
  },
}));

describe('telegram-service', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    vi.clearAllMocks();
  });

  describe('formatNotification', () => {
    it('should format a notification with HTML tags', async () => {
      const { formatNotification } = await import('../src/services/telegram-service.js');
      const result = formatNotification('cpu_alert', 'CPU Critical', 'CPU at 95%', 'critical');

      expect(result).toContain('🚨');
      expect(result).toContain('<b>');
      expect(result).toContain('CPU at 95%');
    });

    it('should use appropriate icons for each severity', async () => {
      const { formatNotification } = await import('../src/services/telegram-service.js');

      expect(formatNotification('e', 't', 'm', 'critical')).toContain('🚨');
      expect(formatNotification('e', 't', 'm', 'warning')).toContain('⚠️');
      expect(formatNotification('e', 't', 'm', 'info')).toContain('ℹ️');
      expect(formatNotification('e', 't', 'm', 'success')).toContain('✅');
      expect(formatNotification('e', 't', 'm', 'failed')).toContain('❌');
    });
  });

  describe('sendTelegramMessage', () => {
    it('should return an OK result', async () => {
      const { sendTelegramMessage } = await import('../src/services/telegram-service.js');
      const result = await sendTelegramMessage('fake:token', '12345', 'Test message');
      expect(result).toHaveProperty('ok');
    });
  });

  describe('routeCommand', () => {
    it('should handle /status command without servers', async () => {
      const { routeCommand } = await import('../src/services/telegram-service.js');

      await expect(
        routeCommand('bot:token', '12345', '/status', [], db as any)
      ).resolves.toBeUndefined();
    });

    it('should handle /incidents command without incidents', async () => {
      const { routeCommand } = await import('../src/services/telegram-service.js');

      await expect(
        routeCommand('bot:token', '12345', '/incidents', [], db as any)
      ).resolves.toBeUndefined();
    });

    it('should handle /help command', async () => {
      const { routeCommand } = await import('../src/services/telegram-service.js');

      await expect(
        routeCommand('bot:token', '12345', '/help', [], db as any)
      ).resolves.toBeUndefined();
    });

    it('should handle /remediate with no open incidents', async () => {
      const { routeCommand } = await import('../src/services/telegram-service.js');

      await expect(
        routeCommand('bot:token', '12345', '/remediate', [], db as any)
      ).resolves.toBeUndefined();
    });

    it('should handle unknown commands gracefully', async () => {
      const { routeCommand } = await import('../src/services/telegram-service.js');

      await expect(
        routeCommand('bot:token', '12345', '/nonexistent', [], db as any)
      ).resolves.toBeUndefined();
    });

    it('should return incident details for /incident command', async () => {
      db.prepare("INSERT INTO incidents (id, serverId, severity, title, description, status, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run('inc-1', 's1', 'critical', 'CPU Overload', 'CPU at 99%', 'open', new Date().toISOString());

      const { routeCommand } = await import('../src/services/telegram-service.js');

      await expect(
        routeCommand('bot:token', '12345', '/incident', ['inc-1'], db as any)
      ).resolves.toBeUndefined();
    });
  });

  describe('handleTelegramUpdate', () => {
    it('should handle /status update', async () => {
      const { handleTelegramUpdate } = await import('../src/services/telegram-service.js');

      const update = {
        message: {
          chat: { id: 12345 },
          text: '/status',
          message_id: 1,
          date: Math.floor(Date.now() / 1000),
        },
      };

      await expect(
        handleTelegramUpdate('bot:token', update, db as any)
      ).resolves.toBeUndefined();
    });

    it('should handle natural language (spanish)', async () => {
      const { handleTelegramUpdate } = await import('../src/services/telegram-service.js');

      const update = {
        message: {
          chat: { id: 12345 },
          text: 'incidentes',
          message_id: 2,
          date: Math.floor(Date.now() / 1000),
        },
      };

      await expect(
        handleTelegramUpdate('bot:token', update, db as any)
      ).resolves.toBeUndefined();
    });

    it('should handle unknown commands', async () => {
      const { handleTelegramUpdate } = await import('../src/services/telegram-service.js');

      const update = {
        message: {
          chat: { id: 12345 },
          text: 'xyznonexistent',
          message_id: 3,
          date: Math.floor(Date.now() / 1000),
        },
      };

      await expect(
        handleTelegramUpdate('bot:token', update, db as any)
      ).resolves.toBeUndefined();
    });
  });
});
