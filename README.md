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

**Rythme et groupe**
- **Score de rythme au micro** : chaque coup de médiator est comparé au métronome (score « dans le temps » à ±40 ms, régularité, temps où l'on presse ou traîne). Calibration de la latence du micro en 30 secondes.
- **Accompagnement batterie + basse** (pop, folk, rock, blues shuffle, valse) dans les enchaînements et les chansons.
- **Accélérateur de tempo** dans le métronome.

**Aller plus loin**
- **Parcours 2** (6 leçons) : tablature, power chords et palm mute, hammer-on/pull-off et glissés, arpèges, pentatonique, improvisation sur un blues.
- **Partitions et tablatures** : morceaux du cours (Les pompiers, La barbichette, Les choux, Joyeux anniversaire, Vive le vent en duo mélodie/accompagnement), un dossier **Arquebusiers** protégé par un code (Li tchant dès Walons, La Brabançonne, Li Vile Usteie et Li Vix Cinq — airs du recueil transposés pour jouer avec la fanfare —, plus un **recueil de pages photographiées** : import de photos ou d'une archive .zip, lecture plein écran, page suivante au balayage ou aux flèches, zoom, rotation ; les pages restent sur l'appareil et ne font pas partie du dépôt), exercices techniques, gammes, phrase blues et mélodies du domaine public, avec curseur animé qui suit la lecture, barres de mesure et accords. Affichage au choix : tablature, partition (clé de sol, armure, durées jusqu'à la double croche, rythmes pointés, liaisons, ligatures inclinées comme en gravure) ou les deux alignés, avec le nom des notes en option. La partition se découpe en lignes selon la largeur de l'écran, sa taille se règle (A− / A+), et le **mode pupitre** l'affiche en plein écran pour jouer avec la tablette posée sur un pupitre (Samsung DeX compris). **Commandes vocales** (bouton 🎤) pour jouer sans lâcher la guitare : « joue », « stop », « reprends », « au début », « mesure 5 », « encore », « plus vite », « tempo 80 », « plus grand », « partition », « suivant », « pupitre »… (Chrome ; la reconnaissance passe par le service vocal du navigateur et demande une connexion).
- **Gammes sur le manche** (pentatoniques, blues, majeure) avec la position 1 encadrée.
- **Power chords** et **accordages alternatifs** (Drop D, ½ ton plus bas, Open G, Open D, DADGAD) dans l'accordeur, le manche et le dictionnaire.

**Suivi et quotidien**
- **Mes progrès** : calendrier de pratique, courbes des défis et des évaluations de rythme, 19 badges.
- **Enregistreur** : s'enregistrer et se réécouter (stocké sur l'appareil).
- **Partage d'une grille par lien** (la grille est encodée dans l'adresse, sans serveur).
- **Rappel quotidien** : événement d'agenda récurrent (.ics, fonctionne partout) et notifications de l'appli installée (Chrome/Android, au mieux).
- **Thème** sombre, clair ou automatique.

**Réglages** : écran toujours allumé pendant l'utilisation (Wake Lock, activé par défaut), son acoustique ou électrique, thème, notation C/D/E ou Do/Ré/Mi, mode gaucher, rappel, installation, synchronisation.

Le son est synthétisé (Karplus-Strong étendu, caisse de résonance simulée), sans fichier audio.

## Démarrer

```bash
npm install
npm run dev
```

Fonctionne tel quel dans StackBlitz (importer le dépôt GitHub).

## Déployer sur Vercel

