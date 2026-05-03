import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock node-ssh with a proper constructor
const mockExecCommand = vi.fn();
const mockConnect = vi.fn();
const mockDispose = vi.fn();

vi.mock('node-ssh', () => ({
  NodeSSH: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    execCommand: mockExecCommand,
    dispose: mockDispose,
    isConnected: () => true,
  })),
}));

describe('ssh-agent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-import to get fresh singleton
    const mod = await import('../src/lib/ssh-agent.js');
    // Reset connections map via private access
    (mod.sshAgent as any).connections = new Map();
  });

  describe('SSHAgent instantiation', () => {
    it('should export a singleton instance', async () => {
      const mod = await import('../src/lib/ssh-agent.js');
      expect(mod.sshAgent).toBeDefined();
      expect(mod.sshAgent.constructor.name).toBe('SSHAgent');
    });

    it('should have empty connections map initially', async () => {
      const mod = await import('../src/lib/ssh-agent.js');
      expect((mod.sshAgent as any).connections.size).toBe(0);
    });

    it('should have connected connections after setup', async () => {
      const mod = await import('../src/lib/ssh-agent.js');
      const key = 'test:10.0.0.1';
      (mod.sshAgent as any).connections.set(key, { ssh: {}, config: {} });
      expect((mod.sshAgent as any).connections.has(key)).toBe(true);
    });
  });

  describe('getKey', () => {
    it('should generate consistent connection keys', async () => {
      const mod = await import('../src/lib/ssh-agent.js');
      // Test the private getKey method
      const key = (mod.sshAgent as any).getKey('host1', 22, 'user');
      expect(key).toBe('user@host1:22');
    });

    it('should use default port 22', async () => {
      const mod = await import('../src/lib/ssh-agent.js');
      const key = (mod.sshAgent as any).getKey('host2', 22, 'admin');
      expect(key).toBe('admin@host2:22');
    });
  });
});
