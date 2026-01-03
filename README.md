# Vidéographie

Application web mobile-first pour capturer et organiser des idées via des enregistrements vidéo, avec transcription IA (Gemini) et génération automatique de documents de présentation (Claude).

## Fonctionnalités

- **Enregistrement vidéo** : Capturez vos idées directement depuis votre téléphone
- **Transcription automatique** : Vos vidéos sont transcrites par l'IA Gemini
- **Classification intelligente** : Dites le nom du projet au début de votre vidéo pour une classification automatique
- **Génération de documents** : Documents de présentation créés automatiquement par Claude
- **Organisation par projets** : Chaque projet a sa page dédiée avec toutes ses vidéos
- **Export facile** : Exportez vos documents en Markdown pour les utiliser avec d'autres IA

## Comment ça marche

1. **Dites le nom du projet** : Commencez chaque vidéo par le nom de votre projet ou "nouvelle idée"
2. **Expliquez votre idée** : Parlez librement, l'IA transcrit et analyse votre contenu
3. **Obtenez votre document** : Un document de présentation structuré est généré automatiquement

## Stack technique

- **Frontend** : React 19 + Tailwind CSS 4 + shadcn/ui
- **Backend** : Express + tRPC
- **Base de données** : MySQL/TiDB via Drizzle ORM
- **Stockage** : S3 pour les vidéos
- **IA** : Gemini (transcription) + Claude (génération de documents)
- **Auth** : Manus OAuth

## Déploiement sur Netlify

### Prérequis

Cette application nécessite un backend Node.js. Pour un déploiement sur Netlify, vous devrez :

1. Utiliser Netlify Functions pour le backend, ou
2. Déployer le backend séparément (Railway, Render, etc.)

### Variables d'environnement requises

```env
# Base de données
DATABASE_URL=mysql://user:password@host:port/database

# Authentification
JWT_SECRET=your-secret-key
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/login

# Stockage S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=your-region
S3_BUCKET=your-bucket-name

# APIs IA
GEMINI_API_KEY=your-gemini-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### Configuration Netlify

1. Connectez votre dépôt GitHub à Netlify
2. Configurez les variables d'environnement dans les paramètres du site
3. Build command : `pnpm build`
4. Publish directory : `dist`

### Note importante

Cette application est conçue pour fonctionner avec l'infrastructure Manus. Pour un déploiement standalone sur Netlify, des adaptations seront nécessaires pour :
- L'authentification (remplacer Manus OAuth par une autre solution)
- Le stockage (configurer votre propre bucket S3)
- La base de données (utiliser un service comme PlanetScale ou Neon)

## Développement local

```bash
# Installation des dépendances
pnpm install

# Lancer le serveur de développement
pnpm dev

# Lancer les tests
pnpm test

# Build de production
pnpm build
```

## Structure du projet

```
client/
  src/
    components/     # Composants React réutilisables
    pages/          # Pages de l'application
    lib/            # Utilitaires et configuration tRPC
server/
  services/         # Services métier (transcription, génération)
  routers.ts        # Routes tRPC
  db.ts             # Helpers base de données
drizzle/
  schema.ts         # Schéma de la base de données
```

## Licence

MIT
