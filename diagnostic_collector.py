import paramiko
import sys
import json

# Reconfigure stdout for UTF-8
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def collect_info():
    HOST = "192.168.174.134"
    USER = "ubuntu"
    PASS = "admin1"
    
    commands = {
        "ubuntu_version": "lsb_release -a",
        "hardware_cpu": "lscpu | grep 'Model name'",
        "hardware_mem": "free -h",
        "hardware_disk": "df -h /",
        "dep_docker": "docker --version || echo 'Not installed'",
        "dep_node": "node --version",
        "dep_python": "python3 --version",
        "dep_git": "git --version",
        "pm2_status": "pm2 list",
        "ports": "sudo ss -tulpn | grep -E '3000|8080|50051'",
        "env_file": "cat ~/saturn/.env | grep -vE 'KEY|SECRET|PEPPER|TOKEN'",
        "pm2_logs": "pm2 logs saturn --lines 20 --nostream"
    }
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    results = {}
    
    try:
        ssh.connect(HOST, username=USER, password=PASS)
        for key, cmd in commands.items():
            stdin, stdout, stderr = ssh.exec_command(cmd)
            results[key] = stdout.read().decode(errors='replace').strip()
        
        return results
        
    except Exception as e:
        print(f"ERROR: {e}")
        return None
    finally:
        ssh.close()

if __name__ == "__main__":
    info = collect_info()
    if info:
        print(json.dumps(info, indent=2))
