import { z } from "zod";

/**
 * SATURN-X Security Validation Schemas (Ticket 1.3)
 */

export const SSHConnectSchema = z.object({
  host: z.string().min(1).max(255).regex(/^[a-zA-Z0-9.-]+$/),
  port: z.number().int().min(1).max(65535).default(22),
  username: z.string().min(1).max(100),
  privateKey: z.string().optional(),
  password: z.string().optional(),
});

export const CommandExecSchema = z.object({
  command: z.string().min(1).max(10000),
});

export const UserCreateSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(128),
  role: z.enum(["admin", "viewer"]).default("admin"),
});

export const IncidentCreateSchema = z.object({
  serverId: z.string().uuid().or(z.string().min(1)),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  severity: z.enum(["low", "medium", "high", "critical"]),
});

export const AIConfigSchema = z.object({
  provider: z.string().min(1),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  enabled: z.boolean().default(true),
  endpoint: z.string().optional(),
});
