# 🏠 ZimaOS Setup für Lectoria BookManager

## 📋 Voraussetzungen
- ZimaOS System mit Docker Support
- SSH-Zugriff auf Ihr ZimaOS System
- Mindestens 2GB freier Speicher

## 🚀 Installation

### 1. Verzeichnisse erstellen
```bash
# SSH zu Ihrem ZimaOS System, dann:
sudo mkdir -p /DATA/AppData/lectoria/{data,uploads,logs,ssl}
sudo chown -R $(whoami):$(whoami) /DATA/AppData/lectoria
```

### 2. Repository klonen
```bash
cd /DATA/AppData/lectoria
git clone https://github.com/chicohaager/lectoria.git app
cd app
```

### 3. Environment konfigurieren
```bash
# JWT Secret generieren
openssl rand -hex 32

# Environment-Datei erstellen
cp .env.example .env
nano .env
```

Bearbeiten Sie die `.env` Datei:
```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=ihr-generierter-secret-key-hier
```

### 4. ZimaOS Docker Compose starten
```bash
# Mit ZimaOS-spezifischer Konfiguration
docker-compose -f docker-compose.zimaos.yml up -d --build
```

## 🌐 Zugriff

### Lokal im Netzwerk
- **URL:** `http://IHRE-ZIMA-IP:3000`
- **Standard-Login:** admin / admin123

### Über ZimaOS Dashboard
Falls verfügbar, können Sie die App auch über das ZimaOS Web-Interface verwalten.

## 📁 Ordnerstruktur auf ZimaOS
```
/DATA/AppData/lectoria/
├── app/                    # Git Repository
│   ├── docker-compose.zimaos.yml
│   ├── Dockerfile
│   └── backend_server.js
├── data/                   # Datenbank (persistent)
│   └── bookmanager.db
├── uploads/                # Hochgeladene Bücher (persistent)
│   ├── .gitkeep
│   └── [PDF/EPUB Dateien]
└── logs/                   # Application Logs
```

## 🔧 ZimaOS-spezifische Features

### Persistent Storage
- ✅ Alle Daten bleiben bei Container-Neustarts erhalten
- ✅ Datenbank: `/DATA/AppData/lectoria/data`
- ✅ Uploads: `/DATA/AppData/lectoria/uploads`
- ✅ Logs: `/DATA/AppData/lectoria/logs`

### Performance
- ✅ Optimiert für NAS-Umgebung
- ✅ Niedrige CPU/RAM-Nutzung
- ✅ Effiziente Datei-I/O

## 🛠 Wartung

### Container-Status prüfen
```bash
cd /DATA/AppData/lectoria/app
docker-compose -f docker-compose.zimaos.yml ps
```

### Logs anzeigen
```bash
docker-compose -f docker-compose.zimaos.yml logs -f lectoria
```

### Updates installieren
```bash
cd /DATA/AppData/lectoria/app
git pull
docker-compose -f docker-compose.zimaos.yml up -d --build
```

### Backup erstellen
```bash
# Datenbank sichern
cp /DATA/AppData/lectoria/data/bookmanager.db /DATA/AppData/lectoria/backup_$(date +%Y%m%d).db

# Uploads sichern
tar -czf /DATA/AppData/lectoria/uploads_backup_$(date +%Y%m%d).tar.gz /DATA/AppData/lectoria/uploads/
```

## 🔒 Sicherheit für ZimaOS

### Firewall (optional)
```bash
# Port 3000 öffnen (falls Firewall aktiv)
sudo ufw allow 3000/tcp
```

### SSL-Zertifikat (optional)
Für HTTPS können Sie ein SSL-Zertifikat in `/DATA/AppData/lectoria/ssl/` ablegen und nginx aktivieren.

## ⚠️ Troubleshooting

### Port bereits belegt
```bash
# Anderen Port verwenden
docker-compose -f docker-compose.zimaos.yml down
# Bearbeiten Sie docker-compose.zimaos.yml: ports: "3001:3000"
docker-compose -f docker-compose.zimaos.yml up -d
```

### Speicherplatz prüfen
```bash
df -h /DATA
```

### Container neustarten
```bash
docker-compose -f docker-compose.zimaos.yml restart
```

## 📊 Monitoring

### ZimaOS Dashboard Integration
Die App läuft als Standard-Container und sollte im ZimaOS Dashboard sichtbar sein.

### Health Check
```bash
curl http://localhost:3000
```

---

**🏠 Perfekt für Ihr ZimaOS Home Setup!**