const { readFileSync, writeFileSync, readdirSync } = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(process.cwd(), 'src/routes');

// Map status codes to error codes
const STATUS_CODES = {
  400: 'BAD_REQUEST',
  401: 'AUTH_ERROR',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
};

// Generate a specific error code from the message
function deriveCode(msg, status) {
  const base = STATUS_CODES[status] || 'ERROR';
  
  const specificCodes = {
    'No SSH connection': 'NO_SSH',
    'Credential not found': 'CRED_NOT_FOUND',
    'User already exists': 'USER_EXISTS',
    'Server not found': 'SERVER_NOT_FOUND',
    'Invalid credentials': 'AUTH_ERROR',
    'Refresh token required': 'TOKEN_REQUIRED',
    'Invalid refresh token': 'INVALID_TOKEN',
    'Invalid or expired refresh token': 'TOKEN_EXPIRED',
    'User not found': 'USER_NOT_FOUND',
    'Username and password required': 'VALIDATION_ERROR',
    'thresholds must be an array': 'VALIDATION_ERROR',
    'providerId and model are required': 'VALIDATION_ERROR',
    'prompt is required': 'VALIDATION_ERROR',
    'prompt and serverId are required': 'VALIDATION_ERROR',
    'Script required': 'VALIDATION_ERROR',
    'serverId required': 'VALIDATION_ERROR',
    'Missing fields': 'VALIDATION_ERROR',
    'Metric must be': 'VALIDATION_ERROR',
    'Invalid path': 'VALIDATION_ERROR',
    'Host not allowed': 'SSRF_BLOCKED',
    'Host and username are required': 'VALIDATION_ERROR',
    'credId is required': 'VALIDATION_ERROR',
    'credId, instanceId, and command are required': 'VALIDATION_ERROR',
    'Command required': 'VALIDATION_ERROR',
    'botToken required': 'VALIDATION_ERROR',
    'botToken and chatId required': 'VALIDATION_ERROR',
    'contexp.proposito is required': 'VALIDATION_ERROR',
    'skill_id and rating': 'VALIDATION_ERROR',
    'id, type, domain, and title are required': 'VALIDATION_ERROR',
  };

  for (const [key, code] of Object.entries(specificCodes)) {
    if (msg.includes(key)) return code;
  }
  return base;
}

const files = readdirSync(ROUTES_DIR).filter(f => f.endsWith('.ts')).sort();

for (const file of files) {
  if (file === 'auth.ts' || file === 'skills.ts') continue; // Already done
  const fullPath = path.join(ROUTES_DIR, file);
  let content = readFileSync(fullPath, 'utf-8');
  let changed = false;
  
  // Pattern 1: return res.status(N).json({ error: "msg" });
  content = content.replace(
    /return res\.status\((\d+)\)\.json\(\{ error: "([^"]+)" \}\)/g,
    (match, status, msg) => {
      changed = true;
      const code = deriveCode(msg, parseInt(status));
      return `return res.status(${status}).json({ success: false, error: "${msg}", code: "${code}", status: ${status} })`;
    }
  );
  
  // Pattern 2: return res.status(N).json({ error: "msg", code: "..." });
  content = content.replace(
    /return res\.status\((\d+)\)\.json\(\{ error: "([^"]+)", code: "([^"]+)" \}\)/g,
    (match, status, msg, code) => {
      changed = true;
      return `return res.status(${status}).json({ success: false, error: "${msg}", code: "${code}", status: ${status} })`;
    }
  );
  
  // Pattern 3: res.status(N).json({ error: "msg" }); (no return)
  content = content.replace(
    /(\s+)res\.status\((\d+)\)\.json\(\{ error: "([^"]+)" \}\)/g,
    (match, ws, status, msg) => {
      changed = true;
      const code = deriveCode(msg, parseInt(status));
      return `${ws}res.status(${status}).json({ success: false, error: "${msg}", code: "${code}", status: ${status} })`;
    }
  );
  
  // Pattern 4: res.status(N).json({ error: e.message }) or error.message
  content = content.replace(
    /res\.status\((\d+)\)\.json\(\{ error: (e\.message|error\.message) \}\)/g,
    (match, status, msgVar) => {
      changed = true;
      const code = STATUS_CODES[parseInt(status)] || 'ERROR';
      return `res.status(${status}).json({ success: false, error: ${msgVar}, code: "${code}", status: ${status} })`;
    }
  );
  
  if (changed) {
    writeFileSync(fullPath, content, 'utf-8');
    console.log(`✅ ${file}: Updated`);
  } else {
    console.log(`➖ ${file}: No changes`);
  }
}

console.log('\nDone!');
