import pkg from 'enquirer';
const { Select, Input, Confirm, Toggle } = pkg;

import pc from 'picocolors';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

const DOTENV_PATH = path.join(process.cwd(), '.env');

async function checkDependencies() {
  console.log(pc.cyan('\n[Step 0] Checking System Dependencies...'));
  const deps = ['node', 'npm', 'git', 'pm2', 'docker'];
  const missing = [];

  for (const dep of deps) {
    try {
      execSync(`which ${dep}`, { stdio: 'ignore' });
      console.log(`${pc.green('✔')} ${dep} is installed`);
    } catch (e) {
      console.log(`${pc.red('✘')} ${dep} is missing`);
      missing.push(dep);
    }
  }

  if (missing.length > 0) {
    const { install } = await new Confirm({
      name: 'install',
      message: `Some dependencies are missing (${missing.join(', ')}). Try to install them via apt?`
    }).run();

    if (install) {
      console.log(pc.yellow('Please run this manually as root: sudo apt-get update && sudo apt-get install -y ' + missing.join(' ')));
    }
  }
}

async function handleExistingConfig() {
  if (fs.existsSync(DOTENV_PATH)) {
    const { action } = await new Select({
      name: 'action',
      message: '⚙️  Existing configuration found. What would you like to do?',
      choices: [
        { name: 'keep', message: 'Keep current configuration', value: 'keep' },
        { name: 'modify', message: 'Modify specific values', value: 'modify' },
        { name: 'reset', message: 'Reset to defaults', value: 'reset' }
      ]
    }).run();

    if (action === 'keep') {
      console.log(pc.green('Maintaining existing .env. Skipping configuration steps.'));
      return 'keep';
    }
    if (action === 'reset') {
      fs.unlinkSync(DOTENV_PATH);
      console.log(pc.yellow('Existing .env deleted. Starting fresh setup.'));
      return 'reset';
    }
    return 'modify';
  }
  return 'new';
}

async function setupAI() {
  console.log(pc.cyan('\n[Step 1] AI Engine & Remediation Core'));
  
  const { provider } = await new Select({
    name: 'provider',
    message: 'Select your preferred AI provider:',
    choices: ['Google Gemini', 'OpenAI', 'Anthropic', 'Ollama (Local)']
  }).run();

  let apiKey = '';
  if (provider !== 'Ollama (Local)') {
    apiKey = await new Input({
      name: 'apiKey',
      message: `Enter your ${provider} API Key:`,
      validate: (value) => value.length > 0 ? true : 'API Key is required'
    }).run();
  } else {
    console.log(pc.yellow('\nChecking for Ollama...'));
    try {
      execSync('ollama --version', { stdio: 'ignore' });
      console.log(pc.green('✔ Ollama detected locally.'));
    } catch (e) {
      const { installOllama } = await new Confirm({
        name: 'installOllama',
        message: 'Ollama not found. Would you like to install it now?'
      }).run();
      if (installOllama) {
        console.log(pc.cyan('Installing Ollama...'));
        execSync('curl -fsSL https://ollama.com/install.sh | sh', { stdio: 'inherit' });
      }
    }
  }

  return { provider, apiKey };
}

async function setupNetwork() {
  console.log(pc.cyan('\n[Step 2] Gateway & Network Security'));
  
  const { port } = await new Input({
    name: 'port',
    message: 'Set the HTTP port for Saturn Server:',
    initial: '3000',
    validate: (val) => !isNaN(parseInt(val)) ? true : 'Must be a number'
  }).run();

  const { enableToken } = await new Toggle({
    name: 'enableToken',
    message: 'Enable API Security Token (recommended)?',
    enabled: 'Yes',
    disabled: 'No'
  }).run();

  let apiToken = '';
  if (enableToken) {
    apiToken = crypto.randomBytes(32).toString('hex');
    console.log(pc.green(`✔ Generated Secure Token: ${apiToken}`));
  }

  return { port, apiToken };
}

