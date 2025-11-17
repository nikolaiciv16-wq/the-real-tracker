# The Real Tracker - Firebase Edition 🔥

**Task Manager con sincronizzazione Cloud in tempo reale**

Powered by React + Vite + Firebase

## ✨ Features

### 🔥 **Con Firebase:**
- ✅ **Autenticazione Cloud** - Login sicuro con Firebase Auth
- 🌐 **Sincronizzazione Real-time** - Tutti gli utenti vedono le modifiche istantaneamente
- 💾 **Backup Cloud** - Dati salvati su Firestore, mai persi
- 🖼️ **Storage Cloud** - Immagini salvate su Firebase Storage
- 👥 **Collaborazione Team** - Più utenti possono lavorare insieme
- 📊 **Dashboard condivisa** - Statistiche visibili a tutti
- 🔍 **Filtri avanzati** - Per stato e utente
- 📱 **Responsive** - Funziona su ogni dispositivo

## 🚀 Quick Start

### 1. Installazione

```bash
# Clone o estrai il progetto
cd the-real-tracker-firebase

# Installa le dipendenze (include Firebase!)
npm install
```

### 2. Firebase è GIÀ CONFIGURATO! ✅

Le credenziali Firebase sono già incluse in `src/firebaseConfig.js`:
- ✅ apiKey configurata
- ✅ authDomain configurato
- ✅ projectId configurato
- ✅ storageBucket configurato
- ✅ messagingSenderId configurato
- ✅ appId configurato

**NON serve fare nulla!** L'app è pronta per l'uso.

### 3. Avvia l'app

```bash
npm run dev
```

Apri [http://localhost:5173](http://localhost:5173)

### 4. Registrati e Inizia!

1. Clicca su "Non hai un account? Registrati"
2. Inserisci nome, email e password (min 6 caratteri)
3. Crea la tua prima task!

## 🌐 Deploy su Vercel

### Metodo 1: GitHub + Vercel (CONSIGLIATO)

```bash
# 1. Inizializza git
git init
git add .
git commit -m "Initial commit - Firebase version"

# 2. Pusha su GitHub
git branch -M main
git remote add origin https://github.com/TUO-USERNAME/TUO-REPO.git
git push -u origin main

# 3. Vai su vercel.com
# - New Project
# - Importa il repository
# - Deploy (Vercel rileva automaticamente Vite)
```

### Metodo 2: Vercel CLI

```bash
# Installa Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Metodo 3: Drag & Drop

```bash
# Build locale
npm run build

# Vai su vercel.com/new
# Trascina la cartella dist/
```

## 🔥 Configurazione Firebase Console

### Firestore Rules (IMPORTANTE!)

Vai su Firebase Console > Firestore Database > Rules e incolla:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - solo autenticati possono leggere
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == userId;
    }

    // Tasks collection - tutti gli autenticati possono leggere/scrivere
    match /tasks/{taskId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Storage Rules (IMPORTANTE!)

Vai su Firebase Console > Storage > Rules e incolla:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /task-images/{imageId} {
      // Chiunque autenticato può leggere
      allow read: if request.auth != null;

      // Chiunque autenticato può caricare immagini < 5MB
      allow write: if request.auth != null 
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## 📱 Come Funziona

### Registrazione
- Inserisci nome, email, password
- Firebase crea l'account
- Info utente salvate in Firestore collection `users`

### Login
- Email e password
- Firebase autentica l'utente
- Accesso alla dashboard

### Creazione Task
- Compila il form (titolo, descrizione, data, priorità)
- Assegna a un utente (opzionale)
- Carica un'immagine (opzionale)
- Task salvata in Firestore collection `tasks`
- Immagine caricata su Firebase Storage

### Sincronizzazione Real-time
- Ogni modifica è visibile istantaneamente a tutti
- onSnapshot listeners aggiornano l'UI automaticamente
- Zero refresh necessari!

## 🛠️ Tecnologie

- **React 18** - UI Library
- **Vite 5** - Build tool velocissimo
- **Firebase 10** - Backend completo
  - **Authentication** - Login/Registrazione
  - **Firestore** - Database NoSQL real-time
  - **Storage** - File storage cloud
- **CSS3** - Styling moderno

## 📊 Struttura Dati

### Collezione `users`
```javascript
{
  uid: "firebase-user-id",
  name: "Mario Rossi",
  email: "mario@example.com",
  createdAt: Timestamp
}
```

### Collezione `tasks`
```javascript
{
  title: "Completare progetto",
  description: "Descrizione dettagliata",
  dueDate: "2025-12-31",
  priority: "high", // low | medium | high
  assignedTo: "user-uid" | "",
  completed: false,
  createdBy: "creator-uid",
  createdByName: "Mario Rossi",
  createdAt: Timestamp,
  image: "https://storage.googleapis.com/..." | null
}
```

## 🔐 Sicurezza

- ✅ Autenticazione richiesta per tutto
- ✅ Password hash automatico (Firebase)
- ✅ Rules Firestore per proteggere i dati
- ✅ Storage Rules per limitare upload
- ✅ Validazione lato client e server

## 📝 Note Importanti

### Costi Firebase

Piano **Spark (Gratuito)** include:
- 50.000 letture/giorno Firestore
- 20.000 scritture/giorno Firestore
- 5GB storage
- 10GB trasferimento/mese

**Perfetto per iniziare!** Monitora l'uso su Firebase Console.

### Limiti

- Password minimo 6 caratteri (Firebase requirement)
- Immagini max 5MB
- Email deve essere valida

### Backup

I dati sono su cloud Firebase, ma puoi fare export:
- Firestore: Firebase Console > Firestore > Export
- Storage: Firebase Console > Storage > Download

## 🐛 Troubleshooting

### "Firebase: Error (auth/email-already-in-use)"
→ Email già registrata, usa login

### "Firebase: Error (auth/weak-password)"
→ Password troppo corta (min 6 caratteri)

### "Missing or insufficient permissions"
→ Configura Firestore Rules (vedi sopra)

### Immagini non si caricano
→ Configura Storage Rules (vedi sopra)

## 🎯 Prossimi Passi

1. ✅ Deploy su Vercel
2. ✅ Configura Firestore Rules
3. ✅ Configura Storage Rules
4. ✅ Invita il team a registrarsi
5. ✅ Inizia a creare task!

## 📄 License

MIT License - Free to use

---

**Made with ❤️ by The Real Tracker Team**

Deploy istantaneo | Sync real-time | Cloud ready
