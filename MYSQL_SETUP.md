# MySQL Setup Guide — Tekki X CatalystScan

This guide covers how to set up MySQL for the CatalystScan dashboard.  
**You don't need to know MySQL** — just follow the steps for your environment.

---

## 🐳 Option 1: Docker (Recommended — Easiest)

If you use Docker, **MySQL is set up automatically**. You don't need to install anything manually.

### Steps:
```bash
# 1. Make sure Docker and Docker Compose are installed
docker --version
docker compose version

# 2. Start everything (MySQL + App) with one command
docker compose up -d --build

# 3. Check that both containers are running
docker compose ps

# 4. View logs
docker compose logs -f app
```

That's it! Docker will:
- Download MySQL 8.0 automatically
- Create the database `tekkixscan`
- Create the user `tekkix_user` with the password from `.env`
- Start the CatalystScan app on port 8798

### To reset the database completely:
```bash
# Stop everything
docker compose down

# Delete the database volume (THIS ERASES ALL DATA)
docker volume rm catalyst-scan-dahsboard_tekkix_mysql_data

# Start fresh
docker compose up -d --build
```

---

## 💻 Option 2: Windows Local Development

Use this if you're running `python main.py` directly on Windows (not Docker).

### Step 1: Install MySQL

1. Download **MySQL Community Server 8.0** from:  
   https://dev.mysql.com/downloads/mysql/
2. Choose "Windows (x86, 64-bit), MSI Installer"
3. During installation:
   - Choose "Developer Default" or "Server Only"
   - Set root password: `TekkixRoot@2026!Secure` (or any strong password)
   - Keep default port `3306`
   - Start MySQL as a Windows Service

### Step 2: Create Database and User

Open **MySQL Command Line Client** (installed with MySQL), or open a terminal and run:

```bash
mysql -u root -p
```

Enter your root password, then run these SQL commands one by one:

```sql
-- Create the database
CREATE DATABASE IF NOT EXISTS tekkixscan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create the application user
CREATE USER IF NOT EXISTS 'tekkix_user'@'localhost' IDENTIFIED BY 'TekkixDB@2026!Secure';

-- Also allow connections from 127.0.0.1
CREATE USER IF NOT EXISTS 'tekkix_user'@'127.0.0.1' IDENTIFIED BY 'TekkixDB@2026!Secure';

-- Grant all permissions on the tekkixscan database
GRANT ALL PRIVILEGES ON tekkixscan.* TO 'tekkix_user'@'localhost';
GRANT ALL PRIVILEGES ON tekkixscan.* TO 'tekkix_user'@'127.0.0.1';

-- Apply the changes
FLUSH PRIVILEGES;

-- Verify it worked
SHOW DATABASES;
```

You should see `tekkixscan` in the list.

### Step 3: Update .env

Make sure your `.env` file has:
```
MYSQL_HOST=127.0.0.1
MYSQL_DATABASE=tekkixscan
MYSQL_USER=tekkix_user
MYSQL_PASSWORD=TekkixDB@2026!Secure
```

### Step 4: Start the App

```bash
python main.py
```

The app will:
- Connect to MySQL at `127.0.0.1:3306`
- Create all tables automatically
- Seed the admin user `tekkix` / `Tekkix@2026`
- Start the dashboard at http://localhost:9000/dashboard/

---

## 🐧 Option 3: Linux VM (Production Server)

Use this for deploying on a Linux server (e.g., the VM at `136.119.96.170`).

### With Docker (Recommended):
```bash
# SSH into your VM
ssh your-user@136.119.96.170

# Clone the repo
git clone <your-repo-url> /opt/catalystscan
cd /opt/catalystscan

# Copy and edit the .env file
cp .env.example .env
nano .env   # Fill in your actual passwords

# Start with Docker
docker compose up -d --build

# Check logs
docker compose logs -f app
```

The dashboard will be available at: **http://136.119.96.170:8798/dashboard/**

### Without Docker (manual MySQL):
```bash
# Install MySQL
sudo apt update
sudo apt install -y mysql-server

# Secure the installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

```sql
CREATE DATABASE IF NOT EXISTS tekkixscan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'tekkix_user'@'localhost' IDENTIFIED BY 'TekkixDB@2026!Secure';
CREATE USER IF NOT EXISTS 'tekkix_user'@'127.0.0.1' IDENTIFIED BY 'TekkixDB@2026!Secure';
GRANT ALL PRIVILEGES ON tekkixscan.* TO 'tekkix_user'@'localhost';
GRANT ALL PRIVILEGES ON tekkixscan.* TO 'tekkix_user'@'127.0.0.1';
FLUSH PRIVILEGES;
```

---

## 🔧 Troubleshooting

### "Can't connect to MySQL server"
- **Windows**: Make sure MySQL service is running:  
  `net start mysql80` (or check Services → MySQL80)
- **Docker**: Check if MySQL container is healthy:  
  `docker compose ps` — look for "healthy" status
- **Check port**: MySQL should be on port 3306:  
  `netstat -an | findstr 3306` (Windows)

### "Access denied for user"
- Wrong password in `.env` — double-check `MYSQL_PASSWORD`
- User doesn't exist — re-run the CREATE USER SQL commands above
- Wrong host — try `MYSQL_HOST=127.0.0.1` instead of `localhost`

### "Unknown database 'tekkixscan'"
- Database wasn't created — run the CREATE DATABASE command above
- If using Docker, the database is created automatically from `.env`

### "Table doesn't exist"
- The app creates all tables automatically on first startup
- Just restart: `python main.py` or `docker compose restart app`

### Docker MySQL keeps restarting
```bash
# Check MySQL logs for errors
docker compose logs mysql

# Common fix: remove the volume and recreate
docker compose down
docker volume rm catalyst-scan-dahsboard_tekkix_mysql_data
docker compose up -d --build
```

---

## 📋 Quick Reference

| Setting | Value |
|---------|-------|
| Database Name | `tekkixscan` |
| MySQL User | `tekkix_user` |
| MySQL Password | `TekkixDB@2026!Secure` |
| MySQL Port | `3306` |
| App Port (internal) | `9000` |
| App Port (Docker external) | `8798` |
| Local Dashboard | http://localhost:9000/dashboard/ |
| Live Dashboard | http://136.119.96.170:8798/dashboard/ |
| Admin Username | `tekkix` |
| Admin Password | `Tekkix@2026` |
