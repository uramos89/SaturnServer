#!/bin/bash
# setup-nginx.sh
# Configura Nginx como reverse proxy para exponer Saturn en el puerto 80
# Ejecutar en el servidor remoto DESPUÉS de deploy-saturn.sh

sudo apt-get install -y nginx

sudo tee /etc/nginx/sites-available/saturn <<'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/saturn /etc/nginx/sites-enabled/saturn
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "Nginx configurado. Saturn accesible en http://192.168.174.130"
