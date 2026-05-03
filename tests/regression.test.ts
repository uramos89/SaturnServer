import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import type { Express } from 'express';
import { evaluateThresholds, resetThresholdCooldowns } from '../src/services/threshold-engine.js';

let app: Express;
let db: Database.Database;
let token: string;

beforeAll(async () => {
  const mod = await import('./helpers/create-test-app.js');
  const testApp = await mod.createTestApp();
  app = testApp.app;
  db = testApp.db;
  token = testApp.token;
});

const auth = () => `Bearer ${token}`;

describe('RT-001: Threshold → Incident → Notification', () => {
  it('should create incidents when thresholds are exceeded and log to audit', async () => {
    resetThresholdCooldowns();

    // 1. Configure threshold
    const configRes = await request(app)
      .post('/api/servers/s1/thresholds')
      .set('Authorization', auth())
      .send({ thresholds: [{ metric: 'cpu', warning: 80, critical: 90 }] });

    expect(configRes.status).toBe(200);

    // 2. Create a server to evaluate
    db.prepare("INSERT OR IGNORE INTO servers (id, name, ip, cpu, memory, disk, status) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run('s1', 'test-node-1', '192.168.1.1', 95, 50, 30, 'online');

    // 3. Evaluate thresholds with high CPU
    await evaluateThresholds('s1', 'test-node-1', { cpu: 95, memory: 50, disk: 30 }, db as any);

    // 4. Verify incidents created in DB
    const incidents = db.prepare('SELECT * FROM incidents WHERE serverId = ?').all('s1') as any[];
    expect(incidents.length).toBeGreaterThanOrEqual(1);
    
    // At least one critical incident for cpu > 90
    const critical = incidents.find(i => i.severity === 'critical');
    expect(critical).toBeDefined();
    expect(critical.title).toContain('CPU');

    // 5. Verify audit log with compliance metadata
    const auditLogs = db.prepare("SELECT * FROM audit_logs WHERE event = 'THRESHOLD_ALERT'").all() as any[];
    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
    
    const meta = JSON.parse(auditLogs[0].metadata || '{}');
    expect(meta._compliance).toBeTruthy();
  });

  it('should NOT create duplicate incidents within cooldown', async () => {
    resetThresholdCooldowns();

    db.prepare("INSERT OR IGNORE INTO servers (id, name, ip, cpu, memory, disk, status) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run('s2', 'test-node-2', '192.168.1.2', 95, 50, 30, 'online');

    // First evaluation
    await evaluateThresholds('s2', 'test-node-2', { cpu: 95, memory: 50, disk: 30 }, db as any);
    const firstCount = (db.prepare('SELECT COUNT(*) as c FROM incidents WHERE serverId = ?').get('s2') as any).c;

    // Second evaluation (immediate) - cooldown should suppress
    await evaluateThresholds('s2', 'test-node-2', { cpu: 95, memory: 50, disk: 30 }, db as any);
    const secondCount = (db.prepare('SELECT COUNT(*) as c FROM incidents WHERE serverId = ?').get('s2') as any).c;

    expect(secondCount).toBe(firstCount);
  });
});

describe('RT-002: Incident Lifecycle', () => {
  it('should create, list, and resolve incidents via API', async () => {
    // Create
    const createRes = await request(app)
      .post('/api/incidents/create')
      .set('Authorization', auth())
      .send({ serverId: 's1', title: 'Regression Test', description: 'Testing full lifecycle', severity: 'warning' });

    expect(createRes.status).toBe(200);
    expect(createRes.body.status).toBe('open');
    const incidentId = createRes.body.id;

    // Verify it appears in list
    const listRes = await request(app)
      .get('/api/incidents')
      .set('Authorization', auth());

    expect(listRes.status).toBe(200);
    const found = listRes.body.find((i: any) => i.id === incidentId);
    expect(found).toBeDefined();

    // Resolve
    const resolveRes = await request(app)
      .post(`/api/incidents/${incidentId}/resolve`)
      .set('Authorization', auth());

    expect(resolveRes.status).toBe(200);
  });
});

describe('RT-003: Notification Config Lifecycle', () => {
  it('should create, list, and delete notifications', async () => {
    // Create webhook
    const createRes = await request(app)
      .post('/api/notifications/config')
      .set('Authorization', auth())
      .send({ type: 'webhook', destination: 'https://test.example.com/hook', config: '{}', enabled: 1 });

    expect(createRes.status).toBe(200);

    // List
    const listRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', auth());

    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThanOrEqual(1);
    const config = listRes.body.find((n: any) => n.destination === 'https://test.example.com/hook');
    expect(config).toBeDefined();

    // Delete
    if (config?.id) {
      const deleteRes = await request(app)
        .delete(`/api/notifications/${config.id}`)
        .set('Authorization', auth());

      expect(deleteRes.status).toBe(200);
    }
  });
});

describe('RT-004: Proactive Activities Full Cycle', () => {
  it('should create, execute history, and delete proactive activity', async () => {
    // Create
    const createRes = await request(app)
      .post('/api/proactive')
      .set('Authorization', auth())
      .send({
        id: 'reg-test-1',
        name: 'Regression Test Alert',
        skillId: 'skill-test',
        condition: 'cpu > 80',
        schedule: '5m',
        targetType: 'all',
        targets: [],
        enabled: 1
      });

    expect(createRes.status).toBe(200);

    // List (should include our new one)
    const listRes = await request(app)
      .get('/api/proactive')
      .set('Authorization', auth());

    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThanOrEqual(1);

    // History endpoint
    const historyRes = await request(app)
      .get('/api/proactive/history')
      .set('Authorization', auth());

    expect(historyRes.status).toBe(200);

    // Delete
    const deleteRes = await request(app)
      .delete('/api/proactive/reg-test-1')
      .set('Authorization', auth());

    expect(deleteRes.status).toBe(200);
  });
});

describe('RT-005: Compliance Report Integrity', () => {
  it('should generate a compliance report with valid structure', async () => {
    const res = await request(app)
      .get('/api/compliance/report')
      .set('Authorization', auth());

    expect(res.status).toBe(200);
    expect(res.body.totalEvents).toBeGreaterThanOrEqual(0);
    expect(typeof res.body.totalEvents).toBe('number');
    expect(res.body.gdpr.dataCategories).toContain('system');
    expect(res.body.pci.requirements).toContain('10.2');
    expect(res.body.hipaa.ePHI).toBe(false);
  });
});

describe('RT-006: Auth Coverage - All routes', () => {
  const protectedRoutes = [
    { method: 'get', path: '/api/skills' },
    { method: 'get', path: '/api/servers' },
    { method: 'get', path: '/api/incidents' },
    { method: 'get', path: '/api/notifications' },
    { method: 'get', path: '/api/audit' },
    { method: 'get', path: '/api/proactive' },
    { method: 'get', path: '/api/compliance/report' },
    { method: 'get', path: '/api/thresholds/s1' },
  ];

  protectedRoutes.forEach(({ method, path }) => {
    it(`${method.toUpperCase()} ${path} should reject without token`, async () => {
      const req = request(app)[method](path);
      const res = await req;
      expect(res.status).toBe(401);
    });
  });

  const publicRoutes = [
    { method: 'get', path: '/health' },
  ];

  publicRoutes.forEach(({ method, path }) => {
    it(`${method.toUpperCase()} ${path} should be accessible without token`, async () => {
      const req = request(app)[method](path);
      const res = await req;
      expect(res.status).toBe(200);
    });
  });
});
