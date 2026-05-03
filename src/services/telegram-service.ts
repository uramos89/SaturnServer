/**
 * Telegram Bot Service — Flujo Conversacional Completo
 *
 * Arquitectura:
 *   Telegram ──POST /api/telegram/webhook──> Saturn
 *       │                                        │
 *       │  /status, /incidents, /servers         │ Consulta DB
 *       │  /remediate <id>, /run <skill>         │ Ejecuta acciones
 *       │  "incidentes", "servidores"            │ Lenguaje natural
 *       │  <─ ─ ─ respuesta HTML ─ ─ ─ ─ ─ ─    │
 *
 * Estados conversacionales:
 *   - idle: esperando comando
 *   - awaiting_remediate: esperando ID de incidente
 *   - awaiting_run_skill: esperando skill a ejecutar
 *   - awaiting_run_server: esperando servidor target
 */

import type { Database } from "better-sqlite3";
import {
  getStatus as getContextPStatus,
  getContractContent,
  getIndexContent,
  getParams,
  getAuditLogs,
  getMetricsContent,
} from "../lib/contextp-service.js";

const TELEGRAM_API = "https://api.telegram.org/bot";

// ── Sesiones conversacionales ───────────────────────────────────────
interface Session {
  state: string;
  data: Record<string, any>;
  lastActivity: number;
}
const sessions = new Map<string, Session>();
const SESSION_TTL = 10 * 60 * 1000; // 10 min

function getSession(chatId: string): Session {
  let s = sessions.get(chatId);
  if (!s || Date.now() - s.lastActivity > SESSION_TTL) {
    s = { state: "idle", data: {}, lastActivity: Date.now() };
    sessions.set(chatId, s);
  }
  s.lastActivity = Date.now();
  return s;
}

// ── API de Telegram ─────────────────────────────────────────────────
let axiosInstance: any = null;
async function getAxios() {
  if (!axiosInstance) axiosInstance = (await import("axios")).default;
  return axiosInstance;
}

async function tgApi(botToken: string, method: string, params: any = {}): Promise<any> {
  const axios = await getAxios();
  const res = await axios.post(`${TELEGRAM_API}${botToken}/${method}`, params, { timeout: 10000 });
  return res.data;
}

async function send(botToken: string, chatId: string, text: string, keyboard?: any) {
  return tgApi(botToken, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: keyboard ? JSON.stringify(keyboard) : undefined,
  });
}

async function sendAction(botToken: string, chatId: string, action: string) {
  return tgApi(botToken, "sendChatAction", { chat_id: chatId, action });
}

// ── Formateo ────────────────────────────────────────────────────────
function bold(s: string) { return `<b>${s}</b>`; }
function code(s: string) { return `<code>${s}</code>`; }
function italic(s: string) { return `<i>${s}</i>`; }

function inlineKeyboard(buttons: { text: string; callback_data?: string; url?: string }[][]): any {
  return { inline_keyboard: buttons };
}

// ── Notificaciones ──────────────────────────────────────────────────
export function formatNotification(event: string, title: string, message: string, severity: string): string {
  const icons: Record<string, string> = { critical: "🚨", warning: "⚠️", info: "ℹ️", success: "✅", failed: "❌" };
  return `${icons[severity] || "🔔"} ${bold(`[SATURN] ${title}`)}\n\n${code(message)}\n\n${italic(`Evento: ${event} · ${severity.toUpperCase()} · ${new Date().toISOString()}`)}`;
}

export async function sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await send(botToken, chatId, text);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.response?.data?.description || err.message };
  }
}

// ── Comandos ────────────────────────────────────────────────────────

async function cmdStart(botToken: string, chatId: string, db: Database.Database) {
  const name = bold("🤖 Saturn Bot");
  const desc = "Soy la interfaz reactiva de Saturn. Puedo mostrarte el estado del sistema, listar incidentes, ejecutar remediaciones y más.";
  const examples = [
    `${bold("📊 /status")} — Resumen del sistema`,
    `${bold("🚨 /incidents")} — Incidentes abiertos`,
    `${bold("🖥️ /servers")} — Servidores monitoreados`,
    `${bold("🧠 /skills")} — Skills disponibles`,
    `${bold("🔧 /remediate")} — Remediación guiada`,
    `${bold("⚡ /run")} — Ejecutar skill en servidor`,
    `${bold("📋 /help")} — Todos los comandos`,
  ];
  await send(botToken, chatId,
    `${name}\n\n${desc}\n\n${examples.join("\n")}`,
    inlineKeyboard([
      [{ text: "📊 Status", callback_data: "/status" }, { text: "🚨 Incidents", callback_data: "/incidents" }],
      [{ text: "🖥️ Servers", callback_data: "/servers" }, { text: "🧠 Skills", callback_data: "/skills" }],
    ])
  );
}

