# 🎭 MemeGen IA

Générateur de mèmes intelligent, interactif et sécurisé — Projet d'admission Master IA · SUPINFO Paris

[![Déployé sur Vercel](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://memegen-supinfo.vercel.app)
[![Backend sur Railway](https://img.shields.io/badge/Backend-Railway-purple?logo=railway)](https://memegen-supinfo-production.up.railway.app/health)
[![Base de données Supabase](https://img.shields.io/badge/BDD-Supabase-green?logo=supabase)](https://supabase.com)
[![IA Groq](https://img.shields.io/badge/IA-Groq%20Llama%204-orange)](https://console.groq.com)

---

## 🌐 Démo en production

| Service | URL |
|---|---|
| Application | https://memegen-supinfo.vercel.app |
| API Backend | https://memegen-supinfo-production.up.railway.app/health |

---

## 📋 Description

MemeGen IA est une application web full-stack permettant de créer, éditer, sauvegarder et partager des mèmes
avec assistance de l'intelligence artificielle. L'IA analyse l'image uploadée et propose automatiquement
3 légendes humoristiques adaptées au contenu visuel.

---

## ✨ Fonctionnalités

- **Authentification sécurisée** — Inscription et connexion via Supabase Auth (email + mot de passe)
- **Éditeur canvas interactif** — Fabric.js : texte déplaçable, redimensionnable, modifiable en couleur/taille
- **Suggestions IA** — Groq Cloud (Llama 4 Scout Vision) analyse l'image et génère 3 légendes en JSON
- **Galerie privée** — Espace personnel isolé par Row Level Security (RLS) Supabase
- **Galerie publique** — Flux commun des mèmes publiés par tous les utilisateurs
- **Réouverture et modification** — Tout mème (privé ou public) peut être rechargé dans l'éditeur
- **Suppression** — Suppression simultanée en base de données et en Storage
- **Export PNG** — Téléchargement direct du mème final
- **Partage réseaux sociaux** — Modal avec Twitter/X, Facebook, WhatsApp, Telegram, Reddit, LinkedIn
- **Web Share API** — Partage natif sur mobile (Android/iOS)
- **Interface responsive** — Design dark mode adapté mobile et desktop

---

## 🏗️ Architecture
memegen-supinfo/
├── frontend/          # React 18 + Vite — déployé sur Vercel
│   ├── src/
│   │   ├── composants/
│   │   │   ├── Editeur.jsx        # Canvas Fabric.js + export + IA
│   │   │   └── Galerie.jsx        # Grille de mèmes + actions hover
│   │   ├── pages/
│   │   │   ├── Accueil.jsx        # Landing + galerie publique
│   │   │   ├── Connexion.jsx      # Formulaire auth maison
│   │   │   └── MesMemoires.jsx    # Éditeur + galerie privée
│   │   ├── hooks/
│   │   │   └── useAuth.js         # Session Supabase réactive
│   │   ├── lib/
│   │   │   └── supabaseClient.js  # Client Supabase configuré
│   │   └── App.jsx                # Router + gestion token auth
│   └── vercel.json                # SPA rewrites + headers CSP
│
└── backend/           # Node.js 18 + Express — déployé sur Railway
├── routes/
│   └── ia.js                  # POST /api/suggerer-legendes
├── middlewares/
│   └── rateLimiter.js         # 5 req/min par IP
└── server.js                  # CORS strict + trust proxy Railway

---

## 🛠️ Stack technique

| Couche | Technologie | Rôle |
|---|---|---|
| Frontend | React 18 + Vite | Interface utilisateur |
| Éditeur canvas | Fabric.js 5 | Manipulation d'objets sur canvas |
| Routing | React Router v6 | Navigation SPA |
| Backend | Node.js 18 + Express | API REST |
| IA Vision | Groq — `meta-llama/llama-4-scout-17b-16e-instruct` | Analyse image + génération légendes |
| Auth | Supabase Auth | JWT + session persistante |
| Base de données | Supabase PostgreSQL | Table `memes` avec RLS |
| Stockage fichiers | Supabase Storage | Bucket `memes-images` public |
| Déploiement frontend | Vercel | CI/CD automatique depuis GitHub |
| Déploiement backend | Railway | Conteneur Node.js avec keep-alive |
| Monitoring | UptimeRobot | Ping `/health` toutes les 5 min |

---

## 🚀 Installation locale

### Prérequis

- Node.js >= 18
- Compte Supabase (gratuit)
- Compte Groq (gratuit)

### 1. Clone le projet

```bash
git clone https://github.com/TON_USERNAME/memegen-supinfo.git
cd memegen-supinfo
```

### 2. Configure Supabase

Dans **Supabase → SQL Editor**, exécute :

```sql
create table public.memes (
  id             uuid        default gen_random_uuid() primary key,
  utilisateur_id uuid        references auth.users(id) on delete cascade not null,
  url_image      text        not null,
  est_public     boolean     default false not null,
  cree_le        timestamptz default now() not null
);

alter table public.memes enable row level security;

create policy "lecture_propres_ou_publics" on public.memes
  for select using (auth.uid() = utilisateur_id or est_public = true);

create policy "insertion_propre" on public.memes
  for insert with check (auth.uid() = utilisateur_id);

create policy "suppression_propre" on public.memes
  for delete using (auth.uid() = utilisateur_id);

create policy "modification_propre" on public.memes
  for update using (auth.uid() = utilisateur_id);

grant select on public.memes to anon;
grant select, insert, update, delete on public.memes to authenticated;
```

Dans **Supabase → Storage**, crée un bucket `memes-images` en mode **public**.

### 3. Configure les variables d'environnement

**`frontend/.env`**
```env
VITE_SUPABASE_URL=https://XXXXXXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_BACKEND_URL=http://localhost:3001
```

**`backend/.env`**
```env
GROQ_API_KEY=gsk_...
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### 4. Lance le projet

```bash
# Terminal 1 — Backend
cd backend
npm install
node server.js
# → Backend démarré sur le port 3001

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 🔐 Sécurité

| Mesure | Détail |
|---|---|
| RLS Supabase | Chaque utilisateur ne peut lire/modifier que ses propres mèmes |
| Clé Groq côté serveur uniquement | `GROQ_API_KEY` jamais exposée au navigateur |
| CORS strict | Backend accepte uniquement l'URL Vercel en production |
| Rate limiting | 5 appels IA maximum par IP par minute |
| Validation des entrées | Format image vérifié (JPEG/PNG/WebP), taille max 5 Mo |
| Token JWT Supabase | Session récupérée en temps réel avant chaque opération sensible |

---

## ☁️ Déploiement production

### Frontend → Vercel

```bash
cd frontend
npm install -g vercel
vercel --prod
```

Variables à configurer dans Vercel :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_BACKEND_URL` (URL Railway)

### Backend → Railway

1. Connecte ton repo GitHub sur [railway.app](https://railway.app)
2. Root directory : `backend`
3. Start command : `node server.js`
4. Variables d'environnement :
   - `GROQ_API_KEY`
   - `FRONTEND_URL` (URL Vercel)
   - `NODE_ENV=production`
   - `GROQ_MODEL=meta-llama/llama-4-scout-17b-16e-instruct`

### Keep-alive avec UptimeRobot

Moniteur HTTP sur `https://memegen-supinfo-production.up.railway.app/health`
toutes les **5 minutes** pour éviter la mise en veille du service gratuit.

---

## 📐 Modèle de données

```sql
table public.memes
├── id             uuid PRIMARY KEY
├── utilisateur_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
├── url_image      text                    -- URL publique Supabase Storage
├── est_public     boolean DEFAULT false   -- visible dans la galerie publique
└── cree_le        timestamptz DEFAULT now()
```

---

## 🧠 Fonctionnement de l'IA
Utilisateur clique "Suggérer des légendes"
│
▼
Frontend encode le canvas en JPEG base64 (qualité 0.65)
│
▼
POST /api/suggerer-legendes → Backend Railway
│
▼
Groq API — llama-4-scout-17b-16e-instruct (vision)
Prompt : "Génère 3 légendes humoristiques — JSON strict"
│
▼
{ "legendes": ["...", "...", "..."] }
│
▼
Frontend affiche les 3 suggestions cliquables
→ clic → ajout automatique sur le canvas Fabric.js

---

## 👤 Auteur

**Yves Anague** — Candidat Master IA · SUPINFO Paris  
Projet d'admission — 2025/2026