async function setupSystemd(port: string) {
  const { installService } = await new Confirm({
    name: 'installService',
    message: 'Would you like to install Saturn as a systemd service (daemon)?'
  }).run();

  if (installService) {
    const user = process.env.USER || 'ubuntu';
    const workingDir = process.cwd();
    const serviceContent = `[Unit]
Description=Saturn Infrastructure Management Platform
After=network.target

[Service]
Type=simple
User=${user}
WorkingDirectory=${workingDir}
Environment=NODE_ENV=production
Environment=PORT=${port}
ExecStart=$(which tsx) server.ts
Restart=always

[Install]
WantedBy=multi-user.target
`;

    const servicePath = `/tmp/saturn.service`;
    fs.writeFileSync(servicePath, serviceContent);
    console.log(pc.cyan('\nSystemd service unit generated at ' + servicePath));
    console.log(pc.yellow('To enable it, run:'));
    console.log(`sudo cp ${servicePath} /etc/systemd/system/saturn.service`);
    console.log('sudo systemctl daemon-reload');
    console.log('sudo systemctl enable saturn');
    console.log('sudo systemctl start saturn');
  }
}

async function main() {
  console.log(pc.bold(pc.magenta('\n🪐 SATURN SERVER SETUP WIZARD v1.0')));
  console.log(pc.dim('---------------------------------------'));

  await checkDependencies();
  const configAction = await handleExistingConfig();
  if (configAction === 'keep') return;

  const ai = await setupAI();
  const net = await setupNetwork();

  console.log(pc.cyan('\n[Step 3] Summary & Application'));
  console.log(pc.dim('---------------------------------------'));
  console.log(`${pc.bold('AI Provider:')} ${ai.provider}`);
  console.log(`${pc.bold('Port:')}        ${net.port}`);
  console.log(`${pc.bold('Auth Token:')}  ${net.apiToken ? 'Enabled' : 'Disabled'}`);
  console.log(pc.dim('---------------------------------------'));

  const { confirm } = await new Confirm({
    name: 'confirm',
    message: 'Apply changes and generate .env?'
  }).run();

  if (confirm) {
    let envContent = '';
    if (fs.existsSync(DOTENV_PATH)) {
      envContent = fs.readFileSync(DOTENV_PATH, 'utf-8');
    }

    const updates: Record<string, string> = {
      PORT: net.port,
      NODE_ENV: 'production',
      ACTIVE_AI_PROVIDER: ai.provider.toLowerCase().includes('gemini') ? 'google' : ai.provider.toLowerCase()
    };

    if (ai.apiKey) {
      if (ai.provider === 'Google Gemini') updates.GEMINI_API_KEY = ai.apiKey;
      if (ai.provider === 'OpenAI') updates.OPENAI_API_KEY = ai.apiKey;
    }

    if (net.apiToken) updates.SATURN_API_TOKEN = net.apiToken;

    // Generate keys if missing
    ['SSH_ENCRYPTION_PEPPER', 'JWT_SECRET', 'SATURN_MASTER_KEY'].forEach(key => {
      if (!envContent.includes(`${key}=`)) {
        updates[key] = crypto.randomBytes(32).toString('hex');
      }
    });

    for (const [key, val] of Object.entries(updates)) {
      if (envContent.includes(`${key}=`)) {
        envContent = envContent.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${val}`);
      } else {
        envContent += `\n${key}=${val}`;
      }
    }

    fs.writeFileSync(DOTENV_PATH, envContent.trim() + '\n');
    console.log(pc.green('\n✔ .env file updated successfully.'));

    await setupSystemd(net.port);

    console.log(pc.bold(pc.green('\n✨ Saturn is ready!')));
    console.log(`Run ${pc.cyan('npm run dev')} or ${pc.cyan('pm2 start tsx --name saturn -- server.ts')} to start.`);
  }
}

main().catch(console.error);