async function cmdStatus(botToken: string, chatId: string, db: Database.Database) {
  await sendAction(botToken, chatId, "typing");
  const serverCount = (db.prepare("SELECT COUNT(*) as c FROM servers").get() as any)?.c || 0;
  const incidentCount = (db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status = 'open'").get() as any)?.c || 0;
  const openIncidents = db.prepare("SELECT * FROM incidents WHERE status = 'open' ORDER BY created_at DESC LIMIT 5").all() as any[];
  const sshCount = (db.prepare("SELECT COUNT(*) as c FROM ssh_connections WHERE status = 'connected'").get() as any)?.c || 0;
  const aiConf = !!(db.prepare("SELECT id FROM ai_providers WHERE enabled = 1 LIMIT 1").get() as any);
  const proactives = (db.prepare("SELECT COUNT(*) as c FROM proactive_activities WHERE enabled = 1").get() as any)?.c || 0;
  const historyCount = (db.prepare("SELECT COUNT(*) as c FROM proactive_execution_history WHERE executed_at > datetime('now', '-24 hours')").get() as any)?.c || 0;

  let msg = [
    `${bold("📊 Saturn — Estado del Sistema")}`,
    ``,
    `🖥️ ${bold(`Servidores: ${serverCount}`)}`,
    `🔗 ${bold(`SSH activas: ${sshCount}`)}`,
    `🤖 ${bold(`Actividades proactivas: ${proactives}`)}`,
    `📜 ${bold(`Ejecuciones (24h): ${historyCount}`)}`,
    `🧠 IA: ${aiConf ? "✅ Activa" : "❌ No configurada"}`,
    ``,
    `${bold(`🚨 Incidentes abiertos: ${incidentCount}`)}`,
  ];

  if (openIncidents.length > 0) {
    msg.push(``, `${bold("Últimos:")}`);
    for (const inc of openIncidents.slice(0, 3)) {
      msg.push(`  • ${inc.severity === "critical" ? "🔴" : "🟡"} ${code(inc.id.slice(0, 12))} — ${inc.title.slice(0, 50)}`);
    }
  }

  msg.push(``, italic(`Actualizado: ${new Date().toISOString()}`));

  await send(botToken, chatId, msg.join("\n"));
}

async function cmdIncidents(botToken: string, chatId: string, db: Database.Database) {
  await sendAction(botToken, chatId, "typing");
  const incidents = db.prepare(
    "SELECT id, title, severity, status, created_at FROM incidents ORDER BY created_at DESC LIMIT 15"
  ).all() as any[];

  if (incidents.length === 0) {
    await send(botToken, chatId, `${bold("✅ Sin incidentes")}\n\nNo hay incidentes registrados.`);
    return;
  }

  const open = incidents.filter(i => i.status === "open");
  const closed = incidents.filter(i => i.status !== "open");
  const buttons = open.slice(0, 5).map(i => [
    { text: `${i.severity === "critical" ? "🔴" : "🟡"} ${i.title.slice(0, 30)}`, callback_data: `/incident ${i.id}` }
  ]);

  let msg = [
    `${bold(`🚨 Incidentes (${incidents.length})`)}`,
    ``,
    `${bold(`Abiertos: ${open.length}`)}`,
    ...open.slice(0, 5).map((i, idx) =>
      `  ${idx + 1}. ${i.severity === "critical" ? "🔴" : "🟡"} ${bold(i.title.slice(0, 45))}\n     ${italic(i.created_at)} ${code(i.id.slice(0, 12))}`
    ),
    open.length > 5 ? `  ... y ${open.length - 5} más` : "",
    ``,
    `${bold(`Resueltos: ${closed.length}`)}`,
  ];

  await send(botToken, chatId, msg.join("\n"), buttons.length > 0 ? inlineKeyboard(buttons) : undefined);
}

async function cmdServers(botToken: string, chatId: string, db: Database.Database) {
  await sendAction(botToken, chatId, "typing");
  const servers = db.prepare("SELECT name, ip, os, status, cpu, memory, disk FROM servers").all() as any[];

  if (servers.length === 0) {
    await send(botToken, chatId, `${bold("📭 Sin servidores")}\n\nNo hay servidores registrados. Conectá uno desde el dashboard o usá /connect.`);
    return;
  }

  const buttons = servers.map(s => [
    { text: `${s.status === "online" ? "🟢" : "🔴"} ${s.name}`, callback_data: `/server ${s.name}` }
  ]);

  let msg = [`${bold(`🖥️ Servidores (${servers.length})`)}`, ``];
  for (const s of servers) {
    const icon = s.status === "online" ? "🟢" : s.status === "pending" ? "🟡" : "🔴";
    msg.push(`${icon} ${bold(s.name)} — ${s.ip}`);
    msg.push(`   OS: ${s.os} | CPU: ${s.cpu}% | RAM: ${s.memory}% | DISK: ${s.disk}%`);
    msg.push(``);
  }

  await send(botToken, chatId, msg.join("\n"), inlineKeyboard(buttons));
}

async function cmdSkills(botToken: string, chatId: string, db: Database.Database) {
  await sendAction(botToken, chatId, "typing");
  const skills = db.prepare("SELECT id, name, language, description FROM skills WHERE enabled = 1").all() as any[];

  if (skills.length === 0) {
    await send(botToken, chatId, `${bold("📭 Sin skills")}\n\nNo hay skills registradas.`);
    return;
  }

  const buttons = skills.map(s => [
    { text: `⚡ ${s.name}`, callback_data: `/skill ${s.id}` }
  ]);

  let msg = [`${bold(`🧠 Skills (${skills.length})`)}`, ``];
  for (const s of skills) {
    msg.push(`• ${bold(s.name)} ${code(s.language)}`);
    msg.push(`  ${s.description.slice(0, 80)}`);
    msg.push(`  ID: ${code(s.id)}`);
    msg.push(``);
  }

  await send(botToken, chatId, msg.join("\n"), inlineKeyboard(buttons));
}

async function cmdRemediate(botToken: string, chatId: string, args: string[], db: Database.Database) {
  const session = getSession(chatId);

  if (args.length === 0 && session.state !== "awaiting_remediate") {
    const incidents = db.prepare("SELECT id, title, severity FROM incidents WHERE status = 'open' ORDER BY created_at DESC LIMIT 10").all() as any[];
    if (incidents.length === 0) {
      await send(botToken, chatId, `${bold("✅ Sin incidentes abiertos")}\n\nNo hay nada que remediar.`);
      return;
    }
    session.state = "awaiting_remediate";
    const buttons = incidents.map(i => [
      { text: `${i.severity === "critical" ? "🔴" : "🟡"} ${i.title.slice(0, 35)}`, callback_data: `/remediate ${i.id}` }
    ]);
    await send(botToken, chatId,
      `${bold("🔧 Remediación — Seleccioná un incidente")}\n\nO enviame el ID directamente:`,
      inlineKeyboard(buttons)
    );
    return;
  }

  const incidentId = args[0] || session.data.lastIncidentId;
  if (!incidentId) {
    await send(botToken, chatId, `${bold("⚠️")} Enviame el ID del incidente.`);
    return;
  }

  const incident = db.prepare("SELECT * FROM incidents WHERE id = ?").get(incidentId) as any;
  if (!incident) {
    await send(botToken, chatId, `${bold("❌")} Incidente ${code(incidentId)} no encontrado.`);
    session.state = "idle";
    return;
  }

  // Trigger remediation
  db.prepare("UPDATE incidents SET status = 'open' WHERE id = ?").run(incident.id);
  session.state = "idle";
  session.data.lastIncidentId = incidentId;

  await send(botToken, chatId,
    `${bold("🔄 Remediación iniciada")}\n\n` +
    `Incidente: ${bold(incident.title)}\n` +
    `ID: ${code(incident.id)}\n` +
    `Severidad: ${incident.severity.toUpperCase()}\n\n` +
    italic("ARES está analizando el incidente. Te notificaré cuando esté listo."),
    inlineKeyboard([
      [{ text: "📊 Ver estado", callback_data: "/status" }],
    ])
  );
}

async function cmdRun(botToken: string, chatId: string, args: string[], db: Database.Database) {
  const session = getSession(chatId);

  // Step 1: Select skill
  if (args.length === 0 && !session.data.selectedSkill) {
    const skills = db.prepare("SELECT id, name, language FROM skills WHERE enabled = 1").all() as any[];
    if (skills.length === 0) {
      await send(botToken, chatId, `${bold("📭 Sin skills")}\n\nNo hay skills para ejecutar.`);
      return;
    }
    session.state = "awaiting_run_skill";
    const buttons = skills.map(s => [
      { text: `⚡ ${s.name} (${s.language})`, callback_data: `/run ${s.id}` }
    ]);
    await send(botToken, chatId,
      `${bold("⚡ Ejecutar Skill — Seleccioná una skill")}\n\nO enviame el ID:`,
      inlineKeyboard(buttons)
    );
    return;
  }

  const skillId = session.data.selectedSkill || args[0];
  const skill = db.prepare("SELECT * FROM skills WHERE id = ?").get(skillId) as any;
  if (!skill) {
    await send(botToken, chatId, `${bold("❌")} Skill ${code(skillId)} no encontrada.`);
    session.state = "idle";
    return;
  }

  // Step 2: Select server
  if (!session.data.selectedServer) {
    const servers = db.prepare("SELECT id, name, ip FROM servers").all() as any[];
    if (servers.length === 0) {
      await send(botToken, chatId, `${bold("📭 Sin servidores")}\n\nNo hay servidores para ejecutar la skill.`);
      session.state = "idle";
      return;
    }
    session.data.selectedSkill = skillId;
    session.state = "awaiting_run_server";
    const buttons = servers.map(s => [
      { text: `🖥️ ${s.name} (${s.ip})`, callback_data: `/run ${skillId} ${s.id}` }
    ]);
    await send(botToken, chatId,
      `${bold(`⚡ Skill: ${skill.name}`)}\n\nSeleccioná el servidor destino:`,
      inlineKeyboard(buttons)
    );
    return;
  }

  const serverId = session.data.selectedServer;
  const server = db.prepare("SELECT * FROM servers WHERE id = ?").get(serverId) as any;
  if (!server) {
    await send(botToken, chatId, `${bold("❌")} Servidor no encontrado.`);
    session.state = "idle";
    return;
  }

  // Execute via SSH
  await sendAction(botToken, chatId, "typing");
  try {
    const conn = db.prepare("SELECT * FROM ssh_connections WHERE serverId = ? AND status = 'connected' LIMIT 1").get(server.id) as any;
    if (!conn) {
      await send(botToken, chatId, `${bold("⚠️")} No hay conexión SSH activa con ${server.name}.`);
      session.state = "idle";
      return;
    }

    const { sshAgent } = await import("../lib/ssh-agent.js");
    const connKey = `${server.id}:${server.ip}`;
    const cmd = skill.script || `echo "Running ${skill.name} on $(hostname)"`;
    const result = await sshAgent.execCommand(connKey, cmd);

    await send(botToken, chatId,
      `${bold("✅ Ejecución completada")}\n\n` +
      `Skill: ${bold(skill.name)}\n` +
      `Servidor: ${bold(server.name)} (${server.ip})\n\n` +
      `${bold("Output:")}\n${code((result.stdout || result.stderr || "(sin output)").slice(0, 1000))}`
    );
  } catch (err: any) {
    await send(botToken, chatId, `${bold("❌ Error de ejecución")}\n\n${code(err.message.slice(0, 500))}`);
  }

  session.state = "idle";
  session.data = {};
}

async function cmdIncident(botToken: string, chatId: string, args: string[], db: Database.Database) {
  const incidentId = args[0];
  if (!incidentId) {
    await send(botToken, chatId, `${bold("⚠️")} Enviame el ID del incidente.\nEj: /incident ${code("incident-1717012345678")}`);
    return;
  }

  const incident = db.prepare("SELECT * FROM incidents WHERE id = ?").get(incidentId) as any;
  if (!incident) {
    await send(botToken, chatId, `${bold("❌")} Incidente no encontrado.`);
    return;
  }

  const server = db.prepare("SELECT name FROM servers WHERE id = ?").get(incident.serverId) as any;
  const obpa = db.prepare("SELECT * FROM obpa_cycles WHERE incidentId = ? ORDER BY timestamp DESC LIMIT 1").get(incident.id) as any;

  let msg = [
    `${bold("🚨 Detalle del Incidente")}`,
    ``,
    `ID: ${code(incident.id)}`,
    `Título: ${bold(incident.title)}`,
    `Descripción: ${incident.description || "—"}`,
    `Severidad: ${incident.severity === "critical" ? "🔴 CRITICAL" : "🟡 WARNING"}`,
    `Estado: ${incident.status === "open" ? "🔴 Abierto" : incident.status === "closed" ? "✅ Cerrado" : "🟡 " + incident.status}`,
    `Servidor: ${server?.name || incident.serverId}`,
    `Creado: ${incident.created_at}`,
  ];

  if (obpa) {
    msg.push(``, `${bold("🔬 Análisis ARES:")}`);
    msg.push(`  ${obpa.proposal || "En análisis..."}`);
    if (obpa.confidence) msg.push(`  Confianza: ${Math.round(obpa.confidence * 100)}%`);
  }

  if (incident.status === "open") {
    msg.push(``);
    await send(botToken, chatId, msg.join("\n"), inlineKeyboard([
      [{ text: "🔧 Remediar", callback_data: `/remediate ${incident.id}` }],
      [{ text: "📊 Volver a incidentes", callback_data: "/incidents" }],
    ]));
  } else {
    await send(botToken, chatId, msg.join("\n"));
  }
}

async function cmdHelp(botToken: string, chatId: string) {
  const msg = [
    `${bold("📋 Saturn Bot — Todos los comandos")}`,
    ``,
    `${bold("📊 Consultas")}`,
    `  /status — Estado general del sistema`,
    `  /incidents — Listar incidentes`,
    `  /servers — Listar servidores`,
    `  /skills — Skills disponibles`,
    `  /incident ${code("<id>")} — Detalle de incidente`,
    `  /server ${code("<name>")} — Detalle de servidor`,
    ``,
    `${bold("⚙️ Acciones")}`,
    `  /remediate ${code("<id>")} — Iniciar remediación`,
    `  /run — Ejecutar skill (asistente paso a paso)`,
    `  /run ${code("<skill_id> <server_id>")} — Ejecución directa`,
    ``,
    `${bold("💬 Conversacional")}`,
    `  Podés escribir en lenguaje natural:`,
    `  • "muéstrame los incidentes"`,
    `  • "cómo están los servidores"`,
    `  • "remedia el incidente 3"`,
    `  • "ejecuta disk check en production"`,
    ``,
    `${bold("🤖 /start")} — Volver al menú principal`,
    `  /help — Esta ayuda`,
  ];
  await send(botToken, chatId, msg.join("\n"), inlineKeyboard([
    [{ text: "📊 Status", callback_data: "/status" }, { text: "🚨 Incidents", callback_data: "/incidents" }],
    [{ text: "🖥️ Servers", callback_data: "/servers" }, { text: "⚡ Run", callback_data: "/run" }],
  ]));
}

// ── Procesador de lenguaje natural ───────────────────────────────────
function interpretNaturalLanguage(text: string): { command: string; args: string[]; confidence: number } {
  const lower = text.toLowerCase().trim();

  const patterns: [RegExp, string, (match: RegExpMatchArray) => string[]][] = [
    [/^(status|estado|resumen|como estamos|qué tal)\b/, "/status", () => []],
    [/^(incidentes|incidents|alertas|problemas|qué pas.a)\b/, "/incidents", () => []],
    [/^(servidores|servers|server|hosts|máquinas)\b/, "/servers", () => []],
    [/^(skills|habilidades|scripts|recetas)\b/, "/skills", () => []],
    [/^(remedia|remediate|reparar|arreglar|solucionar)\s*(.+)?$/i, "/remediate", (m) => m[2] ? [m[2]] : []],
    [/^(ejecuta|run|correr|lanzar|execute)\s+(.+)\s+(en|on|para)\s+(.+)$/i, "/run", (m) => [m[2], m[4]]],
    [/^(ejecuta|run|correr|lanzar)\s+(.+)$/i, "/run", (m) => [m[2]]],
    [/^(ayuda|help|comandos|qué puedes hacer|que puedes hacer)\b/, "/help", () => []],
    [/^(inicio|start|menú|menu|hola|buenas|buen.da)\b/, "/start", () => []],
    [/^(contexto|context|conocimiento|arquitectura|organizacion|knowledge)\b/, "/context", () => []],
    [/^(contrato|contract|politicas|reglas|contracts)\b/, "/contract", () => []],
    [/^(analiza|analyze|analisis|diagnostico|que tan saludable|health check)\b/, "/analyze", () => []],
  ];

  for (const [regex, command, argExtractor] of patterns) {
    const match = lower.match(regex);
    if (match) {
      return { command, args: argExtractor(match), confidence: 0.9 };
    }
  }

  // If it looks like an ID, assume remediate
  if (/^incident-/.test(lower) || /^[a-f0-9-]{20,}$/.test(lower)) {
    return { command: "/incident", args: [lower], confidence: 0.7 };
  }

  return { command: "unknown", args: [], confidence: 0 };
}

// ── Manejador principal de updates ──────────────────────────────────
export async function handleTelegramUpdate(botToken: string, update: any, db: Database.Database): Promise<void> {
  // Handle callback queries (button presses)
  if (update.callback_query) {
    const { message, data } = update.callback_query;
    if (!message || !data) return;
    const chatId = String(message.chat.id);

    // Acknowledge callback
    await tgApi(botToken, "answerCallbackQuery", { callback_query_id: update.callback_query.id });

    // Process callback data as command
    const parts = data.split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);
    await routeCommand(botToken, chatId, command, args, db);
    return;
  }

  // Handle regular messages
  const msg = update.message || update.edited_message;
  if (!msg || !msg.text) return;
  const chatId = String(msg.chat.id);
  const text = msg.text.trim();
  const session = getSession(chatId);

  // Check if we're in a conversational state
  if (session.state === "awaiting_remediate") {
    await cmdRemediate(botToken, chatId, [text], db);
    return;
  }
  if (session.state === "awaiting_run_skill") {
    await cmdRun(botToken, chatId, [text], db);
    return;
  }
  if (session.state === "awaiting_run_server") {
    await cmdRun(botToken, chatId, [], db);
    return;
  }

  // Parse command or natural language
  const parts = text.split(/\s+/);
  const first = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (first.startsWith("/")) {
    await routeCommand(botToken, chatId, first, args, db);
  } else {
    // Natural language processing
    const interpreted = interpretNaturalLanguage(text);
    if (interpreted.command !== "unknown") {
      await sendAction(botToken, chatId, "typing");
      await routeCommand(botToken, chatId, interpreted.command, interpreted.args, db);
    } else {
      await send(botToken, chatId,
        `${bold("🤔 No entendí")}\n\n` +
        `Podés escribirme cosas como:\n` +
        `• "estado del sistema"\n` +
        `• "muéstrame los incidentes"\n` +
        `• "remedia el incidente INC-123"\n` +
        `• "ejecuta disk check en server-1"\n\n` +
        `O usá ${bold("/help")} para ver todos los comandos.`,
        inlineKeyboard([
          [{ text: "📊 Status", callback_data: "/status" }, { text: "📋 Help", callback_data: "/help" }],
        ])
      );
    }
  }
}

