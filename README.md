# Apnée Training

Chrono d'entraînement à l'apnée, pensé pour le téléphone.

- **Respiration carrée** : inspiration, rétention, expiration, rétention.
- **Table O2** : apnées de plus en plus longues, repos fixe.
- **Table CO2** : apnée fixe, repos de plus en plus court.
- **HIIT Cardio** : effort / repos.
- **Chrono libre** : chronomètre avec bips programmables et record personnel.

Décomptes vocaux, bips, vibrations, écran maintenu allumé pendant la séance.

## Utilisation

Ouvrir `index.html` dans un navigateur. Aucune installation, aucun serveur nécessaire.

Les séances enregistrées et le record sont gardés dans le navigateur de chaque appareil (`localStorage`, clés `apnee.v1.*`).

## Structure

```
index.html        page de l'app
css/style.css     styles
js/app.js         séances (respiration, tables O2/CO2, HIIT)
js/chrono.js      chrono libre
js/voices.js      voix enregistrées (audio intégré)
img/              photo de piscine et silhouettes de plongeurs
```
