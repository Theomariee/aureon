# Aureon — Suivi de patrimoine financier

Application de bureau (Windows/macOS/Linux) pour **suivre et mettre à jour chaque mois la valeur
de ton patrimoine financier**, visualiser son évolution dans le temps, et archiver
automatiquement tes analyses sur Google Drive.

100 % local : aucune donnée n'est envoyée sur un serveur. Tout est stocké sur ton PC.

![Aureon](build/screenshot.png)

## ✨ Fonctionnalités

- **Saisie mensuelle rapide** : mets à jour la valeur de chaque produit, précise les flux
  (versements / retraits) et justifie les variations d'une note.
- **Performance réelle** : Aureon distingue automatiquement les **gains latents** des **apports**
  (`performance = variation − flux`), pour ne pas confondre « j'ai gagné » et « j'ai versé ».
- **Organisation par plateforme et par produit** : une plateforme (ex : Fortuneo) peut contenir
  plusieurs produits de types différents (fonds euros, UC/ETF, actions, crypto…).
- **Catégories** : compte courant, livret, assurance vie, PEA, PER, PEE, crypto, autre — avec
  vue « disponibilité » (immédiat / court terme / long terme).
- **Tableau de bord** : patrimoine total, évolution, répartitions (catégorie / plateforme /
  liquidité), mouvements marquants.
- **Historique** : synthèse mensuelle + matrice détaillée par produit.
- **Archive mensuelle en 1 fichier** : le bouton « Archiver ce mois » crée un unique
  `Aureon-AAAA-MM.zip` (rapport PDF + sauvegarde JSON réimportable) à déposer sur n'importe quel
  cloud (Google Drive, OneDrive, Dropbox…).
- **Sauvegarde / restauration** en un clic — l'import accepte le `.zip` d'archive **ou** un
  `.json` brut.

## 🚀 Démarrage

Prérequis : **Node.js 18+**.

```bash
npm install      # installe les dépendances
npm run dev      # lance l'application en mode développement
```

## 🏗️ Créer l'exécutable (.exe) pour l'installer ou le partager

```bash
npm run dist     # génère un installeur Windows dans dist/
```

Le fichier `dist/Aureon-Setup-1.0.0.exe` est un installeur autonome : tu peux le partager à tes
proches, chacun l'installe et gère son propre patrimoine (données 100 % séparées).

## ☁️ Mettre ses données « au chaud »

Aureon est 100 % local et ne se connecte à aucun serveur. Pour archiver hors de ton PC, l'app
génère des fichiers que **tu déposes toi-même sur ton cloud** (marche avec Google Drive, OneDrive,
Dropbox, un disque externe… au choix). Aucune configuration, aucun compte à connecter.

- **Chaque mois** : écran *Saisie mensuelle* → **« Archiver ce mois »** crée un unique
  `Aureon-AAAA-MM.zip` (rapport PDF + sauvegarde JSON). Glisse-le sur ton cloud, c'est archivé.
- **Sauvegarde complète** : *Réglages → Exporter la base (.json)*.
- **Restauration** (après réinstallation ou perte de données) : *Réglages → Importer une
  sauvegarde*, puis choisis ton dernier `.zip` **ou** `.json` — tout l'historique revient.

> Pourquoi pas d'intégration API Google Drive ? Elle imposerait à chaque utilisateur de créer un
> projet Google Cloud (trop complexe) ou d'accepter un écran « application non vérifiée ». L'export
> manuel couvre exactement le même besoin, sans friction et avec n'importe quel cloud.

## 🗂️ Où sont mes données ?

Dans le dossier utilisateur de l'application Electron :

- Windows : `%APPDATA%/aureon/aureon-data.json`
- macOS : `~/Library/Application Support/aureon/aureon-data.json`
- Linux : `~/.config/aureon/aureon-data.json`

Un fichier `.bak.json` conserve la version précédente à chaque écriture (protection anti-crash).

## 🧱 Architecture

```
src/
  shared/     Types + logique métier (calculs, formats) — partagés main/renderer
  main/       Process Electron : persistance, Google Drive, génération de rapport/PDF
  preload/    Pont sécurisé (contextBridge) exposant window.api
  renderer/   Interface React + Tailwind (pages : dashboard, saisie, produits, historique, réglages)
```

Stack : **Electron · electron-vite · React · TypeScript · Tailwind CSS · Recharts · Zustand ·
googleapis**.

## 📄 Licence

MIT — usage personnel et partage libres.
