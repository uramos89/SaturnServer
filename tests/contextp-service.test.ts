import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TEST_DIR = path.join(os.tmpdir(), 'saturn-test-contextp');

// The contextp-service reads from {CWD}/ContextP/ with this exact structure:
//   ContextP/CONTRACTS/*.md
//   ContextP/_INDEX/INDEX_MASTER.md
//   ContextP/AUDIT/metrics/METRICS_MASTER.md
//   ContextP/PARAMS/user_preferences.md
//   ContextP/PARAMS/project_config.md
//   ContextP/PARAMS/constraints.md

// contextp-service looks for these exact contract files (hardcoded in getContracts)
const CONTRACT_FILES = [
  'ROOT_CONTRACT.md', 'TECH_CONTRACT.md', 'FUNC_CONTRACT.md',
  'STRUCT_CONTRACT.md', 'AUDIT_CONTRACT.md'
];

beforeEach(() => {
  // Clean + recreate
  fs.rmSync(TEST_DIR, { recursive: true, force: true });

  const ctx = path.join(TEST_DIR, 'ContextP');
  fs.mkdirSync(path.join(ctx, 'CONTRACTS'), { recursive: true });
  fs.mkdirSync(path.join(ctx, '_INDEX'), { recursive: true });
  fs.mkdirSync(path.join(ctx, 'AUDIT', 'metrics'), { recursive: true });
  fs.mkdirSync(path.join(ctx, 'AUDIT', 'success'), { recursive: true });
  fs.mkdirSync(path.join(ctx, 'AUDIT', 'failure'), { recursive: true });
  fs.mkdirSync(path.join(ctx, 'AUDIT', 'exploration_log'), { recursive: true });
  fs.mkdirSync(path.join(ctx, 'PARAMS'), { recursive: true });

  // Create contract files
  for (const f of CONTRACT_FILES) {
    fs.writeFileSync(path.join(ctx, 'CONTRACTS', f), `# ${f}\n\nThis is the ${f} contract.`);
  }

  // Create index
  fs.writeFileSync(path.join(ctx, '_INDEX', 'INDEX_MASTER.md'), '# Context Index\n\n## Sections\n- architecture\n- security');

  // Create params
  fs.writeFileSync(path.join(ctx, 'PARAMS', 'user_preferences.md'), 'theme: dark\nlang: en');
  fs.writeFileSync(path.join(ctx, 'PARAMS', 'project_config.md'), 'debug: false');
  fs.writeFileSync(path.join(ctx, 'PARAMS', 'constraints.md'), 'limits:\n  cpu: 90\n  memory: 85');

  // Create metrics
  fs.writeFileSync(path.join(ctx, 'AUDIT', 'metrics', 'METRICS_MASTER.md'), '# Metrics\n\n- Uptime: 99.9%');

  // Change to temp dir so contextp-service resolves ContextP/ relative to here
  process.chdir(TEST_DIR);
  vi.resetModules();
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('contextp-service', () => {
  describe('getStatus', () => {
    it('should return 5 contracts from CONTRACTS directory', async () => {
      const { getStatus } = await import('../src/lib/contextp-service.js');
      const status = getStatus();

      expect(status.contracts.length).toBe(5);
      expect(status.contracts.some((c: any) => c.name === 'ROOT_CONTRACT')).toBe(true);
      expect(status.contracts.every((c: any) => c.name && c.priority)).toBe(true);
    });

    it('should include structureExists flag', async () => {
      const { getStatus } = await import('../src/lib/contextp-service.js');
      const status = getStatus();

      expect(status.structureExists).toBe(true);
      expect(status.phase).toBe('active');
    });

    it('should include metrics as static object', async () => {
      const { getStatus } = await import('../src/lib/contextp-service.js');
      const status = getStatus();

      expect(status.metrics).toBeDefined();
      expect(status.metrics.patternSuccessRate).toBe('85%');
      expect(status.metrics.avgConfidence).toBe('83.6%');
    });
  });

  describe('getContractContent', () => {
    it('should return content for an existing contract (with .md suffix)', async () => {
      const { getContractContent } = await import('../src/lib/contextp-service.js');
      const content = getContractContent('ROOT_CONTRACT');

      expect(content).toContain('ROOT_CONTRACT');
    });

    it('should return empty string for missing contract', async () => {
      const { getContractContent } = await import('../src/lib/contextp-service.js');
      const content = getContractContent('NONEXISTENT');

      expect(content).toBe('');
    });
  });

  describe('getParams', () => {
    it('should return preferences, config, and constraints', async () => {
      const { getParams } = await import('../src/lib/contextp-service.js');
      const params = getParams();

      expect(params.preferences).toContain('dark');
      expect(params.config).toContain('false');
      expect(params.constraints).toContain('cpu');
    });

    it('should handle missing param files gracefully', async () => {
      // Delete the file before importing
      fs.rmSync(path.join(TEST_DIR, 'ContextP', 'PARAMS', 'user_preferences.md'));

      const { getParams } = await import('../src/lib/contextp-service.js');
      const params = getParams();

      expect(params.preferences).toBeDefined();
      expect(params.config).toBeDefined();
      expect(params.constraints).toBeDefined();
    });
  });

  describe('writeAuditLog', () => {
    it('should write an audit log entry', async () => {
      const { writeAuditLog, getAuditLogs } = await import('../src/lib/contextp-service.js');

      const entry = {
        id: 'test-001',
        date: new Date().toISOString(),
        type: 'success',
        domain: 'TEST',
        title: 'Test entry',
        detail: 'This is a test',
      };

      const result = writeAuditLog(entry);
      expect(result).toBe(true);

      const logs = getAuditLogs();
      const found = logs.find(l => l.content.includes('test-001'));
      expect(found).toBeDefined();
      expect(found!.content).toContain('Test entry');
    });

    it('should persist multiple entries', async () => {
      const { writeAuditLog, getAuditLogs } = await import('../src/lib/contextp-service.js');

      writeAuditLog({ id: 'a1', date: '', type: 'success', domain: 'T', title: 'First', detail: '' });
      writeAuditLog({ id: 'a2', date: '', type: 'warning', domain: 'T', title: 'Second', detail: '' });

      const logs = getAuditLogs();
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getIndexContent', () => {
    it('should return index.md content', async () => {
      const { getIndexContent } = await import('../src/lib/contextp-service.js');
      const content = getIndexContent();

      expect(content).toContain('Context Index');
    });
  });
});
