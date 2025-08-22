// frontend/src/components/UserManagement.js
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Alert,
  Chip,
  Avatar,
} from '@mui/material';
import {
  People,
  AdminPanelSettings,
  Person,
} from '@mui/icons-material';
import api from '../services/api';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/api/users');
      setUsers(response.data);
    } catch (err) {
      setError('Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Container>
        <Typography>Lade Benutzer...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Benutzerverwaltung
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Übersicht aller registrierten Benutzer
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Benutzer</TableCell>
                <TableCell>E-Mail</TableCell>
                <TableCell>Rolle</TableCell>
                <TableCell>Registriert</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ 
                        bgcolor: user.role === 'admin' ? 'secondary.main' : 'primary.main',
                        width: 32,
                        height: 32,
                      }}>
                        {user.role === 'admin' ? (
                          <AdminPanelSettings fontSize="small" />
                        ) : (
                          <Person fontSize="small" />
                        )}
                      </Avatar>
                      <Typography variant="body1" fontWeight="medium">
                        {user.username}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {user.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.role === 'admin' ? 'Administrator' : 'Benutzer'}
                      color={user.role === 'admin' ? 'secondary' : 'default'}
                      size="small"
                      icon={user.role === 'admin' ? <AdminPanelSettings /> : <People />}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(user.created_at)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {users.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <People sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Keine Benutzer gefunden
            </Typography>
          </Box>
        )}
      </Paper>

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Hinweis:</strong> Hier werden alle registrierten Benutzer angezeigt. 
            Erweiterte Benutzerverwaltung (Bearbeitung, Löschen, Rollen ändern) kann in 
            zukünftigen Versionen hinzugefügt werden.
          </Typography>
        </Alert>
      </Box>
    </Container>
  );
}

export default UserManagement;

---

# README.md für das gesamte Projekt
# BookManager - Digitale Bibliothek

Eine moderne Docker-Container-App für die Verwaltung von Büchern und Magazinen mit Benutzeranmeldung und Upload-Funktionalität für EPUB und PDF Dateien.

## 🚀 Features

- **Moderne Web-Oberfläche** mit React und Material-UI
- **Benutzeranmeldung und -registrierung** mit JWT-Authentifizierung
- **Datei-Upload** für PDF und EPUB Dateien (bis 50MB)
- **Bücher- und Magazin-Verwaltung** mit Metadaten
- **Such- und Filterfunktionen**
- **Download-Funktionalität** für alle Dateien
- **Admin-Panel** für Benutzerverwaltung
- **Responsive Design** für Desktop und Mobile
- **Docker-Ready** für einfache Bereitstellung

## 🛠 Technologie-Stack

- **Frontend:** React 18, Material-UI 5, React Router
- **Backend:** Node.js, Express.js
- **Datenbank:** SQLite3
- **Authentifizierung:** JWT (JSON Web Tokens)
- **Datei-Upload:** Multer
- **Containerisierung:** Docker & Docker Compose

## 📦 Installation und Setup

### Voraussetzungen
- Docker und Docker Compose installiert
- Git (zum Klonen des Repositories)

### 1. Repository klonen
```bash
git clone <your-repo-url>
cd bookmanager
```

### 2. Projektstruktur erstellen
```
bookmanager/
├── docker-compose.yml
├── Dockerfile
├── package.json
├── README.md
├── server/
│   └── app.js
├── frontend/
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── index.js
│       ├── App.js
│       ├── services/
│       │   └── api.js
│       └── components/
│           ├── Login.js
│           ├── Navbar.js
│           ├── Dashboard.js
│           ├── BookUpload.js
│           └── UserManagement.js
├── uploads/          # Hochgeladene Dateien
└── data/            # SQLite Datenbank
```

### 3. Mit Docker Compose starten
```bash
# App bauen und starten
docker-compose up --build

# Im Hintergrund starten
docker-compose up -d --build
```

### 4. App öffnen
Öffnen Sie Ihren Browser und gehen Sie zu: `http://localhost:3000`

## 👤 Standard-Anmeldedaten

- **Benutzername:** admin
- **Passwort:** admin123
- **Rolle:** Administrator

## 🔧 Konfiguration

### Umgebungsvariablen
Bearbeiten Sie `docker-compose.yml` um Einstellungen zu ändern:

```yaml
environment:
  - NODE_ENV=production
  - JWT_SECRET=your-secret-key-change-this  # Ändern Sie dies!
```

### Volumes
- `./uploads:/app/uploads` - Hochgeladene Dateien
- `./data:/app/data` - SQLite Datenbank

## 📱 Verwendung

### Für Benutzer:
1. **Registrieren** oder mit existierenden Daten anmelden
2. **Dashboard** durchsuchen um verfügbare Bücher zu sehen
3. **Bücher hochladen** über die Upload-Seite
4. **Dateien herunterladen** durch Klick auf Download-Button
5. **Suchfunktion** nutzen um bestimmte Bücher zu finden

### Für Administratoren:
- Alle Benutzer-Funktionen
- **Benutzerverwaltung** - Übersicht aller registrierten Benutzer
- **Löschen** aller Bücher (Benutzer können nur ihre eigenen löschen)

## 🔒 Sicherheit

- JWT-basierte Authentifizierung
- Passwort-Hashing mit bcrypt
- Datei-Upload-Validierung (nur PDF/EPUB)
- Dateigröße-Beschränkung (50MB)
- Rollen-basierte Zugriffskontrolle

## 🚀 Deployment für ZimaOS

1. **Docker Compose Datei** auf Ihr ZimaOS System kopieren
2. **Ports anpassen** falls erforderlich (Standard: 3000)
3. **Volumes-Pfade** an Ihr System anpassen
4. **JWT_SECRET** in Produktion ändern
5. Mit `docker-compose up -d` starten

## 🐛 Troubleshooting

### Häufige Probleme:

**Port bereits in Verwendung:**
```bash
# Port in docker-compose.yml ändern
ports:
  - "3001:3000"  # Statt 3000:3000
```

**Berechtigungsprobleme:**
```bash
# Verzeichnisse erstellen und Berechtigungen setzen
mkdir -p uploads data
chmod 755 uploads data
```

**Container neu bauen:**
```bash
docker-compose down
docker-compose up --build --force-recreate
```

## 📈 Weitere Entwicklung

Mögliche Erweiterungen:
- E-Book Reader Integration
- Volltext-Suche in PDFs
- Kategorien und Tags
- Lesefortschritt-Tracking
- Social Features (Bewertungen, Kommentare)
- Backup/Export Funktionalität
- API für mobile Apps

## 📄 Lizenz

MIT License - Siehe LICENSE Datei für Details.

## 🤝 Beitragen

1. Fork das Projekt
2. Feature Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Änderungen committen (`git commit -m 'Add some AmazingFeature'`)
4. Branch pushen (`git push origin feature/AmazingFeature`)
5. Pull Request öffnen

---

**Entwickelt für ZimaOS - Ihre persönliche Cloud-Lösung** 📚✨