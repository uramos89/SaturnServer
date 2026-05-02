import { NodeSSH } from 'node-ssh';

const bastionConnections = new Map<string, NodeSSH>();

interface BastionConfig {
  bastionHost: string;
  bastionPort: number;
  bastionUser: string;
  bastionKey?: string;
  bastionPassword?: string;
  targetHost: string;
  targetPort: number;
  targetUser: string;
  targetKey?: string;
}

/**
 * Connects to a target server through an SSH Bastion host.
 * Returns a tunnel key for further command execution.
 */
export async function connectViaBastion(config: BastionConfig): Promise<string> {
  const tunnelKey = `${config.targetUser}@${config.targetHost}:${config.targetPort} via ${config.bastionUser}@${config.bastionHost}`;
  
  try {
    // 1. Connect to the Bastion host
    const bastion = new NodeSSH();
    const bastionConnectionConfig: any = {
      host: config.bastionHost,
      port: config.bastionPort,
      username: config.bastionUser,
      readyTimeout: 20000,
    };
    if (config.bastionKey) bastionConnectionConfig.privateKey = config.bastionKey;
    if (config.bastionPassword) bastionConnectionConfig.password = config.bastionPassword;
    
    await bastion.connect(bastionConnectionConfig);
    console.log(`[BASTION] Connected to bastion: ${config.bastionHost}`);

    // Store the bastion connection
    bastionConnections.set(tunnelKey, bastion);
    
    return tunnelKey;
  } catch (error: any) {
    console.error(`[BASTION] Connection failed: ${error.message}`);
    throw new Error(`Bastion connection failed: ${error.message}`);
  }
}

/**
 * Executes a command on the target server through the established bastion tunnel.
 * Uses ProxyJump logic (ssh -o ProxyCommand).
 */
export async function execViaBastion(tunnelKey: string, command: string, config: BastionConfig): Promise<any> {
  const bastion = bastionConnections.get(tunnelKey);
  if (!bastion) throw new Error('Bastion tunnel not found or disconnected');
  
  try {
    // We use the bastion connection to run an SSH command to the target
    // Note: This requires the target's private key to be available or agent forwarding
    // Since we have the targetKey in config, we might need to write it to a temp file on the bastion 
    // or use a more complex stream forwarding.
    
    // Industrial approach: Use 'ssh -W' style or simple chained execution if keys are allowed
    const targetKeyPath = `/tmp/target_key_${Date.now()}`;
    
    if (config.targetKey) {
        await bastion.execCommand(`echo "${config.targetKey}" > ${targetKeyPath} && chmod 600 ${targetKeyPath}`);
    }

    const sshCmd = `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${config.targetKey ? `-i ${targetKeyPath}` : ''} -p ${config.targetPort} ${config.targetUser}@${config.targetHost} "${command}"`;
    
    const result = await bastion.execCommand(sshCmd);
    
    if (config.targetKey) {
        await bastion.execCommand(`rm ${targetKeyPath}`);
    }

    return result;
  } catch (error: any) {
    console.error(`[BASTION] Execution failed: ${error.message}`);
    throw error;
  }
}

/**
 * Disconnects and cleans up a bastion tunnel.
 */
export async function disconnectBastion(tunnelKey: string): Promise<void> {
  const conn = bastionConnections.get(tunnelKey);
  if (conn) {
    conn.dispose();
    bastionConnections.delete(tunnelKey);
    console.log(`[BASTION] Tunnel closed: ${tunnelKey}`);
  }
}
