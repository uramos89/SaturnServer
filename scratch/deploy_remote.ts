import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function deploy() {
  try {
    console.log('Connecting to remote...');
    await ssh.connect({
      host: '192.168.174.130',
      username: 'saturno',
      password: 'admin1'
    });
    console.log('Connected!');

    const run = async (cmd: string, cwd: string = '.') => {
      console.log(`Executing: ${cmd}`);
      const result = await ssh.execCommand(cmd, { cwd });
      console.log('STDOUT:', result.stdout);
      if (result.stderr) console.error('STDERR:', result.stderr);
      return result;
    };

    console.log('Stopping existing server on port 3000...');
    await ssh.execCommand('fuser -k 3000/tcp || true');
    
    await run('rm -rf saturn');
    await run('git clone https://github.com/uramos89/SaturnServer saturn');
    await run('npm install', 'saturn');
    await run('npm run build', 'saturn');
    
    console.log('Starting server in background on port 3000...');
    // Use nohup to keep it running on port 3000 to avoid EACCES
    await ssh.execCommand('PORT=3000 nohup npm run dev > output.log 2>&1 &', { cwd: 'saturn' });
    
    console.log('Deployment triggered. Checking if port 3000 is listening...');
    await new Promise(r => setTimeout(r, 8000));
    const netstat = await run('netstat -tulpn | grep :3000');
    
    if (netstat.stdout.includes(':3000')) {
      console.log('SUCCESS: Saturn is running on port 3000');
    } else {
      console.log('WARNING: Port 3000 not detected yet. Check output.log');
    }

  } catch (err) {
    console.error('Deployment failed:', err);
  } finally {
    ssh.dispose();
  }
}

deploy();
