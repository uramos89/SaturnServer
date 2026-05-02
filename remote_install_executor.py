import paramiko
import sys

# Reconfigure stdout for UTF-8
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def run_install():
    HOST = "192.168.174.134"
    USER = "ubuntu"
    PASS = "admin1"
    
    print(f"Connecting to {HOST} as {USER}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(HOST, username=USER, password=PASS)
        print("Executing installation script from GitHub...")
        
        # We use a PTY to see the output in real-time
        transport = ssh.get_transport()
        channel = transport.open_session()
        channel.get_pty()
        
        # The command to run
        cmd = "curl -s https://raw.githubusercontent.com/uramos89/SaturnServer/main/install.sh | bash"
        channel.exec_command(cmd)
        
        while True:
            if channel.recv_ready():
                output = channel.recv(1024).decode(errors='replace')
                sys.stdout.write(output)
                sys.stdout.flush()
            if channel.exit_status_ready():
                break
        
        print(f"\nInstallation finished with status: {channel.recv_exit_status()}")
        
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    run_install()
