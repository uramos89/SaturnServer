import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.174.130", username="saturno", password="admin1")
_, o, _ = c.exec_command("curl -sI -H 'Origin: http://192.168.174.130' http://localhost:3000/")
print(o.read().decode())
c.close()