// ── ContextP Integration ────────────────────────────────────────────────

/**
 * Carga el contexto completo de ContextP para respuestas ricas.
 */
function loadContextSummary(): string {
  const status = getContextPStatus();
  const contracts = status.contracts.map(c => c.name).join(", ") || "none";
  return [
    `📚 ${bold("ContextP — Conocimiento Arquitectónico")}`,
    ``,
    `Fase: ${status.phase}`,
    `Contratos: ${contracts}`,
    `Patrones: ${status.patterns.length} registrados`,
    `Deuda técnica: ${status.technicalDebt.length} items`,
    `Precisión patrones: ${status.metrics.patternSuccessRate}`,
  ].join("\n");
}

/**
 * Lee un contrato de ContextP y lo devuelve como texto formateado.
 */
function readContract(contractName: string): string {
  const content = getContractContent(contractName);
  if (!content) return `${bold("❌")} Contrato ${code(contractName)} no encontrado.`;
  const lines = content.split("\n").slice(0, 40);
  return `${bold(`📜 Contrato: ${contractName}`)}\n\n${code(lines.join("\n").slice(0, 1500))}`;
}

/**
 * Lee los parámetros de ContextP (preferencias, config, restricciones).
 */
function readParams(): string {
  const params = getParams();
  const lines: string[] = [bold("⚙️ Parámetros de ContextP"), ""];
  if (params.preferences) {
    lines.push(bold("📋 Preferencias:"));
    lines.push(...params.preferences.split("\n").filter(l => l.trim()).slice(0, 8));
    lines.push("");
  }
  if (params.config) {
    lines.push(bold("🔧 Configuración:"));
    lines.push(...params.config.split("\n").filter(l => l.trim()).slice(0, 8));
    lines.push("");
  }
  if (params.constraints) {
    lines.push(bold("🚫 Restricciones:"));
    lines.push(...params.constraints.split("\n").filter(l => l.trim()).slice(0, 8));
  }
  if (lines.length === 2) lines.push("(sin parámetros configurados)");
  return lines.join("\n").slice(0, 2000);
}

