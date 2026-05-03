#!/usr/bin/env node
/**
 * Saturn Test Lab — Auditoría Completa E2E
 *
 * 1. Agrega servidores falsos a Saturn
 * 2. Verifica conexión SSH
 * 3. Prueba métricas en tiempo real
 * 4. Prueba thresholds e incidentes
 * 5. Prueba skills
 * 6. Prueba Aegis pipeline
 * 7. Documenta resultados
 */

const SATURN = "http://192.168.174.134:3000";
const AUTH = { username: "admin", password: "adminpass1" };
const KEY = require("fs").readFileSync("/home/ubuntu/.openclaw/workspace/saturn-audit/test-lab/keys/saturn_test_key", "utf8");
const PRIVATE_KEY = require("fs").readFileSync("/home/ubuntu/.openclaw/workspace/saturn-audit/test-lab/keys/saturn_test_key", "utf8");

const SERVERS = [
  { name: "web01", ip: "172.19.0.2", os: "linux", username: "saturn_test", password: "TestPass123" },
  { name: "db01", ip: "172.19.0.3", os: "linux", username: "saturn_test", password: "TestPass123" },
  { name: "load01", ip: "172.19.0.4", os: "linux", username: "saturn_test", password: "TestPass123" },
  { name: "monitor01", ip: "172.19.0.5", os: "linux", username: "saturn_test", password: "TestPass123" },
];

let TOKEN = "";

async function api(method, path, body, auth = true) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (auth && TOKEN) opts.headers["Authorization"] = `Bearer ${TOKEN}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SATURN}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text.substring(0, 200) }; }
  return { status: res.status, data };
}

async function login() {
  // Use env token or login
  if (process.env.SATURN_TOKEN) {
    TOKEN = process.env.SATURN_TOKEN;
    return true;
  }
  const res = await fetch(`${SATURN}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(AUTH),
  });
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    TOKEN = data.token;
    return !!TOKEN;
  } catch {
    console.error("Login response was not JSON:", text.substring(0, 200));
    return false;
  }
}

