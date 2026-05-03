import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type Database from 'better-sqlite3';

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

describe('Auth & Security', () => {
  describe('POST /api/admin/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'admin', password: 'saturn2024' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe('admin');
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'admin', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid');
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'ghost', password: 'anything' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid');
    });

    it('should enforce rate limiting after 5 attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/admin/login')
          .send({ username: 'admin', password: 'wrong' });
      }
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'admin', password: 'wrong' });

      expect(res.status).toBe(429);
    });
  });

  describe('JWT Middleware', () => {
    it('should allow access to health endpoint without token', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('should reject /api routes without token', async () => {
      const res = await request(app).get('/api/skills');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token provided');
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/skills')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid or expired');
    });

    it('should allow access with valid token', async () => {
      const res = await request(app)
        .get('/api/skills')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });
});

describe('Skills API', () => {
  it('GET /api/skills should return skill list', async () => {
    const res = await request(app)
      .get('/api/skills')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Health endpoint', () => {
  it('should return system health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.engine).toContain('ARES');
  });
});