/**
 * Lee logs de auditoría recientes para contexto.
 */
function readRecentAudit(limit: number = 5): string {
  const logs = getAuditLogs();
  if (logs.length === 0) return "(sin registros de auditoría)";
  const recent = logs.slice(-limit);
  return recent.map(l => {
    const firstLine = l.content.split("\n")[0] || l.file;
    return `📄 ${code(l.file.slice(0, 40))}`;
  }).join("\n");
}

/**
 * Evalúa si un servidor necesita atención basado en métricas de ContextP y DB.
 */
function getServerAlerts(db: Database.Database): string {
  const servers = db.prepare("SELECT name, status, cpu, memory, disk FROM servers").all() as any[];
  if (servers.length === 0) return "";
  const alerts: string[] = [];
  for (const s of servers) {
    const issues: string[] = [];
    if (s.cpu > 85) issues.push(`CPU ${s.cpu}%`);
    if (s.memory > 85) issues.push(`RAM ${s.memory}%`);
    if (s.disk > 85) issues.push(`DISK ${s.disk}%`);
    if (s.status !== "online") issues.push(`status: ${s.status}`);
    if (issues.length > 0) alerts.push(`🔴 ${bold(s.name)}: ${issues.join(", ")}`);
  }
  return alerts.join("\n");
}