Importer le dépôt : le preset **Vite** est détecté (build `npm run build`, sortie `dist`). Le micro (accordeur, vérification d'accords) et l'installation sur téléphone demandent le HTTPS, fourni par Vercel.

## Rôles : super admin, prof, élève

L'appli est reliée au projet Supabase « famille-hub » (tables préfixées `gratte_`, voir `supabase/migrations/`). Sans connexion, elle reste en **mode libre** : tout est accessible.

- **Super admin** (adresse enregistrée dans `gratte_admins`) : accès à tout, gestion des profs, **envoi de partitions** (photos ou .zip de pages, tablatures .json) rangées par dossier. Bouton 🎓 en haut à droite.
- **Prof** (adresse ajoutée par le super admin) : se connecte dans Réglages › Compte (lien ou code reçu par e-mail), crée ses classes et obtient un **code de classe**. Il active pour toute la classe ou pour un élève : leçons, exercices et outils, partitions de l'appli, partitions envoyées, chansons. Il choisit aussi le **code de sortie** du mode élève.
- **Élève** (sans adresse e-mail) : Réglages › Je suis élève, code de classe + prénom + code secret à 4 chiffres (5 erreurs → 15 minutes de blocage). Il ne voit que ce que le prof a activé ; les nouveautés arrivent au retour sur l'appli et toutes les minutes. Quitter le mode élève demande le code de sortie du prof.

Sécurité : règles RLS sur toutes les tables ; les élèves passent par des fonctions RPC qui vérifient leur jeton. Le contenu intégré à l'appli (leçons, partitions de l'appli) reste techniquement présent dans le code public : le mode élève guide, il ne protège pas un secret. Les partitions envoyées, elles, ne quittent le serveur que pour les élèves à qui elles ont été activées.

À régler une fois dans Supabase (famille-hub) › Authentication › URL Configuration : ajouter l'adresse de Gratte (Vercel) dans **Redirect URLs** pour que le lien de connexion des profs ramène à Gratte. Pour la connexion par code, le modèle d'e-mail « Magic Link » doit contenir `{{ .Token }}`.

## Synchronisation entre appareils

Une fois connecté (Réglages › Compte), la progression est synchronisée (table `gratte_progress`). Fusion : records au maximum, jours et historiques réunis, objectif coché ou décoché le plus récent, grilles personnelles les plus récentes (suppressions comprises). Les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` permettent de pointer vers un autre projet.

## Score de rythme : principe et limites

Un AudioWorklet détecte les attaques (énergie de la dérivée seconde du signal, comparée au fond sonore récent). Validé hors ligne sur des rythmes synthétisés (6 rythmiques, 60 à 130 BPM, imprécisions humaines et bruit) : 99 % des coups détectés (100 % en son acoustique), 95 % de précision. Le décalage propre à chaque appareil (micro + traitement) se corrige avec la calibration. Avec le haut-parleur du téléphone, l'annulation d'écho du navigateur retire le clic du micro ; des écouteurs restent la meilleure option.

## Reconnaissance d'accords : principe et limites

Le spectre du micro est converti en « chroma » (énergie par note), comparé à un modèle de chaque accord calculé à partir de son doigté exact et de ses harmoniques. Validé hors ligne sur les 22 accords (deux timbres, bruit, guitare désaccordée de 25 cents) : 71 changements sur 72 correctement comptés dans le défi minute, aucun faux comptage, aucun mauvais accord accepté. Les accords « jumeaux » qui ne diffèrent que d'une note (G/G7, C/Cadd9) restent difficiles à distinguer. Sur une vraie guitare, préférez une pièce calme, une guitare accordée et le téléphone à environ 50 cm.

## Structure

```
src/
  App.jsx                   navigation (6 onglets + réglages)
  lib/audio.js              synthèse, timbres, clic, horloge précise
  lib/pitch.js              détection de hauteur (accordeur)
  lib/chordDetect.js        reconnaissance d'accords
  lib/useChordListener.js   écoute micro (accords)
  lib/onset.js, useOnsets.js  détection des coups (rythme)
  lib/band.js               batterie et basse
  lib/badges.js             badges et calendrier
  lib/recordings.js         enregistrements (IndexedDB)
  lib/share.js              partage de grille par lien
  lib/reminder.js           rappel quotidien
  lib/voice.js              commandes vocales (Web Speech API)
  lib/scans.js              recueil photographié (IndexedDB, lecture .zip sans bibliothèque)
  lib/locks.js              dossiers de partitions protégés par un code (verrou léger, empreinte du code seulement)
  lib/music.js              transposition, barrés générés, capo
  lib/coach.js              séance du jour
  lib/progress.jsx          progression locale
  lib/merge.js, sync.js     synchronisation de la progression
  lib/cloud.js              client Supabase partagé
  lib/access.jsx            rôles et activations (libre, élève, prof, super admin)
  lib/scores.js             partitions envoyées par le super admin
  lib/settings.jsx          réglages
  data/                     accords, leçons, rythmes, arpèges, chansons, tablatures, accordages
  components/               écrans
public/
  manifest.webmanifest, sw.js, icons/   appli installable et hors ligne
supabase/migrations/        schéma SQL de la synchronisation
```
