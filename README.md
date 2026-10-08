# Gratte — apprendre la guitare

Application web (React + Vite) pour apprendre la guitare en autonomie, en français. Aucun backend : tout tourne dans le navigateur et la progression est enregistrée localement (localStorage).

## Fonctionnalités

- **Parcours de 10 leçons** : de l'accordage au barré, avec objectifs à cocher et raccourcis vers les exercices.
- **Dictionnaire d'accords** : 22 accords (majeurs, mineurs, 7e, couleurs, barrés) en diagrammes SVG avec numéros de doigts. Touchez pour écouter.
- **Défi minute** : comptez vos changements d'accords en 60 s, records par paire.
- **Enchaînement guidé** : grilles d'accords au métronome (accord en cours + suivant), progressions prêtes ou personnalisées.
- **Rythmes** : 6 rythmiques (dont folk et valse) avec curseur animé, clic et modèle joué.
- **Accordeur au micro** : détection de hauteur par autocorrélation, précision < 1 cent, + notes de référence.
- **Métronome** : 40–220 BPM, tap tempo, mesures de 2 à 7 temps, accent.
- **Accueil** : série de jours, progression, routine de 15 minutes, records.

Le son des cordes est synthétisé (Karplus-Strong étendu), sans aucun fichier audio. Deux timbres au choix dans l'en-tête :

- **Acoustique** (par défaut) : cordes acier avec sustain réaliste par corde, attaque de médiator, position de pincement et caisse de résonance simulée (modes de la table d'harmonie).
- **Électrique** : son clair, sustain long.

Une corde rejouée étouffe la note précédente sur cette corde, comme sur un vrai instrument.

## Démarrer

```bash
npm install
npm run dev
```

Fonctionne tel quel dans StackBlitz (importer le dépôt GitHub).

## Déployer sur Vercel

Importer le dépôt dans Vercel : le preset **Vite** est détecté automatiquement (build `npm run build`, sortie `dist`). L'accordeur nécessite HTTPS pour accéder au micro, ce que Vercel fournit.

## Structure

```
src/
  App.jsx                 navigation (5 onglets, lien par #hash)
  lib/audio.js            contexte audio, synthèse de corde, clic, horloge précise
  lib/pitch.js            détection de hauteur
  lib/progress.jsx        progression locale (contexte React)
  data/chords.js          doigtés, paires et grilles suggérées
  data/lessons.js         parcours de leçons
  data/patterns.js        rythmiques
  components/             écrans et composants
```

Pour ajouter un accord, une leçon ou un rythme, il suffit d'éditer le fichier correspondant dans `src/data/`.