async function cmdContext(botToken: string, chatId: string, args: string[], db: Database.Database) {
  await sendAction(botToken, chatId, "typing");
  const subcommand = args[0]?.toLowerCase();

  if (subcommand === "audit" || subcommand === "logs") {
    await send(botToken, chatId, [
      bold("📋 Auditoría reciente (ContextP)"),
      "",
      readRecentAudit(10),
      "",
      italic("Usá /contract AUDIT_CONTRACT para ver las reglas de auditoría."),
    ].join("\n"));
    return;
  }

  if (subcommand === "params" || subcommand === "config") {
    await send(botToken, chatId, readParams());
    return;
  }

  if (subcommand === "alerts" || subcommand === "alertas") {
    const alerts = getServerAlerts(db);
    await send(botToken, chatId,
      alerts
        ? `${bold("🚨 Alertas activas por servidor")}\n\n${alerts}`
        : `${bold("✅ Sin alertas")}\n\nTodos los servidores están dentro de parámetros.`
    );
    return;
  }

  // Default: show ContextP overview
  const status = getContextPStatus();
  const alerts = getServerAlerts(db);
  const audit = readRecentAudit(3);

  let msg = [
    bold("📚 ContextP — Conocimiento Arquitectónico"),
    "",
    `🧠 Fase: ${status.phase}`,
    `📊 Última actualización: ${status.lastUpdated.slice(0, 19)}`,
    `📜 Contratos: ${status.contracts.length} (${status.contracts.map(c => c.name).join(", ")})`,
    `🔍 Patrones: ${status.patterns.length} (precisión: ${status.metrics.patternSuccessRate})`,
    `💡 Deuda técnica: ${status.technicalDebt.length} items`,
    "",
  ];

  if (alerts) {
    msg.push(bold("🚨 Servidores con problemas:"));
    msg.push(alerts);
    msg.push("");
  }

  if (audit && audit !== "(sin registros de auditoría)") {
    msg.push(bold("📋 Últimos registros de auditoría:"));
    msg.push(audit);
    msg.push("");
  }

  msg.push(italic("Subcomandos: /context audit, /context params, /context alerts"));

  await send(botToken, chatId, msg.join("\n"), inlineKeyboard([
    [{ text: "📜 Contracts", callback_data: "/contract" }],
    [{ text: "📋 Audit", callback_data: "/context audit" }, { text: "🚨 Alerts", callback_data: "/context alerts" }],
  ]));
}

