# PlateMate Backend – Setup Guide

Host the PlateMate microservices backend on your laptop and expose it worldwide via **Cloudflare DNS**.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone & configure the project](#2-clone--configure-the-project)
3. [Environment variables](#3-environment-variables)
4. [Start the backend](#4-start-the-backend)
5. [Management scripts](#5-management-scripts)
6. [Router – port forwarding](#6-router--port-forwarding)
7. [Cloudflare DNS setup](#7-cloudflare-dns-setup)
8. [HTTPS / SSL with Certbot](#8-https--ssl-with-certbot)
9. [Verify everything works](#9-verify-everything-works)
10. [Troubleshooting](#10-troubleshooting)
11. [Demo-day checklist](#11-demo-day-checklist)

---

## 1. Prerequisites

### Docker & Docker Compose

**macOS / Windows**

Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/).  
Docker Compose is included.

**Linux (Ubuntu / Debian)**

```bash
# Install Docker
curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
sudo sh /tmp/get-docker.sh

# Allow your user to run Docker without sudo
sudo usermod -aG docker "$USER"
newgrp docker          # apply group change in the current shell

# Install Docker Compose plugin
sudo apt-get install -y docker-compose-plugin

# Verify
docker version
docker compose version
```

### Other tools

| Tool | Install (Linux) | Purpose |
|------|----------------|---------|
| `curl` | `sudo apt install curl` | Health checks |
| `certbot` | see [Section 8](#8-https--ssl-with-certbot) | Free SSL certificate |
| `nginx` | `sudo apt install nginx` | Reverse proxy (optional) |

---

## 2. Clone & configure the project

```bash
git clone https://github.com/Nikunj1310/PlateMate_Backend.git
cd PlateMate_Backend

# Make all scripts executable
chmod +x scripts/*.sh
```

---

## 3. Environment variables

The `.env` file in the project root is loaded automatically by Docker Compose.  
A template is provided as `.env.example`.

```bash
# Copy the template and fill in your own values
cp .env.example .env
nano .env   # or: code .env / vim .env
```

Minimum required changes:

```dotenv
DB_PASSWORD=some_strong_password_here       # used by all 5 PostgreSQL instances
JWT_SECRET=some_random_secret_min_32_chars  # used by all microservices
```

> ⚠️ **Never commit real passwords to Git.**  
> The `.env` file is already listed in `.gitignore`.

---

## 4. Start the backend

```bash
./scripts/start.sh
```

On the **first run** Docker will build the service images (takes 2–5 minutes).  
Subsequent starts are instant because images are cached.

When you see `✅ All services started!` the following are running:

| Service | Local URL |
|---------|-----------|
| user-location-service | http://localhost:3001 |
| food-inventory-service | http://localhost:3002 |
| claim-service | http://localhost:3003 |
| reputation-service | http://localhost:3004 |
| messaging-service | http://localhost:3005 |
| RabbitMQ management UI | http://localhost:15672 (guest / guest) |

---

## 5. Management scripts

All scripts live in the `scripts/` directory.

```bash
# Start all services
./scripts/start.sh

# Stop all services (data is preserved)
./scripts/stop.sh

# Restart everything  – or a single service
./scripts/restart.sh
./scripts/restart.sh claim-service

# Check running containers and health
./scripts/status.sh

# Tail logs  – all services or a specific one
./scripts/logs.sh
./scripts/logs.sh user-location-service
./scripts/logs.sh -f                         # follow / real-time
./scripts/logs.sh -f food-inventory-service  # follow a single service

# Test all HTTP health endpoints
./scripts/health-check.sh
./scripts/health-check.sh api.yourdomain.com   # also test via Cloudflare domain

# Remove stopped containers and dangling images (keeps database volumes)
./scripts/clean.sh

# Full cleanup including database volumes (⚠️ deletes all data)
./scripts/clean.sh --volumes
```

---

## 6. Router – port forwarding

Your router must forward inbound internet traffic to your laptop.

1. Find your laptop's **local IP address**:
   ```bash
   # Linux / Mac
   ip route get 1 | awk '{print $7; exit}'
   # or
   hostname -I | awk '{print $1}'
   ```

2. Log in to your router admin panel (typically http://192.168.1.1 or http://192.168.0.1).

3. Navigate to **Port Forwarding** (sometimes under "NAT", "Virtual Servers" or "Advanced").

4. Create the following rules (replace `192.168.x.x` with your laptop's local IP):

   | External port | Protocol | Internal IP | Internal port | Purpose |
   |--------------|----------|-------------|---------------|---------|
   | 80 | TCP | 192.168.x.x | 80 | HTTP (Nginx / Certbot) |
   | 443 | TCP | 192.168.x.x | 443 | HTTPS (Nginx + SSL) |
   | 3001 | TCP | 192.168.x.x | 3001 | user-location-service |
   | 3002 | TCP | 192.168.x.x | 3002 | food-inventory-service |
   | 3003 | TCP | 192.168.x.x | 3003 | claim-service |
   | 3004 | TCP | 192.168.x.x | 3004 | reputation-service |
   | 3005 | TCP | 192.168.x.x | 3005 | messaging-service |

5. Save and apply the rules.

6. Find your **public IP address**:
   ```bash
   curl -s https://ifconfig.me
   ```

> 💡 **Tip:** If your ISP assigns a dynamic public IP, it may change occasionally.  
> Cloudflare's API can be used to update your DNS record automatically (DDNS).

---

## 7. Cloudflare DNS setup

> You need a registered domain name. Cloudflare offers free DNS management for any domain.

### 7.1 Add your domain to Cloudflare

1. Sign up at https://cloudflare.com (free plan is sufficient).
2. Click **Add a Site** and enter your domain name.
3. Select the **Free** plan.
4. Cloudflare will scan your existing DNS records.
5. Update your domain registrar's nameservers to the two Cloudflare nameservers shown (e.g. `alice.ns.cloudflare.com`, `bob.ns.cloudflare.com`).  
   Nameserver propagation can take up to 24 hours.

### 7.2 Create an A record

1. In Cloudflare → **DNS** → **Records** → **Add record**.
2. Fill in:

   | Field | Value |
   |-------|-------|
   | Type | A |
   | Name | `api` (creates `api.yourdomain.com`) or `@` (root domain) |
   | IPv4 address | your public IP from step 6.6 |
   | Proxy status | **DNS only** (grey cloud) – **required** when using custom ports (3001–3005). Cloudflare's orange-cloud proxy only forwards standard HTTP/HTTPS traffic on ports 80 and 443, so non-standard service ports must use DNS-only mode. |
   | TTL | Auto |

3. Click **Save**.

### 7.3 Verify DNS propagation

```bash
# Replace with your actual domain
dig +short api.yourdomain.com A
# or
nslookup api.yourdomain.com
```

The output should show your public IP.

---

## 8. HTTPS / SSL with Certbot

> HTTPS requires ports 80 and 443 to be forwarded (Section 6) and DNS to be pointing to your laptop (Section 7).

### Install Certbot

```bash
# Ubuntu / Debian
sudo apt install -y certbot python3-certbot-nginx

# macOS (Homebrew)
brew install certbot
```

### Option A – Nginx reverse proxy (recommended)

Install Nginx and create a basic reverse-proxy config:

```bash
sudo apt install -y nginx
```

Create `/etc/nginx/sites-available/platemate`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Route each service by path prefix
    location /users/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /food/ {
        proxy_pass http://localhost:3002/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /claims/ {
        proxy_pass http://localhost:3003/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /rep/ {
        proxy_pass http://localhost:3004/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /msg/ {
        proxy_pass http://localhost:3005/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/platemate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Obtain a free SSL certificate:

```bash
sudo certbot --nginx -d api.yourdomain.com
```

Certbot automatically edits the Nginx config to add HTTPS and sets up auto-renewal.

### Option B – Standalone (no Nginx)

```bash
# Stop any service using port 80 first
sudo certbot certonly --standalone -d api.yourdomain.com
```

Certificates are stored at `/etc/letsencrypt/live/api.yourdomain.com/`.

### Auto-renewal

```bash
# Enable the systemd timer (runs twice daily)
sudo systemctl enable --now certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

---

## 9. Verify everything works

```bash
# 1. Check containers are healthy
./scripts/status.sh

# 2. Test all HTTP endpoints locally
./scripts/health-check.sh

# 3. Test from another device on the same WiFi
curl http://<laptop-local-ip>:3001/health

# 4. Test via your public domain (after DNS propagation)
./scripts/health-check.sh api.yourdomain.com

# 5. Test HTTPS
curl https://api.yourdomain.com/users/health
```

---

## 10. Troubleshooting

### Services fail to start

```bash
# View detailed logs for a service
./scripts/logs.sh user-location-service

# Check Docker daemon
docker info

# Clean and retry
./scripts/clean.sh
./scripts/start.sh
```

### Port already in use

```bash
# Find what is using port 3001
lsof -i :3001        # Linux / Mac
ss -tlnp | grep 3001 # Linux

# Kill the process
kill -9 <PID>
```

### Database connection refused

```bash
# Databases may still be initialising – wait 20-30 s then retry
./scripts/health-check.sh

# Check database logs
docker logs postgres_db1
```

### Cannot reach services from outside the network

1. ✅ Port forwarding rules saved in router?
2. ✅ Laptop firewall allows inbound on 3001–3005? (`sudo ufw allow 3001:3005/tcp`)
3. ✅ Cloudflare A record uses correct public IP?
4. ✅ DNS has propagated? (`dig +short api.yourdomain.com`)
5. ✅ ISP does not block ports 80/443? (call ISP if needed)

### RabbitMQ unhealthy after restart

```bash
docker restart <project>-rabbitmq-1
# then wait ~30 s
./scripts/status.sh
```

---

## 11. Demo-day checklist

**Before the demo:**

- [ ] Laptop is plugged in (power adapter connected)
- [ ] WiFi is on and stable
- [ ] Run `./scripts/start.sh`
- [ ] Run `./scripts/health-check.sh` – all green
- [ ] Test from a phone on the same WiFi: `http://<local-ip>:3001/health`
- [ ] Test via domain: `https://api.yourdomain.com/users/health`
- [ ] SSL certificate is valid (no browser warnings)

**During the demo:**

- Show real-time logs: `./scripts/logs.sh -f`
- Show service health: `./scripts/status.sh`
- Base API URL for frontend/Postman: `https://api.yourdomain.com`

**After the demo:**

- [ ] Run `./scripts/stop.sh` to free resources
