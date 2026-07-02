# Bedagang ERP — Infrastructure

## VPS 1: Naincode (Production)
| Item | Value |
|------|-------|
| IP | 43.129.56.221 |
| User | ubuntu |
| SSH Alias | `naincode-vps` |
| OS | Ubuntu |
| RAM | 3.6 GB |
| Notes | Tencent Cloud, monitoring dashboard port 9000 |

## VPS 2: TechnoVillage (CTO / PM / Staging)
| Item | Value |
|------|-------|
| IP | 202.10.36.37 |
| Hostname | nainerpo.pdagang.com |
| Root Password | 7F920!b!HFmk7Q (ganti jika untuk production) |
| User (non-root) | `deploy` (sudo + docker group) |
| SSH Alias | `bedagang-vps` (root), `bedagang-vps-deploy` (deploy) |
| OS | AlmaLinux 8.9 |
| RAM | **15 GB** |
| Storage | **296 GB** (278 GB available) |
| Architecture | x86_64 |
| Additional IPs | IPv6: 2001:0df0:027b:0000:0000:0000:0ace:7697, Internal: 10.0.164.220 |
| Firewall | SSH, HTTP, HTTPS, 3001/tcp, 3002/tcp |

### Installed Tools
- **Node.js** 20.20.2 via NodeSource
- **NPM** 10.8.2
- **PM2** 7.0.1 (systemd startup configured)
- **Docker** 26.1.3 + Compose v2.27.0
- **Git** 2.43.7
- **Development Tools** (GCC, make, etc.)
- **Utils**: htop, vim, jq, curl, wget, net-tools, bind-utils

### Project Directory
- **/opt/bedagang/** — owned by `deploy` user
- Clone repo: `git clone <repo-url> /opt/bedagang`

### Access Commands
```bash
# Root access
ssh bedagang-vps

# Deploy user access
ssh bedagang-vps-deploy

# SSH tunnel (example)
ssh -L 3001:127.0.0.1:3001 bedagang-vps
```

### Purpose
- **VPS ini digunakan untuk**: CTO orchestration environment, PM monitoring dashboard, staging server untuk Bedagang ERP
- **Not untuk**: Production deployment (VPS Naincode untuk production)
