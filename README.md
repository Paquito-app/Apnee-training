# Apnée Training

Chrono d'entraînement à l'apnée, pensé pour le téléphone. L'app s'ouvre sur la respiration carrée.

- **Respiration carrée** : inspiration, rétention, expiration, rétention.
- **Table O2** : apnées de plus en plus longues, repos fixe.
- **Table CO2** : apnée fixe, repos de plus en plus court.
- **HIIT Cardio** : effort / repos.
- **Chrono libre** : chronomètre avec bips programmables et record personnel.

Décomptes vocaux, bips, vibrations, écran maintenu allumé pendant la séance.
Installable sur l'écran d'accueil et **utilisable sans réseau** une fois ouverte une première fois en ligne.

Détail des réglages : [[docs/Protocoles|Protocoles]] · Historique : [[docs/Journal|Journal]]

## Utilisation

**En ligne : https://paquito-app.github.io/Apnee-training/**. Sur iPhone, l'ouvrir dans Safari puis Partager → « Sur l'écran d'accueil ».

En local : ouvrir `index.html` dans un navigateur. Aucune installation, aucun serveur nécessaire.

Les séances enregistrées et le record sont gardés dans le navigateur de chaque appareil (`localStorage`, clés `apnee.v1.*`).

## Arborescence

```
Apnée Training/        coffre Obsidian = dépôt GitHub Paquito-app/Apnee-training
├── README.md          cette page (accueil)
├── index.html         page de l'app
├── manifest.webmanifest  fiche d'installation (nom, icônes, couleurs)
├── sw.js              service worker : mode hors-ligne
├── css/style.css      styles
├── css/fonts.css      polices intégrées
├── fonts/             fichiers des polices (Onest, Baloo 2, JetBrains Mono)
├── icons/             icône de l'app (écran d'accueil, onglet)
├── js/app.js          séances (respiration, tables O2/CO2, HIIT)
├── js/chrono.js       chrono libre
├── js/voices.js       voix enregistrées (audio intégré)
├── js/audio.js        déblocage du son sur iPhone
├── img/               photo de piscine et silhouettes de plongeurs
└── docs/              notes du projet (protocoles, journal)
```

## Mode hors-ligne

`sw.js` garde tous les fichiers de l'app dans le téléphone. **À chaque mise à jour de l'app, augmenter `VERSION` dans `sw.js`** (`apnee-v1` → `apnee-v2`…) et ajouter tout nouveau fichier à la liste `FILES` : sinon les téléphones gardent l'ancienne version. La nouvelle version s'affiche au lancement suivant.

## Sauvegarde

Un seul dossier, deux accès : `~/Documents/Coffre Obsidian/Apnée Training` (Obsidian) et `~/Documents/GitHub/Apnee-training` (raccourci vers le même dossier). Toute modification est donc la même des deux côtés ; chaque mise à jour est enregistrée (commit) puis envoyée sur GitHub en même temps.
