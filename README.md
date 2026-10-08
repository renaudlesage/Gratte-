# Gratte — apprendre la guitare

Application web (React + Vite) pour apprendre la guitare en autonomie, en français. Installable sur téléphone et utilisable hors connexion. La progression est enregistrée sur l'appareil ; une synchronisation entre appareils via Supabase est disponible en option.

## Fonctionnalités

**Apprendre**
- **Coach du jour** : une séance d'environ 15 minutes composée à partir de vos records et de votre avancement (paire d'accords la plus faible, rythme 5 BPM plus vite que la dernière fois, oreille, chanson jouable avec vos accords…).
- **Parcours de 10 leçons**, de l'accordage au barré, avec objectifs à cocher.
- **Dictionnaire de 22 accords** et **manche complet** (nom des notes jusqu'à la 12e case, positions d'une note).

**Écoute au micro**
- **Vérification d'accord** : l'appli reconnaît l'accord joué, signale les cordes qui ne sonnent pas et les notes étrangères.
- **Défi minute en comptage automatique** : chaque changement propre est compté sans toucher l'écran.
- **Accordeur** (précision < 1 cent).

**Pratiquer**
- Défi minute, enchaînements guidés, 6 rythmiques, 4 arpèges (dont Travis), jeu d'oreille (majeur/mineur, quel accord ?).

**Chansons**
- 7 airs du domaine public et vos propres grilles (`[G]paroles [D]suite`).
- Lecture au tempo avec l'accord en cours surligné, accompagnement joué.
- **Transposition** et **capodastre** (avec capo conseillé) ; les accords hors dictionnaire sont générés en barré.

**Réglages** : son acoustique ou électrique, notation C/D/E ou Do/Ré/Mi, mode gaucher, installation, synchronisation.

Le son est synthétisé (Karplus-Strong étendu, caisse de résonance simulée), sans fichier audio.

## Démarrer

```bash
npm install
npm run dev
```

Fonctionne tel quel dans StackBlitz (importer le dépôt GitHub).

## Déployer sur Vercel

Importer le dépôt : le preset **Vite** est détecté (build `npm run build`, sortie `dist`). Le micro (accordeur, vérification d'accords) et l'installation sur téléphone demandent le HTTPS, fourni par Vercel.

## Synchronisation entre appareils (facultatif)

Sans configuration, l'appli reste 100 % locale. Pour l'activer :

1. Dans un projet Supabase, exécuter `supabase/migrations/001_gratte_progress.sql` (table + règles RLS : chacun ne voit que sa progression).
2. Dans Vercel, ajouter les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (voir `.env.example`), puis redéployer.
3. Supabase > Authentication > URL Configuration : ajouter l'URL Vercel dans **Site URL** et **Redirect URLs**.
4. Facultatif, pour se connecter avec un code (pratique dans l'appli installée) : Authentication > Email Templates > Magic Link, ajouter `{{ .Token }}` au message.

Connexion par lien magique (ou code) dans **Réglages**. Fusion : records au maximum, jours et historiques réunis, objectif coché ou décoché le plus récent, grilles personnelles les plus récentes (suppressions comprises).

## Reconnaissance d'accords : principe et limites

Le spectre du micro est converti en « chroma » (énergie par note), comparé à un modèle de chaque accord calculé à partir de son doigté exact et de ses harmoniques. Validé hors ligne sur les 22 accords (deux timbres, bruit, guitare désaccordée de 25 cents) : 71 changements sur 72 correctement comptés dans le défi minute, aucun faux comptage, aucun mauvais accord accepté. Les accords « jumeaux » qui ne diffèrent que d'une note (G/G7, C/Cadd9) restent difficiles à distinguer. Sur une vraie guitare, préférez une pièce calme, une guitare accordée et le téléphone à environ 50 cm.

## Structure

```
src/
  App.jsx                   navigation (6 onglets + réglages)
  lib/audio.js              synthèse, timbres, clic, horloge précise
  lib/pitch.js              détection de hauteur (accordeur)
  lib/chordDetect.js        reconnaissance d'accords
  lib/useChordListener.js   écoute micro
  lib/music.js              transposition, barrés générés, capo
  lib/coach.js              séance du jour
  lib/progress.jsx          progression locale
  lib/merge.js, sync.js     synchronisation Supabase (optionnelle)
  lib/settings.jsx          réglages
  data/                     accords, leçons, rythmes, arpèges, chansons
  components/               écrans
public/
  manifest.webmanifest, sw.js, icons/   appli installable et hors ligne
supabase/migrations/        schéma SQL de la synchronisation
```
