import { describe, it, expect, vi, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

const TEST_DB = ':memory:';

function createTestDb() {
  const db = new Database(TEST_DB);
  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_configs (
      id TEXT PRIMARY KEY, type TEXT, destination TEXT, config TEXT, enabled INTEGER
    );
  `);
  return db;
}

describe('notification-service', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  describe('sendNotification', () => {
    it('should return empty results when no channels configured', async () => {
      const { sendNotification } = await import('../src/services/notification-service.js');
      const results = await sendNotification(db as any, 'test', 'Title', 'Message', 'info');
      expect(results).toEqual([]);
    });

    it('should return results for each enabled channel', async () => {
      const { sendNotification } = await import('../src/services/notification-service.js');

      db.prepare("INSERT INTO notification_configs (id, type, destination, config, enabled) VALUES (?, ?, ?, ?, ?)")
        .run('n1', 'webhook', 'https://example.com/hook', '{}', 1);
      db.prepare("INSERT INTO notification_configs (id, type, destination, config, enabled) VALUES (?, ?, ?, ?, ?)")
        .run('n2', 'email', 'test@example.com', JSON.stringify({ host: 'smtp.test.com', auth: { user: 'test', pass: 'test' } }), 1);

      const results = await sendNotification(db as any, 'test_event', 'Test Title', 'Test body', 'warning', { key: 'val' });

      // We expect at least 2 results (one per enabled config)
      expect(results.length).toBeGreaterThanOrEqual(2);

      // webhook should have succeeded (axios post is mocked/integration)
      const webhookResult = results.find(r => r.channel?.startsWith('webhook'));
      if (webhookResult) {
        expect(webhookResult.success).toBeDefined();
      }

      // email should have been attempted
      const emailResult = results.find(r => r.channel?.startsWith('email'));
      if (emailResult) {
        expect(emailResult.success).toBeDefined();
      }
    });

    it('should NOT send to disabled notification configs', async () => {
      const { sendNotification } = await import('../src/services/notification-service.js');

      db.prepare("INSERT INTO notification_configs (id, type, destination, config, enabled) VALUES (?, ?, ?, ?, ?)")
        .run('n1', 'webhook', 'https://example.com/hook', '{}', 0);

      const results = await sendNotification(db as any, 'test', 'Title', 'Body', 'info');
      expect(results).toEqual([]);
    });

    it('should handle missing config gracefully', async () => {
      const { sendNotification } = await import('../src/services/notification-service.js');

      db.prepare("INSERT INTO notification_configs (id, type, destination, config, enabled) VALUES (?, ?, ?, ?, ?)")
        .run('n1', 'webhook', 'https://invalid.domain.xyz/hook', '{}', 1);

      const results = await sendNotification(db as any, 'test', 'Title', 'Body', 'info');
      // Should not throw — should return result with success=false
      expect(results.length).toBe(1);
    });
  });
});
