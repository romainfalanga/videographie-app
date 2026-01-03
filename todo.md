# Vidéographie - TODO

## Base de données et authentification
- [x] Schéma de base de données (projets, vidéos, documents)
- [x] Authentification utilisateur via Manus OAuth

## Enregistrement et upload vidéo
- [x] Interface d'enregistrement vidéo mobile-first (MediaRecorder API)
- [x] Upload des vidéos vers S3
- [x] Gestion des métadonnées vidéo en base de données
- [x] Indicateur de progression d'upload

## Transcription et classification
- [x] Intégration API Gemini pour transcription audio
- [x] Extraction automatique du premier mot-clé
- [x] Classification automatique (nouveau projet vs projet existant vs "nouvelle idée")
- [x] Gestion de la catégorie spéciale "Nouvelles idées"

## Gestion des projets
- [x] CRUD projets (création, lecture, mise à jour, suppression)
- [x] Page dédiée par projet avec liste des vidéos
- [x] Navigation entre projets
- [x] Génération automatique de vignettes par projet

## Génération de documents
- [x] Intégration API Claude (Anthropic) pour génération de contenu
- [x] Création automatique de document de présentation par projet
- [x] Enrichissement progressif du document avec nouvelles vidéos
- [x] Export des documents (Markdown, texte)

## Interface utilisateur
- [x] Dashboard principal avec vue d'ensemble
- [x] Design mobile-first responsive
- [x] Navigation bottom-bar pour mobile
- [x] Thème sombre
- [x] États de chargement et feedback utilisateur

## Tests
- [x] Tests unitaires (vitest) pour les routes principales

## Déploiement
- [ ] Configuration du dépôt GitHub
- [ ] Documentation pour déploiement Netlify
- [ ] Variables d'environnement pour production
