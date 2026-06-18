# Betclic Invites Bot 🔗

Discord bot pour tracker les invitations des membres et afficher un classement.

## Fonctionnalités

- ✅ **Tracking automatique** des invitations quand un nouveau membre rejoint
- 📊 **/invites-ranking** - Affiche le top 10 des invitateurs
- 👤 **/my-invites** - Voir tes stats d'invitations personnelles  
- 📥 **/export-invites** - Export complet en CSV

## Setup Local

### 1. Prérequis
- Node.js v16+ et npm
- Git

### 2. Cloner le repo et installer les dépendances
```bash
git clone https://github.com/username/betclic-invites-bot.git
cd betclic-invites-bot
npm install
```

### 3. Créer un fichier `.env`
```bash
cp .env.example .env
```

Remplis le `.env` avec:
```
DISCORD_TOKEN=ton_token_ici
GUILD_ID=1496844272610185216
```

### 4. Lancer localement
```bash
npm start
```

Tu dois voir: `✅ Bot connecté en tant que BotName#0000`

---

## Déploiement sur Railway

### 1. Créer un nouveau projet Railway
- Va sur [railway.app](https://railway.app)
- Clique "New Project" → "Deploy from GitHub"
- Connecte ton repo

### 2. Ajouter les variables d'environnement
Dans Railway:
- Settings → Variables
- Ajoute:
  - `DISCORD_TOKEN` = ton token
  - `GUILD_ID` = 1496844272610185216

### 3. Déployer
Railway va auto-builder et déployer dès que tu push sur GitHub.

### 4. (Optionnel) Redémarrer le service
Si le bot crash, vas dans Railway et clique "Redeploy".

---

## Commandes Discord

### /invites-ranking
Affiche les 10 meilleurs invitateurs avec un embed flashy.

### /my-invites  
Montre tes stats personnelles + ta position au classement.

### /export-invites
Exporte le classement complet + détail de toutes les invitations en CSV.

---

## Architecture

```
betclic-invites-bot/
├── index.js              # Bot principal & event handlers
├── package.json
├── .env.example
├── .gitignore
├── db/
│   └── database.js       # SQLite management
├── commands/
│   ├── invites-ranking.js
│   ├── my-invites.js
│   └── export-invites.js
└── invites.db            # Base de données (auto-créée)
```

---

## Notes Techniques

- **SQLite** pour le stockage (léger, pas de dépendance externe)
- **discord.js v14+** pour les slash commands
- **GatewayIntents**: Guilds, GuildMembers, GuildInvites, DirectMessages
- Snapshot initial des invites au démarrage du bot
- Détection auto des nouvelles invites

---

## Troubleshooting

**Le bot ne démarre pas?**
- Vérifie que `DISCORD_TOKEN` et `GUILD_ID` sont corrects dans Railway

**Les invites ne sont pas trackées?**
- Assure-toi que le bot a la permission "Manage Guild" sur le serveur
- Redémarre le bot (Railway: Redeploy)

**CSV vide à l'export?**
- C'est normal au début, attends que des membres rejoignent via une invite

---

Made by Jules @ Netcord 🚀