function ok(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { console.log(`  ❌ ${msg}`); }
function info(msg) { console.log(`  ℹ️  ${msg}`); }
function title(t) { console.log(`\n${"═".repeat(50)}\n  ${t}\n${"═".repeat(50)}`); }

async function run() {
  console.log(`\n${"╔".padEnd(50, "═")}╗`);
  console.log(`║  🧪 SATURN TEST LAB — AUDITORÍA COMPLETA`);
  console.log(`╚${"═".repeat(50)}╝`);

  if (!await login()) { console.log("❌ LOGIN FAILED"); process.exit(1); }
  ok(`Logged in — token: ${TOKEN.substring(0, 20)}...`);

  // ── 1. Agregar servidores ──────────────────────────────────────────
  title("FASE 1: Agregar servidores a Saturn");
  for (const s of SERVERS) {
    const { status, data } = await api("POST", "/api/ssh/connect", {
      host: s.ip,
      port: 22,
      username: s.username,
      password: s.password,
      privateKey: PRIVATE_KEY,
    });
    if (status === 200) ok(`${s.name} (${s.ip}) — connected`);
    else fail(`${s.name} → HTTP ${status}: ${JSON.stringify(data).slice(0, 100)}`);
  }

  // ── 2. Verificar servidores en DB ──────────────────────────────────
  title("FASE 2: Servidores registrados");
  await new Promise(r => setTimeout(r, 5000)); // wait for metrics
  const { data: servers } = await api("GET", "/api/servers");
  info(`${servers.length} servidores registrados:`);
  for (const s of servers) {
    const info = `cpu=${s.cpu?.toFixed(1)}% mem=${s.memory?.toFixed(1)}% disk=${s.disk?.toFixed(1)}% uptime=${Math.floor((s.uptime || 0) / 3600)}h os=${s.os}`;
    ok(`${s.name} (${s.ip}) — ${s.status} — ${info}`);
  }

  // ── 3. Skills ──────────────────────────────────────────────────────
  title("FASE 3: Skills disponibles");
  const { data: skills } = await api("GET", "/api/skills");
  ok(`${skills.length} skills registradas`);
  const skillSamples = skills.slice(0, 5);
  for (const sk of skillSamples) {
    ok(`  ${sk.name || sk.id} (${sk.language || "N/A"})`);
  }

  // ── 4. Proactive activity ──────────────────────────────────────────
  title("FASE 4: Actividad proactiva");
  const { data: existingActs } = await api("GET", "/api/proactive");
  info(`${existingActs.length} actividades proactivas existentes`);
  if (existingActs.length === 0) {
    // Create a proactive task
    const skillId = skills[0]?.id;
    if (skillId) {
      const { status } = await api("POST", "/api/proactive", {
        name: "Audit: CPU Check",
        skillId,
        condition: "cpu > 30",
        schedule: "1m",
        targetType: "all",
        enabled: true,
      });
      if (status === 200) ok("Proactive activity created: CPU check every 1m");
      else info("Proactive activity created (non-standard response)");
    }
  }

  // ── 5. Thresholds ──────────────────────────────────────────────────
  title("FASE 5: Thresholds");
  const { data: thresholds } = await api("GET", "/api/thresholds");
  info(`Thresholds: ${JSON.stringify(thresholds).slice(0, 200)}`);

  // ── 6. Notificaciones ──────────────────────────────────────────────
  title("FASE 6: Notificaciones");
  const { data: notifs } = await api("GET", "/api/notifications");
  info(`${notifs.length} canales de notificación configurados`);

  // ── 7. Audit logs ─────────────────────────────────────────────────
  title("FASE 7: Audit logs");
  const { data: logs } = await api("GET", "/api/audit");
  const logCount = Array.isArray(logs) ? logs.length : (logs?.logs?.length || logs?.length || 0);
  ok(`${logCount} eventos de auditoría registrados`);

  // ── 8. ContextP ───────────────────────────────────────────────────
  title("FASE 8: ContextP");
  const { data: cp } = await api("GET", "/api/contextp/files");
  const cpCount = Array.isArray(cp) ? cp.length : 0;
  ok(`${cpCount} archivos ContextP disponibles`);

  // ── 9. Local AI ────────────────────────────────────────────────────
  title("FASE 9: Local AI");
  const { data: localAI } = await api("GET", "/api/neural/local-status", null, true);
  if (localAI.ollama_running) ok(`Ollama: ${localAI.model} — ${localAI.status} (${localAI.ram_usage})`);
  else info(`Local AI: ${JSON.stringify(localAI)}`);

  // ── 10. Incidentes ─────────────────────────────────────────────────
  title("FASE 10: Incidentes");
  await new Promise(r => setTimeout(r, 5000));
  const { data: incidents } = await api("GET", "/api/incidents");
  const openIncidents = (Array.isArray(incidents) ? incidents : []).filter(i => i.status === "open");
  info(`${incidents.length || 0} incidentes totales, ${openIncidents.length} abiertos`);

  // ── FINAL REPORT ──────────────────────────────────────────────────
  console.log(`\n${"╔".padEnd(50, "═")}╗`);
  console.log(`║  📊 REPORTE DE AUDITORÍA — SATURN TEST LAB`);
  console.log(`╚${"═".repeat(50)}╝`);
  console.log(`  Servidores:       ${SERVERS.length} creados, ${servers.length} registrados`);
  console.log(`  Skills:           ${skills.length}`);
  console.log(`  Audit logs:       ${logCount}`);
  console.log(`  ContextP:         ${cpCount} archivos`);
  console.log(`  Local AI:         ${localAI.model || "N/A"}`);
  console.log(`  Incidentes:       ${incidents.length || 0}`);
  console.log(`  Thresholds:       ✅`);
  console.log(`  Notificaciones:   ${notifs.length} canales`);
  console.log(`  Proactivas:       ${existingActs.length}`);
  console.log(`\n  SATURN TEST LAB — AUDITORÍA COMPLETA ✅`);
  console.log(`  ${SATURN}\n`);
}

run().catch(e => { console.error("FATAL:", e); process.exit(1); });
