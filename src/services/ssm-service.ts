/**
 * AWS SSM Service — Execute commands on EC2 instances via Systems Manager
 * Bypasses the need for SSH keys, public IPs, or security group rules.
 * Requires: SSM Agent on target instance + IAM role with ssm:SendCommand + ssm:ListCommands
 */

import { SSMClient, SendCommandCommand, ListCommandsCommand, type Command } from "@aws-sdk/client-ssm";

interface SSMConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

interface SSMExecResult {
  commandId: string;
  instanceId: string;
  status: string;
  stdout?: string;
  stderr?: string;
}

/**
 * Execute a command on an EC2 instance via SSM Run Command.
 * Returns the command ID for status polling.
 */
export async function ssmExecCommand(
  config: SSMConfig,
  instanceId: string,
  command: string,
  timeoutSeconds: number = 30
): Promise<SSMExecResult> {
  const client = new SSMClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  const sendCmd = new SendCommandCommand({
    InstanceIds: [instanceId],
    DocumentName: "AWS-RunShellScript",
    Parameters: { commands: [command], executionTimeout: [String(timeoutSeconds * 1000)] },
    TimeoutSeconds: timeoutSeconds,
  });

  const result = await client.send(sendCmd);
  const commandId = result.Command?.CommandId;

  if (!commandId) throw new Error("SSM SendCommand returned no CommandId");

  // Poll for completion
  const startTime = Date.now();
  let status = "Pending";
  let output: any = {};

  while (Date.now() - startTime < timeoutSeconds * 1000) {
    await new Promise(r => setTimeout(r, 2000));

    const listCmd = new ListCommandsCommand({
      CommandId: commandId,
      InstanceId: instanceId,
    });
    const listResult = await client.send(listCmd);
    const cmd = listResult.Commands?.[0];
    if (!cmd) continue;

    status = cmd.Status || "Unknown";

    if (["Success", "Failed", "TimedOut", "Cancelled"].includes(status)) {
      // Get output via the command invocation
      const { GetCommandInvocationCommand } = await import("@aws-sdk/client-ssm");
      const getInvocation = new GetCommandInvocationCommand({
        CommandId: commandId,
        InstanceId: instanceId,
      });

      try {
        const invResult = await client.send(getInvocation);
        output = {
          stdout: invResult.StandardOutputContent || "",
          stderr: invResult.StandardErrorContent || "",
          responseCode: invResult.ResponseCode,
        };
      } catch (invErr: any) {
        output = { stdout: "", stderr: `Failed to get output: ${invErr.message}` };
      }
      break;
    }
  }

  return {
    commandId,
    instanceId,
    status,
    stdout: output.stdout,
    stderr: output.stderr,
  };
}

/**
 * List SSM-managed instances from a given AWS account/region.
 */
export async function ssmListInstances(config: SSMConfig): Promise<{ instanceId: string; name: string; os: string; pingStatus: string }[]> {
  const client = new SSMClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  const { DescribeInstanceInformationCommand } = await import("@aws-sdk/client-ssm");
  const result = await client.send(new DescribeInstanceInformationCommand({}));
  
  return (result.InstanceInformationList || []).map(i => ({
    instanceId: i.InstanceId || "",
    name: i.ComputerName || i.InstanceId || "",
    os: i.PlatformType === "Windows" ? "windows" : "linux",
    pingStatus: i.PingStatus || "Unknown",
  }));
}
