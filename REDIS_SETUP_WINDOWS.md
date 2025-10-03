# 🔴 Redis Setup for Windows (Without Docker)

## ✅ **Recommended: Memurai (Windows-Native Redis)**

Memurai is a Windows port of Redis that runs natively without WSL or Docker.

### Quick Install via Chocolatey

```powershell
# Install Chocolatey first if you don't have it
# https://chocolatey.org/install

# Install Memurai
choco install memurai-developer -y

# Start Memurai service
net start memurai

# Test connection
redis-cli ping
```

### Manual Install

1. **Download Memurai:**
   - Visit: https://www.memurai.com/get-memurai
   - Download "Memurai Developer" (free)
   - Run installer

2. **Start Memurai:**
   - Open Services (`services.msc`)
   - Find "Memurai" service
   - Right-click → Start

3. **Test Connection:**
   ```powershell
   redis-cli ping  # Should return PONG
   ```

4. **Configure VS Code Extension:**
   - Press `Ctrl+Shift+P`
   - Type "Redis: Add Connection"
   - Host: `localhost`
   - Port: `6379`

---

## 🐧 **Alternative: WSL2 Redis (Manual Setup)**

If you prefer open-source Redis via WSL2:

### Step 1: Install Redis in WSL

Open WSL terminal and run these commands:

```bash
# Update package lists
sudo apt-get update

# Install Redis
sudo apt-get install -y redis-server redis-tools

# Configure Redis for Windows access
sudo sed -i 's/^bind 127.0.0.1 ::1/bind 0.0.0.0/' /etc/redis/redis.conf
sudo sed -i 's/^protected-mode yes/protected-mode no/' /etc/redis/redis.conf

# Start Redis
sudo service redis-server start

# Test
redis-cli ping  # Should return PONG
```

### Step 2: Get WSL IP Address

From PowerShell:
```powershell
wsl hostname -I
```

Example output: `172.18.160.1`

### Step 3: Update Backend Configuration

Edit `backend\.env`:
```env
REDIS_URL=redis://172.18.160.1:6379/0
REDIS_HOST=172.18.160.1
REDIS_PORT=6379
```

**Note:** Replace `172.18.160.1` with your actual WSL IP from Step 2.

### Step 4: Start Redis (Daily)

Create `start-redis.ps1`:
```powershell
wsl sudo service redis-server start
$wslIp = (wsl hostname -I).Trim().Split()[0]
Write-Host "✅ Redis running at $wslIp:6379"
```

Run before starting backend:
```powershell
.\start-redis.ps1
```

---

## 🎯 **Which Option Should I Use?**

| Feature | Memurai | WSL Redis |
|---------|---------|-----------|
| **Setup Difficulty** | ✅ Easy | ⚠️ Medium |
| **Native Windows** | ✅ Yes | ❌ No (Linux) |
| **Performance** | ✅ Better | ⚠️ Good |
| **IP Stability** | ✅ Always localhost | ⚠️ Changes on reboot |
| **Auto-start** | ✅ Windows service | ❌ Manual start needed |
| **License** | ✅ Free (Developer) | ✅ Open source |

**Recommendation:** Use **Memurai** for simplicity and stability.

---

## 🔧 **Quick Start (Memurai)**

```powershell
# 1. Install Memurai via Chocolatey
choco install memurai-developer -y

# 2. Start service (or it auto-starts)
net start memurai

# 3. Your backend/.env should already have:
# REDIS_URL=redis://localhost:6379/0
# (No changes needed!)

# 4. Test
redis-cli ping

# 5. Start your backend
cd backend
python -m uvicorn app.main:app --reload
```

---

## 🔧 **Quick Start (WSL Redis)**

```powershell
# 1. Open WSL and install
wsl
sudo apt-get update && sudo apt-get install -y redis-server
sudo service redis-server start
exit

# 2. Get WSL IP
$wslIp = (wsl hostname -I).Trim().Split()[0]
Write-Host "WSL IP: $wslIp"

# 3. Update backend/.env
# Replace REDIS_URL with: redis://<WSL_IP>:6379/0

# 4. Start Redis before backend (every time)
wsl sudo service redis-server start

# 5. Start backend
cd backend
python -m uvicorn app.main:app --reload
```

---

## 🐛 **Troubleshooting**

### Memurai Not Starting

```powershell
# Check service status
Get-Service memurai

# Start service
net start memurai

# Check logs
Get-Content "C:\Program Files\Memurai\Logs\memurai.log" -Tail 50
```

### WSL IP Changed

```powershell
# Get new IP
$wslIp = (wsl hostname -I).Trim().Split()[0]

# Update backend/.env manually with new IP
notepad backend\.env
```

### Connection Refused

```powershell
# Test from PowerShell
Test-NetConnection -ComputerName localhost -Port 6379  # Memurai
Test-NetConnection -ComputerName <WSL_IP> -Port 6379   # WSL

# If fails, check firewall:
New-NetFirewallRule -DisplayName "Redis" -Direction Inbound -Protocol TCP -LocalPort 6379 -Action Allow
```

---

## ✅ **Verification Steps**

After setup, verify everything works:

```powershell
# 1. Test Redis connection
redis-cli ping  # Memurai
# OR
wsl redis-cli ping  # WSL

# 2. Test from Python
cd backend
python -c "import redis; r = redis.from_url('redis://localhost:6379'); print('✅' if r.ping() else '❌')"

# 3. Start backend and check logs
python -m uvicorn app.main:app --reload
# Should see: "✅ Redis initialized"
```

---

## 📱 **VS Code Redis Extension Setup**

1. Extension should already be in recommendations
2. Press `Ctrl+Shift+P`
3. Type "Redis: Add Connection"
4. Enter details:
   - **Name:** Lokifi Local
   - **Host:** `localhost` (Memurai) or `<WSL_IP>` (WSL)
   - **Port:** `6379`
   - **Password:** (leave empty)

Now you can browse Redis keys in VS Code sidebar! 🎉

---

## 🚀 **Recommended: Install Memurai Now**

Run this in PowerShell as Administrator:

```powershell
# Install Chocolatey package manager (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Memurai
choco install memurai-developer -y

# Verify
redis-cli ping
```

✅ **Done! Redis is now ready for your Lokifi backend!**
