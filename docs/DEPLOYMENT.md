# RACATOM-LMIS — VPS Deployment Guide

> **Target**: Hostinger KVM 2 VPS  
> **Account**: `embr3.onlinesystems`  
> **IP**: `72.61.125.232`  
> **Domain**: `racatom-lmis.cloud`

---

## Architecture

```
racatom-lmis.cloud (HTTPS :443)
        │
   [ Nginx reverse proxy ]
        │
        ├── /            → React static build (served by Nginx)
        └── /api/*       → Node/Express backend (localhost:5002)
                              │
                          [ MongoDB Atlas ]
```

---

## Prerequisites

| Component       | Version          |
|-----------------|------------------|
| Node.js         | 20 LTS           |
| npm             | 10+              |
| Nginx           | latest           |
| Certbot         | latest           |
| PM2             | latest           |
| MongoDB         | Atlas (cloud) or 7.x local |

---

## Step 1 — Initial VPS Setup

```bash
# SSH into the VPS
ssh root@72.61.125.232

# Update packages
apt update && apt upgrade -y

# Create deploy user
adduser deploy
usermod -aG sudo deploy

# Configure firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Set timezone
timedatectl set-timezone Asia/Manila
```

---

## Step 2 — Install Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
node -v && npm -v
```

---

## Step 3 — Install Nginx

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

---

## Step 4 — Install PM2

```bash
npm install -g pm2
```

---

## Step 5 — Install Certbot (SSL)

```bash
apt install -y certbot python3-certbot-nginx
```

---

## Step 6 — DNS Configuration

In Hostinger DNS zone for `racatom-lmis.cloud`:

| Type  | Name | Value              | TTL  |
|-------|------|--------------------|------|
| A     | @    | 72.61.125.232      | 3600 |
| CNAME | www  | racatom-lmis.cloud | 300  |

Wait for DNS propagation (check with `dig racatom-lmis.cloud`).

---

## Step 7 — Deploy the Code

```bash
# As deploy user
sudo mkdir -p /var/www/racatom-lmis
sudo chown deploy:deploy /var/www/racatom-lmis
cd /var/www/racatom-lmis

# Clone repository (use your Git remote)
git clone <YOUR_REPO_URL> .

# --- Build Front-End ---
cd front-end
npm install
# Create production .env for front-end
cat > .env.production << 'EOF'
VITE_API_URL=https://racatom-lmis.cloud/api
VITE_FRONTEND_URL=https://racatom-lmis.cloud
EOF
npm run build
cd ..

# --- Install Server Dependencies ---
cd server
npm install --omit=dev
```

---

## Step 8 — Server Environment Variables

Create `/var/www/racatom-lmis/server/.env`:

```env
NODE_ENV=production
PORT=5002

MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/db_rctlmis?retryWrites=true&w=majority

JWT_SECRET=<generate-a-strong-random-secret>
REFRESH_SECRET=<generate-another-strong-random-secret>
SESSION_SECRET=<generate-another-strong-random-secret>

CLIENT_ORIGIN=https://racatom-lmis.cloud
CLIENT_ORIGINS=https://racatom-lmis.cloud,https://www.racatom-lmis.cloud
FRONTEND_URL=https://racatom-lmis.cloud

# Email (Gmail SMTP)
EMAIL_USER=racatom.lmis@gmail.com
EMAIL_PASS=<app-password>

# Google Drive Folder IDs
DRIVE_FOLDER_IMAGES_ID=1O_-PLQyRAjUV7iy6d3PN5rLXznOzxean
DRIVE_FOLDER_DOCS_ID=1kMd3QjEw95oJsMSAK9xwEf-I3_MKlMBj
DRIVE_FOLDER_VOUCHERS_ID=10Hj7Ks0Nw7vauwF7fn6Xs-q3ko9LC7s7
DRIVE_FOLDER_STAFF_ID=1ySXWKmal8V9ySiYWfhOGOFTZhgNEPwdp
DRIVE_COLLECTORS_FOLDER_ID=1bds76Df4TNMDgBe1xO8Mc_ltzkqBot1T
DRIVE_SHARE_PUBLIC=true
```

---

## Step 9 — Google Drive Credentials

Copy your service account JSON to the server:

```bash
mkdir -p /var/www/racatom-lmis/server/secrets
# SCP from local machine:
scp secrets/rct-credentials.json deploy@72.61.125.232:/var/www/racatom-lmis/server/secrets/
```

Ensure the service account email has **Editor** access to all shared Drive folders.

---

## Step 10 — Nginx Configuration

Create `/etc/nginx/sites-available/racatom-lmis`:

```nginx
server {
    listen 80;
    server_name racatom-lmis.cloud www.racatom-lmis.cloud;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name racatom-lmis.cloud www.racatom-lmis.cloud;

    ssl_certificate     /etc/letsencrypt/live/racatom-lmis.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/racatom-lmis.cloud/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Serve React build
    root /var/www/racatom-lmis/front-end/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API to Express
    location /api/ {
        proxy_pass http://127.0.0.1:5002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        client_max_body_size 15m;
    }
}
```

Enable the site:

```bash
ln -s /etc/nginx/sites-available/racatom-lmis /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

---

## Step 11 — SSL Certificate

```bash
certbot --nginx -d racatom-lmis.cloud -d www.racatom-lmis.cloud
# Follow the prompts; auto-renewal is configured automatically
```

---

## Step 12 — Start the Server with PM2

```bash
cd /var/www/racatom-lmis/server
pm2 start server.js --name racatom-api --env production
pm2 save
pm2 startup
# Run the command PM2 outputs to enable auto-start on reboot
```

---

## Step 13 — Post-Deploy Verification

- [ ] `https://racatom-lmis.cloud` loads React app
- [ ] `https://racatom-lmis.cloud/api/health` returns OK
- [ ] Login works (test username + email login)
- [ ] Google Drive uploads work (test file upload)
- [ ] Email verification works (test new registration)
- [ ] Forgot password email arrives correctly
- [ ] Announcements display on login page
- [ ] HTTPS redirect from HTTP works
- [ ] CORS headers correct for production domain

---

## Updating the App

```bash
cd /var/www/racatom-lmis
git pull origin main

# Rebuild front-end
cd front-end
npm install
npm run build
cd ..

# Update server deps  
cd server
npm install --omit=dev

# Restart server
pm2 restart racatom-api
```

---

## Useful Commands

```bash
# View logs
pm2 logs racatom-api

# Monitor
pm2 monit

# Restart
pm2 restart racatom-api

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# SSL renewal test
certbot renew --dry-run
```

---

## MongoDB Backup (if using local MongoDB)

```bash
# Add to crontab: daily backup at 2 AM
crontab -e
# Add:
0 2 * * * mongodump --uri="mongodb://localhost:27017/db_rctlmis" --out=/var/backups/mongodb/$(date +\%Y\%m\%d) --gzip
```

If using **MongoDB Atlas**, configure backups from the Atlas dashboard.