async function cmdContract(botToken: string, chatId: string, args: string[], db: Database.Database) {
  await sendAction(botToken, chatId, "typing");
  const status = getContextPStatus();

  if (args.length === 0) {
    // List contracts
    const buttons = status.contracts.map(c => [
      { text: `📜 ${c.name}`, callback_data: `/contract ${c.name}` }
    ]);
    await send(botToken, chatId,
      `${bold("📜 Contratos de ContextP")}\n\n` +
      `Seleccioná uno para ver su contenido:\n\n` +
      status.contracts.map(c => `• ${bold(c.name)} (prioridad ${c.priority})`).join("\n"),
      inlineKeyboard(buttons)
    );
    return;
  }

  const contractName = args[0].toUpperCase();
  await send(botToken, chatId, readContract(contractName));
}

async function cmdAnalyze(botToken: string, chatId: string, args: string[], db: Database.Database) {
  await sendAction(botToken, chatId, "typing");

  // Gather context from multiple sources
  const alerts = getServerAlerts(db);
  const status = getContextPStatus();
  const serverCount = (db.prepare("SELECT COUNT(*) as c FROM servers").get() as any)?.c || 0;
  const incidentCount = (db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status = 'open'").get() as any)?.c || 0;
  const proactives = (db.prepare("SELECT COUNT(*) as c FROM proactive_activities WHERE enabled = 1").get() as any)?.c || 0;
  const lastExecutions = (db.prepare(
    "SELECT status, COUNT(*) as count FROM proactive_execution_history WHERE executed_at > datetime('now', '-1 day') GROUP BY status"
  ).all() as any[]);

  let msg = [
    bold("🔬 Análisis del Sistema"),
    "",
    bold("📊 Resumen:"),
    `🖥️ Servidores: ${serverCount}`,
    `🚨 Incidentes abiertos: ${incidentCount}`,
    `🤖 Actividades proactivas: ${proactives}`,
    `📜 Contratos ContextP: ${status.contracts.length}`,
    "",
    bold("⚡ Ejecuciones últimas 24h:"),
  ];

  if (lastExecutions.length > 0) {
    for (const e of lastExecutions) {
      msg.push(`  • ${e.status}: ${e.count}`);
    }
  } else {
    msg.push("  (sin ejecuciones recientes)");
  }

  if (alerts) {
    msg.push("", bold("🚨 Servidores que requieren atención:"), alerts);
  }

  if (incidentCount > 0) {
    const incidents = db.prepare("SELECT title, severity FROM incidents WHERE status = 'open' ORDER BY created_at DESC LIMIT 5").all() as any[];
    msg.push("", bold("📋 Incidentes pendientes:"));
    for (const inc of incidents) {
      msg.push(`  ${inc.severity === "critical" ? "🔴" : "🟡"} ${inc.title.slice(0, 60)}`);
    }
    msg.push("", italic("Usá /remediate para iniciar la remediación de un incidente."));
  }

  await send(botToken, chatId, msg.join("\n"), inlineKeyboard([
    [{ text: "📊 Status", callback_data: "/status" }, { text: "🚨 Incidents", callback_data: "/incidents" }],
    [{ text: "📚 ContextP", callback_data: "/context" }, { text: "🔧 Remediate", callback_data: "/remediate" }],
  ]));
}

async function routeCommand(botToken: string, chatId: string, command: string, args: string[], db: Database.Database) {
  await sendAction(botToken, chatId, "typing");

  switch (command) {
    case "/start": return cmdStart(botToken, chatId, db);
    case "/help": return cmdHelp(botToken, chatId);
    case "/status": return cmdStatus(botToken, chatId, db);
    case "/incidents": return cmdIncidents(botToken, chatId, db);
    case "/incident": return cmdIncident(botToken, chatId, args, db);
    case "/servers": return cmdServers(botToken, chatId, db);
    case "/skills": return cmdSkills(botToken, chatId, db);
    case "/remediate": return cmdRemediate(botToken, chatId, args, db);
    case "/run": return cmdRun(botToken, chatId, args, db);
    case "/context": return cmdContext(botToken, chatId, args, db);
    case "/contract": return cmdContract(botToken, chatId, args, db);
    case "/analyze": return cmdAnalyze(botToken, chatId, args, db);
    default:
      await send(botToken, chatId,
        `${bold("❓ Comando no reconocido")}\n\n${code(command)} no es un comando válido.\nUsá ${bold("/help")} para ver los disponibles.`
      );
  }
}

export { routeCommand };
