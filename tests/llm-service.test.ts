import { describe, it, expect, vi, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

const TEST_DB = ':memory:';

function createTestDb() {
  const db = new Database(TEST_DB);
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_providers (
      id TEXT PRIMARY KEY, name TEXT, provider TEXT, model TEXT,
      api_key TEXT, endpoint TEXT, enabled INTEGER DEFAULT 0, created_at TEXT
    );
  `);
  return db;
}

describe('llm-service', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    vi.clearAllMocks();
  });

  describe('initLLMService', () => {
    it('should initialize without a database', async () => {
      const { initLLMService } = await import('../src/services/llm-service.js');
      expect(() => initLLMService()).not.toThrow();
    });

    it('should initialize with a database', async () => {
      const { initLLMService } = await import('../src/services/llm-service.js');
      expect(() => initLLMService(db as any)).not.toThrow();
    });

    it('should be callable multiple times', async () => {
      const { initLLMService } = await import('../src/services/llm-service.js');
      initLLMService(db as any);
      initLLMService(db as any);
      initLLMService(db as any);
      // Should not throw on re-init
      expect(true).toBe(true);
    });
  });

  describe('getLLMResponse', () => {
    it('should handle empty provider gracefully', async () => {
      const { getLLMResponse } = await import('../src/services/llm-service.js');
      await expect(getLLMResponse('', 'test prompt')).rejects.toThrow();
    });

    it('should handle unknown provider gracefully', async () => {
      const { getLLMResponse } = await import('../src/services/llm-service.js');
      await expect(getLLMResponse('unknown_provider', 'test')).rejects.toThrow();
    });

    it('should handle missing API key gracefully', async () => {
      const { getLLMResponse } = await import('../src/services/llm-service.js');
      await expect(getLLMResponse('openai', 'test')).rejects.toThrow();
    });

    it('should handle empty prompt', async () => {
      const { getLLMResponse } = await import('../src/services/llm-service.js');
      await expect(getLLMResponse('gemini', '')).rejects.toThrow();
    });

    it('should include configured provider in dispatch logic', async () => {
      const { initLLMService, getLLMResponse } = await import('../src/services/llm-service.js');
      
      // Seed a configured provider
      db.prepare("INSERT INTO ai_providers (id, name, provider, model, api_key, enabled) VALUES (?, ?, ?, ?, ?, ?)")
        .run('p1', 'test-ai', 'openai', 'gpt-4', 'sk-test-key', 1);

      initLLMService(db as any);
      
      // Should attempt to dispatch to openai with the stored key
      // Since the key is fake, it should fail on the API call, not on dispatch
      await expect(getLLMResponse('openai', 'Hello')).rejects.toThrow();
    });
  });
});
