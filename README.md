# Apnée Training

Chrono d'entraînement à l'apnée, pensé pour le téléphone. L'app s'ouvre sur la respiration carrée.

- **Respiration carrée** : inspiration, rétention, expiration, rétention.
- **Table O2** : apnées de plus en plus longues, repos fixe.
- **Table CO2** : apnée fixe, repos de plus en plus court.
- **HIIT Cardio** : effort / repos.
- **Chrono libre** : chronomètre avec bips programmables et record personnel.

Décomptes vocaux, bips, vibrations, écran maintenu allumé pendant la séance.

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
├── css/style.css      styles
├── js/app.js          séances (respiration, tables O2/CO2, HIIT)
├── js/chrono.js       chrono libre
├── js/voices.js       voix enregistrées (audio intégré)
├── img/               photo de piscine et silhouettes de plongeurs
└── docs/              notes du projet (protocoles, journal)
```

## Sauvegarde

Un seul dossier, deux accès : `~/Documents/Coffre Obsidian/Apnée Training` (Obsidian) et `~/Documents/GitHub/Apnee-training` (raccourci vers le même dossier). Toute modification est donc la même des deux côtés ; chaque mise à jour est enregistrée (commit) puis envoyée sur GitHub en même temps.
