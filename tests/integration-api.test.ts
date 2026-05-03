import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

let app: Express;
let token: string;

beforeAll(async () => {
  const mod = await import('./helpers/create-test-app.js');
  const testApp = await mod.createTestApp();
  app = testApp.app;
  token = testApp.token;
});

const auth = () => `Bearer ${token}`;

describe('Incidents API', () => {
  it('POST /api/incidents/create should create an incident', async () => {
    const res = await request(app)
      .post('/api/incidents/create')
      .set('Authorization', auth())
      .send({ serverId: 's1', title: 'CPU Overload', description: 'CPU at 95%', severity: 'critical' });

    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('open');
  });

  it('GET /api/incidents should return incidents list', async () => {
    const res = await request(app)
      .get('/api/incidents')
      .set('Authorization', auth());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Notifications API', () => {
  const testWebhook = { type: 'webhook', destination: 'https://test.example.com/hook', config: '{}', enabled: 1 };

  it('POST /api/notifications should create a notification config', async () => {
    const res = await request(app)
      .post('/api/notifications/config')
      .set('Authorization', auth())
      .send(testWebhook);

    expect(res.status).toBe(200);
  });

  it('GET /api/notifications should return configs', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', auth());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Thresholds API', () => {
  it('POST /api/servers/:id/thresholds should set thresholds', async () => {
    const res = await request(app)
      .post('/api/servers/s1/thresholds')
      .set('Authorization', auth())
      .send({ thresholds: [{ metric: 'cpu', warning: 80, critical: 90 }] });

    expect(res.status).toBe(200);
  });

  it('GET /api/thresholds/s1 should return threshold configs', async () => {
    const res = await request(app)
      .get('/api/servers/s1/thresholds')
      .set('Authorization', auth());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Proactive Activities API', () => {
  const testActivity = {
    id: 'act-test-1',
    name: 'Test CPU Alert',
    skillId: 'skill-test',
    condition: 'cpu > 80',
    schedule: '5m',
    targetType: 'all',
    targets: [],
    enabled: 1
  };

  it('POST /api/proactive should create an activity', async () => {
    const res = await request(app)
      .post('/api/proactive')
      .set('Authorization', auth())
      .send(testActivity);

    expect(res.status).toBe(200);
  });

  it('GET /api/proactive should list activities', async () => {
    const res = await request(app)
      .get('/api/proactive')
      .set('Authorization', auth());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/proactive/history should return execution history', async () => {
    const res = await request(app)
      .get('/api/proactive/history')
      .set('Authorization', auth());

    expect(res.status).toBe(200);
  });

  it('DELETE /api/proactive/:id should delete an activity', async () => {
    const res = await request(app)
      .delete('/api/proactive/act-test-1')
      .set('Authorization', auth());

    expect(res.status).toBe(200);
  });
});

describe('Compliance API', () => {
  it('GET /api/compliance/report should return report', async () => {
    const res = await request(app)
      .get('/api/compliance/report')
      .set('Authorization', auth());

    expect(res.status).toBe(200);
    expect(res.body.totalEvents).toBeDefined();
    expect(res.body.eventsWithCompliance).toBeDefined();
    expect(res.body.gdpr).toBeDefined();
    expect(res.body.pci).toBeDefined();
    expect(res.body.hipaa).toBeDefined();
  });

  it('GET /api/audit should return audit logs', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', auth());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Skills API', () => {
  it('GET /api/skills should return skills', async () => {
    const res = await request(app)
      .get('/api/skills')
      .set('Authorization', auth());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/remediation/config should return configs', async () => {
    const res = await request(app)
      .get('/api/remediation/config')
      .set('Authorization', auth());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
